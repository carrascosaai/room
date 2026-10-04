import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PlanView } from "@/components/detail/PlanView";
import { getCity } from "@/lib/cities";
import { getPlan, getStats, listPosts, listVenues } from "@/lib/data/catalog";
import type { TargetStats } from "@/lib/types";

export const dynamic = "force-dynamic";

type Params = Promise<{ city: string; id: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id } = await params;
  const plan = await getPlan(id);
  if (!plan) return { title: "Plan", robots: { index: false } };
  return {
    title: plan.title,
    description: `${plan.placeName} · ${plan.description || "Plan creado por la comunidad de PLANEA"}`.slice(0, 160),
    // Los planes son efímeros y, si son "solo con enlace", privados: no se indexan.
    robots: { index: false, follow: true },
  };
}

export default async function PlanPage({ params }: { params: Params }) {
  const { city: c, id } = await params;
  const city = getCity(c);
  if (!city) notFound();
  const plan = await getPlan(id);
  const venues = await listVenues(city.slug);
  const [{ posts, replies }, stats] = plan
    ? await Promise.all([listPosts("plan", plan.id), getStats([{ type: "plan", id: plan.id }])])
    : [{ posts: [], replies: [] }, {} as Record<string, TargetStats>];
  const venue = plan?.venueId ? (venues.find((v) => v.id === plan.venueId) ?? null) : null;
  return (
    <PlanView
      city={city}
      planId={id}
      initialPlan={plan}
      venue={venue ? { slug: venue.slug, name: venue.name, category: venue.category, id: venue.id, neighborhood: venue.neighborhood } : null}
      baseCount={plan ? (stats[`plan:${plan.id}`]?.interested ?? plan.baseAttendees) : 0}
      initialPosts={posts}
      initialReplies={replies}
    />
  );
}
