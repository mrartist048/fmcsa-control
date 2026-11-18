/* Dispatch Link - message banner from Dispatch Link (admin panel > Announcement)
   The admin panel writes /announce in every database: {id, text, type, to, until}.
   This page listens to it live and shows it at the top. Closing it hides that message on this browser;
   a new message shows again. */
(function () {
  'use strict';
  if (window.__dlAnnounce) return; window.__dlAnnounce = true;
  var G = function (n) { try { return (0, eval)(n); } catch (e) { return undefined; } };
  var COLORS = {
    info: ['#2563eb', '#1d4ed8', 'ℹ️'], work: ['#f59e0b', '#ea580c', '🛠️'], alert: ['#dc2626', '#b91c1c', '⚠️'], ok: ['#16a34a', '#15803d', '✅']
  };
  var me = '', cur = null, hideT = null, es = null;

  function hidden() { try { return JSON.parse(localStorage.getItem('dl_an_hide') || '[]'); } catch (e) { return []; } }
  function hide(id) { var h = hidden().filter(function (x) { return x !== id; }); h.push(id); try { localStorage.setItem('dl_an_hide', JSON.stringify(h.slice(-20))); } catch (e) {} }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  function paint() {
    var a = cur, bar = document.getElementById('dlAnBar');
    var show = a && a.text && (!a.to || String(a.to).toLowerCase() === me) && (!a.until || a.until > Date.now()) && hidden().indexOf(a.id) < 0;
    clearTimeout(hideT);
    if (!show) { if (bar) bar.remove(); return; }
    var c = COLORS[a.type] || COLORS.info;
    if (!bar) {
      bar = document.createElement('div'); bar.id = 'dlAnBar';
      bar.style.cssText = 'position:sticky;top:0;z-index:9989;display:flex;align-items:center;justify-content:center;gap:12px;padding:10px 44px 10px 16px;color:#fff;' +
        'font:600 14px/1.45 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;text-align:center;box-shadow:0 4px 14px rgba(0,0,0,.18)';
      document.body.insertBefore(bar, document.body.firstChild);
    }
    bar.style.background = 'linear-gradient(90deg,' + c[0] + ',' + c[1] + ')';
    bar.innerHTML = '<span>' + c[2] + '&nbsp; ' + esc(a.text) + '</span>' +
      '<button type="button" aria-label="Close" title="Close" style="position:absolute;right:10px;top:50%;transform:translateY(-50%);width:28px;height:28px;border:0;border-radius:99px;' +
      'background:rgba(255,255,255,.18);color:#fff;font:700 15px/1 system-ui;cursor:pointer">✕</button>';
    bar.style.position = 'sticky';
    bar.querySelector('button').onclick = function () { hide(a.id); paint(); };
    if (a.until) hideT = setTimeout(paint, Math.min(a.until - Date.now() + 500, 2147483000));
  }
  function set(a) { cur = a && typeof a === 'object' && a.text ? a : null; paint(); }

  // the company name set later in the admin panel: the session keeps the name it had at sign-in, so bring it up to date
  // the session keeps the name it had at sign-in: bring it up to date.
  // Company admin: the company name from the admin panel. Sales agent: his own name (sales_users), never the company's.
  async function syncName(s, c) {
    var nm = '';
    if (s.role === 'sales') {
      if (!s.username || !c || !c.dbUrl) return;
      try {
        var u = String(c.dbUrl).replace(/\/?$/, '/') + 'sales_users/' + encodeURIComponent(String(s.company).toLowerCase()) + '/' + encodeURIComponent(s.username) + '.json';
        var rec = await fetch(u, { cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : null; });
        nm = rec && typeof rec.name === 'string' ? rec.name.trim() : '';
      } catch (e) { return; }
    } else nm = c && typeof c.name === 'string' ? c.name.trim() : '';
    if (!nm || s.name === nm) return;
    var old = s.name || s.company;
    ['localStorage', 'sessionStorage'].forEach(function (k) {
      try { var st = window[k], v = JSON.parse(st.getItem('dl_session') || 'null'); if (v && v.company === s.company && (v.username || '') === (s.username || '')) { v.name = nm; st.setItem('dl_session', JSON.stringify(v)); } } catch (e) {}
    });
    var hi = document.getElementById('hi'); // the greeting on the hub
    if (hi && old && hi.textContent.indexOf(old) >= 0) hi.textContent = hi.textContent.split(old).join(nm);
    // the name in the top menu of the page (shown as plain text)
    if (old) document.querySelectorAll('header *, .app-header *, nav *').forEach(function (el) {
      if (el.children.length === 0 && el.textContent.trim() === old) el.textContent = nm;
    });
  }
  async function start() {
    var DL = G('DL'); if (!DL || typeof DL.session !== 'function') return;
    var s = null; try { s = DL.session(); } catch (e) {}
    if (!s || !s.company) return;
    me = String(s.company).toLowerCase();
    var c = null; try { c = await DL.company(s.company); } catch (e) {}
    syncName(s, c).catch(function () {});
    var db = c && c.dbUrl; if (!db) return;
    db = db.replace(/\/?$/, '/');
    var url = db + 'announce.json';
    function poll() { fetch(url, { cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : null; }).then(set, function () {}); }
    poll();
    try { // live: Firebase sends every change at once
      es = new EventSource(url);
      ['put', 'patch'].forEach(function (ev) { es.addEventListener(ev, function () { poll(); }); });
      es.onerror = function () { /* the browser reconnects by itself; the minute check below covers the gap */ };
    } catch (e) {}
    setInterval(poll, 60000);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { setTimeout(start, 400); });
  else setTimeout(start, 400);
})();
