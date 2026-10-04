"use client";

import { Check, Flame, Plus } from "lucide-react";
import type { ActivityMeta } from "@/lib/backend/types";
import type { TargetRef } from "@/lib/types";
import { cn, compactNumber } from "@/lib/utils";
import { useAttendance } from "./hooks";

/** Contador "🔥 247 interesados" + botón compacto, sincronizados. */
export function InterestBar({ target, baseCount, meta, className }: { target: TargetRef; baseCount: number; meta: ActivityMeta; className?: string }) {
  const { active, count, toggle } = useAttendance(target, "interested", baseCount, meta);
  const isPlan = target.type === "plan";
  return (
    <div className={cn("relative z-10 flex items-center justify-between gap-3", className)}>
      <span className="inline-flex min-w-0 items-center gap-1.5 text-sm text-muted">
        <Flame size={16} className="text-hot" />
        <span className="font-semibold tabular-nums text-ink">{compactNumber(count)}</span>
        {isPlan ? (count === 1 ? "apuntado" : "apuntados") : count === 1 ? "interesado" : "interesados"}
      </span>
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          void toggle();
        }}
        aria-pressed={active}
        className={cn(
          "inline-flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 text-sm font-semibold transition-all active:scale-[0.95]",
          active ? "bg-lime/15 text-lime ring-1 ring-lime/40" : "bg-ink text-bg hover:bg-white",
        )}
      >
        <span key={String(active)} className="animate-pop">
          {active ? <Check size={16} strokeWidth={2.6} /> : isPlan ? <Plus size={16} strokeWidth={2.6} /> : <Flame size={16} />}
        </span>
        {isPlan ? (active ? "Apuntado" : "Me apunto") : active ? "Guardado" : "Me interesa"}
      </button>
    </div>
  );
}
