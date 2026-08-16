/**
 * venom-supabase.js
 * One place for the Supabase connection used by the website's enquiry forms.
 *
 * Enquiries submitted on the site are recorded in Supabase so they appear in
 * the Venom Racing Portal inbox. Nothing else on the website reads from
 * Supabase yet — every page still renders its own HTML as before.
 *
 * The publishable key is MEANT to be public and to sit in website source.
 * Row Level Security is what protects you: a visitor may insert one enquiry
 * and nothing else — they cannot read enquiries back, cannot touch any other
 * table, and cannot see unpublished content. That was verified against the
 * live database, not assumed. Never put the service_role key in this file.
 *
 * If these are ever blanked, the forms carry on exactly as they did before —
 * the contact page still hands off to WhatsApp and nothing errors.
 */

(function (window) {
  'use strict';

  const SUPABASE_URL = 'https://znuozxezktzoeozffddk.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_pTsbhKPwEQjoifiOvS0Lvw_XKkHdMDr';

  const isConfigured = () => Boolean(SUPABASE_URL && SUPABASE_KEY);

  /**
   * Record an enquiry. Never throws and never blocks the caller — if the
   * request fails the visitor must still get their normal outcome.
   * @param {Object} data
   * @returns {Promise<boolean>} true if it was stored
   */
  async function sendEnquiry(data) {
    if (!isConfigured()) {
      console.info('[venom-supabase] Not configured; enquiry not recorded.', data);
      return false;
    }

    const vehicle = [data.make, data.model].filter(Boolean).join(' ');

    try {
      const res = await fetch(SUPABASE_URL + '/rest/v1/enquiries', {
        method: 'POST',
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: 'Bearer ' + SUPABASE_KEY,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({
          id: 'e_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
          name: data.name || '',
          phone: data.phone || '',
          email: data.email || '',
          make: data.make || '',
          model: data.model || '',
          registration: data.registration || '',
          service: data.service || '',
          vehicle: vehicle,
          message: data.message || '',
          source: data.source || 'Website form',
          status: 'unread',
        }),
      });

      if (!res.ok) {
        console.error('[venom-supabase] Enquiry rejected:', res.status, await res.text());
        return false;
      }
      return true;
    } catch (error) {
      console.error('[venom-supabase] Enquiry failed to send:', error);
      return false;
    }
  }

  window.VenomSupabase = { sendEnquiry, isConfigured };
})(window);
