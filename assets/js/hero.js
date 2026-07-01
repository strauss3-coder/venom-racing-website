/**
 * hero.js
 * Behaviour for the homepage video hero: graceful fallback if the video
 * can't play, a mute/unmute toggle, and scroll-driven cinematic effects
 * (subtle video scale-down, content fade-up, staggered floating-card
 * parallax). Only runs when a `.hero[data-hero]` element is present.
 */

(function (window, document) {
  'use strict';

  const { qs, qsa } = window.VenomUtils || {};

  /**
   * If the video errors, or the user prefers reduced motion, fall back
   * to the poster frame via a CSS hook rather than a broken/frozen video.
   */
  function initVideoFallback(hero, video) {
    if (!video) {
      hero.classList.add('hero--video-fallback');
      return;
    }

    video.addEventListener('error', () => {
      hero.classList.add('hero--video-fallback');
    });

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      video.pause();
      hero.classList.add('hero--video-fallback');
    }
  }

  /**
   * Muted-by-default sound toggle. Browsers require the video to already
   * be playing (muted autoplay) before unmuting via a user gesture works
   * reliably, which is exactly the state we start in.
   */
  function initSoundToggle(hero, video) {
    const toggle = qs('[data-hero-sound]', hero);
    if (!toggle || !video) return;

    const mutedIcon = qs('[data-icon-muted]', toggle);
    const unmutedIcon = qs('[data-icon-unmuted]', toggle);

    toggle.addEventListener('click', () => {
      video.muted = !video.muted;
      const isMuted = video.muted;

      toggle.setAttribute('aria-pressed', String(!isMuted));
      toggle.setAttribute('aria-label', isMuted ? 'Unmute hero video' : 'Mute hero video');

      if (mutedIcon) mutedIcon.hidden = !isMuted;
      if (unmutedIcon) unmutedIcon.hidden = isMuted;
    });
  }

  /**
   * Cinematic scroll effects, scoped to the hero's own height so nothing
   * looks broken once the user has scrolled past it:
   *  - video scales down slightly (zoom-out)
   *  - hero content fades and drifts upward
   *  - floating cards parallax at different speeds via `data-parallax-card`
   *  - the scroll indicator fades out early
   */
  function initScrollEffects(hero) {
    const media = qs('[data-hero-media]', hero);
    const content = qs('[data-hero-content]', hero);
    const cards = qsa('[data-parallax-card]', hero);
    const indicator = qs('.hero__scroll-indicator', hero);

    let ticking = false;

    const update = () => {
      const heroHeight = hero.offsetHeight || 1;
      const progress = Math.min(Math.max(window.scrollY / heroHeight, 0), 1);

      if (media) {
        media.style.transform = `scale(${1 - progress * 0.08})`;
      }

      if (content) {
        content.style.opacity = String(Math.max(1 - progress * 1.6, 0));
        content.style.transform = `translateY(${-progress * 50}px)`;
      }

      cards.forEach((card) => {
        const speed = Number(card.dataset.parallaxCard) || 1;
        card.style.transform = `translateY(${-progress * 140 * speed}px)`;
      });

      if (indicator) {
        indicator.style.opacity = String(Math.max(1 - progress * 3, 0));
      }

      ticking = false;
    };

    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(update);
        ticking = true;
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    update();
  }

  function initHero() {
    const hero = qs('.hero[data-hero]');
    if (!hero) return;

    const video = qs('video', hero);
    initVideoFallback(hero, video);
    initSoundToggle(hero, video);
    initScrollEffects(hero);
  }

  document.addEventListener('DOMContentLoaded', initHero);
})(window, document);
