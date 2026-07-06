/**
 * hero.js
 * Homepage hero behaviour (no external dependencies):
 *  - Autoplays the ambient background video (muted, looped); pauses and
 *    shows a gradient fallback if the video errors or reduced-motion is
 *    preferred.
 *  - Populates the hero's ambient particle field.
 *  - Drives the right-hand card sequence: on capable desktops the stage
 *    pins (CSS position: sticky) and the three cards cross-fade one at a
 *    time as the visitor scrolls through the hero, then normal scrolling
 *    resumes. On mobile / reduced-motion / no-JS the cards simply stack
 *    and stay visible — no pin, no scroll-jacking.
 */

(function (window, document) {
  'use strict';

  const { qs, qsa } = window.VenomUtils || {};

  /** Ambient rising particles inside the hero (decorative, CSS-animated). */
  function initParticleFields() {
    qsa('[data-particles]').forEach((field) => {
      const count = Number(field.dataset.particleCount) || 16;
      const fragment = document.createDocumentFragment();
      for (let i = 0; i < count; i += 1) {
        const particle = document.createElement('span');
        particle.className = 'particle';
        particle.style.left = `${Math.random() * 100}%`;
        particle.style.bottom = `${Math.random() * 40 - 10}%`;
        particle.style.setProperty('--drift-x', `${(Math.random() - 0.5) * 60}px`);
        particle.style.setProperty('--particle-opacity', String(0.25 + Math.random() * 0.35));
        particle.style.animationDuration = `${6 + Math.random() * 6}s`;
        particle.style.animationDelay = `${Math.random() * 8}s`;
        fragment.appendChild(particle);
      }
      field.appendChild(fragment);
    });
  }

  /**
   * Opacity 0–1 for scroll `progress`, ramping up across [a,b], holding
   * across [b,c], ramping down across [c,d]. Values outside [a,d] = 0.
   */
  function windowOpacity(p, [a, b, c, d]) {
    if (p <= a || p >= d) return 0;
    if (p < b) return (p - a) / (b - a);
    if (p <= c) return 1;
    return 1 - (p - c) / (d - c);
  }

  function initHero() {
    const hero = qs('.hero[data-hero]');
    if (!hero) return;

    const video = qs('.hero__video', hero);
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* --- Video: ambient autoplay with graceful fallback --- */
    if (video) {
      video.addEventListener('error', () => hero.classList.add('hero--video-fallback'));
      if (reduceMotion) {
        video.pause();
      } else {
        // play() can reject on some browsers until a gesture; ignore quietly.
        const p = video.play();
        if (p && typeof p.catch === 'function') p.catch(() => {});
      }
    }

    /* --- Card sequence (desktop enhancement only) --- */
    const stage = qs('[data-hero-stage]', hero);
    const cardsWrap = qs('[data-hero-cards]', hero);
    const cards = qsa('.hero__card', hero);
    const dots = qsa('[data-hero-dots] span', hero);
    if (!stage || !cardsWrap || cards.length < 2) return;

    const desktopMq = window.matchMedia('(min-width: 992px)');
    const supportsSticky = window.CSS && CSS.supports && CSS.supports('position', 'sticky');

    // [fadeInStart, fullFrom, fullUntil, fadeOutEnd] per card, over hero progress 0–1.
    const windows = [
      [-1, -1, 0.30, 0.38],
      [0.32, 0.42, 0.60, 0.68],
      [0.64, 0.74, 1.1, 1.1],
    ];

    let enhanced = false;
    let ticking = false;

    const render = () => {
      const total = hero.offsetHeight - stage.offsetHeight;
      const scrolled = -hero.getBoundingClientRect().top;
      const progress = total > 0 ? Math.min(Math.max(scrolled / total, 0), 1) : 0;

      let active = 0;
      cards.forEach((card, i) => {
        const o = windowOpacity(progress, windows[i]);
        card.style.opacity = String(o);
        card.style.transform = `translateY(${(1 - o) * 24}px)`;
        card.style.filter = `blur(${(1 - o) * 6}px)`;
        card.style.pointerEvents = o > 0.5 ? 'auto' : 'none';
        if (o >= 0.5) active = i;
      });

      dots.forEach((dot, i) => dot.classList.toggle('is-active', i === active));
      ticking = false;
    };

    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(render);
        ticking = true;
      }
    };

    const clearCardStyles = () => {
      cards.forEach((card) => {
        card.style.opacity = '';
        card.style.transform = '';
        card.style.filter = '';
        card.style.pointerEvents = '';
      });
    };

    const enable = () => {
      if (enhanced) return;
      enhanced = true;
      hero.classList.add('is-sequenced');
      cardsWrap.classList.add('is-sequenced');
      window.addEventListener('scroll', onScroll, { passive: true });
      render();
    };

    const disable = () => {
      if (!enhanced) return;
      enhanced = false;
      hero.classList.remove('is-sequenced');
      cardsWrap.classList.remove('is-sequenced');
      window.removeEventListener('scroll', onScroll);
      clearCardStyles();
    };

    const evaluate = () => {
      if (desktopMq.matches && !reduceMotion && supportsSticky) enable();
      else disable();
    };

    evaluate();
    // Re-evaluate on breakpoint changes (orientation / resize).
    if (desktopMq.addEventListener) desktopMq.addEventListener('change', evaluate);
    else if (desktopMq.addListener) desktopMq.addListener(evaluate);
  }

  document.addEventListener('DOMContentLoaded', () => {
    initParticleFields();
    initHero();
  });
})(window, document);
