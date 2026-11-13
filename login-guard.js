/* Dispatch Link - sign-in guard (login page)
   3 wrong passwords for a username: that username waits 2 minutes before it can try again.
   Every next lock is longer (2, 5, 15, 30 minutes). A correct sign-in clears it.
   The wait is kept in this browser (localStorage), so a reload does not skip it. */
(function () {
  'use strict';
  var MAX = 3, LOCKS = [2, 5, 15, 30], KEY = 'dl_login_guard';
  var $ = function (id) { return document.getElementById(id); };
  var pending = null, timer = null;

  function load() { try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { return {}; } }
  function save(o) { try { localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) {} }
  function who() {
    var u = ($('u') && $('u').value || '').trim().toLowerCase(), c = ($('co') && $('co').value || '').trim().toLowerCase();
    return u ? (c ? c + '/' : '') + u : '';
  }
  function rec(k) {
    var all = load(), r = all[k] || { f: 0, n: 0, until: 0, at: 0 };
    if (r.at && Date.now() - r.at > 24 * 3600e3) r = { f: 0, n: 0, until: 0, at: 0 }; // a day later it starts again
    return r;
  }
  function put(k, r) { var all = load(); if (r) all[k] = r; else delete all[k]; save(all); }
  function left(k) { var r = rec(k); return Math.max(0, (r.until || 0) - Date.now()); }
  function fmt(ms) { var s = Math.ceil(ms / 1000), m = Math.floor(s / 60); s = s % 60; return m + ':' + (s < 10 ? '0' : '') + s; }

  function paint() {
    var k = who(), ms = k ? left(k) : 0, go = $('go'), e1 = $('e1');
    clearTimeout(timer);
    if (!go) return;
    if (ms > 0) {
      go.disabled = true; go.dataset.dlLocked = '1';
      if (e1) { e1.textContent = 'Too many wrong passwords. Please try again in ' + fmt(ms) + '.'; e1.classList.add('err'); }
      timer = setTimeout(paint, 1000);
    } else if (go.dataset.dlLocked) {
      delete go.dataset.dlLocked; go.disabled = false;
      if (e1 && /Too many wrong passwords/.test(e1.textContent)) e1.textContent = '';
    }
  }
  function blocked(e) {
    var k = who(); if (!k || left(k) <= 0) return false;
    e.preventDefault(); e.stopPropagation(); if (e.stopImmediatePropagation) e.stopImmediatePropagation();
    paint(); return true;
  }
  function attempt() { var k = who(); if (k) { pending = { k: k, err: false }; } }

  // stop the sign-in before the page's own handler runs (capture phase), or note the attempt
  document.addEventListener('click', function (e) {
    var b = e.target && e.target.closest && e.target.closest('#go'); if (!b) return;
    if (!blocked(e)) attempt();
  }, true);
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter' || !e.target || ['u', 'p', 'co'].indexOf(e.target.id) < 0) return;
    if (!blocked(e)) attempt();
  }, true);
  ['u', 'co'].forEach(function (id) { document.addEventListener('input', function (e) { if (e.target && e.target.id === id) paint(); }, true); });

  // the page writes the reason into #e1 when the sign-in fails
  function watch() {
    var e1 = $('e1'); if (!e1) return setTimeout(watch, 300);
    new MutationObserver(function () {
      var t = (e1.textContent || '').trim();
      if (!pending || !t || /Too many wrong passwords/.test(t)) return;
      var p = pending; pending = null;
      if (/internet|network|connection|offline|timed? ?out|try again later|server/i.test(t)) return; // not a wrong password
      var r = rec(p.k); r.f++; r.at = Date.now();
      if (r.f >= MAX) { r.until = Date.now() + LOCKS[Math.min(r.n, LOCKS.length - 1)] * 60000; r.n++; r.f = 0; }
      put(p.k, r);
      if (r.until > Date.now()) paint();
      else if (r.f === MAX - 1) e1.textContent = t + ' (1 try left before a short wait)';
    }).observe(e1, { childList: true, characterData: true, subtree: true });
  }
  // a sign-in that worked leaves the page without an error: forget its wrong tries
  window.addEventListener('pagehide', function () { if (pending) { var r = rec(pending.k); if (r.f || r.n) put(pending.k, null); } });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { watch(); paint(); }); else { watch(); paint(); }
})();
