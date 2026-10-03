import type { Category, CategorySlug } from "./types";

export const CATEGORIES: Category[] = [
  { slug: "discotecas", label: "Discotecas", short: "Disco", emoji: "🪩", seoLabel: "Discotecas" },
  { slug: "copas", label: "Copas", short: "Copas", emoji: "🍸", seoLabel: "Bares de copas" },
  { slug: "pubs", label: "Pubs", short: "Pubs", emoji: "🍻", seoLabel: "Pubs" },
  { slug: "conciertos", label: "Conciertos", short: "Live", emoji: "🎤", seoLabel: "Conciertos" },
  { slug: "universitario", label: "Universitario", short: "Uni", emoji: "🎓", seoLabel: "Fiestas universitarias" },
  { slug: "festivales", label: "Festivales", short: "Fest", emoji: "🎪", seoLabel: "Festivales" },
  { slug: "eventos", label: "Eventos", short: "Eventos", emoji: "🎉", seoLabel: "Eventos" },
  { slug: "restaurantes", label: "Cenar", short: "Cenar", emoji: "🍽️", seoLabel: "Restaurantes y planes de noche" },
  { slug: "planes", label: "Planes", short: "Planes", emoji: "✨", seoLabel: "Planes de la comunidad" },
];

const BY_SLUG = new Map(CATEGORIES.map((c) => [c.slug, c]));

export function getCategory(slug: string): Category | undefined {
  return BY_SLUG.get(slug as CategorySlug);
}

export function categoryOf(slug: CategorySlug): Category {
  return BY_SLUG.get(slug) ?? CATEGORIES[6]!;
}

/** Categorías que un usuario puede elegir al crear un plan. */
export const PLAN_CATEGORIES: CategorySlug[] = [
  "copas",
  "discotecas",
  "pubs",
  "conciertos",
  "universitario",
  "restaurantes",
  "eventos",
];
