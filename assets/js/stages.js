/**
 * stages.js
 * Homepage "Performance Stages" interaction, shared by two controls that
 * stay in perfect sync:
 *   - Desktop (>= 992px): the vertical timeline tabs + scroll-progressive
 *     activation (Stage 1 -> 3 as the section scrolls through view).
 *   - Mobile (<= 991px): a custom glassmorphism dropdown + a compact
 *     preview strip. Stage 1 is shown by default (never an empty state);
 *     the dropdown simply switches stages.
 *
 * NOTE: the dropdown and preview live in the section but OUTSIDE the
 * [data-stages] layout, so they are queried from `section`, not `root`.
 * Pure class toggling; the crossfade / entrance stagger is CSS.
 */

(function (window, document) {
  'use strict';

  const { qs, qsa } = window.VenomUtils || {};

  const PREVIEW = [
    { type: 'Software Only', tag: 'Safe entry-level upgrade' },
    { type: 'Light Performance Upgrades', tag: 'First bolt-on gains' },
    { type: 'Intermediate Build', tag: 'Balanced performance step' },
    { type: 'Advanced Setup', tag: 'Hybrid turbo territory' },
    { type: 'Maximum Power Build', tag: 'Full performance build' },
  ];

  function initStages(root) {
    const section = root.closest('.stages') || root;
    const tabs = qsa('[data-stage-tab]', root);
    const panels = qsa('[data-stage-content]', root);
    if (tabs.length < 2 || panels.length !== tabs.length) return;

    const nums = tabs.map((t) => ((qs('.stage-tab__num', t) || {}).textContent || '').trim());
    const labels = tabs.map((t) => {
      const name = ((qs('.stage-tab__name', t) || {}).textContent || '').trim();
      const sub = ((qs('.stage-tab__sub', t) || {}).textContent || '').trim();
      return sub ? `${name} · ${sub}` : name;
    });

    // Dropdown + preview live in the section (siblings of the layout).
    const select = qs('[data-stage-select]', section);
    const ssToggle = qs('[data-ss-toggle]', section);
    const ssNum = qs('[data-ss-num]', section);
    const ssLabel = qs('[data-ss-label]', section);
    const options = qsa('[data-ss-option]', section);
    const spNum = qs('[data-sp-num]', section);
    const spName = qs('[data-sp-name]', section);
    const spType = qs('[data-sp-type]', section);
    const spTag = qs('[data-sp-tag]', section);

    const mobileMq = window.matchMedia('(max-width: 991px)');
    let active = -1;
    let lockUntil = 0;

    function setTabs(i) {
      tabs.forEach((t, idx) => {
        const on = idx === i;
        t.classList.toggle('is-active', on);
        t.setAttribute('aria-selected', on ? 'true' : 'false');
        t.tabIndex = on ? 0 : -1;
      });
    }
    function setPanels(i) {
      panels.forEach((p, idx) => {
        const on = idx === i;
        p.classList.toggle('is-active', on);
        p.setAttribute('aria-hidden', on ? 'false' : 'true');
      });
    }
    function setSelector(i) {
      options.forEach((o, idx) => {
        const on = idx === i;
        o.classList.toggle('is-active', on);
        o.setAttribute('aria-selected', on ? 'true' : 'false');
      });
      if (ssNum) ssNum.textContent = nums[i] || '';
      if (ssLabel) ssLabel.textContent = labels[i] || '';
      if (ssToggle) ssToggle.classList.remove('is-placeholder');
    }
    function setPreview(i) {
      if (spNum) spNum.textContent = nums[i] || '';
      if (spName) spName.textContent = (labels[i] || '').split(' · ')[0];
      if (spType) spType.textContent = PREVIEW[i] ? PREVIEW[i].type : '';
      if (spTag) spTag.textContent = PREVIEW[i] ? PREVIEW[i].tag : '';
    }

    function select_(i, opts) {
      i = Math.max(0, Math.min(i, tabs.length - 1));
      opts = opts || {};
      if (i === active) {
        if (opts.reveal && opts.scrollTarget) opts.scrollTarget.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        return;
      }
      active = i;
      setTabs(i);
      setPanels(i);
      setSelector(i);
      setPreview(i);
      if (opts.reveal) {
        const target = opts.scrollTarget || tabs[i];
        if (target && target.scrollIntoView) target.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
      }
    }

    /* --- Desktop timeline tabs --- */
    tabs.forEach((tab, i) => {
      tab.tabIndex = i === 0 ? 0 : -1;
      tab.addEventListener('click', () => { lockUntil = Date.now() + 1200; select_(i, { reveal: true }); });
      tab.addEventListener('keydown', (e) => {
        let ni = null;
        if (e.key === 'ArrowDown' || e.key === 'ArrowRight') ni = Math.min(i + 1, tabs.length - 1);
        else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') ni = Math.max(i - 1, 0);
        if (ni === null) return;
        e.preventDefault();
        lockUntil = Date.now() + 1200;
        select_(ni, { reveal: true });
        tabs[ni].focus();
      });
    });

    /* --- Mobile dropdown --- */
    function isOpen() { return select && select.classList.contains('is-open'); }
    function openMenu() {
      if (!select) return;
      select.classList.add('is-open');
      ssToggle.setAttribute('aria-expanded', 'true');
    }
    function closeMenu() {
      if (!select) return;
      select.classList.remove('is-open');
      ssToggle.setAttribute('aria-expanded', 'false');
    }
    if (ssToggle) {
      ssToggle.addEventListener('click', (e) => { e.stopPropagation(); isOpen() ? closeMenu() : openMenu(); });
      ssToggle.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openMenu();
          if (options[active >= 0 ? active : 0]) options[active >= 0 ? active : 0].focus();
        }
      });
    }
    function chooseOption(i) {
      closeMenu();
      select_(i, { reveal: true, scrollTarget: panels[i] });
      if (ssToggle) ssToggle.focus();
    }
    options.forEach((opt, i) => {
      opt.addEventListener('click', () => chooseOption(i));
      opt.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); chooseOption(i); }
        else if (e.key === 'ArrowDown') { e.preventDefault(); (options[i + 1] || options[0]).focus(); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); (options[i - 1] || options[options.length - 1]).focus(); }
        else if (e.key === 'Escape') { e.preventDefault(); closeMenu(); ssToggle && ssToggle.focus(); }
      });
    });
    if (select) {
      document.addEventListener('click', (e) => { if (!select.contains(e.target)) closeMenu(); });
      document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });
    }

    /* --- Scroll-progressive activation (desktop only) --- */
    let raf = null;
    function update() {
      raf = null;
      if (mobileMq.matches || Date.now() < lockUntil) return;
      const rect = section.getBoundingClientRect();
      const vh = window.innerHeight || document.documentElement.clientHeight;
      if (rect.bottom < vh * 0.2 || rect.top > vh * 0.8) return;
      const span = rect.height * 0.75;
      const scrolled = vh * 0.55 - rect.top;
      const p = Math.max(0, Math.min(scrolled / span, 0.9999));
      const i = Math.floor(p * tabs.length);
      if (i !== active) select_(i);
    }
    window.addEventListener('scroll', () => { if (!raf) raf = window.requestAnimationFrame(update); }, { passive: true });

    // Default: Stage 1 shown immediately (never empty), both controls synced.
    select_(0);
    update();
  }

  document.addEventListener('DOMContentLoaded', () => {
    qsa('[data-stages]').forEach(initStages);
  });
})(window, document);
