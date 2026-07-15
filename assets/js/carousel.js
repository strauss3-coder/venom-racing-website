/**
 * carousel.js
 * Reusable, dependency-free gallery carousel used everywhere on the site.
 * One component, one behaviour — initialise any number of galleries by
 * marking them up with [data-carousel] (see the markup contract below).
 *
 *   <div class="carousel media-frame ..." data-carousel>
 *     <div class="carousel__viewport" data-carousel-viewport tabindex="0">
 *       <ul class="carousel__track" data-carousel-track>
 *         <li class="carousel__slide"><img ...></li> ...
 *       </ul>
 *     </div>
 *     <button data-carousel-prev>…</button>
 *     <button data-carousel-next>…</button>
 *     <div class="carousel__ui">
 *       <div class="carousel__dots" data-carousel-dots></div>
 *       <span class="carousel__counter" data-carousel-counter></span>
 *     </div>
 *   </div>
 *
 * Features: prev/next arrows, dots + "n / total" counter, keyboard (←/→),
 * touch swipe, mouse drag, infinite looping (wrap-around) and smooth
 * transforms. Pure class/transform toggling; styling lives in components.css.
 *
 * This file also wires up [data-lazy-video]: premium autoplay hero videos
 * that only fetch + play once scrolled near the viewport, and pause when
 * they leave it — keeping the page light and smooth.
 */

(function (window, document) {
  'use strict';

  const { qs, qsa } = window.VenomUtils || {};
  if (!qs || !qsa) return;

  /* ------------------------------------------------------------------ *
   * Reusable carousel
   * ------------------------------------------------------------------ */
  function initCarousel(root) {
    const track = qs('[data-carousel-track]', root);
    const viewport = qs('[data-carousel-viewport]', root);
    if (!track || !viewport) return;

    const slides = qsa('.carousel__slide', track);
    const total = slides.length;
    if (total === 0) return;

    // Videos (if any): only the active slide plays, and only while the
    // carousel is in view. All others stay paused. No-op for image carousels.
    const slideVideos = slides.map((s) => qs('video', s));
    const hasVideo = slideVideos.some(Boolean);
    let inView = true;

    function syncVideos() {
      if (!hasVideo) return;
      slideVideos.forEach((v, i) => {
        if (!v) return;
        if (i === index && inView) {
          loadVideo(v);
          const p = v.play();
          if (p && p.catch) p.catch(() => {}); // ignore autoplay rejections
        } else if (!v.paused) {
          v.pause();
        }
      });
    }

    const prevBtn = qs('[data-carousel-prev]', root);
    const nextBtn = qs('[data-carousel-next]', root);
    const dotsWrap = qs('[data-carousel-dots]', root);
    const counter = qs('[data-carousel-counter]', root);

    let index = 0;

    // Build dot controls
    const dots = [];
    if (dotsWrap) {
      slides.forEach((_, i) => {
        const dot = document.createElement('button');
        dot.type = 'button';
        dot.className = 'carousel__dot';
        dot.setAttribute('role', 'tab');
        dot.setAttribute('aria-label', `Go to slide ${i + 1} of ${total}`);
        dot.addEventListener('click', () => goTo(i));
        dotsWrap.appendChild(dot);
        dots.push(dot);
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
      if (counter) counter.textContent = `${index + 1} / ${total}`;
      syncVideos();
      if (!animate) {
        // Force reflow so the next move animates from the snapped position.
        void track.offsetWidth;
        track.classList.remove('is-no-transition');
      }
    }

    function goTo(i) {
      index = ((i % total) + total) % total; // wrap-around → infinite loop
      render(true);
    }
    const next = () => goTo(index + 1);
    const prev = () => goTo(index - 1);

    // Pause videos when the carousel scrolls out of view; resume the active
    // one when it returns. Keeps only the visible, active video playing.
    if (hasVideo) {
      if ('IntersectionObserver' in window) {
        inView = false;
        const io = new IntersectionObserver(
          (entries) => {
            entries.forEach((e) => { inView = e.isIntersecting; });
            syncVideos();
          },
          { threshold: 0.35 }
        );
        io.observe(root);
      }
    }

    // Single slide → no controls needed
    if (total < 2) {
      [prevBtn, nextBtn, dotsWrap].forEach((el) => el && (el.style.display = 'none'));
      render(false);
      return;
    }

    if (nextBtn) nextBtn.addEventListener('click', next);
    if (prevBtn) prevBtn.addEventListener('click', prev);

    // Keyboard
    viewport.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') { e.preventDefault(); next(); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); prev(); }
    });

    // Pointer swipe / drag (covers touch + mouse)
    let dragging = false;
    let startX = 0;
    let dx = 0;
    let width = 0;

    function onDown(e) {
      dragging = true;
      startX = e.clientX;
      dx = 0;
      width = viewport.clientWidth || 1;
      track.classList.add('is-no-transition');
      viewport.classList.add('is-dragging');
      if (viewport.setPointerCapture) {
        try { viewport.setPointerCapture(e.pointerId); } catch (err) { /* noop */ }
      }
    }
    function onMove(e) {
      if (!dragging) return;
      dx = e.clientX - startX;
      track.style.transform = `translateX(calc(${-index * 100}% + ${dx}px))`;
    }
    function onUp() {
      if (!dragging) return;
      dragging = false;
      viewport.classList.remove('is-dragging');
      track.classList.remove('is-no-transition');
      const threshold = Math.max(40, width * 0.15);
      if (dx <= -threshold) next();
      else if (dx >= threshold) prev();
      else render(true);
      dx = 0;
    }

    viewport.addEventListener('pointerdown', onDown);
    viewport.addEventListener('pointermove', onMove);
    viewport.addEventListener('pointerup', onUp);
    viewport.addEventListener('pointercancel', onUp);

    // Kill the browser's native image drag ghost
    qsa('img', track).forEach((img) => {
      img.addEventListener('dragstart', (e) => e.preventDefault());
    });

    render(false);
  }

  /* ------------------------------------------------------------------ *
   * Lazy autoplay video
   * ------------------------------------------------------------------ */
  function loadVideo(video) {
    if (video.dataset.loaded === '1') return;
    qsa('source', video).forEach((source) => {
      if (source.dataset.src && !source.src) source.src = source.dataset.src;
    });
    if (video.dataset.src && !video.src) video.src = video.dataset.src;
    video.load();
    video.dataset.loaded = '1';
  }

  function initLazyVideos() {
    const videos = qsa('video[data-lazy-video]');
    if (!videos.length) return;

    if (!('IntersectionObserver' in window)) {
      videos.forEach((v) => { loadVideo(v); const p = v.play(); if (p) p.catch(() => {}); });
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const v = entry.target;
          if (entry.isIntersecting) {
            loadVideo(v);
            const p = v.play();
            if (p && p.catch) p.catch(() => {}); // ignore autoplay rejections
          } else if (!v.paused) {
            v.pause();
          }
        });
      },
      { threshold: 0.25, rootMargin: '0px 0px 100px 0px' }
    );

    videos.forEach((v) => observer.observe(v));
  }

  function init() {
    qsa('[data-carousel]').forEach(initCarousel);
    initLazyVideos();
  }

  document.addEventListener('DOMContentLoaded', init);
})(window, document);
