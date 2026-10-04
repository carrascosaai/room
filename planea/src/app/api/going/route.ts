import { HAS_BACKEND, SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/config";
import type { SpainGoingRow } from "@/lib/types";

/** Sitios con más "Voy" esta noche en toda España (cacheado 30 s en la CDN). */
export async function GET() {
  let rows: SpainGoingRow[] = [];
  if (HAS_BACKEND) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/planea_spain_top`, {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
      cache: "no-store",
    });
    if (!res.ok) return Response.json([], { status: 502, headers: { "Cache-Control": "public, s-maxage=5" } });
    rows = (await res.json()) as SpainGoingRow[];
  }
  return Response.json(rows, {
    headers: { "Cache-Control": "public, max-age=10, s-maxage=30, stale-while-revalidate=120" },
  });
}
