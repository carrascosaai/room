"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/i18n";
import type { Localized } from "@/game/types";

export function AiEye({ active = false }: { active?: boolean }) {
  return (
    <div
      className={`relative grid h-9 w-9 shrink-0 place-items-center rounded-full border ${
        active ? "border-[var(--accent)]" : "border-[var(--border)]"
      }`}
    >
      <span
        className={`h-2.5 w-2.5 rounded-full ${
          active ? "bg-[var(--accent)] animate-pulse-soft" : "bg-[var(--muted)]"
        }`}
      />
    </div>
  );
}

/** Types out a localized string character by character. */
export function AiSpeech({
  text,
  className = "",
  speed = 18,
  onDone,
}: {
  text: Localized;
  className?: string;
  speed?: number;
  onDone?: () => void;
}) {
  const { loc } = useI18n();
  const full = loc(text);
  const [shown, setShown] = useState("");

  useEffect(() => {
    setShown("");
    if (!full) return;
    let i = 0;
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setShown(full);
      onDone?.();
      return;
    }
    const id = setInterval(() => {
      i += 1;
      setShown(full.slice(0, i));
      if (i >= full.length) {
        clearInterval(id);
        onDone?.();
      }
    }, speed);
    return () => clearInterval(id);
  }, [full, speed, onDone]);

  return (
    <p className={`text-[15px] leading-relaxed ${className}`}>
      {shown}
      {shown.length < full.length ? (
        <span className="ml-0.5 inline-block h-4 w-[2px] translate-y-0.5 bg-[var(--accent)] animate-blink" />
      ) : null}
    </p>
  );
}

export function AiCard({
  title,
  children,
  tone = "neutral",
}: {
  title: string;
  children: React.ReactNode;
  tone?: "neutral" | "accent" | "danger";
}) {
  const border =
    tone === "accent"
      ? "border-[var(--accent)]/40"
      : tone === "danger"
        ? "border-[var(--danger)]/40"
        : "border-[var(--border)]";
  return (
    <div className={`room-scan relative overflow-hidden rounded-3xl border ${border} bg-[var(--surface)] p-5`}>
      <div className="mb-3 flex items-center gap-3">
        <AiEye active />
        <span className="font-mono text-[11px] uppercase tracking-[0.25em] text-[var(--muted)]">
          {title}
        </span>
      </div>
      {children}
    </div>
  );
}
