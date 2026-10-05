"use client";

import { Check, Sparkles, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Toast {
  id: string;
  message: string;
  tone?: "success" | "error" | "xp" | "info";
}

export function Toaster({ toasts }: { toasts: Toast[] }) {
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 top-[calc(env(safe-area-inset-top)+0.75rem)] z-[100] flex flex-col items-center gap-2 px-4"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            "flex animate-fade-up items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-medium shadow-2xl shadow-black/60 backdrop-blur-xl",
            t.tone === "error" && "border-danger/30 bg-[#2a1214]/95 text-[#ffc9c9]",
            t.tone === "xp" && "border-lime/30 bg-[#171d08]/95 text-lime",
            (!t.tone || t.tone === "success" || t.tone === "info") && "border-line-strong bg-surface-2/95 text-ink",
          )}
        >
          {t.tone === "error" ? (
            <TriangleAlert size={16} />
          ) : t.tone === "xp" ? (
            <Sparkles size={16} />
          ) : (
            <Check size={16} className="text-lime" />
          )}
          {t.message}
        </div>
      ))}
    </div>
  );
}
