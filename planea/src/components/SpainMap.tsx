"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowRight, Navigation, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { directionsUrl, KIND_ORDER, KINDS } from "@/lib/kinds";
import { placeHref } from "@/lib/slug";
import type { Kind } from "@/lib/types";
import { cn } from "@/lib/utils";
import { GoingButton, GoingLine } from "./GoingButton";
import { useGoingMap } from "./GoingProvider";
import type { MapPoint } from "./map/PlacesMap";

const PlacesMap = dynamic(() => import("./map/PlacesMap"), { ssr: false, loading: () => <div className="skeleton absolute inset-0" /> });

type Row = [id: string, city: string, name: string, k: string, lat: number, lng: number, top: 0 | 1];
const KIND_BY_LETTER: Record<string, Kind> = { d: "discoteca", b: "bar", s: "sala", z: "zona" };

/** Mapa con todos los sitios de España, agrupados en clústeres. */
export function SpainMap() {
  const going = useGoingMap();
  const [data, setData] = useState<{ points: Omit<MapPoint, "going">[]; cityNames: Record<string, string> } | null>(null);
  const [error, setError] = useState(false);
  const [kinds, setKinds] = useState<Set<Kind>>(new Set(KIND_ORDER));
  const [onlyTop, setOnlyTop] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/places")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d: { cities: [string, string, number, number, number][]; places: Row[] }) =>
        setData({
          cityNames: Object.fromEntries(d.cities.map((c) => [c[0], c[1]])),
          points: d.places.map(([id, city, name, k, lat, lng, top]) => ({ id, city, name, kind: KIND_BY_LETTER[k] ?? "discoteca", lat, lng, top: top === 1 })),
        }),
      )
      .catch(() => setError(true));
  }, []);

  const points: MapPoint[] = useMemo(
    () => (data?.points ?? []).filter((p) => kinds.has(p.kind) && (!onlyTop || p.top || (going[p.id]?.total ?? 0) > 0)).map((p) => ({ ...p, going: going[p.id]?.total ?? 0 })),
    [data, kinds, onlyTop, going],
  );
  const sel = useMemo(() => data?.points.find((p) => p.id === selected) ?? null, [data, selected]);

  const toggleKind = (k: Kind) =>
    setKinds((prev) => {
      const n = new Set(prev);
      if (n.has(k) && n.size > 1) n.delete(k);
      else n.add(k);
      return n;
    });

  return (
    <div className="relative h-[calc(100dvh-3.5rem-env(safe-area-inset-top))]">
      <PlacesMap points={points} center={[40.2, -3.7]} zoom={6} selected={selected} onSelect={setSelected} />

      <div className="pointer-events-none absolute inset-x-0 top-0 z-[500] p-3">
        <div className="no-scrollbar pointer-events-auto flex gap-2 overflow-x-auto">
          {KIND_ORDER.map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => toggleKind(k)}
              className={cn(
                "shrink-0 rounded-full border px-3 py-1.5 text-sm font-medium shadow-lg shadow-black/40 backdrop-blur-xl",
                kinds.has(k) ? "border-transparent bg-surface-2/95 text-ink" : "border-line bg-bg/70 text-dim line-through",
              )}
            >
              {KINDS[k].emoji} {KINDS[k].plural}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setOnlyTop((v) => !v)}
            className={cn(
              "shrink-0 rounded-full border px-3 py-1.5 text-sm font-medium shadow-lg shadow-black/40 backdrop-blur-xl",
              onlyTop ? "border-amber bg-amber text-black" : "border-line bg-bg/70 text-muted",
            )}
          >
            ⭐ Solo top y con gente
          </button>
        </div>
        {!data && !error && <p className="mt-2 inline-block rounded-full bg-bg/80 px-3 py-1 text-xs text-muted">Cargando todos los sitios de España…</p>}
        {error && <p className="pointer-events-auto mt-2 inline-block rounded-full bg-danger/20 px-3 py-1 text-xs text-[#ffc9c9]">No se ha podido cargar el mapa. Recarga la página.</p>}
      </div>

      {sel && (
        <div className="absolute inset-x-0 bottom-0 z-[600] p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
          <div className="mx-auto max-w-md animate-sheet-up rounded-card border border-line-strong bg-surface/95 p-4 shadow-2xl shadow-black/70 backdrop-blur-xl">
            <div className="flex items-start gap-3">
              <span className="text-3xl">{KINDS[sel.kind].emoji}</span>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-dim">
                  {KINDS[sel.kind].label} · {data?.cityNames[sel.city] ?? sel.city}
                </p>
                <p className="font-display text-xl font-bold leading-tight">{sel.name}</p>
                <GoingLine id={sel.id} className="mt-1" />
              </div>
              <button type="button" onClick={() => setSelected(null)} aria-label="Cerrar" className="rounded-full p-1 text-muted hover:text-ink">
                <X size={20} />
              </button>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <GoingButton id={sel.id} city={sel.city} name={sel.name} />
              <a href={directionsUrl(sel)} target="_blank" rel="noopener noreferrer" className="inline-flex h-10 items-center gap-1.5 rounded-full border border-line-strong px-3.5 text-sm font-medium text-muted hover:text-ink">
                <Navigation size={15} /> Ir
              </a>
              <Link href={placeHref(sel)} className="ml-auto inline-flex h-10 items-center gap-1 text-sm font-semibold text-lime hover:underline">
                Ver ficha <ArrowRight size={15} />
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
