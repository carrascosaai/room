import type { MetadataRoute } from "next";
import { CATEGORIES } from "@/lib/categories";
import { CITIES } from "@/lib/cities";
import { SITE_URL } from "@/lib/config";
import { listEvents, listVenues } from "@/lib/data/catalog";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const out: MetadataRoute.Sitemap = [
    { url: SITE_URL, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/ciudades`, lastModified: now, changeFrequency: "weekly", priority: 0.6 },
    { url: `${SITE_URL}/normas`, lastModified: now, changeFrequency: "monthly", priority: 0.2 },
  ];
  for (const city of CITIES) {
    out.push({ url: `${SITE_URL}/${city.slug}`, lastModified: now, changeFrequency: "hourly", priority: 0.9 });
    for (const p of ["tendencias", "mapa", ...CATEGORIES.map((c) => c.slug)])
      out.push({ url: `${SITE_URL}/${city.slug}/${p}`, lastModified: now, changeFrequency: "daily", priority: 0.7 });
    const [venues, events] = await Promise.all([listVenues(city.slug), listEvents(city.slug)]);
    for (const v of venues) out.push({ url: `${SITE_URL}/${city.slug}/${v.slug}`, lastModified: now, changeFrequency: "daily", priority: 0.8 });
    for (const e of events) out.push({ url: `${SITE_URL}/${city.slug}/eventos/${e.slug}`, lastModified: now, changeFrequency: "daily", priority: 0.7 });
  }
  return out;
}
