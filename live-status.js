/* Dispatch Link | Team monitoring: live status for Attendance and Login history.
   The data stays on screen; a small line says how old it is or that new data is on the way.
   Refreshes every 20 sec while the tab is open, and at once when you come back to the tab.
   The last data is also kept in this browser (IndexedDB, not Firebase), so the page shows it at once on the next visit
   while the new data loads.
   Load this AFTER admin.js. */
(function () {
  'use strict';
  var ok = function () { try { return typeof AT === 'object' && typeof atRefresh === 'function' && typeof atSyncHTML === 'function'; } catch (e) { return false; } };
  if (!ok()) return;
  var EVERY = 20000;
  var orig = atSyncHTML;
  function ago(ms) {
    var s = Math.max(0, Math.round((Date.now() - ms) / 1000));
    if (s < 10) return 'just now';
    if (s < 60) return s + ' sec ago';
    var m = Math.round(s / 60);
    if (m < 60) return m + ' min ago';
    return 'at ' + new Date(ms).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }
  function tab() { try { return activeTab; } catch (e) { return ''; } }
  function onTab() { var t = tab(); return t === 'attendance' || t === 'logins'; }

  window.atSyncHTML = function () {
    try {
      if (AT.busy) return '<span class="at-dot spin"></span>' + (AT.lastSync
        ? 'Updating… showing the data from ' + ago(AT.lastSync)
        : 'Loading attendance…');
      if (AT.err) return orig();
      return '<span class="at-dot ok"></span><b>Live</b>' + (AT.lastSync ? ' · updated ' + ago(AT.lastSync) : '') + ' · refreshes every 20 sec';
    } catch (e) { return orig(); }
  };

  /* ---- show the last data at once (kept in this browser's IndexedDB, never in Firebase), then load the new data ---- */
  function key() { var c = ''; try { var s = DL.session(); c = s && s.company || ''; } catch (e) {} return c ? 'att_' + String(c).toLowerCase() : ''; }
  var dbP = null;
  function db() {
    if (!dbP) dbP = new Promise(function (ok, no) {
      try { var r = indexedDB.open('dl_attendance_cache', 1); r.onupgradeneeded = function () { r.result.createObjectStore('c'); }; r.onsuccess = function () { ok(r.result); }; r.onerror = function () { no(r.error); }; } catch (e) { no(e); }
    });
    return dbP;
  }
  function idb(mode, fn) { return db().then(function (d) { return new Promise(function (ok, no) { var t = d.transaction('c', mode), q = fn(t.objectStore('c')); t.oncomplete = function () { ok(q && q.result); }; t.onerror = function () { no(t.error); }; }); }); }
  function save() {
    var k = key(); if (!k || AT.err || !AT.lastSync) return;
    var v = { rows: AT.rows, team: AT.team, sales: AT.sales, lastSync: AT.lastSync };
    try { v = JSON.parse(JSON.stringify(v)); } catch (e) { return; }
    idb('readwrite', function (st) { return st.put(v, k); }).catch(function () {});
  }
  function restore() {
    var k = key(); if (!k || AT.lastSync) return Promise.resolve();
    return idb('readonly', function (st) { return st.get(k); }).then(function (c) {
      if (!c || !c.lastSync || AT.lastSync || Date.now() - c.lastSync > 7 * 864e5) return;
      ['rows', 'team', 'sales'].forEach(function (f) { if (c[f] != null) AT[f] = c[f]; }); // not loadedMonth: the page must still load the new data
      AT.lastSync = c.lastSync;
      try { if (typeof atPaint === 'function') atPaint(); } catch (e) {}
    }).catch(function () {});
  }
  try { localStorage.removeItem(key() ? 'dl_att_cache_' + key().slice(4) : ''); } catch (e) {} // the first version kept it in localStorage
  var origRefresh = atRefresh;
  window.atRefresh = async function () {
    await Promise.race([restore(), new Promise(function (r) { setTimeout(r, 300); })]); // never wait long for it
    try { return await origRefresh.apply(this, arguments); } finally { save(); }
  };
  try { atRefresh = window.atRefresh; } catch (e) {}

  function tick() { // keep "updated 40 sec ago" correct without reloading anything
    var el = document.getElementById('atSync');
    if (el && tab() === 'attendance') el.innerHTML = window.atSyncHTML();
  }
  function maybeRefresh(minAge) {
    if (document.hidden || !onTab() || AT.busy) return;
    if (Date.now() - (AT.lastSync || 0) < minAge) return;
    try { atRefresh(false); } catch (e) {}
  }
  setInterval(function () { tick(); maybeRefresh(EVERY); }, 5000); // checks every 5 sec, loads again once the data is 20 sec old
  document.addEventListener('visibilitychange', function () { if (!document.hidden) maybeRefresh(10000); });
})();
