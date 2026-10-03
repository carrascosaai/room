import type { FeedItem } from "@/lib/feed";
import { cn } from "@/lib/utils";

export function StatusPill({ item, className }: { item: Pick<FeedItem, "live" | "popularNow" | "statusLabel">; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full bg-black/60 px-2.5 py-1 text-xs font-semibold backdrop-blur-md",
        item.live ? "text-live" : "text-white/90",
        className,
      )}
    >
      {item.live ? <span className="size-1.5 animate-pulse-dot rounded-full bg-live" /> : null}
      {item.popularNow ? "Popular ahora" : item.statusLabel}
    </span>
  );
}
