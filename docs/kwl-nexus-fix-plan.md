# KWL-Nexus Fix Plan — Desktop App Integration (one-shot)

Goal: `kwl-video-downloader` (Tauri desktop) talks to Nexus for
(1) user reports/feedback (incl. problem link) and (2) in-app How-to/tutorial.
Nothing here changes released desktop behavior until the app side is wired.

## A. Reports / feedback intake (desktop → Nexus → mail)

Desktop will POST `https://kwl-nexus.onrender.com/api/feedback` with header
`x-api-key: <desktop app key>`. Existing route contract (verified from repo):

- Body: `{ appId: ObjectId-string (required), type: bug_report | suggestion | feature_request | rating, title: 3–160 chars (required), description: 5–5000 chars (required), screenshot?: ≤1500000 chars, rating?: 1–5 }`
- Desktop mapping: `error→bug_report`, `suggestion→suggestion`, `feedback→feature_request`; title = first line of message (≤140 chars); problem-link + reply-email appended to description as `Problem link: <url>` / `Reply-to email: <addr>`.
- 201 → `{ data: { id, status } }`. All other statuses → desktop queues locally and retries (never loses reports).

### Backend tasks (Nexus repo)
- [ ] Register `kwl-video-downloader` in app catalog; hand over its Mongo **appId (ObjectId)** to the desktop team.
- [ ] Mint a dedicated `x-api-key` for the desktop app; deliver it through a secure channel (never chat/email-plain). **Revoke `kn_live_7411…`** — it was pasted in chat history.
- [ ] Decide mail flow and implement or document it: today NOTHING sends mail on new feedback (no mail code found). Either add Resend/cron mail to the team on `status: pending` feedback, or confirm dashboard-only workflow (then desktop docs must say so).
- [ ] Optional (recommended): accept `link` (url, ≤2000) and `contactEmail` fields on POST /api/feedback so clients stop stuffing them into `description`. Keep backward compatible (all optional).
- [ ] Note rate limit: 1000 req/hour **per key, shared by the whole desktop fleet**. Feedback volume is tiny — fine. Do NOT lower the desktop key limit.

## B. Tutorial / How-to content (Nexus → desktop Help view)

- [ ] Register the app (same as A) so `GET /api/apps/<id>/tutorial` stops returning 500.
- [ ] Define + document the tutorial content shape, e.g. `{ updatedAt, sections: [{ heading, bodyMarkdown }] }`, EN + BN variants if possible.
- [ ] Seed first tutorial content (install → analyze → queue → history flow).

Desktop will then add a Help view that fetches + caches this (offline fallback).

## C. Key management UI (dashboard)

Matches the existing `ApiKey` model (hash-only storage, revoke, expiry, rate limit):
- [ ] "API Keys" section on the app detail page: Generate → show once → copy; list (masked) with last-used + revoke/regenerate buttons.
- [ ] Never display a full key twice.

## D. Acceptance (definition of done)

- [ ] Desktop `POST /api/feedback` with provided key + appId returns 201 (tested from CI/dev, then deleted).
- [ ] Team receives new feedback (mail or dashboard triage) within the agreed flow.
- [ ] `GET /api/apps/<id>/tutorial` returns 200 with seeded content.
- [ ] Old chat-exposed key revoked; production key delivered securely and stored only in downloader repo GitHub Secrets (`KWL_NEXUS_API_KEY`).

## E. Explicitly out of scope for this round

- User login inside the desktop app (uses app-level key, no user auth).
- Plans/payments/subscriptions in desktop.
- Changing the desktop offline-first guarantees (queue + retry stay).
