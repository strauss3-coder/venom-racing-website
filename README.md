# Venom Racing — Website

Production website for Venom Racing, an RMI Accredited performance
tuning and fabrication workshop in eMalahleni, Mpumalanga (official Dastek
Unichip dealer). Static HTML/CSS/JavaScript, no build step required,
deployed via GitHub Pages with a custom domain.

> Venom Racing is a performance workshop, **not** a vehicle dealership —
> the site has no inventory listings, financing, or vehicle-selling flows.
> Every page centres on services, builds, and quote requests.

## Project structure

```
venom-racing-website/
│
├── index.html            Homepage — hero, about, services, why-choose, featured build,
│                           process, reviews, FAQ, contact
├── about.html             About Venom Racing
├── services.html          Full service catalogue (ECU remapping, Unichip, dyno,
│                           exhaust fabrication, conversions, servicing)
├── builds.html            Featured/completed builds with category filtering
├── gallery.html            Workshop & build photo grid
├── reviews.html            Customer reviews
├── faqs.html               Full FAQ (grouped by topic)
├── contact.html            Quote request form, contact info, embedded map
├── privacy.html            Privacy Policy (POPIA)
├── cookies.html            Cookie Policy — everything stored, by name
├── terms.html              Terms & Conditions
├── disclaimer.html         Disclaimer
├── popia.html              POPIA compliance and data-subject requests
├── paia.html               PAIA access-to-information details
├── 404.html / 500.html     Error pages (404 is served by GitHub Pages automatically)
├── offline.html            Served by the service worker when offline
├── maintenance.html        Maintenance mode — see docs/OPERATIONS.md
├── sw.js                   Service worker (offline page, conservative caching)
├── _config.yml             Controls what GitHub Pages publishes
├── _headers                Security headers, ready for a CDN (not used by GitHub Pages)
├── .well-known/security.txt  Vulnerability contact (RFC 9116)
├── docs/                   SECURITY.md, OPERATIONS.md — not published
├── ops/                    check-site.mjs (pre-deploy check), backup-db.sh — not published
│
├── robots.txt             Search engine crawl rules
├── sitemap.xml            Search engine sitemap
├── manifest.json          Web app manifest (PWA / mobile home screen)
├── browserconfig.xml      Windows tile configuration
├── CNAME                  Custom domain for GitHub Pages (blank until connected)
│
├── assets/
│   ├── css/
│   │   ├── variables.css     Design tokens: Carbon Black / Matte Graphite / Deep
│   │   │                      Racing Red palette, type, spacing, shadows, glow, timing
│   │   ├── styles.css        Global resets, base typography, texture utilities
│   │   ├── components.css    Buttons, cards, forms, navbar, footer, hero, service
│   │   │                      cards, process steps, FAQ accordion, reviews carousel
│   │   ├── animations.css    Fade / slide / glow / hover / parallax / particles / loading
│   │   └── responsive.css    Mobile-first breakpoints (tablet/desktop/large)
│   │
│   ├── js/
│   │   ├── utils.js          Shared helpers (debounce, formatters, validators)
│   │   ├── navigation.js     Navbar toggle, scroll state, active link
│   │   ├── animations.js     IntersectionObserver scroll animations
│   │   ├── builds.js         Featured build/gallery card rendering & category filtering
│   │   ├── forms.js          Homepage quote form: validation & submission
│   │   ├── form-guard.js     Bot protection for every form (honeypot, timing, rate limit, spam)
│   │   ├── contact.js        Contact page WhatsApp hand-off + enquiry capture
│   │   ├── consent.js        Cookie consent banner, preferences, consent-gated embeds
│   │   ├── resilience.js     Client log, offline notice, broken-image fallback, framing guard
│   │   ├── venom-supabase.js Supabase connection (publishable key only)
│   │   ├── venom-content.js  Hydrates content from the portal (escaped, link-checked)
│   │   ├── hero.js           Cinematic scroll-scrubbed homepage hero (GSAP ScrollTrigger)
│   │   │                      + the floating particle-field generator
│   │   └── main.js           Site-wide init: FAQ accordion, stat counters, reviews
│   │                          carousel, button ripple
│   │
│   ├── images/
│   │   ├── logo/          Brand logo files
│   │   ├── hero/           Hero/banner imagery
│   │   ├── builds/         Completed build & project photos
│   │   ├── exhaust/        Real exhaust fabrication photography (client-supplied)
│   │   ├── specials/       Promotions / offers
│   │   ├── icons/          UI icons
│   │   ├── backgrounds/    Section background imagery
│   │   └── social/         Open Graph / Twitter Card share images
│   │
│   ├── videos/            venom-hero.mp4 — the homepage hero's ambient background video
│   └── fonts/              Self-hosted webfonts (if not using a CDN)
│
└── favicon/                Favicon & PWA icon set (see favicon/README.md)
```

## Homepage hero (left/right cinematic composition)

`index.html`'s hero (`.hero`, styled in `components.css`, behaviour in
`assets/js/hero.js`) is a split composition over an ambient looping
video (`assets/videos/venom-hero.mp4`, autoplay + muted + loop) under a
left-weighted scrim:

- **Left** — big Bebas Neue display heading (`--font-display`),
  supporting paragraph, two premium glass "badge" pills, and the CTAs.
- **Right** — three premium glass cards. On capable desktops the stage
  pins (CSS `position: sticky`) and the cards cross-fade one at a time
  as you scroll through the hero (`hero.js` adds `.is-sequenced`, then a
  lightweight rAF scroll handler drives opacity/blur via the `windows`
  array). On mobile / reduced-motion / no-JS the cards simply stack and
  stay visible — no pin, no scroll-jacking.

No external JS dependencies (GSAP was removed). If the video errors or
reduced-motion is set, the video hides and the `.hero__media` gradient
shows through; the hero content is always readable regardless.

**Video encoding:** `venom-hero.mp4` is used as-is; no video tools were
available in this environment to re-encode it. For fastest load, keep it
H.264 MP4, 1080p, compressed.

## Local development

No build tools or dependencies are required — this is a static site.

```bash
# From the project root, serve the folder locally:
python3 -m http.server 8000
# or
npx serve .
```

Then open `http://localhost:8000` in a browser.

## Security, privacy and operations

- **Security** — `docs/SECURITY.md`: the Content-Security-Policy, the form
  protection layers, what GitHub Pages cannot do (HSTS and other headers)
  and how to add it, and recommended database hardening.
- **Operations** — `docs/OPERATIONS.md`: deployment checklist, rollback,
  maintenance mode, backups, recovery procedures.
- **Before every push to `main`** (it deploys straight to production):

  ```bash
  node ops/check-site.mjs
  ```

## Adding a page — the rules the check enforces

1. Copy the `<head>` from an existing page: CSP, referrer policy, canonical
   URL (`https://venomracing.co.za/<page>.html`), Open Graph/Twitter tags
   with absolute image URLs.
2. Load `resilience.js` and `consent.js` first, and `form-guard.js` before
   any form script.
3. No inline `<script>` or `on…=""` handlers — the CSP blocks them.
4. Third-party embeds must be consent-gated:
   `<iframe data-consent="functional" data-consent-src="…">`.
5. Add the page to `sitemap.xml` and the navbar/footer.

## Deployment — GitHub Pages

Deployed from `main`, root folder, custom domain `venomracing.co.za`
(`www` redirects to the apex). **Enforce HTTPS must be ticked** in
Settings → Pages.

## Before launch — needs a person, not code

- **Legal review.** The legal pages describe what the site actually does,
  but have not been reviewed by a South African attorney. Confirm the
  retention periods in the Privacy Policy, and add the business's legal
  entity name and registration number (if registered) to the Terms and
  PAIA pages.
