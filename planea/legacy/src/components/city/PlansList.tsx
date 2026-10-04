"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { useApp } from "@/components/providers/AppProvider";
import { FeedCard } from "@/components/cards/FeedCard";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { planItem } from "@/lib/feed";
import type { Plan, TargetStats } from "@/lib/types";

export function PlansList({ citySlug, initial, stats, nowIso }: { citySlug: string; initial: Plan[]; stats: Record<string, TargetStats>; nowIso: string }) {
  const { backend } = useApp();
  const [plans, setPlans] = useState(initial);
  useEffect(() => {
    void backend.listPlans(citySlug, initial).then(setPlans);
  }, [backend, citySlug, initial]);
  const items = useMemo(() => plans.map((p) => planItem(p, stats[`plan:${p.id}`], new Date(nowIso))), [plans, stats, nowIso]);
  if (!items.length)
    return (
      <EmptyState emoji="✨" title="No hay planes ahora mismo" action={<ButtonLink href="/crear"><Plus size={18} /> Crear plan</ButtonLink>}>
        Crea uno y que se apunte quien quiera.
      </EmptyState>
    );
  return (
    <>
      {items.map((i) => (
        <FeedCard key={i.key} item={i} citySlug={citySlug} />
      ))}
    </>
  );
}
