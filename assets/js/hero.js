/**
 * hero.js
 * Homepage hero (v2) — one cohesive cinematic section:
 *   - Ambient background video (muted, looped) with a graceful gradient
 *     fallback on error / reduced-motion.
 *   - Ambient rising particle field.
 *   - Right-hand showcase carousel: auto-rotates every 5s, with arrows,
 *     dots, keyboard, swipe and mouse-drag. Pauses on hover / focus / tab
 *     hidden. Infinite wrap-around.
 *   - Very subtle mouse parallax on the background (pointer + fine only).
 * No scroll-jacking; the whole hero lives in one viewport-height section.
 */

(function (window, document) {
  'use strict';

  const { qs, qsa } = window.VenomUtils || {};

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /** Ambient rising particles (decorative, CSS-animated). */
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

  function initVideo(hero) {
    const video = qs('.hero__video', hero);
    if (!video) return;
    video.addEventListener('error', () => hero.classList.add('hero--video-fallback'));
    if (reduceMotion) {
      video.pause();
    } else {
      const p = video.play();
      if (p && typeof p.catch === 'function') p.catch(() => {});
    }
  }

  /** Very subtle background parallax following the cursor. */
  function initParallax(hero) {
    if (reduceMotion) return;
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    const media = qs('[data-hero-media]', hero);
    if (!media) return;

    let raf = null;
    let tx = 0;
    let ty = 0;
    const apply = () => { raf = null; media.style.transform = `translate3d(${tx}px, ${ty}px, 0)`; };
    hero.addEventListener('pointermove', (e) => {
      const r = hero.getBoundingClientRect();
      const nx = (e.clientX - r.left) / r.width - 0.5;
      const ny = (e.clientY - r.top) / r.height - 0.5;
      tx = nx * -14;
      ty = ny * -14;
      if (!raf) raf = window.requestAnimationFrame(apply);
    });
    hero.addEventListener('pointerleave', () => {
      tx = 0; ty = 0;
      if (!raf) raf = window.requestAnimationFrame(apply);
    });
  }

  function initHero() {
    const hero = qs('.hero[data-hero]');
    if (!hero) return;
    initVideo(hero);
    initParallax(hero);
  }

  document.addEventListener('DOMContentLoaded', () => {
    initParticleFields();
    initHero();
  });
})(window, document);
