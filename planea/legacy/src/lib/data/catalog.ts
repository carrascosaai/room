/**
 * Repositorio de lectura del servidor (Server Components, sitemap, SEO).
 * - Sin Supabase: datos demo generados en memoria.
 * - Con Supabase: consultas con la clave anónima (RLS) sobre vistas públicas.
 */
import "server-only";
import { cache } from "react";
import { IS_DEMO } from "../config";
import { getDemoDataset } from "../seed";
import type { CityEvent, Plan, Post, Reply, Report, Review, TargetRef, TargetStats, Venue } from "../types";
import * as sb from "./supabase-catalog";

export const EMPTY_STATS: TargetStats = { interested: 0, hereNow: 0, votesYes: 0, votesNo: 0, posts: 0, views24h: 0, interested24h: 0 };

export const PLAN_ACTIVE_HOURS = 4;

export const listVenues = cache(async (citySlug: string): Promise<Venue[]> => {
  if (IS_DEMO) return getDemoDataset().venues.filter((v) => v.citySlug === citySlug);
  return sb.listVenues(citySlug);
});

export const getVenue = cache(async (citySlug: string, slug: string): Promise<Venue | null> => {
  if (IS_DEMO) return getDemoDataset().venues.find((v) => v.citySlug === citySlug && v.slug === slug) ?? null;
  return sb.getVenue(citySlug, slug);
});

/** Eventos de la ciudad que no han terminado (próximos 8 días). */
export const listEvents = cache(async (citySlug: string): Promise<CityEvent[]> => {
  const now = Date.now();
  if (IS_DEMO)
    return getDemoDataset()
      .events.filter((e) => e.citySlug === citySlug && new Date(e.endsAt).getTime() > now)
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  return sb.listEvents(citySlug);
});

export const getEvent = cache(async (citySlug: string, slug: string): Promise<CityEvent | null> => {
  if (IS_DEMO) return getDemoDataset().events.find((e) => e.citySlug === citySlug && e.slug === slug) ?? null;
  return sb.getEvent(citySlug, slug);
});

/** Planes públicos activos o futuros. */
export const listPlans = cache(async (citySlug: string): Promise<Plan[]> => {
  const since = Date.now() - PLAN_ACTIVE_HOURS * 3_600_000;
  if (IS_DEMO)
    return getDemoDataset()
      .plans.filter((p) => p.citySlug === citySlug && p.visibility === "public" && new Date(p.startsAt).getTime() > since)
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  return sb.listPlans(citySlug, new Date(since));
});

export const getPlan = cache(async (id: string): Promise<Plan | null> => {
  if (IS_DEMO) return getDemoDataset().plans.find((p) => p.id === id) ?? null;
  return sb.getPlan(id);
});

export const listPosts = cache(async (type: TargetRef["type"], id: string): Promise<{ posts: Post[]; replies: Reply[] }> => {
  if (IS_DEMO) {
    const ds = getDemoDataset();
    const posts = ds.posts.filter((p) => p.targetType === type && p.targetId === id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const ids = new Set(posts.map((p) => p.id));
    return { posts, replies: ds.replies.filter((r) => ids.has(r.postId)) };
  }
  return { posts: await sb.listPosts(type, id), replies: [] };
});

export const listReviews = cache(async (venueId: string): Promise<Review[]> => {
  if (IS_DEMO) return getDemoDataset().reviews.filter((r) => r.venueId === venueId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return sb.listReviews(venueId);
});

export async function getVenueRating(venue: Venue): Promise<{ rating: number; count: number }> {
  if (IS_DEMO) return { rating: venue.baseRating, count: venue.baseRatingCount };
  return sb.getVenueRating(venue);
}

/** Métricas agregadas (personas interesadas, votos…) — nunca identidades. */
export async function getStats(targets: TargetRef[]): Promise<Record<string, TargetStats>> {
  const out: Record<string, TargetStats> = {};
  if (IS_DEMO) {
    const ds = getDemoDataset();
    for (const t of targets) out[`${t.type}:${t.id}`] = ds.activity.get(`${t.type}:${t.id}`) ?? EMPTY_STATS;
    return out;
  }
  return sb.getStats(targets);
}

/** Denuncias de ejemplo (solo demo) para el panel de moderación. */
export function demoReports(): Report[] {
  return IS_DEMO ? getDemoDataset().reports : [];
}
