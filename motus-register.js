/* Dispatch Link | CRM: "Daily FMCSA publications" from MOTUS.
   Pick a date range, get the list of PDFs MOTUS publishes for those days (FMCSA Daily Register and/or
   Broker & Freight Forwarder notices), then Download a PDF or load it straight into the USDOT PDF scanner.
   MOTUS gives temporary links (about 15 minutes); they are fetched again by themselves when they get old.
   Load this AFTER scraper-core.js. */
(function () {
  'use strict';
  var API = 'https://motus.dot.gov/api/report/getSignedUrlByTypeAndDateRange/';
  var EARLIEST = '2022-09-27', MAX_DAYS = 8, FRESH_MS = 12 * 60000;
  var TYPES = { REGISTER: { key: 'Register', label: 'Daily Register', short: 'Register', file: 'REGISTER' }, BFF: { key: 'Bff', label: 'Broker & FF notices', short: 'Broker & FF', file: 'BFF' } };
  var S = { items: [], at: 0, from: '', to: '', types: [] };
  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  function note(m, ms) { if (typeof window.showPremiumNotification === 'function') window.showPremiumNotification(m, ms || 3000); }
  function ymd(d) { return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function parse(s) { var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || ''); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null; }
  function addDays(d, n) { var x = new Date(d.getTime()); x.setDate(x.getDate() + n); return x; }
  function nice(s) { var d = parse(s); return d ? d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) : s; }

  /* ---------- styles ---------- */
  var css = document.createElement('style');
  css.textContent = [
    '.mr-box{border:1px solid var(--line);border-radius:12px;background:var(--surface);padding:14px 16px}',
    '.mr-head{display:flex;align-items:center;gap:10px;margin-bottom:10px}.mr-head b{font-size:14px;color:var(--ink)}.mr-head small{color:var(--mut);font-size:12px}',
    '.mr-ic{display:flex;align-items:center;justify-content:center;flex:none;width:30px;height:30px;border-radius:9px;background:var(--accent-soft,rgba(47,91,234,.12));color:var(--accent)}.mr-ic svg{width:16px;height:16px}',
    '.mr-form{display:flex;flex-wrap:wrap;gap:10px;align-items:flex-end}',
    '.mr-f{display:flex;flex-direction:column;gap:4px}.mr-f label{font-size:11.5px;font-weight:600;color:var(--mut);text-transform:uppercase;letter-spacing:.04em}',
    '.mr-f input[type=date]{height:36px;padding:0 10px;border:1px solid var(--line);border-radius:9px;background:var(--surface2);color:var(--ink);font:inherit;font-size:13.5px}',
    '.mr-types{display:flex;gap:6px;flex-wrap:wrap}.mr-types label{display:inline-flex;align-items:center;gap:6px;height:36px;padding:0 11px;border:1px solid var(--line);border-radius:9px;background:var(--surface2);font-size:13px;font-weight:600;color:var(--ink2,var(--ink));cursor:pointer;user-select:none}',
    '.mr-f .mr-types label{text-transform:none;letter-spacing:0;font-size:13px;color:var(--ink)}',
    '.mr-types input{accent-color:var(--accent);margin:0}',
    '.mr-go{height:36px;padding:0 16px;border:0;border-radius:9px;background:var(--accent);color:#fff;font-weight:700;font-size:13.5px;cursor:pointer}.mr-go:disabled{opacity:.6;cursor:wait}',
    '.mr-msg{margin-top:8px;font-size:12.5px;color:var(--mut)}.mr-msg.err{color:var(--bad,#c2312a)}',
    '.mr-bar{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:12px;padding-top:12px;border-top:1px solid var(--line2,var(--line))}',
    '.mr-bar small{color:var(--mut);font-size:12.5px}.mr-bar small b{color:var(--ink)}',
    '.mr-list{margin-top:10px;display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:8px}',
    '.mr-row{display:flex;align-items:center;gap:10px;min-width:0;padding:8px 8px 8px 10px;border:1px solid var(--line2,var(--line));border-radius:10px;background:var(--surface2);transition:border-color .15s,box-shadow .15s}',
    '.mr-row:hover{border-color:color-mix(in srgb,var(--accent) 45%,var(--line));box-shadow:0 4px 14px rgba(15,23,42,.08)}',
    '.mr-pdf{flex:none;display:flex;align-items:center;justify-content:center;width:30px;height:34px;border-radius:6px;background:linear-gradient(180deg,#ef4444,#c62828);color:#fff;font-size:9px;font-weight:800;letter-spacing:.03em}',
    '.mr-row .mr-t{flex:1;min-width:0;line-height:1.25}.mr-row .mr-t b{display:block;font-size:13.5px;color:var(--ink);white-space:nowrap}.mr-row .mr-t small{display:block;color:var(--mut);font-size:11.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.mr-ib{flex:none;display:inline-flex;align-items:center;justify-content:center;width:30px;height:30px;border:1px solid var(--line);border-radius:8px;background:var(--surface);color:var(--ink);cursor:pointer;transition:all .15s}',
    '.mr-ib svg{width:15px;height:15px}.mr-ib:hover{border-color:var(--accent);color:var(--accent)}',
    '.mr-ib.pri{background:var(--accent);border-color:var(--accent);color:#fff}.mr-ib.pri:hover{filter:brightness(1.1);color:#fff}',
    '.mr-ib.is-busy{pointer-events:none;opacity:.7}.mr-ib.is-busy svg{animation:mrspin .8s linear infinite}@keyframes mrspin{to{transform:rotate(360deg)}}',
    '.mr-btn{flex:none;display:inline-flex;align-items:center;gap:6px;height:32px;padding:0 12px;border:1px solid var(--accent);border-radius:8px;background:var(--accent);color:#fff;font-size:12.5px;font-weight:700;cursor:pointer}.mr-btn svg{width:14px;height:14px}.mr-btn.is-busy{opacity:.7;pointer-events:none}',
    '@media (max-width:560px){.mr-list{grid-template-columns:1fr}}'
  ].join('\n');
  document.head.appendChild(css);

  /* ---------- panel ---------- */
  function mount() {
    var zone = $('motusPdfBox'); if (!zone || $('mrBox')) return !!zone;
    var today = new Date(), from = addDays(today, -7);
    var box = document.createElement('div'); box.className = 'mr-box'; box.id = 'mrBox';
    box.innerHTML =
      '<div class="mr-head"><span class="mr-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M9 14h6M9 17h4"/></svg></span>' +
      '<div><b>Daily FMCSA publications</b><br><small>Get the PDFs straight from MOTUS for any dates. Download them or load them into the scanner.</small></div></div>' +
      '<div class="mr-form">' +
      '<div class="mr-f"><label for="mrFrom">From</label><input type="date" id="mrFrom" min="' + EARLIEST + '" value="' + ymd(from) + '" max="' + ymd(today) + '"></div>' +
      '<div class="mr-f"><label for="mrTo">To</label><input type="date" id="mrTo" min="' + EARLIEST + '" value="' + ymd(today) + '" max="' + ymd(today) + '"></div>' +
      '<div class="mr-f"><label>Document</label><div class="mr-types"><label><input type="checkbox" id="mrReg" checked>Daily Register</label><label><input type="checkbox" id="mrBff">Broker &amp; FF notices</label></div></div>' +
      '<button type="button" class="mr-go" id="mrGo">Find PDFs</button></div>' +
      '<div class="mr-msg" id="mrMsg">Longer ranges are fine: they are asked from MOTUS 8 days at a time.</div>' +
      '<div class="mr-list" id="mrList"></div>';
    zone.insertBefore(box, zone.firstChild);
    $('mrGo').onclick = function () { find(); };
    ['mrFrom', 'mrTo'].forEach(function (id) { $(id).addEventListener('keydown', function (e) { if (e.key === 'Enter') find(); }); });
    return true;
  }
  function msg(t, err) { var m = $('mrMsg'); if (m) { m.textContent = t; m.className = 'mr-msg' + (err ? ' err' : ''); } }

  /* ---------- MOTUS ---------- */
  function getJson(url) {
    var go = typeof window._politeFetch === 'function'
      ? window._politeFetch(url, { _timeout: 30000, headers: { Accept: 'application/json' } }, 3).then(function (r) { if (!r || !r.html) throw new Error(r && r.status ? 'MOTUS answered ' + r.status : 'MOTUS did not answer'); return JSON.parse(r.html); })
      : fetch(url, { headers: { Accept: 'application/json' } }).then(function (r) { if (!r.ok) throw new Error('MOTUS answered ' + r.status); return r.json(); });
    return go;
  }
  function chunks(a, b) { // [from, to] pieces of at most 8 calendar days
    var out = [], s = a;
    while (s <= b) { var e = addDays(s, MAX_DAYS - 1); if (e > b) e = b; out.push([ymd(s), ymd(e)]); s = addDays(e, 1); }
    return out;
  }
  function load(from, to, types) {
    var a = parse(from), b = parse(to);
    var parts = chunks(a, b), items = [];
    return parts.reduce(function (p, c) {
      return p.then(function () {
        return getJson(API + types.join(',') + '/' + c[0] + '/' + c[1]).then(function (j) {
          types.forEach(function (t) {
            (j && j[TYPES[t].key] || []).forEach(function (x) { if (x && x.url) items.push({ type: t, date: x.date, url: x.url }); });
          });
        });
      });
    }, Promise.resolve()).then(function () {
      items.sort(function (x, y) { return x.date < y.date ? 1 : x.date > y.date ? -1 : (x.type > y.type ? 1 : -1); });
      return items;
    });
  }
  function find() {
    var from = $('mrFrom').value, to = $('mrTo').value, types = [];
    if ($('mrReg').checked) types.push('REGISTER'); if ($('mrBff').checked) types.push('BFF');
    if (!types.length) return msg('Tick at least one document.', true);
    if (!parse(from) || !parse(to)) return msg('Pick both dates.', true);
    if (from > to) return msg('"From" must be before "To".', true);
    if (from < EARLIEST) return msg('MOTUS has these PDFs from 09/27/2022 on.', true);
    var days = Math.round((parse(to) - parse(from)) / 864e5) + 1;
    if (days > 62) return msg('Pick up to 2 months at a time.', true);
    var b = $('mrGo'); b.disabled = true; b.textContent = 'Searching...';
    msg('Asking MOTUS' + (days > MAX_DAYS ? ' (' + Math.ceil(days / MAX_DAYS) + ' requests)' : '') + '...');
    return load(from, to, types).then(function (items) {
      S = { items: items, at: Date.now(), from: from, to: to, types: types };
      draw();
      msg(items.length ? 'Weekends and holidays have no PDF. Links stay fresh by themselves.' : 'MOTUS has no PDFs for these dates (weekends and holidays have none).');
    }).catch(function (e) {
      msg('Could not reach MOTUS: ' + e.message + '. Try again in a minute.', true);
    }).then(function () { b.disabled = false; b.textContent = 'Find PDFs'; });
  }
  function fresh() { // MOTUS links work about 15 minutes: ask again when they get old
    if (Date.now() - S.at < FRESH_MS) return Promise.resolve();
    msg('Getting fresh links from MOTUS...');
    return load(S.from, S.to, S.types).then(function (items) { S.items = items; S.at = Date.now(); draw(); msg(items.length + ' PDFs, links refreshed.'); });
  }
  function current(it) { return S.items.filter(function (x) { return x.type === it.type && x.date === it.date; })[0] || it; }
  function fname(it) { return TYPES[it.type].file + '_' + it.date + '.pdf'; }
  function getBlob(it) { // the PDF itself (needs MOTUS storage to allow it; if not, we open it in a new tab instead)
    return fetch(current(it).url).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.blob(); });
  }

  /* ---------- list ---------- */
  var IC = {
    dl: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/></svg>',
    scan: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2"/><path d="M7 12h10"/></svg>'
  };
  function draw() {
    var list = $('mrList'); if (!list) return;
    var bar = $('mrBar'); if (bar) bar.remove();
    if (!S.items.length) { list.innerHTML = ''; return; }
    var regs = S.items.filter(function (x) { return x.type === 'REGISTER'; }).length;
    var nb = document.createElement('div'); nb.className = 'mr-bar'; nb.id = 'mrBar';
    nb.innerHTML = '<small><b>' + S.items.length + ' PDF' + (S.items.length > 1 ? 's' : '') + '</b> · ' + esc(nice(S.from)) + ' to ' + esc(nice(S.to)) + '</small>' +
      (regs > 1 ? '<button type="button" class="mr-btn" data-a="scanall">' + IC.scan + 'Load all ' + regs + ' into scanner</button>' : '');
    list.parentNode.insertBefore(nb, list);
    list.innerHTML = S.items.map(function (it, i) {
      var d = parse(it.date), day = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }), wd = d.toLocaleDateString('en-US', { weekday: 'short' });
      return '<div class="mr-row" title="' + esc(TYPES[it.type].label + ', ' + nice(it.date)) + '"><span class="mr-pdf">PDF</span><span class="mr-t"><b>' + esc(day) + '</b><small>' + esc(wd) + ' · ' + esc(TYPES[it.type].label) + '</small></span>' +
        '<button type="button" class="mr-ib" data-a="dl" data-i="' + i + '" title="Download PDF" aria-label="Download PDF">' + IC.dl + '</button>' +
        (it.type === 'REGISTER' ? '<button type="button" class="mr-ib pri" data-a="scan" data-i="' + i + '" title="Load into scanner" aria-label="Load into scanner">' + IC.scan + '</button>' : '') + '</div>';
    }).join('');
    document.querySelectorAll('#mrBox [data-a]').forEach(function (b) { b.onclick = function () { act(b); }; });
  }
  function busy(b, on) { b.disabled = on; b.classList.toggle('is-busy', on); }
  function act(b) {
    var a = b.getAttribute('data-a'), it = S.items[+b.getAttribute('data-i')];
    if (a === 'dl') {
      busy(b, true, 'Downloading...');
      fresh().then(function () { return getBlob(it); }).then(function (blob) {
        var u = URL.createObjectURL(blob), x = document.createElement('a'); x.href = u; x.download = fname(it); document.body.appendChild(x); x.click();
        setTimeout(function () { URL.revokeObjectURL(u); x.remove(); }, 1500);
      }).catch(function () { window.open(current(it).url, '_blank', 'noopener'); note('The PDF opened in a new tab. Use the download button there to save it.', 4500); })
        .then(function () { busy(b, false); });
      return;
    }
    var pick = a === 'scanall' ? S.items.filter(function (x) { return x.type === 'REGISTER'; }) : [it];
    if (typeof window._readMotusPdfs !== 'function' && typeof _readMotusPdfsRef() !== 'function') { note('The scanner is not ready on this page.'); return; }
    busy(b, true, 'Loading...');
    fresh().then(function () {
      return Promise.all(pick.map(function (x) { return getBlob(x).then(function (blob) { return new File([blob], fname(x), { type: 'application/pdf' }); }); }));
    }).then(function (files) {
      if (typeof window.setScanMode === 'function') try { window.setScanMode('pdf'); } catch (e) {}
      return _readMotusPdfsRef()(files);
    }).then(function () {
      var z = $('pdfFileCard') || $('pdfDrop'); if (z) z.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }).catch(function () {
      msg('MOTUS did not let the page read the PDF directly. Press Download, then drop the file in the box below.', true);
    }).then(function () { busy(b, false); });
  }
  function _readMotusPdfsRef() { try { return typeof _readMotusPdfs === 'function' ? _readMotusPdfs : window._readMotusPdfs; } catch (e) { return window._readMotusPdfs; } }

  /* ---------- short names for the scanner card and the History list ---------- */
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function span(a, b) { // "Oct 9-15, 2026" / "Sep 28 - Oct 15, 2026"
    var x = parse(a), y = parse(b); if (!x || !y) return a;
    if (a === b) return MON[x.getMonth()] + ' ' + x.getDate() + ', ' + x.getFullYear();
    if (x.getFullYear() === y.getFullYear() && x.getMonth() === y.getMonth()) return MON[x.getMonth()] + ' ' + x.getDate() + '\u2013' + y.getDate() + ', ' + y.getFullYear();
    if (x.getFullYear() === y.getFullYear()) return MON[x.getMonth()] + ' ' + x.getDate() + ' \u2013 ' + MON[y.getMonth()] + ' ' + y.getDate() + ', ' + y.getFullYear();
    return MON[x.getMonth()] + ' ' + x.getDate() + ', ' + x.getFullYear() + ' \u2013 ' + MON[y.getMonth()] + ' ' + y.getDate() + ', ' + y.getFullYear();
  }
  function summarize(files) {
    files = (files || []).map(function (f) { return String(f).trim(); }).filter(Boolean);
    if (!files.length) return '';
    var hits = files.map(function (f) { var m = /^(REGISTER|BFF)[_-]?(\d{4})-?(\d{2})-?(\d{2})(?:\.pdf)?$/i.exec(f); return m ? { t: m[1].toUpperCase(), d: m[2] + '-' + m[3] + '-' + m[4] } : null; });
    if (hits.every(Boolean)) {
      var ds = hits.map(function (h) { return h.d; }).sort(), kinds = {};
      hits.forEach(function (h) { kinds[h.t] = 1; });
      var lbl = Object.keys(kinds).length > 1 ? 'MOTUS PDFs' : TYPES[hits[0].t].label;
      return lbl + ' \u00b7 ' + span(ds[0], ds[ds.length - 1]) + (files.length > 1 ? ' \u00b7 ' + files.length + ' PDFs' : '');
    }
    return files.length === 1 ? files[0] : files.length + ' PDFs \u00b7 ' + files[0] + ' + ' + (files.length - 1) + ' more';
  }
  function hookName() { // the scanner names a scan after its PDFs: keep that name short
    var orig = window._setPdfName; if (typeof orig !== 'function' || orig.__mr) return !!(orig && orig.__mr);
    var f = function () {
      var r = orig.apply(this, arguments);
      try { if (_motusPdfFiles && _motusPdfFiles.length > 1 || (_motusPdfFiles && /^(REGISTER|BFF)_/i.test(_motusPdfFiles[0] || ''))) _motusPdfName = summarize(_motusPdfFiles); } catch (e) {}
      return r;
    };
    f.__mr = true; window._setPdfName = f; return true;
  }
  function tidyHistory() { // older saved sheets: show a short title, the full list on mouse-over
    document.querySelectorAll('.hist-card .hc-range').forEach(function (el) {
      if (el.getAttribute('data-mr')) return; el.setAttribute('data-mr', '1');
      var t = (el.textContent || '').trim(), m = /^(?:(\d+) PDFs: )?(.+?)(?: \((\d+)\))?$/.exec(t); if (!m) return;
      if (!/pdf|register|bff|list|usdot/i.test(t)) return; // MC ranges stay exactly as they are
      el.setAttribute('data-mr-pdf', '1'); // a PDF name: normal text, not the big number font
      var files = m[1] ? m[2].split(/,\s*/) : [m[2]];
      var short = summarize(files); if (!short) return;
      el.title = t; el.textContent = (short === m[2] ? m[2] : short) + (m[3] ? ' \u00b7 ' + Number(m[3]).toLocaleString() + ' USDOT' : '');
    });
  }
  var hcss = document.createElement('style');
  hcss.textContent = '.hist-card .hc-range{overflow-wrap:anywhere;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}.hist-card .hc-range{font-family:inherit!important;font-weight:600!important;font-size:14px!important;line-height:1.4!important;letter-spacing:0!important;-webkit-line-clamp:2}.hist-card .hc-range small{font-weight:500;margin:0 4px;opacity:.7}#pdfFileName{overflow-wrap:anywhere}';
  document.head.appendChild(hcss);
  (function watchHist(n) {
    var d = $('dlHistoryDrawer');
    if (d && window.MutationObserver) { var t = null; new MutationObserver(function () { clearTimeout(t); t = setTimeout(tidyHistory, 30); }).observe(d, { childList: true, subtree: true }); tidyHistory(); }
    else if (n < 40) setTimeout(function () { watchHist(n + 1); }, 250);
  })(0);
  (function hn(n) { if (!hookName() && n < 40) setTimeout(function () { hn(n + 1); }, 250); })(0);

  (function start(n) { if (!mount() && n < 40) setTimeout(function () { start(n + 1); }, 250); })(0);
})();
