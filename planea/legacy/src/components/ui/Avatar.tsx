import { cn } from "@/lib/utils";

export function Avatar({ emoji, color, size = 40, className }: { emoji: string; color?: string; size?: number; className?: string }) {
  return (
    <span
      className={cn("inline-grid shrink-0 place-items-center rounded-full", className)}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.5,
        background: color ? `color-mix(in oklab, ${color} 22%, #1a1a22)` : "var(--color-surface-3)",
        boxShadow: color ? `inset 0 0 0 1.5px color-mix(in oklab, ${color} 55%, transparent)` : undefined,
      }}
      aria-hidden
    >
      {emoji}
    </span>
  );
}
