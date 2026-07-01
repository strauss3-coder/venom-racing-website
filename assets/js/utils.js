/**
 * utils.js
 * Shared helper functions used across the site.
 * Exposed on `window.VenomUtils` so any script tag (loaded without modules)
 * can access them without bundling.
 */

(function (window) {
  'use strict';

  /**
   * Debounce a function call.
   * @param {Function} fn
   * @param {number} delay - ms
   * @returns {Function}
   */
  function debounce(fn, delay = 250) {
    let timeoutId;
    return function debounced(...args) {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => fn.apply(this, args), delay);
    };
  }

  /**
   * Throttle a function call.
   * @param {Function} fn
   * @param {number} limit - ms
   * @returns {Function}
   */
  function throttle(fn, limit = 250) {
    let inThrottle = false;
    return function throttled(...args) {
      if (!inThrottle) {
        fn.apply(this, args);
        inThrottle = true;
        setTimeout(() => {
          inThrottle = false;
        }, limit);
      }
    };
  }

  /**
   * Shorthand querySelector.
   * @param {string} selector
   * @param {ParentNode} [scope]
   * @returns {Element|null}
   */
  function qs(selector, scope = document) {
    return scope.querySelector(selector);
  }

  /**
   * Shorthand querySelectorAll returning a real array.
   * @param {string} selector
   * @param {ParentNode} [scope]
   * @returns {Element[]}
   */
  function qsa(selector, scope = document) {
    return Array.from(scope.querySelectorAll(selector));
  }

  /**
   * Format a number as USD currency.
   * @param {number} amount
   * @returns {string}
   */
  function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(amount);
  }

  /**
   * Format a number with thousands separators (e.g. mileage).
   * @param {number} value
   * @returns {string}
   */
  function formatNumber(value) {
    return new Intl.NumberFormat('en-US').format(value);
  }

  /**
   * Read a query parameter from the current URL.
   * @param {string} key
   * @returns {string|null}
   */
  function getQueryParam(key) {
    return new URLSearchParams(window.location.search).get(key);
  }

  /**
   * Basic email format validation.
   * @param {string} email
   * @returns {boolean}
   */
  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  /**
   * Basic North American phone number validation (loose).
   * @param {string} phone
   * @returns {boolean}
   */
  function isValidPhone(phone) {
    return /^[\d\s()+-]{7,20}$/.test(phone);
  }

  /**
   * Safely parse JSON, returning a fallback on failure.
   * @param {string} value
   * @param {*} fallback
   * @returns {*}
   */
  function safeParseJSON(value, fallback = null) {
    try {
      return JSON.parse(value);
    } catch (error) {
      return fallback;
    }
  }

  window.VenomUtils = {
    debounce,
    throttle,
    qs,
    qsa,
    formatCurrency,
    formatNumber,
    getQueryParam,
    isValidEmail,
    isValidPhone,
    safeParseJSON,
  };
})(window);
