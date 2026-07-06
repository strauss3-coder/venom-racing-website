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
│   │   └── main.js           Site-wide init: FAQ accordion, stat counters, reviews
│   │                          carousel, button ripple, hero parallax
│   │
│   ├── images/
│   │   ├── logo/          Brand logo files
│   │   ├── hero/           Hero/banner imagery
│   │   ├── builds/         Completed build & project photos
│   │   ├── specials/       Promotions / offers
│   │   ├── icons/          UI icons
│   │   ├── backgrounds/    Section background imagery
│   │   └── social/         Open Graph / Twitter Card share images
│   │
│   ├── videos/            Background/hero video assets
│   └── fonts/              Self-hosted webfonts (if not using a CDN)
│
└── favicon/                Favicon & PWA icon set (see favicon/README.md)
```

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

- **Photography/video**: hero, workshop, and build images are referenced
  but not present in `assets/images/`. Drop real files in using the same
  filenames, or update the `src` attributes.
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
