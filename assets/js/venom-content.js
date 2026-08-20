/**
 * venom-content.js
 * Hydrates site-wide content from Supabase so the Venom Racing Portal is the
 * source of truth for the details that actually change.
 *
 * DESIGN RULES — read before extending this file.
 *
 * 1. Fail silent, never blank. Every update is applied only when the portal
 *    supplies a non-empty value. If the request fails, times out, returns
 *    nothing, or the portal has never been pushed, the HTML already in the
 *    page stands. The site must look identical with the database switched
 *    off, so nothing here is allowed to clear existing content.
 *
 * 2. Target by meaning, not by markup. Links are found by what they are —
 *    a tel:, a mailto:, a wa.me — rather than by class names, so a future
 *    redesign of the pages cannot silently break the sync.
 *
 * 3. Never touch layout. This only rewrites text nodes and href attributes
 *    of elements that already exist. It creates and removes nothing, so it
 *    cannot shift the page or fight the other scripts for the DOM.
 *
 * 4. Re-arm anything the page scripts bound at load. Reveal animations use
 *    an IntersectionObserver that collects its targets once, and the FAQ
 *    accordion binds click handlers directly. Markup rendered afterwards is
 *    invisible and inert unless it is re-observed and re-bound, so every
 *    render path here does both.
 *
 * Synced: homepage hero and about copy, contact details, trading hours,
 * social links, services, brands, products, FAQs, reviews, stages, the
 * gallery grid, the repeated card lists on every page, and per-page SEO.
 * Not synced: the homepage's tabbed stage timeline, which stages.js owns
 * along with its own tab state. The Performance page carries the
 * portal-driven stage cards instead.
 */

(function (window, document) {
  'use strict';

  const api = window.VenomSupabase;
  if (!api || !api.isConfigured()) return;

  const TIMEOUT_MS = 6000;

  /** Digits only, for tel: and wa.me hrefs. 0XX becomes 27XX. */
  const digits = (v) => String(v || '').replace(/[^0-9]/g, '').replace(/^0/, '27');

  /** Set text only when there is something real to set. */
  function setText(el, value) {
    if (!el || !value) return;
    el.textContent = value;
  }

  /* Headings the page breaks across lines. Newlines from the portal become
     the <br> the markup already uses; everything else is escaped, because
     this is the one place page copy is written as HTML. */
  function setLines(el, value) {
    if (!el || !value) return;
    el.innerHTML = String(value).split(/\r?\n/).map(esc).join('<br>');
  }

  async function loadSettings() {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const res = await api.fetchTable('site_settings?select=key,value', controller.signal);
      if (!res) return null;
      const out = {};
      res.forEach((r) => { out[r.key] = r.value; });
      return out;
    } catch (error) {
      return null;                    // rule 1: the page keeps what it has
    } finally {
      clearTimeout(timer);
    }
  }

  function applyContact(c) {
    if (!c) return;

    // Phone links. The first tel: on a page is the primary number; any
    // second one is the secondary, when the portal has one.
    const tels = Array.from(document.querySelectorAll('a[href^="tel:"]'));
    const numbers = [c.phone, c.phone2].filter(Boolean);
    tels.forEach((a, i) => {
      const n = numbers[Math.min(i, numbers.length - 1)];
      if (!n) return;
      // Only relabel links that currently show a number, never worded links.
      const showsNumber = /[0-9]/.test(a.textContent) && !/[a-z]{3}/i.test(a.textContent);
      a.href = 'tel:+' + digits(n);
      if (showsNumber) setText(a, n);
    });

    // Email links, in the order the portal lists them.
    const mails = Array.from(document.querySelectorAll('a[href^="mailto:"]'));
    const addresses = [c.email, c.email2].filter(Boolean);
    mails.forEach((a, i) => {
      const e = addresses[Math.min(i, addresses.length - 1)];
      if (!e) return;
      const showsAddress = a.textContent.indexOf('@') >= 0;
      a.href = 'mailto:' + e;
      if (showsAddress) setText(a, e);
    });

    // WhatsApp, preserving any prefilled ?text= message.
    const wa = digits(c.whatsapp || c.phone);
    if (wa) {
      document.querySelectorAll('a[href*="wa.me/"]').forEach((a) => {
        a.href = a.href.replace(/wa\.me\/\d+/, 'wa.me/' + wa);
        if (/[0-9]/.test(a.textContent) && !/[a-z]{3}/i.test(a.textContent)) setText(a, c.whatsapp || c.phone);
      });
    }

    // Social links, matched on the accessible name already in the markup.
    const social = c.social || {};
    const map = [['facebook', social.facebook], ['instagram', social.instagram],
                 ['tiktok', social.tiktok], ['youtube', social.youtube]];
    document.querySelectorAll('a[aria-label]').forEach((a) => {
      const label = a.getAttribute('aria-label').toLowerCase();
      map.forEach(([name, url]) => {
        if (url && label.indexOf(name) >= 0) a.href = url;
      });
    });

    // Google rating. Only the number is ours - the wording around it stays
    // in the markup, so the page still reads correctly on its own.
    if (c.googleRating) {
      document.querySelectorAll('[data-vr-rating]').forEach((el) => setText(el, c.googleRating));
    }

    // Address and hours, where the page has marked them.
    document.querySelectorAll('[data-vr-address]').forEach((el) => setText(el, c.address));
    if (Array.isArray(c.hours)) {
      const summary = summariseHours(c.hours);
      document.querySelectorAll('[data-vr-hours]').forEach((el) => setText(el, summary));
    }
  }

  /**
   * Collapse the seven day rows into the one line the website shows,
   * grouping consecutive days that share the same times.
   * e.g. "Monday – Friday, 08:00 – 17:00"
   */
  function summariseHours(hours) {
    const open = hours.filter((h) => !h.closed && h.open && h.close);
    if (!open.length) return '';
    const runs = [];
    open.forEach((h) => {
      const last = runs[runs.length - 1];
      if (last && last.open === h.open && last.close === h.close) last.days.push(h.day);
      else runs.push({ open: h.open, close: h.close, days: [h.day] });
    });
    return runs.map((r) => {
      const span = r.days.length > 1 ? r.days[0] + ' – ' + r.days[r.days.length - 1] : r.days[0];
      return span + ', ' + r.open + ' – ' + r.close;
    }).join(' · ');
  }

  /** Re-observe reveal targets and re-apply stagger after a render. */
  function rearm(container) {
    const anim = window.VenomAnimations;
    if (!anim) return;
    if (container.hasAttribute('data-stagger') || container.hasAttribute('data-reveal-stagger')) {
      anim.stagger(container);
    }
    anim.observe(container);
  }

  const esc = (v) => String(v == null ? '' : v)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  /**
   * Service cards. The portal owns the copy; the icons stay in the page,
   * reused from the card that already sits in that position so a redesign
   * of the artwork is never overwritten by the database.
   */
  async function applyServices() {
    const grids = Array.from(document.querySelectorAll('.grid--services'));
    if (!grids.length) return;
    const rows = await api.fetchTable('website_services?select=*');
    if (!rows) return;

    grids.forEach((grid) => {
      // Which division this grid shows is inferred from the page it is on.
      const isRepairs = /services\.html$/.test(location.pathname);
      const onHome = /(^|\/)(index\.html)?$/.test(location.pathname);
      let list = rows;
      if (isRepairs) list = rows.filter((r) => r.division === 'Services & Repairs');
      else if (!onHome) list = rows.filter((r) => r.division === 'Performance');
      else list = rows.filter((r) => r.featured);
      if (!list.length) return;

      const icons = Array.from(grid.querySelectorAll('.service-card__icon'))
        .map((el) => el.innerHTML);
      if (!icons.length) return;

      grid.innerHTML = list.map((r, i) => `
        <article class="service-card slide-up">
          <div class="service-card__icon" aria-hidden="true">${icons[i % icons.length]}</div>
          <h3 class="service-card__title">${esc(r.title)}</h3>
          <p>${esc(r.description)}</p>
        </article>`).join('');
      rearm(grid);
    });
  }

  /** Marquees need their slides duplicated once for a seamless loop. */
  function renderMarquee(track, list, build) {
    track.innerHTML = list.map((r) => build(r, false)).join('')
                    + list.map((r) => build(r, true)).join('');
  }

  async function applyBrands() {
    const track = document.querySelector('.brand-marquee__track');
    if (!track) return;
    const rows = await api.fetchTable('website_brands?select=*');
    if (!rows) return;
    renderMarquee(track, rows, (r, dup) => `
      <div class="brand-slide"${dup ? ' data-dup aria-hidden="true"' : ''}>
        <span class="brand-slide__plate">${r.logo
          ? `<img src="${esc(r.logo)}" alt="${esc(r.name)} logo" loading="lazy" draggable="false">`
          : ''}</span>
        <span class="brand-slide__name">${esc(r.name)}</span>
      </div>`);
  }

  async function applyProducts() {
    const track = document.querySelector('.product-marquee__track');
    if (!track) return;
    const rows = await api.fetchTable('website_products?select=*');
    if (!rows) return;
    renderMarquee(track, rows, (r, dup) => `
      <div class="product-slide"${dup ? ' data-dup aria-hidden="true"' : ''}>
        <span class="product-slide__plate">${r.image
          ? `<img src="${esc(r.image)}" alt="${esc(r.name)}" loading="lazy" draggable="false">`
          : ''}</span>
      </div>`);
  }

  /**
   * FAQs. main.js binds each trigger directly at load, so rebuilt markup
   * would be inert. A delegated handler on the container is attached here
   * instead, which survives any number of re-renders.
   */
  async function applyFaqs() {
    const blocks = Array.from(document.querySelectorAll('.accordion'));
    if (!blocks.length) return;
    const rows = await api.fetchTable('website_faqs?select=*');
    if (!rows) return;

    const onHome = document.querySelectorAll('.accordion').length === 1;
    if (onHome) {
      const featured = rows.filter((r) => r.featured);
      renderAccordion(blocks[0], featured.length ? featured : rows.slice(0, 4));
      return;
    }
    // FAQs page: one accordion per category, in the page's existing order.
    const cats = [];
    rows.forEach((r) => { if (cats.indexOf(r.category) < 0) cats.push(r.category); });
    blocks.forEach((block, i) => {
      const cat = cats[i];
      if (!cat) return;
      renderAccordion(block, rows.filter((r) => r.category === cat));
      const heading = block.previousElementSibling;
      if (heading && /^H[23]$/.test(heading.tagName)) setText(heading, cat);
    });
  }

  function renderAccordion(block, list) {
    if (!block || !list.length) return;
    block.innerHTML = list.map((r) => `
      <div class="accordion__item">
        <button class="accordion__trigger" type="button" aria-expanded="false">
          ${esc(r.question)}
          <span class="accordion__icon" aria-hidden="true"></span>
        </button>
        <div class="accordion__panel">
          <div class="accordion__panel-inner">
            <div class="accordion__panel-content">${esc(r.answer)}</div>
          </div>
        </div>
      </div>`).join('');

    if (block.dataset.vrBound !== '1') {
      block.dataset.vrBound = '1';
      block.addEventListener('click', (e) => {
        const trigger = e.target.closest('.accordion__trigger');
        if (!trigger || !block.contains(trigger)) return;
        const item = trigger.closest('.accordion__item');
        const isOpen = item.classList.contains('is-open');
        block.querySelectorAll('.accordion__item.is-open').forEach((el) => {
          el.classList.remove('is-open');
          const t = el.querySelector('.accordion__trigger');
          if (t) t.setAttribute('aria-expanded', 'false');
        });
        if (!isOpen) {
          item.classList.add('is-open');
          trigger.setAttribute('aria-expanded', 'true');
        }
      });
    }
    rearm(block);
  }

  /**
   * Performance stages on the flagship page. The homepage keeps its own
   * tabbed timeline, which stages.js owns; only the card grid here is
   * driven from the portal.
   */
  async function applyStages() {
    const grid = document.querySelector('[data-vr-stages]');
    if (!grid) return;
    const rows = await api.fetchTable('website_stages?select=*');
    if (!rows) return;
    grid.innerHTML = rows.map((r) => `
      <article class="service-card slide-up">
        <span class="stage-content__badge">${esc(r.name)}</span>
        <h3 class="service-card__title">${esc(r.tagline)}</h3>
        <p>${esc(r.description)}</p>
        ${(r.requirements || []).length
          ? `<ul class="stage-list">${r.requirements.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>`
          : ''}
        ${r.note ? `<p class="stage-content__note">${esc(r.note)}</p>` : ''}
      </article>`).join('');
    rearm(grid);
  }

  /**
   * Homepage copy. The hero headline keeps its three animated lines: the
   * portal supplies one sentence and it is split on whitespace so the
   * stagger animation still has something to stagger.
   */
  function applyHomepage(h) {
    if (!h) return;

    const title = document.querySelector('[data-vr-hero-title]');
    if (title && h.heroTitle) {
      const words = String(h.heroTitle).trim().split(/\s+/);
      // Last word keeps the accent treatment, as the page ships it.
      const parts = words.length > 2
        ? [words.slice(0, -2).join(' '), words[words.length - 2], words[words.length - 1]]
        : words;
      title.innerHTML = parts.filter(Boolean).map((line, i) =>
        '<span class="hero__line' + (i === parts.length - 1 ? ' hero__line--accent' : '') +
        '" style="--i:' + i + '">' + esc(line) + '</span>').join('\n');
    }

    setText(document.querySelector('[data-vr-hero-text]'), h.heroSubtitle);
    setText(document.querySelector('[data-vr-about-eyebrow]'), h.aboutEyebrow);
    setText(document.querySelector('[data-vr-about-title]'), h.aboutTitle);
    setText(document.querySelector('[data-vr-about-text]'), h.aboutText);
    setText(document.querySelector('[data-vr-about-text2]'), h.aboutText2);
    setText(document.querySelector('[data-vr-cta-title]'), h.ctaTitle);

    // Hero buttons, in the order the page lays them out.
    const actions = document.querySelectorAll('.hero__actions a');
    if (actions[0] && h.btn1Text) { setText(actions[0], h.btn1Text); if (h.btn1Link) actions[0].href = h.btn1Link; }
    if (actions[1] && h.btn2Text) { setText(actions[1], h.btn2Text); if (h.btn2Link) actions[1].href = h.btn2Link; }

    // The About section's own button.
    const ab = document.querySelector('[data-vr-about-btn]');
    if (ab) { if (h.aboutBtnText) setText(ab, h.aboutBtnText); if (h.aboutBtnLink) ab.href = h.aboutBtnLink; }

    // RMI accreditation badge.
    setText(document.querySelector('[data-vr-badge-title]'), h.badgeTitle);
    setText(document.querySelector('[data-vr-badge-text]'), h.badgeText);

    applyShowcase(h.showcase);
    applyHeadings(h.sections);
  }

  /**
   * The About carousel. Rebuilt only when the portal has slides, so an
   * empty list leaves the three the page ships with. showcase.js reads the
   * track on DOMContentLoaded, so it is re-initialised afterwards.
   */
  function applyShowcase(list) {
    const track = document.querySelector('[data-vr-showcase]');
    if (!track || !Array.isArray(list) || !list.length) return;

    track.innerHTML = list.map((s) => {
      const cap = s.label || '';
      return '<figure class="showcase__slide texture-carbon" data-label="' + esc(cap) + '">' +
             '<img src="' + esc(s.url) + '" alt="' + esc(s.alt || cap) + '" loading="lazy"' +
             ' onerror="this.style.display=\'none\'">' +
             '<figcaption class="showcase__caption">' + esc(cap) + '</figcaption>' +
             '</figure>';
    }).join('');

    if (window.VenomShowcase && window.VenomShowcase.init) window.VenomShowcase.init();
  }

  /**
   * Copy for a page that is not the homepage: its lead block, the badge and
   * carousel beside it, its section headings and its closing button. The
   * hooks are deliberately generic - every page carries at most one of each,
   * so the same code serves about, services and the rest.
   */
  function applyPageCopy(c) {
    if (!c) return;
    setText(document.querySelector('[data-vr-page-eyebrow]'), c.eyebrow);
    setLines(document.querySelector('[data-vr-page-title]'), c.title);
    setText(document.querySelector('[data-vr-page-text]'), c.text);
    setText(document.querySelector('[data-vr-page-text2]'), c.text2);
    setText(document.querySelector('[data-vr-tech-label]'), c.techLabel);
    setText(document.querySelector('[data-vr-badge-title]'), c.badgeTitle);
    setText(document.querySelector('[data-vr-badge-text]'), c.badgeText);

    // Buttons are matched by name, not by position: services.html carries
    // three in two different blocks, and an index would quietly relabel the
    // wrong one the moment the markup moved.
    const buttons = c.buttons || {};
    Object.keys(buttons).forEach((name) => {
      const el = document.querySelector('[data-vr-page-btn="' + name + '"]');
      if (!el) return;
      const v = buttons[name] || {};
      if (v.text) setText(el, v.text);
      if (v.link) el.href = v.link;
    });

    applyShowcase(c.showcase);
    applyHeadings(c.sections);
  }

  /**
   * Section headings: the eyebrow, heading and intro above each block of a
   * page. Each is keyed by the data-vr-heading on its wrapper, so the page
   * decides which sections exist and the portal only supplies words.
   * A blank value leaves what the page already has.
   */
  function applyHeadings(map) {
    if (!map) return;
    Object.keys(map).forEach((key) => {
      const box = document.querySelector('[data-vr-heading="' + key + '"]');
      if (!box) return;
      const v = map[key] || {};
      /* h3 because one block on the performance page leads with one.
         A selector list returns the first match in document order, so a
         block whose h2 is followed by an h3 still resolves to its h2. */
      const head = box.querySelector('h1, h2, h3');

      // Some headings ship without an eyebrow or an intro. Create them
      // rather than drop the words, so no field in the portal is offered
      // for a section and then quietly ignored.
      if (v.eyebrow) {
        let e = box.querySelector('.eyebrow');
        if (!e) {
          e = document.createElement('span');
          e.className = 'eyebrow';
          box.insertBefore(e, head || box.firstChild);
        }
        setText(e, v.eyebrow);
      }
      setText(head, v.title);
      if (v.intro) {
        let p = box.querySelector('p');
        if (!p) { p = document.createElement('p'); box.appendChild(p); }
        setText(p, v.intro);
      }
    });
  }

  /* Map the portal's category names onto the filter keys already in the
     page, so the existing filter buttons keep working untouched. */
  const GALLERY_KEYS = {
    'Performance Builds':'builds', 'ECU Calibration':'ecu', 'Dyno Testing':'dyno',
    'Exhaust Systems':'exhaust', 'Turbo Upgrades':'turbo', 'Workshop':'workshop',
    'Services & Repairs':'services', 'Videos':'videos'
  };

  /**
   * Gallery grid. Replaced only when the portal actually has images; an
   * empty gallery leaves the 42 built into the page. gallery.js binds its
   * filters, lightbox and swipe at load, so it is re-initialised after a
   * render - its own guards stop the persistent elements binding twice.
   */
  function applyGallery(list) {
    const grid = document.querySelector('[data-gallery]');
    if (!grid || !Array.isArray(list) || !list.length) return;

    grid.innerHTML = list.map((g) => {
      const url = g.url || g;
      const label = g.label || '';
      const alt = g.alt || label;
      const key = GALLERY_KEYS[g.category] || 'workshop';
      const isVideo = g.type === 'video';
      // Videos also carry the page's own "videos" filter key, as they do
      // in the markup this replaces.
      const cats = isVideo ? key + ' videos' : key;
      const media = isVideo
        ? `<video class="gallery-card__media" data-lazy-video autoplay muted loop playsinline
                  preload="none" aria-label="${esc(label)}">
             <source data-src="${esc(url)}" type="video/mp4">
           </video>`
        : `<img class="gallery-card__media" src="${esc(url)}" alt="${esc(alt)}" loading="lazy">`;
      return `
        <button class="gallery-card is-in" type="button" data-gallery-item
                data-type="${isVideo ? 'video' : 'image'}"${isVideo ? ' data-muted' : ''}
                data-cats="${esc(cats)}" data-label="${esc(label)}"
                data-full="${esc(url)}" data-alt="${esc(alt)}">
          ${media}
          <span class="gallery-card__overlay">
            <span class="gallery-card__cat">${esc(g.category || '')}</span>
            <span class="gallery-card__title">${esc(label)}</span>
          </span>
        </button>`;
    }).join('');

    // Videos here use data-src, so the page's lazy loader must run again.
    if (window.VenomCarousel && window.VenomCarousel.initLazyVideos) window.VenomCarousel.initLazyVideos();
    if (window.VenomGallery && window.VenomGallery.init) window.VenomGallery.init();
    rearm(grid);
  }

  /** Which page we are on, matching the portal's page keys. */
  function pageKey() {
    const f = (location.pathname.split('/').pop() || 'index.html').replace('.html', '');
    return f || 'index';
  }

  /**
   * Repeated card lists: why-choose cards, process steps, trust-bar items,
   * technology chips and the specialise grid. Each container's existing
   * first child is used as the template so the page keeps its own markup,
   * icons and classes - only the words come from the portal.
   */
  async function applySections() {
    const rows = await api.fetchTable('website_sections?select=*&page=eq.' + encodeURIComponent(pageKey()));
    if (!rows) return;

    const groups = {};
    rows.forEach((r) => { (groups[r.section] = groups[r.section] || []).push(r); });

    const targets = {
      feature:    '.feature-card',
      process:    '.process__step',
      trust:      '.trust-item',
      chip:       '.tech-chip',
      specialise: '.card',
    };

    Object.keys(groups).forEach((section) => {
      const sel = targets[section];
      if (!sel) return;
      const first = document.querySelector(sel);
      if (!first) return;
      const container = first.parentElement;
      const template = first.cloneNode(true);
      const items = groups[section];

      // Reuse the page's own node for each item, replacing only the text.
      const built = items.map((r) => {
        const node = template.cloneNode(true);
        const h = node.querySelector('h4, .card__title');
        const p = node.querySelector('p:not(.card__meta)') || node.querySelector('.card__meta');
        if (h) h.textContent = r.title;
        else if (!node.querySelector('svg')) node.textContent = r.title;
        else {
          // trust items and chips are an icon plus a bare text node
          const t = Array.from(node.childNodes).find((n) => n.nodeType === 3 && n.textContent.trim());
          if (t) t.textContent = ' ' + r.title;
        }
        if (p && r.body) p.textContent = r.body;
        return node;
      });

      Array.from(container.querySelectorAll(sel)).forEach((n) => n.remove());
      built.forEach((n) => container.appendChild(n));
      rearm(container);
    });
  }

  /**
   * Page title, meta description and social preview. Written into the
   * existing tags; a tag the page does not have is created, because a
   * missing og:image is the difference between a link preview and a
   * blank card.
   */
  async function applySeo() {
    const rows = await api.fetchTable('website_seo?select=*&page=eq.' + encodeURIComponent(pageKey()));
    if (!rows || !rows.length) return;
    const r = rows[0];

    if (r.title) document.title = r.title;

    const meta = (attr, name, value) => {
      if (!value) return;
      let el = document.head.querySelector('meta[' + attr + '="' + name + '"]');
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attr, name);
        document.head.appendChild(el);
      }
      el.setAttribute('content', value);
    };

    meta('name', 'description', r.description);
    meta('property', 'og:title', r.og_title || r.title);
    meta('property', 'og:description', r.og_description || r.description);
    meta('property', 'og:image', r.og_image);
    meta('name', 'twitter:title', r.og_title || r.title);
    meta('name', 'twitter:description', r.og_description || r.description);
    meta('name', 'twitter:image', r.og_image);
  }

  async function init() {
    const settings = await loadSettings();
    if (settings && settings.contact) applyContact(settings.contact);
    if (settings && settings.homepage) applyHomepage(settings.homepage);
    if (settings && settings.pages) applyPageCopy(settings.pages[pageKey()]);
    /* The portal stores the gallery as { list: [...] } under this key. */
    if (settings && settings.gallery) applyGallery(settings.gallery.list);
    // Independent, so one empty table never stops the others.
    await Promise.all([
      applyServices().catch(() => {}),
      applyBrands().catch(() => {}),
      applyProducts().catch(() => {}),
      applyFaqs().catch(() => {}),
      applyStages().catch(() => {}),
      applySections().catch(() => {}),
      applySeo().catch(() => {}),
    ]);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  window.VenomContent = { summariseHours, applyContact, applyServices, applyBrands, applyProducts, applyFaqs, applyStages, applyHomepage, applyGallery, applySections, applySeo };
})(window, document);
