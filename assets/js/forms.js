/**
 * forms.js
 * Client-side validation and submission handling for the quote-request
 * and contact forms.
 * Submissions are recorded in Supabase and appear in the Venom Racing
 * Portal inbox. The connection is configured in venom-supabase.js, which
 * must be loaded before this file.
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
   * Record the enquiry in Supabase so it reaches the Venom Racing Portal.
   * Configure the connection once in assets/js/venom-supabase.js.
   * @param {HTMLFormElement} form
   * @returns {Promise<void>} rejects if the enquiry could not be stored
   */
  async function submitForm(form) {
    const formData = new FormData(form);
    const payload = Object.fromEntries(formData.entries());

    const api = window.VenomSupabase;
    if (!api || !api.isConfigured()) {
      // Not connected yet — behave as before rather than showing an error.
      console.info(`[forms.js] Submitting "${form.dataset.formName || form.id}"`, payload);
      return;
    }

    const stored = await api.sendEnquiry({
      name: payload.name,
      phone: payload.phone,
      email: payload.email,
      make: payload.make,
      model: payload.model,
      registration: payload.registration,
      service: payload.service,
      message: payload.message,
      source: 'Website form',
    });

    if (!stored) throw new Error('Enquiry could not be sent.');
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
