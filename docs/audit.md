# KWL NEXUS — VERCEL DEPLOYMENT MASTER AUDIT

**Project:** `kwl-nexus-store`
**Local Path:** `C:\Users\Khairul Islam\Desktop\KWL NEXUS`
**Framework:** Next.js 14.2.35
**Architecture:** Single Next.js App Router application
**Package Manager:** npm
**Deployment Target:** Vercel
**Database:** MongoDB Atlas
**Authentication:** NextAuth.js
**Audit Mode:** Read-only
**Audit Status:** READY WITH FIXES

---

# 1. EXECUTIVE SUMMARY

KWL NEXUS is a **single root-level Next.js application**.

It is **NOT a monorepo**.

There is no:

```text
apps/web/
```

The important application files exist directly at repository root:

```text
KWL NEXUS/
├── app/
├── components/
├── lib/
├── models/
├── public/
├── package.json
├── package-lock.json
├── next.config.js
├── next.config.*
├── tsconfig.json
├── middleware.ts
└── vercel.json
```

Therefore:

> **Vercel Root Directory MUST remain empty/default.**

Do **NOT** set:

```text
apps/web
```

Doing so will make Vercel search for:

```text
apps/web/package.json
```

which does not exist.

---

# 2. FINAL VERCEL SETTINGS

Use exactly these settings.

| Vercel Setting      | Value               |
| ------------------- | ------------------- |
| Project Name        | `kwl-nexus-store`   |
| Framework Preset    | `Next.js`           |
| Root Directory      | **EMPTY / DEFAULT** |
| Build Command       | **DEFAULT**         |
| Install Command     | **DEFAULT**         |
| Development Command | **DEFAULT**         |
| Output Directory    | **DEFAULT**         |
| Node.js Version     | `20.x`              |
| Package Manager     | `npm`               |

### Most important setting

```text
Root Directory:
[ EMPTY ]
```

Do NOT use:

```text
apps/web
```

Do NOT use:

```text
.
```

if the Vercel UI already represents the repository root with an empty Root Directory field.

---

# 3. WHY ROOT DIRECTORY MUST BE EMPTY

The application package is:

```text
package.json
```

at repository root.

The Next.js configuration is:

```text
next.config.js
```

at repository root.

The App Router is:

```text
app/
```

at repository root.

TypeScript configuration:

```text
tsconfig.json
```

at repository root.

Vercel configuration:

```text
vercel.json
```

at repository root.

Therefore Vercel must build the repository root.

### Correct

```text
Repository Root
    ↓
package.json
    ↓
next build
```

### Incorrect

```text
Repository Root
    ↓
apps/web
    ↓
package.json not found
    ↓
No Next.js version detected
```

---

# 4. BUILD CONFIGURATION

The project's `package.json` contains:

```text
dev    → next dev
build  → next build
start  → next start
lint   → next lint
test   → jest --runInBand
```

Therefore Vercel does not need a custom build command.

### Recommended

Leave Build Command empty/default.

Vercel should automatically execute the equivalent of:

```bash
npm run build
```

### Install

Leave Install Command empty/default.

Vercel should detect:

```text
package-lock.json
```

and use npm.

### Output

Leave Output Directory empty/default.

Next.js generates:

```text
.next/
```

automatically.

Do NOT configure:

```text
dist
build
out
```

---

# 5. NODE.JS VERSION

Project configuration specifies:

```json
"engines": {
  "node": "20.x"
}
```

Therefore:

```text
Vercel Node.js → 20.x
```

is the correct deployment runtime.

This matches the project's Next.js and native dependency requirements.

---

# 6. ENVIRONMENT VARIABLES

The application uses server-side environment variables.

## 6.1 REQUIRED PRODUCTION VARIABLES

These are the minimum variables required for a functional production deployment:

```text
MONGODB_URI
NEXTAUTH_SECRET
NEXTAUTH_URL
ADMIN_EMAILS
CRON_SECRET
```

These should be configured in:

```text
Vercel
→ Project
→ Settings
→ Environment Variables
→ Production
```

---

# 7. ENVIRONMENT VARIABLE DETAILS

## 7.1 MONGODB_URI

### Required

```text
MONGODB_URI
```

Purpose:

```text
MongoDB Atlas connection
```

Used by:

```text
lib/db/connect.ts
```

Without it:

```text
Database connection fails
↓
API routes using MongoDB return 500
↓
Authentication/database features fail
```

Example format:

```text
mongodb+srv://USERNAME:PASSWORD@CLUSTER/DATABASE?retryWrites=true&w=majority
```

Never expose this value to the browser.

Never use:

```text
NEXT_PUBLIC_MONGODB_URI
```

---

# 8. MONGODB ATLAS NETWORK ACCESS

Adding `MONGODB_URI` to Vercel is not enough.

MongoDB Atlas must also allow the Vercel deployment to connect.

Check:

```text
MongoDB Atlas
→ Network Access
```

The Atlas configuration must permit connections originating from the deployment environment.

Recommended approach:

1. Prefer an appropriate Atlas/Vercel integration or current Vercel/Atlas networking setup.
2. If using an IP allowlist fallback, configure it carefully.
3. If `0.0.0.0/0` is used, protect the database with a strong unique password and least-privilege database user.

Without Atlas network access:

```text
Vercel
   ↓
MongoDB connection attempt
   ↓
timeout
   ↓
MongooseServerSelectionError
   ↓
API 500
```

---

# 9. NEXTAUTH CONFIGURATION

Required:

```text
NEXTAUTH_SECRET
NEXTAUTH_URL
```

## NEXTAUTH_SECRET

Used for:

* JWT/session signing
* authentication security
* token-related operations
* encrypted application values that depend on the same secret

Production value must be a strong random secret.

Never commit it to GitHub.

Never expose it as `NEXT_PUBLIC_*`.

---

## NEXTAUTH_URL

Production value should be:

```text
https://YOUR-PRODUCTION-DOMAIN
```

For example:

```text
https://kwl-nexus.vercel.app
```

Do not use:

```text
http://localhost:3000
```

for Production.

---

# 10. ADMIN_EMAILS

Required:

```text
ADMIN_EMAILS
```

Purpose:

```text
Defines the initial/authorized administrator email addresses.
```

Example format:

```text
admin@example.com,owner@example.com
```

The application uses this to determine administrative access and can promote the configured admin account appropriately.

If this variable is missing:

```text
Normal login may work
BUT
/admin access may fail
```

Therefore configure it before production use.

---

# 11. CRON_SECRET

Required for the application's protected cron endpoints:

```text
CRON_SECRET
```

Used by:

```text
/api/cron/subscriptions
/api/cron/payment-health
```

The application verifies the expected authorization secret before executing cron work.

If the secret is missing or mismatched:

```text
Cron request
   ↓
401 Unauthorized
```

Therefore configure:

```text
CRON_SECRET
```

in Production.

---

# 12. OPTIONAL OAUTH VARIABLES

OAuth is controlled through environment variables.

It is NOT configured entirely from the admin panel.

---

## Google OAuth

If Google login is enabled, add:

```text
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
```

Production callback:

```text
https://YOUR-DOMAIN/api/auth/callback/google
```

This callback must also be configured in Google Cloud Console.

---

## GitHub OAuth

If GitHub login is enabled:

```text
GITHUB_CLIENT_ID
GITHUB_CLIENT_SECRET
```

Callback:

```text
https://YOUR-DOMAIN/api/auth/callback/github
```

---

## Facebook OAuth

The code supports:

```text
FACEBOOK_CLIENT_ID
FACEBOOK_CLIENT_SECRET
```

These are optional.

Do not add them unless Facebook authentication is actually required.

---

# 13. OPTIONAL GITHUB VARIABLES

## GITHUB_WEBHOOK_SECRET

Required if GitHub release webhooks are being used.

Endpoint:

```text
POST /api/webhooks/github
```

Purpose:

```text
Verify GitHub webhook authenticity.
```

Production webhook URL:

```text
https://YOUR-DOMAIN/api/webhooks/github
```

---

## GITHUB_TOKEN

Optional.

Purpose:

```text
Private GitHub repository access / GitHub API operations
```

The application can use a database-managed GitHub token through `SystemConfig`.

Therefore:

```text
GITHUB_TOKEN
```

is a fallback/optional environment variable, not a mandatory deployment variable.

---

# 14. COMPLETE ENVIRONMENT MATRIX

| Variable                 |    Required |        Production | Purpose                        |
| ------------------------ | ----------: | ----------------: | ------------------------------ |
| `MONGODB_URI`            |         YES |               YES | MongoDB Atlas                  |
| `NEXTAUTH_SECRET`        |         YES |               YES | Auth/JWT/security              |
| `NEXTAUTH_URL`           |         YES |               YES | Production auth URL            |
| `ADMIN_EMAILS`           |         YES |               YES | Admin access                   |
| `CRON_SECRET`            |         YES |               YES | Cron authentication            |
| `GOOGLE_CLIENT_ID`       |    Optional |   If Google login | Google OAuth                   |
| `GOOGLE_CLIENT_SECRET`   |    Optional |   If Google login | Google OAuth                   |
| `GITHUB_CLIENT_ID`       |    Optional |   If GitHub login | GitHub OAuth                   |
| `GITHUB_CLIENT_SECRET`   |    Optional |   If GitHub login | GitHub OAuth                   |
| `FACEBOOK_CLIENT_ID`     |    Optional | If Facebook login | Facebook OAuth                 |
| `FACEBOOK_CLIENT_SECRET` |    Optional | If Facebook login | Facebook OAuth                 |
| `GITHUB_WEBHOOK_SECRET`  | Conditional |   If webhook used | GitHub webhook security        |
| `GITHUB_TOKEN`           |    Optional |       If required | GitHub API/private repo access |

---

# 15. VARIABLES THAT SHOULD NOT BE ADDED

The following are NOT currently application environment requirements:

```text
STRIPE_SECRET
STRIPE_PUBLISHABLE_KEY
SSL_COMMERZ_*
PAYPAL_*
RESEND_API_KEY
SMTP_*
REDIS_URL
JWT_SECRET
API_KEY
```

Do not add variables simply because those technologies exist in the application/UI.

The audit found that payment gateway credentials are managed through the application's database/admin system rather than Vercel environment variables.

---

# 16. DATABASE-MANAGED CONFIGURATION

The application manages several settings through MongoDB/admin UI.

These should NOT be duplicated as Vercel environment variables.

Examples:

```text
Brand name
Brand logo
Light logo
Dark logo
Banner
Favicon
Brand icon
Primary color
Payment methods
bKash number
Nagad number
Rocket number
Payment instructions
Gateway configuration
GitHub default owner
GitHub default repository
Tutorial video configuration
Contact information
Social links
Update guidelines
Developer API keys
```

These are application data.

Therefore:

```text
Vercel ENV
    =
Infrastructure / runtime secrets

MongoDB
    =
Application configuration/data
```

This separation should be preserved.

---

# 17. PAYMENT SYSTEM

Payment configuration is primarily application-managed.

Supported configuration includes:

```text
Manual payment
bKash
Nagad
Rocket
Stripe
SSLCommerz
PayPal
Custom gateway
```

Gateway credentials are stored in the `PaymentMethod` configuration and protected server-side.

The public payment-method API intentionally excludes sensitive gateway configuration.

Therefore:

```text
Payment gateway credentials
→ DO NOT duplicate in Vercel
→ Configure through Admin
```

---

# 18. CLIENT-SIDE SECRET AUDIT

The project has:

```text
NEXT_PUBLIC_* usage = 0
```

No sensitive production secret was found being intentionally exposed through:

```text
NEXT_PUBLIC_*
```

Sensitive payment gateway configuration is also excluded from public API responses.

This is a good security property.

Maintain this rule:

```text
Secrets
→ Server only

Public configuration
→ Client allowed
```

Never move:

```text
MONGODB_URI
NEXTAUTH_SECRET
GOOGLE_CLIENT_SECRET
GITHUB_CLIENT_SECRET
GITHUB_TOKEN
CRON_SECRET
gateway credentials
```

into `NEXT_PUBLIC_*`.

---

# 19. API / SERVERLESS COMPATIBILITY

The application uses:

```text
Next.js App Router
Node.js API routes
Mongoose
MongoDB
fetch
```

The API routes are compatible with Vercel's Node.js runtime.

The project does NOT require Edge runtime for its database routes.

This is important because:

```text
Mongoose
```

should remain in Node.js server execution rather than Edge runtime.

---

# 20. MONGOOSE SERVERLESS CONNECTION

The database connection implementation uses a global cache.

Conceptually:

```text
First invocation
    ↓
Create MongoDB connection
    ↓
Cache connection

Later warm invocation
    ↓
Reuse cached connection
```

This is appropriate for serverless environments and reduces unnecessary connection creation.

Configured pool sizing is conservative.

---

# 21. VERCEL CRONS

Current cron configuration:

```json
{
  "crons": [
    {
      "path": "/api/cron/subscriptions",
      "schedule": "0 0 * * *"
    },
    {
      "path": "/api/cron/payment-health",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

### Cron 1

```text
/api/cron/subscriptions
```

Schedule:

```text
Daily at 00:00 UTC
```

Purpose:

```text
Subscription maintenance/expiration processing
```

### Cron 2

```text
/api/cron/payment-health
```

Schedule:

```text
Every 5 minutes
```

Purpose:

```text
Payment provider health checks
```

The payment-health route has a longer execution allowance configured.

---

# 22. GITHUB WEBHOOK

Endpoint:

```text
POST /api/webhooks/github
```

Purpose:

```text
Receive GitHub release events
```

Production URL:

```text
https://YOUR-DOMAIN/api/webhooks/github
```

If this feature is enabled, configure:

```text
GITHUB_WEBHOOK_SECRET
```

and use the same secret in GitHub webhook configuration.

Do not use localhost for the production webhook.

---

# 23. MIDDLEWARE

The project contains:

```text
middleware.ts
```

It uses:

```text
next-auth/jwt
NextRequest
NextResponse
```

The middleware does not directly connect to MongoDB.

This is important because middleware execution is separate from normal Node.js API routes.

The current architecture is therefore appropriate:

```text
Middleware
→ JWT/token checks

API routes
→ MongoDB/Mongoose
```

No major middleware change is required for Vercel.

---

# 24. LOCALHOST AUDIT

No production-critical hardcoded:

```text
http://localhost:3000
127.0.0.1
```

configuration was found in the main application paths.

Development-only logic based on:

```text
NODE_ENV
```

is not considered a production localhost dependency.

Therefore there is no known localhost-based deployment blocker.

---

# 25. PWA

The project uses:

```text
next-pwa
```

PWA behavior is configured through:

```text
next.config.js
```

Development behavior is disabled appropriately while production behavior can generate the service worker.

Ensure required static assets under:

```text
public/
```

remain part of the repository/deployment.

---

# 26. KNOWN WARNINGS

These are not necessarily deployment blockers.

### Warning 1 — OAuth

If Google/GitHub OAuth environment variables are missing:

```text
The application can still deploy,
but that OAuth provider will not work.
```

---

### Warning 2 — GitHub Webhook

If release webhooks are required:

```text
GITHUB_WEBHOOK_SECRET
```

should be configured.

---

### Warning 3 — Cron workload

`payment-health` performs external gateway health checks.

If the number of configured gateways becomes large, execution time should be monitored.

The route already has a longer duration configuration, but production logs should still be monitored.

---

### Warning 4 — Preview database

Do not automatically point every Preview deployment at the production database if destructive/admin testing will occur.

Recommended architecture:

```text
Production
→ Production MongoDB database

Preview
→ Separate preview/staging database
```

if practical.

---

# 27. LOCAL VALIDATION BEFORE DEPLOYMENT

Run from:

```text
C:\Users\Khairul Islam\Desktop\KWL NEXUS
```

### Step 1 — Install dependencies

```powershell
npm install
```

### Step 2 — TypeScript

```powershell
npx tsc --noEmit
```

Expected:

```text
0 errors
```

### Step 3 — Lint

```powershell
npm run lint
```

Warnings may be acceptable if there are no build-blocking errors.

### Step 4 — Tests

```powershell
npm test
```

Review failures individually.

### Step 5 — Production build

```powershell
npm run build
```

This is the most important local deployment check.

Expected:

```text
Compiled successfully
```

### Step 6 — Production server

After a successful build:

```powershell
npm run start
```

Then test:

```text
/api/health
/api/ping
/login
/dashboard
/admin
```

and any enabled OAuth/payment functionality.

---

# 28. DEPLOYMENT ORDER

Follow this exact order.

## STEP 1

Push the current project to GitHub.

Repository root must contain:

```text
package.json
next.config.js
app/
lib/
models/
public/
vercel.json
```

---

## STEP 2

Import the repository into Vercel.

---

## STEP 3

Configure:

```text
Framework:
Next.js
```

---

## STEP 4

Configure Root Directory:

```text
EMPTY / DEFAULT
```

This is critical.

---

## STEP 5

Leave these as defaults:

```text
Build Command
Install Command
Development Command
Output Directory
```

---

## STEP 6

Confirm Node:

```text
20.x
```

---

## STEP 7

Add Production environment variables:

```text
MONGODB_URI
NEXTAUTH_SECRET
NEXTAUTH_URL
ADMIN_EMAILS
CRON_SECRET
```

---

## STEP 8

Add OAuth variables only if those providers are enabled:

```text
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET

GITHUB_CLIENT_ID
GITHUB_CLIENT_SECRET

FACEBOOK_CLIENT_ID
FACEBOOK_CLIENT_SECRET
```

---

## STEP 9

If GitHub webhook is enabled:

```text
GITHUB_WEBHOOK_SECRET
```

---

## STEP 10

Configure MongoDB Atlas network access.

---

## STEP 11

Deploy.

---

# 29. POST-DEPLOYMENT TEST CHECKLIST

After deployment, verify:

### Basic

```text
[ ] Homepage loads
[ ] HTTPS works
[ ] Static assets load
[ ] Light theme works
[ ] Dark theme works
[ ] Mobile layout works
```

### Database

```text
[ ] /api/health works
[ ] MongoDB connection works
[ ] User registration/login works
[ ] Dashboard loads
```

### Authentication

```text
[ ] Login works
[ ] Session persists
[ ] Admin account recognized
[ ] /admin protected correctly
[ ] Unauthorized users cannot access admin
```

### OAuth

If enabled:

```text
[ ] Google login works
[ ] GitHub login works
[ ] Callback URL works
```

### Admin

```text
[ ] Admin dashboard works
[ ] Branding settings work
[ ] Payment methods work
[ ] Contact settings work
[ ] Guidelines work
[ ] GitHub settings work
```

### Payment

```text
[ ] Payment methods appear
[ ] Manual payment flow works
[ ] Transaction submission works
[ ] Gateway configuration remains server-only
```

### Cron

```text
[ ] Subscription cron returns successful response
[ ] Payment-health cron executes
[ ] Unauthorized direct cron request is rejected
```

### GitHub webhook

If enabled:

```text
[ ] GitHub can reach webhook
[ ] Signature verification works
[ ] Release event is processed
```

---

# 30. DEPLOYMENT BLOCKERS

## 🔴 BLOCKER 1 — Wrong Root Directory

If Vercel currently contains:

```text
apps/web
```

REMOVE IT.

Correct:

```text
Root Directory = EMPTY
```

---

## 🔴 BLOCKER 2 — Missing MONGODB_URI

Fix:

```text
Vercel Environment Variables
→ MONGODB_URI
```

---

## 🔴 BLOCKER 3 — Missing NEXTAUTH_SECRET

Fix:

```text
Vercel Environment Variables
→ NEXTAUTH_SECRET
```

---

## 🔴 BLOCKER 4 — Wrong NEXTAUTH_URL

Production must use:

```text
https://YOUR-PRODUCTION-DOMAIN
```

Never:

```text
http://localhost:3000
```

---

## 🔴 BLOCKER 5 — Missing ADMIN_EMAILS

Add the intended production administrator email(s).

---

## 🔴 BLOCKER 6 — Missing CRON_SECRET

Add:

```text
CRON_SECRET
```

before relying on the scheduled jobs.

---

## 🔴 BLOCKER 7 — MongoDB Atlas Network Access

Vercel must be able to reach MongoDB Atlas.

---

# 31. FINAL VERCEL CONFIGURATION

Use this as the deployment reference:

```text
PROJECT
--------------------------------
Name:
kwl-nexus-store

Framework:
Next.js

Root Directory:
EMPTY

Build Command:
DEFAULT

Install Command:
DEFAULT

Development Command:
DEFAULT

Output Directory:
DEFAULT

Node.js:
20.x

Package Manager:
npm
```

---

# 32. FINAL PRODUCTION ENV

## Required

```text
MONGODB_URI
NEXTAUTH_SECRET
NEXTAUTH_URL
ADMIN_EMAILS
CRON_SECRET
```

## Google Login

```text
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
```

## GitHub Login

```text
GITHUB_CLIENT_ID
GITHUB_CLIENT_SECRET
```

## Facebook Login

```text
FACEBOOK_CLIENT_ID
FACEBOOK_CLIENT_SECRET
```

## GitHub Release Webhook

```text
GITHUB_WEBHOOK_SECRET
```

## Optional GitHub API fallback

```text
GITHUB_TOKEN
```

---

# 33. WHAT NOT TO CHANGE

Do NOT unnecessarily change:

```text
next.config.js
middleware.ts
lib/db/connect.ts
lib/auth/auth.ts
vercel.json
```

Do NOT convert the project into:

```text
apps/web
```

Do NOT introduce:

```text
NEXT_PUBLIC_MONGODB_URI
NEXT_PUBLIC_NEXTAUTH_SECRET
NEXT_PUBLIC_*_SECRET
```

Do NOT duplicate database-managed payment/branding configuration into Vercel.

---

# 34. FINAL VERDICT

## 🟢 DEPLOYMENT STATUS

```text
READY WITH FIXES
```

The application architecture is compatible with Vercel.

### Code status

```text
Next.js app                 ✓
App Router                  ✓
Node.js API routes          ✓
MongoDB/Mongoose            ✓
Serverless DB caching       ✓
NextAuth                    ✓
Middleware                  ✓
Vercel Cron                 ✓
GitHub Webhook              ✓
PWA                         ✓
No NEXT_PUBLIC secrets     ✓
No production localhost    ✓
```

### Before deployment

Complete these items:

```text
1. Vercel Root Directory → EMPTY

2. Add:
   MONGODB_URI
   NEXTAUTH_SECRET
   NEXTAUTH_URL
   ADMIN_EMAILS
   CRON_SECRET

3. Configure MongoDB Atlas Network Access

4. Configure OAuth variables if OAuth is required

5. Configure GitHub webhook secret if webhook is required

6. Run:
   npm install
   npx tsc --noEmit
   npm run lint
   npm test
   npm run build
```

---

# 35. ONE-PAGE DEPLOYMENT CHECKLIST

```text
KWL NEXUS — VERCEL GO-LIVE CHECKLIST
=====================================

ARCHITECTURE
[✓] Single Next.js application
[✓] Repository root is application root
[✓] No apps/web directory

VERCEL
[ ] Framework = Next.js
[ ] Root Directory = EMPTY
[ ] Build Command = DEFAULT
[ ] Install Command = DEFAULT
[ ] Output Directory = DEFAULT
[ ] Node.js = 20.x

ENV
[ ] MONGODB_URI
[ ] NEXTAUTH_SECRET
[ ] NEXTAUTH_URL
[ ] ADMIN_EMAILS
[ ] CRON_SECRET

OPTIONAL
[ ] Google OAuth
[ ] GitHub OAuth
[ ] Facebook OAuth
[ ] GitHub Webhook
[ ] GITHUB_TOKEN

DATABASE
[ ] MongoDB Atlas cluster active
[ ] Database user active
[ ] Network access configured
[ ] Connection string verified

LOCAL
[ ] npm install
[ ] tsc passes
[ ] lint passes
[ ] tests reviewed
[ ] npm run build passes

DEPLOYMENT
[ ] GitHub repository connected
[ ] Vercel deployment successful
[ ] Homepage tested
[ ] Login tested
[ ] Admin tested
[ ] Database tested
[ ] Cron tested
[ ] OAuth tested if enabled
[ ] Webhook tested if enabled

FINAL STATUS
READY FOR PRODUCTION
```

# END OF AUDIT
