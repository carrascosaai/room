import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CategoryListing } from "@/components/city/CategoryListing";
import { VenueView } from "@/components/detail/VenueView";
import { getCategory } from "@/lib/categories";
import { getCity } from "@/lib/cities";
import { getVenue } from "@/lib/data/catalog";

export const revalidate = 60;

type Params = Promise<{ city: string; slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { city: c, slug } = await params;
  const city = getCity(c);
  if (!city) return {};
  const cat = getCategory(slug);
  if (cat) {
    const title = `${cat.seoLabel} en ${city.name}`;
    const description = `${cat.seoLabel} en ${city.name}: qué está abierto hoy, horarios, precios, ambiente y opiniones de la gente.`;
    return { title, description, alternates: { canonical: `/${city.slug}/${cat.slug}` }, openGraph: { title, description } };
  }
  const venue = await getVenue(city.slug, slug);
  if (!venue) return {};
  const title = `${venue.name} — ${city.name}`;
  const description = `${venue.description.slice(0, 150)}`;
  return { title, description, alternates: { canonical: `/${city.slug}/${venue.slug}` }, openGraph: { title, description } };
}

export default async function CityslugPage({ params }: { params: Params }) {
  const { city: c, slug } = await params;
  const city = getCity(c);
  if (!city) notFound();
  const cat = getCategory(slug);
  if (cat) return <CategoryListing city={city} category={cat.slug} />;
  const venue = await getVenue(city.slug, slug);
  if (!venue) notFound();
  return <VenueView city={city} venue={venue} />;
}
