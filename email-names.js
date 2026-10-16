/* Dispatch Link: email templates for the one-click "Send" button.

   Placeholders   {name}      -> carrier owner full name  (e.g. "John Smith")
                  {firstname} -> owner's first name        (e.g. "John")
                  {company}   -> company name
                  If no owner name is known, {name} and {firstname} become "there".

   Formatting     # Heading     **bold**   *italic*   [link text](https://...)
                  - bullet      1. numbered      blank line = new paragraph

   Sending        Plain text only: email opens with text filled in (bullets "•", headings CAPITALS).
                  With formatting: formatted message is copied, email opens, press Ctrl+V in the body
                  (mail links can only carry plain text, so this keeps headings and lists).
   Load AFTER scraper-core.js. */
(function () {
  if (typeof window.triggerOneClickEmailPitch !== "function") return;

  var FALLBACK = "there";
  var PLAIN_KEY = "dl_mail_plain";
  var followupOwners = {};

  function titleCase(s) {
    return String(s || "").toLowerCase().replace(/(^|[\s\-'.])([a-z])/g, function (m, p, c) { return p + c.toUpperCase(); });
  }
  function cleanOwner(raw) {
    var s = String(raw || "").replace(/\s+/g, " ").trim();
    if (!s || s === "—" || /^(n\/a|none|null|undefined|-+)$/i.test(s)) return "";
    var m = s.match(/^([^,]+),\s*(.+)$/);
    if (m && !/\b(llc|inc|corp|ltd|co)\b/i.test(s)) s = m[2] + " " + m[1];
    return titleCase(s);
  }
  function firstName(full) {
    var parts = String(full || "").split(" ").filter(function (p) { return p.replace(/\./g, "").length > 1; });
    return parts[0] || "";
  }
  function norm(v) { return String(v || "").trim().toLowerCase(); }

  function findOwner(email, company) {
    var e = norm(email), c = norm(company), hit = "";
    try {
      if (typeof scrapedData !== "undefined" && Array.isArray(scrapedData)) {
        for (var i = 0; i < scrapedData.length; i++) {
          var r = scrapedData[i];
          if (!r || !r.owner) continue;
          if (norm(r.email) === e && (!c || norm(r.name) === c)) return r.owner;
          if (!hit && norm(r.email) === e) hit = r.owner;
        }
      }
    } catch (err) {}
    return hit || followupOwners[e] || "";
  }
  function cacheFollowups() {
    try {
      if (typeof getAllAppDataFromIndexedDB !== "function" || typeof db === "undefined" || !db) return;
      getAllAppDataFromIndexedDB("followups", function (rows) {
        (rows || []).forEach(function (r) { if (r && r.email && r.owner) followupOwners[norm(r.email)] = r.owner; });
      });
    } catch (err) {}
  }
  function fill(text, company, owner) {
    var full = cleanOwner(owner), first = firstName(full);
    return String(text || "")
      .replace(/\{company\}/gi, company || "")
      .replace(/\{firstname\}/gi, first || FALLBACK)
      .replace(/\{name\}/gi, full || FALLBACK);
  }

  /* ---------- formatting ---------- */
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function clean(text) {
    return String(text || "").replace(/\r\n?/g, "\n").replace(/[   ]/g, " ").replace(/[​-‍﻿]/g, "").replace(/\t/g, "    ");
  }
  function parse(text) {
    var blocks = [], cur = null;
    clean(text).split("\n").forEach(function (raw) {
      var line = raw.replace(/\s+$/, ""), m;
      if (!line.trim()) { cur = null; return; }
      if ((m = /^\s{0,3}(#{1,3})\s+(.+)$/.exec(line))) { blocks.push({ t: "h", lv: m[1].length, x: m[2].trim() }); cur = null; return; }
      if ((m = /^\s*[-*•]\s+(.+)$/.exec(line))) {
        if (!cur || cur.t !== "ul") { cur = { t: "ul", items: [] }; blocks.push(cur); }
        cur.items.push(m[1].trim()); return;
      }
      if ((m = /^\s*(\d+)[.)]\s+(.+)$/.exec(line))) {
        if (!cur || cur.t !== "ol") { cur = { t: "ol", items: [], start: Number(m[1]) || 1 }; blocks.push(cur); }
        cur.items.push(m[2].trim()); return;
      }
      if (!cur || cur.t !== "p") { cur = { t: "p", lines: [] }; blocks.push(cur); }
      cur.lines.push(line.trim());
    });
    return blocks;
  }
  function hasMarkup(text) {
    return /(^|\n)\s{0,3}#{1,3}\s+\S|(^|\n)\s*[-*•]\s+\S|(^|\n)\s*\d+[.)]\s+\S|\*\*[^*\n]+\*\*|\[[^\]]+\]\(https?:\/\/[^\s)]+\)/.test(clean(text));
  }
  var BOLD = /\*\*([^*\n]+?)\*\*/g, ITAL = /(^|[^*\w])\*([^*\s][^*\n]*?)\*(?!\*)/g;
  function fmtInline(t) { return esc(t).replace(BOLD, "<b>$1</b>").replace(ITAL, "$1<i>$2</i>"); }
  function inlineHtml(s) {
    var re = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|(https?:\/\/[^\s<]+[^\s<.,;:!?)])/g, out = "", last = 0, m;
    while ((m = re.exec(s))) {
      out += fmtInline(s.slice(last, m.index));
      var url = m[2] || m[3], label = m[1] || m[3];
      out += '<a href="' + esc(url) + '" style="color:#1a73e8">' + fmtInline(label) + "</a>";
      last = m.index + m[0].length;
    }
    return out + fmtInline(s.slice(last));
  }
  function inlinePlain(s) {
    return s.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, "$1 ($2)").replace(BOLD, "$1").replace(ITAL, "$1$2");
  }
  var HSTYLE = { 1: "font-size:20px;margin:18px 0 8px", 2: "font-size:17px;margin:16px 0 6px", 3: "font-size:14px;margin:14px 0 4px" };
  function toHtml(blocks, themed) {
    if (themed) {
      return blocks.map(function (b) {
        if (b.t === "h") return "<h" + b.lv + ">" + inlineHtml(b.x) + "</h" + b.lv + ">";
        if (b.t === "ul") return "<ul>" + b.items.map(function (i) { return "<li>" + inlineHtml(i) + "</li>"; }).join("") + "</ul>";
        if (b.t === "ol") return '<ol start="' + b.start + '">' + b.items.map(function (i) { return "<li>" + inlineHtml(i) + "</li>"; }).join("") + "</ol>";
        return "<p>" + b.lines.map(inlineHtml).join("<br>") + "</p>";
      }).join("").replace(/ style="color:#1a73e8"/g, "");
    }
    var body = blocks.map(function (b) {
      if (b.t === "h") return "<h" + b.lv + ' style="' + HSTYLE[b.lv] + ';font-weight:700;line-height:1.3;color:#111">' + inlineHtml(b.x) + "</h" + b.lv + ">";
      if (b.t === "ul") return '<ul style="margin:0 0 12px;padding-left:22px">' + b.items.map(function (i) { return '<li style="margin:3px 0">' + inlineHtml(i) + "</li>"; }).join("") + "</ul>";
      if (b.t === "ol") return '<ol start="' + b.start + '" style="margin:0 0 12px;padding-left:24px">' + b.items.map(function (i) { return '<li style="margin:3px 0">' + inlineHtml(i) + "</li>"; }).join("") + "</ol>";
      return '<p style="margin:0 0 12px">' + b.lines.map(inlineHtml).join("<br>") + "</p>";
    }).join("");
    return '<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.55;color:#222">' + body + "</div>";
  }
  function toPlain(blocks) {
    return blocks.map(function (b) {
      if (b.t === "h") return b.lv === 1 ? inlinePlain(b.x).toUpperCase() : inlinePlain(b.x);
      if (b.t === "ul") return b.items.map(function (i) { return "• " + inlinePlain(i); }).join("\n");
      if (b.t === "ol") return b.items.map(function (i, k) { return (b.start + k) + ". " + inlinePlain(i); }).join("\n");
      return b.lines.map(inlinePlain).join("\n");
    }).join("\n\n").replace(/\n{3,}/g, "\n\n").trim();
  }
  window.DLMailFormat = { parse: parse, toHtml: toHtml, toPlain: toPlain, hasMarkup: hasMarkup, fill: fill, clean: clean, findOwner: function (e, c) { return findOwner(e, c); }, plainOnly: function () { return plainOnly(); } };

  /* ---------- sending ---------- */
  function plainOnly() { try { return localStorage.getItem(PLAIN_KEY) === "1"; } catch (e) { return false; } }
  function note(msg) {
    if (typeof showPremiumNotification === "function") { showPremiumNotification(msg, 7000); return; }
    var t = document.createElement("div");
    t.textContent = msg;
    t.style.cssText = "position:fixed;left:50%;bottom:28px;transform:translateX(-50%);z-index:99999;max-width:90vw;padding:12px 18px;border-radius:12px;background:#0b1426;color:#fff;font:14px Arial,sans-serif";
    document.body.appendChild(t);
    setTimeout(function () { try { t.remove(); } catch (e) {} }, 7000);
  }
  function legacyCopy(html) {
    return new Promise(function (res, rej) {
      var d = document.createElement("div");
      d.contentEditable = "true"; d.innerHTML = html;
      d.style.cssText = "position:fixed;left:-9999px;top:0;opacity:0";
      document.body.appendChild(d);
      var r = document.createRange(); r.selectNodeContents(d);
      var s = window.getSelection(); s.removeAllRanges(); s.addRange(r);
      var ok = false; try { ok = document.execCommand("copy"); } catch (e) {}
      s.removeAllRanges(); d.remove();
      ok ? res() : rej(new Error("copy failed"));
    });
  }
  function copyRich(html, plain) {
    try {
      if (navigator.clipboard && navigator.clipboard.write && window.ClipboardItem) {
        return navigator.clipboard.write([new ClipboardItem({
          "text/html": new Blob([html], { type: "text/html" }),
          "text/plain": new Blob([plain], { type: "text/plain" })
        })]).catch(function () { return legacyCopy(html); });
      }
    } catch (e) {}
    return legacyCopy(html);
  }
  function openMail(email, subject, body, crlf) {
    var mailto = "mailto:" + email + "?subject=" + encodeURIComponent(subject) + (body ? "&body=" + encodeURIComponent(crlf ? body.replace(/\n/g, "\r\n") : body) : "");
    var gmail = "https://mail.google.com/mail/?view=cm&fs=1&to=" + encodeURIComponent(email) + "&su=" + encodeURIComponent(subject) + (body ? "&body=" + encodeURIComponent(body) : "");
    var w = window.open(mailto, "_blank");
    setTimeout(function () {
      try {
        if (!w || w.location.href === "about:blank" || w.document.body.innerHTML === "") { if (w) w.location.href = gmail; }
      } catch (err) {}
    }, 500);
  }

  window.triggerOneClickEmailPitch = function (email, company, owner) {
    if (!email || email === "N/A") return;
    var tpl = (typeof emailTpl !== "undefined" && emailTpl) || { subject: DEFAULT_SUBJECT, body: DEFAULT_BODY };
    var who = owner || findOwner(email, company);
    var subject = clean(fill(tpl.subject || "Dispatch Proposal", company, who)).replace(/\n+/g, " ").trim();
    var raw = fill(tpl.body || "Hello", company, who);
    var blocks = parse(raw), plain = toPlain(blocks);
    if (!plainOnly() && hasMarkup(raw)) {
      var done = copyRich(toHtml(blocks), plain);
      openMail(email, subject, plain, true);
      done.then(function () { note("Email opened with your text. For headings and bullets: click the email body, press Ctrl+A, then Ctrl+V."); },
        function () { note("Email opened with plain text (formatted copy was not possible)."); });
      return;
    }
    openMail(email, subject, plain, true);
  };

  /* ---------- Email setup window ---------- */
  var css = document.createElement("style");
  css.textContent =
    ".es-row>span{display:none}.es-row{margin:18px 0 8px}" +
    ".dl-ed{border:1px solid var(--line);border-radius:12px;overflow:hidden;background:var(--surface);transition:border-color .15s,box-shadow .15s}" +
    ".dl-ed:focus-within{border-color:var(--accent);box-shadow:0 0 0 3px var(--accent-soft)}" +
    ".dl-tb{display:flex;flex-wrap:wrap;align-items:center;gap:2px 3px;padding:8px;background:var(--surface2);border-bottom:1px solid var(--line2)}" +
    ".dl-tb button{height:30px;min-width:28px;padding:0 6px;border:1px solid transparent;border-radius:8px;background:transparent;color:var(--ink2);font:600 13px var(--head,inherit);cursor:pointer;white-space:nowrap}" +
    ".dl-tb button:hover{background:var(--accent-soft);color:var(--accent)}" +
    ".dl-tb .dl-i{font-style:italic;font-family:Georgia,serif}.dl-tb .dl-b{font-weight:800}" +
    ".dl-tb .dl-br{flex-basis:100%;height:0}" +
    ".dl-tb .dl-lbl{font-size:11.5px;color:var(--mut);font-weight:600;margin:0 4px 0 2px;text-transform:uppercase;letter-spacing:.05em}" +
    ".dl-tb .dl-var{font:600 12px var(--mono);color:var(--accent);background:var(--accent-soft);border-radius:99px;height:26px;padding:0 10px}" +
    ".dl-tb .dl-var:hover{background:var(--accent);color:#fff}" +
    ".dl-ed textarea{border:0!important;border-radius:0!important;box-shadow:none!important;outline:0!important;display:block;min-height:220px;background:transparent!important}" +
    ".dl-opt{display:flex;gap:10px;align-items:center;margin:14px 0 0;font-size:13px;color:var(--ink2);cursor:pointer;font-weight:500}" +
    ".es-form label.dl-opt{display:flex;gap:10px;align-items:center;font-weight:500;margin:14px 0 0}.es-form .dl-opt input{width:16px;height:16px;min-width:16px;margin:0;padding:0;flex:none;accent-color:var(--accent)}" +
    ".dl-help{margin-top:12px;font-size:12.5px;color:var(--mut)}.dl-help summary{cursor:pointer;font-weight:600;color:var(--ink2)}" +
    ".dl-help div{margin-top:8px;line-height:1.9}.dl-help code{font-family:var(--mono);background:var(--surface2);border:1px solid var(--line2);padding:1px 6px;border-radius:5px;margin-right:4px}" +
    "#esPrevBody h1,#esPrevBody h2,#esPrevBody h3{margin:14px 0 6px;line-height:1.3;color:var(--ink);font-weight:800}#esPrevBody h1{font-size:19px}#esPrevBody h2{font-size:16.5px}#esPrevBody h3{font-size:14.5px}" +
    "#esPrevBody p{margin:0 0 10px}#esPrevBody ul,#esPrevBody ol{margin:0 0 10px;padding-left:22px}#esPrevBody li{margin:3px 0}#esPrevBody b{color:var(--ink)}#esPrevBody a{color:var(--accent)}" +
    "#esPrevBody>:first-child{margin-top:0}#esPrevBody .dl-plain{white-space:pre-wrap}" +
    ".es-text{color:var(--ink)}";
  document.head.appendChild(css);

  function ta() { return document.getElementById("propBodyInput"); }
  function refresh() { if (typeof window.esPreview === "function") window.esPreview(); }
  function lineEdit(fn) {
    var t = ta(); if (!t) return;
    var v = t.value, s = t.selectionStart, e = t.selectionEnd;
    var ls = v.lastIndexOf("\n", s - 1) + 1, le = v.indexOf("\n", e); if (le < 0) le = v.length;
    var seg = v.slice(ls, le).split("\n").map(fn).join("\n");
    t.value = v.slice(0, ls) + seg + v.slice(le);
    t.selectionStart = ls; t.selectionEnd = ls + seg.length; t.focus(); refresh();
  }
  function wrapSel(a, b, ph) {
    var t = ta(); if (!t) return;
    var v = t.value, s = t.selectionStart, e = t.selectionEnd, mid = v.slice(s, e) || ph;
    t.value = v.slice(0, s) + a + mid + b + v.slice(e);
    t.selectionStart = s + a.length; t.selectionEnd = s + a.length + mid.length; t.focus(); refresh();
  }
  function ins(tok) { var t = ta(); if (!t) return; var s = t.selectionStart; t.value = t.value.slice(0, s) + tok + t.value.slice(t.selectionEnd); t.selectionStart = t.selectionEnd = s + tok.length; t.focus(); refresh(); }
  var ACT = {
    h: function () { lineEdit(function (l) { return /^#{1,3}\s/.test(l) ? l.replace(/^#{1,3}\s+/, "") : "# " + l.replace(/^\s*([-*•]|\d+[.)])\s+/, ""); }); },
    b: function () { wrapSel("**", "**", "bold text"); },
    i: function () { wrapSel("*", "*", "italic text"); },
    ul: function () { lineEdit(function (l) { return /^\s*[-*•]\s/.test(l) ? l.replace(/^\s*[-*•]\s+/, "") : "- " + l.replace(/^\s*(\d+[.)]|#{1,3})\s+/, ""); }); },
    ol: function () { var n = 0; lineEdit(function (l) { n++; return /^\s*\d+[.)]\s/.test(l) ? l.replace(/^\s*\d+[.)]\s+/, "") : n + ". " + l.replace(/^\s*([-*•]|#{1,3})\s+/, ""); }); },
    link: function () { wrapSel("[", "](https://)", "link text"); },
    n: function () { ins("{name}"); }, f: function () { ins("{firstname}"); }, c: function () { ins("{company}"); }
  };
  function injectUI() {
    var t = ta(); if (!t || t.getAttribute("data-dl-rich")) return;
    t.setAttribute("data-dl-rich", "1");
    var wrap = document.createElement("div"); wrap.className = "dl-ed";
    var bar = document.createElement("div"); bar.className = "dl-tb";
    bar.innerHTML = '<button type="button" data-k="h" title="Heading">H</button><button type="button" class="dl-b" data-k="b" title="Bold">B</button><button type="button" class="dl-i" data-k="i" title="Italic">I</button><button type="button" data-k="ul" title="Bullet list">&bull; List</button><button type="button" data-k="ol" title="Numbered list">1. List</button><button type="button" data-k="link" title="Link">Link</button><span class="dl-br"></span><span class="dl-lbl">Insert</span><button type="button" class="dl-var" data-k="n">{name}</button><button type="button" class="dl-var" data-k="f">{firstname}</button><button type="button" class="dl-var" data-k="c">{company}</button>';
    bar.addEventListener("mousedown", function (ev) { ev.preventDefault(); });
    bar.addEventListener("click", function (ev) { var k = ev.target && ev.target.getAttribute && ev.target.getAttribute("data-k"); if (k && ACT[k]) ACT[k](); });
    t.parentNode.insertBefore(wrap, t); wrap.appendChild(bar); wrap.appendChild(t);
    var fm = t.closest(".es-form"), old = fm && fm.querySelector(".es-hint"); if (old) old.style.display = "none";
    var opt = document.createElement("label"); opt.className = "dl-opt";
    opt.innerHTML = '<input type="checkbox" id="dlPlainOnly"><span>Send as plain text only (no headings or bold)</span>';
    var cb = opt.firstChild; cb.checked = plainOnly();
    cb.addEventListener("change", function () { try { localStorage.setItem(PLAIN_KEY, cb.checked ? "1" : "0"); } catch (e) {} refresh(); });
    wrap.parentNode.insertBefore(opt, wrap.nextSibling);
    var help = document.createElement("details"); help.className = "dl-help";
    help.innerHTML = '<summary>Formatting help</summary><div><code># Heading</code><code>**bold**</code><code>*italic*</code><code>- bullet</code><code>1. number</code><code>[text](link)</code><br>A blank line starts a new paragraph. {name} = owner full name, {firstname} = first name, {company} = company; if no owner is found the name becomes "there".<br>With formatting, pressing Send opens the email with your text and also copies the formatted version: click the email body, press Ctrl+A then Ctrl+V.</div>';
    opt.parentNode.insertBefore(help, opt.nextSibling);
  }

  window.esPreview = function () {
    var subj = document.getElementById("propSubjectInput"), bodyEl = ta();
    if (!subj || !bodyEl) return;
    var mark = function (t) { return String(t).replace(/\{company\}/gi, "\u0001Sample Logistics LLC\u0002").replace(/\{firstname\}/gi, "\u0001John\u0002").replace(/\{name\}/gi, "\u0001John Smith\u0002"); };
    var unmark = function (h) { return h.replace(/\u0001/g, "<mark>").replace(/\u0002/g, "</mark>"); };
    document.getElementById("esPrevSubj").innerHTML = unmark(esc(mark(subj.value))) || "<i>No subject</i>";
    var raw = mark(bodyEl.value), html;
    if (!raw.trim()) html = "<i>Empty message</i>";
    else if (plainOnly() || !hasMarkup(raw)) html = '<div class="dl-plain">' + unmark(esc(toPlain(parse(raw)))) + "</div>";
    else html = unmark(toHtml(parse(raw), true));
    document.getElementById("esPrevBody").innerHTML = html;
  };

  if (typeof window.openEmailSetup === "function") {
    var origOpen = window.openEmailSetup;
    window.openEmailSetup = function () { injectUI(); var r = origOpen.apply(this, arguments); refresh(); return r; };
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", injectUI); else injectUI();

  var tries = 0, tm = setInterval(function () {
    tries++;
    if (typeof db !== "undefined" && db) { cacheFollowups(); clearInterval(tm); }
    else if (tries > 40) clearInterval(tm);
  }, 500);
  document.addEventListener("click", function (ev) {
    var el = ev.target && ev.target.closest && ev.target.closest("#drawerFollowUpList, .fu-card, [onclick*='FollowUp']");
    if (el) cacheFollowups();
  }, true);
})();
