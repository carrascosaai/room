/** Filas de Supabase (snake_case) → modelo de dominio (camelCase). */
import type { CategorySlug, CityEvent, LineupItem, OpeningHours, Plan, PollOption, Post, Profile, Reply, Review, Venue } from "../types";

export type Row = Record<string, unknown>;

const str = (v: unknown, d = "") => (typeof v === "string" ? v : d);
const num = (v: unknown, d = 0) => (v === null || v === undefined || v === "" ? d : Number(v));
const arr = <T>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);

export function mapVenue(r: Row): Venue {
  return {
    id: str(r.id),
    slug: str(r.slug),
    citySlug: str(r.city_slug),
    name: str(r.name),
    category: str(r.category) as CategorySlug,
    description: str(r.description),
    neighborhood: str(r.neighborhood),
    lat: num(r.lat),
    lng: num(r.lng),
    priceLevel: num(r.price_level, 2),
    priceFrom: num(r.price_from),
    ageMin: num(r.age_min, 18),
    ageMax: num(r.age_max, 35),
    music: arr<string>(r.music),
    vibe: str(r.vibe, "fiesta") as Venue["vibe"],
    tags: arr<string>(r.tags),
    hours: (r.hours ?? {}) as OpeningHours,
    nightly: arr<LineupItem>(r.nightly),
    imageUrl: (r.image_url as string | null) ?? null,
    baseInterest: num(r.base_interest),
    baseRating: num(r.base_rating),
    baseRatingCount: num(r.base_rating_count),
    isDemo: Boolean(r.is_demo),
    isFeatured: Boolean(r.is_featured),
  };
}

export function mapEvent(r: Row): CityEvent {
  const venue = r.venue as { name?: string } | null | undefined;
  return {
    id: str(r.id),
    slug: str(r.slug),
    citySlug: str(r.city_slug),
    venueId: (r.venue_id as string | null) ?? null,
    venueName: venue?.name ?? null,
    title: str(r.title),
    category: str(r.category) as CategorySlug,
    description: str(r.description),
    startsAt: new Date(str(r.starts_at)).toISOString(),
    endsAt: new Date(str(r.ends_at)).toISOString(),
    priceFrom: num(r.price_from),
    lineup: arr<LineupItem>(r.lineup),
    music: arr<string>(r.music),
    vibe: str(r.vibe, "fiesta") as CityEvent["vibe"],
    ageMin: num(r.age_min, 18),
    ageMax: num(r.age_max, 35),
    lat: num(r.lat),
    lng: num(r.lng),
    imageUrl: (r.image_url as string | null) ?? null,
    ticketUrl: (r.ticket_url as string | null) ?? null,
    baseInterest: num(r.base_interest),
    isDemo: Boolean(r.is_demo),
    isFeatured: Boolean(r.is_featured),
  };
}

export function mapPlan(r: Row): Plan {
  return {
    id: str(r.id),
    citySlug: str(r.city_slug),
    creatorId: (r.creator_id as string | null) ?? null,
    creatorName: str(r.creator_name, "Alguien"),
    title: str(r.title),
    placeName: str(r.place_name),
    venueId: (r.venue_id as string | null) ?? null,
    category: str(r.category) as CategorySlug,
    description: str(r.description),
    startsAt: new Date(str(r.starts_at)).toISOString(),
    visibility: str(r.visibility, "public") as Plan["visibility"],
    imageUrl: (r.image_url as string | null) ?? null,
    // En plans_public "attendees" ya incluye la base; las métricas se calculan aparte.
    baseAttendees: num(r.attendees),
    createdAt: new Date(str(r.created_at)).toISOString(),
    isDemo: Boolean(r.is_demo),
  };
}

export function mapPost(r: Row): Post {
  return {
    id: str(r.id),
    targetType: str(r.target_type) as Post["targetType"],
    targetId: str(r.target_id),
    authorId: (r.author_id as string | null) ?? null,
    authorName: str(r.author_name, "Anónimo"),
    authorEmoji: str(r.author_emoji, "🎭"),
    isAnonymous: Boolean(r.is_anonymous),
    kind: str(r.kind) as Post["kind"],
    body: str(r.body),
    options: arr<PollOption>(r.options).map((o) => ({ id: String(o.id), label: String(o.label), votes: Number(o.votes) })),
    replyCount: num(r.reply_count),
    createdAt: new Date(str(r.created_at)).toISOString(),
    isDemo: Boolean(r.is_demo),
  };
}

export function mapReply(r: Row): Reply {
  return {
    id: str(r.id),
    postId: str(r.post_id),
    authorId: (r.author_id as string | null) ?? null,
    authorName: str(r.author_name, "Anónimo"),
    authorEmoji: str(r.author_emoji, "🎭"),
    isAnonymous: Boolean(r.is_anonymous),
    body: str(r.body),
    createdAt: new Date(str(r.created_at)).toISOString(),
  };
}

export function mapReview(r: Row): Review {
  return {
    id: str(r.id),
    venueId: str(r.venue_id),
    authorId: (r.author_id as string | null) ?? null,
    authorName: str(r.author_name, "Alguien"),
    authorEmoji: str(r.author_emoji, "🙂"),
    rating: num(r.rating),
    body: str(r.body),
    createdAt: new Date(str(r.created_at)).toISOString(),
  };
}

export function mapProfile(r: Row): Profile {
  return {
    id: str(r.id),
    username: str(r.username),
    displayName: str(r.display_name),
    avatarEmoji: str(r.avatar_emoji, "🙂"),
    avatarColor: str(r.avatar_color, "#C8FF3D"),
    age: r.age === null || r.age === undefined ? null : Number(r.age),
    citySlug: (r.city_slug as string | null) ?? null,
    xp: num(r.xp),
    role: str(r.role, "user") as Profile["role"],
    createdAt: str(r.created_at),
  };
}
