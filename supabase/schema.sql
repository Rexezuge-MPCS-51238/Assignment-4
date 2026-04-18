create table if not exists public.weather_observations (
  city_slug text primary key,
  city_name text not null,
  country text not null,
  latitude double precision not null,
  longitude double precision not null,
  temperature_c double precision not null,
  apparent_temperature_c double precision not null,
  precipitation_mm double precision not null default 0,
  weather_code integer not null,
  weather_label text not null,
  cloud_cover_pct integer not null default 0,
  wind_speed_kph double precision not null default 0,
  wind_direction_deg integer not null default 0,
  is_day boolean not null default true,
  observed_at timestamptz not null,
  fetched_at timestamptz not null default timezone('utc', now())
);

create index if not exists weather_observations_observed_at_idx
  on public.weather_observations (observed_at desc);

alter table public.weather_observations enable row level security;

drop policy if exists "Public can read weather observations" on public.weather_observations;
create policy "Public can read weather observations"
  on public.weather_observations
  for select
  to anon, authenticated
  using (true);

alter table public.weather_observations replica identity full;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'weather_observations'
  ) then
    alter publication supabase_realtime add table public.weather_observations;
  end if;
end
$$;

create table if not exists public.user_favorites (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  city_slug text not null references public.weather_observations(city_slug) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  unique (user_id, city_slug)
);

create index if not exists user_favorites_user_id_idx
  on public.user_favorites (user_id);

-- RLS intentionally disabled on user_favorites: API routes enforce user_id via WHERE
-- using the service role key, mirroring the Assignment-3 saved_recipes pattern.
