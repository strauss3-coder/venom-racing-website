/**
 * stages.js
 * Homepage "Performance Stages" interaction. The left timeline tabs and
 * the right crossfading content panel are kept in sync three ways:
 *   - click a tab to jump to that stage,
 *   - arrow keys move between tabs,
 *   - scrolling the section progressively activates Stage 1 → 3.
 * A short lock after a manual selection stops scroll from immediately
 * overriding a click. No dependencies; pure class toggling (the crossfade
 * itself is CSS).
 */

(function (window, document) {
  'use strict';

  const { qs, qsa } = window.VenomUtils || {};

  function initStages(root) {
    const tabs = qsa('[data-stage-tab]', root);
    const panels = qsa('[data-stage-content]', root);
    if (tabs.length < 2 || panels.length !== tabs.length) return;

    const section = root.closest('.stages') || root;
    let active = 0;
    let lockUntil = 0;

    function setActive(i, opts) {
      i = Math.max(0, Math.min(i, tabs.length - 1));
      if (i === active) return;
      active = i;
      tabs.forEach((t, idx) => {
        const on = idx === i;
        t.classList.toggle('is-active', on);
        t.setAttribute('aria-selected', on ? 'true' : 'false');
        t.tabIndex = on ? 0 : -1;
      });
      panels.forEach((p, idx) => {
        const on = idx === i;
        p.classList.toggle('is-active', on);
        p.setAttribute('aria-hidden', on ? 'false' : 'true');
      });
      if (opts && opts.reveal) {
        const t = tabs[i];
        if (t && t.scrollIntoView) t.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
      }
    }

    tabs.forEach((tab, i) => {
      tab.tabIndex = i === 0 ? 0 : -1;
      tab.addEventListener('click', () => {
        lockUntil = Date.now() + 1200;
        setActive(i, { reveal: true });
      });
      tab.addEventListener('keydown', (e) => {
        let ni = null;
        if (e.key === 'ArrowDown' || e.key === 'ArrowRight') ni = Math.min(i + 1, tabs.length - 1);
        else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') ni = Math.max(i - 1, 0);
        if (ni === null) return;
        e.preventDefault();
        lockUntil = Date.now() + 1200;
        setActive(ni, { reveal: true });
        tabs[ni].focus();
      });
    });

    // Scroll-progressive activation
    let raf = null;
    function update() {
      raf = null;
      if (Date.now() < lockUntil) return;
      const rect = section.getBoundingClientRect();
      const vh = window.innerHeight || document.documentElement.clientHeight;
      if (rect.bottom < vh * 0.2 || rect.top > vh * 0.8) return; // only while in view
      const span = rect.height * 0.75;
      const scrolled = vh * 0.55 - rect.top;
      const p = Math.max(0, Math.min(scrolled / span, 0.9999));
      setActive(Math.floor(p * tabs.length));
    }
    window.addEventListener('scroll', () => {
      if (!raf) raf = window.requestAnimationFrame(update);
    }, { passive: true });

    update();
  }

  document.addEventListener('DOMContentLoaded', () => {
    qsa('[data-stages]').forEach(initStages);
  });
})(window, document);
