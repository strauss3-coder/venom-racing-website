# Security — venomracing.co.za

How the public website is protected, what the hosting can and cannot do,
and what is still recommended. This folder is excluded from the published
site by `_config.yml`.

Scope: the public website only. The Venom Racing Portal (CMS) and the
Supabase database schema were deliberately left unchanged at the client's
request; anything that needs them is listed under *Recommended* and is
**not implemented**.

---

## 1. Architecture and trust boundaries

| Part | What it is | Trust |
|---|---|---|
| Website | Static HTML/CSS/JS on GitHub Pages | Public. Holds no secrets. |
| Supabase | Database the site reads content from and writes enquiries to | Reached with the **publishable** key, which is public by design |
| Row Level Security | Database rules | The real security boundary: a visitor may read published content and insert one enquiry, nothing else |
| Google | Fonts (always), Maps (only after consent) | Third party |
| WhatsApp | Contact-page hand-off | Third party, visitor-initiated |

The website has no login, no session and no cookies of its own, so session,
cookie-flag, CSRF and token-expiry concerns do not arise on it. CSRF in
particular needs an ambient credential (a cookie) to abuse; the site has
none, and the enquiry endpoint takes only the public key.

## 2. HTTP security headers

### In place now (in every page)

| Control | How | Notes |
|---|---|---|
| Content-Security-Policy | `<meta http-equiv>` | `script-src 'self'` — no inline or third-party script can run |
| Referrer-Policy | `<meta name="referrer">` | `strict-origin-when-cross-origin` |
| HTTPS upgrade | CSP `upgrade-insecure-requests` | Sub-resources only, not the page itself |
| Clickjacking | `resilience.js` covers a framed page | Defence in depth; the header below is the real fix |

### Not possible on GitHub Pages

GitHub Pages cannot send custom response headers. These need a CDN or a
different host:

- `Strict-Transport-Security` (HSTS)
- `X-Frame-Options` and CSP `frame-ancestors` (the meta tag ignores `frame-ancestors`)
- `X-Content-Type-Options: nosniff`
- `Permissions-Policy`
- `Cross-Origin-Opener-Policy`

The complete, ready-to-use set is in **`_headers`** at the repo root.

### Action 1 — switch on "Enforce HTTPS" (5 minutes, do this first)

`http://venomracing.co.za` currently serves the page over plain HTTP
instead of redirecting. In GitHub: **repo → Settings → Pages → Enforce
HTTPS** → tick. Then check:

```bash
curl -sI http://venomracing.co.za/ | head -3    # expect 301 to https://
```

### Action 2 — put Cloudflare in front for the headers (free plan)

1. Add `venomracing.co.za` to Cloudflare, then change the nameservers at the
   registrar (currently `ns1–4.cpns.co.za`) to the two Cloudflare gives you.
   Copy the existing DNS records across first — see `docs/OPERATIONS.md` §6.
2. **SSL/TLS → Full (strict)**. **Always Use HTTPS → On.**
3. **Rules → Transform Rules → Modify Response Header**: add each header
   from `_headers` (`/*` block) as "Set static".
4. Verify at <https://securityheaders.com> — target grade A.
5. Only after a week with no issues, enable HSTS in Cloudflare with
   `includeSubDomains`. Consider preload only once every subdomain is
   HTTPS-only for good.

Alternatively, moving to Cloudflare Pages or Netlify applies `_headers`
automatically.

## 3. Content-Security-Policy

```
default-src 'self'; script-src 'self';
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
font-src 'self' https://fonts.gstatic.com;
img-src 'self' data: blob: https://znuozxezktzoeozffddk.supabase.co;
media-src 'self' blob: https://znuozxezktzoeozffddk.supabase.co;
connect-src 'self' https://znuozxezktzoeozffddk.supabase.co;
frame-src https://www.google.com https://maps.google.com;
worker-src 'self'; manifest-src 'self'; object-src 'none';
base-uri 'self'; form-action 'self'; upgrade-insecure-requests
```

- `style-src 'unsafe-inline'` is needed for the `style=""` attributes the
  pages use. Styles cannot execute code; scripts remain strict.
- The status pages (404/500/offline/maintenance) use a tighter subset.
- **Adding a third party** (analytics, a chat widget, a new image host):
  update the meta tag in every page *and* `_headers`. `ops/check-site.mjs`
  fails if pages disagree or `_headers` drifts.
- CSP violations are logged by `resilience.js` (`VenomLog`, kind `csp`).

## 4. Enquiry form protection

`assets/js/form-guard.js` runs on both forms (homepage quote form, contact
page WhatsApp form).

| Layer | Behaviour |
|---|---|
| Origin | Refuses if the page is not on venomracing.co.za (or localhost) or is framed by another site |
| Honeypot | Off-screen `website` field. Filled → dropped silently; the bot sees "Thank you" |
| Timing | Submitted < 2.5 s after load → refused with a human message |
| Rate limit | 3 per 10 minutes, 6 per day, per browser |
| Duplicates | Same email + phone + message within 24 h → not re-sent; in-flight lock prevents double clicks |
| Spam score | Links (2+), BBCode/HTML links, stock spam vocabulary, disposable email domains |
| Sanitising | Unicode-normalised, HTML tags and control characters stripped, whitespace collapsed, lengths capped (also as `maxlength`) |
| Validation | Name, RFC-style email, SA (`0XX…`, `+27…`) or international phone |
| Network | 12 s timeout, offline detection, distinct messages for offline / failed / refused |

On the contact page a person always gets WhatsApp; the guard only decides
whether the enquiry is *also recorded*.

**Limits — be clear about these.** Every layer above runs in the browser.
Someone who posts directly to the Supabase REST endpoint skips them all.
What still holds in that case is Row Level Security: they can insert an
enquiry and nothing more. Server-side enforcement is in §6.

**XSS.** Content from the database is escaped before it is written to the
page (`esc()` in `venom-content.js`), and links from the database now pass
`safeUrl()`, which accepts only `http(s):`, `mailto:`, `tel:` and site-relative
links. A `javascript:` link saved in the portal is dropped.

**SQL injection.** The site never builds SQL. Supabase's REST layer
(PostgREST) parameterises every query.

**File uploads.** The website has none.

## 5. Privacy controls

- Consent banner and preferences (`consent.js`); Google Maps is blocked until
  allowed and removed again when consent is withdrawn.
- Analytics and marketing categories exist as gates and are unused. To add
  a tag later: `<script type="text/plain" data-consent="analytics"
  data-consent-src="https://…">`, update the CSP, and update `cookies.html`
  first.
- No personal data is written to the console or the client log.
- Photos were checked: no GPS or camera metadata in any published image.

## 6. Recommended — not implemented (needs the database)

Left undone because the client asked that the portal and database stay
untouched. In priority order:

1. **Server-side enquiry validation.** A `BEFORE INSERT` trigger on
   `public.enquiries` that applies only to the `anon` role: length limits,
   email format, forced `status = 'unread'` and empty `notes` (an anonymous
   insert can currently set both), a per-IP rate limit using
   `current_setting('request.headers')::json->>'x-forwarded-for'`, and an
   `Origin` allowlist. Silent-drop (`RETURN NULL`) for spam keeps the
   rejection logged without telling the bot.
2. **Auth settings** (Supabase → Authentication → Providers/Settings):
   disable public sign-ups, enable leaked-password protection, require MFA
   for owner accounts, keep JWT expiry at 1 hour with refresh-token
   rotation and reuse detection on.
3. **Submission log table** written by that trigger (outcome + reason +
   hashed IP, 90-day retention), readable by owners only.
4. **Note for the portal test suite:** with (1) in place,
   `tests/verify-all.sh`'s anonymous probe insert (no `Origin` header)
   would be refused, which is the intended result; its expectation would
   need to change.

## 7. Reporting a vulnerability

`/.well-known/security.txt` (RFC 9116) points to venom@venomracing.co.za.
Renew its `Expires` date yearly; `ops/check-site.mjs` warns 30 days before.
