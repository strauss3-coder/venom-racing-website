/**
 * navigation.js
 * Handles navbar behaviour: mobile menu toggle, scroll-based styling,
 * and active-link highlighting.
 * Depends on utils.js being loaded first.
 */

(function (window, document) {
  'use strict';

  const { qs, qsa } = window.VenomUtils || {};

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
    const currentPath = window.location.pathname.split('/').pop() || 'index.html';
    qsa('.navbar__link').forEach((link) => {
      const linkPath = link.getAttribute('href');
      if (linkPath === currentPath) {
        link.classList.add('is-active');
        link.setAttribute('aria-current', 'page');
      }
    });
  }

  function initNavigation() {
    initMobileToggle();
    initScrollStyling();
    initActiveLink();
  }

  document.addEventListener('DOMContentLoaded', initNavigation);
})(window, document);
