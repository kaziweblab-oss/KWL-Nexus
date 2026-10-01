# KWL-NEXUS Production Deployment

This guide deploys `kwl-nexus-store` to Vercel with MongoDB Atlas, Google/GitHub OAuth, the daily subscription cron, and manual payment settings.

## Before You Deploy

- [ ] Push this repository to GitHub.
- [ ] Confirm the production MongoDB Atlas database user and password.
- [ ] Confirm the Atlas database user has access to the production database.
- [ ] Create production Google and GitHub OAuth callback URLs.
- [ ] Generate new production-only secrets. Do not reuse local values.
- [ ] Decide the production admin email address or addresses.
- [ ] Confirm the bKash, Nagad, and Rocket payment numbers.

## Vercel Project

### Dashboard flow

1. Open [Vercel](https://vercel.com) and select **Add New > Project**.
2. Import the GitHub repository containing `kwl-nexus-store`.
3. Keep the framework preset as **Next.js**.
4. Use the default build command, `npm run build`.
5. Use the default output directory and install command, `npm install`.
6. Add the environment variables below for **Production**, and add Preview values separately when needed.
7. Deploy and wait for the build to finish.

### CLI flow (optional)

```bash
npm install -g vercel
vercel login
vercel link
vercel env add MONGODB_URI production
vercel env add NEXTAUTH_URL production
vercel env add NEXTAUTH_SECRET production
vercel env add GOOGLE_CLIENT_ID production
vercel env add GOOGLE_CLIENT_SECRET production
vercel env add GITHUB_CLIENT_ID production
vercel env add GITHUB_CLIENT_SECRET production
vercel env add GITHUB_WEBHOOK_SECRET production
vercel env add CRON_SECRET production
vercel env add ADMIN_EMAILS production
vercel --prod
```

## Production Environment Variables

Set these in Vercel Project Settings > Environment Variables. The values below are names only; never commit the real values.

```env
MONGODB_URI=mongodb+srv://<production-user>:<url-encoded-password>@<cluster>/<database>?retryWrites=true&w=majority
NEXTAUTH_URL=https://<vercel-or-custom-domain>
NEXTAUTH_SECRET=<long-random-production-secret>
GOOGLE_CLIENT_ID=<production-google-client-id>
GOOGLE_CLIENT_SECRET=<production-google-client-secret>
GITHUB_CLIENT_ID=<production-github-client-id>
GITHUB_CLIENT_SECRET=<production-github-client-secret>
GITHUB_WEBHOOK_SECRET=<long-random-webhook-secret>
CRON_SECRET=<long-random-cron-secret>
ADMIN_EMAILS=<admin-email>[,<second-admin-email>]
```

`MONGODB_URI` passwords containing `@`, `:`, `/`, `?`, or `#` must be URL-encoded. A `bad auth` error means the Atlas username/password, database access, or encoded connection string needs correction.

## OAuth Callback URLs

Replace `<production-domain>` with the final Vercel URL or custom domain.

Google OAuth authorized redirect URI:

```text
https://<production-domain>/api/auth/callback/google
```

GitHub OAuth callback URL:

```text
https://<production-domain>/api/auth/callback/github
```

Keep local callback URLs in the development OAuth app/configuration when possible. Do not replace local values until production has been verified.

## MongoDB Atlas

1. Create or select the production Atlas cluster.
2. Create a dedicated database user with the minimum required permissions.
3. Create a production database, for example `kwl-nexus-store-production`.
4. Copy the driver connection string and set it as `MONGODB_URI` in Vercel.
5. In **Network Access**, allow Vercel to connect. Vercel serverless functions do not have one permanent outbound IP; use the Atlas/Vercel integration or the documented Vercel egress option when available. The broad `0.0.0.0/0` allow rule is a fallback and must be protected by strong credentials and least-privilege database access.
6. Verify the Atlas user has read/write access to the selected database.

## GitHub Webhook

After the production URL is live, add a webhook to the GitHub repository:

- Payload URL: `https://<production-domain>/api/webhooks/github`
- Content type: `application/json`
- Secret: same value as `GITHUB_WEBHOOK_SECRET`
- Events: select **Let me select individual events**, then enable **Releases**
- Active: enabled

The endpoint validates `x-hub-signature-256` and stores published/created release assets.

## Vercel Cron

`vercel.json` schedules two crons:

- `/api/cron/subscriptions` at `0 0 * * *` (daily at 00:00 UTC) — subscription expiry.
- `/api/cron/payment-health` at `*/5 * * * *` (every 5 minutes) — gateway health: `enabled:true` (5min) + `FAILED` recovery (hourly), threshold 2 failures (INVALID_CREDENTIALS immediate), auto-disable + notification.

Both require:

```text
Authorization: Bearer <CRON_SECRET>
```

Vercel Cron automatically sends the configured cron request in production. Confirm the first invocation in the Vercel deployment logs.

## Keep-Alive Endpoint (Render/Vercel Cold Start)

Free lightweight endpoint to keep backend active — no auth, no DB, no cost:

```text
GET https://<production-domain>/api/health
GET https://<production-domain>/api/ping
HEAD https://<production-domain>/api/health
```

Returns `{ status: "ok", timestamp: "..." }` with `Cache-Control: no-store`. For Render free tier, add external cron (UptimeRobot/cron-job.org) hitting `/api/health` every 5-10 minutes to prevent cold start. Also used by `vercel.json` health checks.

## Branding Management

- New page `/admin/branding` (system super-admin) — light & dark separate uploads for **Logo** (`brandLogoLight` / `brandLogoDark`) and **Banner** (`brandBannerLight` / `brandBannerDark`) + colors `primary/secondary/accent`. Stored in `SystemConfig` (fields `brandLogoLight/Dark`, `brandBannerLight/Dark`, `brandFavicon`, `brandAppIcon`, `ogImage`), served via `GET /api/system-config` (public) and `PUT /api/admin/system-config` (admin, zod validated). `BrandThemeProvider` applies `CSS vars --brand-primary/secondary/ink` + live favicon/og update via `branding-updated` event.
- Settings page shows card `Branding` → `Manage branding` (like Payment Methods / Tutorial Video) linking to `/admin/branding`.
- Control panel (`/admin`) quick action `Branding` added.
- `BrandLogo` component now respects `brandLogoLight/Dark` per `next-themes` `resolvedTheme`, fallback to static `/branding/logos/*` and `/branding/icons/*`.

## Admin and Payment Setup

After the first successful deployment:

1. Sign in with the Google account listed in `ADMIN_EMAILS`.
2. Open `/admin/branding` — upload Light/Dark logos & banners, set primary/secondary/accent colors, Save (live via `BrandThemeProvider`).
3. Open `/admin/settings` — manage integrations, tutorial video, and payment methods via cards.
4. Open `/admin/guidelines` — edit update guidelines (`PUT /api/admin/update-guidelines`).
5. Open `/admin/admins` — add/remove admins, toggle superadmin (system-managed, cannot modify own or env `ADMIN_EMAILS`).
6. Generate an API key and store the plaintext in a secure password manager. It is shown only once.
7. Open `/admin/payments` and verify that admin access works (manual bKash/Nagad/Rocket auto `ACTIVE/HEALTHY`, gateway `stripe/sslcommerz` requires health check).
8. Create or import the production app and plans before accepting payments.

## Production Workflows

### Adding a new app

1. Open `/admin/apps` and click **Add from GitHub** (requires GitHub OAuth on the admin account).
2. Browse/select the repository (private repos are listed when a PAT is configured in `/admin/settings/github`). Import creates an `App` draft in MongoDB.
3. Fill in name, slug, description, category, pricing, published flag, and download URLs.
4. Add plans under the app (name, price, interval, duration days, refund policy). Plans are stored in the `Plans` collection and drive the `/apps/[id]` marketplace and payment flow.
5. Optional: set preview image/video, screenshots, and tutorial via the app editor.
6. Set **Published** = on. It will now appear in `/apps` search (via `/api/apps/popular` and `/api/apps/new-releases`).

### Activation flow (payment → active subscription)

1. A user signs in, opens an app, and submits a payment request on `/apps/[id]` (or `/payment`). This creates a `Payment` with status `pending` and a user notification.
2. The user is shown a pending state on the download page (`⏳ Subscription pending`) until approved.
3. Admin opens `/admin/payments`, reviews the request, and clicks **Verify** (activates) or **Reject** (with an optional reason).
4. On Verify, the API atomically creates an `active` `Subscription` (with start/end dates from the plan interval), flips the payment to `succeeded`, and sends the user an "Payment approved" notification.
5. On Reject, the API flips the payment to `failed`, stores the note, and sends a "Payment rejected" notification with the reason.
6. The user sees the new subscription in `/my-orders` and the dashboard; the app becomes downloadable via `/api/download/[appId]` (requires an active, unexpired subscription).
7. The daily cron (`/api/cron/subscriptions`, `0 0 * * *`) expires subscriptions past their end date.

### Mock-data note

Dummy catalog data (`lib/data/apps`) is suppressed in production via `process.env.NODE_ENV === "production"` guards on the popular, new-releases, download, and payment routes. Real production data must come from the MongoDB `Apps`, `Plans`, `Subscriptions`, and `Payments` collections. Admin app management reads real apps from `/api/admin/apps`.

## Smoke Test Checklist

- [ ] `https://<production-domain>/` loads.
- [ ] `/apps` search, category filter, and pagination work.
- [ ] `/apps/focus-flow` loads and payment instructions appear.
- [ ] Google sign-in and sign-out work.
- [ ] GitHub sign-in works for the admin account.
- [ ] `/admin` rejects unauthenticated and non-admin users.
- [ ] `/admin/apps/new` lists GitHub repositories for a GitHub-authorized admin.
- [ ] `/docs` and `/docs/console` load.
- [ ] `/api/docs/openapi`, `/api/docs/postman`, and `/api/docs/pdf` download.
- [ ] A valid `x-api-key` can call `GET /api/apps`.
- [ ] An invalid API key returns `401`.
- [ ] Payment request validation rejects incomplete input.
- [ ] Feedback submission and admin moderation work.
- [ ] GitHub release webhook returns a successful response with a valid signature.
- [ ] Vercel Cron invocation appears in deployment logs.
- [ ] Atlas data is created in the intended production database.
- [ ] Security response headers are present: `nosniff`, frame deny, referrer policy, and permissions policy.

## Custom Domain (Optional)

1. In Vercel Project Settings > Domains, add `example.com` and optionally `www.example.com`.
2. Copy the exact DNS records Vercel displays.
3. At the domain registrar, add the requested `A`, `AAAA`, or `CNAME` records. Do not guess these values.
4. Wait for DNS propagation and TLS certificate issuance.
5. Update `NEXTAUTH_URL` to `https://example.com`.
6. Add the custom-domain Google and GitHub callback URLs.
7. Update the GitHub webhook Payload URL.
8. Redeploy after environment changes.

## Rollback

- Use Vercel Deployments to promote the last known-good deployment.
- Do not roll back MongoDB migrations or delete production data automatically.
- Revert environment variable changes separately from code changes.
- Check OAuth callback URLs and webhook delivery after a rollback.

## Security Notes

- Never commit `.env.local`, production secrets, API plaintext keys, or database credentials.
- Use separate OAuth apps, database users, and secrets for local, preview, and production environments.
- Rotate `NEXTAUTH_SECRET`, GitHub webhook secret, cron secret, and API keys if exposed.
- Review `npm audit` results before deployment. The current audit includes a critical `next-auth` advisory and high-severity Next.js/PostCSS advisories; upgrade deliberately and run the full test/build suite after upgrades.
- Run Lighthouse against the deployed URL and record mobile and desktop results before launch.
