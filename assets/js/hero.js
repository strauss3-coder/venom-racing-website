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

  /** Right-side showcase carousel with 5s autoplay. */
  function initShowcase(hero) {
    const root = qs('[data-hero-showcase]', hero);
    if (!root) return;
    const track = qs('[data-hs-track]', root);
    const viewport = qs('[data-hs-viewport]', root);
    const slides = qsa('.hero-showcase__slide', track);
    if (!track || !viewport || slides.length < 2) return;

    const prevBtn = qs('[data-hs-prev]', root);
    const nextBtn = qs('[data-hs-next]', root);
    const dotsWrap = qs('[data-hs-dots]', root);
    const total = slides.length;
    let index = 0;

    const dots = [];
    if (dotsWrap) {
      slides.forEach((_, i) => {
        const d = document.createElement('button');
        d.type = 'button';
        d.className = 'hero-showcase__dot';
        d.setAttribute('role', 'tab');
        d.setAttribute('aria-label', `Go to slide ${i + 1} of ${total}`);
        d.addEventListener('click', () => { goTo(i); restart(); });
        dotsWrap.appendChild(d);
        dots.push(d);
      });
    }

    function render(animate) {
      if (!animate) track.classList.add('is-no-transition');
      track.style.transform = `translateX(${-index * 100}%)`;
      dots.forEach((d, i) => {
        const on = i === index;
        d.classList.toggle('is-active', on);
        d.setAttribute('aria-selected', on ? 'true' : 'false');
      });
      slides.forEach((s, i) => s.setAttribute('aria-hidden', i === index ? 'false' : 'true'));
      if (!animate) { void track.offsetWidth; track.classList.remove('is-no-transition'); }
    }
    function goTo(i) { index = ((i % total) + total) % total; render(true); }
    const next = () => goTo(index + 1);
    const prev = () => goTo(index - 1);

    if (nextBtn) nextBtn.addEventListener('click', () => { next(); restart(); });
    if (prevBtn) prevBtn.addEventListener('click', () => { prev(); restart(); });

    viewport.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') { e.preventDefault(); next(); restart(); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); prev(); restart(); }
    });

    /* Autoplay */
    let timer = null;
    function play() {
      if (reduceMotion || timer) return;
      timer = window.setInterval(next, 5000);
    }
    function stop() { if (timer) { window.clearInterval(timer); timer = null; } }
    function restart() { stop(); play(); }

    root.addEventListener('mouseenter', stop);
    root.addEventListener('mouseleave', play);
    root.addEventListener('focusin', stop);
    root.addEventListener('focusout', play);
    document.addEventListener('visibilitychange', () => { document.hidden ? stop() : play(); });

    /* Pointer swipe / drag */
    let dragging = false;
    let startX = 0;
    let dx = 0;
    let width = 0;
    viewport.addEventListener('pointerdown', (e) => {
      dragging = true; startX = e.clientX; dx = 0; width = viewport.clientWidth || 1;
      track.classList.add('is-no-transition');
      viewport.classList.add('is-dragging');
      stop();
      if (viewport.setPointerCapture) { try { viewport.setPointerCapture(e.pointerId); } catch (err) { /* noop */ } }
    });
    viewport.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      dx = e.clientX - startX;
      track.style.transform = `translateX(calc(${-index * 100}% + ${dx}px))`;
    });
    function endDrag() {
      if (!dragging) return;
      dragging = false;
      viewport.classList.remove('is-dragging');
      track.classList.remove('is-no-transition');
      const threshold = Math.max(40, width * 0.15);
      if (dx <= -threshold) next();
      else if (dx >= threshold) prev();
      else render(true);
      dx = 0;
      restart();
    }
    viewport.addEventListener('pointerup', endDrag);
    viewport.addEventListener('pointercancel', endDrag);

    render(false);
    play();
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
    initShowcase(hero);
    initParallax(hero);
  }

  document.addEventListener('DOMContentLoaded', () => {
    initParticleFields();
    initHero();
  });
})(window, document);
