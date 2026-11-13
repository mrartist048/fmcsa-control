/* Dispatch Link - database access helper. Load BEFORE auth.js (and before anything that talks to the database).
   1) The sign-in code looks a company up by downloading the whole company list of each database
      (allowedUsers.json). With the secure rules that list is closed, so that one request is answered
      by reading only the company that is being signed in / is signed in (allowedUsers/<id>.json).
   2) Database 4: a company that is not in databases 1-3 is also looked for in database 4. When it is
      there, everything this page sends to database 3 for it goes to database 4 instead. */
(function () {
  'use strict';
  if (window.__dlDbShim) return; window.__dlDbShim = true;
  var LIST = /^(https:\/\/[a-z0-9-]+\.(?:firebaseio\.com|firebasedatabase\.app)\/)allowedUsers\.json(\?.*)?$/i;
  var LAST = 'data-scraper-3-default-rtdb', EXTRA = 'data-scraper-4-default-rtdb';
  var LAST_URL = 'https://' + LAST + '.firebaseio.com/', EXTRA_URL = 'https://' + EXTRA + '.firebaseio.com/';
  var MAPK = 'dl_db_extra';
  var nativeFetch = window.fetch;

  function clean(v) { return String(v || '').trim().toLowerCase().replace(/[.#$\[\]\/]/g, ''); }
  function typed() {
    var out = [];
    ['co', 'u', 'au'].forEach(function (id) { var el = document.getElementById(id); if (el && el.value) out.push(clean(el.value)); });
    return out.filter(Boolean);
  }
  function sessionCo() { try { var s = JSON.parse(localStorage.getItem('dl_session') || 'null'); return s && s.company ? clean(s.company) : ''; } catch (e) { return ''; } }
  function ids() { // on the sign-in page: the company typed in the form; on the other pages: the signed-in company
    var out = typed(); if (!out.length && sessionCo()) out.push(sessionCo());
    return out.filter(function (x, i, a) { return a.indexOf(x) === i; });
  }
  function extraSet() { try { return JSON.parse(localStorage.getItem(MAPK) || '{}') || {}; } catch (e) { return {}; } }
  function markExtra(id, on) { var m = extraSet(); if (on) m[id] = 1; else delete m[id]; try { localStorage.setItem(MAPK, JSON.stringify(m)); } catch (e) {} }
  function inExtra() { // is the company of this page kept in database 4?
    var m = extraSet(), list = ids();
    for (var i = 0; i < list.length; i++) if (m[list[i]]) return true;
    return false;
  }
  function route(u) { // database 3 -> database 4 for a company kept there
    var s = String(u);
    if (s.indexOf(LAST) < 0 || !inExtra()) return u;
    return s.split(LAST + '.firebaseio.com').join(EXTRA + '.firebaseio.com').replace('ns=' + LAST, 'ns=' + EXTRA);
  }
  function getOne(self, base, id) {
    return nativeFetch.call(self, base + 'allowedUsers/' + encodeURIComponent(id) + '.json', { cache: 'no-store' })
      .then(function (r) { if (!r.ok) throw r; return r.json(); });
  }

  window.fetch = function (input, opts) {
    var url = typeof input === 'string' ? input : (input && input.url) || '';
    var m = LIST.exec(url), method = String((opts && opts.method) || (input && input.method) || 'GET').toUpperCase();
    if (!m || method !== 'GET' || /[?&]auth=/.test(url)) {
      var r = route(url);
      if (r !== url) input = typeof input === 'string' ? r : new Request(r, input);
      // the Google Sheet is told which database holds the team: database 4 for such a company
      if (opts && typeof opts.body === 'string' && opts.body.indexOf(LAST) >= 0 && inExtra()) opts = Object.assign({}, opts, { body: route(opts.body) });
      return nativeFetch.call(this, input, opts);
    }
    var base = m[1], list = ids(), self = this, last = base.indexOf(LAST) >= 0;
    return Promise.all(list.map(function (id) {
      return getOne(self, base, id).then(function (v) {
        if (v && typeof v === 'object') { if (last) markExtra(id, false); return [id, v]; }
        if (!last) return [id, null];
        return getOne(self, EXTRA_URL, id).then(function (x) { // not in databases 1-3: database 4?
          markExtra(id, !!(x && typeof x === 'object')); return [id, x];
        }, function () { return [id, null]; });
      });
    })).then(function (pairs) {
      var o = {}; pairs.forEach(function (p) { if (p[1] && typeof p[1] === 'object') o[p[0]] = p[1]; });
      return new Response(JSON.stringify(o), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }, function () { return nativeFetch.call(self, input, opts); }); // network trouble: ask the normal way
  };
  var OX = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (method, url) { arguments[1] = route(url); return OX.apply(this, arguments); };
  if (window.EventSource) { var OE = window.EventSource; window.EventSource = function (u, c) { return new OE(route(u), c); }; window.EventSource.prototype = OE.prototype; }
  if (window.WebSocket) { var OW = window.WebSocket; var W = function (u, p) { return p === undefined ? new OW(route(u)) : new OW(route(u), p); }; W.prototype = OW.prototype; ['CONNECTING', 'OPEN', 'CLOSING', 'CLOSED'].forEach(function (k) { W[k] = OW[k]; }); window.WebSocket = W; }
})();
