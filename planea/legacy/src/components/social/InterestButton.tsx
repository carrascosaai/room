"use client";

import { Check, Flame, Plus } from "lucide-react";
import type { ActivityMeta } from "@/lib/backend/types";
import type { TargetRef } from "@/lib/types";
import { cn, compactNumber } from "@/lib/utils";
import { useAttendance } from "./hooks";

/** Botón principal: "Me interesa" (locales/eventos) o "Me apunto" (planes). */
export function InterestButton({
  target,
  baseCount,
  meta,
  size = "md",
  className,
}: {
  target: TargetRef;
  baseCount: number;
  meta: ActivityMeta;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const { active, count, toggle } = useAttendance(target, "interested", baseCount, meta);
  const isPlan = target.type === "plan";
  const label = isPlan ? (active ? "Apuntado" : "Me apunto") : active ? "Te interesa" : "Me interesa";
  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        void toggle();
      }}
      aria-pressed={active}
      className={cn(
        "group inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-all active:scale-[0.96]",
        size === "sm" && "h-9 px-3.5 text-sm",
        size === "md" && "h-11 px-5 text-[15px]",
        size === "lg" && "h-14 w-full px-6 text-base",
        active ? "bg-lime/15 text-lime ring-1 ring-lime/40" : "bg-lime text-lime-ink hover:bg-[#d6ff6a]",
        className,
      )}
    >
      <span key={String(active)} className="animate-pop">
        {active ? <Check size={18} strokeWidth={2.6} /> : isPlan ? <Plus size={18} strokeWidth={2.6} /> : <Flame size={18} strokeWidth={2.4} />}
      </span>
      {label}
      <span className={cn("tabular-nums", active ? "text-lime/80" : "text-lime-ink/60")}>· {compactNumber(count)}</span>
    </button>
  );
}
