"use client";

import { useEffect, useState } from "react";
import { Check, ShieldCheck, Trash2 } from "lucide-react";
import { useApp } from "@/components/providers/AppProvider";
import { EmptyState } from "@/components/ui/EmptyState";
import { ButtonLink } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { REPORT_REASONS } from "@/lib/moderation";
import { timeAgo } from "@/lib/time";
import type { Report } from "@/lib/types";

const TYPE_LABEL: Record<Report["targetType"], string> = { post: "Salseo", reply: "Respuesta", plan: "Plan", review: "Reseña", profile: "Perfil" };

export function ModerationPanel({ initial }: { initial: Report[] }) {
  const { backend, profile, ready, toast } = useApp();
  const [reports, setReports] = useState<Report[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) return;
    void backend.listReports(initial).then((r) => (r.ok ? setReports(r.data) : setError(r.error)));
  }, [backend, profile, initial]);

  async function act(r: Report, action: "remove" | "dismiss") {
    const res = await backend.moderate(r, action);
    if (!res.ok) return toast({ message: res.error, tone: "error" });
    setReports((list) => (list ?? []).filter((x) => (action === "remove" ? x.targetId !== r.targetId : x.id !== r.id)));
    toast({ message: action === "remove" ? "Contenido eliminado" : "Denuncia descartada" });
  }

  if (!ready) return <main className="mx-auto max-w-2xl px-4 pt-8"><Skeleton className="h-40" /></main>;
  if (!profile || profile.role === "user")
    return (
      <main className="mx-auto max-w-2xl px-4 pt-10">
        <EmptyState emoji="🛡️" title="Zona de moderación" action={<ButtonLink href="/perfil">Ir a mi perfil</ButtonLink>}>
          Solo el equipo de moderación puede acceder a este panel.
        </EmptyState>
      </main>
    );

  return (
    <main className="mx-auto max-w-2xl px-4 pt-6 lg:pt-10">
      <p className="flex items-center gap-2 text-sm font-semibold text-lime">
        <ShieldCheck size={16} /> Moderación
      </p>
      <h1 className="mt-1 font-display text-3xl font-extrabold tracking-tight">Denuncias pendientes</h1>
      <p className="mt-1 text-muted">Con 3 denuncias el contenido se oculta solo. Aquí decides si se elimina o vuelve a ser visible.</p>
      {error ? <p className="mt-6 rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p> : null}
      <div className="mt-6 space-y-3">
        {reports === null && !error ? <Skeleton className="h-32" /> : null}
        {reports?.length === 0 ? <EmptyState emoji="✨" title="Todo limpio">No hay denuncias pendientes.</EmptyState> : null}
        {reports?.map((r) => (
          <article key={r.id} className="rounded-2xl border border-line bg-surface p-4">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-full bg-hot/15 px-2.5 py-1 font-semibold text-hot">{REPORT_REASONS.find((x) => x.id === r.reason)?.label}</span>
              <span className="rounded-full bg-surface-2 px-2.5 py-1 text-muted">{TYPE_LABEL[r.targetType]}</span>
              <span className="text-dim">{timeAgo(r.createdAt)}</span>
            </div>
            <blockquote className="mt-3 border-l-2 border-line-strong pl-3 text-[15px]">{r.preview || "(sin vista previa)"}</blockquote>
            {r.details ? <p className="mt-2 text-sm text-muted">“{r.details}”</p> : null}
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button onClick={() => void act(r, "dismiss")} className="flex h-10 items-center justify-center gap-1.5 rounded-xl border border-line bg-surface-2 text-sm font-semibold">
                <Check size={16} /> Está bien
              </button>
              <button onClick={() => void act(r, "remove")} className="flex h-10 items-center justify-center gap-1.5 rounded-xl bg-danger/15 text-sm font-semibold text-danger">
                <Trash2 size={16} /> Eliminar
              </button>
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}
