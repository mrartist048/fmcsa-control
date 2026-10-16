/* Dispatch Link: one-click WhatsApp pitch for every lead.
   - A green WhatsApp button appears next to every phone number
     (leads table and follow-up cards). One click opens the chat with the message ready.
   - "WhatsApp setup" (top menu) edits the WhatsApp template.
   - Placeholders: {name} owner full name, {firstname} owner first name, {company} company name.
     If the owner's name is not known, the name becomes "there".
   - Templates are saved on this device (localStorage). Nothing is sent automatically:
     the agent always presses Send inside WhatsApp.
   Load this file AFTER scraper-core.js and email-names.js. */
(function () {
  if (window.__dlWhatsApp) return;
  window.__dlWhatsApp = true;

  var KEY_WA = "dl_wa_template", KEY_SENT = "dl_wa_sent";
  var FALLBACK = "there";
  var DEFAULT_WA = "Hello {firstname}, this is Dispatch Link. I saw that {company} is an active carrier and we would love to help you with dispatch: finding good paying loads, rate negotiation and all the paperwork, so you can focus on driving.\n\nWould you be open to a quick chat?";

  /* ---------- storage ---------- */
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } }
  function getTpl() {
    var v = lsGet(KEY_WA);
    return v && v.trim() ? v : DEFAULT_WA;
  }
  function readSent() { try { return JSON.parse(lsGet(KEY_SENT) || "{}") || {}; } catch (e) { return {}; } }
  function markSent(num) {
    var s = readSent(); s[num] = Date.now();
    var keys = Object.keys(s);
    if (keys.length > 5000) { keys.sort(function (a, b) { return s[a] - s[b]; }).slice(0, keys.length - 5000).forEach(function (k) { delete s[k]; }); }
    lsSet(KEY_SENT, JSON.stringify(s));
  }

  /* ---------- text helpers ---------- */
  function norm(v) { return String(v || "").trim().toLowerCase(); }
  function titleCase(s) { return String(s || "").toLowerCase().replace(/(^|[\s\-'.])([a-z])/g, function (m, p, c) { return p + c.toUpperCase(); }); }
  function cleanOwner(raw) {
    var s = String(raw || "").replace(/\s+/g, " ").trim();
    if (!s || s === "—" || /^(n\/a|none|null|undefined|-+)$/i.test(s)) return "";
    var m = s.match(/^([^,]+),\s*(.+)$/);
    if (m && !/\b(llc|inc|corp|ltd|co)\b/i.test(s)) s = m[2] + " " + m[1];
    return titleCase(s);
  }
  function firstName(full) {
    var parts = String(full || "").split(" ").filter(function (p) { return p.replace(/\./g, "").length > 1; });
    return parts[0] || "";
  }
  function fill(text, company, owner) {
    var full = cleanOwner(owner), first = firstName(full);
    return String(text || "")
      .replace(/\{company\}/gi, company || "your company")
      .replace(/\{firstname\}/gi, first || FALLBACK)
      .replace(/\{name\}/gi, full || FALLBACK);
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

  /* US numbers: 10 digits -> 1XXXXXXXXXX. Other lengths are used as typed (digits only). */
  function waNumber(raw) {
    var d = String(raw || "").replace(/\D/g, "");
    if (d.length === 10) return "1" + d;
    if (d.length === 11 && d.charAt(0) === "1") return d;
    if (d.length >= 11 && d.length <= 15) return d;
    return "";
  }

  function toast(msg) {
    try { if (typeof showPremiumNotification === "function") { showPremiumNotification(msg); return; } } catch (e) {}
    var st = document.getElementById("toastStack");
    if (!st) return;
    var t = document.createElement("div");
    t.className = "toast"; t.textContent = msg; st.appendChild(t);
    setTimeout(function () { try { t.remove(); } catch (e) {} }, 3000);
  }

  /* ---------- owner lookup (follow-up cards have no table row) ---------- */
  function ownerFromScraped(company) {
    try {
      if (typeof scrapedData !== "undefined" && Array.isArray(scrapedData)) {
        var c = norm(company);
        for (var i = 0; i < scrapedData.length; i++) {
          var r = scrapedData[i];
          if (r && r.owner && norm(r.name) === c) return r.owner;
        }
      }
    } catch (e) {}
    return "";
  }
  function ownerFromFollowups(mc, company, cb) {
    var done = false;
    function finish(v) { if (!done) { done = true; cb(v || ""); } }
    try {
      if (typeof getAllAppDataFromIndexedDB !== "function" || typeof db === "undefined" || !db) return finish("");
      getAllAppDataFromIndexedDB("followups", function (rows) {
        var hit = "";
        (rows || []).forEach(function (r) {
          if (!r || !r.owner) return;
          if ((mc && String(r.mc) === String(mc)) || (!hit && norm(r.name) === norm(company))) hit = r.owner;
        });
        finish(hit);
      });
      setTimeout(function () { finish(""); }, 800);
    } catch (e) { finish(""); }
  }

  /* ---------- context from the clicked button ---------- */
  function getContext(btn, cb) {
    var phone = btn.getAttribute("data-phone") || "";
    var tr = btn.closest("tr"), card = btn.closest(".fu-card");
    if (tr) {
      var c = tr.querySelector(".cc-name"), o = tr.querySelector(".owner-cell");
      var company = c ? (c.getAttribute("title") || c.textContent).trim() : "";
      var owner = o ? (o.getAttribute("title") || o.textContent).trim() : "";
      return cb({ phone: phone, company: company, owner: owner || ownerFromScraped(company) });
    }
    if (card) {
      var t = card.querySelector(".fu-title b"), cb2 = card.querySelector(".followup-select-checkbox");
      var comp = t ? t.textContent.trim() : "";
      var mc = cb2 ? cb2.value : "";
      var local = ownerFromScraped(comp);
      if (local) return cb({ phone: phone, company: comp, owner: local });
      return ownerFromFollowups(mc, comp, function (o2) { cb({ phone: phone, company: comp, owner: o2 }); });
    }
    cb({ phone: phone, company: "", owner: "" });
  }

  /* ---------- sending ---------- */
  function send(btn) {
    var num = waNumber(btn.getAttribute("data-phone"));
    if (!num) { toast("No valid phone number for this lead."); return; }
    getContext(btn, function (ctx) {
      var text = fill(getTpl(), ctx.company, ctx.owner);
      var url = "https://wa.me/" + num + "?text=" + encodeURIComponent(text);
      window.open(url, "_blank", "noopener");
      markSent(num + ":wa");
      refreshSent();
    });
  }

  /* ---------- buttons ---------- */
  var WA_SVG = '<svg class="ico" aria-hidden="true"><use href="#i-chat"/></svg>';

  function makeButtons(phone, forCard) {
    var num = waNumber(phone);
    var wrap = document.createElement("span");
    wrap.className = forCard ? "dl-wa-group dl-wa-card" : "dl-wa-group";
    var dis = num ? "" : " disabled";
    var cls = forCard ? "hc-btn" : "";
    wrap.innerHTML =
      '<button type="button" class="dl-wa-btn dl-wa ' + cls + '" data-kind="wa" data-phone="' + esc(phone) + '" data-num="' + num + '" title="Send WhatsApp pitch" aria-label="Send WhatsApp pitch"' + dis + '>' + WA_SVG + (forCard ? "Send WhatsApp pitch" : "") + '</button>';
    return wrap;
  }

  function decorate() {
    var boxes = document.querySelectorAll(".phone-box:not([data-wa])");
    for (var i = 0; i < boxes.length; i++) {
      var box = boxes[i]; box.setAttribute("data-wa", "1");
      var t = box.querySelector(".clickable-phone-text");
      var phone = t ? t.textContent.trim() : "";
      if (!phone) continue;
      box.appendChild(makeButtons(phone, false));
    }
    var cards = document.querySelectorAll(".fu-card:not([data-wa])");
    for (var j = 0; j < cards.length; j++) {
      var card = cards[j]; card.setAttribute("data-wa", "1");
      var meta = card.querySelector(".fu-meta span");
      var ph = meta ? meta.textContent.trim() : "";
      var actions = card.querySelector(".fu-actions");
      if (!ph || !actions) continue;
      var row = document.createElement("div");
      row.className = "dl-wa-row";
      row.appendChild(makeButtons(ph, true));
      actions.parentNode.insertBefore(row, actions.nextSibling);
    }
    refreshSent();
  }

  function refreshSent() {
    var s = readSent();
    var all = document.querySelectorAll(".dl-wa-btn[data-num]");
    for (var i = 0; i < all.length; i++) {
      var b = all[i], key = b.getAttribute("data-num") + ":" + b.getAttribute("data-kind");
      var sent = !!s[key];
      if (sent !== b.classList.contains("sent")) b.classList.toggle("sent", sent);
    }
  }

  document.addEventListener("click", function (ev) {
    var b = ev.target && ev.target.closest && ev.target.closest(".dl-wa-btn");
    if (!b || b.disabled) return;
    ev.preventDefault(); ev.stopPropagation();
    send(b);
  }, true);

  /* ---------- styles ---------- */
  var css = document.createElement("style");
  css.textContent =
    ".dl-wa-group{display:inline-flex;gap:4px;margin-left:6px;vertical-align:middle}" +
    ".dl-wa-group.dl-wa-card{display:flex;gap:8px;margin:0;width:100%}" +
    ".dl-wa-row{margin-top:8px}" +
    ".dl-wa-btn.hc-btn{flex:1 1 0;justify-content:center;white-space:nowrap}" +
    ".dl-wa-btn:not(.hc-btn){display:inline-flex;align-items:center;justify-content:center;height:28px;min-width:28px;padding:0 6px;border-radius:8px;border:1px solid rgba(37,211,102,.5);background:rgba(37,211,102,.12);color:#16a34a;font:600 10.5px/1 inherit;cursor:pointer;flex:none}" +
    ".dl-wa-btn:not(.hc-btn) .ico{width:15px;height:15px}" +
    ".dl-wa-btn:not(.hc-btn):hover:not(:disabled){background:#25D366;color:#fff;border-color:#25D366}" +
    ".dl-wa-btn:disabled{opacity:.35;cursor:not-allowed}" +
    ".dl-wa-btn.sent:not(.hc-btn){background:#25D366;border-color:#25D366;color:#fff}" +
    ".dl-wa-btn.hc-btn.sent{border-color:#25D366;color:#16a34a}" +
    ".dl-wa-btn.hc-btn.dl-wa .ico{color:#16a34a}" +
    "#dlWAModal .modal-card{width:760px}" +
    "#dlWAModal .wa-head{padding:22px 24px 8px}#dlWAModal .wa-head h3{margin:0 0 4px}#dlWAModal .wa-head p{margin:0;color:var(--mut)}" +
    "#dlWAModal .wa-body{display:grid;grid-template-columns:1fr 1fr;gap:18px;padding:12px 24px 8px}" +
    "#dlWAModal textarea{width:100%;min-height:210px;resize:vertical;box-sizing:border-box}" +
    "#dlWAModal .wa-chips{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0}" +
    "#dlWAModal .wa-prev-title{font-size:12px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--mut);margin-bottom:8px}" +
    "#dlWAModal .wa-bubble{background:#DCF8C6;color:#111;border-radius:12px 12px 12px 2px;padding:10px 12px;font-size:13.5px;line-height:1.45;white-space:pre-wrap;word-break:break-word;box-shadow:0 1px 2px rgba(0,0,0,.15)}" +
    "[data-theme=dark] #dlWAModal .wa-bubble{background:#005C4B;color:#E9EDEF}" +
    "#dlWAModal .wa-count{font-size:12px;color:var(--mut);margin-top:6px}" +
    "#dlWAModal mark{background:rgba(37,211,102,.25);color:inherit;border-radius:3px;padding:0 2px}" +
    "#dlWAModal .wa-foot{display:flex;gap:8px;align-items:center;padding:12px 24px 22px}#dlWAModal .wa-foot .sp{flex:1}" +
    "@media(max-width:700px){#dlWAModal .wa-body{grid-template-columns:1fr}}";
  document.head.appendChild(css);

  /* ---------- setup modal ---------- */

  function buildModal() {
    if (document.getElementById("dlWAModal")) return;
    var o = document.createElement("div");
    o.className = "overlay"; o.id = "dlWAModal";
    o.innerHTML =
      '<div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="waTitle">' +
      '<button class="x" id="waClose" aria-label="Close"><svg class="ico"><use href="#i-x"/></svg></button>' +
      '<div class="wa-head"><h3 id="waTitle">WhatsApp setup</h3><p>Write the pitch that is sent when you press the green WhatsApp button next to a phone number. Saved on this device.</p></div>' +
      '<div class="wa-body"><div>' +
      '<div class="wa-chips"><button type="button" class="es-chip" data-ins="{name}">Insert {name}</button><button type="button" class="es-chip" data-ins="{firstname}">Insert {firstname}</button><button type="button" class="es-chip" data-ins="{company}">Insert {company}</button></div>' +
      '<textarea id="waText" placeholder="Hello {firstname}, ..."></textarea>' +
      '<div class="wa-count" id="waCount"></div></div>' +
      '<div><div class="wa-prev-title">Preview</div><div class="wa-bubble" id="waPrev"></div></div></div>' +
      '<div class="wa-foot"><button type="button" class="btn-ghost" id="waReset">Reset to default</button><span class="sp"></span><button type="button" class="btn-ghost" id="waCancel">Cancel</button><button type="button" class="btn-primary" id="waSave">Save template</button></div>' +
      '</div>';
    document.body.appendChild(o);

    var ta = o.querySelector("#waText");
    o.addEventListener("click", function (e) { if (e.target === o) close(); });
    o.querySelector("#waClose").onclick = close;
    o.querySelector("#waCancel").onclick = close;
    o.querySelector("#waSave").onclick = save;
    o.querySelector("#waReset").onclick = function () { ta.value = DEFAULT_WA; preview(); };
    ta.addEventListener("input", preview);
    o.querySelectorAll("[data-ins]").forEach(function (b) {
      b.onclick = function () {
        var v = b.getAttribute("data-ins"), s = ta.selectionStart || 0, e2 = ta.selectionEnd || 0;
        ta.value = ta.value.slice(0, s) + v + ta.value.slice(e2);
        ta.focus(); ta.selectionStart = ta.selectionEnd = s + v.length;
        preview();
      };
    });
  }

  function preview() {
    var o = document.getElementById("dlWAModal"), ta = o.querySelector("#waText");
    var html = esc(ta.value)
      .replace(/\{company\}/gi, "<mark>Sample Logistics LLC</mark>")
      .replace(/\{firstname\}/gi, "<mark>John</mark>")
      .replace(/\{name\}/gi, "<mark>John Smith</mark>");
    o.querySelector("#waPrev").innerHTML = html || "<i>Empty message</i>";
    o.querySelector("#waCount").textContent = fill(ta.value, "Sample Logistics LLC", "John Smith").length + " characters";
  }

  function save() {
    var v = document.getElementById("waText").value.trim() || DEFAULT_WA;
    toast(lsSet(KEY_WA, v) ? "WhatsApp template saved." : "Could not save on this browser.");
    close();
  }

  function open() {
    buildModal();
    document.getElementById("waText").value = getTpl();
    preview();
    document.getElementById("dlWAModal").classList.add("show");
  }
  function close() {
    var o = document.getElementById("dlWAModal");
    if (o) o.classList.remove("show");
  }
  window.openWhatsAppSetup = open;
  window.closeWhatsAppSetup = close;

  function addNavButton() {
    if (document.getElementById("openWASetupBtn")) return;
    var after = document.getElementById("openEmailSetupBtn");
    if (!after || !after.parentNode) return;
    var b = document.createElement("button");
    b.type = "button"; b.className = "nav-tab"; b.id = "openWASetupBtn";
    b.textContent = "WhatsApp setup"; b.onclick = open;
    after.parentNode.insertBefore(b, after.nextSibling);
  }

  /* ---------- keep buttons on freshly painted rows / cards ---------- */
  var pending = false;
  function schedule() {
    if (pending) return; pending = true;
    (window.requestAnimationFrame || setTimeout)(function () { pending = false; decorate(); });
  }
  function start() {
    addNavButton(); decorate();
    new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") close(); });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
