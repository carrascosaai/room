"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronRight, EyeOff, LogOut, Pencil, ShieldCheck } from "lucide-react";
import { useApp } from "@/components/providers/AppProvider";
import { AuthForm } from "@/components/auth/AuthForm";
import { RowCard } from "@/components/cards/RowCard";
import { Avatar } from "@/components/ui/Avatar";
import { Skeleton } from "@/components/ui/Skeleton";
import { getCity } from "@/lib/cities";
import { planItem } from "@/lib/feed";
import { badgesFor, levelFor, LEVELS, XP } from "@/lib/gamification";
import type { Plan, UserStats } from "@/lib/types";
import { cn } from "@/lib/utils";
import { EditProfileSheet } from "./EditProfileSheet";

const XP_HELP: { label: string; xp: number }[] = [
  { label: "Crear un plan", xp: XP.createPlan },
  { label: "Escribir una reseña", xp: XP.review },
  { label: "Descubrir un sitio (Estoy aquí)", xp: XP.discover },
  { label: "Apuntarte a un plan", xp: XP.attend },
  { label: "Publicar en el salseo", xp: XP.post },
  { label: "Votar", xp: XP.vote },
];

export function ProfileView() {
  const { profile, ready, backend, my, setMy, toast } = useApp();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (!profile) return;
    void backend.myStats().then(setStats);
    void backend.myPlans().then(setPlans);
  }, [backend, profile]);

  if (!ready)
    return (
      <main className="mx-auto max-w-xl space-y-4 px-4 pt-8">
        <Skeleton className="h-40" />
        <Skeleton className="h-24" />
      </main>
    );

  if (!profile)
    return (
      <main className="mx-auto max-w-md px-4 pt-8 lg:pt-14">
        <h1 className="font-display text-3xl font-extrabold tracking-tight">Únete a PLANEA</h1>
        <p className="mb-6 mt-1 text-muted">Guarda planes, apúntate, vota y entra en el salseo. Explorar sigue siendo libre.</p>
        <AuthForm />
      </main>
    );

  const level = levelFor(profile.xp);
  const badges = stats ? badgesFor(stats) : [];
  const now = new Date();

  async function unblockAll() {
    for (const id of my.blocked) await backend.unblock(id);
    setMy((s) => ({ ...s, blocked: [] }));
    toast({ message: "Has desbloqueado a todos" });
  }

  return (
    <main className="mx-auto max-w-xl px-4 pt-6 lg:pt-10">
      <section className="relative overflow-hidden rounded-[1.75rem] border border-line bg-surface p-5">
        <div className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full opacity-25 blur-3xl" style={{ background: profile.avatarColor }} />
        <div className="relative flex items-center gap-4">
          <Avatar emoji={profile.avatarEmoji} color={profile.avatarColor} size={72} />
          <div className="min-w-0 flex-1">
            <h1 className="truncate font-display text-2xl font-extrabold">{profile.displayName}</h1>
            <p className="truncate text-sm text-muted">
              @{profile.username}
              {profile.citySlug ? ` · ${getCity(profile.citySlug)?.name}` : ""}
              {profile.age ? ` · ${profile.age} años` : ""}
            </p>
          </div>
          <button onClick={() => setEditing(true)} aria-label="Editar perfil" className="grid size-10 place-items-center rounded-full bg-surface-2 text-muted hover:text-ink">
            <Pencil size={17} />
          </button>
        </div>
        <div className="relative mt-5">
          <div className="flex items-baseline justify-between text-sm">
            <span className="font-semibold">
              {level.emoji} {level.name}
            </span>
            <span className="tabular-nums text-muted">{profile.xp} XP</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-3">
            <div className="h-full rounded-full bg-lime transition-all duration-700" style={{ width: `${Math.round(level.progress * 100)}%` }} />
          </div>
          <p className="mt-1.5 text-xs text-dim">{level.next ? `${level.toNext} XP para ${level.next.name}` : "Nivel máximo. Eres leyenda."}</p>
        </div>
      </section>

      <section className="mt-4 grid grid-cols-4 gap-2">
        {[
          { label: "Planes creados", value: stats?.plansCreated },
          { label: "Sitios visitados", value: stats?.placesVisited },
          { label: "Votos", value: stats?.votes },
          { label: "Reseñas", value: stats?.reviews },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-line bg-surface p-3 text-center">
            <p className="font-display text-2xl font-extrabold tabular-nums">{s.value ?? "–"}</p>
            <p className="mt-0.5 text-[11px] leading-tight text-muted">{s.label}</p>
          </div>
        ))}
      </section>

      <section className="mt-8">
        <h2 className="mb-3 font-display text-xl font-bold">Badges</h2>
        <div className="grid grid-cols-4 gap-2">
          {badges.map((b) => (
            <div key={b.id} title={b.description} className={cn("flex flex-col items-center rounded-2xl border p-3 text-center", b.earned ? "border-lime/30 bg-lime/[0.06]" : "border-line bg-surface opacity-50")}>
              <span className={cn("text-3xl", !b.earned && "grayscale")}>{b.emoji}</span>
              <span className="mt-1 text-[11px] font-semibold leading-tight">{b.name}</span>
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-dim">Toca y mantén un badge para ver cómo conseguirlo.</p>
      </section>

      <section className="mt-8">
        <h2 className="mb-2 font-display text-xl font-bold">Mis planes</h2>
        {plans.length ? (
          <div className="-mx-2">
            {plans.map((p) => (
              <RowCard
                key={p.id}
                item={planItem(
                  p,
                  { interested: p.baseAttendees + (!backend.countsIncludeSelf && my.attending[`plan:${p.id}:interested`] ? 1 : 0), hereNow: 0, votesYes: 0, votesNo: 0, posts: 0, views24h: 0, interested24h: 0 },
                  now,
                )}
              />
            ))}
          </div>
        ) : (
          <Link href="/crear" className="block rounded-2xl border border-dashed border-line-strong p-4 text-center text-sm text-muted hover:text-ink">
            Aún no has creado ningún plan · <span className="font-semibold text-lime">Crear el primero</span>
          </Link>
        )}
      </section>

      <details className="mt-8 rounded-2xl border border-line bg-surface p-4">
        <summary className="cursor-pointer list-none font-semibold">¿Cómo gano XP?</summary>
        <ul className="mt-3 space-y-1.5 text-sm">
          {XP_HELP.map((x) => (
            <li key={x.label} className="flex justify-between text-muted">
              {x.label} <span className="font-semibold text-lime">+{x.xp}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-dim">Niveles: {LEVELS.map((l) => `${l.name} (${l.min})`).join(" · ")}</p>
      </details>

      <section className="mt-4 space-y-2">
        <div className="flex items-start gap-3 rounded-2xl border border-line bg-surface p-4 text-sm text-muted">
          <EyeOff size={18} className="mt-0.5 shrink-0 text-live" />
          <p>Tu perfil nunca muestra dónde estás. Los demás solo ven cuántas personas van a un plan, no quién ni desde dónde.</p>
        </div>
        {my.blocked.length ? (
          <button onClick={() => void unblockAll()} className="flex w-full items-center justify-between rounded-2xl border border-line bg-surface p-4 text-sm">
            <span>Has bloqueado a {my.blocked.length} {my.blocked.length === 1 ? "persona" : "personas"}</span>
            <span className="font-semibold text-muted">Desbloquear</span>
          </button>
        ) : null}
        {profile.role !== "user" ? (
          <Link href="/moderacion" className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-4">
            <ShieldCheck size={18} className="text-lime" />
            <span className="flex-1 font-semibold">Panel de moderación</span>
            <ChevronRight size={18} className="text-dim" />
          </Link>
        ) : null}
        <Link href="/normas" className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-4 text-sm">
          <span className="flex-1">Normas de la comunidad</span>
          <ChevronRight size={18} className="text-dim" />
        </Link>
        <button
          onClick={() => void backend.signOut().then(() => toast({ message: "Sesión cerrada" }))}
          className="flex w-full items-center gap-3 rounded-2xl p-4 text-sm font-semibold text-danger"
        >
          <LogOut size={18} /> Cerrar sesión
        </button>
      </section>
      <EditProfileSheet open={editing} onClose={() => setEditing(false)} />
    </main>
  );
}
