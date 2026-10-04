import type { Metadata } from "next";
import { cookies } from "next/headers";
import { CreatePlanForm } from "@/components/create/CreatePlanForm";
import { CITY_COOKIE, DEFAULT_CITY, getCity } from "@/lib/cities";

export const metadata: Metadata = { title: "Crear plan", robots: { index: false } };

export default async function CreatePage({ searchParams }: { searchParams: Promise<{ city?: string; venue?: string }> }) {
  const sp = await searchParams;
  const fromCookie = (await cookies()).get(CITY_COOKIE)?.value;
  const city = [sp.city, fromCookie].find((c) => c && getCity(c)) ?? DEFAULT_CITY;
  return <CreatePlanForm defaultCity={city} defaultVenue={sp.venue ?? null} />;
}
