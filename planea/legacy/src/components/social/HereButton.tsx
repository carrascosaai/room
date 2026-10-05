"use client";

import { MapPin } from "lucide-react";
import type { ActivityMeta } from "@/lib/backend/types";
import type { TargetRef } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useAttendance } from "./hooks";

/**
 * "Estoy aquí": suma al contador agregado de personas en el sitio.
 * Nunca se guarda ni se comparte la ubicación GPS: solo el recuento.
 */
export function HereButton({ target, baseCount, meta }: { target: TargetRef; baseCount: number; meta: ActivityMeta }) {
  const { active, count, toggle } = useAttendance(target, "here", baseCount, meta);
  return (
    <button
      onClick={() => void toggle()}
      aria-pressed={active}
      className={cn(
        "flex h-14 w-full items-center gap-3 rounded-2xl border px-4 text-left transition-all active:scale-[0.98]",
        active ? "border-sky/40 bg-sky/10" : "border-line bg-surface-2 hover:bg-surface-3",
      )}
    >
      <span className={cn("grid size-9 place-items-center rounded-full", active ? "bg-sky text-bg" : "bg-surface-3 text-sky")}>
        <MapPin size={18} />
      </span>
      <span className="flex-1">
        <span className="block text-sm font-semibold">{active ? "Estás aquí" : "Estoy aquí"}</span>
        <span className="block text-xs text-muted">{count} {count === 1 ? "persona dice" : "personas dicen"} que están ahora · sin ubicación</span>
      </span>
    </button>
  );
}
