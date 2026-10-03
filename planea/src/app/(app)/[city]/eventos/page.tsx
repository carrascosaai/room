import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CategoryListing } from "@/components/city/CategoryListing";
import { getCity } from "@/lib/cities";

export const revalidate = 60;

export async function generateMetadata({ params }: { params: Promise<{ city: string }> }): Promise<Metadata> {
  const city = getCity((await params).city);
  if (!city) return {};
  return {
    title: `Eventos en ${city.name} hoy y este finde`,
    description: `Conciertos, fiestas universitarias, festivales y eventos en ${city.name}.`,
    alternates: { canonical: `/${city.slug}/eventos` },
  };
}

export default async function EventsPage({ params }: { params: Promise<{ city: string }> }) {
  const city = getCity((await params).city);
  if (!city) notFound();
  return <CategoryListing city={city} category="eventos" />;
}
