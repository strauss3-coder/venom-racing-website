# Venom Racing website — security, privacy and production audit

**Date:** 14 October 2026
**Scope:** the public website (`venom-racing-website`, live at
https://venomracing.co.za on GitHub Pages).
**Out of scope, at the client's request:** the Venom Racing Portal (CMS) and
the Supabase database schema. Neither was changed.

Key: ✅ in place and verified · ⚠️ needs action outside the code · ➖ not applicable

---

## Findings fixed in this pass

| # | Finding | Severity | Fix |
|---|---|---|---|
| 1 | No Content-Security-Policy | High | Strict CSP on every page: `script-src 'self'`, no inline script, allowlisted origins |
| 2 | Database links written to `href` unchecked: a `javascript:` link saved in the portal would run on the live site | High | `safeUrl()` allowlist in `venom-content.js`; tested with hostile data |
| 3 | `http://venomracing.co.za` served the page without redirecting to HTTPS | High | ⚠️ Needs **Enforce HTTPS** ticked in GitHub Pages settings |
| 4 | Forms had no bot protection: no honeypot, timing, rate limit, duplicate lock or spam check | Medium | `form-guard.js`, 7 layers |
| 5 | Google Maps loaded third-party cookies with no consent | Medium (POPIA) | Consent banner and preferences; maps gated, and removed on withdrawal |
| 6 | Legal pages were short placeholders; no Cookie, Disclaimer, POPIA or PAIA pages | Medium | Six full, styled legal pages, linked from every footer |
| 7 | Enquiry request had no timeout: a hung request left the button disabled forever | Medium | 12 s timeout, offline detection, distinct error messages |
| 8 | Unconfigured mode logged the customer's enquiry to the console | Low | Removed; no personal data is logged anywhere |
| 9 | Every favicon file was 0 bytes; the OG share image did not exist | Medium (brand/SEO) | Full icon set (incl. maskable) and a 1200×630 share image |
| 10 | Canonical and `og:url` blank on every page; sitemap and robots pointed at `your-domain-here.com` | Medium (SEO) | Absolute canonicals, OG/Twitter URLs, correct sitemap and robots |
| 11 | `README.md` publicly served at venomracing.co.za/README.md | Low | `_config.yml` excludes repo-only files |
| 12 | Preloader waited for every asset (`window.load`), delaying LCP; with JS off it covered the page forever | Medium | Reveals on fonts-ready (cap 1.8 s); CSS failsafe for no-JS |
| 13 | Skip link invisible when focused | Medium (a11y) | Visible on focus |
| 14 | Footer Facebook and Instagram icons were dead `#` links on every page | Low | Real profile URLs |
| 15 | No 404, offline or maintenance pages | Low | 404, 500, offline (service worker), maintenance |
| 16 | Oswald downloaded on every page but only used as a fallback | Low (perf) | Removed from the font request |

---

## ✅ Security checklist

| Item | Status | Notes |
|---|---|---|
| Content-Security-Policy | ✅ | Meta tag on all 18 pages; zero violations in testing |
| Referrer-Policy | ✅ | `strict-origin-when-cross-origin` |
| Strict-Transport-Security | ⚠️ | GitHub Pages cannot send it. `_headers` is ready; see `docs/SECURITY.md` §2 (Cloudflare, free) |
| X-Frame-Options / frame-ancestors | ⚠️ | Same limit. A framing guard in `resilience.js` covers the page meanwhile |
| X-Content-Type-Options | ⚠️ | Same limit; in `_headers` |
| Permissions-Policy | ⚠️ | Same limit; in `_headers` |
| HTTPS redirect | ⚠️ | Tick **Enforce HTTPS** in GitHub → Settings → Pages |
| Honeypot | ✅ | Off-screen field; silent drop |
| Time-based validation | ✅ | 2.5 s minimum |
| Rate limiting | ✅ | Browser-side: 3 / 10 min, 6 / day. Server-side recommended (below) |
| Spam detection | ✅ | Link count, markup, vocabulary, disposable domains |
| Duplicate prevention | ✅ | 24 h fingerprint and in-flight lock |
| Origin validation | ✅ | Own domain only, not framed |
| Server-side validation | ⚠️ | Not implemented: needs a database trigger. Recommended in `docs/SECURITY.md` §6 |
| Sanitisation and validation | ✅ | Tags and control chars stripped, lengths capped, email and SA phone validated |
| XSS | ✅ | Output escaped; links allowlisted; no inline script allowed by the CSP |
| SQL injection | ✅ | No SQL built client-side; PostgREST parameterises |
| CSRF | ➖ | No cookies or sessions on the website, so there is nothing to forge. The Origin check covers cross-site posting |
| File uploads | ➖ | None on the website |
| Authentication (sessions, cookies, tokens, logout, routes) | ➖ | The website has no login. Portal auth is out of scope; Supabase Auth hardening is recommended below |
| Admin / API protection | ✅ | Only the publishable key ships; RLS limits anonymous visitors to reading published content and inserting an enquiry. No service-role key or secret found in the repo |
| Secrets in code | ✅ | `ops/check-site.mjs` scans every deploy |
| Vulnerability disclosure | ✅ | `/.well-known/security.txt` |

## ✅ Privacy checklist (POPIA)

| Item | Status |
|---|---|
| Cookie consent banner, equal-weight Accept / Necessary only | ✅ |
| Preferences with Necessary / Functional / Analytics / Marketing | ✅ |
| Withdrawal at any time (footer link), with immediate effect | ✅ |
| Third-party content blocked until consent (Google Maps) | ✅ |
| Consent record versioned and timestamped | ✅ |
| Privacy Policy covering purposes, lawful basis, operators, transfers, retention, rights, Regulator | ✅ |
| Cookie Policy listing every stored item by name | ✅ |
| Terms, Disclaimer, POPIA, PAIA pages | ✅ |
| Privacy notice at each form | ✅ |
| No personal data in logs or console | ✅ |
| No GPS/EXIF metadata in published photos | ✅ (checked) |
| Attorney review of legal copy | ⚠️ Not yet |
| Legal entity name and registration number on Terms/PAIA | ⚠️ Client to supply |
| Retention periods confirmed by the business | ⚠️ Privacy Policy states 24 months for enquiries and 5 years for tax records; confirm |

## ✅ SEO checklist

| Item | Status |
|---|---|
| Unique titles and descriptions | ✅ |
| Canonical URLs (absolute, apex domain) | ✅ |
| Open Graph incl. image size and alt, `og:locale en_ZA` | ✅ |
| Twitter cards with absolute image | ✅ |
| robots.txt with sitemap | ✅ |
| sitemap.xml: all 14 indexable pages, valid XML | ✅ |
| Structured data: AutoRepair + WebSite graph | ✅ Valid JSON-LD |
| Favicons and manifest (incl. maskable icon) | ✅ |
| `lang="en-ZA"` | ✅ |
| Status pages `noindex` | ✅ |
| Submit sitemap in Google Search Console | ⚠️ After deploy |

## ✅ Performance checklist

| Item | Status |
|---|---|
| Scripts `defer`red, no render-blocking JS | ✅ (existing) |
| Image lazy loading | ✅ (existing; below-the-fold images) |
| Videos `faststart` (streamable) | ✅ (all 56 checked) |
| Compression | ✅ GitHub Pages gzip |
| Font loading | ✅ preconnect + `display=swap`; Oswald removed |
| Preloader no longer delays LCP | ✅ |
| Offline/repeat-visit caching | ✅ Conservative service worker (network-first for code) |
| Animations respect `prefers-reduced-motion` | ✅ (existing) |
| Long cache headers | ⚠️ GitHub Pages fixes `max-age=600`; `_headers` is ready for a CDN |
| Modern image formats (WebP/AVIF) | ⚠️ Recommended; needs `<picture>` markup and portal-uploaded images |
| Hero video (4.8 MB) | ⚠️ Re-encode to about 2 MB (H.264 CRF 28, 720p) |
| Core Web Vitals measured on production | ⚠️ Run PageSpeed Insights after deploy; not measurable before |

## ✅ Accessibility checklist

| Item | Status |
|---|---|
| Skip link visible on focus | ✅ Fixed |
| One `<h1>` per page, landmark structure | ✅ |
| Form errors: `aria-invalid`, `aria-describedby`, focus moves to the first error | ✅ |
| Form status announced (`role="status"`, `aria-live`) | ✅ |
| `autocomplete` and `inputmode` on contact fields (WCAG 1.3.5) | ✅ |
| Consent dialog: native `<dialog>` (focus trap, Escape), switches are real checkboxes | ✅ |
| Works without JavaScript (preloader failsafe) | ✅ |
| Colour contrast | ✅ Existing contrast suite passes |
| `holding.html` (legacy, not live) | ⚠️ No lang, h1 or skip link; use `maintenance.html` instead |

---

## Verification performed

- **58 browser checks** (Playwright, all pass): every page loads with zero
  console errors and zero CSP violations. The suite also covers consent
  grant and withdrawal, every form-guard layer, offline and server-failure
  paths, sanitisation, the unchanged enquiry payload, the WhatsApp
  hand-off, hostile `javascript:` links, the skip link, and no-JS.
- **Service worker** (6 checks): visited pages open offline, unvisited
  pages get `offline.html`, nothing cross-origin is cached.
- **Existing website suites** (run from an isolated copy): 14 of 16 pass.
  - `sync8` fails 3 assertions *by design*: it expects the map `src` to be
    set without consent.
  - `site-a11y` fails only on the untouched legacy `holding.html`.
- **Pre-deploy check** (`ops/check-site.mjs`): passes on all 18 pages.
- All backend calls were intercepted in testing: **no test enquiry reached
  the live database.**

---

## Remaining recommendations, in priority order

1. **Tick Enforce HTTPS** in GitHub Pages (5 minutes).
2. **Put Cloudflare in front** (free) to send HSTS, frame-ancestors,
   nosniff and Permissions-Policy from `_headers`.
3. **Server-side enquiry enforcement** in Supabase: a trigger for
   validation, rate limiting, an Origin allowlist, and blocking anonymous
   writes to `status` and `notes`. Needs approval, because it touches the
   shared database.
4. **Supabase Auth hardening**: disable public sign-ups, MFA for owners,
   leaked-password protection.
5. **Backups**: Supabase Pro, or weekly `ops/backup-db.sh`; run one restore
   drill.
6. **Attorney review** of the six legal pages; add the entity name and
   registration number.
7. **Performance**: WebP/AVIF images, re-encode the hero video, measure
   Core Web Vitals after deploy.
8. **Monitoring**: uptime checks, Google Search Console.
9. **Portal test suite** (if the client allows changes there): update
   `sync8` for consent-gated maps; `web.js` should load `form-guard.js`
   and wait 2.5 s before submitting.
