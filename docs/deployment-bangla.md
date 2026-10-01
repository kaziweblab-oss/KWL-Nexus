# KWL-NEXUS প্রোডাকশন ডিপ্লয়মেন্ট

এই গাইড `kwl-nexus-store` কে Vercel-এ MongoDB Atlas, Google/GitHub OAuth, দৈনিক সাবস্ক্রিপশন ক্রন এবং ম্যানুয়াল পেমেন্ট সেটিংস সহ ডিপ্লয় করে।

## ডিপ্লয় করার আগে

- [ ] এই রিপোজিটরি GitHub-এ পুশ করুন।
- [ ] প্রোডাকশন MongoDB Atlas ডাটাবেস ইউজার এবং পাসওয়ার্ড নিশ্চিত করুন।
- [ ] Atlas ডাটাবেস ইউজারের প্রোডাকশন ডাটাবেসে অ্যাক্সেস আছে কিনা নিশ্চিত করুন।
- [ ] প্রোডাকশন Google এবং GitHub OAuth কলব্যাক URL তৈরি করুন।
- [ ] নতুন প্রোডাকশন-অনলি সিক্রেট জেনারেট করুন। লোকাল ভ্যালু পুনরায় ব্যবহার করবেন না।
- [ ] প্রোডাকশন অ্যাডমিন ইমেইল ঠিক করুন।
- [ ] bKash, Nagad এবং Rocket পেমেন্ট নম্বর নিশ্চিত করুন।

## Vercel প্রজেক্ট

### ড্যাশবোর্ড ফ্লো

1. [Vercel](https://vercel.com) খুলুন এবং **Add New > Project** সিলেক্ট করুন।
2. `kwl-nexus-store` রিপোজিটরি ইমপোর্ট করুন।
3. ফ্রেমওয়ার্ক প্রিসেট **Next.js** রাখুন।
4. ডিফল্ট বিল্ড কমান্ড `npm run build` ব্যবহার করুন।
5. ডিফল্ট আউটপুট ডিরেক্টরি এবং ইনস্টল কমান্ড `npm install` ব্যবহার করুন।
6. **Production** এর জন্য নিচের এনভায়রনমেন্ট ভেরিয়েবল যোগ করুন, প্রয়োজনে আলাদাভাবে Preview এর জন্যও যোগ করুন।
7. ডিপ্লয় করুন এবং বিল্ড শেষ হওয়া পর্যন্ত অপেক্ষা করুন।

### CLI ফ্লো (ঐচ্ছিক)

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

## প্রোডাকশন এনভায়রনমেন্ট ভেরিয়েবল

Vercel Project Settings > Environment Variables এ সেট করুন। নিচের ভ্যালুগুলো শুধু নাম, আসল ভ্যালু কখনো কমিট করবেন না।

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

`MONGODB_URI` পাসওয়ার্ডে `@`, `:`, `/`, `?` বা `#` থাকলে URL-এনকোড করতে হবে। `bad auth` এরর মানে Atlas ইউজার/পাসওয়ার্ড বা এনকোডেড কানেকশন স্ট্রিং ঠিক করতে হবে।

## OAuth কলব্যাক URL

`<production-domain>` কে Vercel URL বা কাস্টম ডোমেইন দিয়ে রিপ্লেস করুন।

Google OAuth redirect URI:

```text
https://<production-domain>/api/auth/callback/google
```

GitHub OAuth callback URL:

```text
https://<production-domain>/api/auth/callback/github
```

লোকাল কলব্যাক URL ডেভেলপমেন্ট OAuth অ্যাপে রেখে দিন। প্রোডাকশন ভেরিফাই না হওয়া পর্যন্ত লোকাল ভ্যালু পরিবর্তন করবেন না।

## MongoDB Atlas

1. প্রোডাকশন Atlas ক্লাস্টার তৈরি বা সিলেক্ট করুন।
2. ন্যূনতম প্রয়োজনীয় পারমিশন সহ ডেডিকেটেড ডাটাবেস ইউজার তৈরি করুন।
3. প্রোডাকশন ডাটাবেস তৈরি করুন, যেমন `kwl-nexus-store-production`।
4. ড্রাইভার কানেকশন স্ট্রিং কপি করে `MONGODB_URI` হিসেবে Vercel-এ সেট করুন।
5. **Network Access** এ Vercel কে কানেক্ট করার অনুমতি দিন। Vercel সার্ভারলেস ফাংশনের স্থায়ী IP নেই; Atlas/Vercel ইন্টিগ্রেশন বা Vercel egress অপশন ব্যবহার করুন। `0.0.0.0/0` ফলব্যাক, শক্তিশালী পাসওয়ার্ড এবং least-privilege দিয়ে সুরক্ষিত রাখতে হবে।
6. Atlas ইউজারের রিড/রাইট অ্যাক্সেস আছে কিনা যাচাই করুন।

## GitHub Webhook

প্রোডাকশন URL লাইভ হওয়ার পর GitHub রিপোজিটরিতে webhook যোগ করুন:

- Payload URL: `https://<production-domain>/api/webhooks/github`
- Content type: `application/json`
- Secret: `GITHUB_WEBHOOK_SECRET` এর সমান
- Events: **Let me select individual events** সিলেক্ট করে **Releases** এনেবল করুন
- Active: enabled

এন্ডপয়েন্ট `x-hub-signature-256` ভ্যালিডেট করে এবং publish/created রিলিজ অ্যাসেট স্টোর করে।

## Vercel Cron

`vercel.json` দুটি ক্রন শিডিউল করে:

- `/api/cron/subscriptions` at `0 0 * * *` (প্রতিদিন 00:00 UTC) — সাবস্ক্রিপশন মেয়াদ শেষ।
- `/api/cron/payment-health` at `*/5 * * * *` (প্রতি 5 মিনিট) — গেটওয়ে হেলথ: `enabled:true` (5min) + `FAILED` রিকভারি (প্রতি ঘন্টা), থ্রেশহোল্ড 2 ব্যর্থতা (INVALID_CREDENTIALS তাৎক্ষণিক), অটো-ডিসেবল + নোটিফিকেশন।

উভয়ের জন্য প্রয়োজন:

```text
Authorization: Bearer <CRON_SECRET>
```

Vercel Cron প্রোডাকশনে স্বয়ংক্রিয়ভাবে রিকোয়েস্ট পাঠায়। Vercel ডিপ্লয়মেন্ট লগে প্রথম invocation নিশ্চিত করুন।

## Keep-Alive এন্ডপয়েন্ট (Render/Vercel Cold Start)

ব্যাকএন্ড সক্রিয় রাখার জন্য ফ্রি হালকা এন্ডপয়েন্ট — কোনো auth, DB, খরচ নেই:

```text
GET https://<production-domain>/api/health
GET https://<production-domain>/api/ping
HEAD https://<production-domain>/api/health
```

`{ status: "ok", timestamp: "..." }` রিটার্ন করে `Cache-Control: no-store` সহ। Render ফ্রি টিয়ারের জন্য UptimeRobot/cron-job.org দিয়ে `/api/health` প্রতি 5-10 মিনিটে হিট করুন।

## ব্র্যান্ডিং ম্যানেজমেন্ট

- নতুন পেজ `/admin/branding` (সিস্টেম সুপার-অ্যাডমিন) — লাইট ও ডার্ক আলাদা আপলোড **Logo** (`brandLogoLight` / `brandLogoDark`) এবং **Banner** (`brandBannerLight` / `brandBannerDark`) + কালার `primary/secondary/accent`। `SystemConfig` এ স্টোর, `GET /api/system-config` (পাবলিক) এবং `PUT /api/admin/system-config` (অ্যাডমিন, zod ভ্যালিডেটেড) দিয়ে সার্ভ করা হয়। `BrandThemeProvider` `CSS vars --brand-primary/secondary/ink` + `branding-updated` ইভেন্টে লাইভ favicon/og আপডেট করে।
- সেটিংস পেজে `Branding` কার্ড → `Manage branding` (Payment Methods / Tutorial Video এর মতো) `/admin/branding` এ লিংক করে।
- কন্ট্রোল প্যানেল (`/admin`) এ কুইক অ্যাকশন `Branding` যোগ করা হয়েছে।
- `BrandLogo` কম্পোনেন্ট `next-themes` `resolvedTheme` অনুযায়ী `brandLogoLight/Dark` ব্যবহার করে, ফলব্যাক `/branding/logos/*`।

## অ্যাডমিন এবং পেমেন্ট সেটআপ

প্রথম সফল ডিপ্লয়মেন্টের পর:

1. `ADMIN_EMAILS` এ তালিকাভুক্ত Google অ্যাকাউন্ট দিয়ে সাইন ইন করুন।
2. `/admin/branding` খুলুন — Light/Dark লোগো ও ব্যানার আপলোড করুন, primary/secondary/accent কালার সেট করুন, Save করুন।
3. `/admin/settings` খুলুন — ইন্টিগ্রেশন, টিউটোরিয়াল ভিডিও এবং পেমেন্ট মেথড কার্ড দিয়ে ম্যানেজ করুন।
4. `/admin/guidelines` খুলুন — আপডেট গাইডলাইন এডিট করুন।
5. `/admin/admins` খুলুন — অ্যাডমিন যোগ/মুছুন, সুপারঅ্যাডমিন টগল করুন (নিজের বা env `ADMIN_EMAILS` পরিবর্তন করা যায় না)।
6. API key জেনারেট করুন এবং প্লেইনটেক্সট নিরাপদ পাসওয়ার্ড ম্যানেজারে রাখুন। এটি শুধু একবার দেখানো হয়।
7. `/admin/payments` খুলুন এবং অ্যাডমিন অ্যাক্সেস কাজ করছে কিনা যাচাই করুন (ম্যানুয়াল bKash/Nagad/Rocket অটো `ACTIVE/HEALTHY`, গেটওয়ে `stripe/sslcommerz` হেলথ চেক প্রয়োজন)।
8. পেমেন্ট গ্রহণের আগে প্রোডাকশন অ্যাপ এবং প্ল্যান তৈরি বা ইমপোর্ট করুন।

## প্রোডাকশন ওয়ার্কফ্লো

### নতুন অ্যাপ যোগ করা

1. `/admin/apps` খুলুন এবং **Add from GitHub** ক্লিক করুন (অ্যাডমিন অ্যাকাউন্টে GitHub OAuth প্রয়োজন)।
2. রিপোজিটরি ব্রাউজ/সিলেক্ট করুন (প্রাইভেট রিপো তালিকাভুক্ত হবে যখন `/admin/settings/github` এ PAT কনফিগার করা থাকে)। ইমপোর্ট MongoDB তে `App` ড্রাফট তৈরি করে।
3. নাম, slug, বর্ণনা, ক্যাটাগরি, প্রাইসিং, published ফ্ল্যাগ এবং ডাউনলোড URL পূরণ করুন।
4. অ্যাপের অধীনে প্ল্যান যোগ করুন (নাম, মূল্য, ইন্টারভাল, মেয়াদ দিন, রিফান্ড পলিসি)। প্ল্যান `Plans` কালেকশনে স্টোর হয় এবং `/apps/[id]` মার্কেটপ্লেস ও পেমেন্ট ফ্লো চালায়।
5. ঐচ্ছিক: প্রিভিউ ইমেজ/ভিডিও, স্ক্রিনশট এবং টিউটোরিয়াল সেট করুন।
6. **Published** = on করুন। এটি এখন `/apps` সার্চে দেখা যাবে।

### অ্যাক্টিভেশন ফ্লো (পেমেন্ট → সক্রিয় সাবস্ক্রিপশন)

1. ইউজার সাইন ইন করে, অ্যাপ খোলে এবং `/apps/[id]` (বা `/payment`) এ পেমেন্ট রিকোয়েস্ট জমা দেয়। এটি `pending` স্ট্যাটাস সহ `Payment` এবং ইউজার নোটিফিকেশন তৈরি করে।
2. ইউজারকে ডাউনলোড পেজে পেন্ডিং স্টেট (`⏳ Subscription pending`) দেখানো হয়।
3. অ্যাডমিন `/admin/payments` খুলে রিকোয়েস্ট রিভিউ করে **Verify** বা **Reject** করে।
4. Verify এ API `active` `Subscription` তৈরি করে, পেমেন্ট `succeeded` করে এবং "Payment approved" নোটিফিকেশন পাঠায়।
5. Reject এ পেমেন্ট `failed` করে এবং কারণ সহ নোটিফিকেশন পাঠায়।
6. ইউজার `/my-orders` এবং ড্যাশবোর্ডে নতুন সাবস্ক্রিপশন দেখে; অ্যাপ `/api/download/[appId]` দিয়ে ডাউনলোডযোগ্য হয়।
7. দৈনিক ক্রন (`/api/cron/subscriptions`, `0 0 * * *`) মেয়াদোত্তীর্ণ সাবস্ক্রিপশন expire করে।

### Mock-data নোট

ডামি ক্যাটালগ ডাটা (`lib/data/apps`) প্রোডাকশনে `process.env.NODE_ENV === "production"` গার্ড দিয়ে সাপ্রেস করা হয়। আসল প্রোডাকশন ডাটা MongoDB `Apps`, `Plans` ইত্যাদি থেকে আসতে হবে।

## Smoke Test চেকলিস্ট

- [ ] `https://<production-domain>/` লোড হয়।
- [ ] `/apps` সার্চ, ফিল্টার, পেজিনেশন কাজ করে।
- [ ] `/apps/focus-flow` লোড হয় এবং পেমেন্ট নির্দেশনা দেখায়।
- [ ] Google সাইন-ইন/আউট কাজ করে।
- [ ] অ্যাডমিন অ্যাকাউন্টে GitHub সাইন-ইন কাজ করে।
- [ ] `/admin` অননুমোদিত ইউজারকে ব্লক করে।
- [ ] `/admin/apps/new` GitHub রিপোজিটরি তালিকা দেখায়।
- [ ] `/docs` এবং `/docs/console` লোড হয়।
- [ ] `/api/docs/openapi`, `/api/docs/postman`, `/api/docs/pdf` ডাউনলোড হয়।
- [ ] বৈধ `x-api-key` দিয়ে `GET /api/apps` কাজ করে।
- [ ] অবৈধ API key `401` দেয়।
- [ ] অসম্পূর্ণ পেমেন্ট রিকোয়েস্ট ভ্যালিডেশন ব্যর্থ হয়।
- [ ] ফিডব্যাক জমা এবং অ্যাডমিন মডারেশন কাজ করে।
- [ ] GitHub webhook বৈধ সিগনেচার সহ সফল রেসপন্স দেয়।
- [ ] Vercel Cron লগে invocation দেখা যায়।
- [ ] Atlas এ সঠিক প্রোডাকশন ডাটাবেসে ডাটা তৈরি হয়।
- [ ] সিকিউরিটি হেডার আছে।

## কাস্টম ডোমেইন (ঐচ্ছিক)

1. Vercel Project Settings > Domains এ `example.com` যোগ করুন।
2. Vercel যে DNS রেকর্ড দেখায় তা কপি করুন।
3. ডোমেইন রেজিস্ট্রারে `A`, `AAAA` বা `CNAME` যোগ করুন।
4. DNS এবং TLS এর জন্য অপেক্ষা করুন।
5. `NEXTAUTH_URL` কে `https://example.com` এ আপডেট করুন।
6. কাস্টম ডোমেইনের Google/GitHub কলব্যাক যোগ করুন।
7. GitHub webhook Payload URL আপডেট করুন।
8. এনভায়রনমেন্ট পরিবর্তনের পর রিডিপ্লয় করুন।

## Rollback

- Vercel Deployments থেকে শেষ ভালো ডিপ্লয়মেন্ট promote করুন।
- MongoDB মাইগ্রেশন অটো রোলব্যাক করবেন না।
- এনভায়রনমেন্ট ভেরিয়েবল পরিবর্তন আলাদাভাবে রিভার্ট করুন।

## সিকিউরিটি নোট

- `.env.local`, প্রোডাকশন সিক্রেট কখনো কমিট করবেন না।
- আলাদা OAuth অ্যাপ, ডাটাবেস ইউজার এবং সিক্রেট ব্যবহার করুন।
- এক্সপোজ হলে `NEXTAUTH_SECRET`, webhook secret, cron secret রোটেট করুন।
- ডিপ্লয়ের আগে `npm audit` রিভিউ করুন।
