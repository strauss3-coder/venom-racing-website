/**
 * stages.js
 * Homepage "Performance Stages" interaction, shared by two controls:
 *   - Desktop (>= 992px): the vertical timeline tabs + scroll-progressive
 *     activation (Stage 1 -> 3 as the section scrolls through view).
 *   - Mobile (<= 991px): a custom glassmorphism dropdown. It starts on a
 *     "Select a Performance Stage" placeholder with the detail card hidden;
 *     choosing a stage fades/slides the card in and scrolls it into view.
 *     Scroll-progressive activation is disabled on mobile.
 * The same content panels are driven by whichever control is active, so
 * they never fall out of sync. Pure class toggling; the crossfade is CSS.
 */

(function (window, document) {
  'use strict';

  const { qs, qsa } = window.VenomUtils || {};

  function initStages(root) {
    const section = root.closest('.stages') || root;
    const tabs = qsa('[data-stage-tab]', root);
    const panels = qsa('[data-stage-content]', root);
    if (tabs.length < 2 || panels.length !== tabs.length) return;

    // Labels/numbers pulled from the timeline tabs (single source of truth)
    const nums = tabs.map((t) => (qs('.stage-tab__num', t) || {}).textContent || '');
    const labels = tabs.map((t) => {
      const name = (qs('.stage-tab__name', t) || {}).textContent || '';
      const sub = (qs('.stage-tab__sub', t) || {}).textContent || '';
      return sub ? `${name} · ${sub}` : name;
    });

    // Mobile dropdown bits (optional)
    const select = qs('[data-stage-select]', root);
    const ssToggle = qs('[data-ss-toggle]', root);
    const ssMenu = qs('[data-ss-menu]', root);
    const ssNum = qs('[data-ss-num]', root);
    const ssLabel = qs('[data-ss-label]', root);
    const options = qsa('[data-ss-option]', root);

    const mobileMq = window.matchMedia('(max-width: 991px)');
    let active = 0;
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
      if (ssToggle && ssLabel) {
        if (i < 0) {
          ssLabel.textContent = 'Select a Performance Stage';
          if (ssNum) ssNum.textContent = '';
          ssToggle.classList.add('is-placeholder');
        } else {
          ssLabel.textContent = labels[i];
          if (ssNum) ssNum.textContent = nums[i];
          ssToggle.classList.remove('is-placeholder');
        }
      }
    }

    function select_(i, opts) {
      i = Math.max(0, Math.min(i, tabs.length - 1));
      opts = opts || {};
      const wasPick = section.classList.contains('stages--pick');
      section.classList.remove('stages--pick');
      setTabs(i);
      setSelector(i);

      if (wasPick) {
        // Fade the first chosen card in from the hidden state
        setPanels(-1);
        active = i;
        window.requestAnimationFrame(() =>
          window.requestAnimationFrame(() => setPanels(i))
        );
      } else if (i !== active) {
        setPanels(i);
        active = i;
      }

      if (opts.reveal) {
        const target = opts.scrollTarget || tabs[i];
        if (target && target.scrollIntoView) {
          target.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
        }
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

    /* --- Mobile custom dropdown --- */
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
      ssToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        select.classList.contains('is-open') ? closeMenu() : openMenu();
      });
    }
    function chooseOption(i) {
      closeMenu();
      const panel = panels[i];
      select_(i, { reveal: true, scrollTarget: panel });
    }
    options.forEach((opt, i) => {
      opt.addEventListener('click', () => chooseOption(i));
      opt.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); chooseOption(i); }
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

    /* --- Mode switching (desktop timeline vs mobile placeholder) --- */
    function applyMode() {
      if (mobileMq.matches) {
        // Mobile: placeholder-first, detail card hidden until a pick
        section.classList.add('stages--pick');
        active = -1;
        setTabs(-1);
        setPanels(-1);
        setSelector(-1);
        closeMenu();
      } else {
        // Desktop: default to Stage 1, timeline visible
        section.classList.remove('stages--pick');
        if (active < 0) active = 0;
        setTabs(active);
        setPanels(active);
        setSelector(active);
      }
    }
    if (mobileMq.addEventListener) mobileMq.addEventListener('change', applyMode);
    else if (mobileMq.addListener) mobileMq.addListener(applyMode);

    applyMode();
    update();
  }

  document.addEventListener('DOMContentLoaded', () => {
    qsa('[data-stages]').forEach(initStages);
  });
})(window, document);
