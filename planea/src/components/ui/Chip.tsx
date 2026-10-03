import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function Chip({ active, className, ...props }: ComponentProps<"button"> & { active?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={cn(
        "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium transition-colors active:scale-[0.97]",
        active ? "border-lime bg-lime text-lime-ink" : "border-line bg-surface-2 text-muted hover:text-ink",
        className,
      )}
      {...props}
    />
  );
}
