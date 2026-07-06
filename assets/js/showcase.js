/**
 * showcase.js
 * Premium image showcase carousel used on the About page.
 * One slide at a time with a sliding track: prev/next arrows (desktop),
 * touch swipe (mobile), pagination dots, autoplay every 4.5s with
 * continuous loop, and pause-on-interaction. No external dependencies.
 * Autoplay + slide transitions are disabled under prefers-reduced-motion
 * (arrows/dots/swipe still work).
 */

(function (window, document) {
  'use strict';

  const { qs, qsa } = window.VenomUtils || {};
  const AUTOPLAY_MS = 4500;
  const SWIPE_THRESHOLD = 40;

  function initShowcase(root) {
    const track = qs('[data-showcase-track]', root);
    const slides = qsa('.showcase__slide', root);
    const prevBtn = qs('[data-showcase-prev]', root);
    const nextBtn = qs('[data-showcase-next]', root);
    const dotsWrap = qs('[data-showcase-dots]', root);
    if (!track || slides.length < 2) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let index = 0;
    let timer = null;

    // Build pagination dots
    const dots = [];
    if (dotsWrap) {
      slides.forEach((_, i) => {
        const dot = document.createElement('button');
        dot.type = 'button';
        dot.setAttribute('aria-label', `Go to image ${i + 1}`);
        dot.addEventListener('click', () => {
          go(i);
          restart();
        });
        dotsWrap.appendChild(dot);
        dots.push(dot);
      });
    }

    if (reduceMotion) track.style.transition = 'none';

    function go(i) {
      index = (i + slides.length) % slides.length;
      track.style.transform = `translateX(-${index * 100}%)`;
      dots.forEach((dot, d) => dot.classList.toggle('is-active', d === index));
    }

    const next = () => go(index + 1);
    const prev = () => go(index - 1);

    function play() {
      if (reduceMotion || timer) return;
      timer = window.setInterval(next, AUTOPLAY_MS);
    }
    function stop() {
      if (timer) {
        window.clearInterval(timer);
        timer = null;
      }
    }
    function restart() {
      stop();
      play();
    }

    prevBtn && prevBtn.addEventListener('click', () => { prev(); restart(); });
    nextBtn && nextBtn.addEventListener('click', () => { next(); restart(); });

    // Pause while the pointer is over the showcase or it has focus
    root.addEventListener('mouseenter', stop);
    root.addEventListener('mouseleave', play);
    root.addEventListener('focusin', stop);
    root.addEventListener('focusout', play);

    // Touch swipe
    let startX = 0;
    let startY = 0;
    let swiping = false;
    track.addEventListener('touchstart', (e) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      swiping = true;
      stop();
    }, { passive: true });
    track.addEventListener('touchend', (e) => {
      if (!swiping) return;
      swiping = false;
      const dx = e.changedTouches[0].clientX - startX;
      const dy = e.changedTouches[0].clientY - startY;
      // Only treat as a swipe if the gesture was mostly horizontal
      if (Math.abs(dx) > SWIPE_THRESHOLD && Math.abs(dx) > Math.abs(dy)) {
        dx < 0 ? next() : prev();
      }
      restart();
    }, { passive: true });

    // Pause when the tab is hidden
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stop();
      else play();
    });

    go(0);
    play();
  }

  document.addEventListener('DOMContentLoaded', () => {
    qsa('[data-showcase]').forEach(initShowcase);
  });
})(window, document);
