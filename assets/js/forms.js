/**
 * forms.js
 * Client-side validation and submission handling for the quote-request
 * and contact forms.
 * Submissions are recorded in Supabase and appear in the Venom Racing
 * Portal inbox. The connection is configured in venom-supabase.js, and the
 * bot protection in form-guard.js; both must be loaded before this file.
 */

(function (window, document) {
  'use strict';

  const { qs, qsa } = window.VenomUtils || {};

  const guard = window.VenomFormGuard;

  /** Outcome only - never what the visitor typed. */
  function log(form, outcome, reason) {
    if (window.VenomLog) {
      window.VenomLog.event('form', { form: form.dataset.formName || form.id || 'form', outcome: outcome, reason: reason || '' });
    }
  }

  function showFieldError(field, message) {
    const group = field.closest('.form-group');
    if (!group) return;
    let errorEl = group.querySelector('.form-error');
    if (!errorEl) {
      errorEl = document.createElement('span');
      errorEl.className = 'form-error';
      errorEl.id = field.id + '-error';
      group.appendChild(errorEl);
    }
    errorEl.textContent = message || '';
    field.classList.toggle('is-invalid', Boolean(message));
    if (message) {
      field.setAttribute('aria-invalid', 'true');
      field.setAttribute('aria-describedby', errorEl.id);
    } else {
      field.removeAttribute('aria-invalid');
      field.removeAttribute('aria-describedby');
    }
  }

  /** The fields an enquiry carries, read by name so markup order never matters. */
  function readForm(form) {
    const get = (n) => (form.elements[n] ? form.elements[n].value : '');
    return {
      name: get('name'), phone: get('phone'), email: get('email'),
      make: get('make'), model: get('model'), registration: get('registration'),
      service: get('service'), message: get('message'),
    };
  }

  function requiredNames(form) {
    return qsa('[required]', form).map((f) => f.name).filter(Boolean);
  }

  /** Validate every field, mark the ones that fail, focus the first. */
  function validateForm(form, data) {
    const errors = guard
      ? guard.validate(data, requiredNames(form))
      : {};
    let first = null;
    qsa('[name]', form).forEach((field) => {
      if (field.name === 'website') return;
      const msg = errors[field.name] || null;
      showFieldError(field, msg);
      if (msg && !first) first = field;
    });
    if (first) first.focus();
    return !first;
  }

  function setStatus(statusEl, text, kind) {
    if (!statusEl) return;
    statusEl.textContent = text;
    statusEl.className = kind === 'ok' ? 'form-success' : 'form-error';
  }

  /**
   * Record the enquiry in Supabase so it reaches the Venom Racing Portal.
   * Configure the connection once in assets/js/venom-supabase.js.
   * @returns {Promise<void>} rejects if the enquiry could not be stored
   */
  async function submitForm(form, data) {
    const api = window.VenomSupabase;
    if (!api || !api.isConfigured()) return;

    const stored = await api.sendEnquiry(Object.assign({}, data, { source: 'Website form' }));
    if (!stored) throw new Error('Enquiry could not be sent.');
  }

  function initForm(form) {
    if (guard) guard.protect(form);
    const statusEl = qs('[data-form-status]', form);
    if (statusEl) {
      statusEl.setAttribute('role', 'status');
      statusEl.setAttribute('aria-live', 'polite');
    }

    form.addEventListener('submit', async (event) => {
      event.preventDefault();

      const raw = readForm(form);
      const data = guard ? guard.sanitize(raw) : raw;
      if (!validateForm(form, data)) return;

      const verdict = guard ? guard.check(form, raw) : { ok: true, data: data };
      if (!verdict.ok) {
        log(form, 'blocked', verdict.reason);
        // A bot gets the same thank-you a person would, and learns nothing.
        if (verdict.silent) {
          if (verdict.reason !== 'in-flight') {
            setStatus(statusEl, 'Thank you! We will be in touch shortly.', 'ok');
            form.reset();
          }
          return;
        }
        setStatus(statusEl, verdict.message, 'error');
        return;
      }

      if (!navigator.onLine) {
        log(form, 'failed', 'offline');
        setStatus(statusEl, 'You appear to be offline, so your enquiry has not been sent. Please try again once you are connected, or call us on 082 852 0680.', 'error');
        return;
      }

      const submitBtn = qs('[type="submit"]', form);
      if (submitBtn) submitBtn.disabled = true;
      form.setAttribute('aria-busy', 'true');
      if (guard) guard.begin(form);

      try {
        await submitForm(form, verdict.data);
        if (guard) { guard.record(verdict); guard.rearm(form); }
        log(form, 'sent');
        setStatus(statusEl, 'Thank you! We will be in touch shortly.', 'ok');
        form.reset();
      } catch (error) {
        log(form, 'failed', 'request');
        setStatus(statusEl, 'We could not send your enquiry just now. Please try again, or call us on 082 852 0680.', 'error');
      } finally {
        if (guard) guard.end(form);
        form.removeAttribute('aria-busy');
        if (submitBtn) submitBtn.disabled = false;
      }
    });
  }

  function initForms() {
    qsa('[data-form]').forEach(initForm);
  }

  document.addEventListener('DOMContentLoaded', initForms);
})(window, document);
