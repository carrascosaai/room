"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Clock, Euro, Flame, LocateFixed, MapPin, X } from "lucide-react";
import { useApp } from "@/components/providers/AppProvider";
import { Chip } from "@/components/ui/Chip";
import { Cover } from "@/components/ui/Cover";
import { buttonClass } from "@/components/ui/Button";
import { categoryOf } from "@/lib/categories";
import { requestCoords, useCoords } from "@/lib/client/location";
import { eventItem, planItem, venueItem, type FeedItem } from "@/lib/feed";
import { distanceKm, formatDistance } from "@/lib/geo";
import { DAY, openIntervals, overlaps } from "@/lib/time";
import { computeTrending } from "@/lib/trending";
import type { CategorySlug, City, CityEvent, Plan, TargetStats, Venue } from "@/lib/types";
import { compactNumber } from "@/lib/utils";
import type { MapMarker } from "./LeafletMap";

const LeafletMap = dynamic(() => import("./LeafletMap"), {
  ssr: false,
  loading: () => <div className="skeleton absolute inset-0 rounded-none" />,
});

type Filter = "all" | "trending" | CategorySlug;
const FILTERS: { id: Filter; label: string; match?: CategorySlug[] }[] = [
  { id: "all", label: "Todo" },
  { id: "trending", label: "🔥 Tendencia" },
  { id: "discotecas", label: "🪩 Discotecas", match: ["discotecas"] },
  { id: "copas", label: "🍻 Copas", match: ["copas", "pubs"] },
  { id: "conciertos", label: "🎤 Conciertos", match: ["conciertos"] },
  { id: "universitario", label: "🎓 Universitario", match: ["universitario"] },
  { id: "restaurantes", label: "🍽️ Restaurantes", match: ["restaurantes"] },
  { id: "eventos", label: "🎉 Eventos", match: ["eventos", "festivales"] },
];

export function MapExplorer({
  city,
  venues,
  events,
  plans: initialPlans,
  stats,
  nowIso,
  focusId,
}: {
  city: City;
  venues: Venue[];
  events: CityEvent[];
  plans: Plan[];
  stats: Record<string, TargetStats>;
  nowIso: string;
  focusId: string | null;
}) {
  const { backend, toast } = useApp();
  const coords = useCoords();
  const [filter, setFilter] = useState<Filter>("all");
  const [plans, setPlans] = useState(initialPlans);
  const [selected, setSelected] = useState<string | null>(focusId ? `venue:${focusId}` : null);
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    void backend.listPlans(city.slug, initialPlans).then(setPlans);
  }, [backend, city.slug, initialPlans]);

  const { items, eventsByVenue } = useMemo(() => {
    const now = new Date(nowIso);
    const horizon = new Date(now.getTime() + DAY);
    const byVenue = new Map<string, CityEvent>();
    const out: FeedItem[] = [];
    for (const e of events) {
      if (!overlaps(new Date(e.startsAt), new Date(e.endsAt), { from: now, to: horizon })) continue;
      if (e.venueId) {
        if (!byVenue.has(e.venueId)) byVenue.set(e.venueId, e);
        continue; // el evento se muestra dentro de la tarjeta de su local
      }
      out.push(eventItem(e, stats[`event:${e.id}`], now));
    }
    for (const v of venues) {
      const iv = openIntervals(v.hours, now, new Date(now.getTime() + 7 * DAY))[0];
      out.push(venueItem(v, stats[`venue:${v.id}`], iv?.from ?? now, iv?.to ?? now, now));
    }
    const venueById = new Map(venues.map((v) => [v.id, v]));
    for (const p of plans) {
      const v = p.venueId ? venueById.get(p.venueId) : undefined;
      if (!v) continue; // planes sin local no se sitúan en el mapa (privacidad)
      const it = planItem(p, stats[`plan:${p.id}`], now, { lat: v.lat + 0.0004, lng: v.lng + 0.0004 });
      out.push(it);
    }
    return { items: out, eventsByVenue: byVenue };
  }, [events, venues, plans, stats, nowIso]);

  const trendingKeys = useMemo(() => new Set(computeTrending({ venues, events, plans, stats }, new Date(nowIso), 6).map((t) => t.item.key)), [venues, events, plans, stats, nowIso]);

  const visible = useMemo(() => {
    if (filter === "all") return items;
    if (filter === "trending") return items.filter((i) => trendingKeys.has(i.key));
    const match = FILTERS.find((f) => f.id === filter)?.match ?? [];
    return items.filter((i) => match.includes(i.category) || (i.type === "venue" && match.includes(eventsByVenue.get(i.id)?.category as CategorySlug)));
  }, [filter, items, trendingKeys, eventsByVenue]);

  const markers: MapMarker[] = useMemo(
    () => visible.map((i) => ({ key: i.key, lat: i.lat, lng: i.lng, emoji: i.emoji, live: i.live, hot: trendingKeys.has(i.key), label: i.title })),
    [visible, trendingKeys],
  );

  const sel = items.find((i) => i.key === selected) ?? null;
  const selEvent = sel?.type === "venue" ? eventsByVenue.get(sel.id) : undefined;

  async function locate() {
    setLocating(true);
    try {
      await requestCoords();
    } catch (e) {
      toast({ message: (e as Error).message, tone: "error" });
    } finally {
      setLocating(false);
    }
  }

  return (
    <main className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] top-0 z-10 overflow-hidden lg:bottom-0 lg:top-16">
      <LeafletMap center={city} markers={markers} selected={selected} onSelect={setSelected} user={coords} />

      <div className="pointer-events-none absolute inset-x-0 top-0 z-[500] bg-gradient-to-b from-bg/90 to-transparent px-4 pb-6 pt-3">
        <div className="pointer-events-auto flex items-center justify-between">
          <h1 className="font-display text-xl font-bold">Mapa · {city.name}</h1>
          <button
            onClick={() => void locate()}
            aria-label="Centrar en mi ubicación"
            className="grid size-10 place-items-center rounded-full border border-line bg-surface/90 text-sky backdrop-blur"
          >
            <LocateFixed size={18} className={locating ? "animate-spin" : ""} />
          </button>
        </div>
        <div className="no-scrollbar pointer-events-auto -mx-4 mt-3 flex gap-2 overflow-x-auto px-4">
          {FILTERS.map((f) => (
            <Chip key={f.id} active={filter === f.id} onClick={() => setFilter(f.id)} className={filter === f.id ? "" : "bg-surface/90 backdrop-blur"}>
              {f.label}
            </Chip>
          ))}
        </div>
      </div>

      {!sel ? (
        <p className="pointer-events-none absolute inset-x-0 bottom-4 z-[500] mx-auto w-fit rounded-full bg-surface/90 px-4 py-2 text-xs text-muted backdrop-blur">
          {visible.length} sitios · Nadie aparece en el mapa, solo los lugares
        </p>
      ) : (
        <div className="absolute inset-x-0 bottom-0 z-[600] animate-sheet-up p-3 sm:left-auto sm:right-4 sm:top-28 sm:w-96 sm:p-0">
          <div className="overflow-hidden rounded-[1.5rem] border border-line-strong bg-surface shadow-2xl shadow-black/70">
            <div className="relative">
              <Cover seed={sel.id} category={sel.category} imageUrl={sel.imageUrl} alt={sel.title} className="h-28" emojiSize="text-5xl" sizes="400px" />
              <button onClick={() => setSelected(null)} aria-label="Cerrar" className="absolute right-3 top-3 grid size-8 place-items-center rounded-full bg-black/60 text-white">
                <X size={16} />
              </button>
              {sel.live ? (
                <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-black/60 px-2.5 py-1 text-xs font-semibold text-live">
                  <span className="size-1.5 animate-pulse-dot rounded-full bg-live" /> {sel.popularNow ? "Popular ahora" : "Abierto"}
                </span>
              ) : null}
            </div>
            <div className="p-4">
              <p className="text-xs font-medium text-muted">
                {categoryOf(sel.category).emoji} {sel.type === "plan" ? "Plan de la comunidad" : categoryOf(sel.category).label} · {sel.subtitle}
              </p>
              <h2 className="mt-0.5 font-display text-xl font-bold leading-tight">{sel.title}</h2>
              <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5 text-sm text-muted">
                <span className="inline-flex items-center gap-1.5">
                  <Clock size={14} /> {sel.live ? sel.timeLabel : sel.statusLabel}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Euro size={14} /> {sel.priceLabel}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Flame size={14} className="text-hot" /> {compactNumber(sel.interest)} {sel.type === "plan" ? "apuntados" : "interesados"}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <MapPin size={14} /> {coords ? formatDistance(distanceKm(coords, sel)) : "Activa ubicación"}
                </span>
              </div>
              {selEvent ? (
                <Link href={`/${city.slug}/eventos/${selEvent.slug}`} className="mt-3 block rounded-xl bg-surface-2 px-3 py-2 text-sm">
                  <span className="text-dim">Hoy: </span>
                  <span className="font-semibold">{selEvent.title}</span>
                </Link>
              ) : null}
              <Link href={sel.href} className={buttonClass("primary", "md", "mt-4 w-full")}>
                Ver plan
              </Link>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
