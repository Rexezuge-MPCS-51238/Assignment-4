"use client";

import { useState } from "react";

type FavoriteStarProps = {
  citySlug: string;
  cityName: string;
  isFavorite: boolean;
  onChange: (citySlug: string, nextValue: boolean) => void;
};

export function FavoriteStar({
  citySlug,
  cityName,
  isFavorite,
  onChange,
}: FavoriteStarProps) {
  const [busy, setBusy] = useState(false);

  async function toggle() {
    if (busy) return;
    setBusy(true);

    const nextValue = !isFavorite;
    onChange(citySlug, nextValue);

    try {
      const response = nextValue
        ? await fetch("/api/favorites", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ city_slug: citySlug }),
          })
        : await fetch(`/api/favorites/${encodeURIComponent(citySlug)}`, {
            method: "DELETE",
          });

      if (!response.ok) {
        onChange(citySlug, isFavorite);
      }
    } catch {
      onChange(citySlug, isFavorite);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      aria-pressed={isFavorite}
      aria-label={
        isFavorite
          ? `Remove ${cityName} from favorites`
          : `Add ${cityName} to favorites`
      }
      className={`inline-flex h-8 w-8 items-center justify-center rounded-full border transition ${
        isFavorite
          ? "border-amber-300 bg-amber-100 text-amber-600"
          : "border-slate-200 bg-white text-slate-400 hover:border-amber-300 hover:text-amber-500"
      } disabled:opacity-60`}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill={isFavorite ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth={1.8}
        className="h-4 w-4"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111 5.52.442c.5.04.703.664.322.988l-4.204 3.602 1.285 5.385a.562.562 0 01-.84.61L12 17.347l-4.728 2.29a.562.562 0 01-.84-.61l1.285-5.385-4.204-3.602a.562.562 0 01.322-.988l5.52-.442 2.125-5.11z"
        />
      </svg>
    </button>
  );
}
