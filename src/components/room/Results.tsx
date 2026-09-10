"use client";

import { useMemo } from "react";
import { useI18n } from "@/i18n";
import type { PlayerView } from "@/game/view";
import type { UseRoom } from "@/lib/useRoom";
import { Button, LinkButton, useCopy } from "@/components/ui";
import { trackClient } from "@/lib/analytics";
import { Avatar, Leaderboard } from "./PlayerBits";
import { AiCard } from "./AiSpeech";

function nameOf(view: PlayerView, id: string | null): string {
  if (!id) return "—";
  return view.players.find((p) => p.id === id)?.nickname ?? "—";
}

export function Results({ view, room }: { view: PlayerView; room: UseRoom }) {
  const { t, loc } = useI18n();
  const [copied, copy] = useCopy();
  const report = view.report;

  const shareUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    return `${window.location.origin}/room/${view.code}`;
  }, [view.code]);

  if (!report) return null;

  const accuracyPct = Math.round(report.aiAccuracy * 100);

  async function share() {
    trackClient("share_clicked", { accuracy: accuracyPct });
    const text = t("share.resultText", { accuracy: accuracyPct });
    try {
      if (navigator.share) {
        await navigator.share({ title: t("share.resultTitle"), text, url: shareUrl });
        return;
      }
    } catch {
      /* fall through to copy */
    }
    copy(`${text} ${shareUrl}`);
  }

  const superlativeKey: Record<string, string> = {
    most_competitive: "results.mostCompetitive",
    most_cooperative: "results.mostCooperative",
    most_unpredictable: "results.mostUnpredictable",
    most_trusted: "results.mostTrusted",
  };

  return (
    <div className="flex flex-1 flex-col px-5 pb-10 pt-4 animate-fade-up">
      <p className="font-mono text-sm uppercase tracking-[0.3em] text-[var(--muted)]">ROOM</p>
      <h1 className="mt-2 text-2xl font-bold leading-tight">{t("results.title")}</h1>

      {/* shareable card */}
      <div className="mt-5 overflow-hidden rounded-3xl border border-[var(--accent)]/40 bg-[var(--surface)] p-5">
        <div className="flex items-baseline justify-between">
          <span className="font-mono text-xs uppercase tracking-[0.3em] text-[var(--muted)]">
            {t("results.aiAccuracy")}
          </span>
          <span className="tabnums text-4xl font-bold text-[var(--accent)]">{accuracyPct}%</span>
        </div>
        <p className="mt-2 text-sm text-[var(--muted)]">
          {report.timesGroupFooledAi > 0
            ? t("results.youFooledIt", { count: report.timesGroupFooledAi })
            : t("results.itFooledYou")}
        </p>
        {report.biggestBetrayal ? (
          <p className="mt-3 border-t border-[var(--border)] pt-3 text-sm">
            <span className="text-[var(--muted)]">{t("results.biggestBetrayal")}: </span>
            <span className="font-semibold">
              {nameOf(view, report.biggestBetrayal.from)} → {nameOf(view, report.biggestBetrayal.to)}
            </span>
          </p>
        ) : null}
        {report.biggestAlliance ? (
          <p className="mt-1.5 text-sm">
            <span className="text-[var(--muted)]">{t("results.biggestAlliance")}: </span>
            <span className="font-semibold">
              {nameOf(view, report.biggestAlliance.a)} + {nameOf(view, report.biggestAlliance.b)}
            </span>
          </p>
        ) : null}
      </div>

      {/* superlatives */}
      <div className="mt-5 grid grid-cols-2 gap-2.5">
        {report.superlatives.map((s) => {
          const p = s.playerId ? view.players.find((x) => x.id === s.playerId) : null;
          return (
            <div key={s.key} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3">
              <p className="text-[10px] font-mono uppercase tracking-widest text-[var(--muted)]">
                {t(superlativeKey[s.key] ?? s.key)}
              </p>
              <div className="mt-1.5 flex items-center gap-2">
                {p ? <Avatar player={p} size={22} /> : null}
                <span className="truncate text-sm font-semibold">{p?.nickname ?? "—"}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* surprising pattern */}
      <div className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
        <p className="text-[10px] font-mono uppercase tracking-widest text-[var(--muted)]">
          {t("results.mostSurprising")}
        </p>
        <p className="mt-1.5 text-sm">{loc(report.surprisingPattern)}</p>
      </div>

      {/* final theory */}
      <div className="mt-4">
        <AiCard title={t("results.finalTheoryTitle")} tone="accent">
          <p className="text-[15px] leading-relaxed">{loc(report.finalTheory)}</p>
        </AiCard>
      </div>

      {/* standings */}
      <div className="mt-5">
        <p className="mb-2 text-[10px] font-mono uppercase tracking-widest text-[var(--muted)]">
          {t("common.leaderboard")}
        </p>
        <Leaderboard view={view} />
      </div>

      <p className="mt-5 text-center text-lg font-bold">{t("results.viralHook")}</p>

      <div className="mt-4 space-y-3">
        <Button onClick={share}>
          {copied ? t("share.linkCopied") : t("common.share").toUpperCase()}
        </Button>
        <Button variant="surface" onClick={() => { trackClient("play_again"); room.leave(); location.href = "/create"; }}>
          {t("common.playAgain").toUpperCase()}
        </Button>
        <LinkButton href="/" variant="ghost">
          {t("common.createNewRoom")}
        </LinkButton>
      </div>

      <p className="mt-6 text-center text-[11px] leading-relaxed text-[var(--muted)]">
        {t("results.disclaimer")}
      </p>
    </div>
  );
}
