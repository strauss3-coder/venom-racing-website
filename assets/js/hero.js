/**
 * hero.js
 * Cinematic scroll-scrubbed homepage hero. The 360° reception video is
 * never autoplayed — GSAP ScrollTrigger maps scroll progress across the
 * pinned hero directly onto the video's currentTime, and the same
 * progress value drives a sequence of centred content "phases" (an
 * intro, three feature cards, and a final headline + CTA), each fading
 * in/out within its own narrow window of the overall scroll range.
 *
 * Falls back to a static, fully visible hero (frame 0 + final CTA, no
 * animation) if GSAP failed to load, the user prefers reduced motion,
 * or the video itself fails — so the rest of the site is never blocked
 * behind a broken or unscriptable hero.
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
   * Reveals the static fallback state: video frozen on its first frame,
   * every phase hidden except the final headline/CTA, and the wrapper's
   * scroll-jacking height collapsed back to a normal single-screen hero.
   */
  function useStaticFallback(wrapper, video) {
    wrapper.classList.add('hero-cinematic--static');
    if (video) {
      video.pause();
      video.currentTime = 0;
    }
  }

  /**
   * Returns an opacity 0-1 for a given scroll `progress`, ramping up
   * across [a, b], holding across [b, c], and ramping down across [c, d].
   */
  function windowOpacity(progress, [a, b, c, d]) {
    if (progress <= a || progress >= d) return 0;
    if (progress < b) return (progress - a) / (b - a);
    if (progress <= c) return 1;
    return 1 - (progress - c) / (d - c);
  }

  function applyPhase(el, progress, win, options) {
    if (!el) return;
    const opacity = windowOpacity(progress, win);
    const scaleIn = options && options.scaleIn;

    el.style.opacity = String(opacity);
    el.style.filter = `blur(${(1 - opacity) * 6}px)`;
    el.style.transform = scaleIn
      ? `scale(${0.94 + opacity * 0.06})`
      : `translateY(${(1 - opacity) * 18}px)`;
    el.style.pointerEvents = opacity > 0.5 ? 'auto' : 'none';
  }

  function initHeroCinematic() {
    const wrapper = qs('[data-hero-wrapper]');
    if (!wrapper) return;

    const video = qs('[data-scrub-video]', wrapper);
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const gsapReady = window.gsap && window.ScrollTrigger;

    if (!gsapReady || reduceMotion) {
      useStaticFallback(wrapper, video);
      return;
    }

    if (video) {
      video.addEventListener('error', () => useStaticFallback(wrapper, video));
    }

    gsap.registerPlugin(ScrollTrigger);

    const phases = {
      intro: qs('[data-hero-phase="intro"]', wrapper),
      card1: qs('[data-hero-phase="card-1"]', wrapper),
      card2: qs('[data-hero-phase="card-2"]', wrapper),
      card3: qs('[data-hero-phase="card-3"]', wrapper),
      final: qs('[data-hero-phase="final"]', wrapper),
    };

    // [fadeInStart, fullyVisibleFrom, fullyVisibleUntil, fadeOutEnd] as
    // fractions of the hero's total scroll progress (0 - 1).
    const windows = {
      intro: [0, 0, 0.05, 0.09],
      card1: [0.08, 0.12, 0.16, 0.19],
      card2: [0.32, 0.36, 0.4, 0.43],
      card3: [0.57, 0.61, 0.65, 0.68],
      final: [0.85, 0.93, 1, 1],
    };

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
        const progress = self.progress;

        if (video && Number.isFinite(video.duration) && video.duration > 0) {
          scrubVideoTo(progress * video.duration);
        }

        applyPhase(phases.intro, progress, windows.intro);
        applyPhase(phases.card1, progress, windows.card1);
        applyPhase(phases.card2, progress, windows.card2);
        applyPhase(phases.card3, progress, windows.card3);
        applyPhase(phases.final, progress, windows.final, { scaleIn: true });
      },
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    initParticleFields();
    initHeroCinematic();
  });
})(window, document);
