/**
 * contact.js
 * Contact page only. Turns the enquiry form into a WhatsApp hand-off:
 * on submit it validates natively, builds a formatted message from every
 * field and opens WhatsApp (wa.me) pre-filled — the visitor just presses
 * send. No backend, no normal form submission.
 */

(function (window, document) {
  'use strict';

  const WHATSAPP_NUMBER = '27828520680'; // 082 852 0680 (primary)

  function val(id) {
    const el = document.getElementById(id);
    return el ? el.value.trim() : '';
  }

  function initWhatsappForm() {
    const form = document.querySelector('[data-wa-form]');
    if (!form) return;

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      if (typeof form.reportValidity === 'function' && !form.reportValidity()) return;

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

      const url = 'https://wa.me/' + WHATSAPP_NUMBER + '?text=' + encodeURIComponent(lines.join('\n'));
      window.open(url, '_blank', 'noopener');
    });
  }

  document.addEventListener('DOMContentLoaded', initWhatsappForm);
})(window, document);
