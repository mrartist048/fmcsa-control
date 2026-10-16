/* Dispatch Link CRM: small "verified" badge next to every lead email.
   Checks that the address is well formed and that its domain can receive email (MX record),
   using Cloudflare's public DNS. Results are cached per domain. It cannot see inside a mailbox,
   so "Verified" means: the address is valid and the domain accepts mail. */
(function () {
  if (window.__dlEmailVerify) return; window.__dlEmailVerify = true;

  var FREE = ['gmail.com', 'googlemail.com', 'yahoo.com', 'ymail.com', 'rocketmail.com', 'hotmail.com', 'outlook.com', 'live.com', 'msn.com',
    'aol.com', 'icloud.com', 'me.com', 'mac.com', 'comcast.net', 'att.net', 'sbcglobal.net', 'bellsouth.net', 'verizon.net', 'cox.net',
    'charter.net', 'protonmail.com', 'proton.me', 'gmx.com', 'mail.com', 'zoho.com', 'yandex.com'];
  var TYPO = { 'gmial.com': 'gmail.com', 'gmai.com': 'gmail.com', 'gmail.co': 'gmail.com', 'gmail.con': 'gmail.com', 'gamil.com': 'gmail.com', 'gnail.com': 'gmail.com', 'gmaill.com': 'gmail.com',
    'yaho.com': 'yahoo.com', 'yahoo.co': 'yahoo.com', 'yahooo.com': 'yahoo.com', 'yhoo.com': 'yahoo.com', 'hotmal.com': 'hotmail.com', 'hotmial.com': 'hotmail.com', 'outlok.com': 'outlook.com', 'icloud.co': 'icloud.com', 'aol.co': 'aol.com' };
  var RX = /^[a-z0-9._%+\-]+@([a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,})$/i;
  var KEY = 'dl_mx_cache_v1', TTL = 14 * 86400000, cache = {}, pending = {};
  try { cache = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { cache = {}; }
  function saveCache() { try { localStorage.setItem(KEY, JSON.stringify(cache)); } catch (e) {} }

  var css = [
    '.email-copy .dlv,.dlv{display:inline-flex!important;align-items:center;justify-content:center;width:18px!important;height:18px!important;min-width:18px;padding:0!important;margin:0 7px 0 0!important;border:0!important;border-radius:50%!important;box-shadow:none!important;outline:0;vertical-align:middle;position:relative;top:-1px;flex:none;cursor:help;transition:transform .15s;line-height:0}',
    '.dlv:hover{transform:scale(1.1)}',
    '.email-copy .dlv svg,.dlv svg{width:11px!important;height:11px!important;margin:0!important;padding:0!important;background:none!important;box-shadow:none!important;fill:none!important;stroke:currentColor!important;stroke-width:3.2;stroke-linecap:round;stroke-linejoin:round;filter:none!important}',
    '.email-copy .dlv.ok,.dlv.ok{background:color-mix(in srgb,var(--c-green,#16a34a) 16%,transparent)!important;color:var(--c-green,#16a34a)!important}',
    '.email-copy .dlv.bad,.dlv.bad{background:color-mix(in srgb,var(--c-red,#dc2626) 16%,transparent)!important;color:var(--c-red,#dc2626)!important}',
    '.email-copy .dlv.warn,.dlv.warn{background:color-mix(in srgb,var(--c-orange,#ea8a00) 18%,transparent)!important;color:var(--c-orange,#ea8a00)!important}',
    '.email-copy .dlv.wait,.dlv.wait{background:transparent!important;border:2px solid color-mix(in srgb,currentColor 30%,transparent)!important;border-top-color:currentColor!important;animation:dlvspin .8s linear infinite;opacity:.6}',
    '@keyframes dlvspin{to{transform:rotate(360deg)}}',
    '@media (prefers-reduced-motion:reduce){.dlv.wait{animation:none}}'
  ].join('\n');
  var ICON = {
    ok: '<svg viewBox="0 0 24 24"><polyline points="5 12.5 10 17 19 7"/></svg>',
    bad: '<svg viewBox="0 0 24 24"><line x1="7" y1="7" x2="17" y2="17"/><line x1="17" y1="7" x2="7" y2="17"/></svg>',
    warn: '<svg viewBox="0 0 24 24"><line x1="12" y1="6" x2="12" y2="13"/><line x1="12" y1="18" x2="12" y2="18.5"/></svg>',
    wait: ''
  };

  function mx(domain) {
    var c = cache[domain];
    if (c && Date.now() - c.t < TTL) return Promise.resolve(c.ok);
    if (pending[domain]) return pending[domain];
    pending[domain] = fetch('https://cloudflare-dns.com/dns-query?name=' + encodeURIComponent(domain) + '&type=MX', { headers: { accept: 'application/dns-json' } })
      .then(function (r) { return r.json(); })
      .then(function (j) {
        var ok = !!(j && j.Status === 0 && (j.Answer || []).some(function (a) { return a.type === 15 && !/^0\s+\.$/.test(String(a.data).trim()); }));
        cache[domain] = { ok: ok, t: Date.now() }; saveCache(); return ok;
      })
      .catch(function () { return null; }) // offline / blocked: unknown
      .then(function (v) { delete pending[domain]; return v; });
    return pending[domain];
  }

  function check(email) {
    email = String(email || '').trim().toLowerCase();
    var m = RX.exec(email);
    if (!m) return Promise.resolve({ s: 'bad', tip: 'Not a valid email address.' });
    var d = m[1];
    if (TYPO[d]) return Promise.resolve({ s: 'warn', tip: 'Possible typo: did you mean @' + TYPO[d] + '?' });
    if (FREE.indexOf(d) >= 0) return Promise.resolve({ s: 'ok', tip: 'Verified: valid address on ' + d + '.' });
    return mx(d).then(function (ok) {
      if (ok === null) return { s: 'warn', tip: 'Could not check ' + d + ' right now (no internet?).' };
      return ok ? { s: 'ok', tip: 'Verified: valid address, ' + d + ' accepts email.' } : { s: 'bad', tip: d + ' cannot receive email (no mail server). This email will bounce.' };
    });
  }

  function badge(el) {
    var email = (el.getAttribute('data-email') || el.textContent || '').replace(/\s+/g, '').trim();
    if (!email || email.indexOf('@') < 0) { el.setAttribute('data-dlv', 'none'); return; }
    el.setAttribute('data-dlv', email);
    var b = document.createElement('span'); b.className = 'dlv wait'; b.title = 'Checking...';
    el.insertBefore(b, el.firstChild);
    check(email).then(function (r) {
      if (!b.isConnected) return;
      b.className = 'dlv ' + r.s; b.innerHTML = ICON[r.s]; b.title = r.tip; b.setAttribute('aria-label', r.tip);
    });
  }

  function scan(root) {
    (root || document).querySelectorAll('.email-copy').forEach(function (el) {
      var cur = el.getAttribute('data-dlv'), txt = (el.textContent || '').replace(/\s+/g, '').trim();
      if (cur && (cur === 'none' ? !txt || txt.indexOf('@') < 0 : txt === cur)) return; // already done for this email
      var old = el.querySelector('.dlv'); if (old) old.remove();
      badge(el);
    });
  }

  function start() {
    var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
    scan();
    var t = null;
    new MutationObserver(function () { if (t) return; t = setTimeout(function () { t = null; scan(); }, 120); })
      .observe(document.body, { childList: true, subtree: true, characterData: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
