import type { UserStats } from "./types";

export const XP = {
  createPlan: 50,
  review: 25,
  discover: 20,
  attend: 10,
  post: 10,
  vote: 5,
  reply: 5,
  pollVote: 5,
} as const;

export type XpReason = keyof typeof XP;

export const LEVELS = [
  { name: "Novato", min: 0, emoji: "🌱" },
  { name: "Habitual", min: 100, emoji: "🍹" },
  { name: "Local", min: 300, emoji: "📍" },
  { name: "VIP", min: 700, emoji: "💎" },
  { name: "Leyenda", min: 1500, emoji: "👑" },
] as const;

export function levelFor(xp: number) {
  let idx = 0;
  LEVELS.forEach((l, i) => {
    if (xp >= l.min) idx = i;
  });
  const current = LEVELS[idx]!;
  const next = LEVELS[idx + 1];
  const progress = next ? (xp - current.min) / (next.min - current.min) : 1;
  return { ...current, index: idx, next, progress: Math.min(1, Math.max(0, progress)), toNext: next ? next.min - xp : 0 };
}

export interface Badge {
  id: string;
  emoji: string;
  name: string;
  description: string;
  earned: boolean;
}

export function badgesFor(s: UserStats): Badge[] {
  return [
    { id: "noctambulo", emoji: "🌙", name: "Noctámbulo", description: "Apúntate a 3 planes que empiecen después de la 1:00", earned: s.lateNights >= 3 },
    { id: "fiesta", emoji: "🔥", name: "Siempre de fiesta", description: "Marca interés en 10 planes", earned: s.interested >= 10 },
    { id: "conciertos", emoji: "🎤", name: "Conciertos", description: "Apúntate a 3 conciertos", earned: s.concerts >= 3 },
    { id: "copas", emoji: "🍻", name: "Experto en copas", description: "Visita 5 bares de copas o pubs", earned: s.copas >= 5 },
    { id: "uni", emoji: "🎓", name: "Universitario", description: "Apúntate a 2 fiestas universitarias", earned: s.university >= 2 },
    { id: "explorador", emoji: "🗺️", name: "Explorador", description: "Descubre 5 sitios distintos", earned: s.placesVisited >= 5 },
    { id: "anfitrion", emoji: "✨", name: "Anfitrión", description: "Crea tu primer plan", earned: s.plansCreated >= 1 },
    { id: "critico", emoji: "⭐", name: "Crítico", description: "Escribe 3 reseñas", earned: s.reviews >= 3 },
  ];
}
