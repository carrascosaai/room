import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CityHome } from "@/components/city/CityHome";
import { CITIES, getCity } from "@/lib/cities";
import { getStats, listEvents, listPlans, listVenues } from "@/lib/data/catalog";

export const revalidate = 60;

export function generateStaticParams() {
  return CITIES.map((c) => ({ city: c.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ city: string }> }): Promise<Metadata> {
  const city = getCity((await params).city);
  if (!city) return {};
  const title = `Qué hacer hoy en ${city.name}: discotecas, copas y planes`;
  const description = `Descubre qué está pasando ahora en ${city.name}: discotecas, bares de copas, conciertos, fiestas universitarias y planes de la gente.`;
  return { title, description, alternates: { canonical: `/${city.slug}` }, openGraph: { title, description } };
}

export default async function CityPage({ params }: { params: Promise<{ city: string }> }) {
  const city = getCity((await params).city);
  if (!city) notFound();
  const [venues, events, plans] = await Promise.all([listVenues(city.slug), listEvents(city.slug), listPlans(city.slug)]);
  const stats = await getStats([
    ...venues.map((v) => ({ type: "venue" as const, id: v.id })),
    ...events.map((e) => ({ type: "event" as const, id: e.id })),
    ...plans.map((p) => ({ type: "plan" as const, id: p.id })),
  ]);
  return <CityHome city={city} venues={venues} events={events} plans={plans} stats={stats} nowIso={new Date().toISOString()} />;
}
