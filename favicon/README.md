# Favicon Assets

This folder is a placeholder structure. Every file below is currently
empty and referenced by `index.html` (and the other pages), `manifest.json`,
and `browserconfig.xml`. Replace them with real generated icons once the
Venom Racing logo is finalized.

| File | Size | Used by |
|---|---|---|
| `favicon.ico` | 48x48 (multi-size) | Legacy browsers |
| `favicon-16x16.png` | 16x16 | Browser tab |
| `favicon-32x32.png` | 32x32 | Browser tab (retina) |
| `apple-touch-icon.png` | 180x180 | iOS home screen |
| `android-chrome-192x192.png` | 192x192 | Android home screen / PWA |
| `android-chrome-512x512.png` | 512x512 | Android splash / PWA |
| `mstile-150x150.png` | 150x150 | Windows tile |

## Recommended workflow

1. Finalize the Venom Racing logo (SVG preferred) in `assets/images/logo/`.
2. Generate the full favicon set at [realfavicongenerator.net](https://realfavicongenerator.net)
   or with a local tool (e.g. `sharp`, `imagemagick`).
3. Drop the generated files into this folder using the exact names above
   so no HTML/manifest references need to change.
