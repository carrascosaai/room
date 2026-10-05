/**
 * Ranking "En tendencia": depende de la actividad reciente, no del tamaño del local.
 *   score = interesados(24h)·3 + visitas(24h)·0,2 + planes creados·8 + votos·1,5 + salseo·4 + "estoy aquí"·2
 */
import { eventItem, planItem, venueItem, type FeedItem } from "./feed";
import { openIntervals, DAY } from "./time";
import type { CityEvent, Plan, TargetStats, Venue } from "./types";

export const TRENDING_WEIGHTS = { interested24h: 3, views24h: 0.2, plans: 8, votes: 1.5, posts: 4, hereNow: 2 } as const;

export interface TrendingEntry {
  rank: number;
  item: FeedItem;
  score: number;
  reasons: string[];
}

export function trendingScore(s: TargetStats, plansCreated: number): number {
  const w = TRENDING_WEIGHTS;
  return (
    s.interested24h * w.interested24h +
    s.views24h * w.views24h +
    plansCreated * w.plans +
    (s.votesYes + s.votesNo) * w.votes +
    s.posts * w.posts +
    s.hereNow * w.hereNow
  );
}

function reasonsFor(s: TargetStats, plans: number): string[] {
  const r: string[] = [];
  if (s.interested24h) r.push(`+${s.interested24h} interesados hoy`);
  if (plans) r.push(plans === 1 ? "1 plan creado" : `${plans} planes creados`);
  const votes = s.votesYes + s.votesNo;
  if (votes) r.push(`${votes} votos`);
  if (s.posts) r.push(`${s.posts} en el salseo`);
  return r.slice(0, 3);
}

export function computeTrending(
  input: { venues: Venue[]; events: CityEvent[]; plans: Plan[]; stats: Record<string, TargetStats> },
  now: Date,
  limit = 15,
): TrendingEntry[] {
  const horizon = new Date(now.getTime() + 3 * DAY);
  const plansByVenue = new Map<string, number>();
  for (const p of input.plans) if (p.venueId) plansByVenue.set(p.venueId, (plansByVenue.get(p.venueId) ?? 0) + 1);

  const empty: TargetStats = { interested: 0, hereNow: 0, votesYes: 0, votesNo: 0, posts: 0, views24h: 0, interested24h: 0 };
  const candidates: { item: FeedItem; score: number; reasons: string[] }[] = [];

  for (const v of input.venues) {
    const s = input.stats[`venue:${v.id}`] ?? empty;
    const iv = openIntervals(v.hours, now, horizon)[0];
    const start = iv?.from ?? now;
    const end = iv?.to ?? now;
    const plans = plansByVenue.get(v.id) ?? 0;
    candidates.push({ item: venueItem(v, s, start, end, now), score: trendingScore(s, plans), reasons: reasonsFor(s, plans) });
  }
  for (const e of input.events) {
    if (new Date(e.startsAt) > horizon) continue;
    const s = input.stats[`event:${e.id}`] ?? empty;
    candidates.push({ item: eventItem(e, s, now), score: trendingScore(s, 0) * 1.1, reasons: reasonsFor(s, 0) });
  }
  for (const p of input.plans) {
    const s = input.stats[`plan:${p.id}`] ?? empty;
    candidates.push({ item: planItem(p, s, now), score: trendingScore(s, 0) + s.interested * 4, reasons: [`${s.interested} apuntados`] });
  }

  return candidates
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((c, i) => ({ rank: i + 1, item: c.item, score: Math.round(c.score), reasons: c.reasons }));
}
