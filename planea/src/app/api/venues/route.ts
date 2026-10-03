import { NextResponse } from "next/server";
import { getCity } from "@/lib/cities";
import { listVenues } from "@/lib/data/catalog";

/** Lista compacta de locales de una ciudad (selector de "Lugar" al crear un plan). */
export async function GET(req: Request) {
  const city = new URL(req.url).searchParams.get("city") ?? "";
  if (!getCity(city)) return NextResponse.json({ error: "Ciudad no válida" }, { status: 400 });
  const venues = await listVenues(city);
  return NextResponse.json(
    venues.map((v) => ({ id: v.id, name: v.name, category: v.category, neighborhood: v.neighborhood })),
    { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600" } },
  );
}
