import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EventView } from "@/components/detail/EventView";
import { getCity } from "@/lib/cities";
import { getEvent } from "@/lib/data/catalog";
import { formatLongDay, formatTime } from "@/lib/time";

export const revalidate = 60;

type Params = Promise<{ city: string; slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { city: c, slug } = await params;
  const city = getCity(c);
  const event = city ? await getEvent(city.slug, slug) : null;
  if (!city || !event) return {};
  const title = `${event.title} — ${city.name}`;
  const description = `${formatLongDay(event.startsAt)} a las ${formatTime(event.startsAt)}${event.venueName ? ` en ${event.venueName}` : ""}. ${event.description.slice(0, 110)}`;
  return { title, description, alternates: { canonical: `/${city.slug}/eventos/${event.slug}` }, openGraph: { title, description } };
}

export default async function EventPage({ params }: { params: Params }) {
  const { city: c, slug } = await params;
  const city = getCity(c);
  if (!city) notFound();
  const event = await getEvent(city.slug, slug);
  if (!event) notFound();
  return <EventView city={city} event={event} />;
}
