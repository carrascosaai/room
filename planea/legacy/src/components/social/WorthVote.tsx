"use client";

import { ThumbsDown, ThumbsUp } from "lucide-react";
import type { TargetRef } from "@/lib/types";
import { cn, pct } from "@/lib/utils";
import { useWorthVote } from "./hooks";

/** "¿Merece la pena esta noche?" con porcentaje en vivo. */
export function WorthVote({ target, baseYes, baseNo, title = "¿Merece la pena esta noche?" }: { target: TargetRef; baseYes: number; baseNo: number; title?: string }) {
  const { yes, no, mine, vote } = useWorthVote(target, baseYes, baseNo);
  const total = yes + no;
  const yesPct = pct(yes, total);
  const voted = mine !== 0;
  return (
    <section className="rounded-[1.5rem] border border-line bg-surface p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="font-display text-lg font-bold">{title}</h3>
        <span className="text-xs text-dim">{total} {total === 1 ? "voto" : "votos"} hoy</span>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <button
          onClick={() => void vote(1)}
          aria-pressed={mine === 1}
          className={cn(
            "flex h-12 items-center justify-center gap-2 rounded-2xl border font-semibold transition-all active:scale-[0.97]",
            mine === 1 ? "border-live/50 bg-live/15 text-live" : "border-line bg-surface-2 hover:bg-surface-3",
          )}
        >
          <ThumbsUp size={18} /> Sí
        </button>
        <button
          onClick={() => void vote(-1)}
          aria-pressed={mine === -1}
          className={cn(
            "flex h-12 items-center justify-center gap-2 rounded-2xl border font-semibold transition-all active:scale-[0.97]",
            mine === -1 ? "border-hot/50 bg-hot/15 text-hot" : "border-line bg-surface-2 hover:bg-surface-3",
          )}
        >
          <ThumbsDown size={18} /> No
        </button>
      </div>
      <div className="mt-4">
        <div className="flex h-2.5 overflow-hidden rounded-full bg-surface-3">
          <div className="bg-live transition-all duration-500" style={{ width: `${total ? yesPct : 50}%` }} />
          <div className="bg-hot/80 transition-all duration-500" style={{ width: `${total ? 100 - yesPct : 50}%` }} />
        </div>
        <div className="mt-2 flex justify-between text-sm">
          <span className={cn("font-semibold", voted || total ? "text-live" : "text-dim")}>{total ? `${yesPct}% sí` : "Sé el primero"}</span>
          <span className="font-semibold text-hot/90">{total ? `${100 - yesPct}% no` : ""}</span>
        </div>
      </div>
    </section>
  );
}
