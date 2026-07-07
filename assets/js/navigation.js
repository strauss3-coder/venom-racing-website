/**
 * navigation.js
 * Handles navbar behaviour: mobile menu toggle, scroll-based styling,
 * active-link highlighting, a floating quick-nav island, and making every
 * page open at the top (no unwanted scroll restoration).
 * Depends on utils.js being loaded first.
 */

(function (window, document) {
  'use strict';

  const { qs, qsa } = window.VenomUtils || {};

  // Stop the browser restoring the previous scroll position on refresh /
  // back-forward — every page should open at the top (the Hero on home).
  if ('scrollRestoration' in window.history) {
    window.history.scrollRestoration = 'manual';
  }

  const currentPage = window.location.pathname.split('/').pop() || 'index.html';

  function initMobileToggle() {
    const toggle = qs('.navbar__toggle');
    const links = qs('.navbar__links');

    if (!toggle || !links) return;

    toggle.addEventListener('click', () => {
      const isOpen = links.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', String(isOpen));
      document.body.classList.toggle('nav-open', isOpen);
    });
  }

  function initScrollStyling() {
    const navbar = qs('.navbar');
    if (!navbar) return;

    const onScroll = () => {
      navbar.classList.toggle('navbar--scrolled', window.scrollY > 10);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  function initActiveLink() {
    qsa('.navbar__link').forEach((link) => {
      if (link.getAttribute('href') === currentPage) {
        link.classList.add('is-active');
        link.setAttribute('aria-current', 'page');
      }
    });
  }

  // Land at the top on load unless a deep-link hash is present (so anchor
  // links like performance.html#exhaust still work).
  function initTopOnLoad() {
    if (!window.location.hash) window.scrollTo(0, 0);
  }

  /* ------------------------------------------------------------------ *
   * Floating quick-nav island — fades in after ~280px of scroll.
   * ------------------------------------------------------------------ */
  const FNAV_ITEMS = [
    { href: 'index.html', label: 'Home', icon: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 10v10h14V10"/>' },
    { href: 'about.html', label: 'About', icon: '<circle cx="12" cy="12" r="9"/><path d="M12 11.5v4.5"/><path d="M12 8h.01"/>' },
    { href: 'services.html', label: 'Services', icon: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.5-3.5a6 6 0 0 1-7.9 7.9l-6.9 6.9a2.1 2.1 0 0 1-3-3l6.9-6.9a6 6 0 0 1 7.9-7.9z"/>' },
    { href: 'performance.html', label: 'Performance', icon: '<path d="M4 18a9 9 0 1 1 16 0"/><path d="M12 13l4-4"/><circle cx="12" cy="13" r="1.6"/>' },
    { href: 'gallery.html', label: 'Gallery', icon: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9.5" r="1.5"/><path d="M21 16l-5-5-8 8"/>' },
    { href: 'reviews.html', label: 'Reviews', icon: '<path d="M12 3l2.9 6.3 6.9.6-5.2 4.6 1.6 6.8L12 17.6 5.8 21.9l1.6-6.8L2.2 9.9l6.9-.6z"/>' },
    { href: 'faqs.html', label: 'FAQs', icon: '<circle cx="12" cy="12" r="9"/><path d="M9.6 9.2a2.5 2.5 0 0 1 4.6 1.3c0 1.6-2.2 2-2.2 3.5"/><path d="M12 17h.01"/>' },
    { href: 'contact.html', label: 'Contact', icon: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3.5 7 12 13l8.5-6"/>' },
  ];

  function initFloatingNav() {
    if (qs('.fnav')) return;

    const nav = document.createElement('nav');
    nav.className = 'fnav';
    nav.setAttribute('aria-label', 'Quick navigation');

    nav.innerHTML = FNAV_ITEMS.map((item) => {
      const current = item.href === currentPage;
      return (
        '<a class="fnav__item' + (current ? ' is-current' : '') + '" href="' + item.href + '"' +
        (current ? ' aria-current="page"' : '') + ' aria-label="' + item.label + '">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" ' +
        'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + item.icon + '</svg>' +
        '<span class="fnav__label">' + item.label + '</span></a>'
      );
    }).join('');

    document.body.appendChild(nav);

    // Clicking the current page's own item scrolls smoothly to the top.
    qsa('.fnav__item', nav).forEach((a) => {
      if (a.getAttribute('href') === currentPage) {
        a.addEventListener('click', (e) => {
          e.preventDefault();
          window.scrollTo({ top: 0, behavior: 'smooth' });
        });
      }
    });

    // Fade in after ~280px of scroll, keeping the hero clean.
    const SHOW_AT = 280;
    let raf = null;
    const update = () => {
      raf = null;
      nav.classList.toggle('is-visible', window.scrollY > SHOW_AT);
    };
    window.addEventListener('scroll', () => {
      if (!raf) raf = window.requestAnimationFrame(update);
    }, { passive: true });
    update();
  }

  function initNavigation() {
    initTopOnLoad();
    initMobileToggle();
    initScrollStyling();
    initActiveLink();
    initFloatingNav();
  }

  document.addEventListener('DOMContentLoaded', initNavigation);
})(window, document);
