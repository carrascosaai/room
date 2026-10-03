import type { LineupItem } from "@/lib/types";

export function Timeline({ items }: { items: LineupItem[] }) {
  return (
    <ol className="relative space-y-4 pl-6 before:absolute before:bottom-2 before:left-[7px] before:top-2 before:w-px before:bg-line-strong">
      {items.map((it, i) => (
        <li key={i} className="relative">
          <span className={`absolute -left-6 top-1 size-[15px] rounded-full border-2 ${i === 0 ? "border-lime bg-lime/30" : "border-line-strong bg-bg"}`} />
          <span className="font-display text-lg font-bold tabular-nums">{it.time}</span>
          <span className="ml-3 text-muted">{it.label}</span>
        </li>
      ))}
    </ol>
  );
}
