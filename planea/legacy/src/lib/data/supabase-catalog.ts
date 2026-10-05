/**
 * Implementación Supabase del repositorio de lectura.
 * Usa la clave anónima: todo pasa por RLS y vistas públicas.
 */
import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "../config";
import type { CityEvent, Plan, Post, Review, TargetRef, TargetStats, Venue } from "../types";
import { mapEvent, mapPlan, mapPost, mapReview, mapVenue, type Row } from "./mappers";

let client: SupabaseClient | null = null;
function db(): SupabaseClient {
  client ??= createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  return client;
}

function fail(what: string, error: { message: string } | null): never {
  throw new Error(`[supabase] ${what}: ${error?.message ?? "desconocido"}`);
}

export async function listVenues(citySlug: string): Promise<Venue[]> {
  const { data, error } = await db().from("venues").select("*").eq("city_slug", citySlug).order("base_interest", { ascending: false });
  if (error) fail("venues", error);
  return (data as Row[]).map(mapVenue);
}

export async function getVenue(citySlug: string, slug: string): Promise<Venue | null> {
  const { data, error } = await db().from("venues").select("*").eq("city_slug", citySlug).eq("slug", slug).maybeSingle();
  if (error) fail("venue", error);
  return data ? mapVenue(data as Row) : null;
}

const EVENT_SELECT = "*, venue:venues(name)";

export async function listEvents(citySlug: string): Promise<CityEvent[]> {
  const now = new Date();
  const until = new Date(now.getTime() + 8 * 86_400_000);
  const { data, error } = await db()
    .from("events")
    .select(EVENT_SELECT)
    .eq("city_slug", citySlug)
    .gt("ends_at", now.toISOString())
    .lt("starts_at", until.toISOString())
    .order("starts_at");
  if (error) fail("events", error);
  return (data as Row[]).map(mapEvent);
}

export async function getEvent(citySlug: string, slug: string): Promise<CityEvent | null> {
  const { data, error } = await db()
    .from("events")
    .select(EVENT_SELECT)
    .eq("city_slug", citySlug)
    .eq("slug", slug)
    .order("starts_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) fail("event", error);
  return data ? mapEvent(data as Row) : null;
}

export async function listPlans(citySlug: string, since: Date): Promise<Plan[]> {
  const { data, error } = await db()
    .from("plans_public")
    .select("*")
    .eq("city_slug", citySlug)
    .eq("visibility", "public")
    .gt("starts_at", since.toISOString())
    .order("starts_at")
    .limit(100);
  if (error) fail("plans", error);
  return (data as Row[]).map(mapPlan);
}

export async function getPlan(id: string): Promise<Plan | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const { data, error } = await db().from("plans_public").select("*").eq("id", id).maybeSingle();
  if (error) fail("plan", error);
  return data ? mapPlan(data as Row) : null;
}

export async function listPosts(type: TargetRef["type"], id: string): Promise<Post[]> {
  const { data, error } = await db()
    .from("posts_public")
    .select("*")
    .eq("target_type", type)
    .eq("target_id", id)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) fail("posts", error);
  return (data as Row[]).map(mapPost);
}

export async function listReviews(venueId: string): Promise<Review[]> {
  const { data, error } = await db().from("reviews_public").select("*").eq("venue_id", venueId).order("created_at", { ascending: false }).limit(30);
  if (error) fail("reviews", error);
  return (data as Row[]).map(mapReview);
}

export async function getVenueRating(venue: Venue): Promise<{ rating: number; count: number }> {
  const { data } = await db().from("venue_ratings").select("rating, rating_count").eq("venue_id", venue.id).maybeSingle();
  if (!data) return { rating: venue.baseRating, count: venue.baseRatingCount };
  return { rating: Number(data.rating ?? venue.baseRating), count: Number(data.rating_count ?? 0) };
}

export async function getStats(targets: TargetRef[]): Promise<Record<string, TargetStats>> {
  const out: Record<string, TargetStats> = {};
  const byType = new Map<TargetRef["type"], string[]>();
  for (const t of targets) byType.set(t.type, [...(byType.get(t.type) ?? []), t.id]);

  await Promise.all(
    [...byType.entries()].map(async ([type, ids]) => {
      const table = type === "venue" ? "venues" : type === "event" ? "events" : "plans";
      const baseCol = type === "plan" ? "base_attendees" : "base_interest";
      const [{ data: stats, error }, { data: bases }] = await Promise.all([
        db().rpc("get_target_stats", { p_type: type, p_ids: ids }),
        db().from(table).select(`id, ${baseCol}`).in("id", ids),
      ]);
      if (error) fail("stats", error);
      const base = new Map(((bases ?? []) as Row[]).map((b) => [String(b.id), Number(b[baseCol] ?? 0)]));
      for (const s of (stats ?? []) as Row[]) {
        const id = String(s.target_id);
        out[`${type}:${id}`] = {
          interested: (base.get(id) ?? 0) + Number(s.interested),
          hereNow: Number(s.here_now),
          votesYes: Number(s.votes_yes),
          votesNo: Number(s.votes_no),
          posts: Number(s.posts),
          views24h: Number(s.views_24h),
          interested24h: Number(s.interested_24h),
        };
      }
    }),
  );
  return out;
}
