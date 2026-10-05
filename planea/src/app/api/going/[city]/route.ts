import { HAS_BACKEND, SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/config";
import type { GoingMap } from "@/lib/types";

/**
 * Recuento de "Voy" de esta noche en una ciudad. La respuesta se cachea 15 s en la CDN,
 * así miles de personas mirando la misma ciudad generan como mucho 4 consultas por minuto.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ city: string }> }) {
  const { city } = await params;
  if (!/^[a-z0-9-]{1,60}$/.test(city)) return Response.json({}, { status: 400 });
  const out: GoingMap = {};
  if (HAS_BACKEND) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/planea_city_going?p_city=${city}`, {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
      cache: "no-store",
    });
    if (!res.ok) return Response.json({}, { status: 502, headers: { "Cache-Control": "public, s-maxage=5" } });
    const rows = (await res.json()) as { venue_id: string; total: number; names: string[] | null }[];
    for (const r of rows) out[r.venue_id] = { total: r.total, names: r.names ?? [] };
  }
  return Response.json(out, {
    headers: { "Cache-Control": "public, max-age=5, s-maxage=15, stale-while-revalidate=60" },
  });
}
