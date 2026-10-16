/* Dispatch Link CRM: account menu shows only Sign out (plus Admin panel for admins, added by the app itself)
   and a light / dark switch sits in the top bar, like the DMS. Same setting as the other pages ("dl_theme"). */
(function () {
  if (window.__dlCrmUi) return; window.__dlCrmUi = true;
  var css = [
    '#dlAgentDropdownMenu .sm-item[onclick^="openSettingsModal"]{display:none!important}',
    '.dl-thm{display:inline-flex;align-items:center;justify-content:center;flex:none;width:42px;height:42px;margin-right:8px;border:0;border-radius:99px;cursor:pointer;color:#fff;',
    'background:rgba(255,255,255,.07);box-shadow:inset 0 0 0 1px rgba(255,255,255,.12);transition:background .15s}',
    '.dl-thm:hover{background:rgba(255,255,255,.14)}',
    '.dl-thm svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}',
    '.dl-thm .sun{display:none}[data-theme=dark] .dl-thm .sun{display:block}[data-theme=dark] .dl-thm .moon{display:none}',
    '#dlNickProfilePanel{display:flex;align-items:center}',
    /* MC range inputs */
    '.input-field:has(> #startMc),.input-field:has(> #endMc){position:relative}',
    '.input-field:has(> #startMc) label,.input-field:has(> #endMc) label{font-size:12px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--mut);margin-bottom:8px}',
    '#startMc,#endMc{height:54px!important;padding:0 16px 0 78px!important;border-radius:14px!important;font:600 17px/1 "IBM Plex Mono",ui-monospace,Menlo,Consolas,monospace!important;letter-spacing:.04em;color:var(--ink);',
    'background:var(--input)!important;border:1px solid var(--line)!important;box-shadow:inset 0 1px 2px rgba(0,0,0,.06);transition:border-color .15s,box-shadow .15s,background .15s}',
    '#startMc::placeholder,#endMc::placeholder{color:var(--mut);opacity:.55;font-weight:500;letter-spacing:.02em}',
    '#startMc:hover,#endMc:hover{border-color:color-mix(in srgb,var(--accent) 40%,var(--line))!important}',
    '#startMc:focus,#endMc:focus{outline:0;border-color:var(--accent)!important;box-shadow:0 0 0 4px var(--accent-soft),inset 0 1px 2px rgba(0,0,0,.06)!important}',
    '.input-field:has(> #startMc)::after,.input-field:has(> #endMc)::after{content:"MC";position:absolute;left:10px;bottom:11px;height:32px;min-width:42px;padding:0 8px;display:flex;align-items:center;justify-content:center;',
    'border-radius:9px;font:700 12px/1 var(--head,inherit);letter-spacing:.08em;color:var(--accent);background:var(--accent-soft);pointer-events:none}',
    '.input-field:has(> #startMc:focus)::after,.input-field:has(> #endMc:focus)::after{color:#fff;background:var(--grad,var(--accent))}',
    '#startMc.dl-bad,#endMc.dl-bad{border-color:var(--c-red,#dc2626)!important;box-shadow:0 0 0 4px color-mix(in srgb,var(--c-red,#dc2626) 15%,transparent)!important}'
  ].join('');
  function toggle() {
    var r = document.documentElement, t = r.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    r.setAttribute('data-theme', t); r.dataset.theme = t;
    try { localStorage.setItem('dl_theme', t); } catch (e) {}
    try { if (typeof window.syncThemeBtn === 'function') window.syncThemeBtn(); } catch (e) {}
  }
  function place() {
    var panel = document.getElementById('dlNickProfilePanel');
    if (!panel || document.getElementById('dlThm')) return !!panel;
    var b = document.createElement('button');
    b.type = 'button'; b.id = 'dlThm'; b.className = 'dl-thm'; b.title = 'Switch light / dark mode'; b.setAttribute('aria-label', 'Switch light / dark mode');
    b.innerHTML = '<svg class="moon" viewBox="0 0 24 24"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg><svg class="sun" viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';
    b.onclick = toggle;
    panel.insertBefore(b, panel.firstChild);
    return true;
  }
  function start() {
    var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
    /* MC fields: digits only (pasting "MC-1803000" keeps 1803000), flag a range where start > end */
    ['startMc', 'endMc'].forEach(function (id) {
      var el = document.getElementById(id); if (!el) return;
      if (el.value === '0') el.value = '';
      el.addEventListener('input', function () {
        var v = el.value.replace(/[^0-9]/g, ''); if (v !== el.value) el.value = v;
        var a = document.getElementById('startMc'), b = document.getElementById('endMc'), x = parseInt(a.value, 10), y = parseInt(b.value, 10);
        var bad = !isNaN(x) && !isNaN(y) && x > y; a.classList.toggle('dl-bad', bad); b.classList.toggle('dl-bad', bad);
      });
      el.addEventListener('keydown', function (e) { if (e.key === 'Enter') { var btn = document.getElementById('startBtn') || document.querySelector('[onclick*="startScraping"]'); if (btn && !btn.disabled) btn.click(); } });
    });
    if (place()) return;
    var mo = new MutationObserver(function () { if (place()) mo.disconnect(); });
    mo.observe(document.body, { childList: true, subtree: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
