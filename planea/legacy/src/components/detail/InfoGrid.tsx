import type { ReactNode } from "react";

export function InfoGrid({ items }: { items: { label: string; value: ReactNode }[] }) {
  return (
    <dl className="grid grid-cols-2 gap-3">
      {items.map((it) => (
        <div key={it.label} className="rounded-2xl border border-line bg-surface p-4">
          <dt className="text-xs font-medium uppercase tracking-wider text-dim">{it.label}</dt>
          <dd className="mt-1 font-semibold">{it.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <h2 className="font-display text-xl font-bold">{children}</h2>
      {action}
    </div>
  );
}
