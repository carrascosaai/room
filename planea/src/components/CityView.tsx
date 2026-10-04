"use client";

import dynamic from "next/dynamic";
import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { KIND_ORDER, KINDS } from "@/lib/kinds";
import { placeHref } from "@/lib/slug";
import type { City, Kind, Place } from "@/lib/types";
import { cn, norm } from "@/lib/utils";
import { useGoingMap } from "./GoingProvider";
import type { MapPoint } from "./map/PlacesMap";
import { PlaceCard } from "./PlaceCard";

const PlacesMap = dynamic(() => import("./map/PlacesMap"), {
  ssr: false,
  loading: () => <div className="skeleton absolute inset-0" />,
});

type Filter = "todo" | Kind;
type Sort = "gente" | "top";

export function CityView({ city, places }: { city: City; places: Place[] }) {
  const going = useGoingMap();
  const [filter, setFilter] = useState<Filter>("todo");
  const [sort, setSort] = useState<Sort>("gente");
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<string | null>(null);

  const counts = useMemo(() => {
    const c: Record<string, number> = { todo: places.length };
    for (const p of places) c[p.kind] = (c[p.kind] ?? 0) + 1;
    return c;
  }, [places]);

  const visible = useMemo(() => {
    const nq = norm(q.trim());
    const list = places.filter((p) => (filter === "todo" || p.kind === filter) && (!nq || norm(`${p.name} ${p.address ?? ""} ${p.note ?? ""}`).includes(nq)));
    const score = (p: Place) => (going[p.id]?.total ?? 0) * 100 + (p.top ? 10 : 0) + (p.kind === "zona" ? 5 : 0);
    return list.sort((a, b) =>
      sort === "gente" ? score(b) - score(a) || a.name.localeCompare(b.name, "es") : Number(b.top) - Number(a.top) || KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind) || a.name.localeCompare(b.name, "es"),
    );
  }, [places, filter, q, sort, going]);

  const points: MapPoint[] = useMemo(
    () => visible.map((p) => ({ id: p.id, city: p.city, name: p.name, kind: p.kind, lat: p.lat, lng: p.lng, top: p.top, going: going[p.id]?.total ?? 0 })),
    [visible, going],
  );

  const showOnMap = (id: string) => {
    setSelected(id);
    document.getElementById("mapa-ciudad")?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  return (
    <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-6">
      <div className="lg:order-2">
        <div id="mapa-ciudad" className="relative h-[45vh] min-h-72 overflow-hidden rounded-card border border-line lg:sticky lg:top-20 lg:h-[calc(100dvh-7rem)]">
          <PlacesMap
            points={points}
            center={[city.lat, city.lng]}
            zoom={13}
            fit
            selected={selected}
            onSelect={(id) => {
              setSelected(id);
              if (id) document.getElementById(`p-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
            }}
          />
        </div>
      </div>

      <div className="mt-5 lg:order-1 lg:mt-0">
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
          {(["todo", ...KIND_ORDER] as Filter[])
            .filter((f) => counts[f])
            .map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={cn(
                  "shrink-0 rounded-full border px-3.5 py-2 text-sm font-medium transition-colors",
                  filter === f ? "border-lime bg-lime text-lime-ink" : "border-line text-muted hover:text-ink",
                )}
              >
                {f === "todo" ? "Todo" : `${KINDS[f].emoji} ${KINDS[f].plural}`} <span className="opacity-60">{counts[f]}</span>
              </button>
            ))}
        </div>

        <div className="mt-3 flex gap-2">
          <label className="relative flex-1">
            <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-dim" />
            <input className="field !py-2.5 pl-10" placeholder={`Buscar en ${city.name}…`} value={q} onChange={(e) => setQ(e.target.value)} />
          </label>
          <select className="field !w-auto !py-2.5" value={sort} onChange={(e) => setSort(e.target.value as Sort)} aria-label="Ordenar">
            <option value="gente">Más gente hoy</option>
            <option value="top">Recomendados</option>
          </select>
        </div>

        <ul className="mt-4 space-y-3">
          {visible.map((p) => (
            <li key={p.id}>
              <PlaceCard place={p} href={placeHref(p)} active={p.id === selected} onShowOnMap={() => showOnMap(p.id)} />
            </li>
          ))}
          {visible.length === 0 && <li className="rounded-card border border-line p-6 text-center text-sm text-muted">No hay resultados con ese filtro.</li>}
        </ul>
      </div>
    </div>
  );
}
