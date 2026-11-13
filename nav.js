/* Dispatch Link: small layout tweaks shared by the admin pages.
   - The licence card is removed from the sidebars to free up space; licence details stay on the
     admin Overview page, and Team monitoring shows tabs/sessions as small pills in its top bar.
   - A light / dark switch in the top bar (same setting as the CRM and DMS: localStorage "dl_theme").
   - Tables that redraw themselves every few seconds (Team monitoring > Attendance and others) keep
     the position you scrolled to, instead of jumping back to the start.
   Load this file LAST on each page. */
(function () {
  if (window.__dlNav) return;
  window.__dlNav = true;

  var css = [
    ".sidebar .license{display:none!important}",
    ".dlws-pill{display:inline-flex;align-items:center;gap:6px;height:32px;padding:0 12px;border-radius:99px;border:1px solid var(--line,#d9e0ee);font-size:12.5px;color:var(--mut,#66728c);white-space:nowrap}",
    ".dlws-pill b{color:var(--ink,#0e1629);font-weight:700}",
    ".dl-thm{display:inline-flex;align-items:center;justify-content:center;padding:0!important;width:40px;min-width:40px}",
    ".dl-thm svg{width:17px;height:17px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}",
    ".dl-thm .sun{display:none}[data-theme=dark] .dl-thm .sun{display:block}[data-theme=dark] .dl-thm .moon{display:none}",
    "@media(max-width:820px){.dlws-pill{display:none}}"
  ].join("\n");

  function ready(fn) { if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fn); else fn(); }
  function setTheme(t) {
    document.documentElement.setAttribute("data-theme", t);
    try { localStorage.setItem("dl_theme", t); } catch (e) {}
  }

  /* ---- keep scroll position of boxes that are redrawn (the page replaces the table every few seconds) ---- */
  var SC = {}, seen = typeof WeakSet === "function" ? new WeakSet() : null, busy = false;
  function cls(el) { var c = typeof el.className === "string" ? el.className.trim() : ""; return c ? "." + c.split(/\s+/).slice(0, 3).map(function (x) { return x.replace(/([^a-zA-Z0-9_-])/g, "\\$1"); }).join(".") : ""; }
  function keyOf(el) {
    var k = [], n = el;
    for (var i = 0; n && n.nodeType === 1 && n !== document.body && i < 6; i++) { k.unshift((n.id ? "#" + n.id : "") + cls(n) + ":" + n.tagName); n = n.parentElement; }
    return k.join(">");
  }
  document.addEventListener("scroll", function (e) {
    var el = e.target; if (!el || el.nodeType !== 1 || el === document.documentElement || el === document.body || !cls(el)) return;
    if (seen) seen.add(el);
    SC[keyOf(el)] = { sel: cls(el), l: el.scrollLeft, t: el.scrollTop, at: Date.now() };
  }, true);
  document.addEventListener("click", function (e) { // a button (next month, Day/Month, filters...) means a new view: start at the beginning again
    if (e.target.closest && e.target.closest("button, select, .seg, [role=tab]")) SC = {};
  }, true);
  function restore() {
    busy = false;
    Object.keys(SC).forEach(function (k) {
      var r = SC[k]; if (Date.now() - r.at > 30 * 60000) { delete SC[k]; return; }
      var list; try { list = document.querySelectorAll(r.sel); } catch (x) { return; }
      for (var i = 0; i < list.length; i++) {
        var el = list[i]; if (seen && seen.has(el)) continue;
        if (keyOf(el) !== k) continue;
        if (seen) seen.add(el);
        if (r.l && el.scrollLeft !== r.l) el.scrollLeft = r.l;
        if (r.t && el.scrollTop !== r.t) el.scrollTop = r.t;
      }
    });
  }
  ready(function () {
    if (window.MutationObserver) new MutationObserver(function () { if (!busy && Object.keys(SC).length) { busy = true; (window.requestAnimationFrame || setTimeout)(restore); } }).observe(document.body, { childList: true, subtree: true });
  });

  ready(function () {
    var st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);

    /* Team monitoring: keep tab limit / sessions visible after the sidebar card is hidden */
    var maxEl = document.getElementById("sidebarMaxLimit"), sessEl = document.getElementById("sidebarActiveSessions");
    var actions = document.querySelector(".topbar .topbar-actions");
    if (maxEl && sessEl && actions) {
      var p1 = document.createElement("span"); p1.className = "dlws-pill"; p1.appendChild(document.createTextNode("Tabs allowed")); p1.appendChild(maxEl);
      var p2 = document.createElement("span"); p2.className = "dlws-pill"; p2.appendChild(document.createTextNode("Active sessions")); p2.appendChild(sessEl);
      actions.insertBefore(p2, actions.firstChild); actions.insertBefore(p1, actions.firstChild);
    }

    /* light / dark switch */
    if (actions && !document.getElementById("dlThm")) {
      var b = document.createElement("button");
      b.type = "button"; b.id = "dlThm"; b.className = "btn dl-thm"; b.title = "Switch light / dark mode"; b.setAttribute("aria-label", "Switch light / dark mode");
      b.innerHTML = '<svg class="moon" viewBox="0 0 24 24"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg><svg class="sun" viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';
      b.onclick = function () { setTheme(document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark"); };
      actions.appendChild(b);
    }
  });
})();

/* Admin page "Licence period" bar: shows how much of the CURRENT licence is left (it shrinks day by day),
   measured from the day the licence was given or last renewed (licFrom, saved by the Dispatch Link admin panel).
   Without that date: from the first activation when that is the same period, otherwise a 30-day month. */
(function () {
  var bar = document.getElementById("licBar"); if (!bar) return;
  var DAY = 864e5, busy = false;
  function ms(d) { var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(d || "")); return m ? Date.UTC(+m[1], +m[2] - 1, +m[3]) : 0; }
  async function fix() {
    if (busy) return; busy = true;
    try {
      var DL = (typeof window.DL !== "undefined" && window.DL) || (function () { try { return (0, eval)("DL"); } catch (e) { return null; } })(), s = DL && DL.session && DL.session(); if (!s || !s.company) return;
      var c = await DL.company(s.company); if (!c || !c.expires) return;
      var end = ms(c.expires), now = Date.now();
      var start = ms(c.licFrom);
      if (!start && c.activated && end - c.activated > 0 && end - c.activated <= 400 * DAY) start = +c.activated;
      if (!start || start >= end) start = end - 30 * DAY;
      var pct = Math.max(0, Math.min(100, (end - now) / (end - start) * 100)), days = Math.ceil((end - now) / DAY);
      bar.style.width = pct.toFixed(1) + "%";
      bar.style.background = days <= 3 ? "linear-gradient(90deg,#ef4444,#f97316)" : days <= 7 ? "linear-gradient(90deg,#f59e0b,#f97316)" : "";
      bar.title = Math.max(0, days) + " of " + Math.round((end - start) / DAY) + " days left";
    } catch (e) {} finally { setTimeout(function () { busy = false; }, 50); }
  }
  // the page sets its own width after loading / Refresh: put ours back each time
  new MutationObserver(function () { if (!busy) fix(); }).observe(bar, { attributes: true, attributeFilter: ["style"] });
  setTimeout(fix, 1500);
})();

/* Admin page: Refresh keeps the section you were on (Overview / Sales team / Configure Your GS) */
(function () {
  var btns = document.querySelectorAll('.nav-btn[data-v]'); if (!btns.length) return;
  document.addEventListener('click', function (e) {
    var b = e.target && e.target.closest && e.target.closest('.nav-btn[data-v]'); if (!b) return;
    var v = b.getAttribute('data-v');
    try { history.replaceState(history.state, '', v === 'overview' ? location.pathname + location.search : '#' + v); } catch (x) {}
  }, true);
  function restore(tries) {
    var v = (location.hash || '').replace(/^#/, ''); if (!v || v === 'overview') return;
    var b = document.querySelector('.nav-btn[data-v="' + v.replace(/[^a-z0-9_-]/gi, '') + '"]'); if (!b) return;
    var box = document.getElementById('v-' + v);
    if (box && box.classList.contains('on')) return;
    b.click();
    if (tries > 0) setTimeout(function () { restore(tries - 1); }, 700); // the page may open Overview once more while it loads
  }
  setTimeout(function () { restore(4); }, 600);
})();
