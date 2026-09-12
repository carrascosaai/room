"use client";

import { useParams } from "next/navigation";
import { useI18n } from "@/i18n";
import { normalizeRoomCode } from "@/lib/id";
import { useStage } from "@/lib/useStage";
import { LanguageToggle, Logo, Dots } from "@/components/ui";
import { QrCode } from "@/components/QrCode";
import { Avatar, Leaderboard, PlayerList } from "@/components/room/PlayerBits";
import { AiEye } from "@/components/room/AiSpeech";
import { Timer } from "@/components/room/Timer";
import type { PlayerView } from "@/game/view";

// ─────────────────────────────────────────────────────────────
// THE STAGE — the shared screen. Cast it to a TV, or prop a phone
// up where everyone can see it. It never shows a private decision
// before REVEAL, or an anonymous hypothesis's creator. Phones still
// drive every action; this just watches and narrates.
// ─────────────────────────────────────────────────────────────

function baseUrl(): string {
  if (typeof window !== "undefined") return window.location.origin;
  return process.env.NEXT_PUBLIC_BASE_URL || "";
}

export default function StagePage() {
  const params = useParams<{ code: string }>();
  const code = normalizeRoomCode(params.code ?? "");
  const { t } = useI18n();
  const { view, status } = useStage(code);

  return (
    <div className="relative left-1/2 min-h-[100dvh] w-screen -translate-x-1/2 bg-[var(--bg)]">
      <div className="mx-auto flex min-h-[100dvh] w-full max-w-4xl flex-col px-8 py-6">
        <header className="flex items-center justify-between">
          <Logo size="text-2xl" />
          <div className="flex items-center gap-3">
            <span className="font-mono text-[11px] uppercase tracking-[0.3em] text-[var(--muted)]">{t("stage.modeLabel")}</span>
            <LanguageToggle />
          </div>
        </header>

        <main className="flex flex-1 flex-col items-center justify-center py-10">
          {status === "gone" ? (
            <p className="text-center text-lg text-[var(--muted)]">{t("errors.room_not_found")}</p>
          ) : !view ? (
            <p className="flex items-center gap-2 text-[var(--muted)]">{t("common.connecting")} <Dots /></p>
          ) : (
            <StageBody view={view} code={code} />
          )}
        </main>
      </div>
    </div>
  );
}

function StageBody({ view, code }: { view: PlayerView; code: string }) {
  switch (view.phase) {
    case "LOBBY":
      return <StageLobby view={view} code={code} />;
    case "ROUND_INTRO":
      return <StageIntro view={view} />;
    case "HYPOTHESIS":
      return <StageHypothesis view={view} />;
    case "TEST_SETUP":
      return <StageTestSetup view={view} />;
    case "PRIVATE_DECISION":
      return <StageAnswering view={view} />;
    case "REVEAL":
      return <StageReveal view={view} />;
    case "CONFIDENCE_UPDATE":
      return <StageConfidence view={view} />;
    case "FINAL_REPORT":
      return <StageFinal view={view} />;
    default:
      return null;
  }
}

// ─────────────────────────────────────────── LOBBY

function StageLobby({ view, code }: { view: PlayerView; code: string }) {
  const { t } = useI18n();
  const joinUrl = `${baseUrl()}/room/${code}`;
  return (
    <div className="flex w-full flex-col items-center text-center">
      <p className="font-mono text-sm uppercase tracking-[0.4em] text-[var(--muted)]">{t("lobby.title")}</p>
      <p className="mt-2 font-mono text-8xl font-bold tracking-[0.2em]">{code}</p>
      <div className="mt-8"><QrCode value={joinUrl} size={200} /></div>
      <p className="mt-4 text-lg text-[var(--muted)]">{t("stage.openOnPhone")}</p>
      <p className="mt-1 font-mono text-sm text-[var(--text)]">{t("stage.joinAt")} {joinUrl.replace(/^https?:\/\//, "")}</p>
      <div className="mt-10 w-full max-w-xl">
        <p className="mb-3 text-sm font-semibold">{t("lobby.playersJoined", { count: view.players.length, max: view.maxPlayers })}</p>
        <PlayerList view={view} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────── ROUND INTRO

function StageIntro({ view }: { view: PlayerView }) {
  const { t, loc } = useI18n();
  const r = view.round;
  return (
    <div className="text-center">
      <p className="font-mono text-lg uppercase tracking-[0.4em] text-[var(--muted)]">{t("game.roundIntro", { n: (r?.index ?? 0) + 1 })}</p>
      {r?.title ? <h1 className="mt-4 text-4xl font-bold">{loc(r.title)}</h1> : null}
      <div className="mt-8"><Dots /></div>
    </div>
  );
}

// ─────────────────────────────────────────── HYPOTHESIS

function StageHypothesis({ view }: { view: PlayerView }) {
  const { t, loc } = useI18n();
  const r = view.round;
  if (!r) return null;
  return (
    <div className="flex w-full flex-col items-center text-center">
      <AiEye active />
      <p className="mt-4 font-mono text-sm uppercase tracking-[0.4em] text-[var(--danger)]">🧠 {t("hyp.theoryBadge")}</p>
      <div className="mt-6"><Timer deadline={view.phaseDeadline} total={r.timeLimit} /></div>
      {r.hypothesis ? (
        <p className="mt-10 max-w-2xl text-4xl font-bold leading-tight">&quot;{loc(r.hypothesis.statement)}&quot;</p>
      ) : (
        <p className="mt-10 text-2xl text-[var(--muted)]">{t("hyp.waitingForAuthor")}</p>
      )}
    </div>
  );
}

// ─────────────────────────────────────────── TEST SETUP

function StageTestSetup({ view }: { view: PlayerView }) {
  const { t, loc } = useI18n();
  const r = view.round;
  if (!r) return null;
  return (
    <div className="flex w-full flex-col items-center text-center">
      <p className="font-mono text-sm uppercase tracking-[0.4em] text-[var(--accent)]">{t("hyp.designTest")}</p>
      {r.hypothesis ? <p className="mt-8 max-w-2xl text-3xl font-bold leading-snug">&quot;{loc(r.hypothesis.statement)}&quot;</p> : null}
      <div className="mt-10"><Dots /></div>
    </div>
  );
}

// ─────────────────────────────────────────── PRIVATE_DECISION

function StageAnswering({ view }: { view: PlayerView }) {
  const { t, loc } = useI18n();
  const r = view.round;
  if (!r) return null;
  const prompt = r.body ?? r.prompt;
  return (
    <div className="flex w-full flex-col items-center text-center">
      {r.hypothesis ? (
        <p className="mb-4 max-w-2xl rounded-2xl border border-[var(--danger)]/40 bg-[var(--danger)]/5 px-4 py-2 text-lg">🧠 &quot;{loc(r.hypothesis.statement)}&quot;</p>
      ) : null}
      {prompt ? <h1 className="max-w-2xl text-3xl font-bold leading-snug">{loc(prompt)}</h1> : null}
      <div className="mt-10 flex items-center gap-3">
        <Timer deadline={view.phaseDeadline} total={r.timeLimit} />
        <p className="text-[var(--muted)]">{r.answeredCount}/{r.respondentCount} · {t("stage.waitingForAnswers")}</p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────── REVEAL

function StageReveal({ view }: { view: PlayerView }) {
  const { t, loc } = useI18n();
  const reveal = view.reveal;
  return (
    <div className="flex w-full flex-col items-center text-center">
      <p className="font-mono text-sm uppercase tracking-[0.4em] text-[var(--muted)]">{t("game.revealTitle")}</p>
      <div className="mt-6 max-w-2xl space-y-3">
        {reveal?.lines.map((l, i) => <p key={i} className="text-2xl font-semibold leading-snug">{loc(l)}</p>)}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────── CONFIDENCE UPDATE

function StageConfidence({ view }: { view: PlayerView }) {
  const { t, loc } = useI18n();
  const r = view.round;
  return (
    <div className="flex w-full flex-col items-center text-center">
      <AiEye active />
      <p className="mt-4 font-mono text-sm uppercase tracking-[0.4em] text-[var(--muted)]">{t("ai.confidence")}</p>
      {r?.hypothesis ? (
        <>
          <p className="mt-8 max-w-2xl text-3xl font-bold leading-snug">&quot;{loc(r.hypothesis.statement)}&quot;</p>
          <p className="mt-6 tabnums text-6xl font-bold text-[var(--accent)]">{Math.round(r.hypothesis.confidence)}%</p>
        </>
      ) : null}
    </div>
  );
}

// ─────────────────────────────────────────── FINAL

function StageFinal({ view }: { view: PlayerView }) {
  const { t, loc } = useI18n();
  const report = view.report;
  if (!report) return null;
  const winner = report.standings[0];
  return (
    <div className="flex w-full flex-col items-center text-center">
      <p className="font-mono text-lg uppercase tracking-[0.3em] text-[var(--muted)]">{t("results.title")}</p>

      <div className="mt-8 flex items-baseline gap-4">
        <span className="font-mono text-xs uppercase tracking-[0.3em] text-[var(--muted)]">{t("results.hypothesesTested")}</span>
        <span className="tabnums text-6xl font-bold text-[var(--accent)]">{report.hypothesesTested}</span>
      </div>

      {winner ? (
        <div className="mt-8 flex items-center gap-3">
          <Avatar player={view.players.find((p) => p.id === winner.playerId)!} size={40} />
          <p className="text-2xl font-bold">{nameOf(view, winner.playerId)}</p>
          <span className="tabnums text-xl text-[var(--muted)]">{winner.score} pts</span>
        </div>
      ) : null}

      <div className="mt-10 max-w-2xl">
        <p className="text-lg leading-relaxed">{loc(report.finalAnalysis)}</p>
      </div>

      <div className="mt-10 w-full max-w-xl text-left">
        <Leaderboard view={view} />
      </div>

      <p className="mt-10 text-sm text-[var(--muted)]">{t("stage.castHint")}</p>
    </div>
  );
}

function nameOf(view: PlayerView, id: string): string {
  return view.players.find((p) => p.id === id)?.nickname ?? "?";
}
