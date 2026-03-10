# Goal Sparkle Tracker (Supabase Auth + Sync)

A Vite + React app backed by Supabase Auth and Postgres, designed to run on mostly-free infrastructure.

## Stack (free/low-cost)

- **Frontend hosting:**
  - Cloudflare Pages (free tier), or
  - Vercel (Hobby/free tier)
- **Backend/Auth/DB:** Supabase (free tier)
- **Optional monitoring:** Sentry free tier (or equivalent)

## 1) Local setup

### Prerequisites

- Node.js 20+
- npm 10+
- A Supabase project

### Run locally

```sh
npm install
cp .env.example .env
npm run dev
```

The app expects the following required env vars:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

See `.env.example` for all setup and callback-related placeholders.

### Prepare database schema

1. Create a Supabase project.
2. Open **Supabase → SQL Editor**.
3. Run `supabase/schema.sql`.

## 2) Auth provider setup (Google OAuth)

Use Supabase Auth as the OAuth broker.

### In Supabase

1. Go to **Authentication → Providers → Google**.
2. Enable Google provider.
3. Add your Google OAuth Client ID and secret.

### In Google Cloud Console

Create OAuth credentials and set:

- **Authorized redirect URI**:
  - `https://<your-project-ref>.supabase.co/auth/v1/callback`

### URL allow-lists in Supabase

In **Authentication → URL Configuration** configure:

- **Site URL**
  - Local: `http://localhost:5173`
  - Production: your deployed frontend URL (`https://<your-domain>`)
- **Additional Redirect URLs**
  - Include both local and production URLs if you use both environments.

For resilience, keep **Email (magic link)** enabled as a fallback sign-in method.

## 3) Deploy steps

## Option A: Cloudflare Pages (free)

1. Push this repository to GitHub.
2. In Cloudflare Pages: **Create project → Connect to Git**.
3. Build configuration:
   - Framework preset: `Vite`
   - Build command: `npm run build`
   - Build output directory: `dist`
4. Add environment variables in Pages project settings:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Deploy.
6. Copy the Pages URL and add it in Supabase Auth URL configuration (Site URL / redirect URLs).

## Option B: Vercel (Hobby/free)

1. Import repository in Vercel.
2. Framework preset: `Vite` (usually auto-detected).
3. Add environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Deploy.
5. Add the Vercel production URL and preview URL pattern (if needed) to Supabase Auth redirect allow-list.

## 4) Operational limits on free tiers (what to expect)

Limits change over time, so always confirm current provider docs before launch.

- **Supabase free tier** commonly includes project/database/storage limits and may pause inactive projects.
- **Cloudflare Pages free tier** includes generous static hosting, but has build/minutes and integration limits.
- **Vercel Hobby** includes bandwidth/build/runtime limits and restricted team/commercial usage scenarios.
- **OAuth providers** (Google) may enforce consent-screen/testing constraints until app verification.

Plan for:

- Periodic DB cleanup/backups.
- Monitoring auth failures and quota spikes.
- A path to upgrade when usage grows.

## 5) Basic monitoring / error tracking (optional)

Recommended low-cost setup:

- Add **Sentry** browser SDK on the frontend (free tier is enough for early-stage projects).
- Capture:
  - uncaught exceptions,
  - failed Supabase auth events,
  - key user-flow errors (goal create/update/delete).

At minimum, configure alerting for repeated auth callback failures and client-side crashes after deploy.

## Data model and security

- `goals` stores per-user goal definitions.
- `goal_progress` stores per-user goal completion state and rolling history.
- Row Level Security policies restrict read/write access to rows where `user_id = auth.uid()`.
