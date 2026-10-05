"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { HAS_BACKEND } from "@/lib/config";
import { KINDS } from "@/lib/kinds";
import { placeHref } from "@/lib/slug";
import type { SpainGoingRow } from "@/lib/types";

/** Los sitios con más "Voy" esta noche en toda España. */
export function TopTonight() {
  const [rows, setRows] = useState<SpainGoingRow[] | null>(HAS_BACKEND ? null : []);
  useEffect(() => {
    if (!HAS_BACKEND) return;
    let alive = true;
    const load = () =>
      fetch("/api/going")
        .then((r) => (r.ok ? r.json() : []))
        .then((d: SpainGoingRow[]) => alive && setRows(d.filter((x) => x.name)))
        .catch(() => alive && setRows([]));
    void load();
    const t = setInterval(load, 60_000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  if (rows === null) {
    return (
      <div className="grid gap-2 sm:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="skeleton h-16 rounded-2xl" />
        ))}
      </div>
    );
  }
  if (rows.length === 0) {
    return (
      <p className="rounded-card border border-dashed border-line-strong p-5 text-sm text-muted">
        Todavía nadie ha dicho a dónde va esta noche. Busca tu ciudad y sé el primero en pulsar <strong className="text-lime">Voy</strong>.
      </p>
    );
  }
  return (
    <ol className="grid gap-2 sm:grid-cols-2">
      {rows.slice(0, 10).map((r, i) => (
        <li key={r.venue_id}>
          <Link href={placeHref({ id: r.venue_id, city: r.city })} className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-3 hover:border-line-strong">
            <span className="w-6 text-center font-display text-lg font-extrabold text-dim">{i + 1}</span>
            <span className="text-2xl">{r.kind ? KINDS[r.kind].emoji : "📍"}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-semibold">{r.name}</span>
              <span className="block truncate text-xs text-dim">{r.city_name ?? r.city}</span>
            </span>
            <span className="rounded-full bg-live/15 px-2.5 py-1 text-sm font-bold text-live">{r.total} van</span>
          </Link>
        </li>
      ))}
    </ol>
  );
}
