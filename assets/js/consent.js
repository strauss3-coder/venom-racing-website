/**
 * consent.js
 * Cookie consent: the banner, the preferences dialog, and the gate that
 * keeps third-party content switched off until a visitor allows it.
 *
 * Categories
 *   necessary  - always on. This consent record, the enquiry form's abuse
 *                limits and the offline cache. Nothing here tracks anyone.
 *   functional - embedded Google Maps. Google may set cookies when a map
 *                loads, so maps stay as a placeholder until allowed.
 *   analytics  - nothing uses this today. A tag added later is gated with
 *                <script type="text/plain" data-consent="analytics"
 *                data-consent-src="..."> and only runs once allowed.
 *   marketing  - as analytics: reserved, gated, unused.
 *
 * Gating, for any category:
 *   <iframe data-consent="functional" data-consent-src="https://...">
 *   <script type="text/plain" data-consent="analytics" data-consent-src="https://...">
 *
 * The choice is kept in localStorage, not a cookie, so it is never sent to
 * any server. Bump VERSION when the categories or what they cover change,
 * and every visitor is asked again.
 *
 * Exposes window.VenomConsent and fires a `venom:consent` event on change.
 */

(function (window, document) {
  'use strict';

  const VERSION = 1;
  const KEY = 'vr_consent';
  const OPTIONAL = ['functional', 'analytics', 'marketing'];

  /* Cookies a withdrawn category may have left on our own domain. */
  const CLEAR_ON_WITHDRAW = {
    analytics: [/^_ga/, /^_gid$/, /^_gat/, /^_clck$/, /^_clsk$/],
    marketing: [/^_fbp$/, /^_fbc$/, /^_gcl_/, /^_tt_/],
  };

  let state = null;
  let banner = null;
  let dialog = null;
  let lastFocus = null;

  /* ---------------------------------------------------------------- *
   * State
   * ---------------------------------------------------------------- */
  function read() {
    try {
      const v = JSON.parse(window.localStorage.getItem(KEY) || 'null');
      return v && v.version === VERSION ? v : null;
    } catch (error) {
      return null;
    }
  }

  function write(choices) {
    const previous = state;
    state = {
      version: VERSION,
      at: new Date().toISOString(),
      necessary: true,
      functional: Boolean(choices.functional),
      analytics: Boolean(choices.analytics),
      marketing: Boolean(choices.marketing),
    };
    try { window.localStorage.setItem(KEY, JSON.stringify(state)); } catch (error) { /* session only */ }

    const withdrawn = previous ? OPTIONAL.filter((c) => previous[c] && !state[c]) : [];
    withdrawn.forEach(clearCookies);

    apply();
    hideBanner();
    window.dispatchEvent(new CustomEvent('venom:consent', { detail: Object.assign({}, state) }));

    // A script that already ran cannot be unloaded; a reload is the only
    // honest way to stop it once its consent is withdrawn.
    if (withdrawn.some((c) => document.querySelector('script[data-consent="' + c + '"][data-consent-active]'))) {
      window.location.reload();
    }
  }

  function allowed(category) {
    if (category === 'necessary') return true;
    return Boolean(state && state[category]);
  }

  function clearCookies(category) {
    const patterns = CLEAR_ON_WITHDRAW[category] || [];
    if (!patterns.length) return;
    const host = window.location.hostname;
    const domains = ['', host, '.' + host.replace(/^www\./, '')];
    document.cookie.split(';').forEach((pair) => {
      const name = pair.split('=')[0].trim();
      if (!patterns.some((re) => re.test(name))) return;
      domains.forEach((d) => {
        document.cookie = name + '=; Max-Age=0; path=/' + (d ? '; domain=' + d : '') + '; SameSite=Lax; Secure';
      });
    });
  }

  /* ---------------------------------------------------------------- *
   * Gating
   * ---------------------------------------------------------------- */
  const LABELS = { functional: 'maps and embedded content', analytics: 'analytics', marketing: 'marketing' };

  function placeholderFor(frame) {
    let ph = frame.previousElementSibling;
    if (ph && ph.classList.contains('consent-embed__placeholder')) return ph;
    const category = frame.getAttribute('data-consent');
    ph = document.createElement('div');
    ph.className = 'consent-embed__placeholder';
    ph.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true">' +
      '<path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11z"/><circle cx="12" cy="10" r="2.6"/></svg>' +
      '<p class="consent-embed__title"></p>' +
      '<p class="consent-embed__text">This map is provided by Google, which may set cookies when it loads. ' +
      'Read our <a href="cookies.html">Cookie Policy</a>.</p>' +
      '<button type="button" class="btn btn-secondary consent-embed__btn">Allow &amp; show map</button>';
    ph.querySelector('.consent-embed__title').textContent = frame.getAttribute('title') || 'Embedded map';
    ph.querySelector('button').addEventListener('click', () => {
      write(Object.assign({}, state || {}, { [category]: true }));
    });
    ph.setAttribute('data-category', LABELS[category] || category);
    frame.parentNode.insertBefore(ph, frame);
    return ph;
  }

  function apply() {
    document.querySelectorAll('iframe[data-consent]').forEach((frame) => {
      const category = frame.getAttribute('data-consent');
      const src = frame.getAttribute('data-consent-src');
      const ph = placeholderFor(frame);
      if (allowed(category) && src) {
        if (frame.getAttribute('src') !== src) frame.setAttribute('src', src);
        frame.hidden = false;
        ph.hidden = true;
      } else {
        if (frame.hasAttribute('src')) frame.removeAttribute('src');
        frame.hidden = true;
        ph.hidden = false;
      }
    });

    document.querySelectorAll('script[type="text/plain"][data-consent]:not([data-consent-active])').forEach((tag) => {
      if (!allowed(tag.getAttribute('data-consent'))) return;
      const s = document.createElement('script');
      const src = tag.getAttribute('data-consent-src');
      if (src) s.src = src; else s.textContent = tag.textContent;
      s.async = true;
      tag.setAttribute('data-consent-active', '');
      tag.after(s);
    });
  }

  /* ---------------------------------------------------------------- *
   * Banner
   * ---------------------------------------------------------------- */
  function showBanner() {
    if (banner) { banner.hidden = false; return; }
    banner = document.createElement('section');
    banner.className = 'consent-banner';
    banner.setAttribute('role', 'region');
    banner.setAttribute('aria-label', 'Cookie consent');
    banner.innerHTML =
      '<div class="consent-banner__body">' +
        '<p class="consent-banner__title">Your privacy, your call</p>' +
        '<p class="consent-banner__text">We use only what the site needs to work. With your permission we ' +
        'also load Google Maps, which may set its own cookies. You can change this at any time. ' +
        '<a href="cookies.html">Cookie Policy</a></p>' +
      '</div>' +
      '<div class="consent-banner__actions">' +
        '<button type="button" class="btn btn-outline" data-consent-action="customise">Customise</button>' +
        '<button type="button" class="btn btn-secondary" data-consent-action="necessary">Necessary only</button>' +
        '<button type="button" class="btn btn-primary" data-consent-action="all">Accept all</button>' +
      '</div>';
    banner.addEventListener('click', (event) => {
      const btn = event.target.closest('[data-consent-action]');
      if (!btn) return;
      const action = btn.getAttribute('data-consent-action');
      if (action === 'all') write({ functional: true, analytics: true, marketing: true });
      else if (action === 'necessary') write({});
      else openPreferences();
    });
    document.body.appendChild(banner);
    requestAnimationFrame(() => banner.classList.add('is-visible'));
  }

  function hideBanner() {
    if (banner) banner.hidden = true;
  }

  /* ---------------------------------------------------------------- *
   * Preferences dialog - a native <dialog>, so focus is trapped and
   * Escape closes it without any extra code.
   * ---------------------------------------------------------------- */
  const CATEGORIES = [
    { id: 'necessary', name: 'Strictly necessary', locked: true,
      text: 'Remembers this choice, protects our enquiry forms from abuse and keeps the site usable offline. Stored only in your browser. Always on.' },
    { id: 'functional', name: 'Functional',
      text: 'Embedded Google Maps on our contact and home pages. Google may set cookies when a map loads.' },
    { id: 'analytics', name: 'Analytics',
      text: 'Anonymous visit statistics that help us improve the site. Not in use today - nothing loads unless we add it and you allow it.' },
    { id: 'marketing', name: 'Marketing',
      text: 'Measuring adverts on social media. Not in use today - nothing loads unless we add it and you allow it.' },
  ];

  function buildDialog() {
    dialog = document.createElement('dialog');
    dialog.className = 'consent-dialog';
    dialog.setAttribute('aria-labelledby', 'consent-dialog-title');
    dialog.innerHTML =
      '<form method="dialog" class="consent-dialog__inner">' +
        '<header class="consent-dialog__head">' +
          '<span class="eyebrow">Privacy</span>' +
          '<h2 id="consent-dialog-title">Cookie preferences</h2>' +
          '<p>Choose what you are comfortable with. You can come back and change it from the footer at any time.</p>' +
        '</header>' +
        '<ul class="consent-dialog__list">' +
          CATEGORIES.map((c) =>
            '<li class="consent-option">' +
              '<div class="consent-option__copy">' +
                '<label class="consent-option__name" for="consent-' + c.id + '">' + c.name + '</label>' +
                '<p class="consent-option__text" id="consent-' + c.id + '-desc">' + c.text + '</p>' +
              '</div>' +
              '<input class="consent-switch" type="checkbox" role="switch" id="consent-' + c.id + '" name="' + c.id + '"' +
                ' aria-describedby="consent-' + c.id + '-desc"' + (c.locked ? ' checked disabled' : '') + '>' +
            '</li>').join('') +
        '</ul>' +
        '<footer class="consent-dialog__actions">' +
          '<button type="button" class="btn btn-outline" data-consent-action="necessary">Necessary only</button>' +
          '<button type="button" class="btn btn-secondary" data-consent-action="save">Save choices</button>' +
          '<button type="button" class="btn btn-primary" data-consent-action="all">Accept all</button>' +
        '</footer>' +
        '<button type="submit" class="consent-dialog__close" aria-label="Close cookie preferences">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>' +
        '</button>' +
      '</form>';

    dialog.addEventListener('click', (event) => {
      if (event.target === dialog) { closePreferences(); return; }
      const btn = event.target.closest('[data-consent-action]');
      if (!btn) return;
      const action = btn.getAttribute('data-consent-action');
      if (action === 'all') write({ functional: true, analytics: true, marketing: true });
      else if (action === 'necessary') write({});
      else {
        const choice = {};
        OPTIONAL.forEach((c) => { choice[c] = dialog.querySelector('#consent-' + c).checked; });
        write(choice);
      }
      closePreferences();
    });
    dialog.addEventListener('close', () => {
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    });
    document.body.appendChild(dialog);
  }

  function openPreferences() {
    if (!dialog) buildDialog();
    OPTIONAL.forEach((c) => { dialog.querySelector('#consent-' + c).checked = allowed(c); });
    lastFocus = document.activeElement;
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
  }

  function closePreferences() {
    if (!dialog) return;
    if (typeof dialog.close === 'function' && dialog.open) dialog.close();
    else dialog.removeAttribute('open');
  }

  /* ---------------------------------------------------------------- */
  function init() {
    state = read();
    apply();
    document.addEventListener('click', (event) => {
      const opener = event.target.closest('[data-consent-open]');
      if (!opener) return;
      event.preventDefault();
      openPreferences();
    });
    if (!state) showBanner();
  }

  window.VenomConsent = {
    allowed: allowed,
    apply: apply,
    open: openPreferences,
    get: () => (state ? Object.assign({}, state) : null),
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})(window, document);
