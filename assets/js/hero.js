/**
 * hero.js
 * Homepage hero behaviour:
 *  - Scrubs the 360° reception video's playback to scroll position via
 *    GSAP ScrollTrigger — the video is never autoplayed; as the visitor
 *    scrolls down through the pinned hero it advances frame by frame
 *    (as if walking into the workshop), and scrolling up reverses it.
 *  - Populates the ambient `.particle-field` container(s).
 *
 * The hero's text content (badge, headline, subtitle, CTAs, mini cards)
 * is a normal always-visible layout — only the video is scroll-driven.
 * Falls back to a frozen first frame if GSAP failed to load, the user
 * prefers reduced motion, or the video itself errors.
 */

(function (window, document) {
  'use strict';

  const { qs, qsa } = window.VenomUtils || {};

  /**
   * Populates a `.particle-field` container with ambient floating
   * particles. Purely decorative and CSS-animated (see animations.css'
   * `.particle` / `particleDrift` keyframe) — this just randomises
   * position/timing per instance so the field reads as one continuous
   * motif whether it's the dense hero instance or a lighter one further
   * down the page.
   */
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
        particle.style.setProperty('--particle-opacity', String(0.3 + Math.random() * 0.4));
        particle.style.animationDuration = `${6 + Math.random() * 6}s`;
        particle.style.animationDelay = `${Math.random() * 8}s`;
        fragment.appendChild(particle);
      }

      field.appendChild(fragment);
    });
  }

  /**
   * Scrubs the hero video's currentTime to match scroll progress across
   * the pinned wrapper (0 = first frame, 1 = last frame). Uses a short
   * GSAP tween per update rather than a hard seek, so rapid scroll deltas
   * settle smoothly instead of jumping between frames.
   */
  function initHeroVideoScrub() {
    const wrapper = qs('[data-hero-wrapper]');
    if (!wrapper) return;

    const video = qs('[data-scrub-video]', wrapper);
    if (!video) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const gsapReady = window.gsap && window.ScrollTrigger;

    if (!gsapReady || reduceMotion) {
      video.pause();
      video.currentTime = 0;
      return;
    }

    video.addEventListener('error', () => {
      wrapper.classList.add('hero-cinematic--video-fallback');
    });

    gsap.registerPlugin(ScrollTrigger);

    let videoTween = null;
    const scrubVideoTo = (time) => {
      if (videoTween) videoTween.kill();
      videoTween = gsap.to(video, {
        currentTime: time,
        duration: 0.3,
        ease: 'power1.out',
        overwrite: true,
      });
    };

    ScrollTrigger.create({
      trigger: wrapper,
      start: 'top top',
      end: 'bottom bottom',
      scrub: 0.4,
      onUpdate(self) {
        if (Number.isFinite(video.duration) && video.duration > 0) {
          scrubVideoTo(self.progress * video.duration);
        }
      },
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    initParticleFields();
    initHeroVideoScrub();
  });
})(window, document);
