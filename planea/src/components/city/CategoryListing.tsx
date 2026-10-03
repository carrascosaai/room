import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { CATEGORIES, categoryOf } from "@/lib/categories";
import { getStats, listEvents, listPlans, listVenues } from "@/lib/data/catalog";
import { eventItem, venueItem, type FeedItem } from "@/lib/feed";
import { openIntervals } from "@/lib/time";
import type { CategorySlug, City } from "@/lib/types";
import { FeedCard } from "@/components/cards/FeedCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { ButtonLink } from "@/components/ui/Button";
import { PlansList } from "./PlansList";

/** Página SEO por ciudad y categoría: /sevilla/discotecas, /madrid/eventos… */
export async function CategoryListing({ city, category }: { city: City; category: CategorySlug }) {
  const cat = categoryOf(category);
  const now = new Date();
  const [venues, events, plans] = await Promise.all([listVenues(city.slug), listEvents(city.slug), listPlans(city.slug)]);
  const isEvents = category === "eventos";
  const vs = isEvents ? [] : venues.filter((v) => v.category === category);
  const es = isEvents ? events : events.filter((e) => e.category === category);
  const stats = await getStats([
    ...vs.map((v) => ({ type: "venue" as const, id: v.id })),
    ...es.map((e) => ({ type: "event" as const, id: e.id })),
    ...plans.map((p) => ({ type: "plan" as const, id: p.id })),
  ]);
  const week = new Date(now.getTime() + 7 * 86_400_000);
  const items: FeedItem[] = [
    ...es.map((e) => eventItem(e, stats[`event:${e.id}`], now)),
    ...vs.map((v) => {
      const iv = openIntervals(v.hours, now, week)[0];
      return venueItem(v, stats[`venue:${v.id}`], iv?.from ?? now, iv?.to ?? now, now);
    }),
  ].sort((a, b) => Number(b.live) - Number(a.live) || b.interest - a.interest);

  return (
    <main className="mx-auto max-w-2xl px-4 pt-4 lg:pt-8">
      <Link href={`/${city.slug}`} className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink">
        <ArrowLeft size={16} /> {city.name}
      </Link>
      <h1 className="mt-3 font-display text-3xl font-extrabold tracking-tight">
        {cat.emoji} {cat.seoLabel} en {city.name}
      </h1>
      <p className="mt-1 text-muted">
        {category === "planes" ? "Planes espontáneos creados por la gente. Apúntate o crea el tuyo." : "Qué está abierto, cuándo y cuánta gente quiere ir."}
      </p>
      <div className="no-scrollbar -mx-4 mt-4 flex gap-2 overflow-x-auto px-4">
        {CATEGORIES.filter((c) => c.slug !== category).map((c) => (
          <Link key={c.slug} href={`/${city.slug}/${c.slug}`} className="shrink-0 rounded-full border border-line px-3 py-1.5 text-sm text-muted hover:text-ink">
            {c.emoji} {c.label}
          </Link>
        ))}
      </div>
      <div className="mt-6 space-y-4">
        {category === "planes" ? (
          <PlansList citySlug={city.slug} initial={plans} stats={stats} nowIso={now.toISOString()} />
        ) : items.length ? (
          items.map((item, i) => <FeedCard key={item.key} item={item} citySlug={city.slug} priority={i === 0} />)
        ) : (
          <EmptyState emoji={cat.emoji} title={`Aún no hay ${cat.label.toLowerCase()} en ${city.name}`} action={<ButtonLink href="/crear">Crear un plan</ButtonLink>}>
            Estamos sumando sitios cada semana.
          </EmptyState>
        )}
      </div>
    </main>
  );
}
