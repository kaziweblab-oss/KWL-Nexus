# KWL Video Downloader — Nexus Integration

Product slug: `kwl-video-downloader` (stable — desktop teams hardcode this).
Setup: `POST /api/admin/apps/seed` `{ "key": "kwl-video-downloader" }` (admin only, idempotent).
Preview: `GET /api/admin/apps/seed`. Publish stays manual unless `{ "publish": true }`.

## Desktop flow (no user login in-app, app-level key only)

1. Key: Settings → API keys → scope = `kwl-video-downloader` (+ `update:read`, `entitlement:read` as needed).
   Header `x-api-key: kn_live_…` (`Authorization: Bearer` also works). 1000 req/hour per key, fleet-wide.
2. Heartbeat: `POST /api/apps/<ObjectId>/ping` on startup.
3. Feedback: `POST /api/feedback` `{ appId: <ObjectId>, type, title 3–160, description 5–5000, link?, contactEmail?, rating? }` → 201 `{ data: { id, status } }`. Retry-queued offline. Triage in `/admin/feedbacks` (dashboard-only — no outgoing mail by design).
4. Tutorial: `GET /api/apps/<id>/tutorial` → `{ updatedAt, sections: [{ heading, bodyMarkdown }] }`, cached offline.
5. Update: `GET /api/v1/apps/kwl-video-downloader/latest?platform=windows&arch=x64&current=1.2.0` → `{ version, release: { tag, notes, url }, asset: { file, url, size, checksumSha256 }, updateAvailable }`.
6. License: `GET /api/v1/apps/kwl-video-downloader/entitlement` (session or scoped key) → `{ hasAccess, type, endsAt }`.

## Plans (defaults in BDT, adjustable in /admin/pricing)

Monthly 199 / Yearly 1990 / Lifetime 4990. A successful payment creates the entitlement;
refund/cancel/expiry revokes it. Desktop apps never see secrets or MongoDB.

## Windows releases

Published via GitHub Releases on `kaziweblab-oss/kwl-video-downloader` → webhook syncs to Nexus →
admin promotes a tag in `/admin/apps/[id]` releases → `.exe` asset (+ arch + checksum when present)
flows through the `latest` manifest above.
