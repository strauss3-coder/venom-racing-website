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

  /* Kept so content rendered after load can be observed too. These classes
     start at opacity 0 and are only revealed by `.is-visible`, so anything
     created later without being observed would stay invisible forever. */
  let observer = null;

  function initScrollAnimations() {
    const targets = qsa(ANIMATION_SELECTORS);

    if (!('IntersectionObserver' in window)) {
      targets.forEach((el) => el.classList.add('is-visible'));
      return;
    }

    observer = new IntersectionObserver(
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

  /**
   * Observe animation targets inside a subtree rendered after page load.
   * Call this after replacing any markup that uses the animation classes.
   * @param {ParentNode} [scope=document]
   */
  function observe(scope) {
    const root = scope || document;
    const targets = Array.from(root.querySelectorAll(ANIMATION_SELECTORS));
    if (root.matches && root.matches(ANIMATION_SELECTORS)) targets.push(root);
    if (!observer) {
      targets.forEach((el) => el.classList.add('is-visible'));
      return;
    }
    targets.forEach((el) => {
      if (!el.classList.contains('is-visible')) observer.observe(el);
    });
  }

  /** Re-apply the stagger delays inside a freshly rendered container. */
  function stagger(container) {
    if (!container) return;
    Array.from(container.children).forEach((child, index) => {
      child.style.transitionDelay = `${index * 80}ms`;
    });
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

  window.VenomAnimations = { observe, stagger };
})(window, document);
