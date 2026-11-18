/* Dispatch Link - Email marketing access for sales agents
   Admin panel > Sales team: an "Email marketing" tick for every agent (and on the Create login form).
   It is kept in the agent's record (sales_users/<company>/<username>.mail = true).
   An agent with the tick sees "Email marketing" in the Leads Processing menu, which opens the Campaigns page.
   The Campaigns page sends an agent without the tick back to Leads Processing.
   Load on hub.html, crm.html and campaign.html (after auth.js). */
(function () {
  'use strict';
  if (window.__dlAgentMail) return; window.__dlAgentMail = true;
  var $ = function (id) { return document.getElementById(id); };
  var page = (location.pathname.split('/').pop() || '').replace(/\.html$/, '') || 'index';

  function ses() { try { return typeof DL !== 'undefined' && DL.session ? DL.session() : null; } catch (e) { return null; } }
  var coP = null;
  function company(s) {
    if (!coP) coP = Promise.resolve(DL.company(s.company)).then(function (c) {
      return c ? Object.assign({}, c, { id: String(c.id || s.company || '').toLowerCase() }) : null; // same shape the panel uses
    }).catch(function () { coP = null; return null; });
    return coP;
  }
  function base(C) { return String(C && C.dbUrl || '').replace(/\/?$/, '/'); }
  function coId(C) { var s = ses(); return String((C && (C.id || C.company)) || (s && s.company) || '').toLowerCase(); }
  function recUrl(C, u) { return base(C) + 'sales_users/' + encodeURIComponent(coId(C)) + '/' + encodeURIComponent(u) + '.json'; }
  function setMail(C, u, on) {
    // POST + x-http-method-override=PATCH: a "simple" request, so the browser sends it without an extra CORS check
    // (that check failed on some setups, e.g. the page opened from a local file)
    return fetch(recUrl(C, u) + '?x-http-method-override=PATCH', { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=UTF-8' }, body: JSON.stringify({ mail: on ? true : null }) })
      .then(function (r) { if (!r.ok) return r.text().then(function (t) { throw new Error('HTTP ' + r.status + ' ' + String(t).slice(0, 120)); }); });
  }
  function myRec(s) {
    return company(s).then(function (C) {
      if (!C) return null;
      return fetch(recUrl(C, s.username), { cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : null; });
    }).catch(function () { return null; });
  }
  function css(t) { var st = document.createElement('style'); st.textContent = t; document.head.appendChild(st); }
  function ready(fn) { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn); else fn(); }

  /* ---------------- admin panel: Sales team ---------------- */
  function hub() {
    var s = ses(); if (!s || s.role === 'sales' || !$('tl')) return;
    var FLAGS = {}, C = null;
    css('.am-tick{display:inline-flex;align-items:center;gap:8px;cursor:pointer;font-size:13px;white-space:nowrap}.am-tick input{width:16px;height:16px;accent-color:var(--accent)}' +
      '.am-new{position:absolute;left:0;top:100%;display:flex!important;align-items:center;gap:8px;margin:8px 0 0!important;font-size:13px;font-weight:500;cursor:pointer;white-space:nowrap}.am-new input{width:17px;height:17px;accent-color:var(--accent)}');
    // the tick on the Create login form
    var tb = $('tb'), box = tb && tb.closest('div');
    if (box && !$('amNew')) {
      var lab = document.createElement('label'); lab.className = 'am-new';
      lab.innerHTML = '<input type="checkbox" id="amNew"> Email marketing access';
      box.style.position = 'relative'; box.appendChild(lab); // just under "Tabs allowed", out of the row's height so the fields stay in line
      box.parentNode.style.paddingBottom = '30px';
    }
    // keep the tick when the record is written again (new login, new password)
    var put = DL.salesPut;
    if (typeof put === 'function' && !put.__am) {
      DL.salesPut = function (Cx, u) {
        var args = arguments, isNew = $('us') && String($('us').value || '').trim().toLowerCase() === String(u).toLowerCase() && $('amNew') && $('amNew').checked;
        var keep = isNew || FLAGS[u];
        return Promise.resolve(put.apply(this, args)).then(function (r) {
          if (keep) { FLAGS[u] = true; return setMail(Cx, u, true).then(function () { if (isNew && $('amNew')) $('amNew').checked = false; return r; }, function () { return r; }); }
          return r;
        });
      };
      DL.salesPut.__am = true;
    }
    function decorate() {
      var t = $('tl'); if (!t) return;
      var head = t.querySelector('thead tr') || t.querySelector('tr');
      if (head && !head.querySelector('.am-h')) {
        var th = document.createElement('th'); th.className = 'am-h'; th.textContent = 'Email marketing';
        var cells = head.children; head.insertBefore(th, cells.length > 3 ? cells[3] : null);
      }
      t.querySelectorAll('tbody tr, tr').forEach(function (tr) {
        if (tr === head || tr.querySelector('.am-c')) return;
        var b = tr.querySelector('[data-u]'); if (!b) return;
        var u = b.getAttribute('data-u'), td = document.createElement('td'); td.className = 'am-c';
        td.innerHTML = '<label class="am-tick" title="Let this agent open Email marketing"><input type="checkbox"' + (FLAGS[u] ? ' checked' : '') + '> Access</label>';
        var cells = tr.children; tr.insertBefore(td, cells.length > 3 ? cells[3] : null);
        var cb = td.querySelector('input');
        cb.onchange = function () {
          var on = cb.checked; cb.disabled = true;
          setMail(C, u, on).then(function () { FLAGS[u] = on; }, function (e) { cb.checked = !on; alert('Could not save (' + (e && e.message || 'no connection') + '). Check the connection and try again.'); })
            .finally(function () { cb.disabled = false; });
        };
      });
    }
    function load() {
      return company(s).then(function (c) {
        C = c; if (!C) return;
        return Promise.resolve(DL.salesList(C)).then(function (list) {
          FLAGS = {}; Object.keys(list || {}).forEach(function (u) { if (list[u] && list[u].mail) FLAGS[u] = true; });
          document.querySelectorAll('#tl .am-c input').forEach(function (cb) { var u = cb.closest('tr').querySelector('[data-u]'); if (u) cb.checked = !!FLAGS[u.getAttribute('data-u')]; });
        });
      }).catch(function () {});
    }
    new MutationObserver(function () { decorate(); }).observe($('tl'), { childList: true, subtree: true });
    load().then(decorate);
    var rf = window.reload; // the panel's Refresh
    if (typeof rf === 'function') window.reload = function () { var r = rf.apply(this, arguments); load(); return r; };
  }

  /* ---------------- Leads Processing (CRM): the menu link ---------------- */
  function crm() {
    var s = ses(); if (!s) return;
    var go = function () {
      var nav = document.querySelector('.app-nav'); if (!nav || $('amNavBtn')) return;
      var b = document.createElement('button'); b.type = 'button'; b.className = 'nav-tab'; b.id = 'amNavBtn'; b.textContent = 'Email marketing';
      b.onclick = function () { location.href = 'campaign.html'; };
      var es = $('openEmailSetupBtn'); nav.insertBefore(b, es ? es.nextSibling : null);
    };
    if (s.role !== 'sales') return; // the company admin opens it from the admin panel
    myRec(s).then(function (r) { if (r && r.mail) go(); });
  }

  /* ---------------- Campaigns page: only for the admin and agents with the tick ---------------- */
  function campaign() {
    var s = ses(); if (!s || s.role !== 'sales') return;
    document.documentElement.style.visibility = 'hidden'; // nothing shows until the check is done
    myRec(s).then(function (r) {
      if (!(r && r.mail)) { location.replace('crm.html'); return; }
      document.querySelectorAll('a.back-link').forEach(function (a) { a.href = 'crm.html'; a.lastChild.nodeValue = 'Back to Leads Processing'; });
      document.documentElement.style.visibility = '';
    }, function () { location.replace('crm.html'); });
  }

  ready(function () {
    if (page === 'hub') setTimeout(hub, 300);
    else if (page === 'crm') crm();
    else if (page === 'campaign') campaign();
  });
})();
