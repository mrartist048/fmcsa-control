/* Dispatch Link | Email campaigns (admin page). Talks to the company's own Google Apps Script (campaign.gs). */
(function () {
  'use strict';
  try { if (typeof DL !== 'undefined' && DL.session && !DL.session()) { location.replace('index.html'); return; } } catch (e) {}
  try { if (typeof DLUI !== 'undefined' && DLUI.hide) DLUI.hide(); } catch (e) {}

  var $ = function (id) { return document.getElementById(id); };
  var LS = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} },
    del: function (k) { try { localStorage.removeItem(k); } catch (e) {} }
  };
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function toast(msg) {
    var t = document.createElement('div'); t.className = 'toast'; t.textContent = msg; document.body.appendChild(t);
    setTimeout(function () { try { t.remove(); } catch (e) {} }, 3200);
  }
  function setMsg(id, text, ok) { var e = $(id); if (!e) return; e.textContent = text || ''; e.className = 'msg' + (ok ? ' ok' : ''); }

  var DEFAULT_CFG = {
    sender: 'gmail', limit: 50, ramp: true, rampStart: 10, rampStep: 5, delayMin: 40, delayMax: 120,
    winFrom: 9, winTo: 17, tz: 'America/New_York', weekdays: true, days: null, startAt: 0, skipDates: [], maxBouncePct: 5,
    fromName: '', replyTo: '', address: '', unsubText: 'If you do not want to hear from us again, click here:',
    steps: [{ subject: 'Dispatch services for {company}', body: 'Hello {firstname},\n\nI saw that {company} is an active carrier. We help carriers find good paying loads, negotiate rates and handle the paperwork so you can focus on driving.\n\nWould you be open to a quick chat?\n\nBest regards', waitDays: 0 }]
  };
  var TZ = [['America/New_York', 'US Eastern (New York)'], ['America/Chicago', 'US Central (Chicago)'], ['America/Denver', 'US Mountain (Denver)'], ['America/Los_Angeles', 'US Pacific (Los Angeles)'], ['America/Phoenix', 'US Arizona (Phoenix)'], ['Asia/Karachi', 'Pakistan (Karachi)'], ['Europe/London', 'UK (London)'], ['UTC', 'UTC']];

  /* ---- several campaigns (one per mailbox), each with its own sheet ---- */
  var CL = {
    list: function () {
      var l; try { l = JSON.parse(LS.get('dl_cmp_list') || '[]'); } catch (e) { l = []; }
      if (!Array.isArray(l)) l = [];
      var seen = {}, dup = false; // the same link + mailbox saved twice: keep one
      l = l.filter(function (c) { if (!c || !c.url) return true; var k = c.url + '|' + (c.box || ''); if (seen[k]) { dup = true; if (LS.get('dl_cmp_active') === c.id) LS.set('dl_cmp_active', seen[k]); return false; } seen[k] = c.id; return true; });
      if (dup) LS.set('dl_cmp_list', JSON.stringify(l));
      if (!l.length && LS.get('dl_cmp_url')) { l = [{ id: 'c' + Date.now().toString(36), name: '', url: LS.get('dl_cmp_url'), key: LS.get('dl_cmp_key') || '' }]; LS.set('dl_cmp_list', JSON.stringify(l)); LS.set('dl_cmp_active', l[0].id); }
      return l;
    },
    save: function (l) { LS.set('dl_cmp_list', JSON.stringify(l)); },
    hidden: function () { try { var h = JSON.parse(LS.get('dl_cmp_hidden') || '[]'); return Array.isArray(h) ? h : []; } catch (e) { return []; } },
    isHidden: function (url, box) { return CL.hidden().indexOf(url + '|' + (box || '')) >= 0; },
    hide: function (url, box) { var h = CL.hidden(), k = url + '|' + (box || ''); if (h.indexOf(k) < 0) h.push(k); LS.set('dl_cmp_hidden', JSON.stringify(h)); },
    unhide: function (url, box) { var k = url + '|' + (box || ''); LS.set('dl_cmp_hidden', JSON.stringify(CL.hidden().filter(function (x) { return x !== k; }))); },
    activeId: function () { var id = LS.get('dl_cmp_active'); return id === null ? ((CL.list()[0] || {}).id || '') : id; },
    active: function () { var id = CL.activeId(); return CL.list().filter(function (c) { return c.id === id; })[0] || null; },
    setActive: function (id) {
      LS.set('dl_cmp_active', id || '');
      var c = CL.list().filter(function (x) { return x.id === id; })[0];
      if (c) { LS.set('dl_cmp_url', c.url); LS.set('dl_cmp_key', c.key); } else { LS.del('dl_cmp_url'); LS.del('dl_cmp_key'); }
    }
  };
  function cleanBox(b) { return String(b || '').trim().toLowerCase().replace(/[^a-z0-9@._+\-]/g, '').slice(0, 60); }
  var ACT = CL.active();
  var S = { box: ACT ? (ACT.box || '') : '', url: ACT ? ACT.url : '', key: ACT ? ACT.key : '', kh: '', connected: false, state: null,
    cfg: JSON.parse(JSON.stringify(DEFAULT_CFG)), items: [], filter: 'all', page: 0,
    ct: { status: '', q: '', offset: 0, total: 0 }, prevStep: 0, timer: null, searchT: null };
  var PAGE = 100, CT_PAGE = 50;

  /* ================= helpers ================= */
  function sha256(s) {
    return crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)).then(function (b) {
      return Array.prototype.map.call(new Uint8Array(b), function (x) { return ('0' + x.toString(16)).slice(-2); }).join('');
    });
  }
  function randomKey() {
    var a = new Uint8Array(18); crypto.getRandomValues(a);
    var abc = 'abcdefghjkmnpqrstuvwxyz23456789', o = '';
    for (var i = 0; i < a.length; i++) o += abc[a[i] % abc.length];
    return o.slice(0, 6) + '-' + o.slice(6, 12) + '-' + o.slice(12);
  }
  var ERR = {
    BAD_KEY: 'The secret key does not match this sheet. Use the key you created when you first connected.',
    NOT_CLAIMED: 'This sheet is not set up yet. Press Connect again.',
    ALREADY_CLAIMED: 'This sheet already belongs to another key. Enter the key you created the first time. (Lost it? Delete the row "kh" in the Settings sheet and connect again.)',
    NO_DAYS: 'Your schedule has no sending days. Turn on at least one day in step 4 and save.',
    ADDRESS_REQUIRED: 'Enter your business mailing address first (step 3, Sender details) and save. It is required in every email.',
    BAD_LIMIT: 'Set a daily limit of at least 1 (step 4).',
    BOX_REMOVED: 'This mailbox was deleted from your sheet. Connect it again in 1. Connect to start fresh.',
    MAIN_BOX: 'The main campaign of a sheet cannot be deleted. Stop it, or remove its shortcut.'
  };
  /* ---- button feedback: a clicked button shows a spinner while it talks to the sheet, then a tick (or a cross on error) ---- */
  var BTN = { cur: null };
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('button.btn'); if (!b || b.disabled || b.classList.contains('is-busy')) return;
    var tk = { el: b, n: 0, err: false, t: Date.now() + 100000 }; BTN.cur = tk;
    setTimeout(function () { tk.t = Date.now(); }, 0); // the window starts when the click handler (and any confirm box) has finished
    setTimeout(function () { if (BTN.cur === tk && !tk.n) BTN.cur = null; }, 1200);
  }, true);
  function btnTrack() {
    var tk = BTN.cur; if (!tk || Date.now() - tk.t > 700 || !tk.el.isConnected) return null;
    if (!tk.n++) {
      var b = tk.el; b._html = b.innerHTML; b.style.minWidth = b.offsetWidth + 'px'; b.classList.remove('is-ok', 'is-err'); b.classList.add('is-busy'); b.disabled = true;
      b.innerHTML = '<span class="bspin" aria-hidden="true"></span>' + b._html; b.setAttribute('aria-busy', 'true');
    }
    return tk;
  }
  function btnDone(tk, ok) {
    if (!tk) return; if (!ok) tk.err = true; if (--tk.n > 0) return;
    var b = tk.el; if (!b._html && b._html !== '') return;
    b.classList.remove('is-busy'); b.removeAttribute('aria-busy'); b.disabled = false;
    var label = (b.textContent || '').trim(), okText = /^save/i.test(label) ? 'Saved' : /^(refresh|update)/i.test(label) ? 'Updated' : /^(add|copy)/i.test(label) ? 'Added' : 'Done';
    if (/^copy/i.test(label)) okText = 'Copied';
    b.classList.add(tk.err ? 'is-err' : 'is-ok');
    b.innerHTML = tk.err ? '<svg class="bico" viewBox="0 0 24 24"><line x1="7" y1="7" x2="17" y2="17"/><line x1="17" y1="7" x2="7" y2="17"/></svg>Failed' : '<svg class="bico" viewBox="0 0 24 24"><polyline points="5 12.5 10 17 19 7"/></svg>' + okText;
    var html = b._html; b._html = null; if (BTN.cur === tk) BTN.cur = null;
    setTimeout(function () { if (!b.isConnected) return; b.classList.remove('is-ok', 'is-err'); b.innerHTML = html; b.style.minWidth = ''; }, tk.err ? 2200 : 1600);
  }
  /* ---- talking to Google: a normal POST first; if the browser cannot reach Google that way (it says "Failed to fetch"),
     the same request goes as a script tag, which works through the same Web app link. Remembered per browser. ---- */
  var NET = { tag: false }; try { NET.tag = localStorage.getItem('dl_cmp_net') === 'tag'; } catch (e) {}
  function viaTag(url, obj) {
    return new Promise(function (res, rej) {
      var q = 'p=' + encodeURIComponent(JSON.stringify(obj));
      if (q.length > 7000) return rej(new Error('NET'));
      var cb = 'dlc' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7), s = document.createElement('script'), done = false, t;
      function end() { done = true; clearTimeout(t); try { delete window[cb]; } catch (e) { window[cb] = undefined; } if (s.parentNode) s.parentNode.removeChild(s); }
      window[cb] = function (j) { if (done) return; end(); res(j); };
      s.onerror = function () { if (done) return; end(); rej(new Error('NET')); };
      s.onload = function () { setTimeout(function () { if (done) return; end(); rej(new Error('OLD_CODE')); }, 400); };
      t = setTimeout(function () { if (done) return; end(); rej(new Error('NET')); }, 60000);
      s.src = url + (url.indexOf('?') < 0 ? '?' : '&') + q + '&callback=' + cb;
      document.head.appendChild(s);
    });
  }
  function byParts(url, obj) { // a big request through the script tag: sent in small parts, Google runs it when the last part arrives
    var body = JSON.stringify(obj), id = 'r' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8), parts = [], pos = 0;
    while (pos < body.length) {
      var len = Math.min(2400, body.length - pos);
      while (len > 200 && encodeURIComponent(JSON.stringify({ action: 'part', id: id, i: 999, n: 999, data: body.substr(pos, len) })).length > 6200) len = Math.floor(len * 0.8);
      parts.push(body.substr(pos, len)); pos += len;
    }
    var n = parts.length, i = 0;
    function send() {
      return viaTag(url, { action: 'part', id: id, i: i, n: n, data: parts[i] }).then(function (j) {
        if (i < n - 1) {
          if (!j || !j.ok || j.part !== i) throw new Error('OLD_CODE'); // an older Apps Script does not know "part"
          i++; return send();
        }
        return j;
      });
    }
    return send();
  }
  function gpost(url, obj) {
    var small = JSON.stringify(obj).length < 5000;
    function byFetch() { return fetch(url, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(obj) }).then(function (r) { return r.json(); }); }
    function remember() { if (!NET.tag) { NET.tag = true; try { localStorage.setItem('dl_cmp_net', 'tag'); } catch (e) {} } }
    function byTag() { return (small ? viaTag(url, obj) : byParts(url, obj)).then(function (j) { remember(); return j; }); }
    if (NET.tag) return byTag().catch(function (e) { // this browser cannot POST to Google: always the script-tag way
      if (e.message === 'OLD_CODE' && small) { NET.tag = false; try { localStorage.removeItem('dl_cmp_net'); } catch (x) {} }
      if (e.message === 'OLD_CODE') return byFetch().catch(function () { throw new Error('OLD_CODE'); });
      return byFetch();
    });
    return byFetch().catch(function (e) {
      return byTag().catch(function (e2) { throw e2.message === 'OLD_CODE' ? new Error('OLD_CODE') : e; });
    });
  }
  var OLDMSG = 'Your Apps Script needs the new code: step 1, copy the code, paste it in Apps Script, then Deploy, Manage deployments, Edit, New version.';
  function api(action, data) {
    var tk = data && data.__retry ? null : btnTrack();
    return api0(action, data).then(function (j) { btnDone(tk, true); return j; }, function (e) { btnDone(tk, false); throw e; });
  }
  function api0(action, data) {
    if (!S.url) return Promise.reject(new Error('Connect your Apps Script first (step 1).'));
    var data_retry = data && data.__retry; if (data_retry) { data = Object.assign({}, data); delete data.__retry; }
    var body = JSON.stringify(Object.assign({ action: action, k: S.kh, box: S.box || '' }, data || {}));
    return gpost(S.url, JSON.parse(body))
      .then(null, function (e) { throw new Error(e && e.message === 'OLD_CODE' ? OLDMSG : 'Could not reach your Web app. Check the URL, and that "Who has access" is set to Anyone.'); })
      .then(function (j) {
        if (j && j.error) throw new Error(ERR[j.error] || String(j.error));
        if (j && j.info && action !== 'ping' && !data_retry) { // Google sometimes hands back the plain "hello" answer: ask again once
          return new Promise(function (r) { setTimeout(r, 1500); }).then(function () { return api0(action, Object.assign({}, data || {}, { __retry: 1 })); });
        }
        if (j && j.info && action !== 'ping') throw new Error('Google sent an incomplete answer. Press Refresh. If it keeps happening: Apps Script > Deploy > Manage deployments > New version.');
        return j;
      });
  }
  function dl(name, text) {
    var b = new Blob(['﻿' + text], { type: 'text/csv;charset=utf-8' }), a = document.createElement('a');
    a.href = URL.createObjectURL(b); a.download = name; document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }
  function csvCell(v) { v = String(v == null ? '' : v); return /[",\n\r]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }
  function fmtTime(ms) { if (!ms) return ''; var d = new Date(ms); return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + ' ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }); }

  /* ================= navigation ================= */
  window.toggleSidebar = function () { $('appSidebar').classList.toggle('open'); $('sidebarOverlay').classList.toggle('active'); };
  function show(v) {
    document.querySelectorAll('.view').forEach(function (e) { e.classList.toggle('on', e.id === 'v-' + v); });
    document.querySelectorAll('.nav-btn[data-v]').forEach(function (b) {
      var on = b.getAttribute('data-v') === v; b.classList.toggle('active', on); if (on) $('pageTitle').textContent = b.textContent.trim();
    });
    $('appSidebar').classList.remove('open'); $('sidebarOverlay').classList.remove('active');
    clearInterval(S.timer); S.view = v;
    if (v === 'all') { drawSaved(); overview(); S.timer = setInterval(function () { if (!document.hidden) overview(true); }, LIVE_MS); }
    if (v === 'run') { CMP.refresh(); S.timer = setInterval(function () { if (!document.hidden) CMP.refresh(true); }, LIVE_MS); }
    window.scrollTo(0, 0);
  }

  /* ================= 1. connect ================= */
  function pill(txt, cls) { var p = $('connPill'); p.textContent = txt; p.className = 'pill ' + cls; }
  function showInfo() {
    var st = S.state; if (!st) { $('cInfo').hidden = true; return; }
    $('cInfo').hidden = false;
    var smtp = S.cfg.sender === 'smtp';
    $('cInfo').innerHTML = '<div class="note ok" style="margin-top:14px"><b>Connected.</b> ' + (smtp ? (st.sender ? 'Emails will be sent from <b>' + esc(st.sender) + '</b> by the Mailer program. ' : 'Now install and start the Mailer (below). ') : 'Emails will be sent from <b>' + esc(st.sender || 'your account') + '</b>. Gmail allows ' + esc(st.quota == null ? 'a limited number of' : st.quota) + ' more emails today. ') +
      (st.url ? 'Unsubscribe links are active.' : '<b>Warning:</b> the Web app is not deployed yet, so unsubscribe links will not work (emails will ask people to reply STOP).') + '</div>';
  }
  function setConnected(st) {
    if (!st || !st.cfg) throw new Error('Google sent an incomplete answer. Press Refresh.');
    S.connected = true; S.state = st; S.cfg = st.cfg;
    var pk = S.pick; S.pick = null; if (pk && pk !== S.cfg.sender) { S.cfg.sender = pk; api('save_cfg', { cfg: S.cfg }).catch(function () {}); }
    var nm = S.box || (st.worker && st.worker.from) || st.sender || '';
    discoverBoxes(st);
    if (nm) { var l = CL.list(), a = l.filter(function (x) { return x.id === CL.activeId(); })[0]; if (a && a.name !== nm) { a.name = nm; CL.save(l); } }
    renderCmpSel();
    pill('Connected', 'green'); $('cOff').hidden = false; $('cGo').textContent = 'Reconnect';
    $('connSub').textContent = 'Connected. You can go to step 2.';
    showInfo(); fillForms(); renderSender();
  }
  function mailerOnline() { var w = S.state && S.state.worker; return !!(w && S.state.now && S.state.now - w.seen < 6 * 60000); }
  function renderSender() {
    var smtp = S.cfg.sender === 'smtp';
    document.querySelectorAll('#senderPick .pick').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-s') === (smtp ? 'smtp' : 'gmail')); });
    $('mailerBox').hidden = !smtp;
    $('setupSub').textContent = smtp ? 'Create the Google Sheet that stores your campaign and schedules the sending. (The emails themselves are sent by the Mailer from your own email account.)' : 'Use the Gmail or Google Workspace account that will send the emails.';
    $('limitSub').textContent = smtp ? 'Set any number you like, but keep it below what your email provider allows (Zoho free about 50 per day, paid 250 to 1,500; Outlook.com about 300; Yahoo about 500; hosting mail often 100 to 500 per hour, ask your host). Going over gets the account blocked.'
      : 'Set any number you like. Google lets a script send about 100 emails per day from a personal Gmail and about 1,500 per day from Google Workspace, so the campaign never goes above the quota Google reports (shown on the Run page).';
    $('limitHint').textContent = smtp ? 'The Mailer spreads the emails through your sending hours automatically. The gap is the minimum wait between two emails.'
      : 'Emails already go out spread through the day (a run every 5 minutes). The gap is only used when several emails are sent in the same run, and is shortened automatically because Google limits how long a script may run each day.';
    var ms = $('mailerStatus'), st = S.state;
    if (ms) {
      if (!S.connected) ms.innerHTML = 'Connect first (box above), then start the Mailer.';
      else if (mailerOnline()) ms.innerHTML = '<b>Mailer is online.</b> Sending as ' + esc(st.worker.from || '?') + '. Last contact ' + Math.max(0, Math.round((st.now - st.worker.seen) / 1000)) + ' seconds ago.';
      else ms.innerHTML = '<b>Mailer not seen yet.</b> ' + (st.worker ? 'Last seen ' + fmtTime(st.worker.seen) + '. ' : '') + 'Start it on your computer or server (steps above). This line turns green when it connects.';
    }
    var nb = $('bNow'); if (nb) nb.hidden = smtp;
    if (smtp) renderSetup();
    renderAs();
  }
  /* ---- Gmail mode: send as a "Send mail as" address (e.g. a domain mailbox), runs on Google's servers ---- */
  function renderAs() {
    var box = $('asBox'), sel = $('sendAs'); if (!box || !sel) return;
    var show = S.connected && S.cfg.sender !== 'smtp'; box.hidden = !show; if (!show) return;
    if (S.aliases == null && !S.aliasLoading) { loadAliases(); }
    var me = S.aliasMe || (S.state && S.state.cfg && !S.state.cfg.sendAs ? S.state.sender : '') || 'this Gmail';
    var list = (S.aliases || []).filter(function (a) { return a && a !== String(S.aliasMe || '').toLowerCase(); }), cur = S.cfg.sendAs || '';
    if (cur && list.indexOf(cur) < 0) list.push(cur);
    sel.innerHTML = '<option value="">' + esc(me) + ' (the Gmail itself)</option>' + list.map(function (a) { return '<option value="' + esc(a) + '">' + esc(a) + ((S.aliases || []).indexOf(a) < 0 && S.aliases ? '  (not found in Gmail!)' : '') + '</option>'; }).join('');
    sel.value = cur;
  }
  function loadAliases() {
    S.aliasLoading = true;
    return api('aliases').then(function (j) { S.aliases = j.aliases || []; S.aliasMe = j.me || ''; })
      .catch(function (e) { S.aliases = []; setMsg('cMsg', /unknown|action/i.test(e.message) ? 'To use "Send as", update the Apps Script code first (Copy Apps Script code, paste, Deploy > Manage deployments > New version).' : e.message); })
      .then(function () { S.aliasLoading = false; renderAs(); });
  }
  function setSender(v) {
    var want = v === 'smtp' ? 'smtp' : 'gmail';
    if (S.connected && S.cfg.sender !== want) {
      var who = (CL.active() && (CL.active().box || CL.active().name)) || 'this campaign';
      var msg = want === 'gmail' ? 'Switch ' + who + ' to send with Gmail?\n\nEmails will then be sent by Google (your computer can be off) and the Mailer stops sending for it. Next, pick the From address under "Send as": a domain address works if it is added in Gmail settings (Send mail as).\n\nTo add a Gmail account as its own campaign, pick "+ New campaign" instead.'
        : 'Switch ' + who + ' to send with the Mailer program (your own email account)?';
      if (!window.confirm(msg)) { renderSender(); return; }
    }
    S.cfg.sender = v === 'smtp' ? 'smtp' : 'gmail'; S.pick = S.connected ? null : S.cfg.sender; renderSender(); if (S.state) showInfo();
    if (S.connected) saveCfg(v === 'smtp' ? 'Saved: sending with the Mailer.' : 'Saved: sending with Gmail.', 'cMsg').catch(function () {});
  }
  /* ---- business mailbox: find server settings from the domain, make a one-paste setup code for the Mailer ---- */
  var PROV = [
    [/hostinger/, 'Hostinger', 'smtp.hostinger.com', 465, 'imap.hostinger.com', 993, 'Use the normal password of this mailbox (hPanel > Emails).'],
    [/zoho\.eu/, 'Zoho (EU)', 'smtp.zoho.eu', 465, 'imap.zoho.eu', 993, 'Turn on IMAP in Zoho Mail settings. With two-factor login, make an app password in Zoho Accounts > Security.'],
    [/zoho\.in/, 'Zoho (India)', 'smtp.zoho.in', 465, 'imap.zoho.in', 993, 'Turn on IMAP in Zoho Mail settings. With two-factor login, make an app password in Zoho Accounts > Security.'],
    [/zoho/, 'Zoho', 'smtp.zoho.com', 465, 'imap.zoho.com', 993, 'Turn on IMAP in Zoho Mail settings. With two-factor login, make an app password in Zoho Accounts > Security.'],
    [/google|googlemail/, 'Google Workspace', 'smtp.gmail.com', 465, 'imap.gmail.com', 993, 'Use an App Password (myaccount.google.com/apppasswords, needs 2-step verification). Or simply choose Gmail / Google Workspace above, no Mailer needed.'],
    [/outlook|office365|microsoft/, 'Microsoft 365', 'smtp.office365.com', 587, 'outlook.office365.com', 993, 'Your admin must allow "Authenticated SMTP" for this mailbox. If the login is refused, Microsoft blocks it.'],
    [/secureserver/, 'GoDaddy', 'smtpout.secureserver.net', 465, 'imap.secureserver.net', 993, 'Use the normal password of this mailbox.'],
    [/privateemail/, 'Namecheap Private Email', 'mail.privateemail.com', 465, 'mail.privateemail.com', 993, 'Use the normal password of this mailbox.'],
    [/titan/, 'Titan', 'smtp.titan.email', 465, 'imap.titan.email', 993, 'Use the normal password of this mailbox.'],
    [/ionos|1and1/, 'IONOS', 'smtp.ionos.com', 587, 'imap.ionos.com', 993, 'Use the normal password of this mailbox.'],
    [/emailsrvr/, 'Rackspace', 'secure.emailsrvr.com', 465, 'secure.emailsrvr.com', 993, 'Use the normal password of this mailbox.'],
    [/yandex/, 'Yandex', 'smtp.yandex.com', 465, 'imap.yandex.com', 993, 'Make an app password in your Yandex ID security settings.']
  ];
  var FREEP = { 'gmail.com': 4, 'googlemail.com': 4, 'outlook.com': -1, 'hotmail.com': -1, 'live.com': -1, 'yahoo.com': -2, 'zoho.com': 3 };
  function detectMailbox(email) {
    var d = (email.split('@')[1] || '').toLowerCase(), out = $('mbDetect');
    if (!/^[^@\s]+@[a-z0-9.-]+\.[a-z]{2,}$/i.test(email)) { out.className = 'wiz-note'; out.textContent = 'Type the full email address of the mailbox.'; makeCode(); return; }
    var set = function (name, sh, sp, ih, ip, tip) { $('mbSH').value = sh; $('mbSP').value = sp; $('mbIH').value = ih; $('mbIP').value = ip; out.className = 'wiz-note ok'; out.innerHTML = '&#10003; <b>' + esc(name) + '</b> found. Settings are filled in for you.'; $('mbPassTip').textContent = tip || ''; makeCode(); };
    if (FREEP[d] !== undefined) { var f = FREEP[d]; if (f === -1) return set('Outlook.com', 'smtp-mail.outlook.com', 587, 'outlook.office365.com', 993, 'Use an App Password (account.microsoft.com > Security). Microsoft is closing password logins.'); if (f === -2) return set('Yahoo', 'smtp.mail.yahoo.com', 465, 'imap.mail.yahoo.com', 993, 'Make an App Password in Yahoo Account Security.'); var p = PROV[f]; return set(p[1], p[2], p[3], p[4], p[5], p[6]); }
    out.className = 'wiz-note'; out.textContent = 'Finding the mail server of ' + d + '...';
    doh(d, 'MX').then(function (r) {
      var mx = ((r && r.Answer) || []).filter(function (a) { return a.type === 15; }).map(function (a) { return String(a.data).toLowerCase(); }).join(' ');
      var p = PROV.filter(function (x) { return x[0].test(mx); })[0];
      if (p) set(p[1], p[2], p[3], p[4], p[5], p[6]);
      else set(mx ? 'Hosting mail (cPanel)' : 'Your host', 'mail.' + d, 465, 'mail.' + d, 993, 'Use the normal password of this mailbox. If the login fails, ask your host for the SMTP and IMAP server names and change them under Server settings.');
    }).catch(function () { set('Your host', 'mail.' + d, 465, 'mail.' + d, 993, 'Could not look up the server; check the names under Server settings.'); });
  }
  function b64u(s) { return btoa(unescape(encodeURIComponent(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
  function makeCode() {
    var e = ($('mbEmail').value || '').trim().toLowerCase(), el = $('mbCode'); if (!el) return;
    if (!S.url || !e || !$('mbSH').value) { el.value = ''; el.placeholder = 'Type your mailbox in step 1'; return; }
    el.value = 'DL1.' + b64u(JSON.stringify({ u: S.url, k: S.key, b: S.box || '', e: e, s: [$('mbSH').value.trim(), Number($('mbSP').value) || 465], i: $('mbIH').value.trim() ? [$('mbIH').value.trim(), Number($('mbIP').value) || 993] : null }));
  }
  function renderSetup() {
    var em = $('mbEmail'); if (!em) return;
    if (!em.value) { var guess = S.box || (S.state && S.state.worker && S.state.worker.from) || ''; if (guess) { em.value = guess; detectMailbox(guess); } }
    makeCode();
  }
  function copyUrl() { copyText(S.url, 'Web app URL copied.'); }
  /* tiny ZIP writer (stored, no compression) so the Mailer downloads as one file */
  var CRC = (function () { var t = []; for (var n = 0; n < 256; n++) { var c = n; for (var k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  function crc32(b) { var c = 0xFFFFFFFF; for (var i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
  function makeZip(files) {
    var enc = new TextEncoder(), parts = [], central = [], offset = 0;
    var u16 = function (v) { return [v & 255, (v >> 8) & 255]; }, u32 = function (v) { return [v & 255, (v >>> 8) & 255, (v >>> 16) & 255, (v >>> 24) & 255]; };
    files.forEach(function (f) {
      var name = enc.encode(f.name), data = enc.encode(f.data), crc = crc32(data);
      var local = [0x50, 0x4b, 3, 4].concat(u16(20), u16(0x0800), u16(0), u16(0), u16(0x21), u32(crc), u32(data.length), u32(data.length), u16(name.length), u16(0));
      parts.push(new Uint8Array(local), name, data);
      var attr = f.name.slice(-3) === '.sh' ? 0x81ED : 0x81A4;
      central.push(new Uint8Array([0x50, 0x4b, 1, 2].concat(u16(0x031E), u16(20), u16(0x0800), u16(0), u16(0), u16(0x21), u32(crc), u32(data.length), u32(data.length), u16(name.length), u16(0), u16(0), u16(0), u16(0), u32(attr * 65536), u32(offset))), name);
      offset += local.length + name.length + data.length;
    });
    var cs = 0; central.forEach(function (p) { cs += p.length; });
    var end = [0x50, 0x4b, 5, 6].concat(u16(0), u16(0), u16(files.length), u16(files.length), u32(cs), u32(offset), u16(0));
    return new Blob(parts.concat(central, [new Uint8Array(end)]), { type: 'application/zip' });
  }
  function downloadMailer() {
    var F = window.MAILER_FILES; if (!F) { toast('Mailer files are missing from this site.'); return; }
    var blob = makeZip(Object.keys(F).map(function (n) { return { name: 'DispatchLink-Mailer/' + n, data: F[n] }; }));
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'DispatchLink-Mailer.zip'; document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 800);
  }
  window.__makeZip = makeZip;
  /* mailboxes added elsewhere (other device, or the Mailer) show up here by themselves */
  function discoverBoxes(st) {
    if (!st || !Array.isArray(st.boxes) || !S.url) return;
    var l = CL.list(), changed = false;
    st.boxes.forEach(function (b) {
      if (!CL.isHidden(S.url, b) && !l.some(function (x) { return x.url === S.url && (x.box || '') === b; })) { l.push({ id: 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), name: b, url: S.url, key: S.key, box: b }); changed = true; }
    });
    if (changed) { CL.save(l); renderCmpSel(); }
  }
  function linkTail(u) { var m = String(u || '').match(/\/s\/([^/]+)\//); return m ? m[1].slice(-4) : ''; }
  function cmpName(c, i) {
    var l = CL.list(), nameOf = function (x, j) { return x.box || x.name || (j === 0 ? 'Main campaign' : 'Campaign ' + (j + 1)); }, base = nameOf(c, i);
    var same = l.filter(function (x, j) { return nameOf(x, j) === base; });
    if (same.length < 2) return base;
    var twin = same.filter(function (x) { return (x.box || '') === (c.box || ''); }).length > 1; // same kind in two different sheets
    return (c.box ? base : base + ' (main tabs)') + (twin ? '  · sheet ...' + linkTail(c.url) : '');
  }
  /* list of campaigns saved in this browser, with Remove (All campaigns page) */
  function drawSaved() {
    var el = $('savedRows'); if (!el) return;
    var l = CL.list(), id = CL.activeId(), cur = (CL.active() || {}).url || S.url;
    el.innerHTML = l.map(function (c, i) {
      return '<tr><td><b>' + esc(cmpName(c, i)) + '</b>' + (c.id === id ? ' <small style="color:var(--accent)">(open)</small>' : '') + '</td><td>' + (c.box ? 'Own tabs: ' + esc(c.box) : 'Main tabs') + '</td><td><code>...' + esc(linkTail(c.url)) + '</code>' + (cur && c.url !== cur ? ' <small style="color:var(--mut)">(different link)</small>' : '') + '</td><td class="r"><span class="rowbtns"><button class="btn sm" data-rm="' + esc(c.id) + '" title="Hide it in this browser only">Hide</button>' + (c.box ? '<button class="btn sm del" data-del="' + esc(c.id) + '" title="Delete this mailbox and its tabs from the sheet">Delete mailbox</button>' : '') + '</span></td></tr>';
    }).join('') || '<tr><td colspan="4" style="color:var(--mut)">Nothing saved yet.</td></tr>';
    el.querySelectorAll('[data-rm]').forEach(function (b) { b.onclick = function () {
      var rid = b.getAttribute('data-rm'), c = CL.list().filter(function (x) { return x.id === rid; })[0]; if (!c) return;
      if (!window.confirm('Hide "' + (c.box || c.name || 'this campaign') + '" in this browser?\n\nOnly the shortcut is removed. The Google Sheet, its tabs, contacts and emails stay untouched, and you can connect it again any time.')) return;
      CL.hide(c.url, c.box); CL.save(CL.list().filter(function (x) { return x.id !== rid; })); LS.del('dl_cmp_c_' + rid); LS.del('dl_cmp_ov');
      if (rid === id) { var first = CL.list()[0]; CL.setActive(first ? first.id : ''); try { sessionStorage.setItem('dl_cmp_view', 'all'); } catch (e) {} location.reload(); return; }
      renderCmpSel(); drawSaved(); overview(true);
    }; });
    el.querySelectorAll('[data-del]').forEach(function (b) { b.onclick = function () {
      var rid = b.getAttribute('data-del'), c = CL.list().filter(function (x) { return x.id === rid; })[0]; if (!c || !c.box) return;
      var typed = window.prompt('Delete the mailbox ' + c.box + '?\n\nThis stops its campaign and deletes its tabs (Contacts, Settings, Log) from your Google Sheet. Its emails and list are gone for good. The Mailer stops sending for it.\nYour other mailboxes and the shared block list are not touched.\n\nType DELETE to confirm:');
      if (String(typed || '').trim().toUpperCase() !== 'DELETE') { if (typed !== null) toast('Not deleted: you did not type DELETE.'); return; }
      b.disabled = true; b.textContent = 'Deleting...';
      apiFor(c, 'remove_box').then(function () {
        CL.save(CL.list().filter(function (x) { return !(x.url === c.url && (x.box || '') === c.box); })); LS.del('dl_cmp_c_' + rid); LS.del('dl_cmp_ov');
        toast(c.box + ' deleted. Also remove it from the Mailer: node mailer.js remove');
        if (rid === CL.activeId()) { var first = CL.list()[0]; CL.setActive(first ? first.id : ''); try { sessionStorage.setItem('dl_cmp_view', 'all'); } catch (e) {} location.reload(); return; }
        renderCmpSel(); drawSaved(); overview(true);
      }).catch(function (e) { b.disabled = false; b.textContent = 'Delete mailbox'; toast(/bad action/i.test(e.message) ? 'This sheet still has the old Apps Script code. Update it (Copy Apps Script code, paste, Deploy > Manage deployments > New version) and try again.' : 'Could not delete: ' + e.message); });
    }; });
  }
  function renderCmpSel() {
    var sel = $('cmpSel'); if (!sel) return;
    var l = CL.list(), id = CL.activeId(), html = '';
    l.forEach(function (c, i) { html += '<option value="' + esc(c.id) + '"' + (c.id === id ? ' selected' : '') + '>' + esc(cmpName(c, i)) + '</option>'; });
    if (!l.some(function (c) { return c.id === id; })) html += '<option value="" selected>New campaign (not connected)</option>';
    html += '<option value="__new">+ New campaign</option>';
    sel.innerHTML = html;
  }
  function pickCampaign(v, keepView) {
    if (v === '__new') { var cur = CL.active(); if (cur) LS.set('dl_cmp_prefill', JSON.stringify({ url: cur.url, key: cur.key })); CL.setActive(''); } else CL.setActive(v);
    if (!keepView) try { sessionStorage.setItem('dl_cmp_view', v === '__new' ? 'connect' : (S.view || 'connect')); } catch (e) {}
    location.reload();
  }
  /* overview of every campaign on this device (Run page) */
  function apiFor(c, action, retried) {
    return sha256(c.key).then(function (kh) {
      return gpost(c.url, { action: action, k: kh, box: c.box || '' }).then(null, function (e) { throw new Error(e && e.message === 'OLD_CODE' ? OLDMSG : 'Could not reach this Web app. Press Refresh in a minute.'); });
    }).then(function (j) { if (j && j.error) throw new Error(ERR[j.error] || String(j.error)); if (j && j.info && !retried) return new Promise(function (r) { setTimeout(r, 1500); }).then(function () { return apiFor(c, action, true); }); if (j && j.info) throw new Error('Google sent an incomplete answer. Press Refresh.'); return j; });
  }
  function renderAll() { // Run page: small line that links to the All campaigns page
    var box = $('allCmp'), l = CL.list(); if (!box) return;
    box.hidden = l.length < 2;
    if (l.length > 1) $('allMini').textContent = 'You have ' + l.length + ' campaigns. See them all with their health on one page.';
  }
  /* ---- live status: the numbers stay on screen; a small line says when they were last updated or that new ones are on the way ---- */
  var LIVE_MS = 20000, FR = { all: { at: 0, busy: false, err: '' }, run: { at: 0, busy: false, err: '' } };
  function ago(ms) {
    var s = Math.max(0, Math.round((Date.now() - ms) / 1000));
    if (s < 10) return 'just now'; if (s < 60) return s + ' sec ago';
    var m = Math.round(s / 60); if (m < 60) return m + ' min ago';
    return 'at ' + new Date(ms).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  }
  function paintLive(k) {
    var f = FR[k], el = $(k === 'all' ? 'allNote' : 'runUpd'); if (!el) return;
    var cls, txt;
    if (f.busy) { cls = 'busy'; txt = f.at ? 'Updating from your Google Sheet... Showing the numbers from ' + ago(f.at) + ' until then.' : 'Loading from your Google Sheet...'; }
    else if (f.err) { cls = 'err'; txt = 'Could not update: ' + f.err + '. Trying again in 20 sec.' + (f.at ? ' Showing the numbers from ' + ago(f.at) + '.' : ''); }
    else if (f.at) { cls = 'ok'; txt = 'Updated ' + ago(f.at) + ' · refreshes every 20 sec'; }
    else { el.textContent = ''; return; }
    el.innerHTML = '<span class="live ' + cls + '"><i></i>' + esc(txt) + '</span>';
    if (k === 'all' && $('allTbl')) $('allTbl').classList.toggle('upd', f.busy && !!f.at);
  }
  setInterval(function () { if (!document.hidden) { paintLive('all'); paintLive('run'); } }, 5000);
  document.addEventListener('visibilitychange', function () { // back on this tab: fetch fresh numbers at once
    if (document.hidden) return;
    if (S.view === 'all' && Date.now() - FR.all.at > 10000) overview(true);
    if (S.view === 'run' && Date.now() - FR.run.at > 10000) refresh(true);
  });
  /* ---- All campaigns: ONE request per sheet, cached so the page shows at once ---- */
  function overview(quiet) {
    if (FR.all.busy) return Promise.resolve();
    var l = CL.list(), byUrl = {};
    l.forEach(function (c) { if (c.url && !byUrl[c.url]) byUrl[c.url] = c; });
    var cached; try { cached = JSON.parse(LS.get('dl_cmp_ov') || 'null'); } catch (e) { cached = null; }
    if (cached && cached.rows) { if (!FR.all.at) FR.all.at = cached.at || 0; drawOverview(cached.rows, true); }
    else $('allTbl').innerHTML = '<tr><td colspan="10" style="color:var(--mut)">' + (l.length ? 'Loading...' : 'No campaigns yet. Go to 1. Connect.') + '</td></tr>';
    FR.all.busy = true; FR.all.err = ''; paintLive('all');
    var jobs = Object.keys(byUrl).map(function (u) {
      var c = byUrl[u];
      return apiFor(c, 'overview').then(function (j) {
        return j.list.map(function (s) { s.url = u; s.key = c.key; s.now = j.now; return s; });
      }, function (e) { // older Apps Script without "overview": ask each campaign
        return Promise.all(l.filter(function (x) { return x.url === u; }).map(function (x) {
          return apiFor(x, 'state').then(function (st) { st.box = x.box || ''; st.url = u; st.key = x.key; return st; }, function (er) { return { box: x.box || '', url: u, key: x.key, error: er.message }; });
        }));
      });
    });
    return Promise.all(jobs).then(function (parts) {
      var rows = [].concat.apply([], parts).filter(function (s) { return !CL.isHidden(s.url, s.box); }), list = CL.list(), changed = false;
      rows.forEach(function (s) {
        var c = list.filter(function (x) { return x.url === s.url && (x.box || '') === (s.box || ''); })[0];
        var who = (s.worker && s.worker.from) || s.sender || '';
        if (!c) { c = { id: 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), name: s.box || who, url: s.url, key: s.key, box: s.box || '' }; list.push(c); changed = true; }
        else if (!c.box && !c.name && who) { c.name = who; changed = true; }
        s.id = c.id; s.label = c.box || who || c.name || 'Main campaign'; s.mailbox = s.label;
      });
      var seenL = {}; rows.forEach(function (s) { seenL[s.label] = (seenL[s.label] || 0) + 1; });
      rows.forEach(function (s) { // same name twice (two sheets or main + own tabs): say which one
        if (seenL[s.label] > 1 && !s.box) s.label += ' (main tabs)';
      });
      if (changed) { CL.save(list); renderCmpSel(); }
      try { LS.set('dl_cmp_ov', JSON.stringify({ at: Date.now(), rows: rows })); } catch (e) {}
      FR.all.busy = false; FR.all.at = Date.now();
      drawOverview(rows, false);
    }).catch(function (e) { FR.all.busy = false; FR.all.err = e.message; paintLive('all'); });
  }
  /* Start / Pause / Resume / Stop straight from the All campaigns table */
  function ctlBtns(s) {
    var run = s.run || {}, b = function (act, txt, cls) { return '<button class="btn sm' + (cls ? ' ' + cls : '') + '" data-act="' + act + '" data-k="' + esc(s.url + '|' + (s.box || '')) + '">' + txt + '</button>'; };
    if (run.running && !run.paused) return b('stop', 'Stop', 'del');
    return run.running ? b('resume', 'Start', 'success') : b('start', 'Start', 'success'); // paused counts as stopped here: Start continues it
  }
  function rowCtl(btn, rows) {
    var k = btn.getAttribute('data-k'), act = btn.getAttribute('data-act');
    var s = rows.filter(function (x) { return x.url + '|' + (x.box || '') === k; })[0]; if (!s) return;
    var name = s.label || s.box || 'this campaign';
    if (act === 'stop' && !confirm('Stop the campaign of ' + name + '?\n\nContacts keep their progress. Press Start to continue later.')) return;
    if (act === 'start' && !confirm('Start the campaign of ' + name + ' with its saved settings?')) return;
    var all = btn.parentNode.querySelectorAll('button'); all.forEach(function (x) { x.disabled = true; });
    var old = btn.textContent; btn.textContent = act === 'stop' ? 'Stopping...' : act === 'pause' ? 'Pausing...' : 'Starting...';
    apiFor({ url: s.url, key: s.key, box: s.box || '' }, act).then(function () {
      toast(name + ': ' + (act === 'stop' ? 'stopped.' : act === 'pause' ? 'paused.' : act === 'resume' ? 'started again.' : 'started.' + ((s.cfg && s.cfg.sender === 'smtp') ? ' Keep the Mailer running.' : '')));
      try { LS.del('dl_cmp_ov'); } catch (e) {}
      var again = function (n) { if (FR.all.busy && n < 20) return setTimeout(function () { again(n + 1); }, 500); overview(true); };
      again(0);
      if (S.url === s.url && (S.box || '') === (s.box || '')) loadState(true).catch(function () {});
    }).catch(function (e) {
      all.forEach(function (x) { x.disabled = false; }); btn.textContent = old;
      toast('Could not ' + act + ' ' + name + ': ' + e.message);
    });
  }
  function drawOverview(rows, stale) {
    var t = { sent: 0, lim: 0, wait: 0, rep: 0, bnc: 0, run: 0, on: 0 }, id = CL.activeId();
    var html = rows.map(function (s) {
      if (s.error) return '<tr><td><b>' + esc(s.label || s.box || 'Campaign') + '</b></td><td colspan="8" style="color:var(--bad)">' + esc(s.error) + '</td><td class="r"><button class="btn sm" data-open="' + esc(s.id || '') + '">Open</button></td></tr>';
      var run = s.run || {}, c = s.counts || {}, w = s.worker, now = s.now || Date.now(), online = !!(w && now - w.seen < 6 * 60000), smtp = s.cfg && s.cfg.sender === 'smtp';
      var on = run.running && !run.paused;
      t.sent += run.sentToday || 0; t.lim += s.effLimit || 0; t.wait += c.queued || 0; t.rep += c.replied || 0; t.bnc += c.bounced || 0; if (on) t.run++; if (smtp && online) t.on++;
      var tag = run.running ? (run.paused ? '<span class="tag paused">Paused</span>' : '<span class="tag queued">Running</span>') : run.ended ? '<span class="tag removed">7 days over</span>' : '<span class="tag removed">Stopped</span>';
      if (run.running && run.endAt) tag += '<br><small style="color:var(--mut)">until ' + esc(fmtTz(run.endAt, (s.cfg && s.cfg.tz) || 'America/New_York').replace(/,\s*\d+:\d+\s*[AP]M$/i, '')) + '</small>';
      var nxt = '-';
      if (on && s.cfg && limitHit(run, s.effLimit || 0)) {
        var nd = nextDayOpen(s.cfg, Date.now());
        nxt = '<span title="Today\'s limit of ' + (s.effLimit || 0) + ' is used up. ' + esc(nd ? 'Starts again ' + fmtTz(nd, s.cfg.tz) + ' (' + s.cfg.tz + '), ' + fmtTime(nd) + ' your time.' : '') + '"><span style="color:var(--warn,#d97706)">Limit reached</span><br><small style="color:var(--mut)">' + esc(whenShort(nd, s.cfg.tz)) + '</small></span>';
      } else if (on) {
        if (smtp && !online) nxt = '<span style="color:var(--bad)">Mailer offline</span>';
        else if (run.idleWhy === 'outside the sending window') nxt = run.nextAt ? fmtTz(run.nextAt + (Date.now() - now), s.cfg.tz) : 'When the schedule opens';
        else if (/daily limit/.test(run.idleWhy || '')) nxt = 'Tomorrow';
        else if (/Google daily email quota/.test(run.idleWhy || '')) nxt = '<span style="color:var(--bad)" title="' + esc(run.idleWhy) + '">Google quota used up</span>';
        else if (run.nextAt && run.nextAt > now) nxt = new Date(run.nextAt + (Date.now() - now)).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
        else nxt = smtp ? 'Soon' : 'Within 5 min';
      }
      var hl = healthOf(s, null), dom = (String(s.mailbox || s.label).split('@')[1] || '').toLowerCase().replace(/[^a-z0-9.-].*$/, '');
      var br = run.sentTotal ? Math.round(Math.max(run.bouncedTotal || 0, c.bounced || 0) * 1000 / run.sentTotal) / 10 : 0;
      return '<tr><td><b>' + esc(s.label) + '</b>' + (s.id === id ? ' <small style="color:var(--accent)">(open)</small>' : '') + '</td><td>' + (smtp ? 'Mailer' + (online ? ' <span style="color:var(--ok)">●</span>' : ' <span style="color:var(--bad)">●</span>') : 'Gmail') + '</td><td>' + tag + '</td><td>' + (run.sentToday || 0) + ' / ' + (s.effLimit || 0) + '</td><td>' + (c.queued || 0) + '</td><td>' + (c.replied || 0) + '</td><td>' + br + '%</td><td data-h="' + esc(s.id || '') + '" data-d="' + esc(dom) + '">' + hBadge(hl) + '</td><td>' + nxt + '</td><td class="r"><span class="rowbtns">' + ctlBtns(s) + '<button class="btn sm" data-open="' + esc(s.id || '') + '">Open</button></span></td></tr>';
    }).join('');
    $('allTbl').innerHTML = html || '<tr><td colspan="10" style="color:var(--mut)">No campaigns yet.</td></tr>';
    var k = function (l, v, cls) { return '<div class="kpi"><small>' + l + '</small><b' + (cls ? ' style="color:var(--' + cls + ')"' : '') + '>' + v + '</b></div>'; };
    $('allKpis').innerHTML = k('Campaigns running', t.run + ' / ' + rows.length) + k('Sent today', t.sent + ' / ' + t.lim) + k('Waiting to send', t.wait) + k('Replies', t.rep, 'accent') + k('Bounced', t.bnc, 'bad') + k('Mailers online', t.on, t.on ? 'ok' : '');
    paintLive('all');
    $('allTbl').querySelectorAll('[data-act]').forEach(function (b) { b.onclick = function () { rowCtl(b, rows); }; });
    $('allTbl').querySelectorAll('[data-open]').forEach(function (b) { b.onclick = function () { var v = b.getAttribute('data-open'); if (v) { try { sessionStorage.setItem('dl_cmp_view', 'run'); } catch (e) {} pickCampaign(v, true); } }; });
    rows.forEach(function (s) { // add the domain check to the health score when it arrives
      var cell = s.id && $('allTbl').querySelector('[data-h="' + s.id + '"]'); if (!cell || s.error) return;
      var d = cell.getAttribute('data-d'); if (!d) return;
      authCheck(d).then(function (a) { cell.innerHTML = hBadge(healthOf(s, a)); });
    });
  }
  function hBadge(h) { var c = h.score >= 80 ? '#22c55e' : h.score >= 60 ? '#f5a623' : '#ef4444'; return '<span class="hs" title="' + esc(h.grade) + '"><i style="background:' + c + '"></i>' + h.score + '</span>'; }

  function loadState(silent) {
    var first = S.ct.status === '' && S.ct.q === '' && S.ct.offset === 0;
    return api('state', { withContacts: first ? CT_PAGE : 0 }).then(function (st) { if (st && st.now) S.clockSkew = Date.now() - st.now; saveCache(st); setConnected(st); return st; }).catch(function (e) { if (!silent) throw e; });
  }
  function connect() {
    var url = $('cUrl').value.trim(), key = $('cKey').value.trim(), box = cleanBox($('cBox') ? $('cBox').value : '');
    if (!/^https:\/\/script\.google(usercontent)?\.com\//.test(url)) { setMsg('cMsg', 'Paste the Web app URL from Apps Script. It starts with https://script.google.com and ends with /exec.'); return; }
    if (key.length < 8) { setMsg('cMsg', 'The secret key must be at least 8 characters.'); return; }
    setMsg('cMsg', 'Connecting...', true); $('cGo').disabled = true;
    S.url = url; S.key = key; S.box = box;
    sha256(key).then(function (h) { S.kh = h; return api('ping'); })
      .then(function (p) { return p.claimed ? null : api('claim'); })
      .then(function () { return S.box ? api('restore_box') : null; })
      .then(function () { return api('state'); })
      .then(function (st) {
        var l = CL.list(), id = CL.activeId(), c = l.filter(function (x) { return x.url === S.url && (x.box || '') === S.box; })[0] || l.filter(function (x) { return x.id === id && !x.url; })[0];
        if (!c) { c = { id: 'c' + Date.now().toString(36), name: '' }; l.push(c); }
        c.url = S.url; c.key = S.key; c.box = S.box; CL.save(l); LS.set('dl_cmp_lastkey', JSON.stringify(S.key)); CL.unhide(S.url, S.box); CL.setActive(c.id);
        setConnected(st); setMsg('cMsg', 'Connected.', true); toast('Connected to your campaign sheet.');
      })
      .catch(function (e) { S.connected = false; setMsg('cMsg', e.message); })
      .then(function () { $('cGo').disabled = false; });
  }
  function disconnect() {
    var cur0 = CL.active(); if (cur0 && cur0.url) CL.hide(cur0.url, cur0.box);
    var rest = CL.list().filter(function (x) { return x.id !== CL.activeId(); }); CL.save(rest); CL.setActive(''); renderCmpSel();
    S.url = ''; S.key = ''; S.kh = ''; S.connected = false; S.state = null;
    $('cUrl').value = ''; $('cKey').value = randomKey(); S.box = ''; if ($('cBox')) { $('cBox').value = ''; $('cBox').disabled = false; } $('cOff').hidden = true; $('cGo').textContent = 'Connect'; $('cInfo').hidden = true;
    pill('Not connected', 'gray'); setMsg('cMsg', 'Removed from this device. The sheet and its campaign are untouched' + (CL.list().length ? '. Pick another campaign at the top left.' : '.'), true);
  }
  function toggleCode() {
    var p = $('gsCode'); if (p.hidden && !p.textContent) p.textContent = window.CAMPAIGN_GS || 'Code not available.';
    p.hidden = !p.hidden; $('cShow').textContent = p.hidden ? 'Show code' : 'Hide code';
  }
  function copyText(t, okMsg) {
    var done = function () { toast(okMsg); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(done, function () { fallback(); }); else fallback();
    function fallback() { var a = document.createElement('textarea'); a.value = t; document.body.appendChild(a); a.select(); try { document.execCommand('copy'); done(); } catch (e) { toast('Copy failed, select the text and copy it yourself.'); } a.remove(); }
  }

  /* ================= 2. clean ================= */
  var FREE = ['gmail.com', 'googlemail.com', 'yahoo.com', 'ymail.com', 'outlook.com', 'hotmail.com', 'live.com', 'msn.com', 'aol.com', 'icloud.com', 'me.com', 'mac.com', 'comcast.net', 'att.net', 'sbcglobal.net', 'bellsouth.net', 'verizon.net', 'cox.net', 'charter.net', 'protonmail.com', 'proton.me', 'mail.com', 'earthlink.net', 'frontier.com', 'windstream.net', 'zoho.com'];
  var TYPO = { 'gmial.com': 'gmail.com', 'gmai.com': 'gmail.com', 'gmal.com': 'gmail.com', 'gamil.com': 'gmail.com', 'gnail.com': 'gmail.com', 'gmail.con': 'gmail.com', 'gmail.co': 'gmail.com', 'gmail.cm': 'gmail.com', 'gmaill.com': 'gmail.com', 'gmail.comm': 'gmail.com', 'gmeil.com': 'gmail.com', 'hotmial.com': 'hotmail.com', 'hotmal.com': 'hotmail.com', 'hotmail.con': 'hotmail.com', 'hotmai.com': 'hotmail.com', 'yaho.com': 'yahoo.com', 'yahooo.com': 'yahoo.com', 'yahoo.con': 'yahoo.com', 'yahoo.co': 'yahoo.com', 'yhoo.com': 'yahoo.com', 'outlok.com': 'outlook.com', 'outlook.con': 'outlook.com', 'outloo.com': 'outlook.com', 'aol.con': 'aol.com', 'icloud.con': 'icloud.com', 'iclod.com': 'icloud.com', 'comcast.nt': 'comcast.net', 'comcast.ent': 'comcast.net', 'sbcglobal.nt': 'sbcglobal.net' };
  var DISPOSABLE = ('mailinator.com guerrillamail.com guerrillamail.net guerrillamail.org sharklasers.com grr.la 10minutemail.com 10minutemail.net tempmail.com temp-mail.org temp-mail.io tempmailo.com tempr.email yopmail.com yopmail.fr yopmail.net trashmail.com trashmail.net trash-mail.com getnada.com nada.email dispostable.com maildrop.cc throwawaymail.com fakeinbox.com mohmal.com mintemail.com emailondeck.com spamgourmet.com mytemp.email discard.email discardmail.com mailnesia.com mailcatch.com mailforspam.com spambox.us spam4.me tmpmail.org tmpmail.net burnermail.io 33mail.com anonbox.net moakt.com moakt.cc mail-temp.com fakemail.net fakemailgenerator.com emailfake.com email-fake.com tempinbox.com inboxkitten.com mailsac.com guerrillamailblock.com wegwerfmail.de einrot.com cuvox.de armyspy.com dayrep.com fleckens.hu gustr.com jourrapide.com rhyta.com superrito.com teleworm.us byom.de tempail.com temporary-mail.net mailtemp.info minuteinbox.com luxusmail.org nowmymail.com 0-mail.com z1p.biz'.split(' '));
  var NOREPLY = /^(no-?reply|do-?not-?reply|donotreply|noreply|mailer-daemon|postmaster|bounce|bounces|abuse|spam|root|hostmaster|webmaster|unsubscribe|nobody|null|test|testing|example|sample|email|user|name|yourname|your-?email)$/i;
  var ROLE = /^(info|admin|administrator|sales|support|contact|contactus|office|hello|help|billing|accounts|accounting|service|services|team|mail|enquiries|inquiries|hr|jobs|careers|marketing|media|press|legal|privacy|security|newsletter|orders|customerservice|customercare|general|manager|management)$/i;
  var SUPPORT_REASONS = ['Invalid format', 'Duplicate', 'On block list', 'No-reply or test address', 'Disposable email service', 'Domain does not exist', 'No mail server for domain', 'No email address', 'Typo fixed', 'Role address (shared inbox)', 'Website only, no mail server', 'Could not check domain'];

  function parseCSV(text) {
    var first = text.split(/\r?\n/, 1)[0] || '', best = ',', bc = -1;
    [',', '\t', ';'].forEach(function (d) { var c = first.split(d).length; if (c > bc) { bc = c; best = d; } });
    var rows = [], row = [], f = '', q = false;
    for (var i = 0; i < text.length; i++) {
      var c = text[i];
      if (q) { if (c === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; }
      else if (c === '"') q = true;
      else if (c === best) { row.push(f); f = ''; }
      else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(f); f = ''; rows.push(row); row = []; }
      else f += c;
    }
    if (f !== '' || row.length) { row.push(f); rows.push(row); }
    return rows.filter(function (r) { return r.some(function (x) { return String(x).trim() !== ''; }); });
  }
  function toItems(rows) { // 2D array -> [{email, name, company, phone, mc}]
    if (!rows.length) return [];
    var hasAt = function (r) { return r.some(function (c) { return /@/.test(c); }); };
    var header = !hasAt(rows[0]) && rows.length > 1 || (rows[0].length > 1 && !hasAt(rows[0]));
    var map = { email: -1, name: -1, company: -1, phone: -1, mc: -1 }, body = rows;
    if (header) {
      rows[0].forEach(function (h, i) {
        h = String(h).toLowerCase().trim();
        if (map.email < 0 && /e-?mail/.test(h)) map.email = i;
        else if (map.name < 0 && /(owner|officer|contact|person|^name$|first ?name|full ?name)/.test(h)) map.name = i;
        else if (map.company < 0 && /(company|carrier|legal|dba|business|^name)/.test(h)) map.company = i;
        else if (map.phone < 0 && /(phone|tel|mobile|cell)/.test(h)) map.phone = i;
        else if (map.mc < 0 && /(^mc|docket|usdot|\bdot\b)/.test(h)) map.mc = i;
      });
      body = rows.slice(1);
    }
    if (map.email < 0) { // no header: the column that holds most "@"
      var cnt = {}, w = 0; body.forEach(function (r) { r.forEach(function (c, i) { if (/@/.test(c)) cnt[i] = (cnt[i] || 0) + 1; w = Math.max(w, r.length); }); });
      var bi = -1, bv = 0; Object.keys(cnt).forEach(function (k) { if (cnt[k] > bv) { bv = cnt[k]; bi = +k; } }); map.email = bi;
    }
    if (map.email < 0) return null;
    var out = [];
    body.forEach(function (r) {
      var cell = String(r[map.email] == null ? '' : r[map.email]);
      var base = { name: map.name >= 0 ? r[map.name] : '', company: map.company >= 0 ? r[map.company] : '', phone: map.phone >= 0 ? r[map.phone] : '', mc: map.mc >= 0 ? r[map.mc] : '' };
      var toks = cell.split(/[\s,;|]+/).map(function (t) { return t.replace(/^mailto:/i, '').replace(/^[<("'\[]+|[>)"'\].,:;]+$/g, ''); }).filter(function (t) { return t.indexOf('@') >= 0; });
      if (!toks.length) { if (cell.trim() || String(base.company).trim()) out.push(Object.assign({ email: cell.trim() }, base, { _noEmail: !cell.trim() })); return; }
      toks.forEach(function (t) { out.push(Object.assign({ email: t }, base)); });
    });
    return out;
  }

  var dohCache = {};
  function doh(name, type) {
    var key = type + ':' + name; if (dohCache[key]) return dohCache[key];
    var g = 'https://dns.google/resolve?name=' + encodeURIComponent(name) + '&type=' + type;
    var c = 'https://cloudflare-dns.com/dns-query?name=' + encodeURIComponent(name) + '&type=' + type;
    var p = fetch(g).then(function (r) { return r.json(); })
      .catch(function () { return fetch(c, { headers: { accept: 'application/dns-json' } }).then(function (r) { return r.json(); }); });
    dohCache[key] = p.catch(function () { return null; });
    return dohCache[key];
  }
  function domainStatus(d) { // -> 'ok' | 'nxdomain' | 'nomx' | 'web' | 'unknown'
    if (FREE.indexOf(d) >= 0) return Promise.resolve('ok');
    return doh(d, 'MX').then(function (r) {
      if (!r) return 'unknown';
      if (r.Status === 3) return 'nxdomain';
      var mx = (r.Answer || []).filter(function (a) { return a.type === 15; });
      if (mx.length) { var nullMx = mx.every(function (a) { return /^0\s+\.?$/.test(String(a.data).trim()); }); return nullMx ? 'nomx' : 'ok'; }
      if (r.Status !== 0) return 'unknown';
      return doh(d, 'A').then(function (a) { return a && (a.Answer || []).some(function (x) { return x.type === 1 || x.type === 28; }) ? 'web' : (a && a.Status === 3 ? 'nxdomain' : 'nomx'); });
    });
  }
  var SYNTAX = /^[a-z0-9!#$%&'*+\/=?^_`{|}~.-]+@([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,24}$/;
  function normalize(e) { return String(e || '').trim().toLowerCase().replace(/^mailto:/, '').replace(/[​-‍﻿]/g, '').replace(/^[<("'\[]+|[>)"'\].,:;]+$/g, ''); }

  function scan() {
    var text = $('paste').value.trim(), btn = $('scanBtn');
    var run = function (rows2d) {
      var items = toItems(rows2d);
      if (!items) { $('scanState').textContent = 'Could not find an email column. The file needs a column named Email.'; return; }
      if (!items.length) { $('scanState').textContent = 'No rows found.'; return; }
      btn.disabled = true; clean(items).then(function () { btn.disabled = false; }, function (e) { btn.disabled = false; $('scanState').textContent = 'Scan failed: ' + e.message; });
    };
    var file = $('file').files && $('file').files[0];
    if (file) {
      var name = file.name.toLowerCase();
      if (/\.xlsx?$/.test(name)) {
        $('scanState').textContent = 'Reading Excel file...';
        loadXlsx().then(function () { return file.arrayBuffer(); }).then(function (buf) {
          var wb = XLSX.read(buf, { type: 'array' }), ws = wb.Sheets[wb.SheetNames[0]];
          run(XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: '' }).filter(function (r) { return r.some(function (c) { return String(c).trim() !== ''; }); }));
        }).catch(function () { $('scanState').textContent = 'Could not read that Excel file. Save it as CSV and try again.'; });
      } else file.text().then(function (t) { run(parseCSV(t)); });
    } else if (text) {
      var rows = parseCSV(text); if (rows.length && rows.every(function (r) { return r.length === 1; }) && !/,|;|\t/.test(text)) rows = text.split(/[\r\n]+/).map(function (l) { return [l.trim()]; }).filter(function (r) { return r[0]; });
      run(rows);
    } else $('scanState').textContent = 'Choose a file or paste some emails first.';
  }
  function loadXlsx() {
    if (window.XLSX) return Promise.resolve();
    return new Promise(function (res, rej) { var s = document.createElement('script'); s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'; s.onload = res; s.onerror = rej; document.head.appendChild(s); });
  }

  function clean(items) {
    var bar = $('scanBar'); bar.hidden = false; var fill = function (p) { bar.firstElementChild.style.width = Math.round(p * 100) + '%'; };
    $('scanState').textContent = 'Checking formats...'; fill(0.03);
    var blocked = {}; var addBlock = function (x) { x = String(x || '').trim().toLowerCase(); if (x) blocked[x] = 1; };
    $('block').value.split(/[\r\n,;]+/).forEach(addBlock);
    var pre = S.connected ? api('suppress_list').then(function (j) { (j.list || []).forEach(addBlock); }).catch(function () {}) : Promise.resolve();
    return pre.then(function () {
      var seen = {}, res = [], domains = {};
      items.forEach(function (it) {
        var r = { email: normalize(it.email), name: String(it.name || '').trim(), company: String(it.company || '').trim(), phone: String(it.phone || '').trim(), mc: String(it.mc || '').trim(), status: 'ready', reason: '' };
        res.push(r);
        if (it._noEmail || !r.email) { r.status = 'removed'; r.reason = 'No email address'; return; }
        var at = r.email.lastIndexOf('@'), local = r.email.slice(0, at), dom = r.email.slice(at + 1);
        if (!SYNTAX.test(r.email) || local.length > 64 || r.email.length > 254 || /\.\./.test(r.email) || /^\.|\.$/.test(local) || /(^|\.)(png|jpg|jpeg|gif|svg|webp|css|js)$/.test(dom)) { r.status = 'removed'; r.reason = 'Invalid format'; return; }
        if (TYPO[dom]) { r.reason = 'Typo fixed (' + dom + ' to ' + TYPO[dom] + ')'; r.status = 'risky'; dom = TYPO[dom]; r.email = local + '@' + dom; }
        else if (/\.(con|cmo|vom|ocm|coom|cim)$/.test(dom)) { r.status = 'risky'; r.reason = 'Domain ending looks wrong (.' + dom.split('.').pop() + ')'; }
        if (seen[r.email]) { r.status = 'removed'; r.reason = 'Duplicate'; return; } seen[r.email] = 1;
        if (blocked[r.email] || blocked['@' + dom] || blocked[dom]) { r.status = 'removed'; r.reason = 'On block list'; return; }
        if (DISPOSABLE.indexOf(dom) >= 0) { r.status = 'removed'; r.reason = 'Disposable email service'; return; }
        if (NOREPLY.test(local.split('+')[0]) || /(^|\.)(example\.(com|org|net)|test\.com|localhost|invalid)$/.test(dom)) { r.status = 'removed'; r.reason = 'No-reply or test address'; return; }
        if (ROLE.test(local) && r.status === 'ready') { r.status = 'risky'; r.reason = 'Role address (shared inbox)'; }
        r._dom = dom; domains[dom] = 1;
      });
      var list = Object.keys(domains), done = 0, total = list.length, result = {}, idx = 0;
      $('scanState').textContent = 'Checking ' + total + ' mail domains...';
      return new Promise(function (resolve) {
        if (!total) return resolve();
        var workers = Math.min(8, total), active = workers;
        function next() {
          if (idx >= list.length) { if (--active === 0) resolve(); return; }
          var d = list[idx++];
          domainStatus(d).then(function (st) { result[d] = st; }, function () { result[d] = 'unknown'; }).then(function () { done++; fill(0.05 + 0.9 * done / total); $('scanState').textContent = 'Checked ' + done + ' of ' + total + ' mail domains...'; next(); });
        }
        for (var w = 0; w < workers; w++) next();
      }).then(function () {
        res.forEach(function (r) {
          if (!r._dom || r.status === 'removed') return;
          var st = result[r._dom];
          if (st === 'nxdomain') { r.status = 'removed'; r.reason = 'Domain does not exist'; }
          else if (st === 'nomx') { r.status = 'removed'; r.reason = 'No mail server for domain'; }
          else if (st === 'web' && r.status === 'ready') { r.status = 'risky'; r.reason = 'Website only, no mail server'; }
          else if (st === 'unknown' && r.status === 'ready') { r.status = 'risky'; r.reason = 'Could not check domain'; }
        });
        S.items = res; S.filter = 'all'; S.page = 0; fill(1); $('scanState').textContent = 'Done.'; renderClean();
      });
    });
  }
  function renderClean() {
    var c = { ready: 0, risky: 0, removed: 0 }, reasons = {};
    S.items.forEach(function (r) { c[r.status]++; if (r.reason) { var k = r.status + '|' + r.reason.replace(/ \(.*\)$/, ''); reasons[k] = (reasons[k] || 0) + 1; } });
    $('cleanOut').hidden = false;
    $('cleanKpis').innerHTML = '<div class="kpi"><small>Total in list</small><b>' + S.items.length + '</b></div><div class="kpi"><small>Ready to send</small><b style="color:var(--ok)">' + c.ready + '</b></div><div class="kpi"><small>Risky (held)</small><b style="color:#B54708">' + c.risky + '</b></div><div class="kpi"><small>Removed</small><b style="color:var(--bad)">' + c.removed + '</b></div>';
    var chips = '<button class="chip' + (S.filter === 'all' ? ' active' : '') + '" data-f="all">All</button>';
    ['ready', 'risky', 'removed'].forEach(function (s) { chips += '<button class="chip' + (S.filter === s ? ' active' : '') + '" data-f="' + s + '">' + s[0].toUpperCase() + s.slice(1) + ' ' + c[s] + '</button>'; });
    Object.keys(reasons).sort(function (a, b) { return reasons[b] - reasons[a]; }).forEach(function (k) { var p = k.split('|'); chips += '<span class="tag ' + p[0] + '">' + esc(p[1]) + ': ' + reasons[k] + '</span>'; });
    $('reasonChips').innerHTML = chips;
    $('reasonChips').querySelectorAll('.chip').forEach(function (b) { b.onclick = function () { S.filter = b.getAttribute('data-f'); S.page = 0; renderClean(); }; });
    var rows = S.items.filter(function (r) { return S.filter === 'all' || r.status === S.filter; });
    var pages = Math.max(1, Math.ceil(rows.length / PAGE)); S.page = Math.min(S.page, pages - 1);
    var slice = rows.slice(S.page * PAGE, S.page * PAGE + PAGE);
    $('cleanRows').innerHTML = slice.map(function (r) { return '<tr><td>' + esc(r.email) + '</td><td class="wrap">' + esc(r.company) + '</td><td>' + esc(r.name) + '</td><td><span class="tag ' + r.status + '">' + r.status + '</span></td><td class="wrap">' + esc(r.reason) + '</td></tr>'; }).join('') || '<tr><td colspan="5" style="color:var(--mut)">Nothing here.</td></tr>';
    $('cleanCount').textContent = rows.length ? 'Rows ' + (S.page * PAGE + 1) + ' to ' + (S.page * PAGE + slice.length) + ' of ' + rows.length : '';
  }
  function download(kind) {
    var rows = S.items.filter(function (r) { return kind === 'all' || r.status === kind; });
    if (!rows.length) { toast('Nothing to download for ' + kind + '.'); return; }
    var head = ['Email', 'Owner name', 'Company', 'Phone', 'MC', 'Result', 'Why'];
    dl('emails-' + kind + '.csv', [head].concat(rows.map(function (r) { return [r.email, r.name, r.company, r.phone, r.mc, r.status, r.reason]; })).map(function (r) { return r.map(csvCell).join(','); }).join('\r\n'));
  }
  function addToCampaign() {
    if (!S.connected) { setMsg('addMsg', 'Connect first (step 1).'); return; }
    var inc = $('addRisky').checked, rows = S.items.filter(function (r) { return r.status === 'ready' || (inc && r.status === 'risky'); });
    if (!rows.length) { setMsg('addMsg', 'There are no Ready emails to add.'); return; }
    var added = 0, skipped = 0, blocked = 0, before = 0, i = 0;
    setMsg('addMsg', 'Adding...', true);
    (function next() {
      if (i >= rows.length) { setMsg('addMsg', 'Added ' + added + ' to the campaign. ' + skipped + ' were already in it, ' + blocked + ' were on your block list' + (before ? ', ' + before + ' were emailed before (History)' : '') + '.', true); toast('Added ' + added + ' contacts.'); loadState(true); return; }
      var step = NET.tag ? 100 : 500, chunk = rows.slice(i, i + step).map(function (r) { return { email: r.email, name: r.name, company: r.company, phone: r.phone, mc: r.mc, status: r.status, reason: r.reason }; });
      api('add', { rows: chunk }).then(function (j) { added += j.added; skipped += j.skipped; blocked += j.blocked; before += j.before || 0; i += step; setMsg('addMsg', 'Adding... ' + Math.min(i, rows.length) + ' of ' + rows.length, true); next(); })
        .catch(function (e) { setMsg('addMsg', e.message + ' (added so far: ' + added + ')'); });
    })();
  }

  /* ================= 3. message ================= */
  function renderSteps() {
    var steps = S.cfg.steps;
    $('stepList').innerHTML = steps.map(function (st, i) {
      return '<div class="step" data-i="' + i + '"><h3><span>' + (i === 0 ? 'First email' : 'Follow-up ' + i) + '</span>' + (i > 0 ? '<button class="btn sm del" data-del="' + i + '">Remove</button>' : '') + '</h3>' +
        (i > 0 ? '<label class="gl">Send it this many days after the previous email (if no reply)</label><input class="gi" type="number" min="1" data-k="waitDays" value="' + esc(st.waitDays || 3) + '" style="max-width:140px">' : '') +
        '<label class="gl">Subject</label><input class="gi" data-k="subject" value="' + esc(st.subject) + '">' +
        '<label class="gl">Message</label><textarea class="ta" data-k="body">' + esc(st.body) + '</textarea>' +
        '<div class="row"><button class="btn sm" data-ins="{firstname}">Insert {firstname}</button><button class="btn sm" data-ins="{name}">Insert {name}</button><button class="btn sm" data-ins="{company}">Insert {company}</button></div></div>';
    }).join('');
    $('stepList').querySelectorAll('.step').forEach(function (el) {
      var i = +el.getAttribute('data-i');
      el.querySelectorAll('[data-k]').forEach(function (inp) {
        inp.addEventListener('input', function () { S.cfg.steps[i][inp.getAttribute('data-k')] = inp.getAttribute('data-k') === 'waitDays' ? Math.max(0, +inp.value || 0) : inp.value; S.prevStep = i; preview(); });
        inp.addEventListener('focus', function () { S.prevStep = i; preview(); });
      });
      el.querySelectorAll('[data-ins]').forEach(function (b) {
        b.onclick = function () {
          var ta = el.querySelector('textarea'), v = b.getAttribute('data-ins'), s = ta.selectionStart || 0, e2 = ta.selectionEnd || 0;
          ta.value = ta.value.slice(0, s) + v + ta.value.slice(e2); ta.focus(); ta.selectionStart = ta.selectionEnd = s + v.length;
          S.cfg.steps[i].body = ta.value; S.prevStep = i; preview();
        };
      });
      var d = el.querySelector('[data-del]'); if (d) d.onclick = function () { S.cfg.steps.splice(i, 1); S.prevStep = 0; renderSteps(); preview(); };
    });
    preview();
  }
  function sample(t) {
    return String(t || '').replace(/\{company\}/gi, 'Sample Logistics LLC').replace(/\{firstname\}/gi, 'John').replace(/\{name\}/gi, 'John Smith')
      .replace(/\{([^{}|]+(?:\|[^{}|]+)+)\}/g, function (m, g) { return g.split('|')[0]; });
  }
  var SIGF = ['name', 'title', 'company', 'phone', 'wa', 'site', 'logo'];
  function sigRead() { var g = { on: $('sigOn').checked }; SIGF.forEach(function (k) { g[k] = $('sig' + k.charAt(0).toUpperCase() + k.slice(1)).value.trim(); }); g.wa = g.wa.replace(/[^0-9]/g, ''); return g; }
  function sigFill(g) { g = g || {}; $('sigOn').checked = !!g.on; SIGF.forEach(function (k) { $('sig' + k.charAt(0).toUpperCase() + k.slice(1)).value = g[k] || ''; }); $('sigOn').closest('.sig-box').classList.toggle('off', !g.on); }
  function sigHtml(g) { // same card as the sheet sends (keep in sync with sigHtml_ in the Apps Script)
    if (!g || !g.on || !(g.name || g.company)) return '';
    var wa = String(g.wa || '').replace(/[^0-9]/g, ''), site = String(g.site || '').trim(), href = site && !/^https?:\/\//i.test(site) ? 'https://' + site : site;
    var init = esc(String(g.company || g.name || '?').trim().charAt(0).toUpperCase());
    var src = S.logo || (/^https:\/\/\S+$/i.test(String(g.logo || '').trim()) ? g.logo.trim() : '');
    var dm = /^(\d+)x(\d+)$/.exec(S.logo ? (S.logoDim || '') : ''), lw = dm ? +dm[1] : 46, lh = dm ? +dm[2] : 46;
    var logo = src ? '<img src="' + esc(src) + '" width="' + lw + '" height="' + lh + '" alt="" style="display:block;width:' + lw + 'px;height:' + lh + 'px;border:0;object-fit:contain' + (lw === lh ? ';border-radius:10px' : '') + '">'
      : '<div style="width:46px;height:46px;border-radius:10px;background:#1E3A8A;color:#fff;font:bold 20px/46px Arial,Helvetica,sans-serif;text-align:center">' + init + '</div>';
    var l2 = [g.title, g.company].filter(function (x) { return x; }).map(esc).join(' &middot; ');
    var l3 = [g.phone ? esc(g.phone) : '', site ? '<a href="' + esc(href) + '" style="color:#1E3A8A;text-decoration:none" target="_blank" rel="noopener">' + esc(site.replace(/^https?:\/\//i, '')) + '</a>' : ''].filter(String).join(' &nbsp;|&nbsp; ');
    var btn = wa ? '<a href="https://wa.me/' + wa + '" target="_blank" rel="noopener" style="display:inline-block;margin-top:9px;padding:7px 14px;background:#25D366;color:#fff;text-decoration:none;border-radius:6px;font:bold 13px/1.2 Arial,Helvetica,sans-serif">Chat on WhatsApp</a>' : '';
    return '<div class="sig" style="margin-top:18px;padding-top:14px;border-top:1px solid #E5E7EB"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td style="vertical-align:top;padding-right:12px">' + logo + '</td><td style="vertical-align:top;font-family:Arial,Helvetica,sans-serif;line-height:1.45">' +
      (g.name ? '<div style="font-size:15px;font-weight:bold;color:#111827">' + esc(g.name) + '</div>' : '') + (l2 ? '<div style="font-size:13px;color:#4B5563">' + l2 + '</div>' : '') + (l3 ? '<div style="font-size:13px;color:#4B5563">' + l3 + '</div>' : '') + btn + '</td></tr></table></div>';
  }
  /* logo upload: resize to a small square in the browser, store it in the sheet (Settings tab of this mailbox) */
  function paintLogo() {
    var box = $('logoPrev'); if (!box) return;
    var co = ($('sigCompany').value || $('sigName').value || '?').trim().charAt(0).toUpperCase();
    box.innerHTML = S.logo ? '<img src="' + esc(S.logo) + '" alt="Logo">' : esc(co || '?');
    $('logoDel').hidden = !S.logo;
  }
  function loadLogo() { if (S.logoLoaded || !S.connected) return; S.logoLoaded = true; api('get_logo').then(function (j) { S.logo = j.data || ''; S.logoDim = j.dim || ''; paintLogo(); preview(); }).catch(function () { S.logoLoaded = false; }); }
  function squareImage(file) {
    return new Promise(function (ok, bad) {
      var rd = new FileReader(); rd.onerror = function () { bad(new Error('Could not read the file.')); };
      rd.onload = function () {
        var im = new Image(); im.onerror = function () { bad(new Error('This file is not an image we can read. Use PNG or JPG.')); };
        im.onload = function () {
          var ar = im.width / im.height, dh = 46, dw = Math.round(Math.max(20, Math.min(150, dh * ar)));
          if (dw === 150) dh = Math.max(20, Math.round(150 / ar)); // very wide logo: keep it 150 px wide
          var cv = document.createElement('canvas'); cv.width = dw * 2; cv.height = dh * 2; var cx = cv.getContext('2d');
          cx.imageSmoothingQuality = 'high'; cx.drawImage(im, 0, 0, cv.width, cv.height);
          var out = cv.toDataURL('image/png');
          if (out.length > 40000) { var c2 = document.createElement('canvas'); c2.width = cv.width; c2.height = cv.height; var x2 = c2.getContext('2d'); x2.fillStyle = '#fff'; x2.fillRect(0, 0, c2.width, c2.height); x2.drawImage(cv, 0, 0); out = c2.toDataURL('image/jpeg', 0.88); if (out.length > 40000) out = c2.toDataURL('image/jpeg', 0.7); }
          S.logoNewDim = dw + 'x' + dh;
          ok(out);
        };
        im.src = rd.result;
      };
      rd.readAsDataURL(file);
    });
  }
  function uploadLogo(file) {
    if (!file) return; if (!S.connected) { setMsg('logoMsg', 'Connect first (step 1).'); return; }
    setMsg('logoMsg', 'Uploading...', true);
    squareImage(file).then(function (data) { var dm = S.logoNewDim.split('x'); return api('set_logo', { data: data, w: +dm[0], h: +dm[1] }).then(function () { S.logo = data; S.logoDim = S.logoNewDim; }); })
      .then(function () { paintLogo(); preview(); setMsg('logoMsg', 'Logo saved in your sheet.', true); toast('Logo saved.'); })
      .catch(function (e) { setMsg('logoMsg', /bad action/i.test(e.message) ? 'Update the Apps Script code first (step 1, Copy Apps Script code, then Deploy > New version).' : e.message); })
      .then(function () { $('logoFile').value = ''; });
  }
  function preview() {
    var steps = S.cfg.steps; if (S.prevStep >= steps.length) S.prevStep = 0;
    $('prevTabs').innerHTML = steps.map(function (s, i) { return '<button class="chip' + (i === S.prevStep ? ' active' : '') + '" data-p="' + i + '">' + (i === 0 ? 'First email' : 'Follow-up ' + i) + '</button>'; }).join('');
    $('prevTabs').querySelectorAll('.chip').forEach(function (b) { b.onclick = function () { S.prevStep = +b.getAttribute('data-p'); preview(); }; });
    var st = steps[S.prevStep] || steps[0], addr = $('address').value.trim() || '(your business address)', un = $('unsubText').value.trim();
    $('prev').innerHTML = '<div class="s">' + esc(sample(st.subject)) + '</div>' + esc(sample(st.body)) + sigHtml(sigRead()) + '<div class="f">--<br>' + esc(addr) + '<br>' + esc(un) + ' <u>unsubscribe</u></div>';
  }
  function addStep() {
    if (S.cfg.steps.length >= 5) { toast('Up to 5 emails (1 first email + 4 follow-ups).'); return; }
    S.cfg.steps.push({ subject: 'Re: ' + (S.cfg.steps[0].subject || ''), body: 'Hello {firstname},\n\nJust following up on my last email. Are you still looking for help with loads and dispatch for {company}?\n\nBest regards', waitDays: 3 });
    renderSteps(); S.prevStep = S.cfg.steps.length - 1; preview();
  }

  /* ================= 4. limits ================= */
  /* ================= weekly schedule ================= */
  var DAYN = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'], DAYS3 = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  function schedOf(c) {
    if (Array.isArray(c.days) && c.days.length === 7) return c.days.map(function (d) { d = d || {}; return { on: !!d.on, from: +d.from || 0, to: +d.to || 0 }; });
    var f = Math.max(0, Math.min(23, +c.winFrom || 0)) * 60, t = Math.max(1, Math.min(24, +c.winTo || 17)) * 60;
    return DAYN.map(function (n, i) { return { on: !c.weekdays || i < 5, from: f, to: t }; });
  }
  function hm(m) { m = Math.max(0, Math.min(1440, m)); if (m === 1440) return '12:00 AM (midnight)'; var h = Math.floor(m / 60), mi = m % 60, ap = h < 12 ? 'AM' : 'PM', h12 = h % 12 || 12; return h12 + ':' + (mi < 10 ? '0' : '') + mi + ' ' + ap; }
  function hmShort(m) { if (m === 1440 || m === 0) return '12 AM'; var h = Math.floor(m / 60), mi = m % 60, ap = h < 12 ? 'AM' : 'PM', h12 = h % 12 || 12; return h12 + (mi ? ':' + (mi < 10 ? '0' : '') + mi : '') + ' ' + ap; }
  function timeOpts(sel, isTo) { var o = ''; for (var m = isTo ? 30 : 0; m <= (isTo ? 1440 : 1410); m += 30) o += '<option value="' + m + '"' + (m === sel ? ' selected' : '') + '>' + hm(m) + '</option>'; return o; }
  /* "YYYY-MM-DDTHH:MM" in time zone tz  <->  epoch ms */
  function tzParts(ms, tz) { var o = {}; new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', weekday: 'short' }).formatToParts(new Date(ms)).forEach(function (p) { o[p.type] = p.value; }); return o; }
  function zonedToMs(str, tz) {
    var m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(str || ''); if (!m) return 0;
    var guess = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
    for (var i = 0; i < 2; i++) { var p = tzParts(guess, tz), asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute); guess += Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]) - asUtc; }
    return guess;
  }
  function msToZoned(ms, tz) { if (!ms) return ''; var p = tzParts(ms, tz); return p.year + '-' + p.month + '-' + p.day + 'T' + (p.hour === '24' ? '00' : p.hour) + ':' + p.minute; }
  function weekText(run) { // every schedule runs at most 7 days, then stops by itself
    if (!run || !run.running || !run.endAt) return '';
    var left = Math.max(0, Math.ceil((run.endAt - Date.now()) / 864e5));
    return 'This schedule runs until ' + fmtTz(run.endAt, (S.cfg && S.cfg.tz) || 'America/New_York') + ' (' + (left <= 1 ? 'last day' : left + ' days left') + '). Then it stops by itself: press Start to schedule the next 7 days.';
  }
  function fmtTz(ms, tz) { try { return new Date(ms).toLocaleString('en-US', { timeZone: tz, weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }); } catch (e) { return fmtTime(ms); } }
  /* same rules as the sheet: open now? next opening? */
  function winInfo(c, now) {
    var days = schedOf(c), skip = c.skipDates || [], startAt = +c.startAt || 0, tz = c.tz;
    var at = function (t) { if (startAt && t < startAt) return null; var p = tzParts(t, tz), dow = DAYS3.indexOf(p.weekday), mi = (+p.hour % 24) * 60 + +p.minute, d = days[dow], key = p.year + '-' + p.month + '-' + p.day; return d.on && d.to > d.from && skip.indexOf(key) < 0 && mi >= d.from && mi < d.to ? { left: d.to - mi } : null; };
    var o = at(now); if (o) return { open: true, left: o.left };
    var base = startAt > now ? startAt : now; if (at(base)) return { open: false, next: base };
    for (var i = 0; i < 15; i++) {
      var t = base + i * 86400000, p = tzParts(t, tz), dow = DAYS3.indexOf(p.weekday), mi = (+p.hour % 24) * 60 + +p.minute, d = days[dow], key = p.year + '-' + p.month + '-' + p.day;
      if (!d.on || d.to <= d.from || skip.indexOf(key) >= 0 || (i === 0 && mi >= d.from)) continue;
      var n = t + (d.from - mi) * 60000 - new Date(t).getSeconds() * 1000; if (n > now) return { open: false, next: n };
    }
    return { open: false, next: 0 };
  }
  /* today's limit is used up: when does it send again? (the first opening after today's window) */
  function limitHit(run, eff) { return (eff > 0 && (run.sentToday || 0) >= eff) || /daily limit/.test(run.idleWhy || ''); }
  function nextDayOpen(c, now) { var w = winInfo(c, now); return winInfo(c, now + Math.max(1, w.open ? w.left : 0) * 60000 + 60000).next; }
  function whenShort(ms, tz) { // "Tomorrow 8:00 AM" / "Mon 8:00 AM" in the schedule's time zone
    if (!ms) return 'Next sending day';
    try {
      var day = function (t) { var p = tzParts(t, tz); return p.year + p.month + p.day; };
      var tm = new Date(ms).toLocaleTimeString('en-US', { timeZone: tz, hour: 'numeric', minute: '2-digit' });
      if (day(ms) === day(Date.now())) return 'Today ' + tm;
      if (day(ms) === day(Date.now() + 86400000)) return 'Tomorrow ' + tm;
      return new Date(ms).toLocaleDateString('en-US', { timeZone: tz, weekday: 'short' }) + ' ' + tm;
    } catch (e) { return fmtTime(ms); }
  }
  function schedText(c) { // "Mon-Fri 9 AM-5 PM, Sat 10 AM-2 PM"
    var days = schedOf(c), groups = [];
    days.forEach(function (d, i) { if (!d.on || d.to <= d.from) return; var g = groups[groups.length - 1], lbl = hmShort(d.from) + '-' + hmShort(d.to); if (g && g.lbl === lbl && g.end === i - 1) g.end = i; else groups.push({ start: i, end: i, lbl: lbl }); });
    if (!groups.length) return 'no days selected';
    return groups.map(function (g) { return (g.start === g.end ? DAYS3[g.start] : DAYS3[g.start] + '-' + DAYS3[g.end]) + ' ' + g.lbl; }).join(', ');
  }
  function readSched() {
    var rows = []; document.querySelectorAll('#schRows .sch-row').forEach(function (r) { rows.push({ on: r.querySelector('input').checked, from: +r.querySelector('.c-from').value, to: +r.querySelector('.c-to').value }); });
    return rows.length === 7 ? rows : schedOf(S.cfg);
  }
  function drawSched(days) {
    var box = $('schRows'); if (!box) return;
    var cp = '<svg viewBox="0 0 24 24"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
    box.innerHTML = days.map(function (d, i) {
      return '<div class="sch-row' + (d.on ? '' : ' off') + '" data-i="' + i + '"><label class="sw c-sw" title="Send on ' + DAYN[i] + '"><input type="checkbox"' + (d.on ? ' checked' : '') + ' aria-label="Send on ' + DAYN[i] + '"><span></span></label>' +
        '<b class="c-day">' + DAYN[i] + '</b><select class="sel c-from" aria-label="' + DAYN[i] + ' from">' + timeOpts(d.from, false) + '</select><span class="dash c-dash">to</span>' +
        '<select class="sel c-to" aria-label="' + DAYN[i] + ' until">' + timeOpts(d.to, true) + '</select><div class="sch-bar c-bar"><i></i></div>' +
        '<button type="button" class="sch-cp c-cp" title="Use these hours for every day that is on" aria-label="Copy ' + DAYN[i] + ' hours to all days">' + cp + '</button></div>';
    }).join('');
    box.querySelectorAll('.sch-row').forEach(function (r) {
      var i = +r.getAttribute('data-i');
      r.querySelector('input').onchange = function () { r.classList.toggle('off', !this.checked); schedChanged(); };
      r.querySelectorAll('select').forEach(function (x) { x.onchange = schedChanged; });
      r.querySelector('.sch-cp').onclick = function () { var d = readSched(), src = d[i]; d.forEach(function (x) { if (x.on) { x.from = src.from; x.to = src.to; } }); drawSched(d); schedChanged(); toast(DAYN[i] + ' hours copied to every day that is on.'); };
    });
    paintBars();
  }
  function paintBars() {
    var now = Date.now(), tz = $('tz') ? $('tz').value : S.cfg.tz, p = tzParts(now, tz), today = DAYS3.indexOf(p.weekday), mi = (+p.hour % 24) * 60 + +p.minute;
    document.querySelectorAll('#schRows .sch-row').forEach(function (r) {
      var f = +r.querySelector('.c-from').value, t = +r.querySelector('.c-to').value, bar = r.querySelector('.sch-bar'), i = +r.getAttribute('data-i');
      var bad = t <= f; r.querySelector('.c-to').style.borderColor = bad && r.querySelector('input').checked ? 'var(--bad)' : '';
      bar.innerHTML = '<i style="left:' + (f / 14.4) + '%;width:' + Math.max(0, (t - f) / 14.4) + '%"></i>' + (i === today ? '<b style="left:' + (mi / 14.4) + '%" title="Now"></b>' : '');
    });
  }
  function schedChanged() { paintBars(); schedSummary(); }
  function schedSummary() {
    var el = $('schSum'); if (!el) return;
    var c = { days: readSched(), tz: $('tz').value, startAt: zonedToMs($('startAt').value, $('tz').value), skipDates: S.skip || [] };
    var hrs = c.days.reduce(function (a, d) { return a + (d.on && d.to > d.from ? (d.to - d.from) / 60 : 0); }, 0);
    var bad = c.days.some(function (d) { return d.on && d.to <= d.from; });
    if (!hrs) { el.innerHTML = '<b>No sending days selected.</b> Turn on at least one day, otherwise nothing will be sent.'; el.style.borderColor = 'var(--bad)'; return; }
    el.style.borderColor = '';
    var w = winInfo(c, Date.now()), place = c.tz.split('/').pop().replace(/_/g, ' ');
    var lim = Math.max(1, parseInt($('limit').value, 10) || 0), perHr = hrs ? (lim / (hrs / c.days.filter(function (d) { return d.on; }).length)) : 0;
    el.innerHTML = 'Sends <b>' + esc(schedText(c)) + '</b> (' + esc(c.tz) + '), <b>' + (Math.round(hrs * 10) / 10) + ' hours a week</b>.' +
      (c.startAt ? ' First email not before <b>' + esc(fmtTz(c.startAt, c.tz)) + '</b>.' : '') +
      (c.skipDates.length ? ' Skips ' + c.skipDates.length + ' day(s) off.' : '') +
      (bad ? ' <span style="color:var(--bad)">One day has an end time before its start time: that day is skipped.</span>' : '') +
      '<br><span class="now"><span class="dot' + (w.open ? ' on' : '') + '"></span>Now in ' + esc(place) + ': <b>' + esc(fmtTz(Date.now(), c.tz)) + '</b>, ' +
      (w.open ? 'sending is open (' + Math.round(w.left / 6) / 10 + ' h left today).' : (w.next ? 'closed. Next opening: <b>' + esc(fmtTz(w.next, c.tz)) + '</b> (' + esc(fmtTime(w.next)) + ' your time).' : 'no opening found in the next two weeks.')) + '</span>' +
      (lim ? '<br><small style="color:var(--mut)">About ' + (Math.round(perHr * 10) / 10) + ' emails per hour on a sending day at your limit of ' + lim + ' per day.</small>' : '');
  }
  function drawSkip() {
    var box = $('skipList'); if (!box) return; S.skip = (S.skip || []).slice().sort();
    box.innerHTML = S.skip.map(function (d) { var dt = new Date(d + 'T12:00:00'); return '<span class="skipc">' + esc(dt.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })) + '<button type="button" data-d="' + d + '" aria-label="Remove">&times;</button></span>'; }).join('');
    box.querySelectorAll('button').forEach(function (b) { b.onclick = function () { S.skip = S.skip.filter(function (x) { return x !== b.getAttribute('data-d'); }); drawSkip(); schedSummary(); }; });
  }
  var PRESETS = { wk: [[1, 1, 1, 1, 1, 0, 0], 540, 1020], wkl: [[1, 1, 1, 1, 1, 0, 0], 480, 1080], am: [[1, 1, 1, 1, 1, 0, 0], 480, 720], all: [[1, 1, 1, 1, 1, 1, 1], 540, 1020], sat: [[1, 1, 1, 1, 1, 1, 0], 540, 900] };
  /* "Set all days at once": one set of hours for the chosen days */
  var BULK = [1, 1, 1, 1, 1, 0, 0];
  function drawBulk() {
    var box = $('bulkDays'); if (!box) return;
    var d = readSched(), first = d.filter(function (x) { return x.on; })[0] || { from: 540, to: 1020 };
    BULK = d.map(function (x) { return x.on ? 1 : 0; });
    box.innerHTML = DAYS3.map(function (n, i) { return '<button type="button" data-i="' + i + '" class="' + (BULK[i] ? 'on' : '') + '" aria-pressed="' + !!BULK[i] + '">' + n + '</button>'; }).join('');
    box.querySelectorAll('button').forEach(function (b) { b.onclick = function () { var i = +b.getAttribute('data-i'); BULK[i] = BULK[i] ? 0 : 1; b.classList.toggle('on', !!BULK[i]); b.setAttribute('aria-pressed', !!BULK[i]); }; });
    $('bulkFrom').innerHTML = timeOpts(first.from, false); $('bulkTo').innerHTML = timeOpts(first.to, true);
  }
  function applyBulk() {
    var f = +$('bulkFrom').value, t = +$('bulkTo').value;
    if (!BULK.some(Boolean)) { toast('Pick at least one day.'); return; }
    if (t <= f) { toast('The end time must be after the start time.'); return; }
    drawSched(BULK.map(function (on) { return { on: !!on, from: f, to: t }; })); schedSummary();
    var names = DAYS3.filter(function (n, i) { return BULK[i]; }).join(', ');
    toast('Applied ' + hm(f) + ' to ' + hm(t) + ' on ' + names + '. Press "Save schedule & limits" to keep it.');
  }
  var MAX_AHEAD = 7 * 864e5; // a campaign can be scheduled at most one week ahead
  function startBounds() { // the date picker only offers today .. 7 days from now
    var el = $('startAt'), tz = ($('tz') && $('tz').value) || (S.cfg && S.cfg.tz) || 'America/New_York'; if (!el) return;
    el.min = msToZoned(Date.now(), tz); el.max = msToZoned(Date.now() + MAX_AHEAD, tz);
  }
  function checkStart() { // typed or picked further than a week: bring it back to the last day allowed
    var el = $('startAt'); if (!el || !el.value) return;
    var tz = $('tz').value, ms = zonedToMs(el.value, tz), lim = Date.now() + MAX_AHEAD;
    if (ms > lim) { el.value = msToZoned(lim, tz); toast('You can schedule up to 7 days ahead. The start was moved to the latest day allowed.'); }
  }
  function wireSched() {
    document.querySelectorAll('#schPresets .chip').forEach(function (b) { b.onclick = function () { var p = PRESETS[b.getAttribute('data-p')]; drawSched(p[0].map(function (on) { return { on: !!on, from: p[1], to: p[2] }; })); schedSummary(); }; });
    $('tz').addEventListener('change', function () { startBounds(); schedChanged(); }); $('startAt').addEventListener('change', function () { checkStart(); schedSummary(); }); $('startAt').addEventListener('focus', startBounds); $('limit').addEventListener('input', schedSummary);
    if ($('bulkApply')) $('bulkApply').onclick = applyBulk;
    setInterval(function () { if ($('v-limits') && $('v-limits').classList.contains('on')) { paintBars(); schedSummary(); } }, 60000);
  }
  function fillForms() {
    var c = S.cfg;
    ['fromName', 'replyTo', 'address', 'unsubText', 'limit', 'delayMin', 'delayMax', 'rampStart', 'rampStep', 'maxBouncePct'].forEach(function (k) { $(k).value = c[k] == null ? '' : c[k]; });
    $('ramp').checked = !!c.ramp;
    var sel = $('tz'); if (!sel.options.length) TZ.forEach(function (t) { var o = document.createElement('option'); o.value = t[0]; o.textContent = t[1]; sel.appendChild(o); });
    if (!Array.prototype.some.call(sel.options, function (o) { return o.value === c.tz; })) { var o = document.createElement('option'); o.value = c.tz; o.textContent = c.tz; sel.appendChild(o); }
    sel.value = c.tz; sigFill(c.sig); paintLogo(); loadLogo(); S.skip = (c.skipDates || []).slice(); drawSched(schedOf(c)); drawBulk(); $('startAt').value = msToZoned(+c.startAt || 0, c.tz); startBounds(); drawSkip(); schedSummary(); renderSteps(); rampHint();
  }
  function gather() {
    var c = S.cfg, num = function (id, d) { var v = parseFloat($(id).value); return isFinite(v) ? v : d; };
    ['fromName', 'replyTo', 'address', 'unsubText'].forEach(function (k) { c[k] = $(k).value.trim(); });
    c.sig = sigRead();
    c.limit = Math.max(1, Math.floor(num('limit', 50))); c.delayMin = Math.max(0, num('delayMin', 40)); c.delayMax = Math.max(c.delayMin, num('delayMax', 120));
    c.ramp = $('ramp').checked; c.rampStart = Math.max(1, Math.floor(num('rampStart', 10))); c.rampStep = Math.max(0, Math.floor(num('rampStep', 5)));
    c.tz = $('tz').value; c.days = readSched(); c.startAt = zonedToMs($('startAt').value, c.tz); if (c.startAt > Date.now() + MAX_AHEAD) c.startAt = Date.now() + MAX_AHEAD; c.skipDates = (S.skip || []).slice();
    var onD = c.days.filter(function (d) { return d.on && d.to > d.from; }); // keep the old fields filled for older pages / sheets
    c.winFrom = onD.length ? Math.floor(Math.min.apply(null, onD.map(function (d) { return d.from; })) / 60) : 9; c.winTo = onD.length ? Math.ceil(Math.max.apply(null, onD.map(function (d) { return d.to; })) / 60) : 17;
    c.weekdays = !(c.days[5].on || c.days[6].on); c.maxBouncePct = Math.min(50, Math.max(1, num('maxBouncePct', 5)));
    return c;
  }
  function rampHint() {
    var l = Math.max(1, parseInt($('limit').value, 10) || 50), a = Math.max(1, parseInt($('rampStart').value, 10) || 10), s = Math.max(0, parseInt($('rampStep').value, 10) || 0);
    $('rampBox').style.opacity = $('ramp').checked ? 1 : .45;
    $('rampHint').textContent = $('ramp').checked ? (s > 0 && l > a ? 'Day 1: ' + a + ' emails, day 2: ' + Math.min(l, a + s) + ', and so on. You reach ' + l + ' per day on day ' + (Math.ceil((l - a) / s) + 1) + '.' : 'You send ' + Math.min(l, a) + ' per day.') : 'Every day sends up to ' + l + ' emails from day 1.';
  }
  function saveCfg(okText, msgId) {
    var mid = msgId || 'mMsg';
    if (!S.connected) { setMsg(mid, 'Connect first (step 1) to save.'); return Promise.resolve(); }
    gather(); preview();
    return api('save_cfg', { cfg: S.cfg }).then(function () { setMsg(mid, okText, true); toast(okText); return loadState(true); }).catch(function (e) { setMsg(mid, e.message); throw e; });
  }
  function test() {
    var to = $('testTo').value.trim();
    if (!to) { setMsg('tMsg', 'Type the email address that should receive the test.'); return; }
    setMsg('tMsg', 'Sending...', true);
    saveCfg('Saved.').then(function () { return api('test', { to: to, step: S.prevStep }); })
      .then(function (j) {
        if (!j.queued) { setMsg('tMsg', 'Test sent to ' + j.to + '. Check the inbox (and the spam folder).', true); return; }
        setMsg('tMsg', 'Test queued. The Mailer sends it within a minute (it must be running)...', true);
        var tries = 0, poll = function () {
          api('state').then(function (st) {
            var t = st.lastTest;
            if (t && t.to === j.to && t.ok) setMsg('tMsg', 'Test sent to ' + j.to + '. Check the inbox (and the spam folder).', true);
            else if (t && t.to === j.to) setMsg('tMsg', 'The Mailer could not send it: ' + t.error);
            else if (++tries > 30) setMsg('tMsg', 'Nothing yet. Is the Mailer running? Start it on your computer (step 1).');
            else setTimeout(poll, 4000);
          }).catch(function () { if (++tries <= 30) setTimeout(poll, 4000); });
        };
        setTimeout(poll, 4000);
      }).catch(function (e) { setMsg('tMsg', e.message); });
  }

  /* sender health */
  function txtOf(r) { return ((r && r.Answer) || []).filter(function (a) { return a.type === 16; }).map(function (a) { return String(a.data).replace(/"\s*"/g, '').replace(/^"|"$/g, ''); }); }
  function health() {
    var d = $('hDomain').value.trim().toLowerCase().replace(/^.*@/, '').replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    var out = $('healthOut'); if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(d)) { out.innerHTML = '<div class="warn"><b>Check</b>Type your domain, for example yourcompany.com.</div>'; return; }
    if (FREE.indexOf(d) >= 0) { out.innerHTML = '<div class="ok"><b>OK</b>' + esc(d) + ' is set up by its provider. Nothing to configure. Keep your daily numbers modest.</div>'; return; }
    out.innerHTML = '<div><b>Checking</b>Looking up DNS records...</div>';
    var sel = ['google', 'default', 'selector1', 'selector2', 'k1', 's1', 's2', 'zmail', 'mail', 'dkim'];
    Promise.all([doh(d, 'TXT'), doh('_dmarc.' + d, 'TXT'), doh(d, 'MX')].concat(sel.map(function (s) { return doh(s + '._domainkey.' + d, 'TXT').then(function (r) { return r && r.Answer && r.Answer.length ? doh(s + '._domainkey.' + d, 'CNAME').then(function () { return r; }) : doh(s + '._domainkey.' + d, 'CNAME'); }); }))).then(function (r) {
      var rows = [], spf = txtOf(r[0]).filter(function (t) { return /^v=spf1/i.test(t); });
      if (!spf.length) rows.push(['bad', 'SPF', 'No SPF record found. Mail from your domain is likely to be treated as suspicious. Your email provider (Google Workspace, Zoho, etc.) shows the exact record to add at your domain host.']);
      else if (spf.length > 1) rows.push(['warn', 'SPF', 'You have more than one SPF record. Merge them into one, otherwise SPF fails.']);
      else rows.push(['ok', 'SPF', 'Found: ' + esc(spf[0].slice(0, 120)) + (/_spf\.google\.com/.test(spf[0]) ? ' (Google Workspace included)' : '')]);
      var dk = r.slice(3).some(function (x) { return x && x.Answer && x.Answer.length; });
      rows.push(dk ? ['ok', 'DKIM', 'A DKIM signing record was found.'] : ['warn', 'DKIM', 'No DKIM record found under the common names. In Google Workspace: Admin console, Apps, Gmail, Authenticate email, Generate and publish the key. If your provider uses another name this warning can be ignored.']);
      var dm = txtOf(r[1]).filter(function (t) { return /^v=DMARC1/i.test(t); });
      if (!dm.length) rows.push(['warn', 'DMARC', 'No DMARC record. Add a TXT record for _dmarc.' + esc(d) + ' with v=DMARC1; p=none; rua=mailto:you@' + esc(d) + ' to start. Gmail and Yahoo expect it.']);
      else rows.push([/p=none/i.test(dm[0]) ? 'warn' : 'ok', 'DMARC', esc(dm[0].slice(0, 120)) + (/p=none/i.test(dm[0]) ? ' (monitoring only: fine to start, tighten later)' : '')]);
      var mx = r[2] && (r[2].Answer || []).some(function (a) { return a.type === 15; });
      rows.push(mx ? ['ok', 'MX', 'Your domain can receive replies.'] : ['bad', 'MX', 'No mail server found for ' + esc(d) + '. Replies could not be delivered.']);
      out.innerHTML = rows.map(function (x) { return '<div class="' + x[0] + '"><b>' + x[1] + '</b><span>' + x[2] + '</span></div>'; }).join('');
    }).catch(function () { out.innerHTML = '<div class="bad"><b>Error</b>Could not look up DNS records. Check your internet and try again.</div>'; });
  }

  /* ================= 5. run ================= */
  var STATUS_ORDER = [['', 'All'], ['queued', 'Waiting'], ['done', 'Finished'], ['replied', 'Replied'], ['bounced', 'Bounced'], ['unsub', 'Unsubscribed'], ['risky', 'Held'], ['error', 'Errors']];
  function refresh(quiet) {
    if (!S.connected && S.url && S.key) { // still starting up (or the first load failed): wait / retry instead of saying "Connect first"
      var upd0 = $('runUpd'); if (upd0) upd0.textContent = 'Connecting to your Google Sheet...';
      return (S.boot || Promise.resolve()).then(function () { if (!S.connected) return loadState(false); })
        .then(function () { return S.connected ? refresh(quiet) : null; })
        .catch(function (e) { if (upd0) upd0.textContent = 'Could not reach your Google Sheet (' + e.message + '). Trying again in 20 sec.'; });
    }
    if (!S.connected) { if (!quiet) setMsg('rMsg', 'Connect first (step 1).'); renderRun(null); return Promise.resolve(); }
    setMsg('rMsg', '');
    renderAll();
    var first = function () { return S.ct.offset === 0 && !S.ct.status && !S.ct.q; };
    if (S.state) { renderRun(S.state); if (S.state.page && first()) renderContacts(S.state.page); loadLog(); } // show what we have at once
    var loadingRow = function (id, n) { var el = $(id); if (el && !el.children.length) el.innerHTML = '<tr><td colspan="' + n + '" style="color:var(--mut)">Loading from your Google Sheet...</td></tr>'; };
    loadingRow('ctRows', 6); loadingRow('logRows', 5);
    if (FR.run.busy && quiet) return Promise.resolve();
    var upd = $('runUpd'); FR.run.busy = true; FR.run.err = ''; paintLive('run');
    var p = S.bootLoad || loadState(false); S.bootLoad = null;
    return p.then(function () { renderRun(S.state); var pg = S.state && S.state.page; return pg && first() ? renderContacts(pg) : loadContacts(); }).then(loadLog)
      .then(function () { FR.run.busy = false; FR.run.at = Date.now(); paintLive('run'); })
      .catch(function (e) { FR.run.busy = false; FR.run.err = e.message; paintLive('run'); if (!quiet) setMsg('rMsg', e.message); });
  }
  function renderRun(st) {
    if (st && !st.cfg) st = null;
    var run = st ? st.run || {} : {}, c = st ? st.counts || {} : {};
    var on = !!run.running, paused = !!run.paused;
    $('runTag').textContent = on ? (paused ? 'Paused' : 'Running') : 'Stopped'; $('runTag').className = 'tag ' + (on && !paused ? 'queued' : (paused ? 'paused' : 'removed'));
    $('runReason').textContent = run.reason || weekText(run);
    $('bStart').hidden = on; $('bPause').hidden = !on || paused; $('bResume').hidden = !paused; $('bStop').hidden = !on;
    var sent = run.sentToday || 0, lim = st ? st.effLimit : 0;
    $('todayBar').style.width = lim ? Math.min(100, Math.round(sent * 100 / lim)) + '%' : '0';
    var k = function (l, v, cls) { return '<div class="kpi"><small>' + l + '</small><b' + (cls ? ' style="color:var(--' + cls + ')"' : '') + '>' + v + '</b></div>'; };
    $('runKpis').innerHTML = st ? k('Sent today', sent + ' / ' + lim) + k('Waiting to send', c.queued || 0) + k('Finished', c.done || 0, 'ok') + k('Replied', c.replied || 0, 'accent') + k('Bounced', c.bounced || 0, 'bad') + k('Unsubscribed', c.unsub || 0) + k('Held (risky)', c.risky || 0) + k('Sent in total', run.sentTotal || 0) + (S.cfg.sender === 'smtp' ? k('Mailer', mailerOnline() ? 'Online' : 'Offline', mailerOnline() ? 'ok' : 'bad') : k('Gmail quota left', st.quota == null ? '-' : st.quota)) : '';
    $('runSub').textContent = st ? 'Today (' + st.today + ') the limit is ' + st.effLimit + ' emails' + (S.cfg.ramp && st.effLimit < S.cfg.limit ? ' because of the slow warm-up (your full limit is ' + S.cfg.limit + ')' : '') + '. Schedule: ' + schedText(S.cfg) + ' (' + S.cfg.tz + ')' + (S.cfg.startAt && S.cfg.startAt > Date.now() ? ', first email ' + fmtTz(S.cfg.startAt, S.cfg.tz) : '') + '.' : 'Start the campaign and it sends by itself within your limits.';
    if (st && S.cfg.sender === 'smtp' && on && !paused && !mailerOnline()) $('runReason').textContent = ((run.reason || '') + ' The Mailer program is not running, so nothing is being sent. Start it (step 1).').trim();
    renderNext();
    renderHealth(st);
    renderSender();
    $('blkCount').textContent = st ? '(' + st.suppressCount + ' addresses blocked)' : '';
    $('stChips').innerHTML = STATUS_ORDER.map(function (s) { return '<button class="chip' + (S.ct.status === s[0] ? ' active' : '') + '" data-s="' + s[0] + '">' + s[1] + (s[0] ? ' ' + (c[s[0]] || 0) : '') + '</button>'; }).join('');
    $('stChips').querySelectorAll('.chip').forEach(function (b) { b.onclick = function () { S.ct.status = b.getAttribute('data-s'); S.ct.offset = 0; loadContacts(); renderRun(S.state); }; });
  }
  /* ---- Mailbox health: one score from sending results, domain setup and warm-up inbox placement ---- */
  var AUTH = {};
  function authCheck(d) {
    d = String(d || '').toLowerCase();
    if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(d)) return Promise.resolve(null);
    if (AUTH[d]) return AUTH[d];
    if (FREE.indexOf(d) >= 0) return (AUTH[d] = Promise.resolve({ spf: true, dkim: true, dmarc: true, mx: true, free: true }));
    var sel = ['default', 'google', 'selector1', 'selector2', 'k1', 's1', 's2', 'zmail', 'mail', 'dkim', 'hostingermail1', 'hostingermail2', 'hostingermail-a', 'hostingermail-b'];
    return (AUTH[d] = Promise.all([doh(d, 'TXT'), doh('_dmarc.' + d, 'TXT'), doh(d, 'MX')].concat(sel.map(function (s) { return doh(s + '._domainkey.' + d, 'TXT').then(function (r) { return r && r.Answer && r.Answer.length ? r : doh(s + '._domainkey.' + d, 'CNAME'); }); }))).then(function (r) {
      return { spf: txtOf(r[0]).filter(function (t) { return /^v=spf1/i.test(t); }).length === 1, dmarc: txtOf(r[1]).some(function (t) { return /^v=DMARC1/i.test(t); }),
        mx: !!(r[2] && (r[2].Answer || []).some(function (a) { return a.type === 15; })), dkim: r.slice(3).some(function (x) { return x && x.Answer && x.Answer.length; }) };
    }).catch(function () { delete AUTH[d]; return null; }));
  }
  function warmSum(w, days) {
    var o = { sent: 0, inbox: 0, spam: 0, replies: 0, today: null }; if (!w || !w.days) return o;
    var keys = Object.keys(w.days).sort().slice(-days);
    keys.forEach(function (k) { var x = w.days[k]; o.sent += x.sent || 0; o.inbox += x.inbox || 0; o.spam += x.spam || 0; o.replies += x.replies || 0; });
    o.today = w.days[Object.keys(w.days).sort().pop()] || null; return o;
  }
  /* score one mailbox from its numbers; auth = domain check result (or null while it loads) */
  function healthOf(st, auth) {
    var run = st.run || {}, c = st.counts || {}, sent = run.sentTotal || 0, rows = [], pct = function (a, b) { return b ? Math.round(a * 1000 / b) / 10 : 0; };
    var mailbox = st.mailbox || st.label || st.box || (st.worker && st.worker.from) || st.sender || '', dom = (String(mailbox).split('@')[1] || '').toLowerCase().replace(/[^a-z0-9.-].*$/, '');
    if (!dom) rows.push(['na', 'Domain setup', 'Start the Mailer once so the sending address is known.', 0]);
    else if (!auth) rows.push(['na', 'Domain setup', 'Checking ' + esc(dom) + '...', 12]);
    else { var a = (auth.spf ? 10 : 0) + (auth.dkim ? 8 : 0) + (auth.dmarc ? 7 : 0), miss = [];
      if (!auth.spf) miss.push('SPF'); if (!auth.dkim) miss.push('DKIM'); if (!auth.dmarc) miss.push('DMARC');
      rows.push([a >= 25 ? 'ok' : (a >= 15 ? 'warn' : 'bad'), 'Domain setup', auth.free ? esc(dom) + ' is set up by its provider.' : (miss.length ? 'Missing on ' + esc(dom) + ': <b>' + miss.join(', ') + '</b>. Add them in your domain DNS (step 4, Sender health check shows how). Missing records send mail to spam.' : 'SPF, DKIM and DMARC are all in place on ' + esc(dom) + '.'), a]); }
    var bounced = Math.max(run.bouncedTotal || 0, c.bounced || 0), br = pct(bounced, sent), bp;
    if (sent < 20) { bp = 20; rows.push(['na', 'Bounces', 'Too early to tell (' + sent + ' sent). Keep it under 2%.', bp]); }
    else { bp = br < 1 ? 25 : br < 2 ? 20 : br < 3 ? 12 : br < 5 ? 5 : 0; rows.push([br < 2 ? 'ok' : br < 5 ? 'warn' : 'bad', 'Bounces', br + '% (' + bounced + ' of ' + sent + ')' + (br >= 2 ? '. Clean your list again (step 2) before sending more: bounces hurt the most.' : '. Good.'), bp]); }
    var ur = pct(c.unsub || 0, sent), up = sent < 20 ? 8 : ur < 0.5 ? 10 : ur < 1 ? 7 : ur < 2 ? 3 : 0;
    rows.push([sent < 20 ? 'na' : ur < 1 ? 'ok' : ur < 2 ? 'warn' : 'bad', 'Unsubscribes', sent < 20 ? 'Too early to tell.' : ur + '% (' + (c.unsub || 0) + ')' + (ur >= 1 ? '. Many people opting out looks like spam to Gmail. Make the first email more personal.' : '. Fine.'), up]);
    var rr = pct(c.replied || 0, sent), rp = sent < 30 ? 6 : rr >= 3 ? 10 : rr >= 1 ? 7 : rr > 0 ? 4 : 2;
    rows.push([sent < 30 ? 'na' : rr >= 1 ? 'ok' : 'warn', 'Replies', sent < 30 ? 'Too early to tell (' + (c.replied || 0) + ' so far).' : rr + '% (' + (c.replied || 0) + ')' + (rr < 1 ? '. Replies tell Gmail people want your mail. Ask a simple question at the end of the email.' : '. Good sign.'), rp]);
    var w = st.warm, ws = warmSum(w, 7), seen = ws.inbox + ws.spam, ip = seen ? Math.round(ws.inbox * 100 / seen) : 0, pp;
    if (!w) { pp = 8; rows.push(['na', 'Inbox placement', 'Not measured. Turn on warm-up in the Mailer to see how many emails land in Inbox vs Spam.', pp]); }
    else if (seen < 5) { pp = 12; rows.push(['na', 'Inbox placement', 'Measuring... (' + seen + ' warm-up emails checked so far).', pp]); }
    else { pp = ip >= 95 ? 20 : ip >= 85 ? 15 : ip >= 70 ? 8 : 2; rows.push([ip >= 90 ? 'ok' : ip >= 75 ? 'warn' : 'bad', 'Inbox placement', ip + '% Inbox, ' + (100 - ip) + '% Spam in the last 7 days (' + seen + ' warm-up emails).' + (ip < 90 ? ' Lower your daily limit and keep warm-up running until this is above 90%.' : ''), pp]); }
    var lim = st.effLimit || 0, age = run.startDay ? Math.max(0, Math.round((Date.parse(st.today) - Date.parse(run.startDay)) / 86400000)) : 0, safe = 20 + age * 5, pace;
    if (st.cfg && st.cfg.ramp) { pace = 10; rows.push(['ok', 'Sending pace', 'Slow warm-up is on: ' + lim + ' emails allowed today.', pace]); }
    else if (lim > safe) { pace = 3; rows.push(['warn', 'Sending pace', lim + ' per day is fast for a campaign that is ' + age + ' day(s) old. About ' + safe + ' is safer right now (step 4, Warm up slowly).', pace]); }
    else { pace = 9; rows.push(['ok', 'Sending pace', lim + ' per day. Fine for this mailbox.', pace]); }
    var score = 0; rows.forEach(function (r) { score += r[3]; });
    if ((run.errToday || 0) > 3) score -= 5;
    score = Math.max(0, Math.min(100, Math.round(score)));
    return { score: score, rows: rows, mailbox: mailbox, dom: dom, w: w, ws: ws, grade: score >= 80 ? 'Healthy' : score >= 60 ? 'Fair' : 'At risk' };
  }
  function renderHealth(st) {
    var box = $('healthBox'); if (!box) return;
    if (!st) { box.hidden = true; return; }
    box.hidden = false;
    var base = Object.assign({}, st, { label: S.box || (st.worker && st.worker.from) || st.sender || '' });
    var draw = function (auth) {
      var hl = healthOf(base, auth), score = hl.score, w = hl.w, ws = hl.ws;
      var grade = score >= 80 ? ['Healthy', 'queued', '#22c55e'] : score >= 60 ? ['Fair', 'paused', '#f5a623'] : ['At risk', 'bounced', '#ef4444'];
      $('hbScore').textContent = score; $('hbRing').style.setProperty('--p', score); $('hbRing').style.setProperty('--c', grade[2]);
      $('hbTag').textContent = grade[0]; $('hbTag').className = 'tag ' + grade[1];
      $('hbSub').textContent = (hl.mailbox ? hl.mailbox + ': ' : '') + (score >= 80 ? 'safe to send at your current pace.' : score >= 60 ? 'OK, but fix the orange points before sending more.' : 'slow down and fix the red points first, or emails will go to spam.');
      $('hbRows').innerHTML = hl.rows.map(function (r) { return '<div class="hb-row"><i class="' + r[0] + '"></i><b>' + r[1] + '</b><span>' + r[2] + '</span></div>'; }).join('');
      $('hbWarm').innerHTML = w ? ('<b>Warm-up is on</b> since ' + esc(w.start || '?') + ' with ' + (w.partners || 0) + ' partner mailbox(es). Today: ' + ((ws.today && ws.today.sent) || 0) + ' of ' + (w.target || '?') + ' warm-up emails sent. Last 7 days: ' + ws.sent + ' sent, ' + ws.spam + ' moved out of Spam, ' + ws.replies + ' replies. Last update ' + fmtTime(w.at) + '.')
        : '<b>Warm-up is off.</b> Add 2 or 3 of your own Gmail / Outlook accounts as warm-up partners in the Mailer (double-click <b>add-warmup-partner.bat</b>). They exchange a few normal emails with this mailbox every day, rescue them from Spam and reply, so your reputation grows and you can see your inbox rate here.';
    };
    draw(null);
    var d = (String(base.label).split('@')[1] || '').toLowerCase();
    if (d) authCheck(d).then(draw);
  }

  /* "Next email" line: when the next email of the campaign goes out */
  function renderNext() {
    var el = $('runNext'), st = S.state; if (!el) return;
    var run = st ? st.run || {} : {}, on = !!run.running && !run.paused;
    if (!st || !on) { el.hidden = true; return; }
    var clock = '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>';
    var hhmm = function (ms) { return new Date(ms).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }); };
    var nowS = Date.now() - (S.clockSkew || 0), html = '';
    var nxtOpen = function () { var w = winInfo(S.cfg, nowS); return w.open ? 0 : (run.nextAt && run.idleWhy === 'outside the sending window' ? run.nextAt : w.next); };
    if (S.cfg.sender !== 'smtp' && st.triggers === 0) {
      html = '<span><b>Not scheduled yet.</b> <small>Press Pause and then Resume once: that turns on the 5-minute Gmail schedule.</small></span>';
    } else if (S.cfg.sender !== 'smtp' && nxtOpen()) {
      html = '<span>Outside your schedule. <b>Next email: ' + esc(fmtTz(nxtOpen(), S.cfg.tz)) + '</b> <small>(' + esc(S.cfg.tz) + '; ' + esc(fmtTime(nxtOpen())) + ' your time)</small></span>';
    } else if (limitHit(run, st.effLimit || 0)) {
      var ndl = nextDayOpen(S.cfg, nowS);
      html = '<span>Today\'s limit is used up (' + (run.sentToday || 0) + ' / ' + (st.effLimit || 0) + '). <b>Next email: ' + esc(ndl ? fmtTz(ndl, S.cfg.tz) : 'next sending day') + '</b> <small>(' + esc(S.cfg.tz) + (ndl ? '; ' + esc(fmtTime(ndl)) + ' your time' : '') + ')</small></span>';
    } else if (S.cfg.sender !== 'smtp' && run.idleWhy && run.idleWhy !== 'outside the sending window') {
      html = '<span>Waiting: <b>' + esc(run.idleWhy) + '</b></span>';
    } else if (S.cfg.sender !== 'smtp') {
      html = '<span>Next round of emails: <b>within 5 minutes</b> <small>(Gmail mode sends a few emails every 5 minutes)</small></span>';
    } else if (!mailerOnline()) {
      html = '<span>Next email: <b>waiting for the Mailer</b> <small>(start the Mailer program on your computer)</small></span>';
    } else if (!('nextAt' in run) && !('idleWhy' in run)) {
      html = '<span>Next email time is not available yet. <small>Update the Apps Script code (step 1, Copy Apps Script code, then Deploy &gt; Manage deployments &gt; New version).</small></span>';
    } else if (run.idleWhy === 'outside the sending window') {
      html = '<span>Outside your schedule. <b>Next email: ' + esc(nxtOpen() ? fmtTz(nxtOpen(), S.cfg.tz) : 'when your schedule opens') + '</b> <small>(' + esc(S.cfg.tz) + (nxtOpen() ? '; ' + esc(fmtTime(nxtOpen())) + ' your time' : '') + ')</small></span>';
    } else if (run.idleWhy === 'daily limit reached' || run.idleWhy === 'daily limit reached at the provider') {
      var nd = winInfo(S.cfg, nowS + Math.max(1, (winInfo(S.cfg, nowS).left || 0)) * 60000 + 60000).next;
      html = '<span>Today\'s limit is used up. <b>Next email: ' + esc(nd ? fmtTz(nd, S.cfg.tz) : 'next sending day') + '</b> <small>(' + esc(S.cfg.tz) + ')</small></span>';
    } else if (run.idleWhy === 'nothing due right now' && run.nextAt) {
      html = '<span>Next follow-up is due on <b>' + fmtTime(run.nextAt) + '</b> <small>(follow-ups wait the days you set in step 3)</small></span>';
    } else if (run.idleWhy === 'waiting for the previous email result') {
      html = '<span>Waiting for the Mailer to confirm the last email' + (run.nextAt ? ' <small>(continues by ' + hhmm(run.nextAt) + ' at the latest)</small>' : '') + '</span>';
    } else if (run.idleWhy && run.idleWhy !== 'nothing due right now') {
      html = '<span>Waiting: <b>' + esc(run.idleWhy) + '</b></span>';
    } else if (run.nextAt && run.nextAt > nowS) {
      var left = Math.max(0, Math.round((run.nextAt - nowS) / 60000));
      html = '<span>Next email at <b>' + hhmm(run.nextAt) + '</b> <small>(' + (left < 1 ? 'less than a minute' : 'in about ' + left + ' min') + '). Emails are spread over your sending hours so they do not look like bulk mail.</small></span>';
    } else {
      html = '<span>Next email: <b>any moment now</b></span>';
    }
    el.innerHTML = clock + html; el.hidden = false;
  }
  setInterval(function () { if (!document.hidden && S.state) renderNext(); }, 20000);

  function loadContacts() {
    return api('contacts', { status: S.ct.status, q: S.ct.q, offset: S.ct.offset, limit: CT_PAGE }).then(renderContacts);
  }
  function renderContacts(j) {
    {
      S.ct.total = j.total; var n = S.cfg.steps.length, now = Date.now();
      $('ctRows').innerHTML = j.rows.map(function (r) {
        var nxt = r.status === 'queued' ? (r.next_due <= now ? 'Due now' : fmtTime(r.next_due)) : '';
        return '<tr><td>' + esc(r.email) + '</td><td class="wrap">' + esc(r.company) + '</td><td><span class="tag ' + r.status + '">' + esc(r.status) + '</span></td><td>' + r.step + ' / ' + n + '</td><td>' + nxt + '</td><td class="wrap">' + esc(r.reason || r.note) + '</td></tr>';
      }).join('') || '<tr><td colspan="6" style="color:var(--mut)">No contacts here yet. Clean a list in step 2 and add it.</td></tr>';
      $('ctCount').textContent = j.total ? 'Rows ' + (S.ct.offset + 1) + ' to ' + (S.ct.offset + j.rows.length) + ' of ' + j.total : '';
    }
  }
  /* last known numbers of each campaign, shown at once while fresh ones load */
  function saveCache(st) { try { var id = CL.activeId(); if (id && st && st.cfg) LS.set('dl_cmp_c_' + id, JSON.stringify(st)); } catch (e) {} }
  function readCache() { try { var c = JSON.parse(LS.get('dl_cmp_c_' + CL.activeId()) || 'null'); return c && c.cfg ? c : null; } catch (e) { return null; } }
  function loadLog() {
    var lg = (S.state && S.state.log) || [];
    $('logRows').innerHTML = lg.map(function (r) { return '<tr><td>' + esc(r[0]) + '</td><td>' + esc(r[1]) + '</td><td>' + esc(r[2]) + '</td><td><span class="tag ' + (r[3] === 'sent' ? 'queued' : (r[3] === 'replied' ? 'replied' : 'bounced')) + '">' + esc(r[3]) + '</span></td><td class="wrap">' + esc(r[4]) + '</td></tr>'; }).join('') || '<tr><td colspan="5" style="color:var(--mut)">Nothing sent yet.</td></tr>';
  }
  function ctl(action) {
    var go = function () { setMsg('rMsg', '...', true); return api(action).then(function () { setMsg('rMsg', action === 'start' ? (S.cfg.sender === 'smtp' ? 'Campaign started. Keep the Mailer program running; it sends by itself, even if you close this page.' : 'Campaign started. It sends by itself, even if you close this page.') : 'Done.', true); return refresh(true); }).catch(function (e) { setMsg('rMsg', e.message); }); };
    if (action === 'start') {
      gather();
      if (!S.cfg.address) { setMsg('rMsg', ERR.ADDRESS_REQUIRED); return; }
      return api('save_cfg', { cfg: S.cfg }).then(go).catch(function (e) { setMsg('rMsg', e.message); });
    }
    if (action === 'stop' && !confirm('Stop the campaign? Contacts keep their progress; press Start to continue later.')) return;
    return go();
  }
  function sendNow() {
    if (!S.connected) { setMsg('rMsg', 'Connect first (step 1).'); return; }
    if (!confirm('Send up to 10 emails right now? (Your daily limit still applies. The campaign must be running.)')) return;
    setMsg('rMsg', 'Sending a batch... this can take a few minutes.', true);
    api('send_now').then(function (j) { var r = j.result || {}; setMsg('rMsg', r.sent != null ? 'Sent ' + r.sent + ' emails.' : (r.skipped ? 'Nothing sent: ' + r.skipped + '.' : (r.paused || 'Done.')), true); return refresh(true); }).catch(function (e) { setMsg('rMsg', e.message); });
  }
  function bulk(kind) {
    var map = { promote: ['Release all held (risky) contacts so they get emailed?', function () { return api('set_status', { all: true, from: 'risky', status: 'queued' }); }],
      'del-risky': ['Delete all held (risky) contacts?', function () { return api('delete', { status: 'risky' }); }],
      'del-bounced': ['Delete all bounced contacts? (They stay on the block list.)', function () { return api('delete', { status: 'bounced' }); }],
      'del-done': ['Delete every contact that has received all emails (Finished)? Replied contacts are kept.', function () {
        var keep = confirm('Keep only their email address in a small "History" tab?\n\nOK = yes: if they appear in a new list they are NOT emailed again (1 cell per contact, very light).\nCancel = no: delete them completely.');
        return api('delete', { status: 'done', history: keep }); }],
      'del-all': ['Delete EVERY contact from the campaign list? This cannot be undone.', function () {
        var keep = confirm('Keep only the email addresses of people you already emailed in a small "History" tab?\n\nOK = yes: they are never emailed again if they appear in a new list.\nCancel = no: delete everything completely.');
        return api('delete', { status: 'all', history: keep }); }] }[kind];
    if (!S.connected || !confirm(map[0])) return;
    map[1]().then(function () { toast('Done.'); return refresh(true); }).catch(function (e) { setMsg('rMsg', e.message); });
  }
  function blockAdd() {
    var list = $('blkAdd').value.split(/[\r\n,;]+/).map(function (x) { return x.trim(); }).filter(Boolean);
    if (!list.length || !S.connected) return;
    api('suppress_add', { entries: list }).then(function (j) { $('blkAdd').value = ''; toast('Added ' + j.added + ' to the block list.'); return refresh(true); }).catch(function (e) { setMsg('rMsg', e.message); });
  }

  /* ================= wire up ================= */
  window.CMP = {
    show: show, overview: function () { return overview(false); }, copySetup: function () { makeCode(); if (!$('mbCode').value) { toast('Type your mailbox first (step 1).'); return; } copyText($('mbCode').value, 'Setup code copied. Paste it in the Mailer window.'); },
    connect: connect, disconnect: disconnect, setSender: setSender, copyUrl: copyUrl, downloadMailer: downloadMailer, copyKey: function () { copyText($('cKey').value, 'Secret key copied. Keep it somewhere safe.'); },
    loadAliases: function () { S.aliases = null; loadAliases(); },
    delLogo: function () { if (!confirm('Remove the logo from the signature?')) return; api('set_logo', { data: '' }).then(function () { S.logo = ''; paintLogo(); preview(); setMsg('logoMsg', 'Logo removed.', true); }).catch(function (e) { setMsg('logoMsg', e.message); }); },
    clearStart: function () { $('startAt').value = ''; schedSummary(); },
    addSkip: function () { var v = $('skipAdd').value; if (!v) return; S.skip = S.skip || []; if (S.skip.indexOf(v) < 0) S.skip.push(v); $('skipAdd').value = ''; drawSkip(); schedSummary(); },
    copyCode: function () { copyText(window.CAMPAIGN_GS || '', 'Apps Script code copied.'); }, toggleCode: toggleCode,
    scan: scan, download: download, addToCampaign: addToCampaign, page: function (d) { S.page = Math.max(0, S.page + d); renderClean(); },
    addStep: addStep, saveCfg: function (t, m) { return saveCfg(t, m).catch(function () {}); }, test: test, health: health,
    refresh: refresh, ctl: ctl, sendNow: sendNow, bulk: bulk, blockAdd: blockAdd,
    ctPage: function (d) { var o = S.ct.offset + d * CT_PAGE; if (o < 0 || o >= S.ct.total) return; S.ct.offset = o; loadContacts(); },
    searchSoon: function () { clearTimeout(S.searchT); S.searchT = setTimeout(function () { S.ct.q = $('qSearch').value.trim(); S.ct.offset = 0; loadContacts(); }, 350); },
    _test: { parseCSV: parseCSV, toItems: toItems, clean: clean, items: function () { return S.items; } }
  };

  document.querySelectorAll('#senderPick .pick').forEach(function (b) { b.addEventListener('click', function () { setSender(b.getAttribute('data-s')); }); });
  document.querySelectorAll('.nav-btn[data-v]').forEach(function (b) { b.addEventListener('click', function () { show(b.getAttribute('data-v')); }); });
  var drop = $('drop'), file = $('file');
  file.addEventListener('change', function () { if (file.files[0]) { drop.querySelector('b').textContent = file.files[0].name; drop.querySelector('span').textContent = 'Ready. Press Scan & clean.'; } });
  ['dragover', 'dragenter'].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.add('over'); }); });
  ['dragleave', 'drop'].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.remove('over'); }); });
  drop.addEventListener('drop', function (e) { if (e.dataTransfer.files[0]) { file.files = e.dataTransfer.files; file.dispatchEvent(new Event('change')); } });
  ['limit', 'rampStart', 'rampStep', 'ramp'].forEach(function (id) { $(id).addEventListener('input', rampHint); $(id).addEventListener('change', rampHint); });
  ['address', 'unsubText', 'sigName', 'sigTitle', 'sigCompany', 'sigPhone', 'sigWa', 'sigSite', 'sigLogo'].forEach(function (id) { $(id).addEventListener('input', preview); });
  $('logoFile').addEventListener('change', function () { uploadLogo(this.files[0]); });
  ['sigCompany', 'sigName'].forEach(function (id) { $(id).addEventListener('input', paintLogo); });
  $('sigOn').addEventListener('change', function () { this.closest('.sig-box').classList.toggle('off', !this.checked); preview(); });

  $('cUrl').value = S.url; $('cKey').value = S.key || randomKey(); if ($('cBox')) { $('cBox').value = S.box || ''; $('cBox').disabled = !!S.url; }
  if (!S.url) { var known = CL.list().filter(function (c) { return c.key; })[0] || null; try { var hk = JSON.parse(LS.get('dl_cmp_lastkey') || 'null'); if (!known && hk) known = { key: hk }; } catch (e) {} if (known && known.key) $('cKey').value = known.key; }
  if (!S.url) { try { var pf = JSON.parse(LS.get('dl_cmp_prefill') || 'null'); LS.del('dl_cmp_prefill'); if (pf && pf.url) { $('cUrl').value = pf.url; $('cKey').value = pf.key || ''; setTimeout(function () { setMsg('cMsg', 'Same sheet, same link: type the new mailbox below and press Connect. It gets its own tabs in your sheet.', true); if ($('cBox')) $('cBox').focus(); }, 0); } } catch (e) {} }
  renderCmpSel();
  (function () { var t; var go = function () { clearTimeout(t); t = setTimeout(function () { detectMailbox(($('mbEmail').value || '').trim()); }, 450); }; $('mbEmail').addEventListener('input', go); ['mbSH', 'mbSP', 'mbIH', 'mbIP'].forEach(function (i) { $(i).addEventListener('input', makeCode); }); })();
  $('cmpSel').addEventListener('change', function () { pickCampaign(this.value); });
  if ($('sendAs')) $('sendAs').addEventListener('change', function () { var v = this.value; S.cfg.sendAs = v; saveCfg(v ? 'Saved: emails go out as ' + v + ' (sent by Google, your computer can be off).' : 'Saved: emails go out as the Gmail itself.', 'cMsg').catch(function () {}); });
  try { var sv = sessionStorage.getItem('dl_cmp_view'); if (sv) { sessionStorage.removeItem('dl_cmp_view'); setTimeout(function () { show(sv); }, 0); } } catch (e) {}
  var sel = $('tz'); TZ.forEach(function (t) { var o = document.createElement('option'); o.value = t[0]; o.textContent = t[1]; sel.appendChild(o); });
  fillForms(); wireSched();
  if (S.url && S.key) S.boot = sha256(S.key).then(function (h) {
    S.kh = h;
    var c = readCache();
    if (c) { setConnected(c); pill('Updating...', 'gray'); if ($('v-run').classList.contains('on')) { renderRun(c); if (c.page) renderContacts(c.page); loadLog(); } }
    S.bootLoad = loadState(true).then(function (st) { if (st) { pill('Connected', 'green'); if ($('v-run').classList.contains('on')) renderRun(st); } return st; });
    return S.bootLoad;
  }).catch(function () {});
})();
