import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getServerSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getServerSupabaseClient();
  const { data, error } = await supabase
    .from("user_favorites")
    .select("city_slug")
    .eq("user_id", userId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ favorites: data ?? [] });
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as
    | { city_slug?: unknown }
    | null;
  const citySlug =
    typeof body?.city_slug === "string" ? body.city_slug.trim() : "";

  if (!citySlug) {
    return NextResponse.json(
      { error: "city_slug is required" },
      { status: 400 },
    );
  }

  const supabase = getServerSupabaseClient();
  const { error } = await supabase.from("user_favorites").upsert(
    { user_id: userId, city_slug: citySlug },
    { onConflict: "user_id,city_slug", ignoreDuplicates: true },
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(
    { favorite: { city_slug: citySlug } },
    { status: 201 },
  );
}
