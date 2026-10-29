/* Dispatch Link | FMCSA open data (data.transportation.gov) app token.
   Without a token the open data server lets each computer make only a few requests and then answers
   "HTTP 429 Too many requests". With a free app token every request is counted for our app instead,
   and Socrata does not throttle it. Load this file BEFORE scraper-core.js. */
(function () {
  var TOKEN = 'dsccnlCwYk1xG69NgjhK1rTeF', BAD = false;
  if (typeof window.fetch !== 'function') return;
  var orig = window.fetch;
  /* BrokerSnapshot now asks for a login and cannot be read from this page any more: the scanner skips it
     at once (as "not listed") instead of waiting and retrying on every MC. FMCSA, MOTUS and CarrierChk are used. */
  var BS = /^https:\/\/(www\.)?brokersnapshot\.com\//i;
  try { if (localStorage.getItem('dl_source') === 'brokersnapshot') localStorage.setItem('dl_source', 'carrierchk'); } catch (e) {}
  var OPEN = /^https:\/\/data\.transportation\.gov\/resource\//i;
  window.fetch = function (input, init) {
    var self = window, plain = input, url = '';
    try { url = typeof input === 'string' ? input : (input && input.url) || ''; } catch (e) {}
    if (BS.test(url)) return Promise.resolve(new Response('', { status: 404, statusText: 'Not used' }));
    if (BAD || !OPEN.test(url) || /[?&]\$\$app_token=/.test(url)) return orig.call(self, input, init);
    var withTok = url + (url.indexOf('?') < 0 ? '?' : '&') + '$$app_token=' + encodeURIComponent(TOKEN);
    return orig.call(self, typeof input === 'string' ? withTok : new Request(withTok, input), init).then(function (r) {
      if (r.status !== 403) return r;
      return r.clone().text().then(function (t) { // a wrong / deleted token: carry on without it (as before)
        if (!/app_?token/i.test(t)) return r;
        BAD = true; try { console.warn('FMCSA open data: the app token was refused, working without it.'); } catch (e) {}
        return orig.call(self, plain, init);
      });
    });
  };
})();
