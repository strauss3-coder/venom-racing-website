# Favicon Assets

The icon is the red "V" from the Venom Racing wordmark
(`assets/images/logo/venom-racing-logo.png`), redrawn with its grey outline
on the carbon background so it stays legible at 16px. The wordmark itself
is too wide to read at tab size.

| File | Size | Used by |
|---|---|---|
| `favicon.ico` | 48, 32, 16 | Legacy browsers, `/favicon.ico` requests |
| `favicon-16x16.png` | 16x16 | Browser tab |
| `favicon-32x32.png` | 32x32 | Browser tab (retina) |
| `apple-touch-icon.png` | 180x180 | iOS home screen (full bleed; iOS rounds it) |
| `android-chrome-192x192.png` | 192x192 | Android home screen / PWA |
| `android-chrome-512x512.png` | 512x512 | Android splash / PWA |
| `maskable-512x512.png` | 512x512 | Android adaptive icon (mark inside the safe zone) |
| `mstile-150x150.png` | 150x150 | Windows tile |

To regenerate from a new logo, keep these exact names so no page,
`manifest.json` or `browserconfig.xml` reference has to change.
