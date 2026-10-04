"use client";

import Link from "next/link";
import { Clock, MapPin } from "lucide-react";
import type { FeedItem } from "@/lib/feed";
import { cn } from "@/lib/utils";
import { Cover } from "@/components/ui/Cover";
import { DemoBadge } from "@/components/ui/DemoBadge";
import { InterestBar } from "@/components/social/InterestBar";
import { StatusPill } from "./StatusPill";

/** Tarjeta de plan de la comunidad (carrusel). */
export function PlanCard({ item, citySlug, className }: { item: FeedItem; citySlug: string; className?: string }) {
  return (
    <article className={cn("relative flex w-[78vw] max-w-[300px] shrink-0 snap-start flex-col overflow-hidden rounded-[1.5rem] border border-line bg-surface", className)}>
      <div className="relative">
        <Cover seed={item.id} category="planes" imageUrl={item.imageUrl} alt={item.title} emojiSize="text-5xl" className="h-28" sizes="300px" />
        <StatusPill item={item} className="absolute left-3 top-3" />
        {item.isDemo ? <DemoBadge className="absolute right-3 top-3" /> : null}
      </div>
      <div className="flex flex-1 flex-col p-4">
        <h3 className="line-clamp-2 font-display text-lg font-bold leading-tight">
          <Link href={item.href} className="after:absolute after:inset-0 after:content-['']">
            {item.title}
          </Link>
        </h3>
        <p className="mt-1.5 flex items-center gap-1 truncate text-sm text-muted">
          <MapPin size={14} className="shrink-0" /> <span className="truncate">{item.subtitle}</span>
        </p>
        <p className="mt-0.5 flex items-center gap-1 text-sm text-muted">
          <Clock size={14} /> {item.live ? "Ahora" : item.statusLabel}
        </p>
        <InterestBar className="mt-auto pt-4" target={{ type: "plan", id: item.id }} baseCount={item.interest} meta={{ category: item.category, citySlug, startsAt: item.start }} />
      </div>
    </article>
  );
}
