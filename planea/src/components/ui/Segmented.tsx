"use client";

import { cn } from "@/lib/utils";

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  className,
}: {
  value: T;
  options: { id: T; label: string }[];
  onChange: (v: T) => void;
  className?: string;
}) {
  return (
    <div role="tablist" className={cn("no-scrollbar flex gap-1 overflow-x-auto rounded-full bg-surface p-1", className)}>
      {options.map((o) => (
        <button
          key={o.id}
          role="tab"
          aria-selected={o.id === value}
          onClick={() => onChange(o.id)}
          className={cn(
            "h-9 flex-1 shrink-0 whitespace-nowrap rounded-full px-4 text-sm font-semibold transition-all",
            o.id === value ? "bg-ink text-bg shadow" : "text-muted hover:text-ink",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
