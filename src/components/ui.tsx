"use client";

import Link from "next/link";
import { useEffect, useState, type ButtonHTMLAttributes, type ReactNode } from "react";
import { useI18n } from "@/i18n";
import type { Lang } from "@/game/types";

export function Logo({ size = "text-3xl" }: { size?: string }) {
  return (
    <span className={`font-mono font-bold tracking-[0.35em] ${size}`} style={{ letterSpacing: "0.3em" }}>
      ROOM
    </span>
  );
}

export function Button({
  children,
  variant = "primary",
  full = true,
  className = "",
  ...rest
}: {
  children: ReactNode;
  variant?: "primary" | "ghost" | "danger" | "surface";
  full?: boolean;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  const styles: Record<string, string> = {
    primary: "bg-[var(--accent)] text-black hover:brightness-95 active:brightness-90 font-semibold",
    surface: "bg-[var(--surface-2)] text-[var(--text)] border border-[var(--border)] hover:border-[var(--muted)]",
    ghost: "bg-transparent text-[var(--muted)] hover:text-[var(--text)]",
    danger: "bg-transparent text-[var(--danger)] border border-[var(--danger)]/40 hover:bg-[var(--danger)]/10",
  };
  return (
    <button
      {...rest}
      className={`relative flex min-h-[54px] items-center justify-center gap-2 rounded-2xl px-5 text-[15px] transition disabled:cursor-not-allowed disabled:opacity-40 ${
        full ? "w-full" : ""
      } ${styles[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

export function LinkButton({
  href,
  children,
  variant = "primary",
}: {
  href: string;
  children: ReactNode;
  variant?: "primary" | "surface" | "ghost";
}) {
  const styles: Record<string, string> = {
    primary: "bg-[var(--accent)] text-black font-semibold",
    surface: "bg-[var(--surface-2)] text-[var(--text)] border border-[var(--border)]",
    ghost: "text-[var(--muted)]",
  };
  return (
    <Link
      href={href}
      className={`flex min-h-[54px] w-full items-center justify-center rounded-2xl px-5 text-[15px] transition hover:brightness-95 ${styles[variant]}`}
    >
      {children}
    </Link>
  );
}

export function LanguageToggle({
  onChange,
  className = "",
}: {
  onChange?: (l: Lang) => void;
  className?: string;
}) {
  const { lang, setLang } = useI18n();
  return (
    <div className={`inline-flex overflow-hidden rounded-full border border-[var(--border)] text-xs ${className}`}>
      {(["es", "en"] as Lang[]).map((l) => (
        <button
          key={l}
          onClick={() => {
            setLang(l);
            onChange?.(l);
          }}
          aria-pressed={lang === l}
          className={`px-3 py-1.5 font-mono uppercase tracking-widest transition ${
            lang === l ? "bg-[var(--text)] text-black" : "text-[var(--muted)]"
          }`}
        >
          {l}
        </button>
      ))}
    </div>
  );
}

export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium uppercase tracking-widest text-[var(--muted)]">
        {label}
      </span>
      {children}
      {hint ? <span className="mt-1 block text-xs text-[var(--muted)]">{hint}</span> : null}
    </label>
  );
}

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3.5 text-[16px] outline-none transition focus:border-[var(--accent)] ${
        props.className ?? ""
      }`}
    />
  );
}

export function Screen({ children }: { children: ReactNode }) {
  return <div className="flex flex-1 flex-col px-5 pb-8 pt-5 animate-fade-up">{children}</div>;
}

export function TopBar({ right }: { right?: ReactNode }) {
  return (
    <header className="flex items-center justify-between px-5 py-4">
      <Link href="/" aria-label="ROOM home">
        <Logo size="text-lg" />
      </Link>
      {right ?? <LanguageToggle />}
    </header>
  );
}

export function useCopy(): [boolean, (text: string) => void] {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1800);
    return () => clearTimeout(t);
  }, [copied]);
  const copy = (text: string) => {
    navigator.clipboard?.writeText(text).then(
      () => setCopied(true),
      () => setCopied(false),
    );
  };
  return [copied, copy];
}

export function Dots() {
  return (
    <span className="inline-flex gap-1" aria-hidden>
      <span className="h-1.5 w-1.5 rounded-full bg-current animate-blink" />
      <span className="h-1.5 w-1.5 rounded-full bg-current animate-blink [animation-delay:200ms]" />
      <span className="h-1.5 w-1.5 rounded-full bg-current animate-blink [animation-delay:400ms]" />
    </span>
  );
}
