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

function StatementCard({ label, statement, confidence, tone = "default" }: { label: string; statement: string; confidence?: number; tone?: "default" | "danger" | "accent" }) {
  const border = tone === "danger" ? "border-[var(--danger)]/40 bg-[var(--danger)]/5" : tone === "accent" ? "border-[var(--accent)]/40 bg-[var(--accent)]/5" : "border-[var(--border)] bg-[var(--surface)]";
  return (
    <div className={`rounded-2xl border p-3 ${border}`}>
      <p className="text-[10px] font-mono uppercase tracking-widest text-[var(--muted)]">{label}</p>
      <p className="mt-1.5 text-sm font-semibold leading-tight">&quot;{statement}&quot;</p>
      {confidence !== undefined ? <p className="mt-0.5 text-xs text-[var(--accent)]">{confidence}%</p> : null}
    </div>
  );
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

  async function share() {
    trackClient("share_clicked", {});
    const text = t("share.resultText");
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
    most_accurate: "results.mostAccurate",
    best_observer: "results.bestObserver",
    most_tested: "results.mostTested",
    most_unpredictable: "results.mostUnpredictable",
  };

  return (
    <div className="flex flex-1 flex-col px-5 pb-10 pt-4 animate-fade-up">
      <p className="font-mono text-sm uppercase tracking-[0.3em] text-[var(--muted)]">ROOM</p>
      <h1 className="mt-2 text-2xl font-bold leading-tight">{t("results.title")}</h1>

      <div className="mt-5 overflow-hidden rounded-3xl border border-[var(--accent)]/40 bg-[var(--surface)] p-5">
        <div className="flex items-baseline justify-between">
          <span className="font-mono text-xs uppercase tracking-[0.3em] text-[var(--muted)]">{t("results.hypothesesTested")}</span>
          <span className="tabnums text-4xl font-bold text-[var(--accent)]">{report.hypothesesTested}</span>
        </div>
        <p className="mt-2 text-sm text-[var(--muted)]">{t("results.hypothesesConfirmed", { count: report.hypothesesConfirmed })}</p>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2.5">
        {report.superlatives.map((s) => {
          const p = s.playerId ? view.players.find((x) => x.id === s.playerId) : null;
          return (
            <div key={s.key} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3">
              <p className="text-[10px] font-mono uppercase tracking-widest text-[var(--muted)]">{t(superlativeKey[s.key] ?? s.key)}</p>
              <div className="mt-1.5 flex items-center gap-2">
                {p ? <Avatar player={p} size={22} /> : null}
                <span className="truncate text-sm font-semibold">{p?.nickname ?? "—"}</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-2.5 space-y-2.5">
        {report.biggestTheory ? (
          <StatementCard label={t("results.biggestTheory")} statement={loc(report.biggestTheory.statement)} confidence={report.biggestTheory.confidence} tone="accent" />
        ) : null}
        {report.biggestPlotTwist ? (
          <StatementCard label={t("results.biggestPlotTwist")} statement={loc(report.biggestPlotTwist.statement)} confidence={report.biggestPlotTwist.confidence} tone="danger" />
        ) : null}
        {report.mostControversial ? (
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3">
            <p className="text-[10px] font-mono uppercase tracking-widest text-[var(--muted)]">{t("results.mostControversial")}</p>
            <p className="mt-1.5 text-sm">&quot;{loc(report.mostControversial.a)}&quot;</p>
            <p className="mt-1 text-sm text-[var(--muted)]">{t("results.vs")} &quot;{loc(report.mostControversial.b)}&quot;</p>
          </div>
        ) : null}
      </div>

      <div className="mt-4">
        <AiCard title={t("results.finalAnalysisTitle")} tone="accent">
          <p className="text-[15px] leading-relaxed">{loc(report.finalAnalysis)}</p>
        </AiCard>
      </div>

      <div className="mt-5">
        <p className="mb-2 text-[10px] font-mono uppercase tracking-widest text-[var(--muted)]">{t("common.leaderboard")}</p>
        <Leaderboard view={view} />
        {report.theoryWinnerId && report.theoryWinnerId !== report.gameWinnerId ? (
          <p className="mt-3 text-sm text-[var(--muted)]">
            {t("results.theoryWinner")}: <span className="font-semibold text-[var(--text)]">{nameOf(view, report.theoryWinnerId)}</span>
          </p>
        ) : null}
      </div>

      <p className="mt-5 text-center text-lg font-bold">{t("results.viralHook")}</p>

      <div className="mt-4 space-y-3">
        <Button onClick={share}>{copied ? t("share.linkCopied") : t("common.share").toUpperCase()}</Button>
        <Button variant="surface" onClick={() => { trackClient("play_again"); room.leave(); location.href = "/create"; }}>
          {t("common.playAgain").toUpperCase()}
        </Button>
        <LinkButton href="/" variant="ghost">{t("common.createNewRoom")}</LinkButton>
      </div>

      <p className="mt-6 text-center text-[11px] leading-relaxed text-[var(--muted)]">{t("results.disclaimer")}</p>
    </div>
  );
}
