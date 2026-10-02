# Decision Log

- **P0-first, then architecture**: production/security blockers (PWA cache, idempotency, auth) before features.
- **Release stays the version history source**; `App.latestVersion` is a denormalized pointer; `AppVersion` manual snapshots kept (rollback + old downloads depend on them).
- **Order and Entitlement are first-class models**; Payment is money-only. Verify/reject/refund transition all three; legacy Subscription rows remain as a download fallback.
- **No auto-publish from webhooks**: tags sync as drafts of history; admin promotes to latest manually.
- **Manual payments only** (bKash/Nagad/Rocket); no gateway rebuild, no email provider, no Redis.
- **Single admin model** (`user`/`admin`/`superadmin` + `ADMIN_EMAILS` bootstrap); one `isAdmin()` gate everywhere.
- **GitHub assets are the CDN**; Nexus serves metadata/authz/entitlement, never proxies binaries.
- **OTP hashed at rest** (SHA-256); old plaintext rows expire via TTL, no migration.
- **Single-root Next.js on Vercel + Atlas**; preview envs use separate databases.
- **Vercel Cron cannot send auth headers** → cron routes accept `?secret=` in addition to Bearer.
- **Additive + idempotent**: backfill missing Order/Entitlement rows on verify; re-runs never duplicate.
