/**
 * contact.js
 * Contact page only. Turns the enquiry form into a WhatsApp hand-off:
 * on submit it validates natively, builds a formatted message from every
 * field and opens WhatsApp (wa.me) pre-filled — the visitor just presses
 * send.
 *
 * The enquiry is also recorded in Supabase so it reaches the Venom Racing
 * Portal inbox, because a WhatsApp hand-off leaves no record at all if the
 * visitor never presses send. That recording is deliberately fire-and-forget:
 * the WhatsApp window must open immediately either way, so a slow or failed
 * request can never cost you the lead.
 *
 * form-guard.js decides whether the enquiry is recorded. A person always
 * gets WhatsApp; a bot, a duplicate, or a burst past the rate limit just
 * never reaches the inbox.
 */

(function (window, document) {
  'use strict';

  const WHATSAPP_NUMBER = '27828520680'; // 082 852 0680 (primary)

  function val(id) {
    const el = document.getElementById(id);
    return el ? el.value.trim() : '';
  }

  const FIELD_IDS = { name: 'cf-name', phone: 'cf-phone', email: 'cf-email', message: 'cf-message' };

  /** Native validity plus the guard's stricter email and phone rules. */
  function validate(form, guard) {
    if (guard) {
      const errors = guard.validate(guard.sanitize({
        name: val('cf-name'), phone: val('cf-phone'), email: val('cf-email'), message: val('cf-message'),
      }), []);
      Object.keys(FIELD_IDS).forEach((k) => {
        const el = document.getElementById(FIELD_IDS[k]);
        if (el) el.setCustomValidity(errors[k] || '');
      });
    }
    return typeof form.reportValidity !== 'function' || form.reportValidity();
  }

  function initWhatsappForm() {
    const form = document.querySelector('[data-wa-form]');
    if (!form) return;

    const guard = window.VenomFormGuard;
    if (guard) guard.protect(form);

    // A custom message set on submit must clear as soon as the visitor edits.
    form.addEventListener('input', (event) => {
      if (event.target.setCustomValidity) event.target.setCustomValidity('');
    });

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      if (!validate(form, guard)) return;

      const vehicle = [val('cf-make'), val('cf-model')].filter(Boolean).join(' ');
      const lines = [
        'Venom Racing Website Enquiry',
        '',
        'Name:',
        val('cf-name'),
        '',
        'Phone:',
        val('cf-phone'),
        '',
        'Email:',
        val('cf-email'),
        '',
        'Vehicle:',
        vehicle || '—',
        '',
        'Registration:',
        val('cf-reg') || '—',
        '',
        'Service Required:',
        val('cf-service') || '—',
        '',
        'Message:',
        val('cf-message') || '—',
      ];

      const raw = {
        name: val('cf-name'),
        phone: val('cf-phone'),
        email: val('cf-email'),
        make: val('cf-make'),
        model: val('cf-model'),
        registration: val('cf-reg'),
        service: val('cf-service'),
        message: val('cf-message'),
      };
      const verdict = guard ? guard.check(form, raw) : { ok: true, data: raw };
      const log = (outcome, reason) => {
        if (window.VenomLog) window.VenomLog.event('form', { form: 'contact-whatsapp', outcome: outcome, reason: reason || '' });
      };
      if (!verdict.ok) log('not-recorded', verdict.reason);

      // A filled honeypot or a foreign origin is a bot: no WhatsApp, no record.
      if (!verdict.ok && verdict.silent && verdict.reason !== 'in-flight') return;

      // Record it first, but never wait on it — see the note at the top.
      if (verdict.ok && window.VenomSupabase) {
        window.VenomSupabase.sendEnquiry(Object.assign({}, verdict.data, { source: 'Website form' }))
          .then((stored) => {
            log(stored ? 'sent' : 'failed', stored ? '' : 'request');
            if (stored && guard) guard.record(verdict);
          });
      }

      const url = 'https://wa.me/' + WHATSAPP_NUMBER + '?text=' + encodeURIComponent(lines.join('\n'));
      window.open(url, '_blank', 'noopener');
    });
  }

  document.addEventListener('DOMContentLoaded', initWhatsappForm);
})(window, document);
