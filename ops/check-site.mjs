#!/usr/bin/env node
/**
 * ops/check-site.mjs - pre-deploy safety check. No dependencies.
 *
 *   node ops/check-site.mjs
 *
 * Exits non-zero if any page would ship without its protections, or if a
 * secret or a broken local reference has crept in. Run it before every
 * push to main (main deploys straight to venomracing.co.za).
 */
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ORIGIN = 'https://venomracing.co.za';
const STATUS = ['404.html', '500.html', 'offline.html', 'maintenance.html'];
const SKIP = ['holding.html']; // legacy holding page, kept as-is
const problems = [];
const fail = (file, msg) => problems.push(`${file.padEnd(18)} ${msg}`);

const pages = readdirSync(ROOT).filter((f) => f.endsWith('.html') && !SKIP.includes(f));
const read = (f) => readFileSync(join(ROOT, f), 'utf8');

const csps = new Set();
for (const f of pages) {
  const html = read(f);
  const csp = (html.match(/http-equiv="Content-Security-Policy" content="([^"]+)"/) || [])[1];
  if (!csp) fail(f, 'missing Content-Security-Policy meta');
  else {
    if (/script-src[^;]*'unsafe-(inline|eval)'/.test(csp)) fail(f, "CSP allows unsafe script");
    if (!STATUS.includes(f)) csps.add(csp);
  }
  if (!/<meta name="referrer" content="strict-origin-when-cross-origin">/.test(html)) fail(f, 'missing referrer policy');
  if (!/<html lang="en-ZA">/.test(html)) fail(f, 'lang is not en-ZA');
  if (/\son[a-z]+="/i.test(html)) fail(f, 'inline event handler (blocked by CSP)');
  if (/<script(?![^>]*\bsrc=)(?![^>]*application\/ld\+json)[^>]*>/i.test(html)) fail(f, 'inline <script> (blocked by CSP)');
  if ((html.match(/<h1[\s>]/g) || []).length !== 1) fail(f, 'must have exactly one <h1>');
  if (!/href="#main-content"/.test(html)) fail(f, 'missing skip link');

  if (STATUS.includes(f)) {
    if (!/<meta name="robots" content="noindex/.test(html)) fail(f, 'status page must be noindex');
    if (/(src|href)="(?!\/|https?:|#|mailto:|tel:)/.test(html)) fail(f, 'status pages need root-absolute paths');
  } else {
    const url = ORIGIN + (f === 'index.html' ? '/' : '/' + f);
    if (!html.includes(`<link rel="canonical" href="${url}">`)) fail(f, 'canonical missing or wrong');
    if (!html.includes(`<meta property="og:url" content="${url}">`)) fail(f, 'og:url missing or wrong');
    if (!html.includes('og:image" content="https://')) fail(f, 'og:image must be absolute');
    for (const s of ['resilience.js', 'consent.js']) if (!html.includes(`assets/js/${s}`)) fail(f, `missing ${s}`);
    if ((html.includes('assets/js/forms.js') || html.includes('assets/js/contact.js')) && !html.includes('assets/js/form-guard.js')) fail(f, 'form page without form-guard.js');
    if (!html.includes('data-consent-open')) fail(f, 'footer missing Cookie Preferences');
    if (/<iframe(?![^>]*data-consent)[^>]*\ssrc="https?:/i.test(html)) fail(f, 'third-party iframe not consent-gated');
  }

  // Every local src/href must exist.
  for (const m of html.matchAll(/(?:src|href)="([^"#?]+)/g)) {
    const ref = m[1];
    if (/^(https?:|mailto:|tel:|data:|\/\/)/.test(ref) || ref === '/') continue;
    const p = join(ROOT, ref.replace(/^\//, ''));
    if (!existsSync(p)) fail(f, `broken reference: ${ref}`);
    else if (statSync(p).isFile() && statSync(p).size === 0) fail(f, `empty file referenced: ${ref}`);
  }
}
if (csps.size > 1) problems.push('CSP differs between pages - keep one policy');

// _headers must carry the same policy as the pages.
if (existsSync(join(ROOT, '_headers')) && csps.size === 1) {
  const [csp] = csps;
  if (!read('_headers').includes(csp)) problems.push('_headers CSP is out of sync with the page meta CSP');
}

// No secrets. The publishable key is public by design; these are not.
const scan = (dir) => readdirSync(join(ROOT, dir), { withFileTypes: true }).flatMap((d) => {
  const rel = join(dir, d.name);
  if (d.isDirectory()) return /^(\.git|node_modules|images|videos)$/.test(d.name) ? [] : scan(rel);
  return /\.(js|html|json|xml|txt|yml|md|mjs)$/.test(d.name) ? [rel] : [];
});
for (const f of scan('.')) {
  const t = read(f);
  if (/sb_secret_[A-Za-z0-9_-]{8,}|-----BEGIN [A-Z ]*PRIVATE KEY-----/.test(t) && !f.endsWith("check-site.mjs"))
    fail(f, 'possible secret in a published file');
  if (/eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/.test(t)) {
    const payload = JSON.parse(Buffer.from(t.match(/eyJ[A-Za-z0-9_-]{10,}\.(eyJ[A-Za-z0-9_-]{10,})/)[1], 'base64url').toString());
    if (payload.role && payload.role !== 'anon') fail(f, `JWT with role "${payload.role}" in a published file`);
  }
}

// Sitemap lists every indexable page, and only those.
const sitemap = read('sitemap.xml');
const listed = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
for (const f of pages.filter((p) => !STATUS.includes(p))) {
  const url = ORIGIN + (f === 'index.html' ? '/' : '/' + f);
  if (!listed.includes(url)) problems.push(`sitemap.xml missing ${url}`);
}
for (const u of listed) {
  const f = u === ORIGIN + '/' ? 'index.html' : u.replace(ORIGIN + '/', '');
  if (!existsSync(join(ROOT, f))) problems.push(`sitemap.xml lists missing page ${u}`);
}
if (!/Sitemap: https:\/\/venomracing\.co\.za\/sitemap\.xml/.test(read('robots.txt'))) problems.push('robots.txt sitemap line wrong');

// security.txt must not be expired.
const exp = (read('.well-known/security.txt').match(/Expires: (\S+)/) || [])[1];
if (!exp || new Date(exp) < new Date(Date.now() + 30 * 864e5)) problems.push('.well-known/security.txt expires within 30 days - renew it');

if (problems.length) {
  console.log('PRE-DEPLOY CHECK FAILED\n');
  problems.forEach((p) => console.log('  ' + p));
  process.exit(1);
}
console.log(`PRE-DEPLOY CHECK PASSED - ${pages.length} pages`);
