"use client";

import {
  useDeferredValue,
  useEffect,
  useState,
  startTransition,
  type Dispatch,
  type SetStateAction,
} from "react";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { getBrowserSupabaseClient } from "@/lib/supabase/browser";
import type { WeatherObservationRow } from "@/lib/types";
import {
  formatObservationTime,
  formatTemperature,
  formatWind,
  weatherCodeToLabel,
} from "@/lib/weather";

type DashboardState = "idle" | "loading" | "live" | "error";

function sortReports(reports: WeatherObservationRow[]) {
  return [...reports].sort((left, right) => left.city_name.localeCompare(right.city_name));
}

function upsertReport(
  reports: WeatherObservationRow[],
  nextReport: WeatherObservationRow,
): WeatherObservationRow[] {
  const existingIndex = reports.findIndex(
    (report) => report.city_slug === nextReport.city_slug,
  );

  if (existingIndex === -1) {
    return sortReports([...reports, nextReport]);
  }

  const updated = [...reports];
  updated[existingIndex] = nextReport;
  return sortReports(updated);
}

function handleRealtimeChange(
  payload: RealtimePostgresChangesPayload<Record<string, unknown>>,
  setReports: Dispatch<SetStateAction<WeatherObservationRow[]>>,
) {
  if (payload.eventType === "DELETE") {
    const previous = payload.old as Partial<WeatherObservationRow>;

    if (!previous.city_slug) {
      return;
    }

    startTransition(() => {
      setReports((current) =>
        current.filter((report) => report.city_slug !== previous.city_slug),
      );
    });
    return;
  }

  const nextReport = payload.new as WeatherObservationRow;

  startTransition(() => {
    setReports((current) => upsertReport(current, nextReport));
  });
}

export function WeatherDashboard() {
  const supabase = getBrowserSupabaseClient();
  const [reports, setReports] = useState<WeatherObservationRow[]>([]);
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [state, setState] = useState<DashboardState>(supabase ? "loading" : "error");
  const [errorMessage, setErrorMessage] = useState<string | null>(
    supabase ? null : "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.",
  );
  const [clock, setClock] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setClock(Date.now()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!supabase) {
      return;
    }

    const client = supabase;

    let isMounted = true;

    async function loadReports() {
      const { data, error } = await client
        .from("weather_observations")
        .select("*")
        .order("city_name", { ascending: true });

      if (!isMounted) {
        return;
      }

      if (error) {
        setState("error");
        setErrorMessage(error.message);
        return;
      }

      setReports(data ?? []);
      setState("live");
      setErrorMessage(null);
    }

    void loadReports();

    const channel = client
      .channel("weather-board")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "weather_observations",
        },
        (payload) => handleRealtimeChange(payload, setReports),
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          setState("live");
        }
      });

    return () => {
      isMounted = false;
      void client.removeChannel(channel);
    };
  }, [supabase]);

  const normalizedQuery = deferredQuery.trim().toLowerCase();
  const filteredReports = !normalizedQuery
    ? reports
    : reports.filter((report) => {
        const city = report.city_name.toLowerCase();
        const country = report.country.toLowerCase();
        return city.includes(normalizedQuery) || country.includes(normalizedQuery);
      });

  const hottestCity = reports.reduce<WeatherObservationRow | null>((current, report) => {
    if (!current || report.temperature_c > current.temperature_c) {
      return report;
    }
    return current;
  }, null);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 rounded-[1.5rem] bg-slate-950 px-5 py-5 text-white sm:px-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.28em] text-cyan-200">
              Realtime Weather
            </p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight">
              Live city conditions
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-slate-300">
              Results stream from Supabase Realtime as the worker refreshes current
              conditions in the database.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Status</p>
              <p className="mt-2 text-xl font-semibold capitalize">{state}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Cities</p>
              <p className="mt-2 text-xl font-semibold">{reports.length}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Warmest</p>
              <p className="mt-2 text-xl font-semibold">
                {hottestCity
                  ? `${hottestCity.city_name} ${formatTemperature(hottestCity.temperature_c)}`
                  : "--"}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <label className="block sm:max-w-sm sm:flex-1">
            <span className="sr-only">Search for a city</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Filter by city or country"
              className="w-full rounded-full border border-white/15 bg-white/8 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-400 focus:border-cyan-300"
            />
          </label>
          <p className="text-sm text-slate-300">
            Refreshed display time:{" "}
            <span className="font-medium text-white">
              {new Intl.DateTimeFormat("en-US", {
                hour: "numeric",
                minute: "2-digit",
                second: "2-digit",
                timeZone: "UTC",
                timeZoneName: "short",
              }).format(clock)}
            </span>
          </p>
        </div>
      </div>

      {errorMessage ? (
        <div className="rounded-[1.5rem] border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-900">
          {errorMessage}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filteredReports.map((report) => (
          <article
            key={report.city_slug}
            className="rounded-[1.5rem] border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-5 shadow-lg shadow-slate-900/5"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm uppercase tracking-[0.22em] text-sky-700">
                  {report.country}
                </p>
                <h3 className="mt-2 text-2xl font-semibold text-slate-950">
                  {report.city_name}
                </h3>
              </div>
              <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-medium text-white">
                {report.is_day ? "Day" : "Night"}
              </span>
            </div>

            <div className="mt-6 flex items-end justify-between gap-4">
              <div>
                <p className="text-5xl font-semibold tracking-tight text-slate-950">
                  {formatTemperature(report.temperature_c)}
                </p>
                <p className="mt-2 text-sm text-slate-600">
                  Feels like {formatTemperature(report.apparent_temperature_c)}
                </p>
              </div>
              <div className="rounded-2xl bg-sky-100 px-3 py-2 text-right text-sm text-sky-900">
                <p className="font-semibold">
                  {report.weather_label || weatherCodeToLabel(report.weather_code)}
                </p>
                <p className="mt-1">
                  {report.precipitation_mm.toFixed(1)} mm precipitation
                </p>
              </div>
            </div>

            <dl className="mt-6 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                <dt className="text-slate-500">Wind</dt>
                <dd className="mt-1 font-medium text-slate-950">
                  {formatWind(report.wind_speed_kph, report.wind_direction_deg)}
                </dd>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
                <dt className="text-slate-500">Cloud cover</dt>
                <dd className="mt-1 font-medium text-slate-950">
                  {report.cloud_cover_pct}%
                </dd>
              </div>
            </dl>

            <p className="mt-5 text-xs uppercase tracking-[0.2em] text-slate-500">
              Observed {formatObservationTime(report.observed_at)}
            </p>
          </article>
        ))}
      </div>

      {state === "loading" ? (
        <div className="rounded-[1.5rem] border border-slate-200 bg-white px-5 py-6 text-sm text-slate-600">
          Loading the latest observations from Supabase...
        </div>
      ) : null}

      {state !== "loading" && filteredReports.length === 0 ? (
        <div className="rounded-[1.5rem] border border-slate-200 bg-white px-5 py-6 text-sm text-slate-600">
          No city matched the current filter.
        </div>
      ) : null}
    </div>
  );
}
