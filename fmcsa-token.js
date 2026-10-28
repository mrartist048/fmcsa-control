/* Dispatch Link | FMCSA open data (data.transportation.gov) app token.
   Without a token the open data server lets each computer make only a few requests and then answers
   "HTTP 429 Too many requests". With a free app token every request is counted for our app instead,
   and Socrata does not throttle it. Load this file BEFORE scraper-core.js. */
(function () {
  var TOKEN = 'dsccnlCwYk1xG69NgjhK1rTeF', BAD = false;
  if (!TOKEN || typeof window.fetch !== 'function') return;
  var orig = window.fetch;
  var OPEN = /^https:\/\/data\.transportation\.gov\/resource\//i;
  window.fetch = function (input, init) {
    var self = window, plain = input, url = '';
    try { url = typeof input === 'string' ? input : (input && input.url) || ''; } catch (e) {}
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
