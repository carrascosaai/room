"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LocateFixed, ShieldCheck } from "lucide-react";
import { useApp } from "@/components/providers/AppProvider";
import { Button } from "@/components/ui/Button";
import { CITIES } from "@/lib/cities";
import { rememberCity } from "@/lib/client/city";
import { requestCoords } from "@/lib/client/location";
import { nearestCity } from "@/lib/geo";
import { cn } from "@/lib/utils";

export function CityPicker({ counts }: { counts: Record<string, number> }) {
  const router = useRouter();
  const { toast } = useApp();
  const [locating, setLocating] = useState(false);

  function go(slug: string) {
    rememberCity(slug);
    router.push(`/${slug}`);
  }

  async function locate() {
    setLocating(true);
    try {
      const c = await requestCoords();
      const { city, km } = nearestCity(c);
      if (km > 80) toast({ message: `No estamos aún en tu zona. Te llevamos a ${city.name}, la más cercana.`, tone: "info" });
      go(city.slug);
    } catch (e) {
      toast({ message: (e as Error).message, tone: "error" });
      setLocating(false);
    }
  }

  const live = CITIES.filter((c) => (counts[c.slug] ?? 0) > 0);
  const soon = CITIES.filter((c) => !(counts[c.slug] ?? 0));

  return (
    <main className="mx-auto max-w-2xl px-4 pt-6 lg:pt-12">
      <h1 className="font-display text-4xl font-extrabold tracking-tight">¿Dónde sales hoy?</h1>
      <p className="mt-1 text-muted">Elige tu ciudad o deja que la detectemos.</p>
      <Button size="lg" className="mt-6 w-full" loading={locating} onClick={() => void locate()}>
        <LocateFixed size={20} /> Usar mi ubicación
      </Button>
      <p className="mt-2 flex items-center justify-center gap-1.5 text-xs text-dim">
        <ShieldCheck size={13} /> Solo para saber tu ciudad. Nunca sale de tu móvil.
      </p>
      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {live.map((c, i) => (
          <button
            key={c.slug}
            onClick={() => go(c.slug)}
            className="group relative h-28 animate-fade-up overflow-hidden rounded-[1.25rem] border border-line bg-surface p-4 text-left transition-all hover:border-line-strong active:scale-[0.98]"
            style={{ animationDelay: `${i * 30}ms` }}
          >
            <span
              className="pointer-events-none absolute -right-8 -top-8 size-28 rounded-full opacity-30 blur-2xl transition-opacity group-hover:opacity-60"
              style={{ background: ["#c8ff3d", "#ff4d7e", "#5ce1e6", "#ffb547", "#a78bfa"][i % 5] }}
            />
            <span className="relative block font-display text-xl font-bold">{c.name}</span>
            <span className="relative block text-xs text-muted">{c.region}</span>
            <span className="absolute bottom-3 left-4 text-xs font-semibold text-lime">{counts[c.slug]} sitios</span>
          </button>
        ))}
      </div>
      {soon.length ? (
        <>
          <h2 className="mt-10 text-sm font-semibold text-muted">Próximamente</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {soon.map((c) => (
              <button key={c.slug} onClick={() => go(c.slug)} className={cn("rounded-full border border-line px-3.5 py-2 text-sm text-muted hover:text-ink")}>
                {c.name}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-dim">Ya puedes crear planes allí: los verá la gente de tu ciudad.</p>
        </>
      ) : null}
    </main>
  );
}
