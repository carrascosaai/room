"use client";

import { useCallback, useState } from "react";
import { useApp } from "@/components/providers/AppProvider";
import type { ActivityMeta, AttendanceKind } from "@/lib/backend/types";
import type { TargetRef } from "@/lib/types";

/**
 * Contador + toggle de asistencia ("Me interesa", "Me apunto", "Estoy aquí").
 * El recuento base viene del servidor; aquí solo se suma/resta la acción propia.
 */
export function useAttendance(target: TargetRef, kind: AttendanceKind, baseCount: number, meta: ActivityMeta) {
  const { backend, my, baseline, setMy, requireAuth, toast, xp } = useApp();
  const key = `${target.type}:${target.id}:${kind}`;
  const active = Boolean(my.attending[key]);
  const wasActive = Boolean(baseline.attending[key]);
  const count = Math.max(0, baseCount + (active ? 1 : 0) - (wasActive ? 1 : 0));
  const [busy, setBusy] = useState(false);

  const toggle = useCallback(async () => {
    const reason =
      kind === "here" ? "Inicia sesión para decir que estás aquí" : target.type === "plan" ? "Inicia sesión para apuntarte" : "Inicia sesión para guardar tus planes";
    if (!requireAuth(reason)) return;
    if (busy) return;
    const next = !active;
    setBusy(true);
    setMy((s) => {
      const attending = { ...s.attending };
      if (next) attending[key] = true;
      else delete attending[key];
      return { ...s, attending };
    });
    const res = await backend.setAttendance(target, kind, next, meta);
    setBusy(false);
    if (!res.ok) {
      setMy((s) => {
        const attending = { ...s.attending };
        if (next) delete attending[key];
        else attending[key] = true;
        return { ...s, attending };
      });
      toast({ message: res.error, tone: "error" });
      return;
    }
    if (next) xp(kind === "here" ? "discover" : "attend");
  }, [active, backend, busy, key, kind, meta, requireAuth, setMy, target, toast, xp]);

  return { active, count, toggle, busy };
}

/** "¿Merece la pena esta noche?" — voto sí/no con porcentaje. */
export function useWorthVote(target: TargetRef, baseYes: number, baseNo: number) {
  const { backend, my, baseline, setMy, requireAuth, toast, xp } = useApp();
  const key = `${target.type}:${target.id}`;
  const mine = my.votes[key] ?? 0;
  const before = baseline.votes[key] ?? 0;
  const yes = Math.max(0, baseYes + (mine === 1 ? 1 : 0) - (before === 1 ? 1 : 0));
  const no = Math.max(0, baseNo + (mine === -1 ? 1 : 0) - (before === -1 ? 1 : 0));

  const vote = useCallback(
    async (value: 1 | -1) => {
      if (!requireAuth("Inicia sesión para votar")) return;
      const next: 1 | -1 | 0 = mine === value ? 0 : value;
      const prev = mine;
      const apply = (v: 1 | -1 | 0) =>
        setMy((s) => {
          const votes = { ...s.votes };
          if (v === 0) delete votes[key];
          else votes[key] = v;
          return { ...s, votes };
        });
      apply(next);
      const res = await backend.vote(target, next);
      if (!res.ok) {
        apply(prev);
        toast({ message: res.error, tone: "error" });
      } else if (next !== 0 && prev === 0) xp("vote");
    },
    [backend, key, mine, requireAuth, setMy, target, toast, xp],
  );

  return { yes, no, mine, vote };
}
