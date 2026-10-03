/**
 * Construye el feed "¿Qué hay ahora?" a partir de locales, eventos y planes.
 * Función pura: se usa en servidor (render inicial) y en tests.
 */
import { categoryOf } from "./categories";
import { formatTime, HOUR, openIntervals, overlaps, startLabel, windowFor, type TimeTab } from "./time";
import type { CategorySlug, CityEvent, Plan, TargetStats, TargetType, Venue, Vibe } from "./types";
import { priceFromLabel, priceLevelLabel } from "./utils";

export const PLAN_DURATION_H = 4;

export interface FeedItem {
  key: string;
  type: TargetType;
  id: string;
  href: string;
  title: string;
  subtitle: string;
  category: CategorySlug;
  emoji: string;
  start: string;
  end: string;
  live: boolean;
  timeLabel: string;
  statusLabel: string;
  priceLabel: string;
  priceFrom: number;
  interest: number;
  hereNow: number;
  popularNow: boolean;
  imageUrl: string | null;
  lat: number;
  lng: number;
  vibe: Vibe;
  isDemo: boolean;
}

export interface FeedInput {
  citySlug: string;
  venues: Venue[];
  events: CityEvent[];
  plans: Plan[];
  stats: Record<string, TargetStats>;
}

export function venueHref(v: { citySlug: string; slug: string }) {
  return `/${v.citySlug}/${v.slug}`;
}
export function eventHref(e: { citySlug: string; slug: string }) {
  return `/${e.citySlug}/eventos/${e.slug}`;
}
export function planHref(p: { citySlug: string; id: string }) {
  return `/${p.citySlug}/planes/${p.id}`;
}

function rangeLabel(start: Date, end: Date) {
  return `${formatTime(start)}–${formatTime(end)}`;
}

export function venueItem(v: Venue, stats: TargetStats | undefined, start: Date, end: Date, now: Date): FeedItem {
  const live = start <= now && end > now;
  const interest = stats?.interested ?? v.baseInterest;
  return {
    key: `venue:${v.id}`,
    type: "venue",
    id: v.id,
    href: venueHref(v),
    title: v.name,
    subtitle: v.neighborhood,
    category: v.category,
    emoji: categoryOf(v.category).emoji,
    start: start.toISOString(),
    end: end.toISOString(),
    live,
    timeLabel: live ? `Hasta las ${formatTime(end)}` : rangeLabel(start, end),
    statusLabel: startLabel(start, end, now),
    priceLabel: priceLevelLabel(v.priceLevel),
    priceFrom: v.priceFrom,
    interest,
    hereNow: live ? (stats?.hereNow ?? 0) : 0,
    popularNow: live && interest >= 150,
    imageUrl: v.imageUrl,
    lat: v.lat,
    lng: v.lng,
    vibe: v.vibe,
    isDemo: v.isDemo,
  };
}

export function eventItem(e: CityEvent, stats: TargetStats | undefined, now: Date): FeedItem {
  const start = new Date(e.startsAt);
  const end = new Date(e.endsAt);
  const live = start <= now && end > now;
  const interest = stats?.interested ?? e.baseInterest;
  return {
    key: `event:${e.id}`,
    type: "event",
    id: e.id,
    href: eventHref(e),
    title: e.title,
    subtitle: e.venueName ?? "Al aire libre",
    category: e.category,
    emoji: categoryOf(e.category).emoji,
    start: e.startsAt,
    end: e.endsAt,
    live,
    timeLabel: rangeLabel(start, end),
    statusLabel: startLabel(start, end, now),
    priceLabel: priceFromLabel(e.priceFrom),
    priceFrom: e.priceFrom,
    interest,
    hereNow: live ? (stats?.hereNow ?? 0) : 0,
    popularNow: live && interest >= 120,
    imageUrl: e.imageUrl,
    lat: e.lat,
    lng: e.lng,
    vibe: e.vibe,
    isDemo: e.isDemo,
  };
}

export function planItem(p: Plan, stats: TargetStats | undefined, now: Date, coords?: { lat: number; lng: number }): FeedItem {
  const start = new Date(p.startsAt);
  const end = new Date(start.getTime() + PLAN_DURATION_H * HOUR);
  const live = start <= now && end > now;
  return {
    key: `plan:${p.id}`,
    type: "plan",
    id: p.id,
    href: planHref(p),
    title: p.title,
    subtitle: p.placeName,
    category: p.category,
    emoji: "✨",
    start: p.startsAt,
    end: end.toISOString(),
    live,
    timeLabel: live ? "Ahora" : formatTime(start),
    statusLabel: live ? "Están ahora" : startLabel(start, null, now),
    priceLabel: "Plan",
    priceFrom: 0,
    interest: stats?.interested ?? p.baseAttendees,
    hereNow: 0,
    popularNow: false,
    imageUrl: p.imageUrl,
    lat: coords?.lat ?? 0,
    lng: coords?.lng ?? 0,
    vibe: p.category === "restaurantes" || p.category === "copas" ? "tranquilo" : "fiesta",
    isDemo: p.isDemo,
  };
}

/** Feed para una pestaña temporal. Los eventos sustituyen a su local para no duplicar. */
export function buildFeed(input: FeedInput, tab: TimeTab, now: Date): FeedItem[] {
  const w = windowFor(tab, now);
  const items: FeedItem[] = [];
  const venuesWithEvent = new Set<string>();
  const venueById = new Map(input.venues.map((v) => [v.id, v]));

  for (const e of input.events) {
    const s = new Date(e.startsAt);
    const en = new Date(e.endsAt);
    if (!overlaps(s, en, w)) continue;
    if (e.venueId) venuesWithEvent.add(e.venueId);
    items.push(eventItem(e, input.stats[`event:${e.id}`], now));
  }
  for (const v of input.venues) {
    if (venuesWithEvent.has(v.id)) continue;
    const iv = openIntervals(v.hours, w.from, w.to)[0];
    if (!iv) continue;
    items.push(venueItem(v, input.stats[`venue:${v.id}`], iv.from, iv.to, now));
  }
  for (const p of input.plans) {
    const s = new Date(p.startsAt);
    const en = new Date(s.getTime() + PLAN_DURATION_H * HOUR);
    if (!overlaps(s, en, w)) continue;
    const v = p.venueId ? venueById.get(p.venueId) : undefined;
    items.push(planItem(p, input.stats[`plan:${p.id}`], now, v));
  }

  return items.sort((a, b) => {
    if (tab === "ahora" || tab === "noche") {
      if (a.live !== b.live) return a.live ? -1 : 1;
    }
    if (tab !== "ahora" && tab !== "noche") {
      const day = a.start.slice(0, 10).localeCompare(b.start.slice(0, 10));
      if (day !== 0 && tab === "finde") return day;
    }
    return b.interest - a.interest;
  });
}

/** Lo próximo que abre/empieza (para cuando "Ahora" está tranquilo). */
export function upcoming(input: FeedInput, now: Date, limit = 4): FeedItem[] {
  return buildFeed(input, "noche", now)
    .filter((i) => !i.live)
    .sort((a, b) => a.start.localeCompare(b.start))
    .slice(0, limit);
}
