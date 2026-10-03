import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Info } from "lucide-react";
import { FeedCard } from "@/components/cards/FeedCard";
import { RowCard } from "@/components/cards/RowCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { ButtonLink } from "@/components/ui/Button";
import { getCity } from "@/lib/cities";
import { getStats, listEvents, listPlans, listVenues } from "@/lib/data/catalog";
import { computeTrending } from "@/lib/trending";

export const revalidate = 60;

export async function generateMetadata({ params }: { params: Promise<{ city: string }> }): Promise<Metadata> {
  const city = getCity((await params).city);
  if (!city) return {};
  return { title: `Lo más top hoy en ${city.name}`, description: `Ranking en tiempo real de los sitios, eventos y planes con más actividad en ${city.name}.`, alternates: { canonical: `/${city.slug}/tendencias` } };
}

export default async function TrendingPage({ params }: { params: Promise<{ city: string }> }) {
  const city = getCity((await params).city);
  if (!city) notFound();
  const [venues, events, plans] = await Promise.all([listVenues(city.slug), listEvents(city.slug), listPlans(city.slug)]);
  const stats = await getStats([
    ...venues.map((v) => ({ type: "venue" as const, id: v.id })),
    ...events.map((e) => ({ type: "event" as const, id: e.id })),
    ...plans.map((p) => ({ type: "plan" as const, id: p.id })),
  ]);
  const ranking = computeTrending({ venues, events, plans, stats }, new Date());
  const [first, ...rest] = ranking;

  return (
    <main className="mx-auto max-w-2xl px-4 pt-4 lg:pt-10">
      <p className="text-sm font-semibold uppercase tracking-widest text-hot">🔥 En tendencia</p>
      <h1 className="mt-1 font-display text-3xl font-extrabold tracking-tight">Lo que más se mueve en {city.name}</h1>
      <p className="mt-1 text-muted">Ranking en vivo según la actividad de las últimas 24 horas.</p>

      {first ? (
        <div className="mt-6 space-y-2">
          <div className="relative">
            <span className="absolute -left-1 -top-3 z-20 rounded-full bg-lime px-3 py-1 font-display text-sm font-extrabold text-lime-ink shadow-lg">#1 hoy</span>
            <FeedCard item={first.item} citySlug={city.slug} priority />
          </div>
          <p className="px-1 text-xs text-dim">{first.reasons.join(" · ")}</p>
          <ol className="-mx-2 mt-4">
            {rest.map((t) => (
              <li key={t.item.key}>
                <RowCard item={t.item} rank={t.rank} extra={t.reasons.join(" · ")} />
              </li>
            ))}
          </ol>
        </div>
      ) : (
        <EmptyState emoji="📈" title="Todavía no hay tendencias" className="mt-6" action={<ButtonLink href="/crear">Crear un plan</ButtonLink>}>
          En cuanto la gente empiece a moverse en {city.name}, aquí verás lo más top.
        </EmptyState>
      )}

      <aside className="mt-8 flex gap-3 rounded-2xl border border-line bg-surface p-4 text-sm text-muted">
        <Info size={18} className="mt-0.5 shrink-0" />
        <p>
          La posición depende de la actividad reciente: personas interesadas, visitas, planes creados, votos e interacción en el salseo. No se puede pagar para subir en este ranking.
        </p>
      </aside>
    </main>
  );
}
