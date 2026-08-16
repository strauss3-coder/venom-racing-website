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
 * Currently synced: phone numbers, email addresses, WhatsApp links, social
 * links, physical address, trading hours.
 * Not yet synced: services, stages, products, brands, gallery, homepage copy.
 * Those are bound to page-specific scripts and need a proper rebuild rather
 * than in-place hydration.
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

  async function init() {
    const settings = await loadSettings();
    if (settings && settings.contact) applyContact(settings.contact);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  window.VenomContent = { summariseHours, applyContact };
})(window, document);
