/* Dispatch Link | Lead processor: one search box for everything.
   Type an MC, USDOT, phone, email or company name.
   1) It is looked for in the leads already in the table (phone works with or without dashes, MC/DOT with or without the prefix).
   2) If it is not there, the carrier is looked up online (FMCSA data, then CarrierChk / MOTUS / BrokerSnapshot for the authority)
      and shown right in the table as normal lead rows (Follow works as usual). Rows you do not follow leave the table
      when the search changes.
   Load this AFTER scraper-core.js. */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var digits = function (s) { return String(s || '').replace(/\D/g, ''); };
  var G = function (name) { try { return (0, eval)(name); } catch (e) { return undefined; } }; // reads the scanner's own globals (let/const too)
  var CENSUS = 'https://data.transportation.gov/resource/az4n-8mr2.json';

  /* ---------------- 1. smarter search inside the table ---------------- */
  function clean(q) { return String(q || '').trim().toLowerCase(); }
  function kind(q) {
    var t = clean(q), d = digits(t);
    if (/@/.test(t)) return { k: 'email', v: t };
    if (/^(mc|mx|ff)[\s#:-]*\d+$/.test(t)) return { k: 'mc', v: String(parseInt(d, 10)) };
    if (/^(us)?dot[\s#:-]*\d+$/.test(t)) return { k: 'dot', v: String(parseInt(d, 10)) };
    if (d.length >= 4 && /^[\d\s()+.-]+$/.test(t)) return { k: 'num', v: d.length === 11 && d[0] === '1' ? d.slice(1) : d };
    return { k: 'text', v: t };
  }
  function recMatches(r, q) {
    if (!r) return false;
    var x = kind(q), hay = function (f) { return String(r[f] == null ? '' : r[f]).toLowerCase(); };
    if (x.k === 'email') return hay('email').indexOf(x.v) >= 0;
    if (x.k === 'mc') return digits(r.mc) === x.v;
    if (x.k === 'dot') return digits(r.usdot) === x.v;
    if (x.k === 'num') return digits(r.mc).indexOf(x.v) >= 0 || digits(r.usdot).indexOf(x.v) >= 0 || digits(r.phone).indexOf(x.v) >= 0;
    return ['name', 'owner', 'email', 'phone', 'mc', 'usdot', 'address'].some(function (f) { return hay(f).indexOf(x.v) >= 0; });
  }

  var orig = window.applyAdvancedFilters;
  if (typeof orig !== 'function') return;
  var LASTQ = '', ONQ = '', EMPTY = ''; // ONQ: the search the online rows belong to
  function isOnline(r) { return r && r.__dlxOnline; }
  window.applyAdvancedFilters = function () {
    var inp = $('universalSearchInput'), q = inp ? inp.value : '';
    if (clean(q) !== LASTQ) LASTQ = clean(q);
    if ((G('scrapedData') || []).some(function (r) { return isOnline(r) && r.__dlxOnline !== LASTQ; })) dropOnline(); // rows from an older search go
    if (!clean(q)) { var r0 = orig.apply(this, arguments); msg(''); stop(); return r0; }
    inp.value = ''; // let the page apply state / category / vehicle / power filters, then add our own search on top
    var r;
    try { r = orig.apply(this, arguments); } finally { inp.value = q; }
    var data = G('scrapedData') || [], shown = 0, online = 0;
    document.querySelectorAll('#resultsTable tr').forEach(function (tr, i) {
      var rec = data[i];
      if (isOnline(rec)) { tr.style.display = ''; online++; return; } // results found online always show
      if (tr.style.display === 'none') return;
      var ok = recMatches(rec, q);
      tr.style.display = ok ? '' : 'none';
      if (ok && tr.cells.length > 2) shown++;
    });
    try { if (typeof updateVisibleRecordCount === 'function') updateVisibleRecordCount(); } catch (e) {}
    if (shown && !online) { msg(''); stop(); } else if (!shown && !online) soon(q);
    return r;
  };

  /* ---------------- 2. not in the table: look it up online, show the result as normal rows ---------------- */
  var T = null, SEQ = 0;
  function stop() { clearTimeout(T); SEQ++; }
  function soon(q, now) {
    clearTimeout(T);
    var x = kind(q);
    if ((x.k === 'text' && x.v.length < 3) || (x.k === 'num' && x.v.length < 4)) { msg(''); return; }
    T = setTimeout(function () { lookup(q); }, now ? 0 : 800);
  }
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && e.target && e.target.id === 'universalSearchInput') {
      var q = e.target.value, data = G('scrapedData') || [];
      if (clean(q) && !data.some(function (r) { return recMatches(r, q); })) soon(q, true);
    }
  });

  function msg(html, spin) { // one slim line under the table rows (outside #resultsTable, so row numbers stay right)
    var tb = $('resultsTable'); if (!tb) return;
    var m = $('dlxOnlineMsg');
    if (!html) { if (m) m.hidden = true; return; }
    if (!m) { m = document.createElement('tbody'); m.id = 'dlxOnlineMsg'; tb.parentNode.insertBefore(m, tb.nextSibling); }
    var cols = (tb.closest('table').querySelector('thead tr') || {}).children; cols = cols ? cols.length : 9;
    m.hidden = false;
    m.innerHTML = '<tr class="dlx-msg"><td colspan="' + cols + '">' + (spin ? '<span class="dlx-spin"></span>' : '<span class="dlx-dot"></span>') + html + '</td></tr>';
  }

  function dropOnline() { // remove online rows the agent did not follow; followed ones stay as normal leads
    var data = G('scrapedData'), tb = $('resultsTable'), rowHTML = G('rowHTML'); ONQ = '';
    if (!Array.isArray(data) || !tb) return;
    var start = data.length; while (start > 0 && isOnline(data[start - 1])) start--; // online rows are always the last block
    if (start === data.length) { data.forEach(function (r) { if (isOnline(r)) delete r.__dlxOnline; }); if (!data.length && EMPTY && !tb.rows.length) tb.innerHTML = EMPTY; msg(''); return; }
    var kept = [];
    for (var i = start; i < data.length; i++) { var tr = tb.rows[i]; if (tr && tr.classList.contains('is-followed')) kept.push(data[i]); }
    for (var j = data.length - 1; j >= start; j--) { if (tb.rows[j]) tb.rows[j].remove(); }
    data.length = start;
    kept.forEach(function (r) { delete r.__dlxOnline; data.push(r); if (typeof rowHTML === 'function') tb.insertAdjacentHTML('beforeend', rowHTML(r, data.length - 1, true)); });
    data.forEach(function (r) { if (isOnline(r)) delete r.__dlxOnline; });
    if (!data.length && EMPTY && !tb.rows.length) tb.innerHTML = EMPTY;
    if (data.length) EMPTY = '';
    msg('');
  }


  function census(where, limit) {
    var qs = '$where=' + encodeURIComponent(where) + '&$limit=' + (limit || 10) + '&$order=' + encodeURIComponent('status_code ASC');
    var cq = G('_censusQuery');
    if (typeof cq === 'function') return cq(qs).then(function (r) { if (r === null) throw new Error('busy'); return r; });
    return fetch(CENSUS + '?' + qs).then(function (r) { if (r.status === 404) return []; if (!r.ok) throw new Error('busy'); return r.json(); });
  }
  function sq(s) { return String(s).replace(/'/g, "''"); }
  function findRows(q) {
    var x = kind(q);
    if (x.k === 'email') return census("upper(email_address)='" + sq(x.v.toUpperCase()) + "'");
    if (x.k === 'mc') return census("(docket1prefix='MC' AND docket1='" + x.v + "') OR (docket2prefix='MC' AND docket2='" + x.v + "')");
    if (x.k === 'dot') return census("dot_number='" + x.v + "'");
    if (x.k === 'num') {
      var n = String(parseInt(x.v, 10)), w = ["dot_number='" + n + "'", "(docket1prefix='MC' AND docket1='" + n + "')", "(docket2prefix='MC' AND docket2='" + n + "')"];
      if (x.v.length === 10) w.push("phone='" + x.v + "'", "cell_phone='" + x.v + "'");
      return census(w.join(' OR '));
    }
    var u = sq(x.v.toUpperCase());
    return census("upper(legal_name) like '%" + u + "%' OR upper(dba_name) like '%" + u + "%'", 8);
  }
  function mcOf(c) {
    for (var i = 1; i <= 2; i++) if (c['docket' + i + 'prefix'] === 'MC' && c['docket' + i]) return String(parseInt(c['docket' + i], 10));
    return '';
  }

  function lookup(q) {
    var my = ++SEQ;
    msg('Not in your leads · searching…', true);
    findRows(q).then(function (rows) {
      if (my !== SEQ) return;
      rows = (rows || []).filter(function (c) { return c && c.dot_number; });
      var x = kind(q);
      if (x.k === 'num' || x.k === 'mc' || x.k === 'dot') { // a carrier whose own MC / USDOT is the number comes first; old or extra dockets do not
        var n = String(parseInt(x.v, 10)), exact = rows.filter(function (c) {
          return (x.k !== 'dot' && mcOf(c) === n) || (x.k !== 'mc' && String(parseInt(c.dot_number, 10)) === n) || (x.k === 'num' && x.v.length === 10 && (digits(c.phone) === x.v || digits(c.cell_phone) === x.v));
        });
        if (exact.length) rows = exact;
      }
      if (!rows.length) { msg('No carrier found. Check the MC, USDOT, phone or company name.'); return; }
      addRows(rows, q, my);
    }, function () {
      if (my !== SEQ) return;
      msg('Could not search online right now. Press Enter to try again.');
    });
  }

  function baseRec(mc) {
    var nick = G('dispatcherNickname') || '';
    return { owner: '', effDate: '', mc: mc || 'N/A', usdot: 'N/A', name: 'N/A', entityType: 'CARRIER', status: 'N/A', phone: 'N/A', address: 'N/A', email: 'N/A',
      powerUnits: 'N/A', vehicleType: 'N/A', carrierDetails: '', remarks: '', followUpDate: '', followUpTime: '', sharedBy: nick, src: G('dataSource') || '' };
  }
  function order() {
    var s = G('dataSource');
    return s === 'brokersnapshot' ? ['bs', 'motus', 'cc', 'safer'] : s === 'motus' ? ['motus', 'cc', 'safer'] : s === 'fmcsa' ? ['safer', 'cc', 'motus'] : ['cc', 'motus', 'safer'];
  }
  var LABEL = { cc: 'CarrierChk', motus: 'MOTUS', safer: 'FMCSA SAFER', bs: 'BrokerSnapshot' };


  function addRows(rows, q, my) {
    var data = G('scrapedData'), rowHTML = G('rowHTML'), tb = $('resultsTable'), toRec = G('_censusToRec');
    if (!Array.isArray(data) || typeof rowHTML !== 'function' || !tb) return;
    var inp = $('universalSearchInput'); if (!inp || clean(inp.value) !== clean(q)) return; // the search changed meanwhile
    dropOnline();
    if (!data.length && tb.rows.length) { EMPTY = tb.innerHTML; tb.innerHTML = ''; } // the "No data loaded yet" line would push the rows out of place
    var have = {}; data.forEach(function (r) { have[String(r.mc)] = 1; });
    var recs = [];
    rows.forEach(function (c) {
      var mc = mcOf(c), rec = baseRec(mc);
      if (mc && have[mc]) return;
      try { if (typeof toRec === 'function') toRec(c, rec); } catch (e) {}
      if (rec.usdot === 'N/A') rec.usdot = String(parseInt(c.dot_number, 10));
      if (rec.name === 'N/A' && c.legal_name) rec.name = c.legal_name;
      rec.status = c.status_code === 'A' ? 'ACTIVE' : 'INACTIVE';
      rec.__dlxOnline = clean(q);
      data.push(rec); recs.push(rec);
      tb.insertAdjacentHTML('beforeend', rowHTML(rec, data.length - 1, false));
      var tr = tb.rows[data.length - 1]; if (tr) tr.classList.add('dlx-online');
    });
    ONQ = clean(q);
    window.applyAdvancedFilters();
    var n = recs.length, what = n === 1 ? '1 carrier' : n + ' carriers';
    if (!n) { msg('This carrier is already in your table.'); return; }
    msg('Not in your leads · searching…', true);
    var chain = Promise.resolve(), by = '';
    recs.forEach(function (rec) { chain = chain.then(function () { if (my !== SEQ) return; return checkAuth(rec).then(function (b) { if (b) by = b; }); }); });
    chain.then(function () {
      if (my !== SEQ) return;
      msg('Not in your leads · ' + what + ' found. Press Follow to keep ' + (n === 1 ? 'it' : 'one') + '.');
    });
  }

  function checkAuth(rec) {
    var decide = G('_decideAuth'), ov = G('_overlay'), bsFetch = G('fetchBrokerSnapshot'), ord = order();
    if (rec.mc === 'N/A' || typeof decide !== 'function') return Promise.resolve('');
    return Promise.resolve(ord[0] === 'bs' && typeof bsFetch === 'function' ? bsFetch(rec.mc, false).catch(function () { return null; }) : null)
      .then(function (bs) { return decide(ord, rec.mc, rec.usdot, { bs: bs }); })
      .then(function (d) {
        if (!d || !d.data) return '';
        try { if (typeof ov === 'function') ov(rec, d.data); } catch (e) {}
        rec.status = d.auth === 'yes' ? 'AUTHORIZED' : 'NOT AUTHORIZED';
        if (!rec.effDate && d.data.eff) rec.effDate = d.data.eff;
        if (d.data.cats && d.data.cats.length) {
          var have = rec.carrierDetails ? rec.carrierDetails.split(', ') : [];
          d.data.cats.forEach(function (k) { if (have.indexOf(k) < 0) have.push(k); });
          rec.carrierDetails = have.join(', ');
        }
        repaint(rec);
        return LABEL[d.by] || '';
      }, function () { return ''; });
  }
  function repaint(rec) { // draw the row again with the checked status, keeping its place
    var data = G('scrapedData') || [], i = data.indexOf(rec), tb = $('resultsTable'), rowHTML = G('rowHTML');
    if (i < 0 || !tb || typeof rowHTML !== 'function') return;
    var old = tb.rows[i]; if (!old) return;
    var followed = old.classList.contains('is-followed'), disp = old.style.display;
    var tmp = document.createElement('tbody'); tmp.innerHTML = rowHTML(rec, i, followed);
    var nw = tmp.rows[0]; if (!nw) return;
    if (isOnline(rec)) nw.classList.add('dlx-online');
    nw.style.display = disp; old.parentNode.replaceChild(nw, old);
  }

  var css = document.createElement('style');
  css.textContent = [
    '#dlxOnlineMsg[hidden]{display:none}',
    '#dlxOnlineMsg td{text-align:left!important;padding:12px 16px!important;font-size:13px;color:var(--mut);border-top:1px solid var(--line)}',
    '#dlxOnlineMsg td>span{display:inline-block;vertical-align:-2px;margin-right:10px}',
    '.dlx-spin{width:13px;height:13px;border-radius:50%;border:2px solid var(--line);border-top-color:var(--accent);animation:dlxspin .8s linear infinite}',
    '.dlx-dot{width:8px;height:8px;border-radius:50%;background:var(--accent)}',
    '@keyframes dlxspin{to{transform:rotate(360deg)}}'
  ].join('\n');
  document.head.appendChild(css);

  var inp0 = $('universalSearchInput');
  if (inp0) inp0.placeholder = 'Search MC, USDOT, phone, email or company';
})();
