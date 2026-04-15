import { createClient } from "@supabase/supabase-js";
import { TRACKED_CITIES } from "./cities.mjs";

const WEATHER_CODES = {
  0: "Clear sky",
  1: "Mainly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Fog",
  48: "Rime fog",
  51: "Light drizzle",
  53: "Drizzle",
  55: "Dense drizzle",
  56: "Freezing drizzle",
  57: "Heavy freezing drizzle",
  61: "Light rain",
  63: "Rain",
  65: "Heavy rain",
  66: "Freezing rain",
  67: "Heavy freezing rain",
  71: "Light snow",
  73: "Snow",
  75: "Heavy snow",
  77: "Snow grains",
  80: "Rain showers",
  81: "Heavy rain showers",
  82: "Violent rain showers",
  85: "Snow showers",
  86: "Heavy snow showers",
  95: "Thunderstorm",
  96: "Thunderstorm with hail",
  99: "Severe thunderstorm with hail",
};

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const pollIntervalMs = Number.parseInt(process.env.POLL_INTERVAL_MS ?? "300000", 10);
const runOnce = process.env.WORKER_RUN_ONCE === "true";

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

function weatherCodeToLabel(code) {
  return WEATHER_CODES[code] ?? "Unclassified weather";
}

async function fetchCityObservation(city) {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(city.latitude));
  url.searchParams.set("longitude", String(city.longitude));
  url.searchParams.set(
    "current",
    [
      "temperature_2m",
      "apparent_temperature",
      "is_day",
      "precipitation",
      "weather_code",
      "cloud_cover",
      "wind_speed_10m",
      "wind_direction_10m",
    ].join(","),
  );
  url.searchParams.set("timezone", "UTC");

  const response = await fetch(url.toString(), {
    headers: {
      "User-Agent": "mpcs-51238-assignment-4-worker/1.0",
    },
  });

  if (!response.ok) {
    throw new Error(`Open-Meteo request failed with ${response.status}.`);
  }

  const payload = await response.json();
  const current = payload.current;

  if (!current) {
    throw new Error(`Open-Meteo returned no current weather for ${city.city_name}.`);
  }

  return {
    city_slug: city.city_slug,
    city_name: city.city_name,
    country: city.country,
    latitude: city.latitude,
    longitude: city.longitude,
    temperature_c: current.temperature_2m,
    apparent_temperature_c: current.apparent_temperature,
    precipitation_mm: current.precipitation,
    weather_code: current.weather_code,
    weather_label: weatherCodeToLabel(current.weather_code),
    cloud_cover_pct: current.cloud_cover,
    wind_speed_kph: current.wind_speed_10m,
    wind_direction_deg: current.wind_direction_10m,
    is_day: Boolean(current.is_day),
    observed_at: current.time.endsWith("Z") ? current.time : `${current.time}Z`,
    fetched_at: new Date().toISOString(),
  };
}

async function pollOnce() {
  console.log(`[worker] polling ${TRACKED_CITIES.length} cities at ${new Date().toISOString()}`);

  const results = await Promise.allSettled(TRACKED_CITIES.map(fetchCityObservation));
  const successful = results
    .filter((result) => result.status === "fulfilled")
    .map((result) => result.value);

  results
    .filter((result) => result.status === "rejected")
    .forEach((result) => {
      console.error("[worker] city poll failed:", result.reason);
    });

  if (successful.length === 0) {
    throw new Error("All city polls failed.");
  }

  const { error } = await supabase
    .from("weather_observations")
    .upsert(successful, { onConflict: "city_slug" });

  if (error) {
    throw error;
  }

  console.log(`[worker] upserted ${successful.length} weather snapshots`);
}

async function runLoop() {
  do {
    try {
      await pollOnce();
    } catch (error) {
      console.error("[worker] poll cycle failed:", error);
    }

    if (runOnce) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  } while (true);
}

await runLoop();
