/* Dispatch Link CRM: email signature for the one-click Send button.
   - Email setup gets a Signature section (name, title, company, phone, website, WhatsApp button, logo).
     It is kept ONLY in this browser (IndexedDB "dl_mail"), so every sales agent has their own, and
     nothing goes to Firebase or a Google Sheet. "Delete signature" removes it from this browser.
   - Send works as before: the email opens in the app Windows/Chrome uses for email links
     (Thunderbird, Outlook, Gmail...). To and Subject are filled in, and the designed message with the
     signature is copied: click inside the message, press Ctrl+V, then Send.
   Load AFTER email-names.js. */
(function () {
  if (window.__dlCrmMail) return; window.__dlCrmMail = true;
  var $ = function (id) { return document.getElementById(id); };
  /* storage: this browser only (IndexedDB), with a copy in memory so reading is instant */
  var MEM = {}, IDB = null;
  function idb() {
    if (IDB) return IDB;
    IDB = new Promise(function (res) {
      try {
        var rq = indexedDB.open('dl_mail', 1);
        rq.onupgradeneeded = function () { rq.result.createObjectStore('kv'); };
        rq.onsuccess = function () { res(rq.result); };
        rq.onerror = rq.onblocked = function () { res(null); };
      } catch (e) { res(null); }
    });
    return IDB;
  }
  function idbDo(fn) { return idb().then(function (d) { if (!d) return; return new Promise(function (res) { try { var tx = d.transaction('kv', 'readwrite'); fn(tx.objectStore('kv')); tx.oncomplete = tx.onerror = tx.onabort = function () { res(); }; } catch (e) { res(); } }); }); }
  var LS = {
    get: function (k) { return MEM[k] == null ? null : MEM[k]; },
    set: function (k, v) { MEM[k] = v; idbDo(function (st) { st.put(v, k); }); },
    del: function (k) { delete MEM[k]; idbDo(function (st) { st['delete'](k); }); }
  };
  var READY = idb().then(function (d) {
    if (!d) return;
    return new Promise(function (res) {
      try {
        var st = d.transaction('kv', 'readonly').objectStore('kv'), rq = st.openCursor();
        rq.onsuccess = function () { var c = rq.result; if (c) { MEM[c.key] = c.value; c['continue'](); } else res(); };
        rq.onerror = function () { res(); };
      } catch (e) { res(); }
    });
  }).then(function () { // move an older copy out of localStorage
    ['dl_sig', 'dl_sig_logo', 'dl_sig_logo_dim'].forEach(function (k) {
      try { var v = localStorage.getItem(k); if (v != null) { if (MEM[k] == null) LS.set(k, v); localStorage.removeItem(k); } } catch (e) {}
    });
    try { localStorage.removeItem('dl_mail_app'); } catch (e) {}
  });
  var F = window.DLMailFormat || null;
  var origSend = window.triggerOneClickEmailPitch;
  var SK = 'dl_sig', LK = 'dl_sig_logo', DK = 'dl_sig_logo_dim';
  var FIELDS = [['name', 'Your name', 'David Parker'], ['title', 'Job title', 'Dispatch Manager'], ['company', 'Company', 'Loadify LLC'],
    ['phone', 'Phone', '+1 406 555 0100'], ['site', 'Website', 'loadifyllc.com'], ['wa', 'WhatsApp number', '14065550100']];

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function note(msg, ms) {
    if (typeof window.showPremiumNotification === 'function') { window.showPremiumNotification(msg, ms || 6000); return; }
    var t = document.createElement('div'); t.textContent = msg;
    t.style.cssText = 'position:fixed;left:50%;bottom:28px;transform:translateX(-50%);z-index:99999;max-width:90vw;padding:12px 18px;border-radius:12px;background:#0b1426;color:#fff;font:14px Arial,sans-serif';
    document.body.appendChild(t); setTimeout(function () { try { t.remove(); } catch (e) {} }, ms || 6000);
  }
  var KEEP = { llc: 'LLC', inc: 'Inc', co: 'Co', corp: 'Corp', ltd: 'Ltd', lp: 'LP', llp: 'LLP', pllc: 'PLLC', usa: 'USA', us: 'US', dba: 'DBA', ii: 'II', iii: 'III' };
  function niceCompany(c) { // "SAMPLE LOGISTICS LLC" -> "Sample Logistics LLC"
    c = String(c || '').replace(/\s+/g, ' ').trim();
    if (!c || /[a-z]/.test(c)) return c; // already mixed case: keep as typed
    return c.toLowerCase().replace(/[a-z0-9&']+/g, function (w) { return KEEP[w] || (/^[a-z]&[a-z]$/.test(w) ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1)); });
  }
  function ico(n) { return '<svg class="ico"><use href="#i-' + n + '"/></svg>'; }

  /* ---------------- signature ---------------- */
  function sig() { var g = null; try { g = JSON.parse(LS.get(SK) || 'null'); } catch (e) {} return g && typeof g === 'object' ? g : { on: false }; }
  function sigOn(g) { return g && g.on && (g.name || g.company); }
  function logo() { var v = LS.get(LK) || ''; return /^data:image\/(png|jpeg);base64,/.test(v) ? v : ''; }
  /* Mail-safe signature: uses old-style attributes (bgcolor, <font>, <b>, cellpadding) as well as styles,
     because Thunderbird removes all style="" from emails opened by a link. mode 'link' = no logo
     (an email opened by a link may only carry text, so the logo comes with Ctrl+V). */
  function sigHtml(g, mode) {
    if (!sigOn(g)) return '';
    var wa = String(g.wa || '').replace(/[^0-9]/g, ''), site = String(g.site || '').trim(), href = site && !/^https?:\/\//i.test(site) ? 'https://' + site : site;
    var init = esc(String(g.company || g.name || '?').trim().charAt(0).toUpperCase());
    var src = mode === 'link' ? '' : logo(), dm = /^(\d{2,3})x(\d{2})$/.exec(LS.get(DK) || ''), lw = dm ? Math.min(150, +dm[1]) : 46, lh = dm ? +dm[2] : 46;
    var FACE = ' face="Arial, Helvetica, sans-serif"';
    var lg = mode === 'link' ? '' : src
      ? '<td valign="top" width="' + lw + '" style="vertical-align:top;padding-right:14px"><img src="' + src + '" width="' + lw + '" height="' + lh + '" alt="" border="0" style="display:block;width:' + lw + 'px;height:' + lh + 'px;border:0' + (lw === lh ? ';border-radius:10px' : '') + '"></td>'
      : '<td valign="top" width="60" style="vertical-align:top;padding-right:14px"><table cellpadding="0" cellspacing="0" border="0"><tr><td width="46" height="46" align="center" valign="middle" bgcolor="#1E3A8A" style="width:46px;height:46px;border-radius:10px;background:#1E3A8A;text-align:center"><font color="#ffffff" size="4"' + FACE + '><b>' + init + '</b></font></td></tr></table></td>';
    var line2 = [g.title, g.company].filter(Boolean).map(esc).join(' &middot; ');
    var line3 = [g.phone ? esc(g.phone) : '', site ? '<a href="' + esc(href) + '" style="color:#1E3A8A;text-decoration:none"><font color="#1E3A8A">' + esc(site.replace(/^https?:\/\//i, '')) + '</font></a>' : ''].filter(Boolean).join(' &nbsp;|&nbsp; ');
    var btn = wa ? '<table cellpadding="0" cellspacing="0" border="0"><tr><td height="8"></td></tr></table><table cellpadding="6" cellspacing="0" border="0"><tr><td bgcolor="#25D366" align="center" style="background:#25D366;border-radius:6px;padding:7px 14px">' +
      '<a href="https://wa.me/' + wa + '" style="color:#ffffff;text-decoration:none;font:bold 13px Arial,Helvetica,sans-serif"><font color="#ffffff"' + FACE + ' size="2"><b>&nbsp;&nbsp;Chat on WhatsApp&nbsp;&nbsp;</b></font></a></td></tr></table>' : '';
    return '<div class="dl-sig" style="margin-top:18px;padding-top:14px;border-top:1px solid #E5E7EB"><br><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>' + lg +
      '<td valign="top" style="vertical-align:top;font-family:Arial,Helvetica,sans-serif;line-height:1.45"><font' + FACE + '>' +
      (g.name ? '<font size="3" color="#111827" style="font-size:15px;color:#111827"><b>' + esc(g.name) + '</b></font><br>' : '') +
      (line2 ? '<font size="2" color="#4B5563" style="font-size:13px;color:#4B5563">' + line2 + '</font><br>' : '') +
      (line3 ? '<font size="2" color="#4B5563" style="font-size:13px;color:#4B5563">' + line3 + '</font><br>' : '') + btn +
      '</font></td></tr></table></div>';
  }
  function sigText(g) {
    if (!sigOn(g)) return '';
    var wa = String(g.wa || '').replace(/[^0-9]/g, ''), l = [];
    if (g.name) l.push(g.name);
    if (g.title || g.company) l.push([g.title, g.company].filter(Boolean).join(', '));
    if (g.phone) l.push(g.phone);
    if (g.site) l.push(g.site);
    if (wa) l.push('WhatsApp: https://wa.me/' + wa);
    return '\n\n' + l.join('\n');
  }

  /* ---------------- styles ---------------- */
  var css = document.createElement('style');
  css.textContent = [
    '#dlEmailSetupModal .es-modal{width:1000px}#dlEmailSetupModal .es-body{grid-template-columns:1fr 1fr}',
    '@media (max-width:860px){#dlEmailSetupModal .es-body{grid-template-columns:1fr}}',
    '.ms-srow{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:0 0 7px}.ms-srow label{margin:0!important}.ms-srow span{display:flex;gap:6px}',
    '.ms-chip{height:26px;padding:0 10px;border:0;border-radius:99px;background:var(--accent-soft);color:var(--accent);font:600 12px var(--mono);cursor:pointer}.ms-chip:hover{background:var(--accent);color:#fff}',
    '.ms-sec{margin-top:20px;padding-top:18px;border-top:1px solid var(--line2)}',
    '.ms-head{display:flex;align-items:center;gap:10px;margin-bottom:12px}.ms-head b{font-size:14px;color:var(--ink)}.ms-head small{color:var(--mut);font-size:12px}.ms-head .sp{flex:1}',
    '.ms-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px 12px}',
    '.es-form .ms-grid label{display:block;margin:0 0 5px;font-weight:600;font-size:12.5px;color:var(--ink2)}',
    '.ms-grid input{width:100%;height:38px}',
    '.ms-logo{display:flex;align-items:center;gap:12px;margin-top:12px;padding:10px 12px;border:1px dashed var(--line);border-radius:12px;background:var(--surface2)}',
    '.ms-logo .lp{display:flex;align-items:center;justify-content:center;min-width:46px;height:46px;border-radius:10px;background:#1E3A8A;color:#fff;font:700 18px Arial,sans-serif;overflow:hidden}',
    '.ms-logo .lp img{display:block;height:46px;width:auto;max-width:150px}',
    '.ms-logo .lt{flex:1;font-size:12.5px;color:var(--mut);line-height:1.4}.ms-logo .lt b{display:block;color:var(--ink);font-size:13px}',
    '.ms-btn{height:34px;padding:0 12px;border:1px solid var(--line);border-radius:9px;background:var(--surface);color:var(--ink2);font:600 12.5px inherit;cursor:pointer;white-space:nowrap;display:inline-flex;align-items:center;gap:6px}',
    '.ms-btn:hover{border-color:var(--accent);color:var(--accent)}.ms-btn.del:hover{border-color:var(--bad);color:var(--bad)}.ms-btn .ico{width:14px;height:14px}',
    '.ms-sw{position:relative;width:38px;height:22px;flex:none;border-radius:99px;background:var(--line);border:0;cursor:pointer;transition:background .15s}',
    '.ms-sw::after{content:"";position:absolute;left:3px;top:3px;width:16px;height:16px;border-radius:50%;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.25);transition:transform .15s}',
    '.ms-sw[aria-checked=true]{background:var(--accent)}.ms-sw[aria-checked=true]::after{transform:translateX(16px)}',
    '.ms-off .ms-grid,.ms-off .ms-logo{opacity:.45;pointer-events:none}',
    '#esPrevBody .dl-sig table{border:0!important;box-shadow:none!important;background:none!important;width:auto!important;margin:0!important}',
    '#esPrevBody .dl-sig td{border:0!important;padding:0!important;background:none!important}#esPrevBody .dl-sig td:first-child{padding-right:12px!important}',
    '[data-theme=dark] #esPrevBody .dl-sig{background:#fff;border-radius:10px;padding:12px!important;border-top:0!important}',
    '@media (max-width:640px){.ms-grid{grid-template-columns:1fr}}'
  ].join('\n');
  document.head.appendChild(css);

  /* ================= Email setup: signature + send with ================= */
  function inject() {
    var form = document.querySelector('#dlEmailSetupModal .es-form');
    if (!form || $('msSig')) return;
    var g = sig();
    var box = document.createElement('div'); box.id = 'msSig';
    box.innerHTML =
      '<div class="ms-sec' + (g.on ? '' : ' ms-off') + '" id="msSigSec"><div class="ms-head"><b>Signature</b><small>kept only in this browser</small><span class="sp"></span>' +
      '<button type="button" class="ms-btn del" id="msSigDel" title="Delete signature and logo from this browser">' + ico('trash') + 'Delete</button>' +
      '<button type="button" class="ms-sw" id="msOn" role="switch" aria-checked="' + (g.on ? 'true' : 'false') + '" aria-label="Add signature"></button></div>' +
      '<div class="ms-grid">' + FIELDS.map(function (f) {
        return '<div><label for="msF_' + f[0] + '">' + f[1] + '</label><input type="text" id="msF_' + f[0] + '" placeholder="' + esc(f[2]) + '" value="' + esc(g[f[0]] || '') + '" autocomplete="off"></div>';
      }).join('') + '</div>' +
      '<div class="ms-logo"><div class="lp" id="msLogoPrev"></div><div class="lt"><b>Logo</b>PNG or JPG. It is resized to fit and kept on this computer.</div>' +
      '<input type="file" id="msLogoFile" accept="image/png,image/jpeg,image/webp" hidden><button type="button" class="ms-btn" id="msLogoUp">Upload</button>' +
      '<button type="button" class="ms-btn del" id="msLogoDel" title="Remove logo" aria-label="Remove logo">' + ico('trash') + '</button></div></div>';
    form.appendChild(box);
    var sl = form.querySelector('label[for=propSubjectInput]');
    if (sl && !$('msSubjChip')) {
      var row = document.createElement('div'); row.className = 'ms-srow'; sl.parentNode.insertBefore(row, sl); row.appendChild(sl);
      row.insertAdjacentHTML('beforeend', '<span><button type="button" class="ms-chip" id="msSubjChip" title="The carrier\'s company name goes here">+ {company}</button><button type="button" class="ms-chip" id="msSubjChip2" title="The owner\'s first name goes here">+ {firstname}</button></span>');
      var put = function (tok) { var t = $('propSubjectInput'), a = t.selectionStart == null ? t.value.length : t.selectionStart, b = t.selectionEnd == null ? a : t.selectionEnd;
        var pre = t.value.slice(0, a), sp = pre && !/\s$/.test(pre) ? ' ' : ''; t.value = pre + sp + tok + t.value.slice(b); t.focus(); t.selectionStart = t.selectionEnd = a + sp.length + tok.length; refresh(); };
      row.addEventListener('mousedown', function (e) { if (e.target.closest('.ms-chip')) e.preventDefault(); });
      $('msSubjChip').onclick = function () { put('{company}'); }; $('msSubjChip2').onclick = function () { put('{firstname}'); };
    }
    paintLogo();
    $('msSigDel').onclick = function () {
      if (!confirm('Delete your signature and logo from this browser?')) return;
      LS.del(SK); LS.del(LK); LS.del(DK);
      FIELDS.forEach(function (f) { $('msF_' + f[0]).value = ''; });
      $('msOn').setAttribute('aria-checked', 'false'); $('msSigSec').classList.add('ms-off');
      paintLogo(); refresh(); note('Signature deleted from this browser.', 3000);
    };
    $('msOn').onclick = function () { var on = this.getAttribute('aria-checked') !== 'true'; this.setAttribute('aria-checked', on ? 'true' : 'false'); $('msSigSec').classList.toggle('ms-off', !on); saveSig(); };
    FIELDS.forEach(function (f) { $('msF_' + f[0]).addEventListener('input', saveSig); });
    $('msLogoUp').onclick = function () { $('msLogoFile').click(); };
    $('msLogoFile').onchange = function () { var fl = this.files && this.files[0]; this.value = ''; if (fl) upload(fl); };
    $('msLogoDel').onclick = function () { if (!logo() || !confirm('Remove the logo?')) return; LS.del(LK); LS.del(DK); paintLogo(); refresh(); };
  }
  function saveSig() {
    var g = { on: $('msOn').getAttribute('aria-checked') === 'true' };
    FIELDS.forEach(function (f) { g[f[0]] = ($('msF_' + f[0]).value || '').trim().slice(0, 100); });
    g.wa = g.wa.replace(/[^0-9+]/g, '');
    LS.set(SK, JSON.stringify(g)); paintLogo(); refresh();
  }
  function paintLogo() {
    var p = $('msLogoPrev'); if (!p) return;
    var src = logo(), g = sig();
    p.innerHTML = src ? '<img src="' + src + '" alt="">' : esc(String(g.company || g.name || 'L').charAt(0).toUpperCase());
    p.style.background = src ? 'transparent' : '#1E3A8A';
    $('msLogoDel').style.display = src ? '' : 'none';
  }
  function upload(file) {
    var r = new FileReader();
    r.onload = function () {
      var im = new Image();
      im.onload = function () {
        var h = 46, w = Math.max(20, Math.min(150, Math.round(im.width * h / im.height))), cv = document.createElement('canvas');
        cv.width = w * 2; cv.height = h * 2;
        var cx = cv.getContext('2d'); cx.imageSmoothingQuality = 'high'; cx.drawImage(im, 0, 0, cv.width, cv.height);
        var out = cv.toDataURL('image/png');
        if (out.length > 60000) { cx.fillStyle = '#fff'; cx.globalCompositeOperation = 'destination-over'; cx.fillRect(0, 0, cv.width, cv.height); out = cv.toDataURL('image/jpeg', 0.88); }
        LS.set(LK, out); LS.set(DK, w + 'x' + h);
        if (!logo()) { alert('Could not keep this logo. Try a smaller PNG or JPG.'); return; }
        paintLogo(); refresh(); note('Logo saved.', 2500);
      };
      im.onerror = function () { alert('This file is not a picture we can read. Use PNG or JPG.'); };
      im.src = r.result;
    };
    r.readAsDataURL(file);
  }
  function refresh() { if (typeof window.esPreview === 'function') window.esPreview(); }

  var origPrev = window.esPreview;
  window.esPreview = function () {
    var r = origPrev && origPrev.apply(this, arguments), pb = $('esPrevBody');
    if (pb) { var h = sigHtml(sig()); if (h) pb.insertAdjacentHTML('beforeend', h); }
    return r;
  };
  var origOpen = window.openEmailSetup;
  window.openEmailSetup = function () { var r = origOpen && origOpen.apply(this, arguments); READY.then(function () { inject(); refresh(); }); return r; };
  READY.then(function () { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', inject); else inject(); });

  /* ================= Send ================= */
  function legacyCopy(html) {
    var d = document.createElement('div'); d.contentEditable = 'true'; d.innerHTML = html;
    d.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0'; document.body.appendChild(d);
    var rg = document.createRange(); rg.selectNodeContents(d); var s = window.getSelection(); s.removeAllRanges(); s.addRange(rg);
    var ok = false; try { ok = document.execCommand('copy'); } catch (e) {}
    s.removeAllRanges(); d.remove(); return ok;
  }
  function copyRich(html, plain) {
    try {
      if (navigator.clipboard && navigator.clipboard.write && window.ClipboardItem) {
        return navigator.clipboard.write([new ClipboardItem({ 'text/html': new Blob([html], { type: 'text/html' }), 'text/plain': new Blob([plain], { type: 'text/plain' }) })])
          .then(function () { return true; }, function () { return legacyCopy(html); });
      }
    } catch (e) {}
    return Promise.resolve(legacyCopy(html));
  }
  function openIn(to, subject, body, htmls) { // the browser asks Windows which app handles email links (Thunderbird, Outlook, Gmail...)
    var mt = 'mailto:' + to + '?subject=' + encodeURIComponent(subject) + (body ? '&body=' + encodeURIComponent(body.replace(/\n/g, '\r\n')) : '');
    // Thunderbird also reads "html-body": the designed email (with signature and logo) then appears by itself.
    // Windows limits the link length, so try with the logo, then without it, then text only.
    (htmls || []).some(function (h) { var x = mt + '&html-body=' + encodeURIComponent(h); if (x.length <= 30000) { mt = x; return true; } return false; });
    var l = document.createElement('a'); l.href = mt; l.style.display = 'none'; document.body.appendChild(l); l.click(); setTimeout(function () { l.remove(); }, 1000);
  }
  function compose(email, company, owner) {
    var tpl = (typeof emailTpl !== 'undefined' && emailTpl) || { subject: typeof DEFAULT_SUBJECT !== 'undefined' ? DEFAULT_SUBJECT : 'Dispatch Proposal', body: typeof DEFAULT_BODY !== 'undefined' ? DEFAULT_BODY : 'Hello' };
    var fill = F ? F.fill : function (t) { return t; }, clean = F && F.clean ? F.clean : function (t) { return t; };
    company = niceCompany(company);
    var subject = clean(fill(tpl.subject || 'Dispatch Proposal', company, owner)).replace(/\s+/g, ' ').trim();
    var raw = fill(tpl.body || 'Hello', company, owner), blocks = F ? F.parse(raw) : null, plain = blocks ? F.toPlain(blocks) : raw;
    var g = sig(), rich = !!blocks && !(F.plainOnly && F.plainOnly()) && F.hasMarkup(raw);
    var body = rich ? F.toHtml(blocks) : '<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.55;color:#222">' + esc(plain).replace(/\n/g, '<br>') + '</div>';
    if (!sigOn(g) && !rich) { openIn(email, subject, plain); return; } // nothing designed: text goes straight into the email
    var html = body + sigHtml(g), text = plain + sigText(g);
    copyRich(html, text).then(function (ok) {
      note(ok ? 'Email opened. For the logo, WhatsApp button and design: click inside the message, press Ctrl+A, then Ctrl+V, then Send.' : 'Email opened with your template and signature.', ok ? 10000 : 5000);
    });
    openIn(email, subject, text, [body + sigHtml(g, 'link')]);
  }

  window.triggerOneClickEmailPitch = function (email, company, owner) {
    if (!email || email === 'N/A') return;
    var who = owner || (F && F.findOwner ? F.findOwner(email, company) : '');
    compose(email, company, who);
  };
  void origSend;
})();
