"use client";

import { Check, Loader2, Users } from "lucide-react";
import { goingLabel } from "@/lib/going";
import { cn } from "@/lib/utils";
import { useGoing } from "./GoingProvider";

export function GoingButton({ id, city, name, size = "md" }: { id: string; city: string; name: string; size?: "md" | "lg" }) {
  const { g, isMine, busy, toggle } = useGoing(id);
  const total = g?.total ?? 0;
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle({ id, city, name });
      }}
      aria-pressed={isMine}
      className={cn(
        "inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full font-bold transition-all active:scale-95",
        size === "lg" ? "h-12 px-6 text-base" : "h-10 px-4 text-sm",
        isMine ? "bg-live/15 text-live ring-1 ring-live/40" : "bg-lime text-lime-ink hover:bg-[#d6ff6a]",
      )}
    >
      {busy ? <Loader2 size={16} className="animate-spin" /> : isMine ? <Check size={16} strokeWidth={3} /> : null}
      {isMine ? "Vas" : "Voy"}
      {total > 0 && (
        <span className={cn("ml-0.5 rounded-full px-1.5 text-xs", isMine ? "bg-live/20" : "bg-black/15")}>{total}</span>
      )}
    </button>
  );
}

export function GoingLine({ id, className }: { id: string; className?: string }) {
  const { g } = useGoing(id);
  const total = g?.total ?? 0;
  return (
    <p className={cn("flex items-center gap-1.5 text-xs", total > 0 ? "text-live" : "text-dim", className)}>
      {total > 0 && <span className="size-1.5 animate-pulse-dot rounded-full bg-live" />}
      {total === 0 && <Users size={13} />}
      {goingLabel(g)}
    </p>
  );
}
