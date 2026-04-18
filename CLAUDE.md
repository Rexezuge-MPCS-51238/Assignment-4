# Live Weather Board

A realtime weather dashboard that polls a live data source in a background
worker, writes to Supabase, and streams updates to a Next.js frontend.

## Architecture

```
Open-Meteo API
     │  HTTPS poll every POLL_INTERVAL_MS (default 5 min)
     ▼
Railway worker (worker/index.mjs)
     │  upsert via Supabase service-role key
     ▼
Supabase Postgres (weather_observations, user_favorites)
     │  Realtime pubsub on weather_observations
     ▼
Next.js on Vercel (src/)
     ├─ browser reads weather_observations directly (anon key + RLS)
     └─ /api/favorites routes read/write user_favorites via service-role
```

## Directory Layout

This repo is a flat monorepo — two independent deploy targets sharing one
`package.json`. We deliberately do **not** use `apps/web/` + `apps/worker/`
because the current split already works with Vercel's root-directory default
and Railway's `npm run worker` start command; restructuring would churn both
platform configs for zero functional gain.

| Path                   | Purpose                                                   |
|------------------------|-----------------------------------------------------------|
| `src/app/`             | Next.js App Router pages, layout, API routes              |
| `src/components/`      | Dashboard UI + favorite star button                       |
| `src/lib/supabase/`    | `browser.ts` (anon client) and `server.ts` (service role) |
| `src/lib/weather.ts`   | Weather-code labels and format helpers                    |
| `src/middleware.ts`    | Clerk middleware                                          |
| `worker/`              | Node ESM poller deployed to Railway                       |
| `supabase/schema.sql`  | Idempotent schema, RLS, and realtime publication          |

## Data Model

### `weather_observations`
Primary key: `city_slug`. One row per tracked city, overwritten on every poll.
- RLS **on**, policy `Public can read weather observations` grants `select` to
  `anon` + `authenticated`.
- `replica identity full` so Realtime emits full old/new rows.
- Added to the `supabase_realtime` publication.

### `user_favorites`
`(id uuid, user_id text, city_slug text, created_at timestamptz)` with
`unique(user_id, city_slug)` and `on delete cascade` from `weather_observations`.
- RLS intentionally **off**. API routes use the service-role client and
  enforce ownership via `.eq('user_id', userId)`. Mirrors the Assignment-3
  `saved_recipes` pattern.
- Browser never touches this table directly.

## Auth Model

- **Clerk v7** owns identity. `<ClerkProvider>` wraps the app; a modal SignIn
  / SignUp flow is embedded in the global header (`src/app/layout.tsx`).
- Signed-in / signed-out branching uses Clerk v7's `<Show when="signed-in">`
  / `<Show when="signed-out">` — the older `<SignedIn>` / `<SignedOut>`
  components were removed in v7. Fallback `/sign-in` and `/sign-up`
  catch-all routes are provided for deep links.
- `src/middleware.ts` runs `clerkMiddleware()` over all non-static routes. No
  route gating at the middleware — gating happens in API routes via `auth()`.
  Next.js 16 emits a deprecation warning suggesting `proxy.ts`; we stay on
  `middleware.ts` until Clerk officially supports the new convention.
- API routes in `src/app/api/favorites/` call `auth()` from
  `@clerk/nextjs/server`, reject unauthenticated requests with 401, and scope
  queries by `userId`.
- The dashboard is public: anyone can see live city data. Sign-in unlocks
  per-card star buttons and the "My cities" filter toggle.

## API Contract

| Method | Path                      | Auth     | Body / Params            | Behavior                                                              |
|--------|---------------------------|----------|--------------------------|-----------------------------------------------------------------------|
| GET    | `/api/favorites`          | Required | —                        | Returns `{ favorites: [{ city_slug }] }` for the current `userId`.    |
| POST   | `/api/favorites`          | Required | `{ city_slug }`          | Upserts `(user_id, city_slug)`. Dedup via `unique(user_id, city_slug)`. |
| DELETE | `/api/favorites/[slug]`   | Required | `slug` = URL-encoded     | Deletes rows matching `user_id` AND `city_slug`.                      |

All three use `runtime = "nodejs"` and the server-role Supabase client at
`src/lib/supabase/server.ts` — **never import that module from a client
component**.

## Data Flow

1. Worker boots, calls Open-Meteo `current` endpoint for each city in
   `worker/cities.mjs` (Chicago, Tokyo, Nairobi, Berlin, Sao Paulo, Sydney).
2. Worker upserts a single row per `city_slug` into `weather_observations` via
   the service-role client.
3. Postgres emits a logical replication event to the `supabase_realtime`
   publication.
4. Browser's `WeatherDashboard` component holds a channel subscription and
   upserts the new row into local state — the card re-renders in place.
5. Signed-in users click a star; the browser POSTs/DELETEs `/api/favorites`
   which writes `user_favorites` server-side.

### Polling cadence + rate limits

Open-Meteo's free tier caps at **10,000 requests/day** across your whole
worker. With 6 tracked cities:

| `POLL_INTERVAL_MS` | Requests/day | Notes                                         |
|--------------------|--------------|-----------------------------------------------|
| `300000` (5 min)   | ~1,728       | Default. Safe headroom for more cities.       |
| `60000` (1 min)    | ~8,640       | Comfortably under the cap.                    |
| `30000` (30 sec)   | ~17,280      | **Exceeds free tier** — expect 429s.          |

Open-Meteo itself updates most fields hourly, so polling faster than ~5 min
rarely surfaces new data. Prefer lowering `POLL_INTERVAL_MS` in Railway over
shipping a smaller default.

## Environment Variables

| Name                                              | Scope          | Notes                                       |
|---------------------------------------------------|----------------|---------------------------------------------|
| `NEXT_PUBLIC_SUPABASE_URL`                        | Browser        | Public Supabase project URL                 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`                   | Browser        | Read-only anon key                          |
| `SUPABASE_URL`                                    | Server/worker  | Same project URL (worker reads this)        |
| `SUPABASE_SERVICE_ROLE_KEY`                       | Server/worker  | Server-only — never expose to the browser   |
| `POLL_INTERVAL_MS`                                | Worker         | Poll cadence, default `300000`              |
| `WORKER_RUN_ONCE`                                 | Worker         | `true` to poll once and exit (local dev)    |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`               | Browser        | Clerk                                       |
| `CLERK_SECRET_KEY`                                | Server         | Clerk                                       |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL`                   | Browser        | `/sign-in`                                  |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL`                   | Browser        | `/sign-up`                                  |
| `NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL` | Browser        | `/`                                         |
| `NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL` | Browser        | `/`                                         |

**Never put secrets in `NEXT_PUBLIC_*`.** The service-role key and Clerk
secret key must stay server-only.

## Local Development

```bash
npm install
cp .env.example .env.local   # fill in all values
# run supabase/schema.sql in the Supabase SQL editor (idempotent)
npm run dev                  # starts Next.js on :3000
npm run worker               # in a second terminal
```

Set `WORKER_RUN_ONCE=true` during development so the worker polls once and
exits instead of looping.

## Deployment

- **Vercel**: import the repo, set all `NEXT_PUBLIC_*` + `CLERK_SECRET_KEY` +
  `SUPABASE_SERVICE_ROLE_KEY` env vars. Root directory stays at the repo root.
- **Railway**: import the same repo, set `SUPABASE_URL`,
  `SUPABASE_SERVICE_ROLE_KEY`, `POLL_INTERVAL_MS`, and a start command of
  `npm run worker`.
- **Supabase**: create the project, run `supabase/schema.sql`, confirm
  Realtime is enabled for `weather_observations`.

## Customizing

- Edit `worker/cities.mjs` to change the tracked city list — the frontend
  automatically picks up whatever rows exist in `weather_observations`.
- Stale favorites are pruned automatically because `user_favorites.city_slug`
  has `on delete cascade`.
- To change poll cadence, set `POLL_INTERVAL_MS` in Railway's Variables tab;
  the worker re-reads it on next restart.

## Verified

- `npm run build` passes (Next.js 16.2.2 Turbopack, 4 routes + API + catch-alls).
- `npm run lint` passes clean.
- `supabase/schema.sql` is idempotent (`if not exists` / `drop ... if exists`);
  safe to re-run any time.
