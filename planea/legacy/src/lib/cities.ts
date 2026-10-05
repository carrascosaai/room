import type { City } from "./types";

/**
 * Ciudades disponibles. La lista es la fuente de verdad para las URLs (/sevilla)
 * y se replica en la tabla `cities` de Supabase.
 */
export const CITIES: City[] = [
  { slug: "cordoba", name: "Córdoba", region: "Andalucía", lat: 37.8847, lng: -4.7792 },
  { slug: "sevilla", name: "Sevilla", region: "Andalucía", lat: 37.3891, lng: -5.9845 },
  { slug: "malaga", name: "Málaga", region: "Andalucía", lat: 36.7213, lng: -4.4214 },
  { slug: "granada", name: "Granada", region: "Andalucía", lat: 37.1773, lng: -3.5986 },
  { slug: "madrid", name: "Madrid", region: "Comunidad de Madrid", lat: 40.4168, lng: -3.7038 },
  { slug: "barcelona", name: "Barcelona", region: "Cataluña", lat: 41.3874, lng: 2.1686 },
  { slug: "valencia", name: "Valencia", region: "Comunitat Valenciana", lat: 39.4699, lng: -0.3763 },
  { slug: "salamanca", name: "Salamanca", region: "Castilla y León", lat: 40.9701, lng: -5.6635 },
  { slug: "alicante", name: "Alicante", region: "Comunitat Valenciana", lat: 38.3452, lng: -0.481 },
  { slug: "cadiz", name: "Cádiz", region: "Andalucía", lat: 36.5271, lng: -6.2886 },
  { slug: "marbella", name: "Marbella", region: "Andalucía", lat: 36.5101, lng: -4.8825 },
  { slug: "bilbao", name: "Bilbao", region: "País Vasco", lat: 43.263, lng: -2.935 },
  { slug: "zaragoza", name: "Zaragoza", region: "Aragón", lat: 41.6488, lng: -0.8891 },
  { slug: "murcia", name: "Murcia", region: "Región de Murcia", lat: 37.9922, lng: -1.1307 },
];

const BY_SLUG = new Map(CITIES.map((c) => [c.slug, c]));

export function getCity(slug: string): City | undefined {
  return BY_SLUG.get(slug);
}

export const DEFAULT_CITY = "cordoba";
export const CITY_COOKIE = "planea_city";
