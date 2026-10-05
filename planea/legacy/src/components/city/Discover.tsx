"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Search, Star, X } from "lucide-react";
import { useApp } from "@/components/providers/AppProvider";
import { Chip } from "@/components/ui/Chip";
import { Cover } from "@/components/ui/Cover";
import { DemoBadge } from "@/components/ui/DemoBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusPill } from "@/components/cards/StatusPill";
import { categoryOf } from "@/lib/categories";
import { requestCoords, useCoords } from "@/lib/client/location";
import { eventItem, planItem, venueItem, type FeedItem } from "@/lib/feed";
import { distanceKm, formatDistance } from "@/lib/geo";
import { DAY, openIntervals, overlaps, windowFor } from "@/lib/time";
import type { CategorySlug, City, CityEvent, Plan, TargetStats, Venue } from "@/lib/types";
import { compactNumber } from "@/lib/utils";

type Sort = "popular" | "near" | "rated";
type FilterId = "tonight" | "free" | "cheap" | "discotecas" | "copas" | "conciertos" | "universitario" | "tranquilo" | "fiesta";

const SORTS: { id: Sort; label: string }[] = [
  { id: "popular", label: "🔥 Más populares" },
  { id: "near", label: "📍 Cerca de mí" },
  { id: "rated", label: "⭐ Mejor valorados" },
];
const FILTERS: { id: FilterId; label: string; group: string }[] = [
  { id: "tonight", label: "🌙 Esta noche", group: "time" },
  { id: "free", label: "Gratis", group: "price" },
  { id: "cheap", label: "Menos de 10 €", group: "price" },
  { id: "discotecas", label: "🪩 Discotecas", group: "cat" },
  { id: "copas", label: "🍸 Copas", group: "cat" },
  { id: "conciertos", label: "🎤 Conciertos", group: "cat" },
  { id: "universitario", label: "🎓 Universitario", group: "cat" },
  { id: "tranquilo", label: "🌿 Planes tranquilos", group: "vibe" },
  { id: "fiesta", label: "🎉 Planes de fiesta", group: "vibe" },
];

const CAT_MATCH: Partial<Record<FilterId, CategorySlug[]>> = {
  discotecas: ["discotecas"],
  copas: ["copas", "pubs"],
  conciertos: ["conciertos"],
  universitario: ["universitario"],
};

export function Discover({
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
  const { backend, toast } = useApp();
  const coords = useCoords();
  const [sort, setSort] = useState<Sort>("popular");
  const [active, setActive] = useState<Set<FilterId>>(new Set());
  const [q, setQ] = useState("");
  const [plans, setPlans] = useState(initialPlans);

  useEffect(() => {
    void backend.listPlans(city.slug, initialPlans).then(setPlans);
  }, [backend, city.slug, initialPlans]);

  const ratings = useMemo(() => new Map(venues.map((v) => [v.id, v.baseRating])), [venues]);

  const all = useMemo(() => {
    const now = new Date(nowIso);
    const week = new Date(now.getTime() + 7 * DAY);
    const out: FeedItem[] = [
      ...events.map((e) => eventItem(e, stats[`event:${e.id}`], now)),
      ...venues.map((v) => {
        const iv = openIntervals(v.hours, now, week)[0];
        return venueItem(v, stats[`venue:${v.id}`], iv?.from ?? now, iv?.to ?? now, now);
      }),
    ];
    const venueById = new Map(venues.map((v) => [v.id, v]));
    for (const p of plans) out.push(planItem(p, stats[`plan:${p.id}`], now, p.venueId ? venueById.get(p.venueId) : undefined));
    return out;
  }, [events, venues, plans, stats, nowIso]);

  const results = useMemo(() => {
    const now = new Date(nowIso);
    const tonight = windowFor("noche", now);
    const groups = new Map<string, FilterId[]>();
    for (const f of FILTERS) if (active.has(f.id)) groups.set(f.group, [...(groups.get(f.group) ?? []), f.id]);
    const needle = q.trim().toLowerCase();
    const test = (i: FeedItem, f: FilterId): boolean => {
      switch (f) {
        case "tonight":
          return overlaps(new Date(i.start), new Date(i.end), tonight);
        case "free":
          return i.priceFrom === 0;
        case "cheap":
          return i.priceFrom < 10;
        case "tranquilo":
        case "fiesta":
          return i.vibe === f;
        default:
          return (CAT_MATCH[f] ?? []).includes(i.category);
      }
    };
    let list = all.filter(
      (i) =>
        [...groups.values()].every((ids) => ids.some((f) => test(i, f))) &&
        (!needle || i.title.toLowerCase().includes(needle) || i.subtitle.toLowerCase().includes(needle) || categoryOf(i.category).label.toLowerCase().includes(needle)),
    );
    if (sort === "near" && coords) list = [...list].filter((i) => i.lat).sort((a, b) => distanceKm(coords, a) - distanceKm(coords, b));
    else if (sort === "rated") list = list.filter((i) => i.type === "venue").sort((a, b) => (ratings.get(b.id) ?? 0) - (ratings.get(a.id) ?? 0));
    else list = [...list].sort((a, b) => Number(b.live) - Number(a.live) || b.interest - a.interest);
    return list;
  }, [all, active, q, sort, coords, ratings, nowIso]);

  async function pickSort(s: Sort) {
    if (s === "near" && !coords) {
      try {
        await requestCoords();
      } catch (e) {
        toast({ message: (e as Error).message, tone: "error" });
        return;
      }
    }
    setSort(s);
  }

  function toggle(id: FilterId) {
    setActive((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <main className="mx-auto max-w-3xl px-4 pt-4 lg:pt-10">
      <h1 className="font-display text-3xl font-extrabold tracking-tight">Descubre {city.name}</h1>
      <div className="relative mt-4">
        <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-dim" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Busca un sitio, un evento, un barrio…"
          className="field h-12 rounded-full pl-11"
          type="search"
          enterKeyHint="search"
        />
      </div>
      <div className="sticky top-0 z-30 -mx-4 bg-bg/85 px-4 py-3 backdrop-blur-xl lg:top-16">
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
          {SORTS.map((s) => (
            <Chip key={s.id} active={sort === s.id} onClick={() => void pickSort(s.id)}>
              {s.label}
            </Chip>
          ))}
          <span className="mx-1 w-px shrink-0 bg-line" />
          {FILTERS.map((f) => (
            <Chip key={f.id} active={active.has(f.id)} onClick={() => toggle(f.id)}>
              {f.label}
            </Chip>
          ))}
        </div>
        {active.size || q ? (
          <button onClick={() => (setActive(new Set()), setQ(""))} className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-muted">
            <X size={14} /> Quitar filtros · {results.length} resultados
          </button>
        ) : null}
      </div>

      {results.length ? (
        <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {results.map((i) => (
            <Link key={i.key} href={i.href} className="group relative animate-fade-up overflow-hidden rounded-[1.25rem] border border-line bg-surface transition-transform active:scale-[0.98]">
              <Cover seed={i.id} category={i.type === "plan" ? "planes" : i.category} imageUrl={i.imageUrl} alt="" className="aspect-[4/5]" emojiSize="text-6xl" sizes="(max-width: 640px) 50vw, 240px" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
              <StatusPill item={i} className="absolute left-2 top-2 px-2 py-0.5 text-[11px]" />
              {i.isDemo ? <DemoBadge className="absolute right-2 top-2" /> : null}
              <div className="absolute inset-x-0 bottom-0 p-3">
                <p className="text-[11px] font-medium text-white/70">
                  {categoryOf(i.category).emoji} {i.subtitle}
                </p>
                <p className="mt-0.5 line-clamp-2 font-display text-base font-bold leading-tight">{i.title}</p>
                <p className="mt-1.5 flex items-center gap-2 text-xs text-white/75">
                  <span>🔥 {compactNumber(i.interest)}</span>
                  {sort === "rated" ? (
                    <span className="inline-flex items-center gap-0.5">
                      <Star size={11} className="fill-amber text-amber" /> {(ratings.get(i.id) ?? 0).toFixed(1)}
                    </span>
                  ) : null}
                  {coords && i.lat ? <span>{formatDistance(distanceKm(coords, i))}</span> : <span>{i.priceLabel}</span>}
                </p>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState emoji="🔍" title="Nada con esos filtros" className="mt-4">
          Prueba a quitar alguno o busca otra cosa.
        </EmptyState>
      )}
    </main>
  );
}
