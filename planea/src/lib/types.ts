/**
 * Modelo de dominio de PLANEA.
 * Refleja 1:1 las tablas de supabase/migrations (snake_case ↔ camelCase).
 */

export type CategorySlug =
  | "discotecas"
  | "copas"
  | "pubs"
  | "conciertos"
  | "universitario"
  | "festivales"
  | "eventos"
  | "restaurantes"
  | "planes";

export type Vibe = "fiesta" | "tranquilo";

export interface City {
  slug: string;
  name: string;
  region: string;
  lat: number;
  lng: number;
}

export interface Category {
  slug: CategorySlug;
  label: string;
  short: string;
  emoji: string;
  /** Texto para SEO: "Discotecas en Sevilla" */
  seoLabel: string;
}

/** "HH:MM" → "HH:MM". El cierre puede ser al día siguiente (p. ej. 23:30 → 06:00). */
export type OpeningHours = Partial<Record<0 | 1 | 2 | 3 | 4 | 5 | 6, [string, string]>>;

export interface LineupItem {
  time: string;
  label: string;
}

export interface Venue {
  id: string;
  slug: string;
  citySlug: string;
  name: string;
  category: CategorySlug;
  description: string;
  neighborhood: string;
  lat: number;
  lng: number;
  /** 1–4 → €, €€, €€€, €€€€ */
  priceLevel: number;
  /** Precio orientativo de entrada/consumición en €. 0 = gratis. */
  priceFrom: number;
  ageMin: number;
  ageMax: number;
  music: string[];
  vibe: Vibe;
  tags: string[];
  hours: OpeningHours;
  /** Programa habitual de la noche (si el local no tiene evento propio). */
  nightly: LineupItem[];
  imageUrl: string | null;
  baseInterest: number;
  baseRating: number;
  baseRatingCount: number;
  isDemo: boolean;
  isFeatured: boolean;
}

export interface CityEvent {
  id: string;
  slug: string;
  citySlug: string;
  venueId: string | null;
  venueName: string | null;
  title: string;
  category: CategorySlug;
  description: string;
  startsAt: string;
  endsAt: string;
  priceFrom: number;
  lineup: LineupItem[];
  music: string[];
  vibe: Vibe;
  ageMin: number;
  ageMax: number;
  lat: number;
  lng: number;
  imageUrl: string | null;
  ticketUrl: string | null;
  baseInterest: number;
  isDemo: boolean;
  isFeatured: boolean;
}

export type PlanVisibility = "public" | "link";

export interface Plan {
  id: string;
  citySlug: string;
  creatorId: string | null;
  creatorName: string;
  title: string;
  placeName: string;
  venueId: string | null;
  category: CategorySlug;
  description: string;
  startsAt: string;
  visibility: PlanVisibility;
  imageUrl: string | null;
  baseAttendees: number;
  createdAt: string;
  isDemo: boolean;
}

export type TargetType = "venue" | "event" | "plan";

export interface TargetRef {
  type: TargetType;
  id: string;
}

export type PostKind = "poll" | "question" | "confession" | "opinion" | "prediction";

export interface PollOption {
  id: string;
  label: string;
  votes: number;
}

export interface Post {
  id: string;
  targetType: TargetType;
  targetId: string;
  authorId: string | null;
  /** Nombre visible. "Anónimo" cuando isAnonymous. */
  authorName: string;
  authorEmoji: string;
  isAnonymous: boolean;
  kind: PostKind;
  body: string;
  options: PollOption[];
  replyCount: number;
  createdAt: string;
  isDemo: boolean;
  /** Solo lo sabe el propio autor (para poder borrarlo). */
  isMine?: boolean;
}

export interface Reply {
  id: string;
  postId: string;
  authorId: string | null;
  authorName: string;
  authorEmoji: string;
  isAnonymous: boolean;
  body: string;
  createdAt: string;
  isMine?: boolean;
}

export interface Review {
  id: string;
  venueId: string;
  authorId: string | null;
  authorName: string;
  authorEmoji: string;
  rating: number;
  body: string;
  createdAt: string;
}

/** Métricas agregadas. Nunca contienen identidades ni ubicaciones individuales. */
export interface TargetStats {
  interested: number;
  hereNow: number;
  votesYes: number;
  votesNo: number;
  posts: number;
  views24h: number;
  interested24h: number;
}

export type ReportReason = "spam" | "acoso" | "sexual" | "datos_personales" | "fraude" | "otro";
export type ReportTargetType = "post" | "reply" | "plan" | "review" | "profile";

export interface Report {
  id: string;
  reporterId: string;
  targetType: ReportTargetType;
  targetId: string;
  reason: ReportReason;
  details: string;
  status: "open" | "resolved" | "dismissed";
  createdAt: string;
  /** Vista previa del contenido denunciado (para el panel de moderación). */
  preview: string;
}

export type Role = "user" | "moderator" | "admin";

export interface Profile {
  id: string;
  username: string;
  displayName: string;
  avatarEmoji: string;
  avatarColor: string;
  age: number | null;
  citySlug: string | null;
  xp: number;
  role: Role;
  createdAt: string;
}

export interface UserStats {
  plansCreated: number;
  placesVisited: number;
  votes: number;
  reviews: number;
  posts: number;
  interested: number;
  concerts: number;
  copas: number;
  university: number;
  lateNights: number;
  cities: number;
}

export type Result<T = void> = { ok: true; data: T } | { ok: false; error: string };
