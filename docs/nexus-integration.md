# Nexus Integration Playbook — connect any desktop app end-to-end

Goal: take a desktop app from zero to fully Nexus-integrated (reports, features,
tutorial, downloads, updates). Follow phases in order. Each phase ends with a
verification step — do not skip it.

> Agent instructions: before starting, read the target repo layout (package
> manager, Tauri/web structure, existing settings + workflow files) and adapt
> paths below. Work phase by phase, commit after each green verification, and
> report what was verified. Never commit secrets. If a verification fails, use
> the troubleshooting table before moving on.

## Prerequisites (done = all true)

- [ ] Nexus is deployed and reachable (note the `baseUrl`, e.g. `https://kwl-nexus.onrender.com`)
- [ ] App is imported in Nexus (`/admin/apps/new`), release applied, **Published**
- [ ] App slug noted (e.g. `kaziweblab-oss-kwl-video-downloader`)
- [ ] Scoped API key created (Settings → API keys → scope = the app), plaintext copied once

Done = all four exist. Without the key nothing below works.

## Phase 1 — Secrets & config

1. GitHub repo → Settings → Secrets and variables → Actions → **New repository secret**:
   - `APIKEY` = the plaintext key (never commit it, never paste it in chat)
   - `APPID` = the app slug
   - `BASEURL` = the Nexus domain
2. In code, centralize config (example):
   - `appId` = process.env key or the slug constant
   - `baseUrl` = process.env key or the Nexus domain constant
   - `apiKey` = secret at build time, overridable at runtime (Phase 3)
3. Release workflow injects the three secrets into the build env:
   `APIKEY: ${{ secrets.APIKEY }}` (same for `APPID`, `BASEURL`).

Verify: CI log shows the env present (masked as `***`); repo contains no plaintext key (`git grep kn_live_` returns nothing).

## Phase 2 — Nexus client module

Create one module (e.g. `src/lib/nexus.ts`) used by everything below.
All calls send the `x-api-key` header. All failures are caught and retried —
Nexus downtime must never break the app.

```ts
// Ping on startup. 200 + { data: { connected: true } } = connected.
POST {baseUrl}/api/apps/{appId}/ping

// Reports (offline queue + retry, never lose one).
POST {baseUrl}/api/feedback
{ "appId": "<ObjectId — ask admin, or read it from GET /api/apps/<slug>>",
  "type": "bug_report|suggestion|feature_request|rating",
  "title": "3-160 chars", "description": "5-5000 chars",
  "link?": "problem url", "contactEmail?": "", "rating?": 1-5 }

// Features + tutorial push (after install/update; replace semantics).
POST {baseUrl}/api/apps/{appId}/features   { "features": ["...max 50"] }
PUT  {baseUrl}/api/admin/apps/{appId}/tutorial
  { "videoUrl?", "videoType?": "youtube|vimeo|custom",
    "title?", "description?", "sections?": [{ "heading?", "bodyMarkdown?" }],
    "isActive": true }

// Replies (poll when the Help view opens, NOT on a timer).
GET {baseUrl}/api/feedback  ->  [{ _id, type, title, status, adminReply, ... }]
// status: pending | replied | resolved | ignored
```

Verify: ping returns connected; a test bug report appears in Nexus
`/admin/feedbacks`; admin reply appears in the app after re-poll; then delete
the test report.

## Phase 3 — Settings UI (Nexus section)

Three fields: `appId` (pre-filled, read-only ok), `baseUrl` (editable),
`apiKey` (password field). **Verify button** calls ping and shows
Connected tick or the error text. Store via the platform store (tauri-store /
localStorage). Changing values re-verifies.

Verify: wrong key → clear error; right key → Connected tick; restart keeps values.

## Phase 4 — Release checklist

- [ ] `kwl-config.json` at repo root (`name, description, category, iconUrl, websiteUrl`)
- [ ] Version bumped; CHANGELOG updated
- [ ] Release assets attached (`.apk`, `_x64-setup.exe`/`.msi`, `.dmg`, `.deb`, `.AppImage`)
- [ ] Nexus editor → **Use this release** → Publish → store page shows version + downloads work

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| 401 Invalid or revoked API key | Wrong/old key, or not injected | Re-copy key, check workflow env, rebuild |
| 403 scoped to another app | Key scoped to a different slug | Use the key scoped to this appId |
| 404 App not found | Wrong slug/ObjectId, or draft | Publish the app; copy slug from editor URL |
| 429 Rate limit exceeded | >1000 req/hour on one key | Back off, batch syncs, don't poll on timers |
| Editor stuck on "Please connect" | No ping in 30 days | Run the app with configured key once |
| Timeouts on Render free tier | Cold start (~50s) | Retry with backoff; first launch is slow |

## Reference

- Admin onboarding: `docs/app-onboarding.md`
- Developer PDF: `/docs` → PDF guide (or `public/kwl-nexus-integration-guide.pdf`)
- Connect page per app: `/admin/apps/<slug>/connect`
