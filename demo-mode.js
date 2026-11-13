/* Dispatch Link - demo accounts
   A client saved as "Demo" in the admin panel (allowedUsers/<id>: demo = true, demoUntil = time in ms):
   - a banner at the top shows the time left,
   - downloading leads (Excel / CSV, History, follow-ups) shows "demo account" instead of a file,
   - when the time is over the account is signed out. */
(function () {
  'use strict';
  var CONTACT = '923700684849', CONTACT_SHOW = '0370 0684849';
  var G = function (n) { try { return (0, eval)(n); } catch (e) { return undefined; } };
  var DEMO = null, timer = null;

  function css() {
    if (document.getElementById('dlDemoCss')) return;
    var s = document.createElement('style'); s.id = 'dlDemoCss';
    s.textContent =
      '#dlDemoBar{position:sticky;top:0;z-index:9990;display:flex;align-items:center;justify-content:center;gap:12px;flex-wrap:wrap;' +
      'padding:9px 16px;background:linear-gradient(90deg,#f59e0b,#f97316);color:#1b1205;font:600 14px/1.35 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;text-align:center}' +
      '#dlDemoBar b{font-weight:800}#dlDemoBar a{color:#fff;background:#1b1205;border-radius:999px;padding:5px 14px;text-decoration:none;font-weight:700;white-space:nowrap}' +
      '#dlDemoPop{position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(5,10,25,.6)}' +
      '#dlDemoPop .bx{max-width:420px;width:100%;background:var(--card,#fff);color:var(--text,#0f172a);border-radius:16px;padding:24px;text-align:center;' +
      'box-shadow:0 20px 60px rgba(0,0,0,.35);font:15px/1.5 system-ui,-apple-system,Segoe UI,Roboto,sans-serif}' +
      '#dlDemoPop h3{margin:0 0 8px;font-size:19px}#dlDemoPop p{margin:0 0 18px;opacity:.85}' +
      '#dlDemoPop .row{display:flex;gap:10px;justify-content:center;flex-wrap:wrap}' +
      '#dlDemoPop a,#dlDemoPop button{border:0;border-radius:10px;padding:10px 18px;font:600 14px system-ui,sans-serif;cursor:pointer;text-decoration:none}' +
      '#dlDemoPop a{background:#16a34a;color:#fff}#dlDemoPop button{background:rgba(127,127,127,.18);color:inherit}';
    document.head.appendChild(s);
  }
  function wa(text) { return 'https://wa.me/' + CONTACT + '?text=' + encodeURIComponent(text); }
  function left(ms) {
    if (ms <= 0) return '0 min';
    var m = Math.ceil(ms / 60000), h = Math.floor(m / 60); m = m % 60;
    return (h ? h + ' h ' : '') + m + ' min';
  }
  function paintBar() {
    var bar = document.getElementById('dlDemoBar');
    if (!bar) {
      bar = document.createElement('div'); bar.id = 'dlDemoBar';
      document.body.insertBefore(bar, document.body.firstChild);
    }
    bar.innerHTML = '<span><b>Demo account</b> &middot; ' + left(DEMO.until - Date.now()) + ' left &middot; Downloading leads is not available in the demo.</span>' +
      '<a href="' + wa('Hello, I am using the Dispatch Link demo (' + DEMO.id + ') and I want to buy Dispatch Link.') + '" target="_blank" rel="noopener">Buy Dispatch Link</a>';
  }
  function popup(title, text, onClose) {
    css();
    var old = document.getElementById('dlDemoPop'); if (old) old.remove();
    var p = document.createElement('div'); p.id = 'dlDemoPop';
    p.innerHTML = '<div class="bx"><h3>' + title + '</h3><p>' + text + '</p><div class="row">' +
      '<a href="' + wa('Hello, I want to buy Dispatch Link. My demo account: ' + DEMO.id) + '" target="_blank" rel="noopener">Buy Dispatch Link</a>' +
      (onClose === false ? '' : '<button type="button">Close</button>') + '</div>' +
      '<p style="margin:14px 0 0;font-size:13px;opacity:.7">WhatsApp / call: ' + CONTACT_SHOW + '</p></div>';
    document.body.appendChild(p);
    var b = p.querySelector('button');
    if (b) b.onclick = function () { p.remove(); if (typeof onClose === 'function') onClose(); };
    p.addEventListener('click', function (e) { if (e.target === p && onClose !== false) p.remove(); });
  }
  function blocked() {
    popup('This is a demo account', 'Downloading leads is not available in the demo. Buy Dispatch Link to download your leads.');
  }
  function lockDownloads() {
    // every lead / follow-up download of the CRM goes through these functions
    ['triggerCSVDownload', 'downloadCSV', 'downloadHistoryCSV', 'downloadSelectedHistory', 'downloadFollowUpsCSV'].forEach(function (n) {
      if (typeof G(n) === 'function') try { window[n] = function () { blocked(); }; (0, eval)(n + ' = window.' + n); } catch (e) {}
    });
    // any other file download made in the page
    var click = HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click = function () {
      if (DEMO && this.hasAttribute('download') && /^(blob:|data:)/.test(this.href || '')) return blocked();
      return click.apply(this, arguments);
    };
  }
  function ended() {
    clearInterval(timer);
    popup('Your demo has ended', 'Thank you for trying Dispatch Link. To keep using it and download your leads, buy Dispatch Link.', false);
    setTimeout(function () { var DL = G('DL'); try { DL && DL.logout ? DL.logout() : location.replace('index.html'); } catch (e) { location.replace('index.html'); } }, 8000);
  }
  async function start() {
    var DL = G('DL'); if (!DL || typeof DL.session !== 'function') return;
    var s = null; try { s = DL.session(); } catch (e) {}
    if (!s || !s.company) return;
    var c = null; try { c = await DL.company(s.company); } catch (e) {}
    if (!c || !c.demo) return;
    var until = +c.demoUntil || 0, mins = +c.demoMins || 0;
    if (!until && mins) { // "the time starts when the client creates his password": this is his first sign-in, start it now
      var lk = 'dl_demo_start_' + s.company, t0 = 0;
      try { t0 = +localStorage.getItem(lk) || 0; } catch (e) {}
      until = (t0 || Date.now()) + mins * 60000;
      try { if (!t0) localStorage.setItem(lk, String(Date.now())); } catch (e) {}
      try {
        if (typeof DL.patchCompany === 'function') await DL.patchCompany(c, { demoUntil: until }); // the secure rules let the client save only this, once
      } catch (e) {} // a sales agent may not save it: the admin's next sign-in will
    }
    DEMO = { id: s.company, until: until };
    css(); lockDownloads();
    if (DEMO.until && Date.now() >= DEMO.until) return ended();
    paintBar();
    timer = setInterval(function () { if (DEMO.until && Date.now() >= DEMO.until) ended(); else paintBar(); }, 30000);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { setTimeout(start, 300); });
  else setTimeout(start, 300);
})();
