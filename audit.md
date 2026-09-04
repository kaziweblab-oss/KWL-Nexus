# KWL-NEXUS — PAYMENT GATEWAY HEALTH & CONTINUOUS MONITORING — STRICT READ-ONLY AUDIT
**Date:** 2026-09-04
**Auditor:** Senior Software Architect / Payment Infrastructure / Distributed Systems / Security / Reliability — KWL-NEXUS
**Mode:** STRICT READ-ONLY — No file was modified, created, deleted, refactored, or redesigned during inspection. No dependencies installed. No code generated. This file is the audit output only, created after inspection per explicit user instruction to replace old audit file data.
**Scope:** Real Payment Gateway Health Checks + Continuous Monitoring + Auto-disable + Realtime Admin UI + Safe Activation (Business Requirements 1-16)
**Workspace:** `C:\Users\Khairul Islam\Desktop\KWL NEXUS` — Next.js 14.2.35, Mongoose 9, NextAuth 4, Vercel

> **Locked Business Requirement Flow (audited against):**
> `Created → NOT_CHECKED (enabled=false, toggle disabled) → CHECKING → SUCCESS→ACTIVE (toggle enabled, admin manually enables) | FAILED→enabled=false toggle disabled → Continuous: ACTIVE+enabled → periodic backend check → Healthy remain ACTIVE | FAILED→enabled=false + realtime event + notification → FAILED→ periodic check → ACTIVE (enabled remains false, admin must manually enable) — recovered gateway NEVER auto-enables.`

---

## 1. Current Payment Gateway Architecture

**File:** `app/(admin)/admin/payments/methods/page.tsx:1` — `"use client"` `useLanguage`, wraps `PaymentMethodManager`
**File:** `components/admin/PaymentMethodManager.tsx:48` — `type Method { _id,name,slug,type:"manual"|"gateway",provider,accountNumber,instructions,qrImageUrl,enabled,order,icon,gatewayConfig:Record<string,unknown> }` (L8), `providers` array `["",bkash,nagad,rocket,stripe,sslcommerz,paypal,custom]` (L37), `ProviderIcon` + `providerBg` (L48-72), 7-column table `ORDER|NAME/SLUG|TYPE|ACCOUNT/PROVIDER|STATUS|ENABLED|ACTIONS` (L229-236), `CustomSelect` for `Type`/`Provider` filtered, `gatewayPairs` key-value eye UI.
**File:** `models/PaymentMethod.ts:3` — `{name,slug unique, type enum, provider, accountNumber, instructions, qrImageUrl, enabled:Boolean default:true, order:Number, icon, gatewayConfig:Mixed, timestamps}` + indexes `slug unique`, `{enabled:1,order:1}`. No health fields.
**File:** `app/api/admin/payment-methods/route.ts:19` `GET` list + `POST` create, `app/api/admin/payment-methods/[id]/route.ts:23` `PUT`/`DELETE`, `app/api/payment/methods/route.ts:9` public `GET` enabled, `app/api/payment/request/route.ts:26` `POST` payment, `lib/integrations/providers.ts:1` `providerFields` map, `lib/auth/*`, `middleware.ts:21`, `vercel.json:3` single cron `0 0 * * *` for subscriptions.

**Assessment:** Architecture is **flat** — no `lib/payments/health.ts` service, no `Gateway` interface, no `lib/validations`, payment logic inlined in route handlers. Works for CRUD, not for health.

---

## 2. Current Health Check Implementation

**File:** `components/admin/PaymentMethodManager.tsx:214` `checkValidity(m:Method)` — **CLIENT-ONLY FAKE, NOT BACKEND, VIOLATES REQ 9,10**
```ts
let isValid=false; if(m.type==="manual"){acc=m.accountNumber.trim(); if(!acc) isValid=false; else if(["bkash","nagad","rocket"].includes(m.provider) && acc.replace(/\D/g,"").length<11) isValid=false; else isValid=true; } else if(m.type==="gateway"){ cfg=m.gatewayConfig||{}; if(provider==="stripe") isValid=!!cfg.apiKey||!!cfg.secret||!!cfg.publishableKey; else if(sslcommerz) isValid=!!cfg.storeId&&!!cfg.storePassword; else if(paypal) isValid=!!cfg.clientId&&!!cfg.secret; else isValid=Object.keys(cfg).length>0; } await new Promise(r=>setTimeout(r,700)); if(isValid) setChecked[id]=true else false;
```
No `fetch` to provider, no `AbortSignal`, `700ms` artificial delay, `checked:Record<string,boolean>` ephemeral `useState` (L90) resets on reload, `gatewayConfig` never leaves frontend except on `save`, no `latencyMs`, `errorCode`, `provider API` call, no `NEXTAUTH_SECRET` handling, hardcoded success in production.

**File:** `models/PaymentMethod.ts:3` — **ZERO health fields.** No `status`, `health`, `lastChecked`, `latency`. Compare `models/Integration.ts:13` which has `health:{status,lastChecked,latencyMs,error,consecutiveFailures,lastSuccessAt}` + `lastChecked/lastCheckLatencyMs` + `status/statusMessage`.

**File:** `app/api/admin/payment-methods/[id]/route.ts:23` `PUT` — **NO `check:true` branch**, sparse `$set` any field, no `health` update, no `checkVersion`. `app/api/payment/methods/route.ts:12` **NO health filter**, only `find({enabled:true})`.

**Conclusion:** Health check is **fake presence-check**, not real provider connectivity. Must be replaced by backend `PaymentGatewayHealthService`.

---

## 3. Current Notification Architecture

**Toast (ephemeral):** `components/ui/Toast.tsx:22` `showToast(message,type,duration)` + `success/error` `bottom-5 right-5` `z-50` `4000ms`, `app/layout.tsx:47` `ToastProvider` wraps app, no queue limit. Used in `PaymentMethodManager.tsx:76` `const {success,error:toastError}=useToast()` for `save` `paymentMethodAdded/Updated`, `toggle` `On/Off`, `check` `checkSuccess/Failed`, `remove` `paymentMethodDeleted`.

**DB Notification (durable):** `models/Notification.ts:5` `{userId ref User index, email index, title, message, type enum ["block","unblock","subscription","payment","integration","general"], appId, appName, integrationId, read:Boolean, timestamps:true}` + index `{userId:1,read:1,createdAt:-1}`. Missing `paymentMethodId`.

**Writer:** `lib/notifications/admin.ts:5` `notifyAdmins(title,msg,type,integrationId?)` → `User.find({role:{$in:["admin","superadmin"]}})` + `ADMIN_EMAILS` env → `Notification.insertMany` fire-and-forget, catches all. Called from `integrations` (create/check/enable/delete), `payment-settings`, `payment/request` (`payment` type), `admin/payments` (`payment` for user), `cron/subscriptions` (`subscription`). **Never called from `PaymentMethod` CRUD** — `payment-methods/route.ts` `POST/PUT/DELETE` have **zero** `notifyAdmins` → violates Req 13.

**Bell:** `components/ui/NotificationBell.tsx:213` polls `GET /api/notifications` every `15s` + `focus` + `notifications-refresh` event + `localStorage kwl-read-notifs`, `markAllRead` parallel `PATCH`, `createPortal` `z-[9999]`.

**No WebSocket/SSE:** Polling 15s is current realtime mechanism. Adding WebSocket would be over-engineering for 5 admins.

---

## 4. Current Realtime Architecture

**Existing:** **No WebSocket, no Socket.IO, no SSE, no BroadcastChannel, no React Query.** Realtime is **polling + event emitter**.

- `NotificationBell.tsx:78` `setInterval(load,15000)` + `window.addEventListener("notifications-refresh")` + `window.addEventListener("focus")` + on dropdown open.
- `AdminTables.tsx:44` `window.dispatchEvent(new Event("notifications-refresh"))` after `App` delete.
- `PaymentMethodManager.tsx:191` `toggleEnabled` optimistic `setMethods` + `PUT` → **no** `notifications-refresh` dispatch (only `load()`), so bell won't refresh on toggle.

**For payment health:** Polling is **sufficient** — admin `PaymentMethodManager` does `load()` on mount only, no interval. With backend health cron every 5-30min, admin will see stale `Success` until manual refresh. Need `load()` on `focus` + `notifications-refresh` + `setInterval 30s` or `SWR` `refreshInterval:15000` — reuse existing `NotificationBell` pattern, **do not introduce WebSocket/SSE** (unjustified complexity for low-frequency gateway health).

---

## 5. Current Scheduler/Cron Architecture

**File:** `vercel.json:3` `{"crons":[{"path":"/api/cron/subscriptions","schedule":"0 0 * * *"}]}` — single daily `00:00 UTC` cron.
**File:** `app/api/cron/subscriptions/route.ts:60` `GET/POST` guarded by `Authorization: Bearer CRON_SECRET` (`process.env.CRON_SECRET`), `Subscription.updateMany(status→expired)` + deduped `Notification` within 4 days.

**No queue, no BullMQ, no Upstash, no node-cron, no Render worker.** `lib/` has no `cron`, `queue`, `jobs` directory.

**Implication:** Vercel Cron **is** the existing scheduled mechanism. **Reuse it** for payment health — smallest change. Add `{"path":"/api/cron/payment-health","schedule":"*/30 * * * *"}` or `0 */6 * * *`, guarded by same `CRON_SECRET`, with `maxDuration: 60` (Vercel Hobby 10s, Pro 60s). No need for `A-E` new system — **A. Vercel Cron wins**.

---

## 6. Provider Integration Analysis

**File:** `lib/integrations/providers.ts:1` `providerFields: Record<string,string[]>` — `stripe:["secretKey","publishableKey"]` vs `PaymentMethodManager.tsx:214` expects `stripe: apiKey|secret|publishableKey` — **mismatch** (`secretKey` vs `secret`). `sslcommerz` not in `providerFields` at all, but `PaymentMethodManager` checks `storeId/storePassword`. `paypal` `["clientId","secret"]` vs same in manager (ok). `bkash/nagad/rocket` manual not in `providerFields` (manual uses `accountNumber`, not `gatewayConfig`).

**No abstraction:** No `interface PaymentGateway { healthCheck(config): Promise<{healthy,latency,error}> }`, no `createClient()`, no `timeout` (only `mongoose serverSelectionTimeoutMS:3000`), no `retry`, no `rate-limit` handling.

**Provider health endpoints (safest, lightweight, no charge):**
- **Stripe:** `GET https://api.stripe.com/v1/balance` with `Authorization: Bearer ${decrypted.apiKey || secret}` — 200 with `available` balance = healthy, `401` `invalid_api_key` = `INVALID_CREDENTIALS`, `429` = `RATE_LIMIT`, `5s` timeout. Cost: 1 API call, no charge. Test/live same endpoint, just key prefix `sk_test_` vs `sk_live_`.
- **SSLCommerz:** No public `balance` — safest is `POST https://securepay.sslcommerz.com/validator/api/validationserverAPI.php?validation_id=DUMMY` with `store_id/store_passwd` — will return `failed` but validates `store_id` existence; alternatively `GET https://securepay.sslcommerz.com/gwprocess/v4/api.php` with dummy, expect `401` vs `200`. Lightweight: just validate `storeId` + `storePassword` presence and format, no external call if no sandbox.
- **PayPal:** `POST https://api.paypal.com/v1/oauth2/token` with `Basic base64(clientId:secret)` `grant_type=client_credentials` — 200 with `access_token` = healthy, `401` = invalid. Cost: 1 OAuth call.
- **Manual (bKash/Nagad/Rocket):** No provider API — health = `accountNumber` regex `^\+8801[3-9]\d{8}$` + `isValidPhoneNumber` + `provider` match, no external call. **Do not invent fake external check** for manual.
- **Custom:** `keys.length>0` + try `fetch` `healthCheckUrl` if provided in `gatewayConfig.healthCheckUrl` (optional), else `UNKNOWN`.

**All checks must be `AbortSignal.timeout(5000)` + single retry only for `TIMEOUT`/`NETWORK_ERROR` (once, 500ms backoff), no aggressive loops.

---

## 7. Continuous Monitoring Recommendation

**Scope (smallest safe):** **Only `enabled:true` gateways** (`find({enabled:true, isDeleted:false})`) — primary requirement `ANY gateway currently enabled for real payment processing must be continuously monitored.` **Do not monitor `NOT_CHECKED`, `FAILED` (disabled), `CHECKING`**. This minimizes provider API cost: if 5 gateways enabled, 5 checks per interval; if 10 enabled, 10 checks. **Do not monitor `enabled:false`** even if `ACTIVE` (since not exposed to checkout, no need). `FAILED` already disabled, no need to poll until admin edits (which resets to `NOT_CHECKED`).

**Alternative considered:** Monitoring `ACTIVE+enabled=false` to detect recovery — but requirement says recovered gateway `enabled` **remains false** until admin manually enables, and recovery notification is desired. However polling `FAILED` would generate `healthy again` notification without admin action, which is good for UX. Tradeoff: extra API calls. **Recommendation:** Monitor `enabled:true` **plus** `status==="FAILED"` with `health.status==="UNHEALTHY"` but `enabled:false` **once per hour** (not every 5min) to detect recovery for notification, while main 5min loop only for `enabled:true`. This gives recovery detection without hammering.

**Interval:** **5 minutes is too aggressive** for Vercel Cron (minimum `1 minute` allowed on Pro, but `5 minutes` = 12 invocations/hour × 10 gateways = 120 provider API calls/hour → Stripe rate limit `100/s` is fine, but Vercel `maxDuration 10s` on Hobby may timeout for 10 gateways × 5s each = 50s >10s. **Safest practical: `*/30 * * * *` (every 30 minutes)** for `enabled:true` (48 invocations/day × 10 = 480 calls/day, well within Stripe `100/s` and Vercel limits), plus `0 */6 * * *` (every 6 hours) for `FAILED` recovery check. **Configurable without redesign:** Store `HEALTH_CHECK_INTERVAL_MINUTES` in `SystemConfig` or `env` `PAYMENT_HEALTH_CRON="*/30 * * * *"` and read in `vercel.json` via `env`? Vercel cron schedule is static in `vercel.json`, but interval can be made configurable by having the cron run every `5 minutes` and inside handler check `lastCheckedAt` < `now - intervalMs` before actually calling provider. So set Vercel cron to `* * * * *` (every minute) with early return, or `*/5 * * * *` and use `SystemConfig.healthCheckIntervalMinutes` (default 30) to gate.

---

## 8. Health Check Interval Recommendation

**Initial interval:** **30 minutes** for `enabled:true` gateways, **6 hours** for `FAILED` recovery.

**Why not 5 minutes:**
- **Vercel execution limits:** Hobby `maxDuration 10s`, Pro `60s`. 10 gateways × `5s` timeout = `50s` >10s, will timeout and be killed, causing `Failed to collect` and duplicate `FAILED` notifications.
- **Provider rate limits:** Stripe `100 req/s` burst, `10k/hour` is fine, but `5 min` × `10 gateways` = `120/hour` is fine, but `50 gateways` × `12/hour` = `600/hour` still fine, but `100 gateways` × `12` = `1200/hour` exceeds `1000/hour` `ApiKey` rate limit analogy.
- **Cost:** Each Stripe `GET /v1/balance` is free but logs, `PayPal` OAuth `POST` is also free but extra.

**Configurable:** Add `SystemConfig.paymentHealthCheckIntervalMinutes: Number default 30` + `SystemConfig.paymentHealthRecoveryIntervalMinutes: Number default 360` (6h), read in `app/api/cron/payment-health/route.ts` `if (Date.now() - lastCheckedAt < intervalMs) skip`. No `vercel.json` redesign needed — keep `schedule:"*/5 * * * *"` and gate inside.

---

## 9. Timeout/Retry Recommendation

| Context | Timeout | Retry | Delay | Reason |
|---------|---------|-------|-------|--------|
| **Manual health check** (admin clicks `Check`) | `5s` `AbortSignal.timeout(5000)` | **0** retry (fail fast, user can retry) | — | Admin is waiting, `5s` is UX limit, no need to hammer provider. |
| **Background cron check** | `5s` | **1** retry only for `TIMEOUT`/`NETWORK_ERROR`/`ECONNRESET`, **500ms** backoff | 500ms | Transient network blip should not mark `FAILED` immediately, but retry once is enough; `INVALID_CREDENTIALS` should **not** retry. |
| **Monitoring interval** | `30 min` (enabled), `6h` (failed) | — | — | As above. |
| **Rate limit handling** | On `429` `Retry-After` header, do **not** retry immediately, mark `FAILED` with `errorCode="RATE_LIMIT"` and `consecutiveFailures++`, next cron will retry after `30 min`. | **0** immediate retry | — | Avoid loop. |

**Failure classification:**
- `401/403` → `INVALID_CREDENTIALS` (do not retry, immediate `FAILED`, `consecutiveFailures++`, `enabled:false` if was `enabled:true`)
- `429` → `RATE_LIMIT` (retry once after `Retry-After` if <5s, else mark `FAILED` but not auto-disable on first)
- `408`/`ETIMEDOUT`/`AbortError` → `TIMEOUT`
- `500/502/503/504` → `PROVIDER_ERROR`
- `ENOTFOUND/ECONNREFUSED` → `NETWORK_ERROR`

---

## 10. Failure Threshold Recommendation

**Options:**
- **A. 1 failure → disable:** Immediate, safest for money, but flaps on transient `TIMEOUT` (e.g., Stripe 500 for 10s).
- **B. 2 consecutive failures → disable:** Tolerates one transient, still safe.
- **C. 3 consecutive failures → disable:** More tolerant, but allows 1.5 hours (3×30min) of failing gateway being offered at checkout.

**Safest production:** **Option B (2 consecutive failures) + errorCode filter.**

- `INVALID_CREDENTIALS`, `ACCOUNT_RESTRICTED`, `EXPIRED_CREDENTIALS` → **immediate disable** on first (`consecutiveFailures=1` is enough, no retry).
- `TIMEOUT`, `RATE_LIMIT`, `NETWORK_ERROR`, `PROVIDER_ERROR` → require `consecutiveFailures>=2` before `enabled:false`. First failure only sets `status=FAILED` but keeps `enabled:true`? Or sets `enabled:false` after 2? Tradeoff.

**Recommendation for KWL-NEXUS:** Implement **B with code filter:**

```ts
if (errorCode==="INVALID_CREDENTIALS" || errorCode==="ACCOUNT_RESTRICTED") {
  // immediate
  await PaymentMethod.findByIdAndUpdate(id, {$set:{enabled:false, status:"FAILED", "health.status":"UNHEALTHY", "health.consecutiveFailures":1}});
} else {
  // transient
  const doc = await PaymentMethod.findByIdAndUpdate(id, {$inc:{"health.consecutiveFailures":1}, $set:{status:"FAILED", "health.status":"UNHEALTHY", lastCheckedAt:new Date()}}, {new:true});
  if (doc.health.consecutiveFailures >=2) {
    await PaymentMethod.findByIdAndUpdate(id, {$set:{enabled:false}});
  }
}
```

**Why B:** Stripe `bKash` manual has no provider API, so `TIMEOUT` not applicable; `Stripe` 500 is rare, `2` gives 60min grace (2×30min) vs `1` gives 30min, vs `3` gives 90min. `2` is balanced. Add `lastSuccessAt` grace: if `lastSuccessAt` within `1 hour`, don't auto-disable on first `TIMEOUT` (allow 1 retry).

---

## 11. Automatic Disable Recommendation

**Target:** `ACTIVE+enabled=true` + `health check fails` → `FAILED` + `enabled=false` + no longer exposed via `GET /api/payment/methods` (`find({enabled:true, status:"ACTIVE"})`).

**Transactional edge cases (read-only considerations, do not modify payment transaction flow):**

- **Existing `Payment` already `pending` with that gateway:** `Payment` document has `paymentMethod: "stripe"` + `status:"pending"` + `deadline:+7d`. Disabling gateway **must not** auto-fail those `pending` payments; they remain `pending` until admin `verify`/`reject` via `admin/payments` `PATCH`. `Subscription` not yet created, so no impact. If gateway is `Stripe` and customer already submitted `transactionId`, admin can still `verify` manually even if gateway is now `FAILED` (since `Payment` is manual `transactionId` based, not Stripe `paymentIntent`). No auto-refund.

- **Existing `Payment` in-flight `POST /api/payment/request` while disable happens:** `payment/request` does `PaymentMethod.find({enabled:true})`? No, it validates `paymentMethod` free string via `zod`, not via `PaymentMethod` lookup, so disabling does not affect in-flight request that already passed `zod` but hasn't yet `Payment.create`. Race window <100ms, acceptable.

- **Idempotency:** `Payment` `transactionId` is not unique index, so duplicate `POST` with same `transactionId` could create two `pending` docs. Not related to disable, but note.

**Recommendation:** **Auto-disable after `consecutiveFailures>=2` (or immediately for `INVALID_CREDENTIALS`)** — safest for money, matches `Subscription` expiry auto-disable pattern (`cron/subscriptions` does `updateMany` without confirmation). Keep `enabled:false` + `status=FAILED` until admin fixes creds + manual `Check` → `ACTIVE` (enabled remains `false`, admin must manually toggle `On`). **Do not auto-enable** on recovery (see Recovery).

**Alternative if admin wants confirmation:** Add `autoDisableOnFailure: Boolean default true` per `PaymentMethod` (toggle in edit modal). If `false`, keep `enabled:true` but `status=FAILED` + banner `Gateway is unhealthy but still enabled — payments may fail, disable?` + `Notification`. Default `true` for safety.

---

## 12. Recovery Recommendation

**Flow:** `FAILED` (enabled `false`) → periodic health check (every `6h` for `FAILED`) → provider succeeds → `ACTIVE` + `health HEALTHY` + `lastSuccessAt=now` + `consecutiveFailures=0` + `enabled` **remains `false`** + `Notification` `gateway became healthy again` + `success` toast.

**Why `enabled` stays `false`:** Requirement `IMPORTANT: A recovered gateway must NEVER automatically become enabled.` Prevents surprise re-exposure of `Stripe` that was previously `FAILED` due to `INVALID_CREDENTIALS` and admin has not yet verified new `apiKey` is correct (maybe they pasted test key). Admin must explicitly `Check` → `Success` → manually toggle `On`. This is **critical** for PCI/routing.

**UI/API implications:**

- `PUT /api/admin/payment-methods/[id] {enabled:true}` must check `status==="ACTIVE"` else `400 "Health check required"` — already planned.
- `GET /api/payment/methods` filters `enabled:true && status==="ACTIVE"` — so `FAILED→ACTIVE` with `enabled:false` will **not** appear in checkout until admin toggles, which is desired. The `PaymentRequestForm` will show `Stripe` only after admin toggles.
- `NotificationBell` 15s poll + `focus` + `notifications-refresh` will show `Stripe is healthy again (latency 45ms). You can now enable it.` within 15s, admin clicks bell → `type:"payment"` CTA `paymentMethodId` → `/admin/payments/methods` → sees `Success` green + `Off` toggle enabled, clicks `On`.

**No auto-enable** also means `cron` must **never** set `enabled:true`, only `status`/`health`.

---

## 13. Realtime Architecture Recommendation

**Current:** No `WebSocket`, no `Socket.IO`, no `SSE`, no `BroadcastChannel`. Realtime is **polling** (`NotificationBell` every `15s` + `focus` + `window.dispatchEvent(new Event("notifications-refresh"))` + `load()` on mount for `PaymentMethodManager`).

**For payment health:** **Reuse polling + `notifications-refresh` + `focus`**, **do NOT introduce WebSocket/SSE** — strong justification:

- **Admin count:** 1-5 admins, `PaymentMethod` count 5-10, health check interval 30min → 48 checks/day × 10 = 480 provider calls/day, each `Notification` 1 doc per check failure (max 5/day), polling 15s × 5 admins = 20 req/min = 28k/day, well within Vercel 100k `ApiKey` limit and `NEXTAUTH_SECRET` JWT, no need for persistent connection.

- **Vercel serverless:** `WebSocket` would require `Render`/`Railway` worker or `Upstash Redis` + `Pusher`/`Ably` — adds infra, cost, `CSP` changes, `maxDuration` issues for `SSE` (Vercel `60s` limit, but health check is `5s`, not long-lived).

- **Simplicity:** `PaymentMethodManager` already does `load()` on mount + after `save/toggle/check` + `setInterval` could be added `30s` to poll `GET /api/admin/payment-methods` for `status` changes from cron.

**Minimal change:**

```ts
// PaymentMethodManager.tsx
useEffect(() => {
  load();
  const id = setInterval(load, 30000); // 30s poll for health from cron
  const onFocus = () => load();
  const onRefresh = () => load();
  window.addEventListener("focus", onFocus);
  window.addEventListener("notifications-refresh", onRefresh as any);
  return () => { clearInterval(id); window.removeEventListener("focus", onFocus); window.removeEventListener("notifications-refresh", onRefresh as any); };
}, []);
```

`app/api/admin/payment-methods/route.ts` `PUT`/`POST`/`DELETE` already do `await load()` in frontend, but should also `window.dispatchEvent(new Event("notifications-refresh"))` like `AdminTables.tsx:44` does for `Payment` delete, so `NotificationBell` will show `gateway became unhealthy` within 15s without manual refresh.

**If WebSocket were justified:** Only if `PaymentMethod` count >100 and health interval 5s and admin count >50 and need <1s propagation — not KWL-NEXUS case. So **polling is sufficient**.

---

## 14. Notification Deduplication Recommendation

**Problem:** Cron every `30min` × `10 gateways` = `480` health checks/day. If a gateway stays `UNHEALTHY` for 3 days, naive `notifyAdmins` on every failed check would create `3*48=144` duplicate `Notification` docs for same `stripe` failure, spamming bell (50 limit) and `insertMany` 5 admins ×144 = 720 docs.

**Requirement:** `Healthy → first failure → ONE unhealthy notification, next checks still fail → NO duplicate, Recovery → ONE recovery notification, if fails again later → new unhealthy`.

**How to persist/track:** **DB `health` field + `lastFailedAt`/`lastSuccessAt` + `Notification` dedup query** (like `cron/subscriptions` dedup within 4 days, but need 5min dedup for health).

**Recommended implementation:**

```ts
// lib/payments/health.ts → after healthCheck
const now = new Date();
const prevHealth = doc.health?.status; // UNKNOWN/HEALTHY/UNHEALTHY
const prevEnabled = doc.enabled;

if (isHealthy) {
  // success
  const update = {
    status: "ACTIVE",
    "health.status": "HEALTHY",
    "health.lastChecked": now,
    "health.lastSuccessAt": now,
    "health.latencyMs": latency,
    "health.error": null,
    "health.errorCode": null,
    "health.consecutiveFailures": 0,
    lastCheckedAt: now,
  };
  await PaymentMethod.findByIdAndUpdate(id, {$set: update});
  // recovery notification only if previously FAILED/UNHEALTHY
  if (prevHealth === "UNHEALTHY" || doc.status === "FAILED") {
    // dedup: check if Notification for this paymentMethodId + type:"payment" + title:"Gateway is healthy again" exists within last 5 min
    const recent = await Notification.findOne({ paymentMethodId: doc._id, title: "Gateway is healthy again", createdAt: {$gt: new Date(Date.now()-5*60*1000)}}).lean();
    if (!recent) await notifyAdmins(`Gateway is healthy again`, `${doc.name} (${doc.slug}) is healthy again (latency ${latency}ms). You can now enable it.`, "payment", undefined, String(doc._id));
  }
} else {
  // fail
  const consecutive = (doc.health?.consecutiveFailures ?? 0) + 1;
  const shouldDisable = doc.enabled && (errorCode==="INVALID_CREDENTIALS" || consecutive>=2);
  const update: any = {
    status: "FAILED",
    "health.status": "UNHEALTHY",
    "health.lastChecked": now,
    "health.lastFailedAt": now,
    "health.latencyMs": latency,
    "health.error": safeError, // sanitized, no secrets
    "health.errorCode": errorCode,
    "health.consecutiveFailures": consecutive,
    lastCheckedAt: now,
  };
  if (shouldDisable) update.enabled = false;
  await PaymentMethod.findByIdAndUpdate(id, {$set: update});
  // dedup: only first failure notification, not every 30min while still failed
  if (prevHealth !== "UNHEALTHY") {
    const recent = await Notification.findOne({ paymentMethodId: doc._id, title: "Gateway became unhealthy", createdAt: {$gt: new Date(Date.now()-5*60*1000)}}).lean();
    if (!recent) await notifyAdmins(`Gateway became unhealthy`, `${doc.name} (${doc.slug}) is unhealthy: ${safeErrorCode}. ${shouldDisable ? "Auto-disabled." : ""}`, "payment", undefined, String(doc._id));
  }
  if (shouldDisable && prevEnabled) {
    await notifyAdmins(`Gateway automatically disabled`, `${doc.name} was disabled due to health failure (${safeErrorCode}).`, "payment", undefined, String(doc._id));
  }
}
```

**Persist tracking:** Use `Notification` collection with `paymentMethodId` + `title` + `createdAt` 5min window, **or** store `health.lastNotifiedAt` + `health.lastNotifiedStatus` in `PaymentMethod` itself to avoid extra query. Simpler: add `health.lastNotifiedAt: Date` + `health.lastNotifiedStatus: String` to `PaymentMethod` and update on notify, check `if (health.lastNotifiedStatus !== newStatus || Date.now() - health.lastNotifiedAt > 5*60*1000)`.

**Reuse existing:** `lib/notifications/admin.ts:5` `notifyAdmins` already does `User.find({role:{$in:["admin","superadmin"]}})` + `ADMIN_EMAILS` env, `insertMany`, catches all. Extend it to accept `paymentMethodId` and `type:"payment"` (already supports `type:"payment"`).

**Toast vs DB:** `PaymentMethodManager` `checkValidity` currently `success(t("checkSuccess"))` / `toastError` — keep for immediate feedback, but also `Notification` for durable bell (15s poll).

---

## 15. Concurrency/Lock Recommendation

**Scenario:** Cron execution #1 starts at `00:00:00`, takes `40s` for 10 gateways × `5s` each (if sequential) or `10s` if concurrent 5, Cron #2 starts at `00:05:00` before #1 finishes (if cron is `*/5` and #1 is slow due to Stripe timeout), both check same `stripe` gateway.

**Current DB:** No lock, `PaymentMethod` has no `healthCheckVersion` or `checking` status. `PaymentMethodManager` has single `checking:string|null` (client only, one at a time), but two admins could trigger `POST /check` for same `id` concurrently.

**Smallest reliable mechanism (no new infra like Redis):**

**Option: Atomic `status` lock + `healthCheckVersion` (like `Integration` but add `checkVersion`).**

1. Add to `PaymentMethod` schema: `health.checkVersion: Number default 0` + `health.requestId: String` + `status` enum includes `CHECKING`.
2. **Start check:** `findOneAndUpdate({ _id:id, $or:[{status:{$ne:"CHECKING"}}, {"health.lastChecked":{$lt: new Date(Date.now()- 60*1000)}}] }, {$set:{status:"CHECKING", "health.status":"CHECKING", "health.requestId": new ObjectId().toString(), lastCheckedAt:new Date()}, $inc:{"health.checkVersion":1}}, {new:true})` — if no doc returned, means already `CHECKING` within 60s → return `409 Conflict: health check already in progress`.
3. **During check:** Hold `status=CHECKING` in DB, so second cron/admin `POST /check` will see `status===CHECKING` and return `409`.
4. **Finish check:** `findOneAndUpdate({ _id:id, "health.requestId": myRequestId }, {$set:{status: isHealthy?"ACTIVE":"FAILED", "health.status": isHealthy?"HEALTHY":"UNHEALTHY", ...}}, {new:true})` — only update if `requestId` still matches, otherwise stale result is ignored (solves `checkVersion` stale overwrite).
5. **TTL:** If `checking` hangs (provider never returns, `AbortSignal.timeout` ensures 5s, but if process crashes), `status` would stay `CHECKING` forever. Add `health.lastChecked` TTL: cron on next run sees `status==="CHECKING" && lastCheckedAt < now- 60*1000` → allow new check (60s lease).

**Why not `in-memory` lock:** Vercel serverless has multiple instances, in-memory `Set` would not sync across instances. **Why not `Redis`:** No existing `Upstash` or `BullMQ`, adding would be new infra (overkill for 10 gateways). **Why not `node-cron`:** No shared DB, same issue.

**Implementation:** Reuse `MongoDB` atomic `findOneAndUpdate` as lock — smallest change, no new dependency, works across instances, uses existing `health.checkVersion`.

---

## 16. Stale Result Protection Recommendation

**Mandatory scenario:** `Health check starts with credential version 5 (apiKey sk_test_111)`, admin updates credentials to version 6 (`sk_test_222`), `healthCheckVersion` becomes `6`, old check (version 5) finishes after 4s with `success` for old `sk_test_111`, must **not** overwrite version 6's `NOT_CHECKED` or `CHECKING` state.

**Smallest reliable solution:** **`health.checkVersion` (Number) + `health.requestId` (String)** — already in DB audit D-2.

- **On credential update (`PUT /api/admin/payment-methods/[id]` with `gatewayConfig`):** `update.health.checkVersion = (doc.health?.checkVersion ?? 0) + 1`, `update.status = "NOT_CHECKED"`, `update["health.status"] = "UNKNOWN"`, `update.enabled = false`, `update.health.requestId = null`.
- **On check start:** `const myVersion = doc.health.checkVersion; const myRequestId = new ObjectId().toString(); await PaymentMethod.findByIdAndUpdate(id, {$set:{status:"CHECKING", "health.status":"CHECKING", "health.requestId":myRequestId, lastCheckedAt:now}});` then `const result = await healthCheck(decryptedConfig);` then `const fresh = await PaymentMethod.findById(id).lean(); if (fresh.health.requestId !== myRequestId) return; // stale, ignore` else `await PaymentMethod.findByIdAndUpdate(id, {$set:{status:isHealthy?"ACTIVE":"FAILED", ... , "health.requestId":null}})`.
- **Alternative simpler (if not adding `requestId`):** Use `updatedAt` comparison: `if (fresh.updatedAt > myStartedAt) return;` — but `updatedAt` changes on any `PUT`, not just credential change, and `checkVersion` is more explicit.

**Reuse existing:** `PaymentMethod` currently has `timestamps:true` (`updatedAt`), so `updatedAt` could be used, but `checkVersion` is clearer and matches `Integration` pattern (though `Integration` doesn't have it, but should).

**No extra dependency:** Just `health.checkVersion: Number` field.

---

## 17. Public Payment API Recommendation

**Current:** `GET /api/payment/methods` (public, no auth) → `PaymentMethod.find({enabled:true}).select("name slug type provider accountNumber instructions qrImageUrl enabled order icon gatewayConfig")` (leaks `gatewayConfig`).

**Required (Req 12):** Public `GET` must only include `enabled:true` **AND** `status==="ACTIVE"` **AND** `health.status==="HEALTHY"` (or at least `status==="ACTIVE"`), and **never** `gatewayConfig`.

```ts
// app/api/payment/methods/route.ts:12
const methods = await PaymentMethod.find({enabled:true, status:"ACTIVE", "health.status":"HEALTHY", isDeleted:false})
  .sort({order:1, createdAt:1})
  .select("name slug type provider accountNumber instructions qrImageUrl enabled order icon") // no gatewayConfig
  .lean();
if(methods.length) return NextResponse.json({data:methods});
// fallback to PaymentConfig only if no PaymentMethod at all (legacy)
```

**Why `enabled + ACTIVE + HEALTHY`:** `NOT_CHECKED` gateways are newly created but not yet verified — must not be exposed (Req 2,3). `FAILED` gateways must disappear from checkout (Req 7) to prevent customer `POST /api/payment/request` with `paymentMethod:"stripe"` that will later be `failed` at `admin/payments` verify. `CHECKING` gateways also not exposed (health in progress).

**Edge:** If **all** gateways are `FAILED` and none `ACTIVE`, checkout will have **zero** methods → `PaymentRequestForm` should show `No payment methods available, please contact support` (add `t("noPaymentMethods")`).

**Also `POST /api/payment/request` validation:** Current `paymentSchema` `paymentMethod: z.string().min(1)` accepts any free string. Should validate against `PaymentMethod.findOne({slug:paymentMethod, enabled:true, status:"ACTIVE"})` and return `400 "Payment method not available"` if not `ACTIVE`. Currently it does not, so `curl -d '{"paymentMethod":"stripe","appId":"x","planId":"y","transactionId":"z"}'` will create `Payment{status:"pending", paymentMethod:"stripe"}` even if `stripe` is `FAILED` and `enabled:false` → admin will see `pending` but gateway is down, confusing. Add check.

---

## 18. Security Findings (Health-Check Specific)

| # | Severity | File:Lines | Finding | Impact | Fix |
|---|----------|------------|---------|--------|-----|
| **H-S1** | **CRITICAL** | `PaymentMethodManager.tsx:208` `gatewayConfig` in `checked` logic + `app/api/payment/methods/route.ts:12` public select | **Frontend health check uses plaintext `gatewayConfig` from `methods` state** which came from `GET /api/admin/payment-methods` (admin) that currently returns full `gatewayConfig` (S-1). `checkValidity` reads `m.gatewayConfig.apiKey` in browser memory (React state), which is safe if admin API masked, but currently `gatewayConfig` is in `methods` state as plaintext, visible in `JSON.stringify(gatewayJson)` textarea and `ProviderIcon` not, but `gatewayPairs` holds `value` as plaintext in `input type=password` (masked but still in `value` prop, visible in DevTools `React` tab). | **Do not send `gatewayConfig` to frontend at all** for `GET` list; send masked `gatewayConfig: {apiKey:"configured"}` and only send decrypted `gatewayConfig` on `GET /api/admin/payment-methods/[id]` **single** (for edit modal) after admin auth, and even then mask per key. Health check must `decrypt` on backend, never expose. |
| **H-S2** | **HIGH** | `lib/payments/health.ts` (to-be) + `app/api/admin/payment-methods/[id]/check` | **Health check must not log secrets.** Current `console.error("payment/methods fetch failed", error)` is safe, but `healthCheck` if it does `console.log(`Checking stripe with apiKey=${decrypted.apiKey}`)` would leak. | Ensure `healthCheck` logs only `provider` + `slug` + `latency` + `errorCode` (e.g., `Stripe health check failed for stripe (latency 320ms): INVALID_CREDENTIALS`), never `apiKey` value. Add `lib/payments/health.ts` `sanitizeError` that strips `apiKey` from provider response. |
| **H-S3** | **HIGH** | `app/api/admin/payment-methods/[id]/check` (to-be) | **Health-check endpoint authorization** — must be `isAdmin` DB-backed, not `isAdminEmail` env-only, and must have `CRON_SECRET` for cron, but not for admin manual `POST /check`. Ensure `requireAdmin` uses `isAdmin` (DB) as in `integrations`, not `isAdminEmail`. | Fix `requireAdmin` to `isAdmin`. |
| **H-S4** | **MEDIUM** | `app/api/cron/payment-health/route.ts` (to-be) | **Cron route exposure** — `GET /api/cron/payment-health` without `Authorization: Bearer CRON_SECRET` would allow anyone to trigger 10 provider health checks, causing rate-limit and `Notification` spam. Current `cron/subscriptions` correctly checks `request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`` and returns `401`. Must replicate. | Add `if (request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) return 401` + `export const dynamic="force-dynamic"` + `maxDuration: 60`. |
| **H-S5** | **MEDIUM** | `lib/payments/health.ts` `fetch` to Stripe | **SSRF risk** if `gatewayConfig.healthCheckUrl` is attacker-controlled (custom gateway `healthCheckUrl: "http://169.254.169.254/latest/meta-data/"`). `fetch` with `gatewayConfig.healthCheckUrl` and no allowlist could hit `169.254.169.254` (AWS metadata) or `localhost:3000/api/admin/*`. | Validate `healthCheckUrl` against allowlist (`https:` only, no `169.254`, no `localhost`, no `10.`, `172.16.`, `192.168.`), use `new URL()` and check `hostname`. For `custom` provider, require explicit `healthCheckUrl` to be `https` and not private IP, or skip external check and only validate `apiKey` presence. |
| **H-S6** | **LOW** | `components/admin/PaymentMethodManager.tsx:208` `checkValidity` error handling | **Error messages exposing provider credentials** — current `toastError(reason?`${t("checkFailed")}: ${reason}`:t("checkFailed"))` where `reason="Missing gateway config keys"` is safe, but if `healthCheck` returns `error: "Stripe: Invalid API key sk_live_51H..."` and we do `toastError(error)` it would leak. Must sanitize. | In `healthCheck`, return `safeError: "Invalid credentials"` without key, and `Notification` `health.error` also sanitized. Frontend `toastError` should show `t("checkFailed")+": "+safeErrorCode` (e.g., `INVALID_CREDENTIALS`), not raw `error.message`. |
| **H-S7** | **INFO** | `next.config.js:23` `headers` | **Payment methods API should not be cached** — `GET /api/payment/methods` is `force-dynamic` already, but no `Cache-Control: no-store` header. Cloudflare or Vercel edge may cache `200` with `gatewayConfig` (if not fixed). | Add `headers: [{source:"/api/payment/methods", headers:[{"key":"Cache-Control","value":"no-store"}]}]` in `next.config.js`. |

---

## 19. Performance Findings

| Gateways | Health Checks per Interval (30min) | Provider API Calls | DB Writes | Cron Duration (5s timeout, concurrency 5) | Notifications | Rate-Limit Risk |
|----------|-----------------------------------|--------------------|-----------|------------------------------------------|---------------|-----------------|
| **5** | 5 (`enabled:true` only) | 5 × `GET /v1/balance` (Stripe) + `POST /oauth/token` (PayPal) + `0` for manual (no external) = ~5 | 5 `findByIdAndUpdate` (health) + 0-1 `notifyAdmins` per failure (deduped) | `5/5 concurrent` → `5s` max (if one timeout) + `5*10ms` DB = `~6s` < Vercel `10s` Hobby, `<60s` Pro | `1` per gateway failure (not per check) | Stripe `100/s` burst, `5` is negligible |
| **10** | 10 | 10 | 10 | `10/5 concurrent` → 2 batches × `5s` = `10s` = Vercel Hobby limit exactly, Pro `60s` safe | 10 | `10` still negligible |
| **50** | 50 | 50 | 50 | `50/5` = 10 batches × `5s` = `50s` > Hobby `10s` → **timeout**, will be killed mid-batch, some gateways not checked, `Failed to collect` in cron logs | 50 | `50` × `2/hour` = `2400/day` still < `10k` but DB `updateMany` 50 writes is fine |
| **100** | 100 | 100 | 100 | `100/5` = 20 batches × `5s` = `100s` > `60s` Pro → **timeout** | 100 | `100×48` = `4800/day` still < Stripe `100/s`, but DB 100 writes is fine |

**Recommendation:** **Batch concurrency 5, timeout 5s, interval 30min** is safe for **≤10 gateways** (current KWL-NEXUS has `7` providers `bkash/nagad/rocket/stripe/sslcommerz/paypal/custom` → likely `≤10` methods). For **50-100 gateways**, need:

- **Concurrency 10** (not 5) → `100/10=10 batches ×5s=50s` still >10s Hobby, but `60s` Pro ok.
- **Split cron:** `GET /api/cron/payment-health?batch=1/4` with `?limit=25&skip=0` and 4 Vercel crons `*/30 * * * *` with different `batch` param, or use `p-limit` with `Promise.allSettled` and `maxDuration: 60`.
- **DB writes:** `bulkWrite` instead of 100 individual `findByIdAndUpdate` to reduce `50ms` to `10ms`.
- **Notifications:** Dedup as in 14, so 100 gateways all `UNHEALTHY` for 3 days would be `100` notifications once, not `100*48*3=14400`.

**No over-engineering:** Do not add `BullMQ`/`Upstash` for 10 gateways; `Promise.allSettled` with `p-limit` 5 is enough.

---

## 20. Exact Files That Need Modification

**For Requirements 1-16 (health, enable-guard, backend check, notifications):**

| File | Lines | Why | New/Modify |
|------|-------|-----|------------|
| `models/PaymentMethod.ts` | 3 | Add `status`, `health`, `lastCheckedAt`, `deletedAt`, `select:false` on `gatewayConfig`, indexes | **Modify** |
| `lib/payments/health.ts` | — | `PaymentGatewayHealthService` + per-provider `healthCheck()` + `AbortSignal.timeout(5000)` + error classification | **New** |
| `lib/payments/encryption.ts` | — | `encryptGatewayConfig`/`decrypt`/`mask` reuse `lib/github/client.ts` | **New** (or reuse) |
| `app/api/admin/payment-methods/route.ts` | 8,19,29 | Fix `requireAdmin` to `isAdmin`, add `zod` validation, `enabled:false` + `status=NOT_CHECKED` on `POST`, mask `gatewayConfig`, `notifyAdmins` | **Modify** |
| `app/api/admin/payment-methods/[id]/route.ts` | 12,23 | Fix `requireAdmin`, add `PUT {check:true}` branch → `healthCheck`, `PUT {enabled}` guard `status===ACTIVE`, handle `gatewayConfig` encrypt + reset `status`, `checkVersion` lock, `DELETE` soft | **Modify** |
| `app/api/admin/payment-methods/[id]/check/route.ts` | — | Dedicated `POST` health check (alt to `PUT {check}`) | **New** (choose one) |
| `app/api/payment/methods/route.ts` | 9,12 | Change `.select("-gatewayConfig")`, filter `{enabled:true, status:"ACTIVE", "health.status":"HEALTHY", isDeleted:false}` | **Modify** |
| `app/api/cron/payment-health/route.ts` | — | Cron `Bearer CRON_SECRET`, iterate `PaymentMethod.find({enabled:true})` or `find({status:{$ne:"NOT_CHECKED"}})`, `healthCheck` each (concurrency 5), update `health`, auto-disable after `consecutiveFailures>=2`, `notifyAdmins` | **New** |
| `vercel.json` | 3 | Add `{"path":"/api/cron/payment-health","schedule":"*/30 * * * *"}` | **Modify** |
| `components/admin/PaymentMethodManager.tsx` | 48,74,191,208,229,306 | Remove `checked` local, derive `status` from `method.status`/`health.status`, `STATUS` dot `NOT_CHECKED` gray / `CHECKING` amber pulse / `ACTIVE/HEALTHY` green / `FAILED/UNHEALTHY` red, `ENABLED` toggle `disabled={method.status!=="ACTIVE"}` , `Check` calls `POST /check` + `mutate`, `save` resets `status` to `NOT_CHECKED` | **Modify** |
| `app/(admin)/admin/payments/methods/page.tsx` | 7 | Already `"use client"` + `useLanguage` — ensure `t` for table headers | **No change** |
| `lib/i18n/translations.ts` | 340,506,785 | Add `status` health translations `checking/success/fail/notChecked`, `paymentMethodAdded/Updated/Deleted`, `checkSuccess/Failed`, `health` dot labels | **Modify** |
| `lib/integrations/providers.ts` | 1 | Align `stripe:["secretKey","publishableKey"]` vs `apiKey` mismatch (choose one) | **Modify** (minor) |
| `app/api/notifications/route.ts` | 10 | Ensure `GET` populates `paymentMethodId` and index `{paymentMethodId:1}` | **Modify** (optional) |
| `models/Notification.ts` | 5 | Add `paymentMethodId: {type:Schema.Types.ObjectId, ref:"PaymentMethod", index:true}` | **Modify** |
| `lib/notifications/admin.ts` | 5 | Extend `notifyAdmins(title,msg,type,paymentMethodId?)` to handle `paymentMethodId` | **Modify** |
| `app/admin/layout.tsx` + `app/(admin)/admin/layout.tsx` | 11 | Keep DB-backed `isAdmin` (already correct) — ensure `payment-methods` API also uses `isAdmin` | **No change** |
| `middleware.ts` | 21 | Add `Content-Security-Policy`, `HSTS` headers, keep `matcher` | **Modify** (headers only) |
| `next.config.js` | 23 | Add `Content-Security-Policy`, `HSTS`, `Access-Control-Allow-Origin` same-origin only | **Modify** |
| `__tests__/payment-methods.test.ts` | — | `jest` + `mongodb-memory-server` + `msw` for Stripe `fetch` mock, tests T-1..T-14 | **New** |

**For Settings/Branding already done:** `app/(admin)/admin/settings/page.tsx` compact `Payment methods` + `Global Tutorial` cards with `Manage` links, `IntegrationsManager` filtered `oauthOnly`, `OAuthManagementCards` same card style — **no further change** for health.

---

## 21. Exact Files That Should NOT Be Modified

| File | Reason |
|------|--------|
| `lib/auth/auth.ts` (215 lines) | NextAuth `jwt`/`session` enrichment is correct, `getAdminEmails` + `ensureSuperAdminInDb` promotion is intentional, `secret` strong. Changing risks auth bypass. |
| `middleware.ts` (38 lines) **except** adding `CSP/HSTS` headers | `matcher` (`/admin/:path*`, `/developers/:path*`) and `isAdmin` logic to `isSuperAdmin` only for payment methods would break DB `admin` role (currently `admin` is correct for payments, `superadmin` for integrations). Keep `admin` for payments. |
| `models/User.ts` `models/App.ts` `models/Plan.ts` `models/Subscription.ts` `models/Payment.ts` (except adding `deletedAt` soft-delete to `Payment` is *should* but audit says **should not** redesign `Payment` flow now) | `Payment` `pending→succeeded/failed` + `Subscription` creation is already correct, `lib/auth` upsert is correct. Avoid scope creep. |
| `components/ui/Toast.tsx` (126 lines) + `components/shared/ToastProvider.tsx` | Ephemeral `4s` toast is correct, already used everywhere, no need for `react-hot-toast`. |
| `components/ui/NotificationBell.tsx` (213 lines) + `app/notifications/page.tsx` (111 lines) | Polling `15s` + `focus` + `notifications-refresh` is sufficient, no need for WebSocket/SSE. |
| `lib/db/connect.ts` (70 lines) | Global cache + `bufferCommands:false` + `serverSelectionTimeoutMS:3000` is correct. |
| `lib/api/auth.ts` (41 lines) | `hashApiKey` SHA256 + `requestWindows` 1000/h is correct. |
| `app/api/payment/request/route.ts` (132 lines) | `zod` `paymentSchema` + `getServerSession` + `Plan` resolve + `Payment` create `pending` + `notifyAdmins` is correct, only `paymentMethod` free string should later be validated against `PaymentMethod` `enabled:ACTIVE` but **do not** change now (out of scope for health). |
| `app/api/cron/subscriptions/route.ts` (60 lines) | Subscription expiry cron is correct, don't modify to add payment-health there; create new `payment-health` cron. |
| `vercel.json` (only add new cron) | Keep existing `subscriptions` cron `0 0 * * *`. |
| `public/**` `branding/**` `app/layout.tsx` `app/globals.css` `tailwind.config.js` | UI shell, PWA, branding — no payment logic. |
| `lib/integrations/providers.ts` **except** aligning `stripe` field names | Keep as is for now, but note mismatch. |
| `jest.config.ts` `jest.setup.ts` `__tests__/pages.test.tsx` | Test infra, don't redesign, just add new `payment-methods` tests in new file. |

---

## 22. Minimal New Files Required

| File | Purpose | Lines (est.) | Dependencies |
|------|---------|--------------|--------------|
| `lib/payments/health.ts` | `PaymentGatewayHealthService` + per-provider `healthCheck()` + `AbortSignal.timeout(5000)` + error classification `INVALID_CREDENTIALS/TIMEOUT/RATE_LIMIT` | ~120 | `0` new (uses `fetch`, `AbortSignal`, `PaymentMethod` model, `decryptGatewayConfig`) |
| `lib/payments/encryption.ts` | Wrapper reusing `lib/github/client.ts:21` `encryptToken`/`decryptToken` for `gatewayConfig` Map | ~40 | `0` new (reuse `crypto` + `NEXTAUTH_SECRET`) |
| `app/api/admin/payment-methods/[id]/check/route.ts` | `POST` health check (alternative to `PUT {check:true}`) — calls `healthCheck`, updates `status/health`, returns `health` | ~60 | `0` new |
| `app/api/cron/payment-health/route.ts` | Cron `Bearer CRON_SECRET`, loops `PaymentMethod` `enabled:true`, `healthCheck` with concurrency 5, `bulkWrite` | ~80 | `0` new |
| `scripts/migrate-payment-health.js` | One-off: `PaymentMethod.updateMany({},{$set:{status:"NOT_CHECKED", "health.status":"UNKNOWN", enabled:false}})` where `gatewayConfig` empty? Actually `enabled:true` → set `status:"NOT_CHECKED"` + encrypt `gatewayConfig` | ~40 | `0` new |
| `__tests__/payment-methods.test.ts` | `jest` + `mongodb-memory-server` + `msw` for Stripe `fetch` mock, tests T-1..T-14 | ~250 | `mongodb-memory-server` (dev), `msw` (dev) if not already present — **prefer 0 new** by using existing `jest` + manual `fetch` mock without `msw` |

**Total new files:** 5-6, **~550 lines**, **0 production dependencies** (reuse `mongoose`, `next-auth`, `fetch`, `crypto`).

---

## 23. Minimal New Dependencies Required

**Prefer ZERO new dependencies.** Existing `package.json` already has `next`, `mongoose`, `next-auth`, `zod` (for `payment/request`), `lucide-react`, `jest` (for tests). `stripe` npm SDK is **not** in `package.json` — do not add it. Use `fetch` directly to Stripe `https://api.stripe.com/v1/balance` with `Authorization: Bearer ${decrypted.apiKey}` + `AbortSignal.timeout(5000)` — no `stripe` lib needed, keeps bundle small and avoids `stripe` version lock.

- **If `mongodb-memory-server` not in `devDependencies`:** Add as `devDependency` for tests (`npm install -D mongodb-memory-server`), but audit says **prefer 0 new** — can also use existing `jest` with manual `PaymentMethod` mock without `mongodb-memory-server` (mock `PaymentMethod.find` etc. as in `app/api/payment/request/route.test.ts`).

- **No `BullMQ`, `Upstash`, `Pusher`, `Ably`, `Socket.IO`:** Not needed, polling is sufficient.

**Result:** `0` new production dependencies, `0-1` new dev dependency (`mongodb-memory-server` if not present).

---

## 24. Step-by-Step Implementation Plan

**Do not implement yet — this is the plan for the next step, in exact order. Each step is a single PR/commit, verifiable via `npm run build` + `npm test`.**

### Step 1 — Phase 0 Hotfix (1 hour, deploy same day, no DB migration)

- **Commit `fix: payment-gateway: mask gatewayConfig + select:false + rotate secrets`**
  - `models/PaymentMethod.ts:15` `gatewayConfig: {type:Schema.Types.Mixed, default:{}, select:false}` + `toJSON` mask.
  - `app/api/payment/methods/route.ts:12` `.select("-gatewayConfig")` + `.select("name slug type provider accountNumber instructions qrImageUrl enabled order icon")`.
  - `app/api/admin/payment-methods/route.ts:22` `const masked = methods.map(m=>({...m, gatewayConfig: Object.fromEntries(Object.keys(m.gatewayConfig||{}).map(k=>[k,"configured"]))}))`.
  - `app/api/admin/payment-methods/[id]/route.ts:38` same mask for `PUT` response.
  - `app/api/admin/payment-methods/route.ts:8` + `[id]/route.ts:12` `requireAdmin` fix to `isAdmin` DB + `catch{return false}`.
  - `next.config.js:23` add `Content-Security-Policy` + `HSTS`.
  - **Manual:** Rotate `MONGODB_URI` password, Stripe `sk_live`/`whsec`, `GOOGLE_CLIENT_SECRET`, `GITHUB_CLIENT_SECRET`, update `.env.local` + Vercel env, purge CDN, add `.env.local` to `.gitignore`.

### Step 2 — Phase 1 DB & Encryption (2 hours)

- **Commit `feat: payment-gateway: add health schema + encryption`**
  - `models/PaymentMethod.ts` add `status`, `health`, `lastCheckedAt`, `deletedAt`, `createdBy` as in D-1..D-6, `gatewayConfig` change to `Map<String>` + `select:false`.
  - `lib/payments/encryption.ts` `encryptGatewayConfig`/`decrypt`/`mask` reusing `lib/github/client.ts:21`.
  - `models/Notification.ts` add `paymentMethodId`.
  - `scripts/migrate-payment-health.js` set `status="NOT_CHECKED"` + encrypt existing `gatewayConfig`.

### Step 3 — Phase 2 Backend Health & Guard (3 hours)

- **Commit `feat: payment-gateway: add health service + enable guard`**
  - `lib/payments/health.ts` `healthCheck(method)` with `AbortSignal.timeout(5000)`, per-provider `stripeHealthCheck` (`GET https://api.stripe.com/v1/balance`), `manualHealthCheck` (`accountNumber` regex), classify `INVALID_CREDENTIALS`/`TIMEOUT`.
  - `app/api/admin/payment-methods/route.ts:29` `POST` → `enabled:false`, `status="NOT_CHECKED"`, `encrypt`, `notifyAdmins` `payment gateway added`.
  - `app/api/admin/payment-methods/[id]/route.ts:23` `PUT` → if `body.gatewayConfig` → `encrypt`, reset `status="NOT_CHECKED"`, `enabled:false`, `health.checkVersion++`; if `body.check===true` → `status="CHECKING"` → `healthCheck` → update `status`/`health`; if `body.enabled===true` && `doc.status!=="ACTIVE"` → `400`.
  - `app/api/admin/payment-methods/[id]/check/route.ts` **new** `POST` health check.
  - `app/api/payment/methods/route.ts:9` filter `find({enabled:true, status:"ACTIVE", "health.status":"HEALTHY", isDeleted:false})` + `select("-gatewayConfig")`.

### Step 4 — Phase 3 Frontend Health-Aware (2 hours)

- **Commit `feat: payment-gateway: frontend health-aware`**
  - `components/admin/PaymentMethodManager.tsx` remove `checked` local, derive `isHealthy = method.status==="ACTIVE" && method.health?.status==="HEALTHY"`, `isChecking = method.status==="CHECKING"`, `STATUS` dot `NOT_CHECKED` gray / `CHECKING` amber pulse / `ACTIVE/HEALTHY` green / `FAILED/UNHEALTHY` red, `ENABLED` toggle `disabled={method.status!=="ACTIVE"}`, `Check` calls `POST /check` + `mutate`, `save` resets `status` to `NOT_CHECKED`.

### Step 5 — Phase 4 Cron & Notifications (1 hour)

- **Commit `feat: payment-gateway: add health cron and notifications`**
  - `lib/notifications/admin.ts` extend `notifyAdmins` to `paymentMethodId`.
  - `app/api/cron/payment-health/route.ts` `Bearer CRON_SECRET` → `find({enabled:true})` → `healthCheck` concurrency 5 → update `health` → if `consecutiveFailures>=2` auto `enabled:false` + `status="FAILED"` + `Notification` `gateway became unhealthy` / `became healthy`.
  - `vercel.json` add `{"path":"/api/cron/payment-health","schedule":"*/30 * * * *"}`.

### Step 6 — Phase 5 Tests (3 hours)

- **Commit `test: payment-gateway: add health, auth, redaction tests`**
  - `__tests__/payment-methods.test.ts` `jest` + `mongodb-memory-server` + `msw` for Stripe `fetch` mock, tests T-1..T-14.

**Verification after each phase:** `npm run build` + `npm test` + manual `curl -H "Cookie: next-auth.session-token=..." -X POST /api/admin/payment-methods -d '{"name":"Test Stripe","slug":"test-stripe","type":"gateway","provider":"stripe","gatewayConfig":{"apiKey":"sk_test_123"}}'` → `201` `enabled:false` `status:NOT_CHECKED` `gatewayConfig:{"apiKey":"configured"}`; `POST /api/admin/payment-methods/[id]/check` → `200` `status:ACTIVE` or `FAILED`; `PUT {enabled:true}` before check → `400`; `GET /api/payment/methods` (no cookie) → `gatewayConfig` absent; `NotificationBell` shows `payment gateway added` within 15s.

---

## 25. Rollback Considerations

- **DB migration rollback:** New fields `status`, `health`, `lastCheckedAt`, `deletedAt` all have `default`, so `downgrade` (revert code) will still work with old code that ignores them (old `PaymentMethod` will see extra fields but not use them). To rollback DB, run `scripts/migrate-payment-health-rollback.js` `updateMany({},{$unset:{status:"",health:"",lastCheckedAt:"",deletedAt:"",isDeleted:""}})` + `updateMany({},{$set:{"gatewayConfig": decrypted}})` (decrypt via `decryptGatewayConfig`).

- **Encryption rollback:** If `gatewayConfig` was migrated to encrypted `Map`, old code expects `Mixed` plaintext. Rollback script must `decryptGatewayConfig` for each doc before reverting schema `select:false` removal.

- **Public API filter rollback:** If `GET /api/payment/methods` filter `status:"ACTIVE"` is reverted to `enabled:true` only, `FAILED` gateways would re-appear at checkout. To rollback safely, keep `status` filter for 1 week after deploy, then remove.

- **Cron rollback:** `vercel.json` new cron `payment-health` can be disabled by removing entry + `vercel --prod` redeploy; no DB side effect except `health` updates will stop.

- **Notification spam rollback:** If new `Notification` `paymentMethodId` causes bell to show 50 new `payment gateway added` on first deploy (migration creates many `Notification`s), add `migration` flag `isMigration:true` to `Notification` and filter `find({isMigration:{$ne:true}})` in `NotificationBell` for first week.

- **Feature flag:** Add `SystemConfig.paymentHealthEnabled: Boolean default true` to allow instant disable without code revert: `if (!systemConfig.paymentHealthEnabled) return` in `health.ts` and `cron`.

---

**No files were modified during this audit.** This report is read-only.

---

## Final Implementation & Deployment Readiness — 2026-09-04 (Post-Audit)

**Branding final:** `SystemConfig` extended `brandLogoLight/Dark`, `brandIconLight/Dark`, `brandBannerLight/Dark`, `brandFavicon`, `brandAppIcon`, `ogImage` + `primary/secondary/accent` (zod `system-config` schema, public `GET /api/system-config` default). `BrandThemeProvider` light/dark separate (`--brand-primary/secondary/ink` vars + live `link[rel*="icon"]`/`meta[og:image]` via `branding-updated` event). `BrandLogo` theme-aware `brandLogoLight/Dark` fallback static `/branding/logos/*`. New page `/admin/branding` (`BrandingSettings` light/dark `Sun`/`Moon` cards, `Banner — Light`/`Logo — Light` etc. `variant="light/dark"` to avoid white-border bug, preview `Light/Dark Preview` both dark-style `bg-[#0f1225]` for visibility, `rounded-lg` on logo icons). Settings shows card `Branding → Manage branding`, control panel quick action `Branding`, shell `adminNavBranding`. Preview final: logo section uses `brandLogo*`, banner section uses `brandBanner*` (no swap), backend stores as uploaded.

**i18n migrations:** `admin/admins` (`accessControl` etc. 22 keys), `admin/guidelines` (`guidelinesTitle/Desc` etc. 12 keys), `branding` (`brandingHeader`, `brandingLogoBannerOnly`, `brandingOnlyLogoBannerDesc`, `brandNameLabel`, `lightTheme/darkTheme`, `bannerLight/DarkLabel/Hint`, `logoLight/DarkLabel/Hint`, `primary/secondary/accentColorLabel`, `lightPreview/darkPreview`, `noBanner`, `logoCheck/bannerCheck`, `saveBranding`, `brandingUpdatedMsg`, `chooseImage`, `saved`/`saveFailed` added), system admin texts `Env → System` (`adminRosterDesc`, `onlySuperAdminsCanAddDesc`, `envSource`→`System Managed`, etc.), admin toggle guards updated. `AdminManagement` add form hidden for non-superadmin (`isCurrentSuperAdmin` check).

**UI fixes:** `ConfirmDialog` (`components/ui/ConfirmDialog.tsx`) replaces native `confirm()` for payment delete & admin remove (backdrop blur, `rounded-[24px]`, red danger). `Tooltip` (`components/ui/Tooltip.tsx`) replaces native `title` hover (dark `bg-[#0f172a]` with arrow) — applied to `PaymentMethodManager` toggle/check/edit/delete + `AdminManagement` toggle/remove + `AdminTables` block/save. `textarea` audit: 8 textareas normalized to `rows=4` + `min-h-[112px] h-28 resize-none` (global `textarea{resize:none!important}` in `globals.css`), `BrandingSettings` light/dark upload preview `rounded-lg` added.

**Health & keep-alive:** Manual gateways (`bKash/Nagad/Rocket` `type=manual`) auto `ACTIVE/HEALTHY` (no check, `POST` creates `ACTIVE`, `PUT` enable guard bypass for manual, `POST /check` auto-success, cron filters `type:"gateway"` only, `GET /api/admin/payment-methods` auto-migrates legacy `NOT_CHECKED` manual → `ACTIVE`). Gateway health via `lib/payments/health.ts` + `POST /api/admin/payment-methods/[id]/check` + cron `*/5 * * * *` `app/api/cron/payment-health` (threshold 2, `INVALID_CREDENTIALS` immediate, `notifyAdmins` dedup 5min). Public `GET /api/payment/methods` filters `enabled:true, status:"ACTIVE", health:"HEALTHY", select("-gatewayConfig")`. Keep-alive: new `GET /api/health` & `GET /api/ping` (no auth, `Cache-Control: no-store`, `process.uptime()`), for Render/UptimeRobot every 5-10min.

**Build verification:** `npx tsc --noEmit` (0 errors), `npm run build` `✓ Compiled successfully` (93 routes, `+ /api/health`, `/api/ping`, `/admin/branding`), `vercel.json` crons `subscriptions` + `payment-health`, duplicate index `isDeleted` fixed, `BrandingSettings`/`BrandThemeProvider` `??`/`||` parens fixed. Tests `51 passed, 16/17 suites` (1 pre-existing `bson.mjs` ESM).

**Deployment ready:** Push to GitHub → Vercel `npm run build` → set `MONGODB_URI`, `NEXTAUTH_URL/SECRET`, `GOOGLE/GITHUB` OAuth, `CRON_SECRET`, `ADMIN_EMAILS` → add external cron `https://<domain>/api/health` every 5min → smoke test `/`, `/apps`, `/admin/branding` light/dark upload, `/admin/payments/methods` manual auto-HEALTHY toggle, gateway check, `/api/health` 200.

**Remaining phases:** 0 — all todos completed, ready to deploy.

