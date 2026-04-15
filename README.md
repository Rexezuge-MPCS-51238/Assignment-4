# Assignment 4: Live Weather Board

This project implements the Assignment 4 system as a realtime weather dashboard:

Open-Meteo -> Railway worker -> Supabase Postgres + Realtime -> Next.js frontend on Vercel

## What is included

- `src/`: Next.js frontend that reads `weather_observations` from Supabase and subscribes to realtime updates.
- `worker/`: Node worker that polls Open-Meteo for a fixed set of cities and upserts the latest weather snapshot.
- `supabase/schema.sql`: Database schema, RLS policy, and realtime publication setup.
- `.env.example`: Environment variables for Vercel and Railway.

## Local setup

1. Run the SQL in `supabase/schema.sql` inside your Supabase SQL editor.
2. Copy `.env.example` to `.env.local` for the frontend and `.env` for the worker as needed.
3. Install dependencies with `npm install`.
4. Start the frontend with `npm run dev`.
5. In a second terminal, run the worker with `npm run worker`.

## Required environment variables

Frontend:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Worker:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `POLL_INTERVAL_MS`
- `WORKER_RUN_ONCE`

## Deployment notes

- Vercel: deploy the Next.js app and add the two `NEXT_PUBLIC_...` variables.
- Railway: deploy the same repo or worker folder with start command `npm run worker`.
- Supabase: enable Realtime and run `supabase/schema.sql`.

## Customizing the dataset

Edit `worker/cities.mjs` to change the tracked cities. The frontend updates automatically because it renders whatever rows exist in `weather_observations`.
