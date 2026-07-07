/**
 * gallery.js
 * Powers the Gallery page: scroll reveal, animated category filters and a
 * premium lightbox (images + videos) with prev/next, keyboard, swipe and ESC.
 *
 * Markup contract:
 *   <div class="gallery-filters"> <button data-filter="all" ...>All</button> … </div>
 *   <div class="masonry" data-gallery>
 *     <button class="gallery-item" data-gallery-item data-cats="exhaust videos"
 *             data-type="video|image" data-full="…" data-label="Custom Exhaust"
 *             data-alt="…"> … </button> …
 *   </div>
 *   <div class="lightbox" data-lightbox> … </div>
 *
 * Autoplay preview videos on the cards are handled by carousel.js
 * (data-lazy-video); this file only opens the full media in the lightbox.
 */

(function (window, document) {
  'use strict';

  const { qs, qsa } = window.VenomUtils || {};
  if (!qs || !qsa) return;

  function initGallery() {
    const grid = qs('[data-gallery]');
    if (!grid) return;
    const items = qsa('[data-gallery-item]', grid);
    if (!items.length) return;

    /* ---- Scroll reveal (fade up) ---- */
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver(
        (entries, obs) => {
          entries.forEach((e) => {
            if (e.isIntersecting) {
              e.target.classList.add('is-in');
              obs.unobserve(e.target);
            }
          });
        },
        { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
      );
      items.forEach((it) => io.observe(it));
    } else {
      items.forEach((it) => it.classList.add('is-in'));
    }

    /* ---- Animated filters ---- */
    const filterBtns = qsa('[data-filter]');
    function applyFilter(key) {
      items.forEach((it) => {
        const cats = (it.dataset.cats || '').split(/\s+/);
        const show = key === 'all' || cats.indexOf(key) !== -1;
        if (show) {
          it.hidden = false;
          it.classList.remove('is-in');
          void it.offsetWidth; // reflow → replay the reveal animation
          it.classList.add('is-in');
        } else {
          it.hidden = true;
        }
      });
    }
    filterBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        filterBtns.forEach((b) => {
          const on = b === btn;
          b.classList.toggle('is-active', on);
          b.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
        applyFilter(btn.dataset.filter);
      });
    });

    /* ---- Lightbox ---- */
    const lb = qs('[data-lightbox]');
    if (!lb) return;
    const stage = qs('[data-lightbox-stage]', lb);
    const caption = qs('[data-lightbox-caption]', lb);
    const closeEls = qsa('[data-lightbox-close]', lb);
    const prevBtn = qs('[data-lightbox-prev]', lb);
    const nextBtn = qs('[data-lightbox-next]', lb);

    let visible = [];
    let current = -1;
    let currentType = 'image';
    let lastFocus = null;

    function buildVisible() {
      visible = items.filter((it) => !it.hidden);
    }

    function clearStage() {
      qsa('img, video', stage).forEach((el) => {
        if (el.tagName === 'VIDEO') el.pause();
        el.remove();
      });
    }

    function show(i) {
      buildVisible();
      if (!visible.length) return;
      current = ((i % visible.length) + visible.length) % visible.length;
      const item = visible[current];
      currentType = item.dataset.type;
      clearStage();

      let media;
      if (currentType === 'video') {
        media = document.createElement('video');
        media.src = item.dataset.full;
        media.controls = true;
        media.autoplay = true;
        media.loop = true;
        media.playsInline = true;
        media.setAttribute('playsinline', '');
      } else {
        media = document.createElement('img');
        media.src = item.dataset.full;
        media.alt = item.dataset.alt || item.dataset.label || '';
      }
      stage.insertBefore(media, caption);
      if (media.play) { const p = media.play(); if (p && p.catch) p.catch(() => {}); }
      caption.textContent = item.dataset.label || '';
    }

    const next = () => show(current + 1);
    const prev = () => show(current - 1);

    function open(item) {
      lastFocus = document.activeElement;
      buildVisible();
      const idx = visible.indexOf(item);
      show(idx < 0 ? 0 : idx);
      lb.classList.add('is-open');
      lb.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
      if (closeEls[0]) closeEls[0].focus();
    }

    function close() {
      lb.classList.remove('is-open');
      lb.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
      qsa('video', stage).forEach((v) => v.pause());
      window.setTimeout(clearStage, 300);
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }

    items.forEach((it) => it.addEventListener('click', () => open(it)));
    closeEls.forEach((el) => el.addEventListener('click', close));
    if (nextBtn) nextBtn.addEventListener('click', next);
    if (prevBtn) prevBtn.addEventListener('click', prev);

    document.addEventListener('keydown', (e) => {
      if (!lb.classList.contains('is-open')) return;
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowRight') next();
      else if (e.key === 'ArrowLeft') prev();
    });

    /* Swipe — image slides only, so native video controls stay usable */
    let startX = 0;
    let dx = 0;
    let dragging = false;
    stage.addEventListener('pointerdown', (e) => {
      if (currentType === 'video') return;
      dragging = true; startX = e.clientX; dx = 0;
    });
    stage.addEventListener('pointermove', (e) => { if (dragging) dx = e.clientX - startX; });
    stage.addEventListener('pointerup', () => {
      if (!dragging) return;
      dragging = false;
      if (dx <= -50) next();
      else if (dx >= 50) prev();
    });
    stage.addEventListener('pointercancel', () => { dragging = false; });
  }

  document.addEventListener('DOMContentLoaded', initGallery);
})(window, document);
