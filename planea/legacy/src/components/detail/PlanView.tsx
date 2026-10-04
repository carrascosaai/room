"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ChevronRight, Clock, Lock, MapPin, ShieldCheck, Trash2 } from "lucide-react";
import { useApp } from "@/components/providers/AppProvider";
import { InterestButton } from "@/components/social/InterestButton";
import { Salseo } from "@/components/salseo/Salseo";
import { ContentMenu } from "@/components/salseo/ContentMenu";
import { ReportSheet, type ReportTarget } from "@/components/salseo/ReportSheet";
import { Cover } from "@/components/ui/Cover";
import { EmptyState } from "@/components/ui/EmptyState";
import { ButtonLink } from "@/components/ui/Button";
import { FeedSkeleton } from "@/components/ui/Skeleton";
import { categoryOf } from "@/lib/categories";
import { useNowMinute } from "@/lib/client/now";
import { PLAN_DURATION_H } from "@/lib/feed";
import { formatLongDay, formatTime, startLabel, timeAgo } from "@/lib/time";
import type { CategorySlug, City, Plan, Post, Reply } from "@/lib/types";
import { DetailHero } from "./DetailHero";

export function PlanView({
  city,
  planId,
  initialPlan,
  venue,
  baseCount,
  initialPosts,
  initialReplies,
}: {
  city: City;
  planId: string;
  initialPlan: Plan | null;
  venue: { id: string; slug: string; name: string; category: CategorySlug; neighborhood: string } | null;
  baseCount: number;
  initialPosts: Post[];
  initialReplies: Reply[];
}) {
  const { backend, profile, toast, requireAuth } = useApp();
  const router = useRouter();
  const [plan, setPlan] = useState<Plan | null | undefined>(initialPlan ?? undefined);
  const [reporting, setReporting] = useState<ReportTarget | null>(null);
  const now = useNowMinute();

  useEffect(() => {
    if (!initialPlan) void backend.getPlan(planId).then((p) => setPlan(p));
  }, [backend, initialPlan, planId]);

  if (plan === undefined) return <main className="mx-auto max-w-2xl px-4 pt-6"><FeedSkeleton count={1} /></main>;
  if (plan === null)
    return (
      <main className="mx-auto max-w-2xl px-4 pt-10">
        <EmptyState emoji="🫥" title="Este plan ya no existe" action={<ButtonLink href={`/${city.slug}`}>Ver qué hay hoy</ButtonLink>}>
          Puede que lo hayan borrado o que el enlace no sea correcto.
        </EmptyState>
      </main>
    );

  const start = new Date(plan.startsAt);
  // Margen de un minuto: un plan creado "ahora" no debe aparecer como futuro.
  const live = Boolean(now && start.getTime() <= now.getTime() + 60_000 && start.getTime() + PLAN_DURATION_H * 3_600_000 > now.getTime());
  const end = new Date(start.getTime() + PLAN_DURATION_H * 3_600_000);
  const isMine = Boolean(profile && plan.creatorId === profile.id);
  const cat = categoryOf(plan.category);

  async function remove() {
    if (!plan || !window.confirm("¿Borrar este plan?")) return;
    const res = await backend.deletePlan(plan.id);
    if (!res.ok) return toast({ message: res.error, tone: "error" });
    toast({ message: "Plan borrado" });
    router.push(`/${city.slug}`);
  }

  return (
    <main className="mx-auto max-w-2xl px-4">
      <DetailHero seed={plan.id} category="planes" imageUrl={plan.imageUrl} title={plan.title} isDemo={plan.isDemo} backHref={`/${city.slug}`}>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-black/50 px-3 py-1 text-sm font-medium backdrop-blur">
          ✨ Plan de la comunidad · {cat.emoji} {cat.label}
        </span>
        <h1 className="mt-2 font-display text-4xl font-extrabold leading-none tracking-tight">{plan.title}</h1>
        <p className="mt-2 text-sm text-muted">
          Creado por <span className="text-ink">{plan.creatorName}</span> · {timeAgo(plan.createdAt)}
        </p>
      </DetailHero>

      <div className="mt-4 grid gap-2">
        <div className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-4">
          <Clock className="text-lime" size={20} />
          <div className="flex-1 leading-tight">
            <p className="font-semibold">{live ? "Ahora mismo" : `${formatLongDay(start)} · ${formatTime(start)}`}</p>
            {now ? <p className="text-sm text-muted">{live ? "El plan está en marcha" : end <= now ? "Este plan ya terminó" : startLabel(start, null, now)}</p> : null}
          </div>
        </div>
        {venue ? (
          <Link href={`/${city.slug}/${venue.slug}`} className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-3 hover:border-line-strong">
            <Cover seed={venue.id} category={venue.category} alt="" emojiSize="text-3xl" className="size-12 shrink-0 rounded-xl" sizes="48px" />
            <div className="flex-1 leading-tight">
              <p className="font-semibold">{venue.name}</p>
              <p className="text-sm text-muted">{venue.neighborhood}, {city.name}</p>
            </div>
            <ChevronRight className="text-dim" />
          </Link>
        ) : (
          <div className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-4">
            <MapPin className="text-lime" size={20} />
            <p className="font-semibold">{plan.placeName}</p>
          </div>
        )}
      </div>

      {plan.description ? <p className="mt-5 whitespace-pre-line text-[15px] leading-relaxed text-ink/85">{plan.description}</p> : null}

      <div className="mt-5">
        <InterestButton size="lg" target={{ type: "plan", id: plan.id }} baseCount={baseCount} meta={{ category: plan.category, citySlug: city.slug, startsAt: plan.startsAt }} />
        <p className="mt-3 flex items-start gap-2 text-xs text-muted">
          <ShieldCheck size={14} className="mt-0.5 shrink-0 text-live" />
          Solo se muestra cuántas personas se apuntan. Nadie ve quién eres ni dónde estás.
        </p>
        {plan.visibility === "link" ? (
          <p className="mt-2 flex items-center gap-2 text-xs text-muted">
            <Lock size={14} /> Plan solo con enlace: no aparece en el feed. Compártelo con tu gente.
          </p>
        ) : null}
      </div>

      <div className="mt-4 flex justify-end">
        {isMine ? (
          <button onClick={() => void remove()} className="inline-flex items-center gap-1.5 text-sm text-danger">
            <Trash2 size={15} /> Borrar plan
          </button>
        ) : (
          <ContentMenu onReport={() => requireAuth("Inicia sesión para denunciar") && setReporting({ type: "plan", id: plan.id, preview: `${plan.title} — ${plan.description}` })} />
        )}
      </div>

      <div className="mt-6">
        <Salseo target={{ type: "plan", id: plan.id }} initialPosts={initialPosts} initialReplies={initialReplies} />
      </div>
      <ReportSheet target={reporting} onClose={() => setReporting(null)} onReported={() => router.push(`/${city.slug}`)} />
    </main>
  );
}
