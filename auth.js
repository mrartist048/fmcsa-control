/* =====================================================================
   Dispatch Link – auth.js  (shared by every page)
   Licence (allowedUsers + expiry) · login · roles · session guard
   Roles: admin -> hub.html | sales -> crm.html | dispatcher -> dms.html
   ===================================================================== */
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
  async function companies() {
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
  const patchCompany = (c, o) => Promise.all(Object.keys(o).map(k => {   // one PUT/DELETE per field
    const u = base(c) + 'allowedUsers/' + c.id + '/' + k + '.json';
    return o[k] === null ? jf(u, { method: 'DELETE' }) : jf(u, { method: 'PUT', body: JSON.stringify(o[k]) });
  }));
  const salesUrl = (c, u) => base(c) + 'sales_users/' + c.id + (u ? '/' + u : '') + '.json';

  /* ---------- sales agents (CRM logins, stored in the company's own database) ---------- */
  const salesList = async c => (await jf(salesUrl(c))) || {};
  async function salesPut(c, u, name, pw) {
    const salt = newSalt(), hash = await hashPw(pw, salt);
    return jf(salesUrl(c, u), { method: 'PUT', body: JSON.stringify({ name, salt, hash, created: Date.now() }) });
  }
  const salesDel = (c, u) => jf(salesUrl(c, u), { method: 'DELETE' });

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
    const now = await serverNow(c), cur = await jf(lockUrl(c, s.username));
    if (cur && cur.dev && cur.dev !== DEV && cur.ts && now - cur.ts < LOCK_TTL) err('ALREADY_ONLINE');
    await putLock(c, s);
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
  const forceSignOut = (c, u) => jf(lockUrl(c, u), { method: 'DELETE' });   // admin: free an account
  async function lockMap(c) {                          // admin screen: who is online right now
    const [now, all] = await Promise.all([serverNow(c), jf(lockUrl(c))]);
    const out = {};
    Object.keys(all || {}).forEach(u => { const l = all[u]; if (u !== '_clock' && l && l.ts) out[u] = now - l.ts < LOCK_TTL; });
    return out;
  }

  /* ---------- session ---------- */
  const session = () => { try { return JSON.parse(localStorage.getItem(KEY)); } catch { return null; } };
  const home = s => HOME[s.role] || 'index.html';
  function enter(s) { localStorage.setItem(KEY, JSON.stringify(s)); localStorage.setItem('dl_logged_client', s.company); return home(s); }
  function logout(noRelease) {
    const s = session(), go = () => { localStorage.removeItem(KEY); localStorage.removeItem('dl_logged_client'); location.replace('index.html'); };
    if (s && LOCKED.includes(s.role) && !noRelease && !kicked) { setTimeout(go, 2500); release(s).then(go, go); }   // free the device lock first
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
      return enter({ role: 'sales', username: u, name: r.name || u, company: c.id, hash: r.hash });
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
  async function verify(s) {                         // licence + account still valid?
    const c = expiry(await company(s.company));
    if (s.role === 'admin' && c.hash !== s.hash) err('BAD_LOGIN');
    if (s.role === 'sales') { const r = await jf(salesUrl(c, s.username)); if (!r || r.hash !== s.hash) err('REMOVED'); }
    return c;
  }
  async function guard(roles) {
    const s = session();
    if (!s) { location.replace('index.html'); return null; }
    if (!roles.includes(s.role)) { location.replace(home(s)); return null; }
    const bad = e => { if (FATAL.includes(e.message)) { alert(msg(e)); logout(); } };
    const kick = m => { if (kicked) return; kicked = true; alert(msg({ message: m })); logout(true); };
    let c;
    try { c = await verify(s); } catch (e) { bad(e); if (FATAL.includes(e.message)) return null; }
    CUR = c || null;
    if (LOCKED.includes(s.role) && c) {
      try { await claimLock(c, s); }
      catch (e) { if (e.message === 'ALREADY_ONLINE') { kick('ALREADY_ONLINE'); return null; } /* network hiccup: keep going, the heartbeat retries */ }
      setInterval(async () => { try { if (!(await beat(c, s))) kick('KICKED'); } catch (e) { /* offline: try again next beat */ } }, BEAT);
      addEventListener('pagehide', () => { if (!kicked) try { fetch(lockUrl(c, s.username), { method: 'DELETE', keepalive: true }); } catch (e) {} });
    }
    setInterval(() => verify(s).catch(bad), 60000);   // expiry / removal is enforced while the app is open
    return s;
  }
  return { forceSignOut, lockMap, sheetCall, lastErr: () => LAST, msg, login, activate, guard, verify, session, logout, company, patchCompany, salesList, salesPut, salesDel, hashPw };
})();
