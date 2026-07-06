/**
 * builds.js
 * Renders and filters the Featured Builds / Gallery grid on builds.html
 * and gallery.html. Data source is a placeholder array — replace with a
 * fetch() call to a real data source (JSON file, CMS, or API) once the
 * client supplies build photography and specs.
 */

(function (window, document) {
  'use strict';

  const { qs, qsa } = window.VenomUtils || {};

  /** @type {Array<Object>} Completed project data — add more as photography comes in. */
  const BUILDS = [
    {
      id: 'build-exhaust-001',
      title: 'Custom Dual-Quad Exhaust System',
      category: 'exhaust',
      summary: 'TIG-welded stainless dual-quad cat-back system, custom-built and fitted in-house.',
      image: 'assets/images/exhaust/exhaust-dual-quad-system.jpg',
    },
    // Example shape — populate with further completed projects:
    // {
    //   id: 'build-002',
    //   title: 'Toyota Hilux 2.8 GD-6',
    //   category: 'ecu-tuning',
    //   summary: 'Dastek Unichip 5-map install with custom towing and economy profiles.',
    //   image: 'assets/images/builds/placeholder.jpg',
    // },
  ];

  const state = {
    builds: BUILDS,
    activeCategory: 'all',
  };

  function getFilteredBuilds() {
    if (state.activeCategory === 'all') return state.builds;
    return state.builds.filter((build) => build.category === state.activeCategory);
  }

  function renderBuildCard(build) {
    const card = document.createElement('article');
    card.className = 'card fade-in';
    card.innerHTML = `
      <img class="card__image" src="${build.image}" alt="${build.title}" loading="lazy">
      <div class="card__body">
        <h3 class="card__title">${build.title}</h3>
        <p class="card__meta">${build.summary}</p>
      </div>
    `;
    return card;
  }

  function renderBuilds() {
    const grid = qs('[data-builds-grid]');
    const emptyState = qs('[data-builds-empty]');
    if (!grid) return;

    const results = getFilteredBuilds();
    grid.innerHTML = '';

    if (!results.length) {
      if (emptyState) emptyState.hidden = false;
      return;
    }

    if (emptyState) emptyState.hidden = true;

    const fragment = document.createDocumentFragment();
    results.forEach((build) => fragment.appendChild(renderBuildCard(build)));
    grid.appendChild(fragment);
  }

  function initCategoryFilters() {
    const buttons = qsa('[data-builds-filter]');
    if (!buttons.length) return;

    buttons.forEach((button) => {
      button.addEventListener('click', () => {
        buttons.forEach((btn) => btn.classList.remove('is-active'));
        button.classList.add('is-active');
        state.activeCategory = button.dataset.buildsFilter;
        renderBuilds();
      });
    });
  }

  function initBuilds() {
    if (!qs('[data-builds-grid]')) return;
    initCategoryFilters();
    renderBuilds();
  }

  document.addEventListener('DOMContentLoaded', initBuilds);
})(window, document);
