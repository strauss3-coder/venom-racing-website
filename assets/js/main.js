/**
 * main.js
 * Site-wide initialization entry point. Loaded last on every page.
 * Feature-specific modules (navigation.js, animations.js, builds.js,
 * forms.js) self-initialize on DOMContentLoaded; this file handles
 * global, page-agnostic UI: FAQ accordions, stat counters, the reviews
 * carousel, and button ripple feedback.
 */

(function (window, document) {
  'use strict';

  const { qs, qsa } = window.VenomUtils || {};

  function setCurrentYear() {
    qsa('[data-current-year]').forEach((el) => {
      el.textContent = String(new Date().getFullYear());
    });
  }

  /**
   * Injects the sitewide ambient background layer (soft drifting red
   * orbs) once per page, behind all content. Motion is handled/frozen in
   * CSS per prefers-reduced-motion, so this just builds the markup.
   */
  function initAmbient() {
    if (document.querySelector('.ambient')) return;
    const layer = document.createElement('div');
    layer.className = 'ambient';
    layer.setAttribute('aria-hidden', 'true');
    layer.innerHTML =
      '<span class="ambient__orb ambient__orb--1"></span>' +
      '<span class="ambient__orb ambient__orb--2"></span>' +
      '<span class="ambient__orb ambient__orb--3"></span>';
    document.body.appendChild(layer);
  }

  /**
   * Preloader — reveals the page once assets have loaded, with a hard
   * safety timeout so a slow/failed asset can never trap the visitor
   * behind the loading screen.
   */
  function initPreloader() {
    // Uses native DOM (not the qs helper) so a failure to load utils.js
    // can never leave the visitor trapped behind the loading screen.
    const preloader = document.getElementById('preloader');
    if (!preloader) return;
    const hide = () => preloader.classList.add('is-hidden');
    if (document.readyState === 'complete') {
      setTimeout(hide, 300);
    } else {
      window.addEventListener('load', () => setTimeout(hide, 300));
    }
    setTimeout(hide, 2500);
  }

  /**
   * Soft page transition — fades the body out before following an
   * internal link, so navigation between pages feels continuous rather
   * than a hard flash. Skipped for reduced-motion, new-tab clicks,
   * external links, and in-page anchors.
   */
  function initPageTransition() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    qsa('a[href]').forEach((link) => {
      const href = link.getAttribute('href');
      const sameTab = !link.target || link.target === '_self';
      const internal = href && /\.html($|#|\?)/.test(href) && !href.startsWith('http');
      if (!internal || !sameTab || href.startsWith('#')) return;

      link.addEventListener('click', (event) => {
        if (event.metaKey || event.ctrlKey || event.shiftKey) return;
        event.preventDefault();
        document.body.classList.add('is-leaving');
        setTimeout(() => {
          window.location.href = href;
        }, 200);
      });
    });
  }

  /**
   * FAQ accordion — toggles `.is-open` on `.accordion__item`.
   * CSS handles the open/close transition via grid-template-rows.
   */
  function initAccordions() {
    qsa('.accordion__trigger').forEach((trigger) => {
      trigger.addEventListener('click', () => {
        const item = trigger.closest('.accordion__item');
        if (!item) return;

        const isOpen = item.classList.contains('is-open');
        item
          .closest('.accordion')
          ?.querySelectorAll('.accordion__item.is-open')
          .forEach((openItem) => {
            if (openItem !== item) openItem.classList.remove('is-open');
          });

        item.classList.toggle('is-open', !isOpen);
        trigger.setAttribute('aria-expanded', String(!isOpen));
      });
    });
  }

  /**
   * Stat counters — animates numbers up from 0 once scrolled into view.
   * Reads the target value from `data-counter` and an optional
   * `data-counter-suffix` (e.g. "+", "%").
   */
  function initCounters() {
    const counters = qsa('[data-counter]');
    if (!counters.length) return;

    const animateCounter = (el) => {
      const target = Number(el.dataset.counter) || 0;
      const suffix = el.dataset.counterSuffix || '';
      const duration = 1500;
      const start = performance.now();

      const step = (now) => {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        el.textContent = Math.round(target * eased) + suffix;
        if (progress < 1) requestAnimationFrame(step);
      };

      el.classList.add('is-visible');
      requestAnimationFrame(step);
    };

    if (!('IntersectionObserver' in window)) {
      counters.forEach(animateCounter);
      return;
    }

    const observer = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            animateCounter(entry.target);
            obs.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.5 }
    );

    counters.forEach((el) => observer.observe(el));
  }

  /**
   * Reviews carousel — horizontal scroll-snap track driven by
   * prev/next buttons (`[data-carousel-prev]` / `[data-carousel-next]`).
   */
  function initCarousels() {
    qsa('[data-carousel]').forEach((carousel) => {
      const track = qs('[data-carousel-track]', carousel);
      const prevBtn = qs('[data-carousel-prev]', carousel);
      const nextBtn = qs('[data-carousel-next]', carousel);
      if (!track) return;

      const scrollByCard = (direction) => {
        const card = track.querySelector(':scope > *');
        const cardWidth = card ? card.getBoundingClientRect().width + 24 : track.clientWidth;
        track.scrollBy({ left: direction * cardWidth, behavior: 'smooth' });
      };

      prevBtn?.addEventListener('click', () => scrollByCard(-1));
      nextBtn?.addEventListener('click', () => scrollByCard(1));
    });
  }

  /**
   * Button ripple — spawns a `.btn__ripple` span at the click point on
   * any button opted in with `[data-ripple]`.
   */
  function initRipples() {
    qsa('[data-ripple]').forEach((btn) => {
      btn.addEventListener('click', (event) => {
        const rect = btn.getBoundingClientRect();
        const ripple = document.createElement('span');
        const size = Math.max(rect.width, rect.height);

        ripple.className = 'btn__ripple';
        ripple.style.width = ripple.style.height = `${size}px`;
        ripple.style.left = `${event.clientX - rect.left - size / 2}px`;
        ripple.style.top = `${event.clientY - rect.top - size / 2}px`;

        btn.appendChild(ripple);
        ripple.addEventListener('animationend', () => ripple.remove());
      });
    });
  }

  /**
   * Subtle parallax on `[data-parallax]` elements — offsets by a
   * fraction of scroll distance for a soft depth effect on hero media.
   */
  function initParallax() {
    const targets = qsa('[data-parallax]');
    if (!targets.length) return;

    const onScroll = () => {
      targets.forEach((el) => {
        const speed = Number(el.dataset.parallax) || 0.3;
        const offset = window.scrollY * speed;
        el.style.transform = `translateY(${offset}px)`;
      });
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  function initApp() {
    initPreloader();
    initAmbient();
    initPageTransition();
    setCurrentYear();
    initAccordions();
    initCounters();
    initCarousels();
    initRipples();
    initParallax();
  }

  document.addEventListener('DOMContentLoaded', initApp);
})(window, document);
