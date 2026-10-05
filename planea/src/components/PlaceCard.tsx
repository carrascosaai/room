import Link from "next/link";
import { Navigation, Star } from "lucide-react";
import { directionsUrl, KINDS } from "@/lib/kinds";
import type { Place } from "@/lib/types";
import { cn } from "@/lib/utils";
import { GoingButton, GoingLine } from "./GoingButton";

export function PlaceCard({ place, href, onShowOnMap, active }: { place: Place; href: string; onShowOnMap?: () => void; active?: boolean }) {
  const k = KINDS[place.kind];
  return (
    <article
      id={`p-${place.id}`}
      className={cn(
        "group relative rounded-card border bg-surface p-4 transition-colors",
        active ? "border-lime/60" : "border-line hover:border-line-strong",
      )}
    >
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={onShowOnMap}
          aria-label={`Ver ${place.name} en el mapa`}
          className="grid size-12 shrink-0 place-items-center rounded-2xl text-2xl"
          style={{ background: `${k.color}1f`, boxShadow: `inset 0 0 0 1px ${k.color}55` }}
        >
          {k.emoji}
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <Link href={href} className="font-display text-lg font-bold leading-tight hover:underline">
              {place.name}
            </Link>
            {place.top && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber/15 px-2 py-0.5 text-[11px] font-semibold text-amber">
                <Star size={11} fill="currentColor" /> Top
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs text-dim">
            {k.label}
            {place.address ? ` · ${place.address}` : ""}
          </p>
          {place.note && <p className="mt-2 text-sm leading-snug text-muted">{place.note}</p>}
          <GoingLine id={place.id} className="mt-2" />
        </div>
      </div>
      <div className="mt-3 flex items-center justify-end gap-2">
        <a
          href={directionsUrl(place)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-10 items-center gap-1.5 rounded-full border border-line-strong px-3.5 text-sm font-medium text-muted hover:text-ink"
        >
          <Navigation size={15} /> Cómo llegar
        </a>
        <GoingButton id={place.id} city={place.city} name={place.name} />
      </div>
    </article>
  );
}
