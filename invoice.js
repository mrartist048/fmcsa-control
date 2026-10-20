/* Dispatch Link | Admin panel: invoice for a client, in the Dispatch Link invoice design.
   Directory -> "Invoice" on a client row -> details filled in from that client -> Download PDF / Print.
   Load this AFTER the panel's own script. */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var LS = { get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };
  var LOGO = 'data:image/png;base64,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'; // the Dispatch Link logo, kept inside this file so it always shows
  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  var TERMS = 'Thank you for choosing DispatchLink! All amounts are in Pakistani Rupees (RS). Please remit payment according to your agreed enterprise billing terms. For support or questions regarding this invoice, contact us at 03700684849.';

  function num(v) { var n = parseFloat(String(v == null ? '' : v).replace(/[^0-9.]/g, '')); return isFinite(n) ? n : 0; }
  function money(n) { return 'RS ' + (Math.round(n * 100) / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function moneyN(n) { return (Math.round(n * 100) / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function longDate(iso) { var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || ''); if (!m) return iso || ''; return MONTHS[+m[2] - 1] + ' ' + (+m[3]) + ', ' + m[1]; }
  function todayIso() { var d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function nextNo(iso) { // DL-2026-0917, then DL-2026-0917-2 for a second invoice on the same day
    var base = 'DL-' + iso.slice(0, 4) + '-' + iso.slice(5, 7) + iso.slice(8, 10), key = 'dl_inv_seq_' + base, n = (parseInt(LS.get(key), 10) || 0) + 1;
    return { no: n > 1 ? base + '-' + n : base, key: key, n: n };
  }

  /* ---------------- the invoice itself (same layout as the template) ---------------- */
  function invoiceHTML(d) {
    var qty = Math.max(0, num(d.qty)), unit = num(d.unit), sub = qty * unit, disc = Math.min(num(d.discount), sub), total = sub - disc;
    var lines = [d.line1, d.line2, d.line3].filter(function (x) { return String(x || '').trim(); });
    var active = /active/i.test(d.status || '');
    return '<div class="dlinv">' +
      '<div class="dlinv-top">' +
        '<div class="dlinv-brand"><img src="' + LOGO + '" alt=""><div><b>DispatchLink</b><small>dispatchlink.online</small></div></div>' +
        '<div class="dlinv-meta"><h1>INVOICE</h1>' +
          '<div><b>Invoice #:</b> ' + esc(d.no) + '</div><div><b>Date:</b> ' + esc(longDate(d.date)) + '</div><div><b>Due Date:</b> ' + esc(d.due || 'Upon Receipt') + '</div></div>' +
      '</div>' +
      '<div class="dlinv-hr"></div>' +
      '<div class="dlinv-parties">' +
        '<div><h6>Billed by</h6><b>DispatchLink CRM &amp; Tools</b><p>Phone: 03700684849<br>Web: dispatchlink.online</p></div>' +
        '<div><h6>Billed to</h6><b>' + esc(d.client || '') + '</b><p>' + lines.map(esc).join('<br>') + '</p>' +
          (d.status ? '<p class="dlinv-st">Status: <span class="' + (active ? '' : 'off') + '">' + esc(d.status) + '</span></p>' : '') + '</div>' +
      '</div>' +
      '<table class="dlinv-tbl"><thead><tr><th class="d">Description</th><th class="q">Qty /<br>Users</th><th class="u">Unit<br>Price</th><th class="a">Amount</th></tr></thead>' +
        '<tbody><tr><td class="d"><b>' + esc(d.desc || '') + '</b>' + (d.desc2 ? '<small>' + esc(d.desc2) + '</small>' : '') + '</td>' +
          '<td class="q"><b>' + esc(qty) + '</b></td><td class="u">RS<br>' + moneyN(unit) + '</td><td class="a"><b>RS<br>' + moneyN(sub) + '</b></td></tr></tbody></table>' +
      '<div class="dlinv-sum">' +
        '<div class="r"><span>Subtotal</span><span>' + money(sub) + '</span></div>' +
        (disc > 0 ? '<div class="r disc"><span>Discount Applied</span><span>- ' + money(disc) + '</span></div>' : '') +
        '<div class="r tot"><span>Total Amount</span><span>' + money(total) + '</span></div>' +
      '</div>' +
      '<div class="dlinv-hr"></div>' +
      '<p class="dlinv-terms"><b>Payment Terms:</b> ' + esc(d.terms || TERMS) + '</p>' +
    '</div>';
  }
  var INV_CSS = [
    '.dlinv{box-sizing:border-box;width:794px;min-height:1123px;padding:76px 76px 60px;background:#fff;color:#0f172a;font-family:"Helvetica Neue",Helvetica,Arial,sans-serif;font-size:13px;line-height:1.5;text-align:left}',
    '.dlinv *{box-sizing:border-box}',
    '.dlinv-top{display:flex;justify-content:space-between;align-items:flex-start}',
    '.dlinv-brand{display:flex;align-items:center;gap:14px}.dlinv-brand img{width:52px;height:52px;border-radius:50%;object-fit:cover}',
    '.dlinv-brand b{display:block;font-size:26px;font-weight:700;letter-spacing:-.3px;line-height:1.1;color:#0f172a}.dlinv-brand small{display:block;margin-top:6px;font-size:12px;color:#64748b}',
    '.dlinv-meta{text-align:right;font-size:12px;color:#475569;line-height:1.75}.dlinv-meta b{color:#334155;font-weight:700}',
    '.dlinv-meta h1{margin:0 0 6px;font-size:33px;font-weight:700;letter-spacing:.5px;color:#2563eb;line-height:1.1}',
    '.dlinv-hr{height:1px;background:#e2e8f0;margin:30px 0}',
    '.dlinv-parties{display:flex;gap:30px;margin-bottom:30px}.dlinv-parties>div{flex:1}',
    '.dlinv-parties h6{margin:0 0 12px;font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#64748b}',
    '.dlinv-parties b{display:block;font-size:15px;font-weight:700;color:#0f172a;margin-bottom:4px}',
    '.dlinv-parties p{margin:0;font-size:12.5px;color:#334155;line-height:1.6}',
    '.dlinv-st{margin-top:4px!important}.dlinv-st span{display:inline-block;margin-left:6px;padding:2px 10px;border-radius:11px;background:#dbeafe;color:#1d4ed8;font-size:11px;font-weight:700}',
    '.dlinv-st span.off{background:#fee2e2;color:#b91c1c}',
    '.dlinv-tbl{width:100%;border-collapse:collapse;border-spacing:0;margin-bottom:24px}.dlinv-tbl thead,.dlinv-tbl thead tr{background:#0f172a}',
    '.dlinv-tbl th{background:#0f172a;color:#fff;font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;padding:16px 14px;line-height:1.35;vertical-align:middle}',
    '.dlinv-tbl td{padding:18px 14px;border-bottom:1px solid #e2e8f0;vertical-align:top;font-size:12.5px}',
    '.dlinv-tbl .d{text-align:left;width:52%}.dlinv-tbl .q{text-align:center;width:14%}.dlinv-tbl .u{text-align:right;width:16%;color:#475569}.dlinv-tbl .a{text-align:right;width:18%}',
    '.dlinv-tbl th,.dlinv-tbl td{border:0!important}.dlinv-tbl td{border-bottom:1px solid #e2e8f0!important}',
    '.dlinv-tbl th,.dlinv-tbl th.u{color:#fff!important}.dlinv-tbl th.a{border-left:1px solid #ffffff!important}',
    '.dlinv-tbl td.d b{display:block;font-size:13px;color:#0f172a}.dlinv-tbl td.d small{display:block;margin-top:4px;font-size:11.5px;color:#64748b;line-height:1.55}',
    '.dlinv-tbl td.q b,.dlinv-tbl td.a b{font-weight:700;color:#0f172a}',
    '.dlinv-sum{width:50%;margin-left:auto}',
    '.dlinv-sum .r{display:flex;justify-content:space-between;padding:14px 10px;font-size:12.5px;color:#475569;border-bottom:1px solid #e2e8f0}',
    '.dlinv-sum .r.disc{background:#ecfdf5;color:#059669;font-weight:700}',
    '.dlinv-sum .r.tot{background:#f8fafc;border-top:2px solid #0f172a;border-bottom:2px solid #0f172a;color:#0f172a;font-size:15px;font-weight:700;padding:16px 10px}',
    '.dlinv-terms{margin:0;font-size:11.5px;color:#64748b;line-height:1.7}.dlinv-terms b{color:#475569}'
  ].join('\n');

  /* ---------------- the window in the panel ---------------- */
  var F = ['no', 'date', 'due', 'client', 'line1', 'line2', 'line3', 'status', 'desc', 'desc2', 'qty', 'unit', 'discount', 'terms'];
  var CUR = null;
  function ui() {
    if ($('invModal')) return;
    var st = document.createElement('style');
    st.textContent = INV_CSS + '\n' + [
      '#invModal{justify-content:center;align-items:center}#invModal .modal{width:min(1080px,calc(100vw - 24px));max-width:none;max-height:92vh;display:flex;flex-direction:column;padding:0;overflow:hidden;margin:0 auto}',
      '.inv-head{display:flex;align-items:center;justify-content:space-between;padding:14px 18px;border-bottom:1px solid var(--border-color)}',
      '.inv-head h3{margin:0;font-size:16px}.inv-head small{display:block;color:var(--text-muted);font-size:11px;margin-top:2px}',
      '.inv-body{display:grid;grid-template-columns:330px minmax(0,1fr);min-height:0;flex:1}',
      '.inv-form{padding:14px 16px;overflow:auto;border-right:1px solid var(--border-color)}',
      '.inv-form label{display:block;font-size:10.5px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;color:var(--text-muted);margin:10px 0 4px}',
      '.inv-form input,.inv-form textarea{width:100%;box-sizing:border-box;padding:8px 10px;border-radius:8px;border:1px solid var(--border-color);background:#0b0f19;color:var(--text-main);font:inherit;font-size:12.5px}',
      '.inv-form textarea{min-height:70px;resize:vertical}',
      '.inv-row{display:grid;grid-template-columns:1fr 1fr;gap:8px}.inv-row3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px}',
      '.inv-sec{margin-top:16px;padding-top:10px;border-top:1px solid var(--border-color);font-size:11px;font-weight:700;color:var(--text-main)}',
      '.inv-prev{background:#e5e7eb;overflow:auto;padding:18px;min-width:0}',
      '.inv-paper{width:794px;transform-origin:top left;box-shadow:0 6px 24px rgba(0,0,0,.25);margin-left:auto;margin-right:auto}',
      '.inv-foot{display:flex;gap:8px;justify-content:flex-end;align-items:center;padding:12px 18px;border-top:1px solid var(--border-color)}',
      '.inv-note{flex:1;font-size:11px;color:var(--text-muted);background:none;border:0;padding:0;margin:0}',
      '.inv-btn{height:36px;padding:0 16px;border-radius:9px;border:1px solid var(--border-color);background:#1f2937;color:var(--text-main);font-weight:600;font-size:13px;cursor:pointer}',
      '.inv-btn.main{background:#2563eb;border-color:#2563eb;color:#fff}.inv-btn:disabled{opacity:.6;cursor:wait}',
      '@media(max-width:860px){.inv-body{grid-template-columns:1fr}.inv-form{border-right:0;border-bottom:1px solid var(--border-color);max-height:40vh}}'
    ].join('\n');
    document.head.appendChild(st);
    var m = document.createElement('div'); m.className = 'modal-bg'; m.id = 'invModal';
    m.innerHTML = '<div class="modal">' +
      '<div class="inv-head"><div><h3>Invoice</h3><small id="invFor"></small></div><button class="close-x" id="invClose">✕</button></div>' +
      '<div class="inv-body"><div class="inv-form">' +
        '<div class="inv-row"><div><label>Invoice #</label><input id="inv_no"></div><div><label>Date</label><input id="inv_date" type="date"></div></div>' +
        '<label>Due date</label><input id="inv_due">' +
        '<div class="inv-sec">Billed to</div>' +
        '<label>Client</label><input id="inv_client">' +
        '<label>Lines under the name</label><input id="inv_line1"><input id="inv_line2" style="margin-top:6px"><input id="inv_line3" style="margin-top:6px">' +
        '<label>Status</label><input id="inv_status">' +
        '<div class="inv-sec">Item</div>' +
        '<label>Description</label><input id="inv_desc"><input id="inv_desc2" style="margin-top:6px">' +
        '<div class="inv-row3"><div><label>Qty / users</label><input id="inv_qty" type="number" min="0"></div><div><label>Unit price (RS)</label><input id="inv_unit" inputmode="decimal"></div><div><label>Discount (RS)</label><input id="inv_discount" inputmode="decimal"></div></div>' +
        '<label>Payment terms</label><textarea id="inv_terms"></textarea>' +
      '</div><div class="inv-prev" id="invPrev"><div class="inv-paper" id="invPaper"></div></div></div>' +
      '<div class="inv-foot"><span class="inv-note" id="invNote"></span><button class="inv-btn" id="invPrint">Print</button><button class="inv-btn main" id="invPdf">Download PDF</button></div>' +
    '</div>';
    document.body.appendChild(m);
    m.addEventListener('click', function (e) { if (e.target === m) close(); });
    $('invClose').onclick = close;
    F.forEach(function (k) { $('inv_' + k).addEventListener('input', paint); });
    $('invPdf').onclick = pdf; $('invPrint').onclick = printIt;
    window.addEventListener('resize', fit);
  }
  function read() { var d = {}; F.forEach(function (k) { d[k] = $('inv_' + k).value; }); return d; }
  function paint() { $('invPaper').innerHTML = invoiceHTML(read()); fit(); }
  function fit() { // shrink the A4 preview to the space there is
    var box = $('invPrev'), p = $('invPaper'); if (!box || !p) return;
    var s = Math.min(1, (box.clientWidth - 36) / 794);
    p.style.transform = 'scale(' + s + ')'; p.style.marginBottom = (-(1 - s) * p.offsetHeight) + 'px';
    if (s < 1) { p.style.marginLeft = '0'; p.style.marginRight = (-(1 - s) * 794) + 'px'; } else { p.style.marginLeft = p.style.marginRight = 'auto'; }
  }
  function close() { var m = $('invModal'); if (m) m.style.display = 'none'; }

  function open(u, full) {
    ui();
    full = full || {};
    var date = todayIso(), no = nextNo(date), qty = parseInt(full.maxLaptops || u.maxLaptops, 10) || 1;
    var paid = num(full.totalPayment), lastUnit = num(LS.get('dl_inv_unit'));
    var unit = paid > 0 ? Math.round((paid / qty) * 100) / 100 : (lastUnit || 2000);
    var d = full.expires || u.expires, days = u.days;
    var status = days !== null && days !== undefined && days < 0 ? 'Expired' : 'Active Client';
    var period = /^\d{4}-\d{2}-\d{2}$/.test(full.joiningDate || '') && /^\d{4}-\d{2}-\d{2}$/.test(d || '') ? 'Service period: ' + longDate(full.joiningDate) + ' – ' + longDate(d) : '';
    CUR = { u: u, seq: no };
    var v = {
      no: no.no, date: date, due: 'Upon Receipt',
      client: full.name || u.company || u.username,
      line1: full.ownerName ? 'Attn: ' + full.ownerName : 'Client Account / Logistics Partner',
      line2: full.email || 'USA Dispatch Operations', line3: full.number ? 'Phone: ' + full.number : '',
      status: status,
      desc: 'DispatchLink CRM - Professional Tier Access',
      desc2: 'Carrier Data Integration & Multi-User Dispatch Management Dashboard' + (period ? '\n' : ''),
      qty: qty, unit: unit, discount: 0, terms: LS.get('dl_inv_terms') || TERMS
    };
    if (period) v.desc2 = 'Carrier Data Integration & Multi-User Dispatch Management Dashboard · ' + period;
    F.forEach(function (k) { $('inv_' + k).value = v[k]; });
    $('invFor').textContent = 'For ' + u.username + (u.dbName ? ' · ' + u.dbName : '');
    $('invNote').textContent = paid > 0 ? 'Unit price worked out from the saved Total Payment (' + full.totalPayment + ' ÷ ' + qty + ' users). Change anything on the left.' : 'Change anything on the left, the invoice updates as you type.';
    $('invModal').style.display = 'flex';
    paint();
  }
  window.dlOpenInvoice = open;

  function fileName(d) { return (d.no || 'invoice') + '_' + String(d.client || '').replace(/[^\w.-]+/g, '_').slice(0, 40) + '.pdf'; }
  function remember(d) {
    if (CUR && CUR.seq && d.no === CUR.seq.no) LS.set(CUR.seq.key, String(CUR.seq.n));
    LS.set('dl_inv_unit', String(num(d.unit)));
    if (d.terms && d.terms !== TERMS) LS.set('dl_inv_terms', d.terms);
  }
  function loadLib() {
    if (window.html2pdf) return Promise.resolve();
    return new Promise(function (res, rej) {
      var s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
      s.onload = function () { res(); }; s.onerror = function () { rej(new Error('lib')); };
      document.head.appendChild(s);
    });
  }
  function pdf() {
    var d = read(), b = $('invPdf'); b.disabled = true; b.textContent = 'Making PDF…';
    loadLib().then(function () {
      var holder = document.createElement('div');
      holder.style.cssText = 'position:fixed;left:-10000px;top:0;width:794px;background:#fff';
      holder.innerHTML = invoiceHTML(d); document.body.appendChild(holder);
      var img = holder.querySelector('img');
      var ready = img && !img.complete ? new Promise(function (r) { img.onload = img.onerror = r; }) : Promise.resolve();
      return ready.then(function () {
        return window.html2pdf().set({ margin: 0, filename: fileName(d), image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
          jsPDF: { unit: 'px', format: [794, 1123], orientation: 'portrait', hotfixes: ['px_scaling'] } }).from(holder.firstChild).save();
      }).then(function () { holder.remove(); remember(d); toastMsg('Invoice ' + d.no + ' downloaded.', 'ok'); }, function (e) { holder.remove(); throw e; });
    }).catch(function () { toastMsg('Could not make the PDF here. Use Print and choose "Save as PDF".', 'err'); })
      .then(function () { b.disabled = false; b.textContent = 'Download PDF'; });
  }
  function printIt() {
    var d = read(), w = window.open('', '_blank');
    if (!w) return toastMsg('Allow pop-ups for this page to print.', 'err');
    var base = location.href.replace(/[^/]*$/, '');
    w.document.write('<!doctype html><html><head><meta charset="utf-8"><title>' + esc(d.no) + '</title><base href="' + esc(base) + '"><style>@page{size:A4;margin:0}html,body{margin:0;background:#fff}' + INV_CSS +
      '.dlinv{width:210mm;min-height:297mm}</style></head><body>' + invoiceHTML(d) + '<script>window.onload=function(){setTimeout(function(){window.print()},250)}<\/script></body></html>');
    w.document.close(); remember(d);
  }
  function toastMsg(m, k) { try { if (typeof toast === 'function') return toast(m, k); } catch (e) {} alert(m); }

  /* ---------------- "Invoice" button on every client row ---------------- */
  var tb = $('allUsersTableBody');
  if (tb) {
    new MutationObserver(addButtons).observe(tb, { childList: true });
    addButtons();
    tb.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-inv]'); if (!b) return;
      e.stopPropagation();
      var tr = b.closest('tr'), name = tr.dataset.u, db = tr.dataset.db, list = [];
      try { list = globalUsersCache; } catch (x) {}
      var u = (list || []).find(function (x) { return x.username === name && x.dbUrl === db; }) || { username: name, dbUrl: db, maxLaptops: 1 };
      b.disabled = true;
      fetch(db + 'allowedUsers/' + encodeURIComponent(name) + '.json').then(function (r) { return r.json(); }).catch(function () { return null; })
        .then(function (full) { b.disabled = false; open(u, full || {}); });
    }, true);
  }
  function addButtons() {
    document.querySelectorAll('#allUsersTableBody tr[data-u]').forEach(function (tr) {
      var g = tr.querySelector('.action-btn-group'); if (!g || g.querySelector('[data-inv]')) return;
      var b = document.createElement('button'); b.className = 'action-edit-btn'; b.dataset.inv = '1'; b.title = 'Make an invoice for this client'; b.textContent = '🧾 Invoice';
      var edit = g.querySelector('[data-a="edit"]'); g.insertBefore(b, edit || null);
    });
  }
})();
