"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LocateFixed, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { cn, norm } from "@/lib/utils";

export interface CityLite {
  slug: string;
  name: string;
  region: string | null;
  lat: number;
  lng: number;
  n: number;
}

function distance(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const r = Math.PI / 180;
  const x = (b.lng - a.lng) * r * Math.cos(((a.lat + b.lat) / 2) * r);
  const y = (b.lat - a.lat) * r;
  return Math.sqrt(x * x + y * y) * 6371;
}

export function CitySearch({ cities, autoFocus }: { cities: CityLite[]; autoFocus?: boolean }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [locating, setLocating] = useState(false);
  const results = useMemo(() => {
    const nq = norm(q.trim());
    if (!nq) return [];
    return cities
      .filter((c) => norm(c.name).includes(nq) || norm(c.region ?? "").includes(nq))
      .sort((a, b) => Number(norm(b.name).startsWith(nq)) - Number(norm(a.name).startsWith(nq)) || b.n - a.n)
      .slice(0, 8);
  }, [q, cities]);

  const nearMe = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const me = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        // Preferimos ciudades con bastante oferta: la más cercana con al menos 3 sitios.
        const best = [...cities].filter((c) => c.n >= 3).sort((a, b) => distance(me, a) - distance(me, b))[0] ?? cities[0];
        setLocating(false);
        if (best) router.push(`/${best.slug}`);
      },
      () => setLocating(false),
      { timeout: 8000, maximumAge: 600_000 },
    );
  };

  return (
    <div className="relative">
      <div className="flex gap-2">
        <label className="relative flex-1">
          <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-dim" />
          <input
            className="field !rounded-full !py-3.5 pl-11"
            placeholder="Busca tu ciudad o pueblo…"
            value={q}
            autoFocus={autoFocus}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && results[0]) router.push(`/${results[0].slug}`);
            }}
            aria-label="Buscar ciudad"
          />
        </label>
        <button
          type="button"
          onClick={nearMe}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-line-strong px-4 text-sm font-medium text-muted hover:text-ink"
          aria-label="Usar mi ubicación"
        >
          <LocateFixed size={17} className={cn(locating && "animate-spin")} />
          <span className="hidden sm:inline">Cerca de mí</span>
        </button>
      </div>
      {results.length > 0 && (
        <ul className="absolute inset-x-0 top-full z-20 mt-2 overflow-hidden rounded-2xl border border-line-strong bg-surface-2 shadow-2xl shadow-black/60">
          {results.map((c) => (
            <li key={c.slug}>
              <Link href={`/${c.slug}`} className="flex items-center justify-between px-4 py-3 text-sm hover:bg-surface-3">
                <span>
                  <span className="font-semibold">{c.name}</span>
                  {c.region && <span className="ml-2 text-dim">{c.region}</span>}
                </span>
                <span className="text-xs text-muted">{c.n} sitios</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
