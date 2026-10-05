"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { cleanName, fetchGoing, markGoing, myGoing, saveName, savedName, unmarkGoing } from "@/lib/going";
import type { Going, GoingMap, SpainGoingRow } from "@/lib/types";
import { NameSheet } from "./NameSheet";
import { useToast } from "./Toasts";

interface Target {
  id: string;
  city: string;
  name: string;
}

interface Ctx {
  going: GoingMap;
  mine: Set<string>;
  busy: string | null;
  toggle: (t: Target) => void;
}

const GoingContext = createContext<Ctx>({ going: {}, mine: new Set(), busy: null, toggle: () => {} });

export function useGoing(id: string): { g: Going | undefined; isMine: boolean; busy: boolean; toggle: (t: Target) => void } {
  const ctx = useContext(GoingContext);
  return { g: ctx.going[id], isMine: ctx.mine.has(id), busy: ctx.busy === id, toggle: ctx.toggle };
}

export function useGoingMap(): GoingMap {
  return useContext(GoingContext).going;
}

const ASKED_KEY = "planea:asked-name";
const POLL_MS = 30_000;

/**
 * Estado de "Voy" para una ciudad (`city`) o para toda España (sin `city`).
 * Se refresca cada 30 s mientras la pestaña está visible.
 */
export function GoingProvider({ city, children }: { city?: string; children: React.ReactNode }) {
  const toast = useToast();
  const [going, setGoing] = useState<GoingMap>({});
  const [mine, setMine] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<string | null>(null);
  const [asking, setAsking] = useState<Target | null>(null);

  const load = useCallback(async () => {
    if (city) {
      setGoing(await fetchGoing(`/api/going/${city}`));
    } else {
      const res = await fetch("/api/going").catch(() => null);
      const rows = res?.ok ? ((await res.json()) as SpainGoingRow[]) : [];
      setGoing(Object.fromEntries(rows.map((r) => [r.venue_id, { total: r.total, names: [] }])));
    }
  }, [city]);

  useEffect(() => {
    // localStorage solo existe en el cliente: se lee tras la hidratación.
    queueMicrotask(() => {
      setMine(myGoing());
      void load();
    });
    const timer = setInterval(() => document.visibilityState === "visible" && void load(), POLL_MS);
    const onVisible = () => document.visibilityState === "visible" && void load();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [load]);

  const apply = useCallback((id: string, delta: number, total: number | null, name: string | null) => {
    setGoing((prev) => {
      const cur = prev[id] ?? { total: 0, names: [] };
      const names = delta > 0 && name ? [name, ...cur.names.filter((n) => n !== name)] : delta < 0 && name ? cur.names.filter((n) => n !== name) : cur.names;
      return { ...prev, [id]: { total: total ?? Math.max(0, cur.total + delta), names } };
    });
  }, []);

  const go = useCallback(
    async (t: Target, name: string | null) => {
      setBusy(t.id);
      apply(t.id, 1, null, name);
      setMine((m) => new Set(m).add(t.id));
      try {
        const total = await markGoing(t.id, t.city, name);
        if (total !== null) apply(t.id, 0, total, null);
        toast(`¡Apuntado! Vas a ${t.name}`);
      } catch (e) {
        apply(t.id, -1, null, name);
        setMine((m) => {
          const n = new Set(m);
          n.delete(t.id);
          return n;
        });
        toast((e as Error).message, "error");
      } finally {
        setBusy(null);
      }
    },
    [apply, toast],
  );

  const toggle = useCallback(
    (t: Target) => {
      if (busy) return;
      if (mine.has(t.id)) {
        const name = savedName();
        setBusy(t.id);
        apply(t.id, -1, null, name);
        setMine((m) => {
          const n = new Set(m);
          n.delete(t.id);
          return n;
        });
        unmarkGoing(t.id)
          .then((total) => total !== null && apply(t.id, 0, total, null))
          .catch((e: Error) => toast(e.message, "error"))
          .finally(() => setBusy(null));
        return;
      }
      let asked = false;
      try {
        asked = localStorage.getItem(ASKED_KEY) === "1";
      } catch {
        /* sin almacenamiento: preguntamos siempre */
      }
      if (asked) void go(t, savedName());
      else setAsking(t);
    },
    [apply, busy, go, mine, toast],
  );

  const value = useMemo(() => ({ going, mine, busy, toggle }), [going, mine, busy, toggle]);

  return (
    <GoingContext.Provider value={value}>
      {children}
      {asking && (
        <NameSheet
          placeName={asking.name}
          initial={savedName() ?? ""}
          onClose={() => setAsking(null)}
          onConfirm={(raw) => {
            const name = raw ? cleanName(raw) : null;
            saveName(name);
            try {
              localStorage.setItem(ASKED_KEY, "1");
            } catch {
              /* ignorado */
            }
            const t = asking;
            setAsking(null);
            void go(t, name);
          }}
        />
      )}
    </GoingContext.Provider>
  );
}
