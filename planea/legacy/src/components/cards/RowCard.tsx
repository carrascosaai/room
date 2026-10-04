"use client";

import Link from "next/link";
import { Flame } from "lucide-react";
import { categoryOf } from "@/lib/categories";
import type { FeedItem } from "@/lib/feed";
import { useCoords } from "@/lib/client/location";
import { distanceKm, formatDistance } from "@/lib/geo";
import { cn, compactNumber } from "@/lib/utils";
import { Cover } from "@/components/ui/Cover";

/** Fila compacta (listas, tendencias, descubre). */
export function RowCard({ item, rank, extra, className }: { item: FeedItem; rank?: number; extra?: string; className?: string }) {
  const coords = useCoords();
  const km = coords && item.lat ? distanceKm(coords, item) : null;
  const cat = categoryOf(item.category);
  return (
    <Link
      href={item.href}
      className={cn("group flex items-center gap-3 rounded-2xl p-2 pr-3 transition-colors hover:bg-surface active:scale-[0.99]", className)}
    >
      {rank !== undefined ? (
        <span className={cn("w-7 shrink-0 text-center font-display text-2xl font-extrabold tabular-nums", rank <= 3 ? "text-lime" : "text-dim")}>{rank}</span>
      ) : null}
      <Cover seed={item.id} category={item.category} imageUrl={item.imageUrl} alt="" emojiSize="text-3xl" className="size-16 shrink-0 rounded-xl" sizes="64px" />
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold leading-snug">{item.title}</p>
        <p className="truncate text-xs text-muted">
          {cat.emoji} {item.subtitle} · {item.live ? <span className="text-live">{item.statusLabel}</span> : item.statusLabel}
          {km !== null ? ` · ${formatDistance(km)}` : ""}
        </p>
        {extra ? <p className="mt-0.5 truncate text-xs text-dim">{extra}</p> : null}
      </div>
      <span className="flex shrink-0 items-center gap-1 text-sm font-semibold tabular-nums">
        <Flame size={14} className="text-hot" />
        {compactNumber(item.interest)}
      </span>
    </Link>
  );
}
