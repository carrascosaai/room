"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useApp } from "@/components/providers/AppProvider";
import { RowCard } from "@/components/cards/RowCard";
import { planItem } from "@/lib/feed";
import type { Plan, TargetStats } from "@/lib/types";
import { SectionTitle } from "./InfoGrid";

/** Planes de la comunidad en este local (incluye los recién creados). */
export function PlansHere({ citySlug, venueId, initial, stats, nowIso }: { citySlug: string; venueId: string; initial: Plan[]; stats: Record<string, TargetStats>; nowIso: string }) {
  const { backend } = useApp();
  const [plans, setPlans] = useState(initial);
  useEffect(() => {
    void backend.listPlans(citySlug, initial).then(setPlans);
  }, [backend, citySlug, initial]);
  const items = useMemo(() => {
    const now = new Date(nowIso);
    return plans.filter((p) => p.venueId === venueId).map((p) => planItem(p, stats[`plan:${p.id}`], now));
  }, [plans, venueId, stats, nowIso]);
  return (
    <section>
      <SectionTitle action={<Link href={`/crear?venue=${venueId}&city=${citySlug}`} className="text-sm font-semibold text-lime">+ Crear aquí</Link>}>
        Planes aquí
      </SectionTitle>
      {items.length ? (
        <div className="-mx-2">
          {items.map((i) => (
            <RowCard key={i.key} item={i} />
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted">Nadie ha montado plan aquí todavía. Sé el primero.</p>
      )}
    </section>
  );
}
