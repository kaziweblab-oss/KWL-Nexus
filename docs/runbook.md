# KWL Nexus — Production Runbook

## 1. Vercel project

- Framework: Next.js. **Root Directory: EMPTY (repo root)** — never `apps/web`.
- Node: `20.x` (`package.json` engines). Build: `npm run build`. Crons: `vercel.json`
  (`/api/cron/subscriptions` daily, `/api/cron/payment-health` every 5 min).
- Env (Production): `MONGODB_URI`, `NEXTAUTH_URL` (= canonical `https://<domain>`),
  `NEXTAUTH_SECRET`, `ADMIN_EMAILS`, `CRON_SECRET`. Optional: OAuth keys, `GITHUB_WEBHOOK_SECRET`,
  `GITHUB_WEBHOOK_ALLOWED_REPOS`, `GITHUB_TOKEN`. Template: `.env.example`. No `NEXT_PUBLIC_*` secrets.

## 2. Domain checklist (after every domain move)

`NEXTAUTH_URL` → OAuth callbacks (`/api/auth/callback/<google|github|facebook>`) →
GitHub webhook URL (`/api/webhooks/github`) → sitemap/robots (auto from `NEXTAUTH_URL`).

## 3. Staging vs production

Preview deployments MUST use a separate database (`MONGODB_URI` per environment).
Never run seed/migration experiments against production data.

## 4. Cron auth

Vercel Cron cannot send `Authorization` headers, so both cron routes accept
`Authorization: Bearer <CRON_SECRET>` (manual runs) OR `?secret=<CRON_SECRET>`
(scheduler URL — configure the full URL with `?secret=` wherever the schedule is
created). Prefer the header manually; rotate the secret if the URL ever leaks.

## 5. MongoDB Atlas backup (owner: ____________)

Atlas retains automated backups per cluster tier — verify in Atlas → Backup:
snapshot schedule, point-in-time window, retention. Restore = restore-to-new-cluster
first, verify, then cut over (never restore over live without a snapshot).
App-level export fallback: `/admin/export`.

## 6. First-run product setup

`POST /api/admin/apps/seed` `{ "key": "kwl-video-downloader" }`, review, publish,
promote a release tag, mint a scoped API key, deliver per `docs/kwl-video-downloader.md`.

## 7. Incident quick triage

Build fail → Vercel logs. 401 spikes → secrets/cookies (`NEXTAUTH_URL` mismatch).
Cron silent → `?secret=` configured? Webhook ignored → signature/allowlist/tag
(Vercel logs carry `webhook:release` JSON lines). Payments stuck → `/admin/payments`.

## 8. Staging QA checklist (manual, before every production push)

User: register → login → browse → app → plan → order → payment → admin approve →
entitlement → download → `latest?current=` shows update. Admin: apps, plans, payments
(order+entitlement columns), subscriptions, releases promote, users/roles, keys,
branding, export. Webhook: publish a test release → synced, not auto-promoted.
UX: 360px + desktop, light + dark, offline reload, understandable errors.
Do not mark complete on `npm run build` alone.
