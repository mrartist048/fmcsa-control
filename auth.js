/* =====================================================================
   Dispatch Link – auth.js  (shared by every page)
   Licence (allowedUsers + expiry) · login · roles · session guard
   Roles: admin -> hub.html | sales -> crm.html | dispatcher -> dms.html
   ===================================================================== */
/* ---------- shared UI: logo splash (loading) + success tick ---------- */
const DLUI = (() => {
  const LOGO = 'https://cdn.jsdelivr.net/gh/mrartist048/fmcsa-control@main/favicon.png';
  const css = `
#dlSplash{position:fixed;inset:0;z-index:2147483000;display:none;flex-direction:column;align-items:center;justify-content:center;gap:18px;background:#0b1220;color:#e8eefc;font:600 14px system-ui,Segoe UI,Arial,sans-serif;letter-spacing:.3px}
#dlSplash.on{display:flex}
#dlSplash .lg{width:96px;height:96px;display:grid;place-items:center;background:none;box-shadow:none;animation:dlPulse 1.4s ease-in-out infinite}
#dlSplash img{width:84px;height:84px;object-fit:contain;background:none;filter:drop-shadow(0 8px 24px rgba(59,130,246,.35))}
#dlSplash .bar{width:150px;height:4px;border-radius:4px;background:rgba(255,255,255,.14);overflow:hidden}
#dlSplash .bar i{display:block;width:40%;height:100%;border-radius:4px;background:#3b82f6;animation:dlBar 1.1s ease-in-out infinite}
@keyframes dlPulse{50%{transform:scale(1.06)}}
@keyframes dlBar{0%{margin-left:-40%}100%{margin-left:100%}}
#dlBusy{position:fixed;inset:0;z-index:2147482000;display:none;align-items:center;justify-content:center;background:rgba(10,15,28,.35);backdrop-filter:blur(2px)}
#dlBusy.on{display:flex}
#dlBusy .bx{min-width:170px;padding:22px 28px;border-radius:16px;background:#fff;color:#0f172a;text-align:center;font:600 14px system-ui,Segoe UI,Arial,sans-serif;box-shadow:0 18px 50px rgba(0,0,0,.3)}
#dlBusy .sp{width:34px;height:34px;margin:0 auto 10px;border-radius:50%;border:4px solid #dbe4f5;border-top-color:#2563eb;animation:dlSpin .7s linear infinite}
#dlBusy .ck{width:44px;height:44px;margin:0 auto 10px;border-radius:50%;background:#16a34a;display:none;place-items:center;animation:dlPop .28s ease-out}
#dlBusy .ck svg{width:26px;height:26px;stroke:#fff;stroke-width:3.4;fill:none;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:30;stroke-dashoffset:30;animation:dlDraw .35s .12s ease-out forwards}
#dlBusy.ok .sp{display:none}#dlBusy.ok .ck{display:grid}
@keyframes dlSpin{to{transform:rotate(360deg)}}@keyframes dlPop{from{transform:scale(.4);opacity:0}to{transform:scale(1);opacity:1}}@keyframes dlDraw{to{stroke-dashoffset:0}}`;
  let splash, busy, st, n = 0, tmr, hold = false, safety;
  function mk() {
    if (splash) return;
    st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
    splash = document.createElement('div'); splash.id = 'dlSplash';
    splash.innerHTML = '<div class="lg"><img src="' + LOGO + '" alt=""></div><div>Dispatch Link</div><div class="bar"><i></i></div><div id="dlSplashMsg" style="font-weight:500;opacity:.7;font-size:12.5px">Loading…</div>';
    busy = document.createElement('div'); busy.id = 'dlBusy';
    busy.innerHTML = '<div class="bx"><div class="sp"></div><div class="ck"><svg viewBox="0 0 24 24"><polyline points="5 12.5 10 17.5 19 7"/></svg></div><div id="dlBusyMsg">Working…</div></div>';
    document.documentElement.appendChild(splash); document.documentElement.appendChild(busy);
  }
  function ready(f) { if (document.head) f(); else document.addEventListener('DOMContentLoaded', f); }
  const api = {
    splash(msg) { ready(() => { mk(); document.getElementById('dlSplashMsg').textContent = msg || 'Loading…'; splash.classList.add('on'); clearTimeout(safety); safety = setTimeout(api.hide, 20000); }); },
    hide() { clearTimeout(safety); if (splash) splash.classList.remove('on'); else ready(() => splash && splash.classList.remove('on')); },
    holdSplash() { hold = true; },
    isHeld() { return hold; },
    start(msg) { ready(() => { mk(); n++; clearTimeout(tmr); busy.classList.remove('ok'); document.getElementById('dlBusyMsg').textContent = msg || 'Working…'; busy.classList.add('on'); }); },
    done(msg) { ready(() => { mk(); n = Math.max(0, n - 1); if (n) return; document.getElementById('dlBusyMsg').textContent = msg || 'Done'; busy.classList.add('ok', 'on'); clearTimeout(tmr); tmr = setTimeout(() => busy.classList.remove('on', 'ok'), 900); }); },
    fail() { ready(() => { n = Math.max(0, n - 1); if (!n && busy) { clearTimeout(tmr); busy.classList.remove('on', 'ok'); } }); },
    async run(fn, startMsg, doneMsg) { api.start(startMsg); try { const r = await fn(); api.done(doneMsg); return r; } catch (e) { api.fail(); throw e; } }
  };
  return api;
})();
window.DLUI = DLUI;
/* protected pages show the logo splash from the very first moment (the page hides it once it is ready) */
if (!/(^|\/)(index\.html)?$/.test(location.pathname)) DLUI.splash('Loading your workspace…');

const DL = (() => {
  const DBS = ["https://data-scrapper-eddcf-default-rtdb.firebaseio.com/",
               "https://data-scraper-2-default-rtdb.firebaseio.com/",
               "https://data-scraper-3-default-rtdb.firebaseio.com/"];
  const KEY = 'dl_session', HOME = { admin: 'hub.html', sales: 'crm.html', dispatcher: 'dms.html' };
  const FATAL = ['EXPIRED', 'NO_COMPANY', 'BAD_LOGIN', 'REMOVED'];
  const MSGS = {
    EMPTY: 'Please enter your username and password.',
    BAD_LOGIN: 'Invalid username or password.',
    NOT_ACTIVATED: 'This company has no password yet. Use "Create your password" below.',
    NOT_ALLOWED: 'This username is not authorised. Contact Dispatch Link admin.',
    ALREADY: 'Password is already created for this company. Please sign in.',
    SHORT: 'Password must be at least 6 characters.',
    MISMATCH: 'Passwords do not match.',
    EXPIRED: 'Subscription has expired! Contact Admin.',
    NO_COMPANY: 'Company not found or no longer active.',
    REMOVED: 'Your access has been removed. Contact your admin.',
    NO_SHEET: 'Dispatch team login is not ready yet: your admin must connect the Google Sheet in DMS > Settings.',
    ACCESS_REMOVED: 'Your access has been removed. Contact your admin.',
    NETWORK: 'No internet connection.',
    SHEET_NET: 'Cannot reach the Google Sheet link. Check: (1) the URL ends with /exec, (2) Apps Script > Deploy > Manage deployments: Execute as = Me, Who has access = Anyone, (3) after any code change deploy a New version. Test: open the link in a new tab - it must show {"ok":true,...}.',
    PERMISSION: 'Firebase blocked the request. Check the Realtime Database rules (see README).',
    ALREADY_ONLINE: 'This account is already signed in on another device. Sign out there first, or ask your admin to sign it out, then try again.',
    KICKED: 'This account was signed in on another device, so you have been signed out here.',
    BAD_RESPONSE: 'Google Sheet did not answer. Admin: re-deploy the Apps Script as Web app (access: Anyone).'
  };
  const msg = e => MSGS[e && e.message] || ('Something went wrong: ' + ((e && e.message) || e));
  const err = m => { throw new Error(m); };
  const enc = new TextEncoder();
  const hex = b => [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
  const newSalt = () => hex(crypto.getRandomValues(new Uint8Array(16)));
  async function hashPw(pw, salt) {                 // salted PBKDF2-SHA256 (same as the old DMS)
    const k = await crypto.subtle.importKey('raw', enc.encode(pw), 'PBKDF2', false, ['deriveBits']);
    return hex(await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: enc.encode(salt), iterations: 100000, hash: 'SHA-256' }, k, 256));
  }
  const today = () => new Date().toISOString().slice(0, 10);
  async function jf(u, o) {
    let r;
    try { r = await fetch(u, o && o.body ? { ...o, headers: { 'Content-Type': 'application/json' } } : o); }
    catch (e) { console.error('Request failed:', u, e); err('NETWORK'); }
    if (!r.ok) err('PERMISSION');
    return r.json();
  }
  async function sheet(url, action, x) {
    for (let i = 0; ; i++) {
      try { return await sheet1(url, action, x); }
      catch (e) { if (i >= 4 || !['BAD_RESPONSE', 'SHEET_NET'].includes(e.message)) throw e; await new Promise(r => setTimeout(r, 1000 * (i + 1))); }
    }
  }
  let LAST = '';
  function jsonp(url, payload) {                     // <script> transport: no CORS, follows redirects
    return new Promise((res, rej) => {
      const cb = 'dlcb' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), s = document.createElement('script');
      let t; const done = () => { delete window[cb]; s.remove(); clearTimeout(t); };
      const q = 'p=' + encodeURIComponent(JSON.stringify(payload)) + '&callback=' + cb;
      if (q.length > 7000) return rej(new Error('SHEET_NET'));
      t = setTimeout(() => { done(); LAST = 'script transport timeout'; rej(new Error('SHEET_NET')); }, 30000);
      window[cb] = d => { done(); res(d); };
      s.onerror = () => { done(); LAST = 'script transport blocked'; rej(new Error('SHEET_NET')); };
      s.onload = () => setTimeout(() => { if (window[cb]) { done(); LAST = 'script transport got no data (redeploy Code.gs as New version)'; rej(new Error('BAD_RESPONSE')); } }, 50);
      s.src = url + (url.includes('?') ? '&' : '?') + q;
      document.head.appendChild(s);
    });
  }
  async function sheetCall(url, payload, safe) {     // fetch first; if the browser blocks it, use the script transport
    let r;
    try { r = await fetch(url, { method: 'POST', body: JSON.stringify(payload) }); }
    catch (e) { LAST = 'fetch blocked: ' + e; return jsonp(url, payload); }
    try { return await r.json(); }
    catch { LAST = 'non-JSON reply (HTTP ' + r.status + ')'; if (safe) return jsonp(url, payload); err('BAD_RESPONSE'); }
  }
  async function sheet1(url, action, x) {
    if (!/^https:\/\/script\.google\.com\//.test(url || '')) err('NO_SHEET');
    return sheetCall(url, { action, ...x }, true);
  }

  /* ---------- companies (licence) ---------- */
  let CC = null, CCt = 0;
  function companies() {                               // short cache: the same list is needed twice per page load
    if (CC && Date.now() - CCt < 15000) return CC;
    CCt = Date.now(); CC = companies1(); CC.catch(() => { CC = null; }); return CC;
  }
  async function companies1() {
    let failed = 0;
    const res = await Promise.all(DBS.map(u => jf(u + 'allowedUsers.json').catch(() => { failed++; return null; })));
    if (failed === DBS.length) err('NETWORK');
    const all = {};
    res.forEach((us, i) => us && Object.keys(us).forEach(k => { if (us[k] && typeof us[k] === 'object') all[k] = { ...us[k], id: k, dbUrl: us[k].dbUrl || DBS[i] }; }));
    return all;
  }
  async function company(id) {
    const all = await companies(), want = String(id || '').trim().toLowerCase();
    const k = Object.keys(all).find(x => x === id) || Object.keys(all).find(x => x.toLowerCase() === want);
    return k ? all[k] : null;
  }
  const expiry = c => { if (!c) err('NO_COMPANY'); if (c.expires && today() > c.expires) err('EXPIRED'); return c; };
  const base = c => c.dbUrl.endsWith('/') ? c.dbUrl : c.dbUrl + '/';
  const patchCompany = (c, o) => (CC = null, DLUI.run(() => patchCompany1(c, o), 'Saving…', 'Saved')); 
  const patchCompany1 = (c, o) => Promise.all(Object.keys(o).map(k => {   // one PUT/DELETE per field
    const u = base(c) + 'allowedUsers/' + c.id + '/' + k + '.json';
    return o[k] === null ? jf(u, { method: 'DELETE' }) : jf(u, { method: 'PUT', body: JSON.stringify(o[k]) });
  }));
  const salesUrl = (c, u) => base(c) + 'sales_users/' + c.id + (u ? '/' + u : '') + '.json';

  /* ---------- sales agents (CRM logins, stored in the company's own database) ---------- */
  const salesList = async c => (await jf(salesUrl(c))) || {};
  const salesPut = (c, u, name, pw, tabs) => DLUI.run(() => salesPut1(c, u, name, pw, tabs), 'Saving…', 'Saved');
  const salesSetTabs = (c, u, n) => DLUI.run(() => jf(salesUrl(c, u), { method: 'PATCH', body: JSON.stringify({ tabs: Math.max(1, Math.min(20, +n || 1)) }) }), 'Saving…', 'Saved');
  async function salesPut1(c, u, name, pw, tabs) {
    const salt = newSalt(), hash = await hashPw(pw, salt);
    return jf(salesUrl(c, u), { method: 'PUT', body: JSON.stringify({ name, salt, hash, tabs: Math.max(1, Math.min(20, +tabs || 1)), created: Date.now() }) });
  }
  const salesDel = (c, u) => DLUI.run(() => jf(salesUrl(c, u), { method: 'DELETE' }), 'Removing…', 'Removed');

  /* ---------- one device per team member (sales agents + dispatchers) ---------- */
  const LOCKED = ['sales', 'dispatcher'], LOCK_TTL = 90000, BEAT = 20000;
  const DEV = (() => {
    try { let d = localStorage.getItem('dl_device'); if (!d) { d = 'dev_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10); localStorage.setItem('dl_device', d); } return d; }
    catch { return 'dev_' + Math.random().toString(36).slice(2, 12); }
  })();
  let CUR = null, kicked = false;                      // CUR = this user's company record
  const lockUrl = (c, u) => base(c) + 'device_locks/' + c.id + (u ? '/' + u : '') + '.json';
  async function serverNow(c) {                        // Firebase's own clock: a PC with a wrong clock can neither cheat nor lock itself out
    try {
      const t = await jf(base(c) + 'device_locks/' + c.id + '/_clock/' + DEV + '.json', { method: 'PUT', body: JSON.stringify({ '.sv': 'timestamp' }) });
      if (typeof t === 'number') return t;
    } catch (e) { /* fall back to local clock */ }
    return Date.now();
  }
  const putLock = (c, s) => jf(lockUrl(c, s.username), { method: 'PUT', body: JSON.stringify({ dev: DEV, role: s.role, ts: { '.sv': 'timestamp' } }) });
  async function claimLock(c, s) {                     // sign-in: refuse when another device is active on this account
    const [now, cur] = await Promise.all([serverNow(c), jf(lockUrl(c, s.username))]);
    if (cur && cur.dev && cur.dev !== DEV && cur.ts && now - cur.ts < LOCK_TTL) err('ALREADY_ONLINE');
    await putLock(c, s);
    try { localStorage.setItem('dl_lock_ts', String(Date.now())); } catch (e) {}
  }
  async function beat(c, s) {                          // heartbeat: still ours? then refresh; someone else took it? we are out
    const cur = await jf(lockUrl(c, s.username));
    if (cur && cur.dev && cur.dev !== DEV) return false;
    await putLock(c, s); return true;
  }
  async function release(s) {
    try {
      const c = CUR || await company(s.company); if (!c) return;
      const cur = await jf(lockUrl(c, s.username));
      if (!cur || cur.dev === DEV) await jf(lockUrl(c, s.username), { method: 'DELETE' });
    } catch (e) { /* best effort */ }
  }
  const forceSignOut = (c, u) => DLUI.run(() => jf(lockUrl(c, u), { method: 'DELETE' }), 'Signing out device…', 'Done');   // admin: free an account
  async function lockMap(c) {                          // admin screen: who is online right now
    const [now, all] = await Promise.all([serverNow(c), jf(lockUrl(c))]);
    const out = {};
    Object.keys(all || {}).forEach(u => { const l = all[u]; if (u !== '_clock' && l && l.ts) out[u] = now - l.ts < LOCK_TTL; });
    return out;
  }

  /* ---------- sales agent login history (Firebase: login_log/<company>/...) ----------
     One row per sign-in: loginAt, lastSeen (heartbeat), logoutAt + endReason. */
  const logUrl = (c, id) => base(c) + 'login_log/' + c.id + (id ? '/' + id : '') + '.json';
  const SV = { '.sv': 'timestamp' };
  async function logStart(c, s, why) {                 // new row for this sign-in; returns its id ('' if it failed - never blocks login)
    try {
      const now = await serverNow(c), id = now.toString(36) + '_' + String(s.username).replace(/[.#$\/\[\]]/g, '_');
      await jf(logUrl(c, id), { method: 'PUT', body: JSON.stringify({ u: s.username, name: s.name || s.username, loginAt: SV, lastSeen: SV, via: why || 'Signed in' }) });
      pruneOld(c);
      return id;
    } catch (e) { console.warn('login log not saved:', e.message); return ''; }
  }
  const logSeen = (c, s) => s.logId ? jf(logUrl(c, s.logId), { method: 'PATCH', body: JSON.stringify({ lastSeen: SV }) }).catch(() => {}) : Promise.resolve();
  async function logEnd(s, reason) {                   // sign-out / kicked: stamp the end time + reason
    try {
      if (!s || !s.logId) return;
      const c = CUR || await company(s.company); if (!c) return;
      await jf(logUrl(c, s.logId), { method: 'PATCH', keepalive: true, body: JSON.stringify({ logoutAt: SV, lastSeen: SV, endReason: reason || 'Signed out' }) });
    } catch (e) { /* best effort */ }
  }
  async function logResume(c, s) {                     // browser was closed without sign-out and is now reopened -> a NEW row
    if (s.role !== 'sales') return;
    try {
      const [now, cur] = await Promise.all([serverNow(c), s.logId ? jf(logUrl(c, s.logId)) : null]);
      if (cur && !cur.logoutAt && now - (cur.lastSeen || cur.loginAt || 0) < LOCK_TTL) return;   // same running session (e.g. page reload)
      s.logId = await logStart(c, s, 'Reopened (still signed in on this browser)');
      localStorage.setItem(KEY, JSON.stringify(s));
    } catch (e) { /* ignore */ }
  }

  /* ---------- auto-delete: Firebase keeps ONLY the current USA shift day (shift changes at 3 AM New York time) ----------
     Cleans call_logs, shift_reports and login_log of the company. It NEVER touches allowedUsers or sales_users
     (the company's licence and the sales agents it created), nor any other node. */
  function shiftKeyOf(ts) {
    const p = {};
    new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hour12: false }).formatToParts(new Date(ts)).forEach(x => { p[x.type] = x.value; });
    const d = new Date(Date.UTC(+p.year, +p.month - 1, +p.day));
    if ((+p.hour % 24) < 3) d.setUTCDate(d.getUTCDate() - 1);
    return d.toISOString().slice(0, 10);
  }
  async function pruneOld(c, force) {                  // at most once per 30 min per browser unless forced
    try {
      const k = 'dl_prune_' + c.id;
      if (!force && Date.now() - (+localStorage.getItem(k) || 0) < 1800000) return;
      localStorage.setItem(k, String(Date.now()));
      const cur = shiftKeyOf(await serverNow(c));
      const patch = async (node, del) => { if (Object.keys(del).length) await jf(base(c) + node + '/' + c.id + '.json', { method: 'PATCH', body: JSON.stringify(del) }); };
      const day = x => (x && (x.shiftDate || (x.timestamp && shiftKeyOf(x.timestamp)))) || '';
      await Promise.all([
        jf(base(c) + 'call_logs/' + c.id + '.json').then(all => {          // call_logs/<agent>/<callId>
          const del = {};
          Object.keys(all || {}).forEach(a => { const logs = all[a]; if (logs && typeof logs === 'object') Object.keys(logs).forEach(id => { const d = day(logs[id]); if (d && d < cur) del[a + '/' + id] = null; }); });
          return patch('call_logs', del);
        }).catch(() => {}),
        jf(base(c) + 'shift_reports/' + c.id + '.json').then(all => {      // shift_reports/<agent>/<reportId>
          const del = {};
          Object.keys(all || {}).forEach(a => { const reps = all[a]; if (reps && typeof reps === 'object') Object.keys(reps).forEach(id => {
            const r = reps[id], d = String((r && (r.shiftDate || r.date)) || '').slice(0, 10) || (r && r.logs && Object.values(r.logs).map(day).sort().pop()) || '';
            if (d && d < cur) del[a + '/' + id] = null;
          }); });
          return patch('shift_reports', del);
        }).catch(() => {}),
        jf(logUrl(c)).then(all => {                                        // login_log/<rowId>
          const del = {};
          Object.keys(all || {}).forEach(id => { const e = all[id], t = e && typeof e === 'object' ? Math.max(+e.loginAt || 0, +e.lastSeen || 0, +e.logoutAt || 0) : 0; if (!t || shiftKeyOf(t) < cur) del[id] = null; });
          return patch('login_log', del);
        }).catch(() => {})
      ]);
    } catch (e) { /* best effort */ }
  }

  /* ---------- session ---------- */
  const session = () => { try { return JSON.parse(localStorage.getItem(KEY)); } catch { return null; } };
  const home = s => HOME[s.role] || 'index.html';
  function enter(s) { localStorage.setItem(KEY, JSON.stringify(s)); localStorage.setItem('dl_logged_client', s.company); return home(s); }
  function logout(noRelease, why) {
    const s = session(), go = () => { localStorage.removeItem(KEY); localStorage.removeItem('dl_logged_client'); location.replace('index.html'); };
    if (s && LOCKED.includes(s.role) && !noRelease && !kicked) { setTimeout(go, 2500); Promise.all([logEnd(s, why || 'Signed out'), release(s)]).then(go, go); }   // stamp the end time + free the device lock first
    else go();
  }

  async function login(tab, u, p, co) {              // returns the page to open
    u = (u || '').trim(); co = (co || '').trim();
    if (!u || !p) err('EMPTY');
    if (!co) {                                       // company admin
      const c = await company(u);
      if (!c) err('BAD_LOGIN');
      if (!c.hash) err('NOT_ACTIVATED');
      if (await hashPw(p, c.salt) !== c.hash) err('BAD_LOGIN');
      expiry(c);
      return enter({ role: 'admin', username: c.id, name: c.name || c.id, company: c.id, hash: c.hash });
    }
    const c = expiry(await company(co)); u = u.toLowerCase();
    if (tab === 'crm') {                             // sales agent
      const r = await jf(salesUrl(c, u));
      if (!r || await hashPw(p, r.salt) !== r.hash) err('BAD_LOGIN');
      await claimLock(c, { username: u, role: 'sales' });
      const ss = { role: 'sales', username: u, name: r.name || u, company: c.id, hash: r.hash };
      ss.logId = await logStart(c, ss, 'Signed in');
      return enter(ss);
    }
    const { salt } = await sheet(c.sheetUrl, 'salt', { username: u });   // dispatcher (checked in company's Google Sheet)
    const h = await hashPw(p, salt), r = await sheet(c.sheetUrl, 'login', { u, h });
    if (r.error) err(r.error);
    await claimLock(c, { username: u, role: 'dispatcher' });
    return enter({ role: 'dispatcher', username: u, name: r.name, company: c.id, hash: h });
  }

  async function activate(u, p, p2) {                // client creates his own password (once)
    u = (u || '').trim();
    const c = await company(u);
    if (!c) err('NOT_ALLOWED');
    expiry(c);
    if (c.hash) err('ALREADY');
    if ((p || '').length < 6) err('SHORT');
    if (p !== p2) err('MISMATCH');
    const salt = newSalt(), hash = await hashPw(p, salt);
    await patchCompany(c, { salt, hash, activated: Date.now() });
    return enter({ role: 'admin', username: c.id, name: c.name || c.id, company: c.id, hash });
  }

  /* ---------- guard: every protected page calls this first ---------- */
  let agentRec = null;                               // this sales agent's record (tabs allowed) - refreshed by every verify()
  const agentTabs = () => agentRec ? Math.max(1, +agentRec.tabs || 1) : 0;   // 0 = not a sales agent (no per-agent limit)
  async function verify(s) {                         // licence + account still valid?
    const c = expiry(await company(s.company));
    if (s.role === 'admin' && c.hash !== s.hash) err('BAD_LOGIN');
    if (s.role === 'sales') { const r = await jf(salesUrl(c, s.username)); if (!r || r.hash !== s.hash) err('REMOVED'); agentRec = r; }
    return c;
  }
  async function guard(roles) {
    try { return await guard0(roles); }
    finally { if (!DLUI.isHeld()) DLUI.hide(); }
  }
  async function guard0(roles) {
    const s = session();
    if (!s) { location.replace('index.html'); return null; }
    if (!roles.includes(s.role)) { location.replace(home(s)); return null; }
    const bad = e => { if (FATAL.includes(e.message)) { alert(msg(e)); logout(false, 'Signed out: ' + msg(e)); } };
    const kick = m => { if (kicked) return; kicked = true; alert(msg({ message: m })); Promise.race([logEnd(s, m === 'KICKED' ? 'Signed out: account opened on another device' : 'Refused: already signed in on another device'), new Promise(r => setTimeout(r, 2000))]).then(() => logout(true)); };
    let c;
    try { c = await verify(s); } catch (e) { bad(e); if (FATAL.includes(e.message)) return null; }
    CUR = c || null;
    if (LOCKED.includes(s.role) && c) {
      try { if (Date.now() - (+localStorage.getItem('dl_lock_ts') || 0) > 30000) await claimLock(c, s); }
      catch (e) { if (e.message === 'ALREADY_ONLINE') { kick('ALREADY_ONLINE'); return null; } /* network hiccup: keep going, the heartbeat retries */ }
      if (s.role === 'sales') await logResume(c, s);
      if (s.role === 'sales') setInterval(() => pruneOld(c), 1800000);
      setInterval(async () => { try { if (!(await beat(c, s))) kick('KICKED'); else if (s.role === 'sales') logSeen(c, s); } catch (e) { /* offline: try again next beat */ } }, BEAT);
      addEventListener('pagehide', () => { if (!kicked) try { fetch(lockUrl(c, s.username), { method: 'DELETE', keepalive: true }); if (s.role === 'sales' && s.logId) fetch(logUrl(c, s.logId), { method: 'PATCH', keepalive: true, body: JSON.stringify({ lastSeen: SV }) }); } catch (e) {} });
    }
    setInterval(() => verify(s).catch(bad), 60000);   // expiry / removal is enforced while the app is open
    return s;
  }
  return { pruneOld, shiftKeyOf, forceSignOut, lockMap, sheetCall, lastErr: () => LAST, msg, login, activate, guard, verify, session, logout, company, patchCompany, salesList, salesPut, salesSetTabs, salesDel, hashPw, agentTabs };
})();
