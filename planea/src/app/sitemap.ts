import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/config";
import { listAllPlaces, listCities } from "@/lib/data";
import { placeHref } from "@/lib/slug";

export const revalidate = 86400;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [cities, places] = await Promise.all([listCities(), listAllPlaces()]);
  return [
    { url: SITE_URL, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/mapa`, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/ciudades`, changeFrequency: "weekly", priority: 0.8 },
    ...cities.map((c) => ({ url: `${SITE_URL}/${c.slug}`, changeFrequency: "daily" as const, priority: c.curated ? 0.8 : 0.5 })),
    ...places.map((p) => ({ url: `${SITE_URL}${placeHref(p)}`, changeFrequency: "weekly" as const, priority: p.top ? 0.6 : 0.3 })),
  ];
}
