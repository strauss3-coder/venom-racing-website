/**
 * forms.js
 * Client-side validation and submission handling for the quote-request
 * and contact forms.
 * Replace the `submitForm` implementation with a real endpoint call
 * (e.g. fetch to a backend, Formspree, Netlify Forms) when available.
 */

(function (window, document) {
  'use strict';

  const { qs, qsa, isValidEmail, isValidPhone } = window.VenomUtils || {};

  /**
   * Validate a single required field.
   * @param {HTMLElement} field
   * @returns {string|null} error message or null if valid
   */
  function validateField(field) {
    const value = field.value.trim();
    const type = field.dataset.validate;

    if (field.required && !value) {
      return 'This field is required.';
    }

    if (type === 'email' && value && isValidEmail && !isValidEmail(value)) {
      return 'Please enter a valid email address.';
    }

    if (type === 'phone' && value && isValidPhone && !isValidPhone(value)) {
      return 'Please enter a valid phone number.';
    }

    return null;
  }

  function showFieldError(field, message) {
    const group = field.closest('.form-group');
    if (!group) return;
    let errorEl = group.querySelector('.form-error');
    if (!errorEl) {
      errorEl = document.createElement('span');
      errorEl.className = 'form-error';
      group.appendChild(errorEl);
    }
    errorEl.textContent = message || '';
    field.classList.toggle('is-invalid', Boolean(message));
  }

  function validateForm(form) {
    let isValid = true;
    qsa('[data-validate], [required]', form).forEach((field) => {
      const error = validateField(field);
      showFieldError(field, error);
      if (error) isValid = false;
    });
    return isValid;
  }

  /**
   * Placeholder submission handler.
   * @param {HTMLFormElement} form
   * @returns {Promise<void>}
   */
  async function submitForm(form) {
    const formData = new FormData(form);
    const payload = Object.fromEntries(formData.entries());

    // TODO: replace with real endpoint integration.
    console.info(`[forms.js] Submitting "${form.dataset.formName || form.id}"`, payload);
    return Promise.resolve();
  }

  function initForm(form) {
    form.addEventListener('submit', async (event) => {
      event.preventDefault();

      if (!validateForm(form)) return;

      const submitBtn = qs('[type="submit"]', form);
      const statusEl = qs('[data-form-status]', form);

      if (submitBtn) submitBtn.disabled = true;

      try {
        await submitForm(form);
        if (statusEl) {
          statusEl.textContent = 'Thank you! We will be in touch shortly.';
          statusEl.className = 'form-success';
        }
        form.reset();
      } catch (error) {
        if (statusEl) {
          statusEl.textContent = 'Something went wrong. Please try again.';
          statusEl.className = 'form-error';
        }
      } finally {
        if (submitBtn) submitBtn.disabled = false;
      }
    });
  }

  function initForms() {
    qsa('[data-form]').forEach(initForm);
  }

  document.addEventListener('DOMContentLoaded', initForms);
})(window, document);
