/**
 * resilience.js
 * Keeps the site dependable when things go wrong. Loaded on every page,
 * before the feature scripts, so it can catch their errors too.
 *
 *  - VenomLog: one structured log for client errors, network failures and
 *    form outcomes. It keeps the last 50 events for this tab in
 *    sessionStorage (open the console and run VenomLog.dump()) and, when
 *    ENDPOINT is set, beacons each event to it. ENDPOINT is empty because
 *    a static site has no server of its own to receive logs; point it at a
 *    collector and add that origin to connect-src in the CSP to switch it
 *    on. Events never carry what a visitor typed.
 *  - Broken images: <img data-hide-on-error> hides itself instead of
 *    showing a broken-image icon. Replaces inline onerror="" handlers,
 *    which the Content-Security-Policy forbids.
 *  - Offline notice: a quiet toast when the connection drops and returns.
 *  - Offline page: registers the service worker (sw.js).
 *  - Framing: GitHub Pages cannot send X-Frame-Options or CSP
 *    frame-ancestors, so a page framed by another site covers itself and
 *    offers to open properly. Defence in depth - the header is the real fix.
 */

(function (window, document) {
  'use strict';

  /* ---------------------------------------------------------------- *
   * Log
   * ---------------------------------------------------------------- */
  const ENDPOINT = '';
  const BUFFER_KEY = 'vr_log';
  const BUFFER_MAX = 50;
  const SEND_MAX = 20;      // per page view, so a loop can never flood a collector
  let sent = 0;

  function event(kind, detail) {
    const entry = Object.assign({
      kind: kind,
      at: new Date().toISOString(),
      page: window.location.pathname,
    }, detail || {});

    const line = '[venom:' + kind + ']';
    if (kind === 'error' || kind === 'network') console.error(line, entry);
    else console.info(line, entry);

    try {
      const buf = JSON.parse(window.sessionStorage.getItem(BUFFER_KEY) || '[]');
      buf.push(entry);
      window.sessionStorage.setItem(BUFFER_KEY, JSON.stringify(buf.slice(-BUFFER_MAX)));
    } catch (error) { /* storage unavailable */ }

    if (ENDPOINT && sent < SEND_MAX && navigator.sendBeacon) {
      sent += 1;
      try {
        navigator.sendBeacon(ENDPOINT, new Blob([JSON.stringify(entry)], { type: 'application/json' }));
      } catch (error) { /* ignore */ }
    }
  }

  function dump() {
    try { return JSON.parse(window.sessionStorage.getItem(BUFFER_KEY) || '[]'); } catch (error) { return []; }
  }

  window.VenomLog = { event: event, dump: dump };

  const trim = (v, n) => String(v == null ? '' : v).slice(0, n || 300);

  window.addEventListener('error', (e) => {
    const t = e.target;
    // Resource failures (img, video, script) arrive here in the capture phase.
    if (t && t !== window && (t.tagName === 'IMG' || t.tagName === 'SCRIPT' || t.tagName === 'LINK' || t.tagName === 'SOURCE' || t.tagName === 'VIDEO')) {
      if (t.tagName === 'IMG' && t.hasAttribute('data-hide-on-error')) t.style.display = 'none';
      event('resource', { tag: t.tagName.toLowerCase(), src: trim(t.currentSrc || t.src || t.href, 200) });
      return;
    }
    event('error', {
      message: trim(e.message),
      source: trim(e.filename, 200),
      line: e.lineno || 0,
      col: e.colno || 0,
    });
  }, true);

  window.addEventListener('unhandledrejection', (e) => {
    const r = e.reason;
    event('error', { message: trim(r && r.message ? r.message : r), type: 'unhandledrejection' });
  });

  window.addEventListener('securitypolicyviolation', (e) => {
    event('csp', { directive: e.violatedDirective, blocked: trim(e.blockedURI, 200) });
  });

  /* An image can fail before this script runs; catch those on load. */
  function sweepBrokenImages() {
    document.querySelectorAll('img[data-hide-on-error]').forEach((img) => {
      if (img.complete && img.naturalWidth === 0 && img.getAttribute('src')) img.style.display = 'none';
    });
  }

  /* ---------------------------------------------------------------- *
   * Framing defence
   * ---------------------------------------------------------------- */
  function guardFraming() {
    let framed = false;
    try { framed = window.top !== window.self && window.top.location.hostname !== window.location.hostname; }
    catch (error) { framed = true; }   // cross-origin parent: reading it throws
    if (!framed) return;

    event('security', { type: 'framed' });
    const cover = document.createElement('div');
    cover.className = 'frame-guard';
    cover.innerHTML =
      '<p>This page is being shown inside another website.</p>' +
      '<a class="btn btn-primary" target="_top" rel="noopener">Open Venom Racing directly</a>';
    cover.querySelector('a').href = window.location.href;
    document.body.appendChild(cover);
  }

  /* ---------------------------------------------------------------- *
   * Connection notice
   * ---------------------------------------------------------------- */
  let toast = null;
  let toastTimer = null;

  function notify(text, tone) {
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'net-toast';
      toast.setAttribute('role', 'status');
      toast.setAttribute('aria-live', 'polite');
      document.body.appendChild(toast);
    }
    toast.textContent = text;
    toast.dataset.tone = tone;
    toast.classList.add('is-visible');
    clearTimeout(toastTimer);
    if (tone === 'ok') toastTimer = setTimeout(() => toast.classList.remove('is-visible'), 3500);
  }

  function initConnection() {
    window.addEventListener('offline', () => {
      event('network', { state: 'offline' });
      notify('You are offline. Pages you have already visited will still open.', 'warn');
    });
    window.addEventListener('online', () => {
      event('network', { state: 'online' });
      notify('Back online.', 'ok');
    });
  }

  /* ---------------------------------------------------------------- *
   * Service worker - production origins only, so local development
   * never serves a stale cached file.
   * ---------------------------------------------------------------- */
  function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) return;
    if (!/(^|\.)venomracing\.co\.za$/.test(window.location.hostname)) return;
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch((error) => {
        event('error', { message: 'service worker: ' + trim(error && error.message) });
      });
    });
  }

  function init() {
    sweepBrokenImages();
    guardFraming();
    initConnection();
  }

  registerServiceWorker();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})(window, document);
