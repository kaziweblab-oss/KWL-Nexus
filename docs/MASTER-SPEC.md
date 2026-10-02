# KWL Nexus — Master Spec (condensed)

Marketplace + distribution platform for KWL desktop apps (first: `kwl-video-downloader`, Tauri).

## Domains (kept distinct)

User → App/Product → Plan → Order (`created→pending→paid→fulfilled`, terminal `failed/cancelled/refunded`)
→ Payment (`pending/succeeded/failed/refunded`, manual bKash/Nagad/Rocket) → Entitlement
(`free/lifetime/subscription/promo`, `active/expired/revoked`) → Download → Release/Version
(GitHub-synced `Release` + manual `AppVersion` snapshots; `App.latestVersion` pointer) → Update.

## Key APIs

- Storefront: `/api/apps*`, `/api/public/*`, `/api/payment/*`, `/api/user/*`, `/api/download/[appId]`, `/api/apps/[id]/download` (paid ⇒ entitlement).
- Desktop (stable): `/api/v1/apps`, `/api/v1/apps/:slug`, `/api/v1/apps/:slug/latest?platform&arch&current`, `/api/v1/apps/:slug/releases`, `/api/v1/apps/:slug/entitlement` (session or scoped `x-api-key`).
- Desktop sync (legacy): `POST /api/apps/:id/ping|features`, `POST /api/feedback`, `GET /api/apps/:id/tutorial`.
- Admin: `/api/admin/*` (all `isAdmin()`-gated), GitHub import + release promote/rollback, seed `POST /api/admin/apps/seed`.
- System: `/api/webhooks/github` (HMAC, allowlist, idempotent), `/api/cron/*` (`?secret=`), `/api/docs/openapi|postman`.

## Invariants

No secrets client-side. No binary proxying. No destructive migration. No fake verification.
Full area table: `docs/project-state.md`. Ops: `docs/runbook.md`. Product: `docs/kwl-video-downloader.md`.
