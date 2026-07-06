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
├── privacy.html            Privacy policy (placeholder — needs legal review)
├── terms.html              Terms & conditions (placeholder — needs legal review)
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
│   │   ├── forms.js          Form validation & submission (quote request/contact)
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
│   ├── videos/            reception-360.mp4 — the homepage hero's scroll-scrubbed video
│   └── fonts/              Self-hosted webfonts (if not using a CDN)
│
└── favicon/                Favicon & PWA icon set (see favicon/README.md)
```

## Homepage hero (cinematic scroll-scrub)

`index.html`'s hero doesn't autoplay video — scrolling drives it. A tall
`.hero-cinematic-wrapper` provides scroll distance; the visible
`.hero-cinematic` stage stays pinned via CSS `position: sticky` while
`assets/js/hero.js` (GSAP + ScrollTrigger) maps scroll progress (0–1)
onto the video's `currentTime` and reveals five content "phases" in
sequence — intro, three feature cards, and a final headline + CTA —
each fading in/out within its own narrow window of that same progress
value. See the `windows` object in `hero.js` to retime any phase, and
`--hero-scroll-length` (set in `components.css`, overridden per
breakpoint in `responsive.css`) to change how much scrolling the whole
sequence takes.

**External dependency:** GSAP + ScrollTrigger are loaded from the
jsDelivr CDN in `index.html` (this is a no-build static site, so there's
no npm install step) — the site needs internet access to load them.
If they fail to load, or the visitor has `prefers-reduced-motion`
enabled, or the video itself errors, `hero.js` falls back to a normal
static hero (frame 0 + the final headline/CTA shown immediately) so the
homepage is never blocked behind a broken scroll effect.

**Video encoding:** `reception-360.mp4` is used as-is; no video
processing tools were available in this environment to inspect or
re-encode it. For the smoothest scrubbing and fastest load, encode it
as H.264 MP4, 1080p, ~24fps, and compressed (a high-fps/high-bitrate
source will make `currentTime` seeks feel less responsive while
scrolling, especially on mobile).

## Local development

No build tools or dependencies are required — this is a static site.

```bash
# From the project root, serve the folder locally:
python3 -m http.server 8000
# or
npx serve .
```

Then open `http://localhost:8000` in a browser.

## Adding a new page

1. Copy an existing page (e.g. `about.html`) as your starting point — it
   already includes the full `<head>` boilerplate, navbar, and footer.
2. Update the `<title>`, meta description, canonical URL, Open Graph, and
   Twitter Card content.
3. Every page loads `utils.js`, `navigation.js`, `animations.js`,
   `builds.js`, `forms.js`, and `main.js` — the feature-specific ones
   (`builds.js`, `forms.js`) no-op harmlessly on pages that don't have
   their target elements, so there's no need to remove them per page.
4. Add the new URL to `sitemap.xml`.
5. Add a link to the new page in the navbar and footer across all pages.

## Content still required before launch

- **Photography/video**: real exhaust fabrication photos are in place
  (`assets/images/exhaust/`, wired into `services.html`, `gallery.html`
  and `builds.js`). Everything else (workshop, other build categories)
  is still a `.photo-placeholder` — drop real files into `assets/images/`
  and swap them in as they're supplied.
- **Real customer reviews**: `index.html` and `reviews.html` contain
  clearly-marked placeholder review cards (`<!-- TODO: replace with real
  verified reviews -->`) — do not publish these as-is, they are structural
  placeholders only.
- **Legal pages**: `privacy.html` and `terms.html` are placeholder text
  and must be reviewed by a qualified attorney (POPIA-compliant) before
  launch.
- **Contact details**: phone/WhatsApp numbers were independently verified
  against public listings during development. The street address and
  email in the current copy came from client-supplied research and were
  confirmed by the client — re-confirm before launch if anything about
  the business (address, hours) has changed since.

## SEO checklist per page

- [x] `<title>` and `<meta name="description">` — filled in with real
  copy per page
- [ ] `<link rel="canonical">` and `og:url` — intentionally left blank
  until the production domain is confirmed
- [x] Open Graph / Twitter Card title & description
- [ ] `og:image` / `twitter:image` — points at
  `assets/images/social/og-image.jpg`, which doesn't exist yet
- [x] `LocalBusiness` (`AutoRepair`) structured data on `index.html` —
  update if address/hours change

## Deployment — GitHub Pages

1. Push this repository to GitHub.
2. In the repo settings, go to **Pages** and set the source to the
   `main` branch, root folder.
3. The site will be published at `https://<username>.github.io/<repo>/`.

### Connecting a custom domain

1. Add the domain to the `CNAME` file at the project root (currently
   blank), e.g.:
   ```
   www.venomracing.co.za
   ```
2. In your domain's DNS settings, add a `CNAME` record pointing
   `www` to `<username>.github.io`, and `A` records for the apex
   domain pointing to GitHub Pages' IP addresses (see
   [GitHub's custom domain docs](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site)).
3. In the repo's **Pages** settings, enter the custom domain and enable
   **Enforce HTTPS** once DNS has propagated.
4. Update `robots.txt`, `sitemap.xml`, and every page's `canonical`/`og:url`
   placeholder to use the final production domain.

## Favicon & PWA icons

`favicon/` currently contains empty placeholder files referenced by every
page, `manifest.json`, and `browserconfig.xml`. See `favicon/README.md`
for the full list and generation instructions once the logo is final.

## Notes

- `assets/js/builds.js` has an empty `BUILDS` placeholder array; wire it
  up to real completed-project data (JSON file, CMS, or API) once
  photography and specs are available.
- `assets/js/forms.js` submits by logging to the console; replace
  `submitForm()` with a real backend/API integration before launch.
- Icons throughout the site are hand-drawn inline SVGs approximating an
  outline icon style (engine/turbo/ECU/wrench/etc.). Swap in a proper
  icon library (e.g. [Lucide](https://lucide.dev)) for pixel-perfect
  icons and the official Facebook/Instagram/WhatsApp glyphs.
