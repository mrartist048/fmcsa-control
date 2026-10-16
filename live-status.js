/* Dispatch Link | Team monitoring: live status for Attendance and Login history.
   The data stays on screen; a small line says how old it is or that new data is on the way.
   Refreshes every 20 sec while the tab is open, and at once when you come back to the tab.
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
        ? 'Updating from Google Sheet… showing the data from ' + ago(AT.lastSync) + ' until then'
        : 'Loading from Google Sheet…');
      if (AT.err) return orig();
      return '<span class="at-dot ok"></span>Saved directly in your Google Sheet <b>Attendance</b> tab'
        + (AT.lastSync ? ' · updated ' + ago(AT.lastSync) : '') + ' · refreshes every 20 sec';
    } catch (e) { return orig(); }
  };

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
