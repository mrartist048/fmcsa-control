/* Dispatch Link CRM: follow-ups.
   - The Remarks column is gone. Pressing Follow on a lead opens one window: follow-up date + time and
     call notes (truck type, length, zip, load, accessories, summary). "Add to follow-ups" saves it.
   - A carrier that is already added shows "Added" with a tick; clicking it (or Edit in the follow-up list)
     opens the same window to change the date, notes and carrier details.
   - Remove from follow-ups works for every saved carrier (also team-shared ones whose MC is text).
   - Follow-up list: numbers are click-to-call.
   Everything stays in this browser (IndexedDB "followups"), like before. Load AFTER scraper-core.js. */
(function () {
  if (window.__dlFollowUps) return; window.__dlFollowUps = true;
  var $ = function (id) { return document.getElementById(id); };
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function ico(n) { return '<svg class="ico"><use href="#i-' + n + '"/></svg>'; }
  function note(m, ms) { if (typeof window.showPremiumNotification === 'function') window.showPremiumNotification(m, ms || 2600); }
  function SD() { try { return typeof scrapedData !== 'undefined' && scrapedData ? scrapedData : (window.scrapedData || []); } catch (e) { return []; } }
  function DB() { try { return typeof db !== 'undefined' ? db : null; } catch (e) { return null; } }
  function render() { try { if (typeof window.renderFollowUpItems === 'function') window.renderFollowUpItems(); } catch (e) {} try { bkSoon(); } catch (e) {} }

  /* ---------------- follow-up store (MC may be a number or text) ---------------- */
  function all() {
    return new Promise(function (res) {
      var d = DB(); if (!d) return res([]);
      try {
        var out = [], rq = d.transaction('followups', 'readonly').objectStore('followups').openCursor();
        rq.onsuccess = function () { var c = rq.result; if (c) { out.push({ key: c.key, v: c.value }); c['continue'](); } else res(out); };
        rq.onerror = function () { res(out); };
      } catch (e) { res([]); }
    });
  }
  function find(mc) { return all().then(function (l) { return l.filter(function (x) { return String(x.key) === String(mc); })[0] || null; }); }
  function removeMc(mc) {
    return new Promise(function (res) {
      var d = DB(); if (!d) return res(0);
      try {
        var n = 0, tx = d.transaction('followups', 'readwrite'), rq = tx.objectStore('followups').openCursor();
        rq.onsuccess = function () { var c = rq.result; if (c) { if (String(c.key) === String(mc)) { c['delete'](); n++; } c['continue'](); } };
        tx.oncomplete = function () { res(n); }; tx.onerror = tx.onabort = function () { res(n); };
      } catch (e) { res(0); }
    });
  }
  function put(v) {
    return new Promise(function (res) {
      var d = DB(); if (!d) return res(false);
      try { var tx = d.transaction('followups', 'readwrite'); tx.objectStore('followups').put(v); tx.oncomplete = function () { res(true); }; tx.onerror = tx.onabort = function () { res(false); }; } catch (e) { res(false); }
    });
  }

  /* ---------------- styles ---------------- */
  var css = document.createElement('style');
  css.textContent = [
    /* lead table button */
    'tr.is-followed .premium-followup-btn{font-weight:700}',
    /* follow-up card */
    '.fu-call{display:inline-flex;align-items:center;gap:6px;padding:3px 9px 3px 7px;margin:-3px 0;border:0;border-radius:99px;background:color-mix(in srgb,var(--ok) 13%,transparent);color:var(--ok);font:600 12.5px var(--mono,inherit);cursor:pointer;transition:background .15s,transform .15s}',
    '.fu-call:hover{background:var(--ok);color:#fff;transform:translateY(-1px)}.fu-call .ico{width:13px;height:13px}',
    '.hc-btn.fu-edit .ico{width:14px;height:14px}',
    '.fu-who b{font-weight:700;color:var(--ink)}.dlx-hint{font-weight:500;text-transform:none;letter-spacing:0;color:var(--mut);margin-left:6px}',
    '.fu-remarks{white-space:normal;margin-top:10px!important;padding:10px 12px!important;border-radius:12px;background:var(--surface2);border:1px solid var(--line2);font-size:13px;line-height:1.5}',
    '.fu-ns{display:flex;flex-wrap:wrap;gap:4px 14px}.fu-n{white-space:nowrap}.fu-n b,.fu-sum b{font-weight:700;color:var(--ink)}',
    '.fu-sum{margin-top:4px;white-space:pre-line;color:var(--ink2)}.fu-ns:empty{display:none}.fu-ns:empty+.fu-sum{margin-top:0}',
    '.fu-actions{grid-template-columns:1.5fr 1fr 1fr 40px!important}',
    /* shared window look */
    '.dlx-card{position:relative;width:560px;max-width:100%;max-height:92vh;max-height:92dvh;display:flex;flex-direction:column;overflow:hidden;background:var(--surface);border:1px solid var(--line);border-radius:20px;box-shadow:0 30px 80px rgba(6,12,32,.45)}',
    '.dlx-head{display:flex;align-items:center;gap:14px;padding:20px 56px 16px 22px;border-bottom:1px solid var(--line2);background:linear-gradient(180deg,var(--accent-soft),transparent)}',
    '.dlx-ic{display:flex;align-items:center;justify-content:center;flex:none;width:44px;height:44px;border-radius:13px;background:var(--grad,var(--accent));color:#fff;box-shadow:0 8px 20px rgba(47,91,234,.28)}.dlx-ic .ico{width:20px;height:20px}',
    '.dlx-head h3{margin:0;padding:0;font-size:18px;font-weight:800;letter-spacing:-.01em}.dlx-head p{margin:3px 0 0;color:var(--mut);font-size:12.5px;word-break:break-word}',
    '.dlx-x{position:absolute;right:14px;top:14px;width:34px;height:34px;display:flex;align-items:center;justify-content:center;border:0;border-radius:10px;background:transparent;color:var(--mut);cursor:pointer}.dlx-x:hover{background:var(--hover,var(--accent-soft));color:var(--ink)}.dlx-x .ico{width:16px;height:16px}',
    '.dlx-body{padding:18px 22px;overflow:auto;flex:1;min-height:0}',
    '.dlx-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px 14px}.dlx-grid .full{grid-column:1/-1}',
    '.dlx-f label{display:block;margin:0 0 6px;font-size:12px;font-weight:700;color:var(--ink2);letter-spacing:.02em;text-transform:uppercase}',
    '.dlx-f input,.dlx-f textarea{width:100%;height:40px;padding:0 12px;border:1px solid var(--line);border-radius:11px;background:var(--surface2);color:var(--ink);font:14px var(--font,inherit);transition:border-color .15s,box-shadow .15s,background .15s}',
    '.dlx-f textarea{height:auto;min-height:96px;padding:10px 12px;line-height:1.55;resize:vertical}',
    '.dlx-f input:focus,.dlx-f textarea:focus{outline:0;border-color:var(--accent);background:var(--surface);box-shadow:0 0 0 3px var(--accent-soft)}',
    '.dlx-foot{display:flex;align-items:center;gap:10px;padding:14px 22px;border-top:1px solid var(--line2);background:var(--surface)}.dlx-foot .sp{flex:1}',
    '.dlx-foot button{height:40px;padding:0 18px;border-radius:11px;font-weight:600}',
    '.dlx-chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}',
    '.dlx-chip{height:28px;padding:0 11px;border:1px solid var(--line);border-radius:99px;background:var(--surface);color:var(--ink2);font:600 12px var(--font,inherit);cursor:pointer;transition:all .15s}',
    '.dlx-chip:hover{border-color:var(--accent);color:var(--accent)}.dlx-chip.on{background:var(--accent);border-color:var(--accent);color:#fff}',
    '[data-theme=dark] .dlx-chip.on{color:#07101F}',
    '.dlx-saved{font-size:12px;color:var(--mut);display:flex;align-items:center;gap:6px}.dlx-saved i{width:7px;height:7px;border-radius:50%;background:var(--ok);display:inline-block}',
    /* the Remarks column is replaced by the follow-up window */
    '#resultsTable td.remarks-cell-container,table.table th.dlx-hide{display:none!important}',
    '.dlx-sec{margin:6px 0 -2px;padding-top:12px;border-top:1px solid var(--line2);font-size:13px;font-weight:800;color:var(--ink)}',
    '.dlx-more{border:1px solid var(--line);border-radius:12px;padding:0 14px;background:var(--surface2)}',
    '.dlx-more summary{cursor:pointer;padding:12px 0;font-weight:700;font-size:13px;color:var(--ink)}.dlx-more summary small{font-weight:500;color:var(--mut)}',
    '.dlx-more[open]{padding-bottom:14px}.dlx-more .dlx-f input{background:var(--surface)}',
    '.dlx-del{display:inline-flex;align-items:center;gap:6px;color:var(--bad)!important}.dlx-del .ico{width:15px;height:15px}.dlx-del:hover{border-color:var(--bad)!important}',
    '.dlx-sale{width:460px}.dlx-sale .dlx-head{background:linear-gradient(180deg,color-mix(in srgb,#16a34a 14%,transparent),transparent)}',
    '.dlx-sale .dlx-ic{background:linear-gradient(135deg,#16a34a,#0d9488);box-shadow:0 8px 22px rgba(22,163,74,.35)}',
    '.dlx-sale .dlx-body{padding:18px 22px}.dlx-sale-box{border:1px solid var(--line);border-radius:14px;background:var(--surface2);padding:14px 16px;display:grid;gap:8px}',
    '.dlx-sale-row{display:flex;justify-content:space-between;gap:14px;font-size:13.5px}.dlx-sale-row span{color:var(--mut)}.dlx-sale-row b{color:var(--ink);text-align:right;word-break:break-word}',
    '.dlx-sale-note{margin:14px 0 0;color:var(--mut);font-size:13px;line-height:1.5}',
    '.dlx-sale .btn-ok{border:0;background:linear-gradient(135deg,#16a34a,#0d9488);color:#fff;box-shadow:0 8px 20px rgba(22,163,74,.3);display:inline-flex;align-items:center;gap:8px;cursor:pointer}.dlx-sale .btn-ok:hover{filter:brightness(1.07)}.dlx-sale .btn-ok .ico{width:16px;height:16px}',
    '@media (max-width:600px){.dlx-grid{grid-template-columns:1fr}.dlx-head{padding:16px 50px 14px 16px}.dlx-body{padding:14px 16px}.dlx-foot{padding:12px 16px}}'
  ].join('\n');
  document.head.appendChild(css);

  function modal(id, html) {
    var m = $(id);
    if (!m) { m = document.createElement('div'); m.className = 'overlay'; m.id = id; document.body.appendChild(m); m.addEventListener('mousedown', function (e) { if (e.target === m && m._close) m._close(); }); }
    m.innerHTML = html; m.classList.add('show'); return m;
  }
  document.addEventListener('keydown', function (e) { if (e.key !== 'Escape') return; ['dlxCard', 'dlxSale'].forEach(function (id) { var m = $(id); if (m && m.classList.contains('show') && m._close) m._close(); }); });

  /* ================= 1. remove from follow-ups ================= */
  window.deleteFollowUpItem = function (mc) {
    if (!confirm('Remove this carrier from Follow-ups?')) return;
    removeMc(mc).then(function (n) {
      render(); paintRows();
      note(n ? 'Removed from follow-ups.' : 'This carrier was not found in your follow-ups.');
    });
  };

  /* ================= 2. lead table: "Added" tick ================= */
  function rowMc(tr) { var b = tr.querySelector('.cc-mc'); var t = b ? b.textContent : (tr.cells[0] && tr.cells[0].textContent); return String(parseInt(String(t || '').replace(/\D+/g, ' ').trim(), 10) || ''); }
  var paintT = null;
  function paintRows() {
    clearTimeout(paintT);
    paintT = setTimeout(function () {
      all().then(function (l) {
        var set = {}; l.forEach(function (x) { set[String(x.key)] = 1; });
        document.querySelectorAll('#resultsTable tr').forEach(function (tr) {
          var btn = tr.querySelector('.premium-followup-btn'); if (!btn) return;
          var on = !!set[rowMc(tr)];
          tr.classList.toggle('is-followed', on);
          var want = on ? 'Added' : 'Follow';
          if (btn.textContent !== want) btn.textContent = want;
          btn.title = on ? 'In your follow-ups. Click to edit.' : 'Add to follow-ups';
        });
      });
    }, 60);
  }
  document.addEventListener('click', function (e) { // Follow / Added button in the lead table: open the follow-up window
    var btn = e.target.closest && e.target.closest('#resultsTable .premium-followup-btn'); if (!btn) return;
    e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
    var tr = btn.closest('tr'), mc = rowMc(tr);
    var idx = (/addLeadToFollowUpList\((\d+)/.exec(btn.getAttribute('onclick') || '') || [])[1];
    find(mc).then(function (rec) {
      if (rec) openCard({ mc: rec.key, rec: rec });
      else if (idx != null) openCard({ idx: +idx, btn: btn });
    });
  }, true);
  var origConfirm = window.confirmFollowUpSchedule;
  if (typeof origConfirm === 'function') window.confirmFollowUpSchedule = function () { var r = origConfirm.apply(this, arguments); setTimeout(paintRows, 300); return r; };

  /* ================= 3. follow-up list: edit + call ================= */
  function decorateCards() {
    var list = $('drawerFollowUpList'); if (!list) return;
    list.querySelectorAll('.fu-card').forEach(function (card) {
      if (card.getAttribute('data-dlx')) return; card.setAttribute('data-dlx', '1');
      var cb = card.querySelector('.followup-select-checkbox'), mc = cb ? cb.value : '';
      var acts = card.querySelector('.fu-actions'), del = acts && acts.querySelector('.hc-btn.del');
      if (acts && mc) {
        var b = document.createElement('button'); b.type = 'button'; b.className = 'hc-btn fu-edit'; b.title = 'Edit carrier details'; b.innerHTML = ico('settings') + 'Edit';
        b.onclick = function () { openEdit(mc); };
        acts.insertBefore(b, del || null);
      }
      var rm = card.querySelector('.fu-remarks'); // notes: only the filled fields, side by side
      if (rm) {
        var sm = rm.querySelector('small'), raw = (rm.textContent || '').slice(sm ? sm.textContent.length : 0).trim();
        if (rm.querySelector('i') && /^no remarks/i.test(raw)) raw = '';
        var o = parseNotes(raw), items = NF.filter(function (f) { return o[f[1]]; }).map(function (f) { return '<span class="fu-n"><b>' + esc(f[0]) + ':</b> ' + esc(o[f[1]]) + '</span>'; });
        var sum = String(o.summary || '').trim();
        if (!items.length && !sum) rm.style.display = 'none';
        else rm.innerHTML = '<div class="fu-ns">' + items.join('') + '</div>' + (sum ? '<div class="fu-sum"><b>Summary:</b> ' + esc(sum) + '</div>' : '');
      }
      var meta = card.querySelector('.fu-meta');
      if (meta && mc && !meta.querySelector('.fu-who')) {
        find(mc).then(function (rec) {
          var nm = rec && niceName(rec.v && rec.v.owner); if (!nm) return;
          var w = document.createElement('span'); w.className = 'fu-who'; w.innerHTML = ico('user') + '<b>' + esc(nm) + '</b>';
          meta.insertBefore(w, meta.firstChild);
        });
      }
      var ph = card.querySelector('.fu-meta span:not(.fu-who)'); // the phone
      if (ph) {
        var num = (ph.textContent || '').trim();
        if (num && !/^n\/?a$/i.test(num)) {
          var c = document.createElement('button'); c.type = 'button'; c.className = 'fu-call'; c.title = 'Click to call'; c.innerHTML = ico('phone') + esc(num);
          c.onclick = function () { if (typeof window.handlePhoneInteraction === 'function') window.handlePhoneInteraction(c, num); else location.href = 'tel:' + num; };
          ph.replaceWith(c);
        }
      }
    });
  }

  function niceName(raw) { // "SMITH, JOHN" -> "John Smith"
    var x = String(raw || '').replace(/\s+/g, ' ').trim();
    if (!x || /^(n\/a|none|null|undefined|-+|\u2014)$/i.test(x)) return '';
    var m = x.match(/^([^,]+),\s*(.+)$/);
    if (m && !/\b(llc|inc|corp|ltd|co)\b/i.test(x)) x = m[2] + ' ' + m[1];
    return /[a-z]/.test(x) ? x : x.toLowerCase().replace(/(^|[\s\-'.])([a-z])/g, function (a, p, c) { return p + c.toUpperCase(); });
  }
  function to24(t) { var m = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(String(t || '').trim()); if (!m) return /^\d{2}:\d{2}$/.test(t || '') ? t : ''; var h = +m[1] % 12; if (/pm/i.test(m[3])) h += 12; return ('0' + h).slice(-2) + ':' + m[2]; }
  function to12(t) { if (!t) return 'N/A'; var p = t.split(':'), h = +p[0], ap = h >= 12 ? 'PM' : 'AM'; h = h % 12 || 12; return h + ':' + p[1] + ' ' + ap; }
  function na(v) { v = String(v == null ? '' : v).trim(); return v === 'N/A' ? '' : v; }

  /* ================= 4. remarks notepad ================= */
  var NF = [['Truck Type', 'truck'], ['Length', 'len'], ['Accessories', 'acc'], ['Load', 'load'], ['Zip Code', 'zip']];
  var TRUCKS = ['Dry Van', 'Reefer', 'Flatbed', 'Step Deck', 'Box Truck', 'Power Only', 'Hotshot', 'Conestoga'];
  function parseNotes(t) {
    var o = { summary: '' }, extra = [], inSum = false;
    String(t || '').split('\n').forEach(function (line) {
      var hit = null;
      NF.forEach(function (f) { if (!hit && line.toLowerCase().indexOf(f[0].toLowerCase() + ':') === 0) hit = f; });
      if (hit) { o[hit[1]] = line.slice(hit[0].length + 1).trim(); inSum = false; return; }
      if (/^summary:/i.test(line)) { o.summary = line.slice(8).trim(); inSum = true; return; }
      if (inSum) o.summary += (o.summary ? '\n' : '') + line; else if (line.trim()) extra.push(line);
    });
    if (extra.length) o.summary = extra.join('\n') + (o.summary ? '\n' + o.summary : '');
    return o;
  }
  function cleanBuild(o) { // same layout the page uses: "Truck Type: ...", one per line, Summary last
    return NF.map(function (f) { return f[0] + ':' + (o[f[1]] ? ' ' + o[f[1]] : ''); }).join('\n') + '\nSummary:' + (o.summary ? ' ' + o.summary : '');
  }


  /* ================= one window: follow-up date/time + call notes (+ carrier details when editing) ================= */
  function openCard(o) {
    var editing = !!o.rec, v = editing ? (o.rec.v || {}) : (SD()[o.idx] || null);
    if (!v) return;
    var key = editing ? o.rec.key : v.mc, n = parseNotes(v.remarks || '');
    var today = new Date(), pad = function (x) { return ('0' + x).slice(-2); };
    var dDate = editing && v.followUpDate ? v.followUpDate : today.getFullYear() + '-' + pad(today.getMonth() + 1) + '-' + pad(today.getDate());
    var dTime = editing ? to24(v.followUpTime) : pad(today.getHours()) + ':' + pad(today.getMinutes());
    var DET = [['name', 'Company', 'full'], ['phone', 'Phone', ''], ['email', 'Email', ''], ['address', 'Address', 'full']];
    var m = modal('dlxCard', '<div class="dlx-card" role="dialog" aria-modal="true" aria-labelledby="dlxCardT">' +
      '<button class="dlx-x" type="button" aria-label="Close">' + ico('x') + '</button>' +
      '<div class="dlx-head"><span class="dlx-ic">' + ico(editing ? 'calendar' : 'plus') + '</span><div><h3 id="dlxCardT">' + (editing ? 'Follow-up' : 'Add to follow-ups') + '</h3><p>' + esc(na(v.name) || 'Carrier') + ' · MC ' + esc(key) + '</p></div></div>' +
      '<div class="dlx-body"><div class="dlx-grid">' +
      '<div class="dlx-f full"><label for="dlxC_owner">Contact name <small class="dlx-hint">filled in from FMCSA, fix it if it is wrong</small></label><input type="text" id="dlxC_owner" value="' + esc(niceName(v.owner)) + '" placeholder="Owner or person you talked to" autocomplete="off"></div>' +
      '<div class="dlx-f"><label for="dlxC_date">Follow-up date</label><input type="date" id="dlxC_date" value="' + esc(dDate) + '"></div>' +
      '<div class="dlx-f"><label for="dlxC_time">Time</label><input type="time" id="dlxC_time" value="' + esc(dTime) + '"></div>' +
      '<div class="dlx-sec full">Call notes</div>' +
      '<div class="dlx-f full"><label for="dlxN_truck">Truck type</label><input type="text" id="dlxN_truck" placeholder="Pick one or type"><div class="dlx-chips">' +
      TRUCKS.map(function (t) { return '<button type="button" class="dlx-chip">' + esc(t) + '</button>'; }).join('') + '</div></div>' +
      '<div class="dlx-f"><label for="dlxN_len">Length</label><input type="text" id="dlxN_len" placeholder="e.g. 53 ft"></div>' +
      '<div class="dlx-f"><label for="dlxN_zip">Zip code</label><input type="text" id="dlxN_zip" placeholder="e.g. 59901" inputmode="numeric"></div>' +
      '<div class="dlx-f"><label for="dlxN_load">Load</label><input type="text" id="dlxN_load" placeholder="e.g. dry goods, produce"></div>' +
      '<div class="dlx-f"><label for="dlxN_acc">Accessories</label><input type="text" id="dlxN_acc" placeholder="e.g. straps, tarps, pallet jack"></div>' +
      '<div class="dlx-f full"><label for="dlxN_summary">Summary</label><textarea id="dlxN_summary" rows="4" placeholder="What did you talk about? Rate, lanes, best time to call back..."></textarea></div>' +
      (editing ? '<details class="dlx-more full"><summary>Carrier details <small>(company, owner, phone, email, address)</small></summary><div class="dlx-grid">' +
        DET.map(function (f) { return '<div class="dlx-f ' + f[2] + '"><label for="dlxE_' + f[0] + '">' + f[1] + '</label><input type="' + (f[0] === 'email' ? 'email' : 'text') + '" id="dlxE_' + f[0] + '" value="' + esc(na(v[f[0]])) + '" autocomplete="off"></div>'; }).join('') + '</div></details>' : '') +
      '</div></div>' +
      '<div class="dlx-foot">' + (editing ? '<button type="button" class="btn-ghost dlx-del" data-k="del">' + ico('trash') + 'Remove</button>' : '') +
      '<span class="sp"></span><button type="button" class="btn-ghost" data-k="cancel">Cancel</button><button type="button" class="btn-primary" data-k="ok">' + (editing ? 'Save' : 'Add to follow-ups') + '</button></div></div>');
    var ids = ['truck', 'len', 'zip', 'load', 'acc', 'summary'];
    ids.forEach(function (k) { $('dlxN_' + k).value = n[k] || ''; });
    var chips = function () { var t = $('dlxN_truck').value.trim().toLowerCase(); m.querySelectorAll('.dlx-chip').forEach(function (c) { c.classList.toggle('on', c.textContent.toLowerCase() === t); }); };
    m.querySelectorAll('.dlx-chip').forEach(function (c) { c.onclick = function () { var t = $('dlxN_truck'); t.value = c.classList.contains('on') ? '' : c.textContent; chips(); }; });
    $('dlxN_truck').addEventListener('input', chips); chips();
    m._close = function () { m.classList.remove('show'); };
    m.querySelector('.dlx-x').onclick = m._close; m.querySelector('[data-k=cancel]').onclick = m._close;
    if (editing) m.querySelector('[data-k=del]').onclick = function () { m._close(); window.deleteFollowUpItem(key); };
    var notes = function () { var x = {}; ids.forEach(function (k) { x[k] = $('dlxN_' + k).value.trim(); }); return ids.some(function (k) { return x[k]; }) ? cleanBuild(x) : ''; };
    m.querySelector('[data-k=ok]').onclick = function () {
      var d = $('dlxC_date').value, t = $('dlxC_time').value;
      if (!d) { $('dlxC_date').focus(); note('Pick a follow-up date.'); return; }
      var rem = notes();
      if (!editing) { // let the page add it the usual way (same record, notification and list refresh)
        v.remarks = rem; v.owner = $('dlxC_owner').value.trim() || v.owner;
        try { if (typeof window.updateRealTimeHistory === 'function') window.updateRealTimeHistory(SD(), false); } catch (e) {}
        var di = $('dlModalDateInput'), ti = $('dlModalTimeInput');
        if (di) di.value = d; if (ti) ti.value = t;
        try { pendingFollowUpIndex = o.idx; pendingFollowUpRowBtn = o.btn || null; window.confirmFollowUpSchedule(); }
        catch (e) { v.addedAt = new Date().toLocaleString(); v.followUpDate = d; v.followUpTime = to12(t); put(v).then(function () { render(); }); }
        m._close(); setTimeout(paintRows, 300); return;
      }
      v.followUpDate = d; v.followUpTime = to12(t); v.remarks = rem; v.owner = $('dlxC_owner').value.trim() || 'N/A';
      DET.forEach(function (f) { var x = $('dlxE_' + f[0]).value.trim(); v[f[0]] = x || (f[0] === 'name' ? v.name : 'N/A'); });
      v.mc = key;
      put(v).then(function (ok) {
        if (!ok) { alert('Could not save. Try again.'); return; }
        m._close(); render(); paintRows(); note('Follow-up saved.');
        try { SD().forEach(function (r) { if (r && String(r.mc) === String(key)) { r.remarks = rem; r.owner = v.owner; DET.forEach(function (f) { r[f[0]] = v[f[0]]; }); } }); } catch (e) {}
      });
    };
    setTimeout(function () { var f = $('dlxN_truck'); if (f) f.focus(); }, 60);
  }
  /* ================= call outcome: "Follow up" opens the follow-up window, "Sale Closed" asks to confirm ================= */
  function digits(p) { var d = String(p || '').replace(/\D+/g, ''); return d.length > 10 ? d.slice(-10) : d; }
  function rowForPhone(ph) { var d = digits(ph), L = SD(); if (!d) return -1; for (var i = 0; i < L.length; i++) if (L[i] && digits(L[i].phone) === d) return i; return -1; }
  function rowBtn(idx) {
    var out = null;
    document.querySelectorAll('#resultsTable .premium-followup-btn').forEach(function (b) { var m = /addLeadToFollowUpList\((\d+)/.exec(b.getAttribute('onclick') || ''); if (m && +m[1] === idx) out = b; });
    return out;
  }
  function followUpFromCall(ph) {
    var idx = rowForPhone(ph), v = idx >= 0 ? SD()[idx] : null;
    all().then(function (l) {
      var d = digits(ph), rec = l.filter(function (x) { return (v && String(x.key) === String(v.mc)) || (d && digits(x.v && x.v.phone) === d); })[0];
      if (rec) { openCard({ mc: rec.key, rec: rec }); return; }
      if (v) { openCard({ idx: idx, btn: rowBtn(idx) }); return; }
      note('Call logged as Follow up. This number is not in the current lead list, so add it with the Follow button.', 4200);
    });
  }
  function getPending() { try { return pendingReviewPhone; } catch (e) { return null; } }
  function confirmSale(ph, done, back) {
    var idx = rowForPhone(ph), v = idx >= 0 ? SD()[idx] : {};
    var row = function (k, val) { return val ? '<div class="dlx-sale-row"><span>' + k + '</span><b>' + esc(val) + '</b></div>' : ''; };
    var m = modal('dlxSale', '<div class="dlx-card dlx-sale" role="dialog" aria-modal="true" aria-labelledby="dlxSaleT">' +
      '<button class="dlx-x" type="button" aria-label="Close">' + ico('x') + '</button>' +
      '<div class="dlx-head"><span class="dlx-ic">' + ico('trophy') + '</span><div><h3 id="dlxSaleT">Confirm the sale</h3><p>Did this carrier really sign up?</p></div></div>' +
      '<div class="dlx-body"><div class="dlx-sale-box">' + row('Company', na(v.name)) + row('MC', na(v.mc)) + row('Contact', niceName(v.owner)) + row('Phone', ph) + '</div>' +
      '<p class="dlx-sale-note">The call is logged as <b>Sale Closed</b> and counts on the calling leaderboard.</p></div>' +
      '<div class="dlx-foot"><span class="sp"></span><button type="button" class="btn-ghost" data-k="no">Not yet</button><button type="button" class="btn-ok" data-k="yes">' + ico('check') + 'Yes, sale closed</button></div></div>');
    var closed = false;
    m._close = function () { if (closed) return; closed = true; m.classList.remove('show'); back(); };
    m.querySelector('.dlx-x').onclick = m._close;
    m.querySelector('[data-k="no"]').onclick = m._close;
    m.querySelector('[data-k="yes"]').onclick = function () { if (closed) return; closed = true; m.classList.remove('show'); done(); };
    setTimeout(function () { var b = m.querySelector('[data-k="yes"]'); if (b) b.focus(); }, 60);
  }
  function hookOutcome() {
    var orig = window.submitCallDisposition;
    if (typeof orig !== 'function' || orig.__dlx) return !!(orig && orig.__dlx);
    var wrapped = function (status) {
      var self = this, args = arguments, ph = getPending();
      if (status === 'Sale Closed' && ph) {
        var dm = $('dlDispositionModal'); if (dm) dm.style.display = 'none';
        setTimeout(function () { // after the key press that picked it
          confirmSale(ph, function () { orig.apply(self, args); }, function () { // "Not yet": back to the list of outcomes
            if (dm && getPending()) { dm.style.display = 'flex'; try { window.dispSelect(DISPOSITIONS_IDX('Sale Closed')); } catch (e) {} }
          });
        }, 0);
        return;
      }
      var r = orig.apply(self, args);
      if (status === 'Follow up' && ph) setTimeout(function () { followUpFromCall(ph); }, 0);
      return r;
    };
    wrapped.__dlx = true; window.submitCallDisposition = wrapped; return true;
  }
  function DISPOSITIONS_IDX(name) { var opts = document.querySelectorAll('#dispOptions .disp-opt'), i = -1; opts.forEach(function (o, k) { if ((o.textContent || '').indexOf(name) >= 0) i = k; }); return i < 0 ? 0 : i; }
  (function tryHook(n) { if (!hookOutcome() && n < 60) setTimeout(function () { tryHook(n + 1); }, 250); })(0);
  document.addEventListener('keydown', function (e) { // Enter in the sale window = confirm (but not the same Enter that opened it)
    var m = $('dlxSale'); if (!m || !m.classList.contains('show') || e.defaultPrevented) return;
    if (e.key === 'Enter' && e.target && e.target.tagName !== 'BUTTON') { e.preventDefault(); var b = m.querySelector('[data-k="yes"]'); if (b) b.click(); }
  });

  function openEdit(mc) { find(mc).then(function (rec) { if (rec) openCard({ mc: rec.key, rec: rec }); else note('This carrier is not in your follow-ups.'); }); }
  window.dlEditFollowUp = openEdit;

  /* ================= backup: follow-ups are also kept in the company's Google Sheet (tab "FollowUps") =================
     The page keeps working from this browser's storage; every change is copied to the sheet a few seconds later.
     If this browser loses its data (crash, cleaned, new computer), the follow-ups come back from the sheet by themselves. */
  var BK = { url: null, at: 0, err: '', busy: false, again: false, t: null, ready: false };
  function sess() { try { return (typeof DL !== 'undefined' && DL.session && DL.session()) || null; } catch (e) { return null; } }
  function bkKey() { var x = sess(); return x ? 'dl_fu_bk_' + x.company + '_' + x.username : 'dl_fu_bk_'; }
  function synced() { try { return JSON.parse(localStorage.getItem(bkKey()) || '{}') || {}; } catch (e) { return {}; } }
  function setSynced(m) { try { localStorage.setItem(bkKey(), JSON.stringify(m)); } catch (e) {} }
  function hsh(str) { var h = 5381; for (var i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0; return String(h >>> 0); }
  function sheetUrl() {
    if (BK.url) return Promise.resolve(BK.url);
    var x = sess(); if (!x || !x.company || typeof DL === 'undefined' || !DL.company) return Promise.resolve('');
    return Promise.resolve(DL.company(x.company)).then(function (c) { BK.url = (c && c.sheetUrl) || ''; return BK.url; }, function () { return ''; });
  }
  function sheet(action, body) {
    return sheetUrl().then(function (url) {
      if (!url) throw new Error('NO_SHEET');
      var x = sess(); if (!x || !x.hash) throw new Error('BAD_LOGIN');
      return DL.sheetCall(url, Object.assign({ action: action, u: x.username, h: x.hash, name: x.name || '' }, body || {}), true);
    }).then(function (r) { if (!r) throw new Error('No answer from the Google Sheet'); if (r.error) throw new Error(r.error); return r; });
  }
  function tKey() { return bkKey() + '_del'; }
  function tombs() { try { return JSON.parse(localStorage.getItem(tKey()) || '{}') || {}; } catch (e) { return {}; } }
  function setTombs(m) { try { localStorage.setItem(tKey(), JSON.stringify(m)); } catch (e) {} }
  (function () { // a follow-up the agent removes is noted here, so only those are removed from the sheet too
    var P = window.IDBObjectStore && IDBObjectStore.prototype; if (!P || P.delete.__dlbk) return;
    var od = P.delete, nd = function (key) {
      try { if (this.name === 'followups' && key != null) { var m = tombs(); m[String(key)] = Date.now(); setTombs(m); setTimeout(bkSoon, 0); } } catch (e) {}
      return od.apply(this, arguments);
    };
    nd.__dlbk = true; P.delete = nd;
  })();
  function bkSoon() { if (!BK.ready) return; clearTimeout(BK.t); BK.t = setTimeout(backupNow, 4000); }
  function backupNow() {
    if (!BK.ready) return Promise.resolve();
    if (BK.busy) { BK.again = true; return Promise.resolve(); }
    BK.busy = true;
    return all().then(function (l) {
      var prev = synced(), cur = {}, put = [], del = [], tb = tombs();
      l.forEach(function (x) { var k = String(x.key); cur[k] = hsh(JSON.stringify(x.v)); if (prev[k] !== cur[k]) put.push(x.v); });
      // only follow-ups the agent removed leave the sheet; ones missing because the browser lost its data stay there
      Object.keys(tb).forEach(function (k) { if (!(k in cur)) del.push(k); });
      if (Object.keys(tb).some(function (k) { return k in cur; })) { Object.keys(cur).forEach(function (k) { delete tb[k]; }); setTombs(tb); } // added again
      if (!put.length && !del.length) return;
      var send = put.slice(0, 300);
      return sheet('fu_sync', { put: send, del: del }).then(function () {
        var next = Object.assign({}, synced());
        send.forEach(function (v) { var k = String(v.mc); next[k] = cur[k]; });
        del.forEach(function (k) { delete next[k]; });
        setSynced(next);
        var t2 = tombs(); del.forEach(function (k) { delete t2[k]; }); setTombs(t2);
        if (put.length > send.length) BK.again = true;
      });
    }).then(function () { BK.at = Date.now(); BK.err = ''; }, function (e) { BK.err = e.message || String(e); })
      .then(function () { BK.busy = false; paintBk(); if (BK.again) { BK.again = false; bkSoon(); } });
  }
  function pullMissing(onlyIfEmpty) { // bring back follow-ups that are in the sheet but not in this browser
    return all().then(function (l) {
      if (onlyIfEmpty && l.length) return 0;
      var have = {}, tb = tombs(); l.forEach(function (x) { have[String(x.key)] = 1; });
      return sheet('fu_pull').then(function (r) {
        var rows = (r.rows || []).filter(function (v) { return v && v.mc != null && !have[String(v.mc)] && !tb[String(v.mc)]; });
        if (!rows.length) return 0;
        return Promise.all(rows.map(put)).then(function () {
          var m = synced(); rows.forEach(function (v) { m[String(v.mc)] = hsh(JSON.stringify(v)); }); setSynced(m);
          try { if (typeof window.renderFollowUpItems === 'function') window.renderFollowUpItems(); } catch (e) {}
          paintRows(); return rows.length;
        });
      });
    });
  }
  var BKMSG = {
    NO_SHEET: 'Not backed up: no Google Sheet is linked yet (admin: Hub \u2192 Configure Your GS).',
    'bad action': 'Backup needs the new Google Sheet code: Hub \u2192 Configure Your GS \u2192 copy the code \u2192 paste it in Apps Script \u2192 Deploy \u2192 New version.',
    BAD_LOGIN: 'The Google Sheet did not accept this sign-in. Sign out and in again.',
    NOT_CLAIMED: 'The Google Sheet is not linked to the admin yet (Hub \u2192 Configure Your GS).'
  };
  function ago(ms) { var x = Math.round((Date.now() - ms) / 1000); return x < 10 ? 'just now' : x < 60 ? x + ' sec ago' : x < 3600 ? Math.round(x / 60) + ' min ago' : new Date(ms).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }); }
  function paintBk() {
    var list = $('drawerFollowUpList'); if (!list) return;
    var el = $('fuBk');
    if (!el) {
      el = document.createElement('div'); el.id = 'fuBk'; el.className = 'fu-bk';
      list.parentNode.insertBefore(el, list.nextSibling);
    }
    var bad = !!BK.err; // technical reasons stay in the console, the agent only sees a simple line
    if (bad) try { console.info('[Dispatch Link] follow-up backup:', BKMSG[BK.err] || BK.err); } catch (e) {}
    var txt = bad ? 'Saved on this computer' : BK.at ? 'Backed up \u00b7 ' + ago(BK.at) : 'Backing up\u2026';
    el.className = 'fu-bk' + (bad ? ' off' : '');
    el.innerHTML = '<span class="fu-bk-dot"></span><span class="fu-bk-t">' + esc(txt) + '</span><button type="button" class="fu-bk-r" title="Lost some follow-ups (browser cleaned, crash, new computer)? Bring them back from your backup.">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></svg>Get back lost follow-ups</button>';
    el.title = bad ? 'Your follow-ups are kept in this browser.' : 'Your follow-ups are also kept safe online. If this browser loses them, they come back.';
    el.querySelector('.fu-bk-r').onclick = function () {
      var b = this; b.disabled = true; b.lastChild.textContent = 'Bringing them back\u2026';
      pullMissing(false).then(function (n) { note(n ? n + ' follow-up' + (n > 1 ? 's' : '') + ' brought back.' : 'All your follow-ups are already here. Nothing was lost.', 4000); },
        function (e) { BK.err = e.message; note('Could not bring them back right now. Please try again in a little while.', 4500); })
        .then(function () { paintBk(); });
    };
  }
  css.textContent += [
    '.fu-bk{flex:none;display:flex;align-items:center;gap:8px;margin:0;padding:8px 2px 0;border-top:1px solid var(--line);font-size:12px;color:var(--mut)}',
    /* compact Follow-up drawer: more room for the list */
    '#dlFollowUpDrawer{gap:8px;padding:16px 16px 12px}',
    '#dlFollowUpDrawer .drawer-sub{display:none}',
    '#dlFollowUpDrawer .drawer-head{padding-bottom:0}',
    '#dlFollowUpDrawer .seg button{height:32px;display:inline-flex;align-items:center;justify-content:center;gap:7px}',
    '#dlFollowUpDrawer .fu-n{min-width:20px;height:18px;padding:0 6px;border-radius:9px;background:var(--surface2);color:var(--ink);font-size:11.5px;font-weight:600;line-height:18px;font-variant-numeric:tabular-nums}',
    '#dlFollowUpDrawer .seg button.active .fu-n{background:rgba(255,255,255,.25);color:#fff}',
    '#dlFollowUpDrawer .drawer-search .ds-field,#dlFollowUpDrawer .drawer-search .btn-ghost{height:36px}',
    '#dlFollowUpDrawer .drawer-search input{height:34px}',
    '#dlFollowUpDrawer .fu-bulk{padding:5px 6px 5px 12px;border-radius:9px}',
    '#dlFollowUpDrawer .fu-bulk label{font-size:13px}',
    '#dlFollowUpDrawer .fu-bulk .hc-btn{height:30px;padding:0 10px;font-size:12.5px}',
    '#dlFollowUpDrawer .fu-stats{display:none}',
    '.fu-bk-dot{flex:none;width:8px;height:8px;border-radius:50%;background:var(--ok,#12805c);box-shadow:0 0 0 3px color-mix(in srgb,var(--ok,#12805c) 18%,transparent)}',
    '.fu-bk.off .fu-bk-dot{background:var(--mut);box-shadow:none}',
    '.fu-bk-t{flex:1;min-width:0;line-height:1.4}',
    '.fu-bk-r svg{width:13px;height:13px;flex:none}',
    '.fu-bk-r{flex:none;display:inline-flex;align-items:center;gap:6px;height:26px;padding:0 9px;border:1px solid var(--line);border-radius:7px;background:var(--surface);color:var(--ink);font-size:12px;font-weight:600;cursor:pointer}.fu-bk-r:hover{border-color:var(--accent);color:var(--accent)}.fu-bk-r:disabled{opacity:.6;cursor:wait}'
  ].join('\n');
  function bkStart(n) {
    var x = sess();
    if (!DB() || !x || typeof DL === 'undefined' || !DL.sheetCall) { if (n < 120) setTimeout(function () { bkStart(n + 1); }, 500); return; }
    var origR = window.renderFollowUpItems; // the page's own changes (Follow button, drawer) also trigger a backup
    if (typeof origR === 'function' && !origR.__bk) { var wr = function () { var r = origR.apply(this, arguments); bkSoon(); return r; }; wr.__bk = true; window.renderFollowUpItems = wr; }
    BK.ready = true;
    var back = function (n) { if (n) note('Welcome back! ' + n + ' follow-up' + (n > 1 ? 's were' : ' was') + ' brought back from your backup.', 6000); };
    pullMissing(false).then(back, function (e) { BK.err = e.message; }).then(backupNow);
    setInterval(function () { // if follow-ups that were backed up are suddenly missing here (storage wiped), bring them back
      all().then(function (l) {
        var have = {}, tb = tombs(), lost = false; l.forEach(function (x) { have[String(x.key)] = 1; });
        Object.keys(synced()).forEach(function (k) { if (!have[k] && !tb[k]) lost = true; });
        return lost ? pullMissing(false).then(back) : 0;
      }).catch(function () {}).then(function () { backupNow(); paintBk(); });
    }, 60000);
    document.addEventListener('visibilitychange', function () { if (document.hidden) backupNow(); });
  }
  bkStart(0);

  /* ---------------- keep things painted ---------------- */
  function watch(id, fn) {
    var el = $(id); if (!el || !window.MutationObserver) return false;
    var t = null; new MutationObserver(function () { clearTimeout(t); t = setTimeout(fn, 40); }).observe(el, { childList: true, subtree: true });
    fn(); return true;
  }
  function marks() { // hide the Remarks header (its cells are hidden by CSS)
    var tb = $('resultsTable'), tbl = tb && tb.closest('table'); if (!tbl) return;
    tbl.querySelectorAll('thead th').forEach(function (th) { if (/^\s*remarks\s*$/i.test(th.textContent)) th.classList.add('dlx-hide'); });
  }
  function fuCounts() { // the two big number boxes are hidden; their numbers sit on the Due today / All saved buttons
    var st = document.querySelector('#drawerFollowUpList .fu-stats'), b = st ? st.querySelectorAll('b') : [];
    var setN = function (id, n) {
      var btn = $(id); if (!btn) return; var sp = btn.querySelector('.fu-n');
      if (!sp) { sp = document.createElement('span'); sp.className = 'fu-n'; btn.appendChild(sp); }
      sp.textContent = n;
    };
    var empty = !!document.querySelector('#drawerFollowUpList .fu-empty') && !st;
    if (b.length >= 2) { setN('fubtnToday', b[0].textContent); setN('fubtnAll', b[1].textContent); }
    else if (empty && !document.getElementById('followUpSearchInput').value) { setN('fubtnToday', 0); setN('fubtnAll', 0); }
  }
  var W = {};
  function start() {
    if (!W.a) W.a = watch('resultsTable', function () { paintRows(); marks(); });
    if (!W.b) W.b = watch('drawerFollowUpList', function () { decorateCards(); fuCounts(); if (!$('fuBk')) paintBk(); });
    if (!W.a || !W.b) setTimeout(start, 800);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
