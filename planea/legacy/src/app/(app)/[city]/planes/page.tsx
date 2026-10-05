import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CategoryListing } from "@/components/city/CategoryListing";
import { getCity } from "@/lib/cities";

export const revalidate = 60;

export async function generateMetadata({ params }: { params: Promise<{ city: string }> }): Promise<Metadata> {
  const city = getCity((await params).city);
  if (!city) return {};
  return { title: `Planes para hoy en ${city.name}`, description: `Planes espontáneos creados por la gente en ${city.name}.`, alternates: { canonical: `/${city.slug}/planes` } };
}

export default async function PlansPage({ params }: { params: Promise<{ city: string }> }) {
  const city = getCity((await params).city);
  if (!city) notFound();
  return <CategoryListing city={city} category="planes" />;
}
