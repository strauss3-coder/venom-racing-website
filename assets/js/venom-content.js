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
 * Synced: contact details, trading hours, social links, services, brands,
 * products, FAQs and reviews.
 * Not synced: performance stages, gallery and homepage hero copy. Those are
 * driven by page-specific scripts holding their own state and need a proper
 * rebuild rather than in-place hydration.
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

  async function init() {
    const settings = await loadSettings();
    if (settings && settings.contact) applyContact(settings.contact);
    // Independent, so one empty table never stops the others.
    await Promise.all([
      applyServices().catch(() => {}),
      applyBrands().catch(() => {}),
      applyProducts().catch(() => {}),
      applyFaqs().catch(() => {}),
    ]);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  window.VenomContent = { summariseHours, applyContact, applyServices, applyBrands, applyProducts, applyFaqs };
})(window, document);
