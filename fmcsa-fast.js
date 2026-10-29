/* Dispatch Link | "Turbo Scan" scan source (shown to users as Turbo Scan).
   Everything comes from FMCSA's own open data (data.transportation.gov), asked for many MC at a time:
     - Company Census (az4n-8mr2): USDOT, name, phone, email, address, owner, trucks, cargo, USDOT registration date
     - Authority:  Motus Carrier (inys-ebih, changes since the MOTUS switch in May 2026) over Carrier (6eyk-hxee, the older file)
     - Insurance:  Motus Insur  (x96h-evps) over ActPendInsur (qh9u-swkp)          -> BI&PD effective date = MC age
     - Granted:    Motus AuthHist (yu5v-wbh6) over AuthHist (9mw4-x3tu)             -> date the authority was granted
   Two ways to scan (one or both):
     - MC range:  every MC between start and end (8 requests per 1,000 MC)
     - Date:      every carrier whose authority was granted / USDOT was registered / insurance started between two dates.
                  New MC numbers since May 2026 are 8 digits and not in order, so the date is the way to find new carriers.
   A carrier missing from the authority files is checked on CarrierChk / MOTUS (as before).
   Load AFTER scraper-core.js and crm-lookup.js. */
(function () {
  'use strict';
  var G = function (n) { try { return (0, eval)(n); } catch (e) { return undefined; } }; // the scanner's own globals (let/const too)
  var $ = function (id) { return document.getElementById(id); };
  var API = 'https://data.transportation.gov/resource/';
  var SRC = 'fast', LABEL = 'Turbo Scan';
  var SOURCES = G('SOURCES');
  var origPS = window.processSingleMCWithDetailedError, origVia = window.processViaSites, origStart = window.startScraping;
  if (!SOURCES || typeof window.setDataSource !== 'function' || typeof origPS !== 'function' || typeof origVia !== 'function' || typeof origStart !== 'function') return;
  SOURCES[SRC] = LABEL;
  var MAX_DAYS = 31, MAX_LIST = 4000, MOTUS_SINCE = '20260515'; // the older files stopped in May 2026

  /* ---------------- the tab and the date box ---------------- */
  var wanted = ''; try { wanted = localStorage.getItem('dl_source') || ''; } catch (e) {}
  var TYPES = [['auth', 'Authority granted'], ['reg', 'USDOT registered'], ['ins', 'Insurance started']];
  function addUi() {
    var tabs = $('sourceTabs');
    if (tabs && !tabs.querySelector('[data-src="' + SRC + '"]')) {
      var b = document.createElement('button');
      b.type = 'button'; b.setAttribute('data-src', SRC); b.textContent = LABEL;
      b.title = 'Fastest: a whole MC range, or every carrier of a date range, at once';
      b.onclick = function () { window.setDataSource(SRC); };
      tabs.insertBefore(b, tabs.firstChild);
    }
    var anchor = $('mcRangeBox') || ($('startMc') && $('startMc').closest('.grid, .row, div'));
    if (anchor && !$('turboDateBox')) {
      var box = document.createElement('div'); box.id = 'turboDateBox'; box.hidden = true;
      var today = new Date().toISOString().slice(0, 10);
      box.innerHTML = '<div class="tdb-row">' +
        '<label class="tdb-f"><span>Date type</span><select id="turboDateType">' + TYPES.map(function (t) { return '<option value="' + t[0] + '">' + t[1] + '</option>'; }).join('') + '</select></label>' +
        '<label class="tdb-f"><span>From date</span><input type="date" id="turboFrom" max="' + today + '"></label>' +
        '<label class="tdb-f"><span>To date</span><input type="date" id="turboTo" max="' + today + '"></label>' +
        '<button type="button" class="tdb-clear" id="turboClear">Clear dates</button></div>' +
        '<p class="tdb-hint">Dates only (MC range empty): every carrier of those dates. MC range only: as before. Both: only the MCs of the range that match the dates. Up to ' + MAX_DAYS + ' days.</p>';
      anchor.parentNode.insertBefore(box, anchor.nextSibling);
      $('turboClear').onclick = function () { $('turboFrom').value = ''; $('turboTo').value = ''; };
      $('turboFrom').addEventListener('change', function () { if ($('turboFrom').value && !$('turboTo').value) $('turboTo').value = $('turboFrom').value; });
    }
    paintBox();
    if (wanted === SRC) setTimeout(function () { window.setDataSource(SRC, true); }, 0); // the scanner reset it before this tab existed
  }
  function paintBox() { var b = $('turboDateBox'); if (b) b.hidden = G('dataSource') !== SRC; }
  var origSetSrc = window.setDataSource;
  window.setDataSource = function () { var r = origSetSrc.apply(this, arguments); paintBox(); return r; };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { setTimeout(addUi, 0); }); else setTimeout(addUi, 0);
  var css = document.createElement('style');
  css.textContent = '#sourceTabs.src-tabs{max-width:820px}' +
    '#turboDateBox{margin:14px 0 4px}#turboDateBox[hidden]{display:none}' +
    '.tdb-row{display:flex;flex-wrap:wrap;gap:12px;align-items:flex-end}' +
    '.tdb-f{display:flex;flex-direction:column;gap:6px;flex:1 1 180px;min-width:150px}' +
    '.tdb-f span{font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--mut)}' +
    '.tdb-f input,.tdb-f select{height:44px;padding:0 12px;border-radius:10px;border:1px solid var(--line);background:var(--surface);color:var(--ink,inherit);font:inherit}' +
    '.tdb-clear{height:44px;padding:0 14px;border-radius:10px;border:1px solid var(--line);background:transparent;color:var(--mut);cursor:pointer;font:inherit}' +
    '.tdb-hint{margin:8px 0 0;font-size:12px;color:var(--mut)}';
  document.head.appendChild(css);

  /* ---------------- talking to data.transportation.gov ---------------- */
  function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function getJson(id, where, tries) {
    tries = tries || 0;
    return fetch(API + id + '.json?$where=' + encodeURIComponent(where) + '&$limit=50000', { cache: 'no-store' })
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .catch(function (e) { if (tries >= 2) throw e; return wait([3000, 8000][tries]).then(function () { return getJson(id, where, tries + 1); }); });
  }
  function usDate(s) { var m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(String(s || '')); return m ? m[3] + ('0' + m[1]).slice(-2) + ('0' + m[2]).slice(-2) : ''; } // -> YYYYMMDD
  function ymd(s) { var m = /^(\d{4})(\d{2})(\d{2})/.exec(String(s || '')); return m ? m[0] : ''; }
  function iso(d8) { return d8 ? d8.slice(0, 4) + '-' + d8.slice(4, 6) + '-' + d8.slice(6, 8) : ''; }
  function dockNo(s) { var m = /^MC(\d+)$/i.exec(String(s || '').trim()); return m ? parseInt(m[1], 10) : 0; }
  function q(s) { return "'" + String(s).replace(/'/g, "''") + "'"; }

  /* everything known about one MC, from both the MOTUS files and the older files */
  var D = { census: {}, mLic: {}, oLic: {}, mIns: {}, oIns: {}, mAuth: {}, oAuth: {} }, LOADED = {};
  function put(map, m, r) { (map[m] = map[m] || []).push(r); }
  function fill(sets, inRange) { // sets: [census1, census2, mLic, oLic, mIns, oIns, mAuth, oAuth] rows
    sets[0].forEach(function (c) { var m = parseInt(c.docket1, 10); if (inRange(m)) put(D.census, m, c); });
    sets[1].forEach(function (c) { var m = parseInt(c.docket2, 10); if (inRange(m)) put(D.census, m, c); });
    [['mLic', 2], ['oLic', 3], ['mIns', 4], ['oIns', 5], ['mAuth', 6], ['oAuth', 7]].forEach(function (k) {
      sets[k[1]].forEach(function (r) { var m = dockNo(r.docket_number); if (inRange(m)) put(D[k[0]], m, r); });
    });
  }
  function fetchSets(w) { // w(field, kind) -> where clause
    return Promise.all([
      getJson('az4n-8mr2', "docket1prefix='MC' AND " + w('docket1', 'num')),
      getJson('az4n-8mr2', "docket2prefix='MC' AND " + w('docket2', 'num')),
      getJson('inys-ebih', w('docket_number', 'mc')),
      getJson('6eyk-hxee', w('docket_number', 'mc')),
      getJson('x96h-evps', w('docket_number', 'mc')),
      getJson('qh9u-swkp', w('docket_number', 'mc')),
      getJson('yu5v-wbh6', w('docket_number', 'mc')),
      getJson('9mw4-x3tu', w('docket_number', 'mc'))
    ]);
  }
  function primeCensusCache(mcs) {
    var cache = G('_censusMcCache'); if (!cache || typeof cache !== 'object') return;
    mcs.forEach(function (m) { if (!(m in cache)) { var l = D.census[m] || []; cache[m] = l.filter(function (x) { return x.status_code === 'A'; })[0] || l[0] || {}; } });
  }
  var BLOCKS = {};
  function loadBlock(mc) { // 1,000 MC at a time (whole thousands never mix numbers of different length)
    var a = Math.floor(mc / 1000) * 1000, b = a + 999, key = String(a);
    if (BLOCKS[key]) return BLOCKS[key];
    var p = fetchSets(function (f, kind) { return kind === 'num' ? f + " between '" + a + "' and '" + b + "'" : f + " between 'MC" + a + "' and 'MC" + b + "'"; })
      .then(function (sets) {
        fill(sets, function (m) { return m >= a && m <= b; });
        var all = []; for (var m = a; m <= b; m++) { LOADED[m] = 1; all.push(m); }
        primeCensusCache(all); return true;
      }, function () { delete BLOCKS[key]; return false; });
    BLOCKS[key] = p; return p;
  }
  function loadList(mcs, onPart) { // a list of MC numbers (date scan), 250 at a time, 3 parts in parallel
    var todo = mcs.filter(function (m) { return !LOADED[m]; }), parts = [];
    for (var i = 0; i < todo.length; i += 250) parts.push(todo.slice(i, i + 250));
    var done = 0, idx = 0;
    function worker() {
      if (idx >= parts.length) return Promise.resolve();
      var part = parts[idx++], set = {}; part.forEach(function (m) { set[m] = 1; });
      return fetchSets(function (f, kind) { return f + ' in(' + part.map(function (m) { return q(kind === 'num' ? String(m) : 'MC' + m); }).join(',') + ')'; })
        .then(function (sets) { fill(sets, function (m) { return !!set[m]; }); part.forEach(function (m) { LOADED[m] = 1; }); primeCensusCache(part); done++; if (onPart) onPart(done, parts.length); })
        .then(worker);
    }
    return Promise.all([worker(), worker(), worker()]);
  }

  /* ---------------- what the files say about one MC ---------------- */
  function authState(n) { // 'yes' | 'no' | '' (not in either file)
    var m = D.mLic[n];
    if (m && m.length) return m.some(function (r) { return /^active$/i.test(r.op_auth_status) && !/^broker/i.test(r.op_auth_type || ''); }) ? 'yes' : 'no';
    var o = (D.oLic[n] || [])[0];
    if (o) return o.common_stat === 'A' || o.contract_stat === 'A' ? 'yes' : 'no';
    return '';
  }
  function insDate(n) { // BI&PD insurance in force: the earliest effective date of the current policies
    var m = (D.mIns[n] || []).filter(function (r) { return r.ins_type_code === '1' || /91/.test(r.ins_form_code || ''); }).map(function (r) { return ymd(r.effective_date); }).filter(Boolean).sort();
    if (m.length) return m[0];
    var today = new Date().toISOString().slice(0, 10).replace(/-/g, ''), cur = [], all = [];
    (D.oIns[n] || []).forEach(function (r) {
      if (!/BIPD/i.test(r.mod_col_1 || 'BIPD')) return;
      var eff = usDate(r.effective_date), cancel = usDate(r.cancl_effective_date); if (!eff) return;
      all.push(eff); if (!cancel || cancel > today) cur.push(eff);
    });
    cur.sort(); all.sort();
    return cur[0] || all[all.length - 1] || '';
  }
  function grantDate(n) { // the latest time the authority was granted
    var m = (D.mAuth[n] || []).filter(function (r) { return /GRANT/i.test(r.reason || ''); }).map(function (r) { return ymd(r.status_change_date); }).filter(Boolean).sort();
    if (m.length) return m[m.length - 1];
    var o = (D.oAuth[n] || []).filter(function (r) { return /GRANT/i.test(r.original_action_desc || ''); }).map(function (r) { return usDate(r.orig_served_date); }).filter(Boolean).sort();
    return o.length ? o[o.length - 1] : '';
  }
  function regDate(c) { return ymd(c && c.add_date); }
  function phoneOf(s) { var d = String(s || '').replace(/\D/g, ''); return d.length === 10 ? '(' + d.slice(0, 3) + ') ' + d.slice(3, 6) + '-' + d.slice(6) : (d || ''); }

  /* ---------------- one MC (the scanner calls this for every MC) ---------------- */
  var DATE = null, LISTMODE = null; // DATE = {type, from, to} (YYYYMMDD) while a date scan / date filter runs
  async function fastOne(mc, el) {
    var n = parseInt(mc, 10);
    if (!LOADED[n]) { var ok = await loadBlock(n); if (!ok) return { status: 'error', message: 'Turbo Scan data is busy (MC ' + mc + ')' }; }
    if (LISTMODE) { LISTMODE.i++; listStatus(); }
    var list = D.census[n] || [], c = list.filter(function (x) { return x.status_code === 'A'; })[0] || list[0] || null;
    var lic = (D.mLic[n] || [])[0] || (D.oLic[n] || [])[0] || null, auth = authState(n);
    if (!(c && c.dot_number) && !lic) return { status: 'not_found' };
    if (c && c.dot_number && c.carship && !/C/.test(c.carship)) return { status: 'filtered_out' };
    if (auth !== 'yes') {
      // No MOTUS record and the older file (frozen in May 2026) says "no authority" or has nothing: the authority may have
      // been granted since. Such MC are checked quietly after the list is shown and added to it when they are active.
      if (!(D.mLic[n] && D.mLic[n].length) && c && c.dot_number && c.status_code !== 'I' && dateOkLocal(c)) BG.add(mc);
      return { status: 'filtered_out' };
    }
    if (DATE) { var dd = DATE.type === 'auth' ? grantDate(n) : DATE.type === 'reg' ? regDate(c) : insDate(n); if (!dd || dd < DATE.from || dd > DATE.to) return { status: 'filtered_out' }; }
    var rec = { owner: '', effDate: '', mc: mc, usdot: 'N/A', name: 'N/A', entityType: 'CARRIER', status: 'N/A', phone: 'N/A', address: 'N/A', email: 'N/A',
      powerUnits: 'N/A', vehicleType: 'N/A', carrierDetails: '', remarks: '', followUpDate: '', followUpTime: '', sharedBy: G('dispatcherNickname'), src: SRC };
    var toRec = G('_censusToRec');
    if (c && c.dot_number && typeof toRec === 'function') toRec(c, rec);
    if (lic) {
      var dot = lic.usdot_number || lic.dot_number;
      if (rec.usdot === 'N/A' && dot) rec.usdot = String(parseInt(dot, 10));
      if (rec.name === 'N/A' && lic.legal_name) rec.name = lic.legal_name;
      if (rec.phone === 'N/A' && phoneOf(lic.bus_telno)) rec.phone = phoneOf(lic.bus_telno);
      if (rec.address === 'N/A' && (lic.bus_street_po || lic.bus_city)) rec.address = [[lic.bus_street_po, lic.bus_city].filter(Boolean).join(' '), [lic.bus_state_code, lic.bus_zip_code].filter(Boolean).join(' ')].filter(Boolean).join(', ');
    }
    if (/BROKER/.test(rec.entityType) && !/CARRIER/.test(rec.entityType)) rec.entityType = 'CARRIER/BROKER';
    rec.status = 'AUTHORIZED';
    rec.effDate = iso(insDate(n));
    if (rec.effDate) { var ac = G('_mcAgeCache'); if (ac) ac[String(mc)] = rec.effDate; }
    rec.decidedBy = LABEL;
    if (LISTMODE) LISTMODE.found++;
    return { status: 'success', data: rec };
  }
  function dateOkLocal(c) { // can the date filter be checked without the MOTUS/CarrierChk page?
    if (!DATE) return true;
    if (DATE.type === 'reg') { var r = regDate(c); return !!r && r >= DATE.from && r <= DATE.to; }
    return !!LISTMODE; // a date scan list already has the right dates
  }

  /* ---------------- quiet check after the list is shown ----------------
     MC the files are not sure about are checked one by one on CarrierChk / MOTUS (the normal way), without any message.
     Active ones are added to the table and to the History sheet like any other lead. Stops when another sheet is opened. */
  var BG = { q: [], seen: {}, tries: {}, running: false, sheet: null, followed: null,
    add: function (mc) { var k = String(mc); if (this.seen[k]) return; this.seen[k] = 1; this.q.push(mc); },
    reset: function () { this.q = []; this.seen = {}; this.tries = {}; } };
  function bgAddRow(data) {
    var sd = G('scrapedData'), tb = $('resultsTable'), rowHTML = G('rowHTML');
    if (!Array.isArray(sd) || !tb || typeof rowHTML !== 'function') return;
    if (sd.some(function (x) { return String(x.mc) === String(data.mc); })) return;
    sd.push(data);
    var call = function (n) { var f = G(n); if (typeof f === 'function') try { f(); } catch (e) {} };
    call('updateCategoryCheckboxes');
    var empty = tb.querySelector('.empty'); if (empty && empty.closest('tr')) empty.closest('tr').remove();
    tb.insertAdjacentHTML('beforeend', rowHTML(data, sd.length - 1, !!(BG.followed && BG.followed.has(data.mc))));
    call('populateStateDropdown'); call('populateVehicleTypeCheckboxes'); call('applyAdvancedFilters');
    if (!data.effDate) { var qa = G('_queueAge'); if (typeof qa === 'function') try { qa(data); } catch (e) {} }
    var ss = G('_saveSoon'); if (typeof ss === 'function') try { ss(); } catch (e) {}
  }
  async function bgRun() {
    if (BG.running || !BG.q.length) return;
    BG.running = true; BG.sheet = G('currentHistoryId');
    try {
      if (!BG.followed) BG.followed = await new Promise(function (res) {
        var f = G('getAllAppDataFromIndexedDB');
        try { f('followups', function (l) { res(new Set((l || []).map(function (x) { return x.mc; }))); }); } catch (e) { res(new Set()); }
      });
      while (BG.q.length) {
        if (G('currentHistoryId') !== BG.sheet) { BG.reset(); break; } // another sheet was opened or a new scan started
        if (G('scraping')) { await wait(3000); continue; }
        var mc = BG.q.shift(), r = null;
        try { r = await origVia(mc, null); } catch (e) { r = null; }
        if (G('currentHistoryId') !== BG.sheet) { BG.reset(); break; }
        if (r && r.status === 'success' && r.data) bgAddRow(r.data);
        else if (!r || r.status === 'error') { var t = BG.tries[mc] || 0; if (t < 3) { BG.tries[mc] = t + 1; BG.q.push(mc); await wait(15000); } }
        await wait(400);
      }
    } finally { BG.running = false; }
  }

  window.processSingleMCWithDetailedError = async function (mc, el) {
    if (G('dataSource') !== SRC) return origPS.apply(this, arguments);
    var gate = G('_licenseGateCached');
    if (typeof gate === 'function') { var g = await gate(el); if (g) return g; } // licence / tab limit check stays the same
    return fastOne(mc, el);
  };

  /* ---------------- scan by date ---------------- */
  function readDates() {
    var f = ($('turboFrom') || {}).value || '', t = ($('turboTo') || {}).value || '', type = ($('turboDateType') || {}).value || 'auth';
    if (!f && !t) return null;
    if (!f) f = t; if (!t) t = f;
    if (f > t) { var x = f; f = t; t = x; }
    return { type: type, from: f.replace(/-/g, ''), to: t.replace(/-/g, ''), fromIso: f, toIso: t };
  }
  function daysBetween(a, b) { return Math.round((Date.parse(iso(b)) - Date.parse(iso(a))) / 864e5) + 1; }
  function usDays(from, to) { // 'MM/DD/YYYY' for every day (for the older files, which keep dates that way)
    var out = [], d = new Date(iso(from) + 'T12:00:00Z'), end = new Date(iso(to) + 'T12:00:00Z');
    while (d <= end) { out.push(('0' + (d.getUTCMonth() + 1)).slice(-2) + '/' + ('0' + d.getUTCDate()).slice(-2) + '/' + d.getUTCFullYear()); d.setUTCDate(d.getUTCDate() + 1); }
    return out;
  }
  function findByDate(d) { // -> sorted MC numbers whose chosen date is in the range
    var jobs = [], mcs = {};
    var addDock = function (rows) { rows.forEach(function (r) { var m = dockNo(r.docket_number); if (m) mcs[m] = 1; }); };
    var oldTo = d.to < MOTUS_SINCE ? d.to : MOTUS_SINCE, oldDays = d.from <= MOTUS_SINCE ? usDays(d.from, oldTo).map(q).join(',') : '';
    var between = function (f) { return f + " between '" + d.from + "' and '" + d.to + "'"; };
    if (d.type === 'reg') jobs.push(getJson('az4n-8mr2', "docket1prefix='MC' AND " + between('add_date')).then(function (rows) { rows.forEach(function (c) { var m = parseInt(c.docket1, 10); if (m) mcs[m] = 1; }); }));
    if (d.type === 'auth') {
      jobs.push(getJson('yu5v-wbh6', "docket_number like 'MC%' AND upper(reason) like '%GRANT%' AND " + between('status_change_date')).then(addDock));
      if (oldDays) jobs.push(getJson('9mw4-x3tu', "docket_number like 'MC%' AND upper(original_action_desc) like '%GRANT%' AND orig_served_date in(" + oldDays + ')').then(addDock));
    }
    if (d.type === 'ins') {
      jobs.push(getJson('x96h-evps', "docket_number like 'MC%' AND " + between('effective_date')).then(addDock));
      if (oldDays) jobs.push(getJson('qh9u-swkp', "docket_number like 'MC%' AND effective_date in(" + oldDays + ')').then(addDock));
    }
    return Promise.all(jobs).then(function () { return Object.keys(mcs).map(Number).filter(function (m) { return m > 0; }).sort(function (a, b) { return a - b; }); });
  }
  function typeName(t) { return (TYPES.filter(function (x) { return x[0] === t; })[0] || ['', ''])[1]; }
  function nice(isoDate) { var p = isoDate.split('-'); return p[1] + '/' + p[2] + '/' + p[0]; }
  function listStatus() {
    if (!LISTMODE || (LISTMODE.i % 10 && LISTMODE.i !== LISTMODE.n)) return;
    origStatus('Turbo Scan by date &nbsp;·&nbsp; ' + LISTMODE.i + '/' + LISTMODE.n + ' carriers checked &nbsp;·&nbsp; <b>' + ((G('scrapedData') || []).length) + '</b> leads found', 'running');
    if (typeof window.setProgress === 'function') try { window.setProgress(LISTMODE.i / LISTMODE.n * 100); } catch (e) {}
  }
  function renameSheet(label) { // History shows the dates instead of an MC range (no "-" so a resume does not read it as a range)
    window.activeScrapeRange = label;
    var db = G('db'), id = G('currentHistoryId'); if (!db || id == null) return;
    try {
      var st = db.transaction('history', 'readwrite').objectStore('history'), rq = st.get(id);
      rq.onsuccess = function () { var it = rq.result; if (it) { it.range = label; st.put(it); } };
    } catch (e) {}
    var k = $('kpiRange'); if (k) k.textContent = label.replace(/^Date /, '');
  }
  window.startScraping = async function (a, b) {
    if (G('dataSource') !== SRC || (a != null) || (b != null)) return origStart.apply(this, arguments);
    if (G('scraping')) return;
    BG.reset();
    var d = readDates();
    if (!d) { try { return await origStart.apply(this, arguments); } finally { setTimeout(bgRun, 500); } } // MC range only
    if (daysBetween(d.from, d.to) > MAX_DAYS) { origStatus('Please pick up to ' + MAX_DAYS + ' days at a time.', 'error'); return; }
    var sEl = $('startMc'), eEl = $('endMc'), s0 = sEl ? sEl.value.trim() : '', e0 = eEl ? eEl.value.trim() : '';
    if (s0 && e0) { DATE = d; try { return await origStart.apply(this, arguments); } finally { DATE = null; setTimeout(bgRun, 500); } } // MC range AND dates
    if (s0 || e0) { origStatus('Fill both MC numbers, or leave both empty to scan by date only.', 'error'); return; }
    var label = 'Date (' + typeName(d.type) + ') ' + nice(d.fromIso) + ' to ' + nice(d.toIso);
    origStatus('Turbo Scan: finding every carrier with ' + typeName(d.type).toLowerCase() + ' from ' + nice(d.fromIso) + ' to ' + nice(d.toIso) + '…', 'running');
    var list;
    try { list = await findByDate(d); } catch (err) { origStatus('Turbo Scan data is not answering right now. Please try again in a minute.', 'error'); return; }
    if (!list.length) { origStatus('No carriers found for these dates. (The newest day may come one day later.)', 'done'); return; }
    if (list.length > MAX_LIST) { origStatus(list.length + ' carriers have these dates. Please pick fewer days (up to about ' + MAX_LIST + ' carriers at a time).', 'error'); return; }
    origStatus('Turbo Scan: ' + list.length + ' carriers found for these dates, loading their details…', 'running');
    try { await loadList(list, function (i, n) { origStatus('Turbo Scan: loading details ' + Math.round(i / n * 100) + '% (' + list.length + ' carriers)…', 'running'); }); }
    catch (err) { origStatus('Turbo Scan data is not answering right now. Please try again in a minute.', 'error'); return; }
    var last = list[list.length - 1];
    DATE = d; LISTMODE = { i: 0, n: list.length, found: 0 };
    window._resumeFailedMcs = list.slice(0, -1); // the scanner goes through this list first, then the "range" of the last MC alone
    sEl.value = last; eEl.value = last;
    var started = origStart.call(this);
    setTimeout(function () { renameSheet(label); }, 800);
    try { await started; } finally {
      renameSheet(label);
      sEl.value = ''; eEl.value = ''; try { sEl.dispatchEvent(new Event('input')); } catch (e) {}
      DATE = null; LISTMODE = null;
      setTimeout(bgRun, 500);
    }
  };

  /* ---------------- status line: say "Turbo Scan" instead of the data source name ---------------- */
  var origStatus = window.setStatus;
  window.setStatus = function (html) {
    var args = Array.prototype.slice.call(arguments);
    if (G('dataSource') === SRC && typeof html === 'string') {
      var plain = html.replace(/<[^>]+>/g, '');
      if (LISTMODE && /^Scanning MC|^Connecting to|^Loading FMCSA/.test(plain)) return; // the date scan shows its own progress
      if (/not answering|blocking|is busy|trying again|try again|Waiting \d+\s*s|did not answer|HTTP \d{3}/i.test(plain) && !/^(Completed|Scan paused)/.test(plain)) return; // no "blocked / not answering" lines in Turbo Scan
      args[0] = html.replace(/FMCSA open data/g, 'Turbo Scan data').replace(/FMCSA SAFER/g, 'the backup check');
    }
    return origStatus.apply(this, args);
  };

  var origNote = window.showPremiumNotification;
  if (typeof origNote === 'function') window.showPremiumNotification = function (msg) {
    if (BG.running && !G('scraping')) return; // the quiet check never shows messages
    if (G('dataSource') === SRC && /block|bot check|not answering|busy|VPN|403|429/i.test(String(msg || ''))) return;
    return origNote.apply(this, arguments);
  };

  /* ---------------- no 0.3 s pause between MC in this mode: the data is already here ---------------- */
  var ST = window.setTimeout;
  window.setTimeout = function (fn, ms) {
    if (ms === 300 && G('dataSource') === SRC && G('scraping')) ms = 0;
    var args = Array.prototype.slice.call(arguments); args[1] = ms;
    return ST.apply(window, args);
  };
})();
