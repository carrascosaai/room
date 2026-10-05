"use client";

import Link from "next/link";
import { Clock, Users } from "lucide-react";
import { useCoords } from "@/lib/client/location";
import { categoryOf } from "@/lib/categories";
import type { FeedItem } from "@/lib/feed";
import { distanceKm, formatDistance } from "@/lib/geo";
import { cn } from "@/lib/utils";
import { Cover } from "@/components/ui/Cover";
import { DemoBadge } from "@/components/ui/DemoBadge";
import { InterestBar } from "@/components/social/InterestBar";
import { StatusPill } from "./StatusPill";

/** Tarjeta grande del feed: imagen protagonista + lo esencial para decidir. */
export function FeedCard({ item, citySlug, priority, className }: { item: FeedItem; citySlug: string; priority?: boolean; className?: string }) {
  const coords = useCoords();
  const cat = categoryOf(item.category);
  const km = coords && item.lat ? distanceKm(coords, item) : null;
  return (
    <article className={cn("group relative animate-fade-up overflow-hidden rounded-[1.5rem] border border-line bg-surface transition-colors hover:border-line-strong", className)}>
      <div className="relative">
        <Cover seed={item.id} category={item.category} imageUrl={item.imageUrl} alt={item.title} priority={priority} className="h-44 sm:h-48" />
        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-surface to-transparent" />
        <div className="absolute left-3 top-3 flex items-center gap-2">
          <StatusPill item={item} />
        </div>
        {item.isDemo ? <DemoBadge className="absolute right-3 top-3" /> : null}
      </div>
      <div className="relative -mt-6 px-4 pb-4">
        <p className="flex items-center gap-1.5 text-xs font-medium text-muted">
          <span>{cat.emoji}</span>
          <span>{item.type === "plan" ? "Plan de la comunidad" : cat.label}</span>
          <span className="text-dim">·</span>
          <span className="truncate">{item.subtitle}</span>
          {km !== null ? (
            <>
              <span className="text-dim">·</span>
              <span className="shrink-0">{formatDistance(km)}</span>
            </>
          ) : null}
        </p>
        <h3 className="mt-1 font-display text-[1.35rem] font-bold leading-tight tracking-tight">
          <Link href={item.href} className="after:absolute after:inset-0 after:content-['']">
            {item.title}
          </Link>
        </h3>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
          <span className="inline-flex items-center gap-1">
            <Clock size={14} /> {item.timeLabel}
          </span>
          <span className="font-semibold text-ink/80">{item.priceLabel}</span>
          {item.hereNow > 0 ? (
            <span className="inline-flex items-center gap-1 text-sky">
              <Users size={14} /> {item.hereNow} aquí ahora
            </span>
          ) : null}
        </div>
        <InterestBar
          className="mt-4"
          target={{ type: item.type, id: item.id }}
          baseCount={item.interest}
          meta={{ category: item.category, citySlug, startsAt: item.start }}
        />
      </div>
    </article>
  );
}
