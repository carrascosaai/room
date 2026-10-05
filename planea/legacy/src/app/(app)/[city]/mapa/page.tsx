import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MapExplorer } from "@/components/map/MapExplorer";
import { getCity } from "@/lib/cities";
import { getStats, listEvents, listPlans, listVenues } from "@/lib/data/catalog";

export const revalidate = 60;

export async function generateMetadata({ params }: { params: Promise<{ city: string }> }): Promise<Metadata> {
  const city = getCity((await params).city);
  if (!city) return {};
  return { title: `Mapa de ocio de ${city.name}`, description: `Discotecas, copas, conciertos y planes de ${city.name} en el mapa.`, alternates: { canonical: `/${city.slug}/mapa` } };
}

export default async function MapPage({ params, searchParams }: { params: Promise<{ city: string }>; searchParams: Promise<{ foco?: string }> }) {
  const city = getCity((await params).city);
  if (!city) notFound();
  const { foco } = await searchParams;
  const [venues, events, plans] = await Promise.all([listVenues(city.slug), listEvents(city.slug), listPlans(city.slug)]);
  const stats = await getStats([
    ...venues.map((v) => ({ type: "venue" as const, id: v.id })),
    ...events.map((e) => ({ type: "event" as const, id: e.id })),
    ...plans.map((p) => ({ type: "plan" as const, id: p.id })),
  ]);
  return <MapExplorer city={city} venues={venues} events={events} plans={plans} stats={stats} nowIso={new Date().toISOString()} focusId={foco ?? null} />;
}
