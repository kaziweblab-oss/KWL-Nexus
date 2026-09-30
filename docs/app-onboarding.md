# KWL-Nexus App Onboarding — Admin Workflow

How to take an app from GitHub to a live store listing. All steps run from the admin panel. No data is ever deleted by these flows.

## 1. Import (Admin → Apps → Add From GitHub)
1. Pick the repository from the list (auto-detected via GitHub PAT), or type `owner/repo` manually.
2. Logo is auto-detected (`kwl-config.json → iconUrl`, else `icon.png` / `logo.png` / `src-tauri/icons/128x128.png`, else letter avatar).
3. Click **Add app from repository** → draft created (invisible in store).
4. Click **Open in editor** to continue.

Tip: add `kwl-config.json` (`name, description, category, iconUrl, websiteUrl`) to the repo root for one-click metadata.

## 2. Release (App editor → GitHub releases)
1. Each GitHub release shows its tag + mapped files (`.apk` → Android, `.exe`/`.msi` → Windows, `.deb`/`.AppImage` → Linux).
2. Click **Use this release** → version + download URLs + total size are saved, previous version snapshotted for rollback.
3. No releases? Publish a GitHub release with installer assets first.

## 3. Details, Features, Media
- **Details**: name, description, category, pricing, website, icon.
- **Features**: one per line. Shown on the store page AND offered as per-plan toggles in Pricing.
  Desktop apps can also push their own list to `POST /api/apps/<id>/features` (x-api-key, replace wins last).
- **Preview & Screenshots**: shown in store carousel; empty → honest placeholder (users) / dashed hint (admins).

## 4. Tutorial (App editor → Tutorial)
- Video (YouTube/Vimeo/MP4) and/or Markdown sections. Desktop Help view reads `GET /api/apps/<id>/tutorial` with offline cache.

## 5. Pricing (Admin → Pricing)
1. Select the app → existing plans list.
2. **New plan**: name, price, interval, refund, active flag + feature checkboxes from the app's master list.
3. No plans = **free forever**: store shows Free badge, payment form hides, direct download.

## 6. Publish (App editor → Publish)
- Draft → **Publish** → live in `/apps` with toast + **View in store** link. **Unpublish** reverts to draft anytime.
- After publish: verify store page, download per platform, tutorial, feedback form.

## 7. API keys (Admin → Settings → Project integrations → API keys)
- Name is required. Secret shows once at creation; later reveal via **Show key** (admin only).
- **Revoke** disables (row kept); **Delete** removes permanently (confirm first).
- Leaked key? Revoke immediately and generate a new one.

## 8. Developer integration (for app developers)
- Give them the **PDF guide** (`/docs` → PDF guide): API key header, `POST /api/feedback` contract, tutorial caching, endpoint reference.
- Desktop apps queue reports locally and retry — never block the app on Nexus downtime.

## 9. Feedback loop (app <-> Nexus)
- **App → Nexus:** desktop posts `POST /api/feedback` (`bug_report | suggestion | feature_request | rating`). Queue locally, retry on non-201.
- **Nexus → App:** admin replies at `/admin/feedbacks` (`adminReply`, status `replied`/`resolved`/`ignored`). App polls `GET /api/feedback` (on Help screen open, not on a timer) and renders `adminReply` + `status` to the user.
- Payload includes `link`, `contactEmail`, `rating`, `screenshot` — all optional, all visible to admins.
