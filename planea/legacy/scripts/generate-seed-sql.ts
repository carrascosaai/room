/**
 * Genera supabase/seed.sql a partir de los datos demo de src/lib/seed.
 * Las fechas se escriben RELATIVAS a la noche en que se ejecuta el seed
 * (public.current_night()), así la demo siempre tiene planes "esta noche".
 *
 *   npm run db:seed-sql
 */
import { writeFileSync } from "node:fs";
import { CATEGORIES } from "../src/lib/categories";
import { CITIES } from "../src/lib/cities";
import { getDemoDataset } from "../src/lib/seed";
import { madridParts, nightDate } from "../src/lib/time";

const now = new Date();
const ds = getDemoDataset(now);
const night = nightDate(now);
const nightUtc = Date.UTC(night.year, night.month - 1, night.day);

class Json {
  constructor(public value: unknown) {}
}
const j = (v: unknown) => new Json(v);

const q = (v: unknown): string => {
  if (v === null || v === undefined) return "null";
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  if (Array.isArray(v)) return `array[${v.map(q).join(",")}]::text[]`;
  if (v instanceof Json) return `${q(JSON.stringify(v.value))}::jsonb`;
  return `'${String(v).replace(/'/g, "''")}'`;
};

/** Instante → expresión SQL relativa al inicio de la noche actual (hora de Madrid). */
function rel(iso: string): string {
  const p = madridParts(new Date(iso));
  const mins = Math.round((Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute) - nightUtc) / 60000);
  return `((public.current_night() + interval '${mins} minutes') at time zone 'Europe/Madrid')`;
}
const ago = (iso: string) => `now() - interval '${Math.max(0, Math.round((now.getTime() - new Date(iso).getTime()) / 60000))} minutes'`;

const lines: string[] = [
  "-- ════════════════════════════════════════════════════════════════",
  "--  PLANEA — DATOS DEMO (ficticios). Generado por scripts/generate-seed-sql.ts",
  "--  Para borrarlos:  delete from venues where is_demo; delete from events where is_demo;",
  "--                   delete from plans where is_demo; delete from posts where is_demo;",
  "-- ════════════════════════════════════════════════════════════════",
  "begin;",
  "",
  "insert into public.cities (slug, name, region, lat, lng) values",
  CITIES.map((c) => `  (${q(c.slug)}, ${q(c.name)}, ${q(c.region)}, ${c.lat}, ${c.lng})`).join(",\n") + "\non conflict (slug) do update set name = excluded.name, region = excluded.region, lat = excluded.lat, lng = excluded.lng;",
  "",
  "insert into public.categories (slug, label, emoji, position) values",
  CATEGORIES.map((c, i) => `  (${q(c.slug)}, ${q(c.label)}, ${q(c.emoji)}, ${i})`).join(",\n") + "\non conflict (slug) do update set label = excluded.label, emoji = excluded.emoji, position = excluded.position;",
  "",
  "insert into public.venues (id, slug, city_slug, name, category, description, neighborhood, lat, lng, price_level, price_from, age_min, age_max, music, vibe, tags, hours, nightly, base_interest, base_rating, base_rating_count, is_demo) values",
  ds.venues
    .map((v) => `  (${[v.id, v.slug, v.citySlug, v.name, v.category, v.description, v.neighborhood, v.lat, v.lng, v.priceLevel, v.priceFrom, v.ageMin, v.ageMax, v.music, v.vibe, v.tags, j(v.hours), j(v.nightly), v.baseInterest, v.baseRating, v.baseRatingCount, true].map(q).join(", ")})`)
    .join(",\n") + "\non conflict (id) do nothing;",
  "",
  "insert into public.events (id, slug, city_slug, venue_id, title, category, description, starts_at, ends_at, price_from, lineup, music, vibe, age_min, age_max, lat, lng, base_interest, is_demo) values",
  ds.events
    .map(
      (e) =>
        `  (${[e.id, e.slug, e.citySlug, e.venueId, e.title, e.category, e.description].map(q).join(", ")}, ${rel(e.startsAt)}, ${rel(e.endsAt)}, ${[e.priceFrom, j(e.lineup), e.music, e.vibe, e.ageMin, e.ageMax, e.lat, e.lng, e.baseInterest, true].map(q).join(", ")})`,
    )
    .join(",\n") + "\non conflict (id) do nothing;",
  "",
  "insert into public.plans (id, city_slug, demo_author, title, place_name, venue_id, category, description, starts_at, visibility, base_attendees, is_demo, created_at) values",
  ds.plans
    .map((p) => `  (${[p.id, p.citySlug, p.creatorName, p.title, p.placeName, p.venueId, p.category, p.description].map(q).join(", ")}, ${rel(p.startsAt)}, 'public', ${p.baseAttendees}, true, ${rel(p.createdAt)})`)
    .join(",\n") + "\non conflict (id) do nothing;",
  "",
  "insert into public.posts (id, target_type, target_id, demo_author, demo_emoji, is_anonymous, kind, body, is_demo, created_at) values",
  ds.posts
    .map((p) => `  (${[p.id, p.targetType, p.targetId, p.isAnonymous ? null : p.authorName, p.isAnonymous ? null : p.authorEmoji, p.isAnonymous, p.kind, p.body, true].map(q).join(", ")}, ${ago(p.createdAt)})`)
    .join(",\n") + "\non conflict (id) do nothing;",
  "",
  "insert into public.poll_options (id, post_id, label, position, base_votes) values",
  ds.posts.flatMap((p) => p.options.map((o, i) => `  (${[o.id, p.id, o.label, i, o.votes].map(q).join(", ")})`)).join(",\n") + "\non conflict (id) do nothing;",
  "",
  "insert into public.post_replies (id, post_id, is_anonymous, body, is_demo, created_at) values",
  ds.replies.map((r) => `  (${[r.id, r.postId, true, r.body, true].map(q).join(", ")}, ${ago(r.createdAt)})`).join(",\n") + "\non conflict (id) do nothing;",
  "",
  "insert into public.reviews (id, venue_id, demo_author, demo_emoji, rating, body, is_demo, created_at) values",
  ds.reviews.map((r) => `  (${[r.id, r.venueId, r.authorName, r.authorEmoji, r.rating, r.body, true].map(q).join(", ")}, ${ago(r.createdAt)})`).join(",\n") + "\non conflict (id) do nothing;",
  "",
  "commit;",
  "",
  "-- Mantener viva la demo: mueve una semana adelante los eventos/planes demo que ya pasaron.",
  "-- Prográmalo a diario con pg_cron:  select cron.schedule('planea-demo', '0 8 * * *', 'select public.roll_demo_dates()');",
  `create or replace function public.roll_demo_dates() returns void language sql security definer set search_path = public as $$
  update events set starts_at = starts_at + interval '7 days', ends_at = ends_at + interval '7 days' where is_demo and ends_at < now();
  update plans set starts_at = starts_at + interval '7 days' where is_demo and starts_at < now() - interval '6 hours';
$$;
revoke execute on function public.roll_demo_dates() from public, anon, authenticated;`,
  "",
];

writeFileSync(new URL("../supabase/seed.sql", import.meta.url), lines.join("\n"));
console.log(`seed.sql: ${ds.venues.length} locales, ${ds.events.length} eventos, ${ds.plans.length} planes, ${ds.posts.length} posts, ${ds.reviews.length} reseñas`);
