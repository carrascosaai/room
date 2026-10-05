import type { Metadata } from "next";
import { CityPicker } from "@/components/city/CityPicker";
import { CITIES } from "@/lib/cities";
import { listVenues } from "@/lib/data/catalog";

export const revalidate = 300;
export const metadata: Metadata = {
  title: "Elige tu ciudad",
  description: "PLANEA en Córdoba, Sevilla, Málaga, Granada, Madrid, Barcelona, Valencia, Salamanca y más.",
  alternates: { canonical: "/ciudades" },
};

export default async function CitiesPage() {
  const counts = Object.fromEntries(await Promise.all(CITIES.map(async (c) => [c.slug, (await listVenues(c.slug)).length] as const)));
  return <CityPicker counts={counts} />;
}
