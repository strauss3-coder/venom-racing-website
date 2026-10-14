# Operations — venomracing.co.za

Deploying, maintenance mode, rollback, backups and recovery. Excluded from
the published site by `_config.yml`.

**The one fact to remember:** a push to `main` is live on
venomracing.co.za within about a minute. There is no staging step.

---

## 1. Deployment safety checklist

### Before pushing

- [ ] `node ops/check-site.mjs` passes. It checks CSP, referrer policy,
      canonical/OG tags, skip links, one `<h1>` per page, consent gating,
      that form pages load `form-guard.js`, that every local reference
      exists, the sitemap, `security.txt` expiry and for leaked secrets.
- [ ] Preview locally: `python3 -m http.server 8000`, open
      <http://localhost:8000>, and check the browser console for red errors,
      especially `Content-Security-Policy` violations.
- [ ] If you added a third-party script, font, image host or embed, you
      updated the CSP in **every page and `_headers`**, and `cookies.html`.
- [ ] If you changed caching behaviour or a file the offline page needs,
      bump `VERSION` in `sw.js`.
- [ ] New page? Add it to `sitemap.xml`, give it a canonical URL, copy the
      `<head>` from an existing page.

### Straight after pushing

- [ ] Hard-refresh <https://venomracing.co.za> and two inner pages.
- [ ] Send one real test enquiry from the homepage form, wait 3 seconds
      before submitting, and confirm it appears in the portal inbox. Then
      delete it.
- [ ] Contact page: submit the form and confirm WhatsApp opens.
- [ ] In a private window: the cookie banner appears, and the map loads
      only after "Allow & show map".

## 2. Rollback

```bash
git log --oneline -5           # find the bad commit
git revert <sha>               # creates an undo commit; history is kept
git push origin main           # live again in about a minute
```

Never `git push --force` to `main`.

If a broken **service worker** ever ships, browsers keep it until a new
`sw.js` arrives. Replace `sw.js` with this kill switch and push:

```js
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil((async () => {
  for (const k of await caches.keys()) await caches.delete(k);
  await self.registration.unregister();
  for (const c of await self.clients.matchAll()) c.navigate(c.url);
})()));
```

## 3. Maintenance mode

GitHub Pages has no server-side switch, so maintenance mode is a commit.

**On:**

```bash
cp index.html /tmp/index.backup.html
cp maintenance.html index.html
git commit -am "Maintenance mode on" && git push
```

**Off:** `git revert HEAD && git push`.

Only the homepage is replaced; deep links still work, which is usually what
you want for short maintenance. `maintenance.html` is `noindex`, so a
crawler visiting during the window will not index it. For maintenance
longer than a day, prefer a banner on the normal page.

`holding.html` is the older full-screen holding page. It still works, but
it uses an inline script, so it predates the CSP. Prefer `maintenance.html`.

## 4. Error and status pages

| Page | When it shows |
|---|---|
| `404.html` | GitHub Pages serves it automatically for any missing URL. Uses root-absolute paths so it renders at any depth. |
| `500.html` | GitHub Pages never returns a 500 itself. Kept ready for a CDN's custom error page (Cloudflare → Custom Pages). |
| `offline.html` | Served by the service worker when a visitor is offline and the page is not cached. |
| `maintenance.html` | See §3. |

## 5. Backups

### Website code and media

- The canonical copy is GitHub (`strauss3-coder/venom-racing-website`), plus
  every local clone.
- **The raw, un-optimised source media is not in git** (see `.gitignore`).
  Keep it in a second location: an external drive plus a cloud folder.
- Monthly: `git bundle create venom-website-$(date +%F).bundle --all`, kept
  off-site. The bundle is a full clone in one file.

### Database (Supabase)

This holds enquiries — **customers' personal information** — so backups
fall under POPIA too: encrypted, access-controlled, never in a public repo,
never emailed.

- **Supabase Pro** includes daily backups (7-day retention, more with
  point-in-time recovery). On the free plan there are no automatic
  backups, so the script below is the only safety net.
- `ops/backup-db.sh` makes a full dump with `pg_dump`. It needs the
  database connection string (Supabase → Project Settings → Database),
  supplied in an environment variable and never written to a file:

  ```bash
  export SUPABASE_DB_URL='postgresql://postgres.<ref>:<password>@<host>:5432/postgres'
  ./ops/backup-db.sh                  # writes ~/VenomBackups/venom-db-YYYY-MM-DD.sql.gz
  ```

  Run weekly, and before any schema change. The script keeps 12 weeks.
- Storage buckets (`gallery`, `branding`): download via the Supabase
  dashboard or `supabase storage cp -r` after big gallery changes.
- The portal's **Settings → Download backup** (JSON) is a further,
  content-only copy.

### Restore drill (do it once, then quarterly)

Create a throwaway Supabase project and restore into it:

```bash
gunzip -c ~/VenomBackups/venom-db-YYYY-MM-DD.sql.gz | psql "$SCRATCH_DB_URL"
```

Confirm the row counts match, then delete the scratch project. An untested
backup is not a backup.

## 6. Environment and access inventory

The website has no environment variables. Its only configuration is the
Supabase URL and the **publishable** key in `assets/js/venom-supabase.js`
(public by design). Record the rest in a password manager — never in git:

| Item | Where |
|---|---|
| GitHub account (owns the repo and Pages) | Password manager, 2FA on |
| Domain registrar / DNS (`cpns.co.za`) | Password manager |
| Supabase account | Password manager, 2FA on |
| Supabase DB password, service-role key | Password manager only. Never in any repo. |

**DNS records** (needed to rebuild hosting or move to Cloudflare):

| Type | Name | Value |
|---|---|---|
| A | `@` | 185.199.108.153, 185.199.109.153, 185.199.110.153, 185.199.111.153 |
| CNAME | `www` | `strauss3-coder.github.io` |

## 7. Recovery procedures

| Incident | Response |
|---|---|
| Bad deploy | §2 rollback |
| GitHub Pages outage | Check <https://www.githubstatus.com>. If prolonged, deploy the repo to Cloudflare Pages or Netlify (both read `_headers`) and repoint DNS. |
| Repository deleted or corrupted | Re-create the repo from a local clone or the latest `git bundle`, re-enable Pages, check the custom domain and Enforce HTTPS |
| Database lost or corrupted | Restore the latest dump (§5) or a Supabase backup. The website keeps showing its built-in copy meanwhile. |
| Publishable key abused | Supabase → API keys → rotate the publishable key; update `venom-supabase.js`; deploy |
| Service-role key or DB password exposed | Rotate both in Supabase immediately; review the logs; under POPIA s22, assess whether to notify the Information Regulator and affected people |
| Portal owner account compromised | Reset the password in Supabase Auth, sign out all sessions, review recent content changes, check the published links (`safeUrl()` already blocks `javascript:` links) |
| Spam wave through the forms | Check `VenomLog` outcomes; lower `RATE_WINDOW_MAX` or raise the spam score in `form-guard.js`. For a sustained attack, implement the server-side trigger in `docs/SECURITY.md` §6. |
| Domain hijack or DNS change | Restore the records in §6 at the registrar; enable registrar lock |

## 8. Monitoring (recommended, free)

- Uptime monitor on `https://venomracing.co.za/` and `/contact.html`.
- Google Search Console: submit `sitemap.xml`, watch coverage and Core Web
  Vitals.
- After Cloudflare is in front: securityheaders.com and the SSL Labs test.
