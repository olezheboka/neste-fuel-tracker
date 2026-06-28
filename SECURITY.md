# Security Policy

## Overview

**cenometrs.lv** (Fuel Price Tracker) is a read-only public website that scrapes,
stores, and displays Latvian fuel prices. It has **no user accounts, no
authentication, no personal data, and no user-writable data**. The only data
stored is public fuel-price information scraped from provider websites.

### Security goals

1. Keep the public site available and the displayed prices trustworthy.
2. Treat all scraped provider HTML as **untrusted input** that must never be able
   to execute code or corrupt stored data.
3. Protect the small set of operational secrets (database URL, cron secret,
   deploy token) and the deployment pipeline.

### Threat model summary

| Trust boundary | Untrusted side | Primary risk |
|---|---|---|
| Browser → public API | The whole internet | Abuse / DoS of read & refresh endpoints |
| Scraper → provider sites | Provider HTML / 3rd-party RSS proxy | Malformed/huge/hostile responses |
| Cron → `/api/scrape` | Anyone who finds the URL | Unauthorized scrape triggering |
| Edge middleware → Blob CDN | Cached JSON | Stale/forged price injection |
| Widget embed → `/api/widget` | Any third-party site | Open-CORS data endpoint abuse |
| CI/CD → Vercel | GitHub Actions tokens | Pipeline compromise / secret leak |

Because there is no auth and no PII, the **highest-value asset is integrity of
displayed prices and availability**, not confidentiality of user data.

### Security approach

Defense in depth with simple, low-maintenance controls: parameterized SQL,
framework auto-escaping (React) and explicit escaping at the one inline-script
injection point, a strict security-header set including CSP/HSTS, an allowlist
CORS policy, input validation on price ingest, and graceful-degradation scrapers
that fail closed (a broken provider yields no rows rather than bad rows).

## Implemented & Recommended Security Features

### Input validation
- **Price ingest gate** — every parsed price passes `validatePrice()`
  (`server/scrapers/normalize.js`): finite number within €0.30–€5.00. Out-of-range,
  `NaN`, negative, or mis-split values are rejected before the DB.
- **API query validation** — `/api/prices/history?type=` is checked against an
  allowlist (`VALID_FUEL_TYPES`) and rejected with `400` otherwise.
- **URL/filter params** — client filter tokens are validated against known
  station/fuel ids; unknown tokens are dropped (`client/src/lib/filters.js`).

### Output encoding / XSS protection
- All provider-derived strings (station names, addresses) render through **React
  JSX**, which HTML-escapes by default. No `dangerouslySetInnerHTML` is used in
  the app.
- The edge middleware inlines live prices into an inline `<script>`. The payload
  is serialized with `serializeForScript()` (`edge-serialize.js`), which escapes
  `<` and the U+2028/U+2029 separators to prevent `</script>` breakout.
- `cleanLocation()` (`server/index.js`) strips HTML tags, comments, and CDATA
  artifacts from scraped location strings.
- The embeddable widget (`client/public/widget.js`) escapes all text via `esc()`
  and builds links only from a fixed origin + validated language/fuel ids.

### Security headers (`vercel.json`)
- `Content-Security-Policy` (default-src 'self', `frame-ancestors 'none'`,
  `object-src 'none'`, `base-uri 'self'`, pinned PostHog hosts)
- `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`
- `X-Frame-Options: DENY` + `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- `Cross-Origin-Opener-Policy: same-origin`
- API responses: `Cache-Control: no-store, max-age=0`

### CORS
- Strict origin allowlist for `/api/*` (`server/index.js`).
- `/api/widget/*` is intentionally open (`origin: *`, **credential-less, GET
  only**) because it is embedded on third-party sites and serves only public data.

### Rate limiting & abuse prevention
- Per-IP limiters: 60 req/min general, 5 req/min on `/api/scrape` and
  `/api/refresh`.
- `/api/refresh` is additionally gated by a **persistent, Blob-backed 5-minute
  freshness check**, so the public refresh button cannot hammer provider sites
  even across serverless instances.
- *Note:* the in-memory limiter is best-effort on serverless (per-instance). A
  shared store (Vercel KV / Upstash) is recommended for strict enforcement.

### SQL injection protection
- **All** queries are parameterized (`?` → `$n` translation in `server/db.js`).
  No string-concatenated SQL anywhere.

### Database transport
- The Postgres connection verifies the server's TLS certificate
  (`ssl: { rejectUnauthorized: true }` in `server/db.js`). The managed host serves
  a publicly-trusted certificate that chains to Node's built-in roots, so cert +
  hostname are validated with no custom CA.
- Outbound scraper requests are bounded (10 MB body cap, ≤5 redirects, 5–8 s
  timeout) so a hostile or MITM'd provider response can't exhaust function memory.

### Authentication
- `/api/scrape` is gated by a `CRON_SECRET` bearer token; without it configured
  in production the endpoint returns `503`.
- No end-user authentication exists or is needed.

### Dependency management
- `npm audit` is clean across `client/`, `server/`, and root.
- Dependabot is enabled for all three package dirs + GitHub Actions
  (`.github/dependabot.yml`).
- A nightly dependency-audit job and a PR-time `gitleaks` secret scan run in CI.

### Secrets management
- No secrets are committed. `.env*`, `*.pem`, `*.key`, and `.vercel` are
  gitignored. Secrets live in Vercel project env vars and GitHub Actions secrets.
- Logged Postgres URLs are password-masked (`server/db.js`).

### CI/CD protections
- Production deploy is gated behind a GitHub Environment (`production`) with
  required reviewer, and depends on lint + unit + e2e + security jobs all passing.
- Workflows run with least-privilege `permissions:`; all actions are SHA-pinned.
- A branch ruleset on `main` blocks force pushes and restricts deletions.
- Post-deploy smoke test verifies `/api/health` and `/api/prices/latest`.
- A nightly parser-health check opens a tracking issue when a provider site
  changes.

## Responsible Disclosure Policy

If you discover a security vulnerability, please report it privately.

- **Where:** open a [GitHub Security Advisory](../../security/advisories/new) on
  this repository, or email the maintainer (see the GitHub profile / commit
  author address). **Do not** open a public issue for security reports.
- **Include:** a description of the issue, affected URL/file/endpoint, steps to
  reproduce (or a minimal PoC), and the impact you believe it has.
- **Response timeline (best effort, small hobby project):**
  - Acknowledgement within **5 business days**.
  - Initial assessment within **10 business days**.
  - Fix for confirmed High/Critical issues prioritized as availability allows.
- **Coordinated disclosure:** please give us a reasonable window to fix before
  public disclosure. We're happy to credit you.

This is a small, non-commercial project handling only public data — please scope
expectations accordingly. No bug bounty is offered.

## Security Best Practices for Contributors

- **Never commit secrets.** Use env vars; verify `git status` ignores `.env*`.
- **Validate all external input** — scraped HTML, RSS, query params, and Blob
  JSON are untrusted. Keep `validatePrice()` gating any new ingest path.
- **Escape untrusted content** — render through React; never introduce
  `dangerouslySetInnerHTML`. At any non-React injection point, escape explicitly
  (see `edge-serialize.js`).
- **Keep SQL parameterized** — never interpolate values into query strings.
- **Bound outbound requests** — set timeouts and response-size limits on any new
  `axios`/`fetch` to an external site.
- **Keep dependencies updated** — review and merge Dependabot PRs; don't add
  dependencies casually.
- **Follow least privilege** — new CI jobs declare the minimum `permissions:`.
- **Add a test** for security-relevant behavior (parser bounds, escaping, header
  presence) — see `server/test/security/`.

## Dependency Policy

- Dependabot runs weekly for `client/`, `server/`, root, and GitHub Actions.
- Minor/patch updates are grouped; majors are reviewed individually.
- `npm audit` runs nightly in CI.
- **Release-blocking levels:** **Critical** and **High** advisories in
  production (`--omit=dev`) dependencies must be resolved (patch, upgrade, or
  documented mitigation) before deploy. **Moderate/Low** may be batched into the
  next Dependabot cycle.
- Lockfiles (`package-lock.json`) are committed and CI installs with `npm ci`.

## Secrets Policy

- **Storage:** Vercel project environment variables (runtime) and GitHub Actions
  repository secrets (CI). Never in code, never in the repo.
- **Inventory:** `POSTGRES_URL`, `CRON_SECRET`, `VERCEL_TOKEN`, `VERCEL_ORG_ID`,
  `VERCEL_PROJECT_ID`, `BLOB_URL_PREFIX` / Blob token, PostHog **public** key
  (`phc_…`, safe to expose by design).
- **Rotation:** rotate `CRON_SECRET` and `VERCEL_TOKEN` if leakage is suspected,
  and on contributor offboarding. Prefer a scoped Vercel token over a full-access
  one.
- **Leak prevention:** `gitleaks` scans every PR; `.gitignore` covers `.env*`,
  keys, and `.vercel`. Logs mask credentials.

## CI/CD Security

This is a single-maintainer project, so controls are sized for a solo workflow:
the high-value gate is the deployment reviewer, not pull-request ceremony.

- **Branch ruleset on `main`:** a GitHub ruleset **blocks force pushes** and
  **restricts deletions**, protecting history from accidental or compromised-token
  rewrites without imposing a PR workflow. PR-required protection and required
  approvals are intentionally **not** used — a solo maintainer can't review their
  own PRs, and the deploy gate below already prevents bad code reaching prod.
- **CI on every push:** the `Main` workflow runs lint + server/client tests + e2e
  on every push to `main`, and the deploy job `needs:` all of them, so a failing
  test blocks the deploy even without branch protection.
- **Deployment protection:** production deploys run only from the `Main` workflow
  behind the `production` GitHub Environment with a **required reviewer** — the
  real safety net. Nothing reaches production without explicit human approval.
- **Manual production approval:** the `production` environment reviewer must
  approve each deploy; a post-deploy smoke test (`/api/health`,
  `/api/prices/latest`) then gates success.
- **Least privilege:** every workflow declares an explicit `permissions:` block
  (default `contents: read`; `issues: write` only on the nightly issue-opener;
  `{}` on the scrape trigger).
- **Action pinning:** all third-party actions are pinned to commit SHAs (with the
  tag in a trailing comment) so a moved tag can't inject code into CI.

## Release Security Checklist

- [ ] All CI security/test jobs green (lint, unit, e2e, gitleaks).
- [ ] `npm audit` shows no Critical/High in production deps (all three dirs).
- [ ] No secrets added to the repo; `.env*` still ignored; gitleaks clean.
- [ ] CSP and security headers present and unchanged (or reviewed) —
      `server/test/security/headers.test.js` passing.
- [ ] Inline-script escaping intact — `server/test/security/edge-serialize.test.js`
      passing.
- [ ] Parser health check passing (no provider broke).
- [ ] Price-ingest validation (`validatePrice`) still applied on all ingest paths.
- [ ] Production env vars set (`CRON_SECRET`, `POSTGRES_URL`); `/api/scrape`
      returns `401` without the secret.
- [ ] Post-deploy smoke test (`/api/health`, `/api/prices/latest`) green.
