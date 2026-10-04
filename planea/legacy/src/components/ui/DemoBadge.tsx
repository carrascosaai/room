import { cn } from "@/lib/utils";

/** Marca visible en todo dato ficticio. */
export function DemoBadge({ className }: { className?: string }) {
  return (
    <span
      title="Dato de ejemplo: se sustituirá por datos reales"
      className={cn("rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white/80 backdrop-blur", className)}
    >
      Demo
    </span>
  );
}
