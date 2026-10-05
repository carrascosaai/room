"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Plus } from "lucide-react";
import { useApp } from "@/components/providers/AppProvider";
import { FeedCard } from "@/components/cards/FeedCard";
import { PlanCard } from "@/components/cards/PlanCard";
import { RowCard } from "@/components/cards/RowCard";
import { Chip } from "@/components/ui/Chip";
import { EmptyState } from "@/components/ui/EmptyState";
import { Segmented } from "@/components/ui/Segmented";
import { ButtonLink } from "@/components/ui/Button";
import { categoryOf } from "@/lib/categories";
import { rememberCity } from "@/lib/client/city";
import { buildFeed, upcoming, type FeedInput } from "@/lib/feed";
import { madridParts, TIME_TABS, type TimeTab } from "@/lib/time";
import type { CategorySlug, City, CityEvent, Plan, TargetStats, Venue } from "@/lib/types";
import { CityHeader } from "./CityHeader";

const QUICK: { id: "all" | CategorySlug; label: string }[] = [
  { id: "all", label: "Todo" },
  { id: "discotecas", label: "🪩 Discotecas" },
  { id: "copas", label: "🍸 Copas" },
  { id: "pubs", label: "🍻 Pubs" },
  { id: "conciertos", label: "🎤 Conciertos" },
  { id: "universitario", label: "🎓 Uni" },
  { id: "restaurantes", label: "🍽️ Cenar" },
  { id: "planes", label: "✨ Planes" },
];

function greeting(now: Date) {
  const h = madridParts(now).hour;
  if (h >= 6 && h < 13) return "Buenos días";
  if (h >= 13 && h < 20) return "Buenas tardes";
  return "Buenas noches";
}

export function CityHome({
  city,
  venues,
  events,
  plans: initialPlans,
  stats,
  nowIso,
}: {
  city: City;
  venues: Venue[];
  events: CityEvent[];
  plans: Plan[];
  stats: Record<string, TargetStats>;
  nowIso: string;
}) {
  const { backend } = useApp();
  const [tab, setTab] = useState<TimeTab>("ahora");
  const [cat, setCat] = useState<"all" | CategorySlug>("all");
  const [now, setNow] = useState(() => new Date(nowIso));
  const [plans, setPlans] = useState(initialPlans);

  useEffect(() => {
    rememberCity(city.slug);
    const tick = () => setNow(new Date());
    tick();
    const id = setInterval(tick, 60_000);
    void backend.listPlans(city.slug, initialPlans).then(setPlans);
    return () => clearInterval(id);
  }, [backend, city.slug, initialPlans]);

  const input: FeedInput = useMemo(() => ({ citySlug: city.slug, venues, events, plans, stats }), [city.slug, venues, events, plans, stats]);
  const feed = useMemo(() => buildFeed(input, tab, now), [input, tab, now]);
  const filtered = useMemo(
    () => (cat === "all" ? feed : cat === "planes" ? feed.filter((i) => i.type === "plan") : feed.filter((i) => i.category === cat && i.type !== "plan")),
    [feed, cat],
  );
  const planItems = cat === "all" ? filtered.filter((i) => i.type === "plan") : [];
  const main = cat === "all" ? filtered.filter((i) => i.type !== "plan") : filtered;
  const next = useMemo(() => (tab === "ahora" && main.length < 2 ? upcoming(input, now) : []), [tab, main.length, input, now]);
  const hasCatalog = venues.length > 0;

  return (
    <main className="mx-auto max-w-2xl px-4">
      <CityHeader city={city} />

      <section className="pb-4 pt-2 lg:pt-8">
        <p className="text-sm text-muted">{greeting(now)} · {city.name}</p>
        <h1 className="mt-1 font-display text-[2rem] font-extrabold leading-[1.05] tracking-tight sm:text-4xl">¿Qué hacemos hoy?</h1>
      </section>

      <div className="sticky top-[62px] z-30 -mx-4 space-y-3 bg-bg/85 px-4 pb-3 pt-1 backdrop-blur-xl lg:top-16">
        <Segmented value={tab} onChange={setTab} options={TIME_TABS} />
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
          {QUICK.map((q) => (
            <Chip key={q.id} active={cat === q.id} onClick={() => setCat(q.id)}>
              {q.label}
            </Chip>
          ))}
        </div>
      </div>

      {!hasCatalog ? (
        <EmptyState
          emoji="🚀"
          title={`PLANEA está llegando a ${city.name}`}
          className="mt-6"
          action={
            <ButtonLink href="/crear">
              <Plus size={18} /> Crear el primer plan
            </ButtonLink>
          }
        >
          Todavía no tenemos locales aquí. Mientras tanto, los planes que crea la gente aparecen en esta pantalla.
        </EmptyState>
      ) : null}

      {planItems.length > 0 ? (
        <section className="mt-3">
          <div className="mb-3 flex items-end justify-between">
            <h2 className="font-display text-xl font-bold">Planes de la gente</h2>
            <Link href="/crear" className="text-sm font-semibold text-lime">
              + Crear
            </Link>
          </div>
          <div className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-4 px-4 pb-1">
            {planItems.map((p) => (
              <PlanCard key={p.key} item={p} citySlug={city.slug} />
            ))}
          </div>
        </section>
      ) : null}

      {hasCatalog || main.length ? (
        <section className="mt-6">
          <h2 className="mb-3 font-display text-xl font-bold">
            {tab === "ahora" ? "Pasando ahora" : tab === "noche" ? "Esta noche" : tab === "manana" ? "Mañana" : "Este finde"}
            {cat !== "all" ? <span className="text-muted"> · {categoryOf(cat).label}</span> : null}
          </h2>
          {main.length ? (
            <div className="space-y-4">
              {main.map((item, i) => (
                <FeedCard key={item.key} item={item} citySlug={city.slug} priority={i === 0} />
              ))}
            </div>
          ) : (
            <EmptyState
              emoji={tab === "ahora" ? "🌙" : "🗓️"}
              title={tab === "ahora" ? "Ahora mismo está tranquilo" : "Nada por aquí todavía"}
              action={
                <ButtonLink href="/crear" variant="secondary">
                  <Plus size={18} /> Proponer un plan
                </ButtonLink>
              }
            >
              {tab === "ahora" ? "Mira lo que empieza en un rato o crea tú el plan." : "Prueba con otra categoría u otro día."}
            </EmptyState>
          )}
        </section>
      ) : null}

      {next.length ? (
        <section className="mt-8">
          <h2 className="mb-2 font-display text-xl font-bold">Lo próximo</h2>
          <div className="-mx-2">
            {next.map((item) => (
              <RowCard key={item.key} item={item} />
            ))}
          </div>
        </section>
      ) : null}

      <Link
        href="/crear"
        className="mt-8 flex items-center gap-4 rounded-[1.5rem] border border-lime/25 bg-lime/[0.06] p-5 transition-colors hover:bg-lime/10"
      >
        <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-lime text-lime-ink">
          <Plus size={24} strokeWidth={2.6} />
        </span>
        <span className="flex-1">
          <span className="block font-display text-lg font-bold">¿No encuentras plan?</span>
          <span className="block text-sm text-muted">Créalo en 30 segundos y que se apunte quien quiera.</span>
        </span>
        <ArrowRight className="text-lime" />
      </Link>

      {hasCatalog ? (
        <nav aria-label="Categorías" className="mt-10 border-t border-line pt-6">
          <h2 className="mb-3 text-sm font-semibold text-muted">Explorar {city.name}</h2>
          <div className="flex flex-wrap gap-2">
            {(["discotecas", "copas", "pubs", "conciertos", "universitario", "eventos", "restaurantes", "planes"] as CategorySlug[]).map((c) => (
              <Link key={c} href={`/${city.slug}/${c}`} className="rounded-full border border-line px-3 py-1.5 text-sm text-muted hover:text-ink">
                {categoryOf(c).emoji} {categoryOf(c).seoLabel}
              </Link>
            ))}
          </div>
        </nav>
      ) : null}
    </main>
  );
}
