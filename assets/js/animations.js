/**
 * animations.js
 * Scroll-triggered animations using IntersectionObserver.
 * Toggles `.is-visible` on elements marked with animation classes
 * (`.fade-in`, `.slide-up`, `.slide-in-left`, `.slide-in-right`)
 * defined in assets/css/animations.css.
 */

(function (window, document) {
  'use strict';

  const { qsa } = window.VenomUtils || {};

  const ANIMATION_SELECTORS = '.fade-in, .slide-up, .slide-in-left, .slide-in-right';

  function initScrollAnimations() {
    const targets = qsa(ANIMATION_SELECTORS);
    if (!targets.length) return;

    if (!('IntersectionObserver' in window)) {
      targets.forEach((el) => el.classList.add('is-visible'));
      return;
    }

    const observer = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            obs.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -50px 0px' }
    );

    targets.forEach((el) => observer.observe(el));
  }

  function initStaggeredChildren() {
    qsa('[data-stagger]').forEach((container) => {
      Array.from(container.children).forEach((child, index) => {
        child.style.transitionDelay = `${index * 80}ms`;
      });
    });
  }

  function initAnimations() {
    initStaggeredChildren();
    initScrollAnimations();
  }

  document.addEventListener('DOMContentLoaded', initAnimations);
})(window, document);
