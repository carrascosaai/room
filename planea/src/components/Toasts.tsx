"use client";

import { Check, TriangleAlert } from "lucide-react";
import { createContext, useCallback, useContext, useState } from "react";
import { cn } from "@/lib/utils";

type Tone = "ok" | "error";
interface Toast {
  id: number;
  message: string;
  tone: Tone;
}

const ToastContext = createContext<(message: string, tone?: Tone) => void>(() => {});

export function useToast() {
  return useContext(ToastContext);
}

let next = 1;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((message: string, tone: Tone = "ok") => {
    const id = next++;
    setToasts((t) => [...t.slice(-2), { id, message, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  }, []);
  return (
    <ToastContext.Provider value={push}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 top-[calc(env(safe-area-inset-top)+0.75rem)] z-[1100] flex flex-col items-center gap-2 px-4">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              "flex animate-fade-up items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-medium shadow-2xl shadow-black/60 backdrop-blur-xl",
              t.tone === "error" ? "border-danger/30 bg-[#2a1214]/95 text-[#ffc9c9]" : "border-line-strong bg-surface-2/95 text-ink",
            )}
          >
            {t.tone === "error" ? <TriangleAlert size={16} /> : <Check size={16} className="text-lime" />}
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
