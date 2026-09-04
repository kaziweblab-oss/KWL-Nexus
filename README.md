# KWL-NEXUS Store

KWL-NEXUS is a production-style app marketplace and content platform built with Next.js, TypeScript, Tailwind CSS, MongoDB, and NextAuth.

## Stack

- Next.js 14 App Router
- TypeScript
- Tailwind CSS
- MongoDB + Mongoose
- NextAuth v4
- Lucide icons
- Jest + Testing Library

## Features

- App catalog and detail pages
- Admin dashboard and settings
- GitHub app import workflow
- Payment and subscription flow
- Feedback and moderation
- Contact management
- Branding system
- Data export tools
- Version rollback support
- Polish: loading UI, notifications, custom 404/error pages

## Local setup

1. Install dependencies:
   npm install
2. Copy environment variables to `.env.local`:
   - MONGODB_URI
   - NEXTAUTH_URL
   - NEXTAUTH_SECRET
   - GOOGLE_CLIENT_ID
   - GOOGLE_CLIENT_SECRET
   - ADMIN_EMAILS
3. Start the app:
   npm run dev
4. Visit http://localhost:3000

## Admin access

Add the admin email address to `ADMIN_EMAILS` in `.env.local`.

## Key routes

- Public store: `/`
- Apps directory: `/apps`
- App detail: `/apps/[id]`
- Dashboard: `/dashboard`
- Admin: `/admin`
- Contact management: `/admin/contact`
- Export page: `/admin/export`
- Settings: `/admin/settings`

## Production notes

- MongoDB must be reachable from the deployment environment.
- Use Vercel or a Node-compatible host with environment secrets configured.
- For branding changes, visit `/admin/settings` and save the theme updates.
- Contact links, app data, and export actions depend on MongoDB availability.

## Testing

Run:

```bash
npm test
```

Run a production build:

```bash
npm run build
```
