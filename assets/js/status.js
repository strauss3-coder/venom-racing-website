/**
 * status.js
 * Behaviour for the standalone status pages (404, 500, offline,
 * maintenance). Inline handlers are not allowed by the Content-Security-
 * Policy, so the retry buttons are wired up here.
 */

(function (window, document) {
  'use strict';

  document.querySelectorAll('[data-status-retry]').forEach((btn) => {
    btn.addEventListener('click', () => window.location.reload());
  });

  // The offline page is served in place of whatever was requested, so when
  // the connection returns a reload fetches the page the visitor wanted.
  if (/offline/.test(document.title.toLowerCase())) {
    window.addEventListener('online', () => window.location.reload());
  }
})(window, document);
