# Goal Sparkle Tracker (Supabase Auth + Sync)

## Local setup

```sh
npm i
cp .env.example .env
npm run dev
```

Required env vars:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## Supabase setup (MVP / free tier)

1. Create a Supabase project (free tier).
2. Open SQL Editor and run `supabase/schema.sql`.
3. In **Authentication → Providers**:
   - Enable **Google** provider.
   - Add Google OAuth client ID/secret.
   - Add redirect URL: `https://<project-ref>.supabase.co/auth/v1/callback` in Google Console.
4. In **Authentication → URL Configuration**:
   - Add your local URL (for dev): `http://localhost:5173`
   - Add your production app URL.
5. Fallback auth:
   - Enable **Email** provider with magic link.

After this, users can sign in with Google, and if Google is blocked they can use the magic-link email flow.

## Data model and security

- `goals` stores per-user goal definitions.
- `goal_progress` stores per-user goal completion state and rolling history.
- Row Level Security policies restrict read/write access to rows where `user_id = auth.uid()`.
