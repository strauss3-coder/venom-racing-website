/**
 * reviews.js
 * Single source of truth for genuine Google reviews, rendered into:
 *   - the homepage centre-peek carousel  ([data-reviews-carousel])
 *   - the Reviews page masonry grid       ([data-reviews-grid])
 *
 * All reviews below are transcribed from the business's real Google
 * reviews. No dependencies. The carousel uses native CSS scroll-snap
 * (buttery on touch) enhanced with autoplay (ping-pong), pause-on-hover,
 * pointer-drag on desktop, arrows, dots and an "active card" glow.
 */

(function (window, document) {
  'use strict';

  const { qs, qsa } = window.VenomUtils || {};

  const GOOGLE_REVIEWS_URL = 'https://maps.app.goo.gl/HpCtPxiZec25Rqi1A?g_st=ic';

  /** Genuine Google reviews (deduplicated). */
  const REVIEWS = [
    { name: 'William Nalane', date: '5 days ago',
      text: 'Perfect service and quality work. No return job. Friendly and good customer care. Most important is the honesty.' },
    { name: 'Newqishke du Preez', date: '3 weeks ago',
      text: 'Friendly & excellent service!' },
    { name: 'Robert Wagner', date: 'a month ago',
      text: 'Always very good service and extremely clean workmanship. Very knowledgeable, no problem unsolvable. Very lucky to know where to take my Hilux or any other car for anything, even just a good wash and detailing!' },
    { name: 'George Nel', date: 'a month ago',
      text: 'I will always come to Drikus. Moerse satisfied. Thank you very much.' },
    { name: 'ForTheFairies', date: 'a month ago',
      text: "Had my car serviced here. First time I'm happy with a service and it didn't take an entire day. The staff is super friendly and on par with their servicing. Pricing is perfect too." },
    { name: 'Bertus Swart', date: 'a month ago',
      text: "Excellent service, professional workmanship, and the best customer service I've received — all delivered with a smile. Highly recommended!" },
    { name: 'Chane Steenberg', date: '4 months ago',
      text: 'Very friendly service. Keeps in contact. Would 100% refer.' },
    { name: 'Ndumiso Mthethwa', date: '4 months ago',
      text: 'They are the best in Witbank — car conversion, body respray, servicing the car. Top notch. Big up.' },
    { name: 'Pet Kgwedi', date: '6 months ago',
      text: "My car had performance issues, so I decided to take it to Venom for a checkup. Through their intensive diagnostic systems they managed to pick up the problem and got it fixed beyond perfection, I must say. Probably the neatest dealership in town. They just don't disappoint." },
    { name: 'Mpho Calvin Mokhethea', date: '11 months ago',
      text: 'Took my Mazda CX-5 yesterday for an annual service — wow, Venom outdid themselves. Thank you guys for treating my car with care… it runs like new.' },
    { name: 'DJ Slash Productions SA', date: 'a year ago',
      text: "Yet again, Dricus and the team have outdone themselves. I can't thank you enough for treating my pride and joy as if it was my own. My Focus 225ST had a bad coolant leak, which they found by the Welsh plugs. They went further to find the coil pack wires were damaged and the intake pipe had issues, and sorted some leaks. On top of that they did a Y-piece straight pipe. One can see why this is a 5-star, RMI-Approved workshop. Keep up the good work — see you again soon!" },
  ];

  const GOOGLE_G =
    '<svg class="rc-card__google" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">' +
    '<path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z"/>' +
    '<path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"/>' +
    '<path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z"/>' +
    '<path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"/></svg>';

  const CHECK =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><path d="M20 6L9 17l-5-5"/></svg>';

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function cardHTML(r) {
    const initial = r.name.trim().charAt(0).toUpperCase();
    const date = r.date ? ' &middot; ' + esc(r.date) : '';
    return (
      '<article class="rc-card" data-review>' +
      '<div class="rc-card__head">' +
      '<span class="rc-card__stars" aria-label="Rated 5 out of 5">&#9733;&#9733;&#9733;&#9733;&#9733;</span>' +
      GOOGLE_G +
      '</div>' +
      '<p class="rc-card__text">' + esc(r.text) + '</p>' +
      '<div class="rc-card__foot">' +
      '<span class="rc-card__avatar" aria-hidden="true">' + esc(initial) + '</span>' +
      '<span class="rc-card__meta">' +
      '<strong class="rc-card__name">' + esc(r.name) + '</strong>' +
      '<span class="rc-card__badge">' + CHECK + ' Verified Google Review' + date + '</span>' +
      '</span></div></article>'
    );
  }

  /* ---------------------------------------------------------------
     Homepage carousel — centre card enlarged, neighbours peeking.
  --------------------------------------------------------------- */
  function initCarousel(root) {
    const viewport = qs('[data-rc-viewport]', root);
    const dotsWrap = qs('[data-rc-dots]', root);
    const prevBtn = qs('[data-rc-prev]', root);
    const nextBtn = qs('[data-rc-next]', root);
    if (!viewport) return;

    viewport.innerHTML = REVIEWS.map(cardHTML).join('');
    const cards = qsa('.rc-card', viewport);
    if (!cards.length) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Dots
    const dots = [];
    if (dotsWrap) {
      cards.forEach((_, i) => {
        const d = document.createElement('button');
        d.type = 'button';
        d.setAttribute('aria-label', 'Go to review ' + (i + 1));
        d.addEventListener('click', () => { scrollToCard(i, true); restart(); });
        dotsWrap.appendChild(d);
        dots.push(d);
      });
    }

    const step = () => {
      const gap = parseFloat(getComputedStyle(viewport).columnGap || getComputedStyle(viewport).gap || '0') || 0;
      return cards[0].getBoundingClientRect().width + gap;
    };

    // Horizontal-only centring — never uses scrollIntoView, which would
    // scroll the whole PAGE vertically down to Reviews on initial load.
    function scrollToCard(i, smooth) {
      const c = cards[Math.max(0, Math.min(i, cards.length - 1))];
      if (!c) return;
      const left = c.offsetLeft - (viewport.clientWidth - c.offsetWidth) / 2;
      viewport.scrollTo({ left: Math.max(0, left), behavior: smooth ? 'smooth' : 'auto' });
    }

    // Active-card detection (nearest to viewport centre)
    let raf = null;
    function updateActive() {
      raf = null;
      const mid = viewport.scrollLeft + viewport.clientWidth / 2;
      let best = 0;
      let bestDist = Infinity;
      cards.forEach((c, i) => {
        const center = c.offsetLeft + c.offsetWidth / 2;
        const dist = Math.abs(center - mid);
        if (dist < bestDist) { bestDist = dist; best = i; }
      });
      cards.forEach((c, i) => c.classList.toggle('is-active', i === best));
      dots.forEach((d, i) => d.classList.toggle('is-active', i === best));
    }
    viewport.addEventListener('scroll', () => {
      if (!raf) raf = window.requestAnimationFrame(updateActive);
    }, { passive: true });

    // Autoplay (ping-pong so it never hard-rewinds)
    let timer = null;
    let dir = 1;
    function tick() {
      const atEnd = viewport.scrollLeft + viewport.clientWidth >= viewport.scrollWidth - 8;
      const atStart = viewport.scrollLeft <= 8;
      if (atEnd) dir = -1;
      else if (atStart) dir = 1;
      viewport.scrollBy({ left: dir * step(), behavior: 'smooth' });
    }
    function play() {
      if (reduceMotion || timer) return;
      timer = window.setInterval(tick, 7000);
    }
    function stop() { if (timer) { window.clearInterval(timer); timer = null; } }
    function restart() { stop(); play(); }

    prevBtn && prevBtn.addEventListener('click', () => { viewport.scrollBy({ left: -step(), behavior: 'smooth' }); restart(); });
    nextBtn && nextBtn.addEventListener('click', () => { viewport.scrollBy({ left: step(), behavior: 'smooth' }); restart(); });

    root.addEventListener('mouseenter', stop);
    root.addEventListener('mouseleave', play);
    root.addEventListener('focusin', stop);
    root.addEventListener('focusout', play);
    document.addEventListener('visibilitychange', () => { document.hidden ? stop() : play(); });

    // Desktop pointer-drag (mouse only; touch uses native scroll + snap)
    let dragging = false;
    let startX = 0;
    let startScroll = 0;
    viewport.addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'mouse') return;
      dragging = true;
      startX = e.clientX;
      startScroll = viewport.scrollLeft;
      viewport.classList.add('is-dragging');
      stop();
    });
    window.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      viewport.scrollLeft = startScroll - (e.clientX - startX);
    });
    window.addEventListener('pointerup', () => {
      if (!dragging) return;
      dragging = false;
      viewport.classList.remove('is-dragging');
      restart();
    });

    // Start centred on the first card
    updateActive();
    scrollToCard(0);
    play();
  }

  /* ---------------------------------------------------------------
     Reviews page — masonry grid + live search filter.
  --------------------------------------------------------------- */
  function initGrid(grid) {
    grid.innerHTML = REVIEWS.map(cardHTML).join('');
    const search = qs('[data-reviews-search]');
    const empty = qs('[data-reviews-empty]');
    if (!search) return;

    const cards = qsa('.rc-card', grid);
    search.addEventListener('input', () => {
      const q = search.value.trim().toLowerCase();
      let shown = 0;
      cards.forEach((c) => {
        const match = !q || c.textContent.toLowerCase().includes(q);
        c.style.display = match ? '' : 'none';
        if (match) shown += 1;
      });
      if (empty) empty.hidden = shown !== 0;
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    // Point any Google-review CTA at the live link
    qsa('[data-google-reviews]').forEach((a) => {
      a.href = GOOGLE_REVIEWS_URL;
      a.target = '_blank';
      a.rel = 'noopener';
    });
    qsa('[data-reviews-carousel]').forEach(initCarousel);
    qsa('[data-reviews-grid]').forEach(initGrid);
  });
})(window, document);
