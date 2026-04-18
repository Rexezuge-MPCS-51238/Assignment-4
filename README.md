# Assignment 4: Live Weather Board

This project implements the Assignment 4 system as a realtime weather dashboard:

Open-Meteo -> Railway worker -> Supabase Postgres + Realtime -> Next.js frontend on Vercel

See `CLAUDE.md` for the full architecture, data flow, and auth model.

## What is included

- `src/`: Next.js frontend with Clerk auth. Reads `weather_observations` from
  Supabase, subscribes to realtime updates, and lets signed-in users star
  favorite cities.
- `worker/`: Node worker that polls Open-Meteo for a fixed set of cities and
  upserts the latest weather snapshot.
- `supabase/schema.sql`: Database schema, RLS policies, realtime publication,
  and the `user_favorites` table.
- `.mcp.json`: Supabase MCP server configuration.
- `.env.example`: Environment variables for Vercel and Railway.

## Local setup

1. Run the SQL in `supabase/schema.sql` inside your Supabase SQL editor.
2. Copy `.env.example` to `.env.local` and fill in values.
3. Install dependencies with `npm install`.
4. Start the frontend with `npm run dev`.
5. In a second terminal, run the worker with `npm run worker`.

## Required environment variables

Frontend:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (used by /api/favorites)

Worker:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `POLL_INTERVAL_MS`
- `WORKER_RUN_ONCE`

## Auth + Favorites

- Sign in / sign up through the Clerk modal in the top-right header (or via
  the catch-all `/sign-in` and `/sign-up` routes).
- Signed-in users see a star on each weather card; tapping it toggles a row
  in `user_favorites`.
- Use the "My cities" toggle in the filter row to show only starred cards.
- Favorites are server-scoped — API routes enforce `user_id` via `WHERE`
  using the service-role Supabase client. Do **not** expose the service-role
  key to the browser.

## Deployment notes

- Vercel: deploy the Next.js app and add the frontend env vars listed above.
- Railway: deploy the same repo with start command `npm run worker` and add
  the worker env vars.
- Supabase: enable Realtime and run `supabase/schema.sql`.

## Customizing the dataset

Edit `worker/cities.mjs` to change the tracked cities. The frontend updates
automatically because it renders whatever rows exist in `weather_observations`.
