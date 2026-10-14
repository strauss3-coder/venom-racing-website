/**
 * form-guard.js
 * Bot and abuse protection shared by every enquiry form on the site.
 *
 * Layers, cheapest first:
 *   1. Origin     - the page must be served from our own domain and not
 *                   framed by another site, so a scraped clone or a
 *                   clickjacking frame cannot post leads.
 *   2. Honeypot   - a field people never see. Anything typed into it is a
 *                   bot, and the submission is dropped silently.
 *   3. Timing     - a form completed faster than a person can read it is
 *                   refused, with a message a person can act on.
 *   4. Rate limit - per browser: a few enquiries per ten minutes, and a
 *                   ceiling per day.
 *   5. Duplicates - the same enquiry twice within a day is not re-sent,
 *                   and a form cannot be submitted again while in flight.
 *   6. Spam score - links, markup and stock spam vocabulary.
 *   7. Sanitise and validate every field before it leaves the page.
 *
 * This is the browser half. Anyone can skip a browser, so these checks
 * stop casual bots and keep the inbox clean; they are not the last line
 * of defence. Row Level Security on the database is what actually limits
 * what an anonymous visitor can do (insert one enquiry, read nothing).
 *
 * check() is synchronous on purpose: contact.js must open WhatsApp inside
 * the same click, or the browser blocks the window as a popup.
 */

(function (window, document) {
  'use strict';

  const MIN_FILL_MS = 2500;
  const RATE_WINDOW_MS = 10 * 60 * 1000;
  const RATE_WINDOW_MAX = 3;
  const RATE_DAY_MAX = 6;
  const DUPLICATE_MS = 24 * 60 * 60 * 1000;
  const STORE_KEY = 'vr_form_guard_v1';

  const ALLOWED_HOSTS = ['venomracing.co.za', 'www.venomracing.co.za', 'localhost', '127.0.0.1'];

  /** Longest value each field will accept. Mirrored onto maxlength. */
  const LIMITS = {
    name: 80, email: 254, phone: 20, make: 40, model: 40,
    registration: 15, service: 80, message: 2000,
  };

  const SPAM_TERMS = [
    'casino', 'viagra', 'cialis', 'crypto', 'bitcoin', 'forex', 'binary option',
    'seo service', 'backlink', 'guest post', 'rank your website', 'first page of google',
    'web design service', 'loan offer', 'investment opportunity', 'escort', 'porn',
  ];
  const DISPOSABLE = ['mailinator.com', 'guerrillamail.com', '10minutemail.com', 'tempmail.com',
    'temp-mail.org', 'yopmail.com', 'trashmail.com', 'sharklasers.com', 'getnada.com'];

  const started = new WeakMap();
  const inFlight = new WeakSet();

  /* ---------------------------------------------------------------- *
   * Storage. Every read and write is guarded: private browsing and
   * blocked site data must never stop a real customer's enquiry.
   * ---------------------------------------------------------------- */
  function load() {
    try {
      const raw = window.localStorage.getItem(STORE_KEY);
      const data = raw ? JSON.parse(raw) : null;
      return data && Array.isArray(data.sent) ? data : { sent: [] };
    } catch (error) {
      return { sent: [] };
    }
  }

  function save(data) {
    try { window.localStorage.setItem(STORE_KEY, JSON.stringify(data)); } catch (error) { /* ignore */ }
  }

  /* ---------------------------------------------------------------- *
   * Sanitising. Values are stored as plain text and every page that
   * shows them escapes on output; stripping markup here is defence in
   * depth, so a lead never arrives carrying HTML or control characters.
   * ---------------------------------------------------------------- */
  function clean(value, field) {
    let v = String(value == null ? '' : value);
    if (v.normalize) v = v.normalize('NFKC');
    v = v.replace(/<[^>]*>/g, '');
    if (field === 'message') {
      v = v.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
           .replace(/\r\n?/g, '\n')
           .replace(/\n{3,}/g, '\n\n');
    } else {
      v = v.replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/\s+/g, ' ');
    }
    v = v.trim();
    if (field === 'email') v = v.toLowerCase();
    const max = LIMITS[field];
    return max ? v.slice(0, max) : v;
  }

  function sanitize(data) {
    const out = {};
    Object.keys(data).forEach((k) => { out[k] = clean(data[k], k); });
    return out;
  }

  /* ---------------------------------------------------------------- *
   * Validation
   * ---------------------------------------------------------------- */
  function isEmail(v) {
    if (!v || v.length > LIMITS.email) return false;
    if (/\.\./.test(v)) return false;
    return /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*\.[a-z]{2,}$/i.test(v);
  }

  /** South African numbers (0XX XXX XXXX or +27...), or any international number. */
  function isPhone(v) {
    if (!v || !/^[\d\s()+.-]+$/.test(v)) return false;
    const d = v.replace(/\D/g, '');
    if (/^0\d{9}$/.test(d)) return true;
    if (/^27\d{9}$/.test(d)) return true;
    return v.trim().charAt(0) === '+' && d.length >= 8 && d.length <= 15;
  }

  function isName(v) {
    return v.length >= 2 && /\p{L}/u.test(v) && !/https?:|www\.|@/i.test(v);
  }

  /** @returns {Object<string,string>} field name -> message, empty when valid */
  function validate(data, required) {
    const errors = {};
    const need = required || [];
    need.forEach((k) => { if (!data[k]) errors[k] = 'This field is required.'; });
    if (data.name && !isName(data.name)) errors.name = 'Please enter your name.';
    if (data.email && !isEmail(data.email)) errors.email = 'Please enter a valid email address.';
    if (data.phone && !isPhone(data.phone)) errors.phone = 'Please enter a valid phone number, e.g. 082 123 4567.';
    if (data.message && data.message.length < 5 && need.indexOf('message') >= 0) {
      errors.message = 'Please tell us a little more.';
    }
    return errors;
  }

  /* ---------------------------------------------------------------- *
   * Spam scoring. Each signal adds weight; three or more is refused.
   * One link is allowed - customers paste listings and dyno sheets.
   * ---------------------------------------------------------------- */
  function spamScore(data) {
    const text = [data.name, data.message, data.make, data.model].join(' ').toLowerCase();
    const links = (text.match(/https?:\/\/|www\./g) || []).length;
    let score = 0;
    if (links >= 2) score += 3;
    if (/\[url=|\[link=|<a\s/i.test(String(data.message))) score += 5;
    SPAM_TERMS.forEach((t) => { if (text.indexOf(t) >= 0) score += 3; });
    const domain = (data.email || '').split('@')[1] || '';
    if (DISPOSABLE.indexOf(domain) >= 0) score += 2;
    if (data.name && /\d{4,}/.test(data.name)) score += 2;
    return score;
  }

  function fingerprint(data) {
    const s = [data.email, (data.phone || '').replace(/\D/g, ''), data.message].join('|').toLowerCase();
    let h = 5381;
    for (let i = 0; i < s.length; i += 1) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
    return h.toString(36);
  }

  function originOk() {
    if (window.top !== window.self) return false;
    return ALLOWED_HOSTS.indexOf(window.location.hostname) >= 0;
  }

  /* ---------------------------------------------------------------- *
   * Public API
   * ---------------------------------------------------------------- */

  /** Arm a form: add the honeypot, start the clock, cap field lengths. */
  function protect(form) {
    if (!form || started.has(form)) return;
    started.set(form, Date.now());

    Object.keys(LIMITS).forEach((name) => {
      const field = form.elements[name];
      if (field && !field.hasAttribute('maxlength') && field.tagName !== 'SELECT') {
        field.setAttribute('maxlength', String(LIMITS[name]));
      }
    });

    if (!form.querySelector('.vr-hp')) {
      const trap = document.createElement('div');
      trap.className = 'vr-hp';
      trap.setAttribute('aria-hidden', 'true');
      trap.innerHTML =
        '<label>Leave this field empty<input type="text" name="website" tabindex="-1" autocomplete="off"></label>';
      form.appendChild(trap);
    }
  }

  /**
   * Run every check. Synchronous.
   * @returns {{ok:boolean, silent?:boolean, reason?:string, message?:string, data?:Object}}
   */
  function check(form, raw) {
    if (inFlight.has(form)) return { ok: false, silent: true, reason: 'in-flight' };

    if (!originOk()) return { ok: false, silent: true, reason: 'origin' };

    const trap = form.elements.website;
    if (trap && trap.value) return { ok: false, silent: true, reason: 'honeypot' };

    const t0 = started.get(form) || 0;
    if (Date.now() - t0 < MIN_FILL_MS) {
      started.set(form, Date.now());
      return { ok: false, reason: 'too-fast',
        message: 'Please take a moment to check your details, then send again.' };
    }

    const data = sanitize(raw);

    if (spamScore(data) >= 3) {
      return { ok: false, reason: 'spam',
        message: 'We could not accept this message. Please remove any links and try again, or call us on 082 852 0680.' };
    }

    const store = load();
    const now = Date.now();
    store.sent = store.sent.filter((s) => now - s.at < DUPLICATE_MS);
    const fp = fingerprint(data);

    if (store.sent.some((s) => s.fp === fp)) {
      return { ok: false, reason: 'duplicate',
        message: 'We have already received this enquiry and will be in touch shortly.' };
    }
    const recent = store.sent.filter((s) => now - s.at < RATE_WINDOW_MS).length;
    if (recent >= RATE_WINDOW_MAX || store.sent.length >= RATE_DAY_MAX) {
      return { ok: false, reason: 'rate-limit',
        message: 'You have sent several enquiries already - we will be in touch. For anything urgent, call 082 852 0680.' };
    }

    return { ok: true, data: data, fp: fp };
  }

  /** Mark a form busy while its request is in flight. */
  function begin(form) { inFlight.add(form); }
  function end(form) { inFlight.delete(form); }

  /** Remember a successful send for the rate limit and duplicate check. */
  function record(result) {
    if (!result || !result.fp) return;
    const store = load();
    store.sent.push({ fp: result.fp, at: Date.now() });
    save(store);
  }

  /** Restart the timer, e.g. after a successful send resets the form. */
  function rearm(form) { started.set(form, Date.now()); }

  window.VenomFormGuard = {
    protect, check, begin, end, record, rearm, sanitize, validate, isEmail, isPhone, spamScore, LIMITS,
  };
})(window, document);
