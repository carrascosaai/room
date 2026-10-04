import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Discover } from "@/components/city/Discover";
import { getCity } from "@/lib/cities";
import { getStats, listEvents, listPlans, listVenues } from "@/lib/data/catalog";

export const revalidate = 60;

export async function generateMetadata({ params }: { params: Promise<{ city: string }> }): Promise<Metadata> {
  const city = getCity((await params).city);
  if (!city) return {};
  return { title: `Descubre ${city.name}`, description: `Encuentra planes en ${city.name}: cerca de ti, gratis, de fiesta o tranquilos.`, alternates: { canonical: `/${city.slug}/descubre` } };
}

export default async function DiscoverPage({ params }: { params: Promise<{ city: string }> }) {
  const city = getCity((await params).city);
  if (!city) notFound();
  const [venues, events, plans] = await Promise.all([listVenues(city.slug), listEvents(city.slug), listPlans(city.slug)]);
  const stats = await getStats([
    ...venues.map((v) => ({ type: "venue" as const, id: v.id })),
    ...events.map((e) => ({ type: "event" as const, id: e.id })),
    ...plans.map((p) => ({ type: "plan" as const, id: p.id })),
  ]);
  return <Discover city={city} venues={venues} events={events} plans={plans} stats={stats} nowIso={new Date().toISOString()} />;
}
