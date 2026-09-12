"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/i18n";
import type { PlayerView } from "@/game/view";
import type { UseRoom } from "@/lib/useRoom";
import { HYPOTHESIS_CATEGORIES, templatesForCategory, counterCandidates, templateById } from "@/game/hypothesisContent";
import type { HypothesisCategory } from "@/game/types";
import { Button, Dots, useCopy } from "@/components/ui";
import { QrCode } from "@/components/QrCode";
import { AiCard, AiSpeech } from "./AiSpeech";
import { Timer } from "./Timer";
import { Avatar, PlayerList } from "./PlayerBits";

function baseUrl(): string {
  if (typeof window !== "undefined") return window.location.origin;
  return process.env.NEXT_PUBLIC_BASE_URL || "";
}

function nameOf(view: PlayerView, id: string): string {
  return view.players.find((p) => p.id === id)?.nickname ?? "?";
}

// ─────────────────────────────────────────── LOBBY

export function Lobby({ view, room }: { view: PlayerView; room: UseRoom }) {
  const { t } = useI18n();
  const [copied, copy] = useCopy();
  const joinUrl = `${baseUrl()}/room/${view.code}`;
  const isHost = view.me?.isHost ?? false;
  const enough = view.players.length >= view.minPlayers;

  return (
    <div className="flex flex-1 flex-col px-5 pb-8 pt-4 animate-fade-up">
      <p className="text-xs font-mono uppercase tracking-[0.3em] text-[var(--muted)]">{t("lobby.title")}</p>
      <button onClick={() => copy(view.code)} className="mt-1 text-left font-mono text-5xl font-bold tracking-[0.15em]" aria-label={`Room code ${view.code}`}>
        {view.code}
      </button>
      <p className="mt-1 text-xs text-[var(--muted)]">{copied ? t("common.copied") : t("lobby.shareThisCode")}</p>

      <div className="mt-6 flex items-center gap-4">
        <QrCode value={joinUrl} size={132} />
        <div className="text-sm text-[var(--muted)]">
          <p>{t("lobby.orScan")}</p>
          <p className="mt-2 break-all font-mono text-xs text-[var(--text)]">{joinUrl.replace(/^https?:\/\//, "")}</p>
        </div>
      </div>

      {isHost ? (
        <a href={`/stage/${view.code}`} target="_blank" rel="noopener noreferrer" className="mt-4 inline-block text-xs font-mono uppercase tracking-widest text-[var(--accent)] underline underline-offset-4">
          {t("lobby.openStage")} →
        </a>
      ) : null}

      <div className="mt-7 flex items-center justify-between">
        <span className="text-sm font-semibold">{t("lobby.playersJoined", { count: view.players.length, max: view.maxPlayers })}</span>
      </div>
      <div className="mt-3">
        <PlayerList view={view} />
      </div>

      <div className="mt-auto space-y-3 pt-8">
        {isHost ? (
          <>
            <Button onClick={() => room.start()} disabled={!enough}>{t("lobby.startButton").toUpperCase()}</Button>
            {!enough ? <p className="text-center text-xs text-[var(--muted)]">{t("lobby.needMore", { min: view.minPlayers })}</p> : null}
          </>
        ) : (
          <p className="flex items-center justify-center gap-2 text-center text-sm text-[var(--muted)]">{t("lobby.waitingForHost")} <Dots /></p>
        )}
        <Button variant="ghost" onClick={() => room.leave()}>{t("lobby.leave")}</Button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────── ROUND INTRO

export function RoundIntro({ view }: { view: PlayerView }) {
  const { t, loc } = useI18n();
  const r = view.round;
  const n = (r?.index ?? 0) + 1;
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-8 text-center animate-fade-up">
      <p className="font-mono text-sm uppercase tracking-[0.3em] text-[var(--muted)]">{t("game.roundIntro", { n })}</p>
      <h2 className="mt-3 text-2xl font-bold leading-tight">{r?.title ? loc(r.title) : t("game.yourChoice")}</h2>
      <div className="mt-8"><Dots /></div>
    </div>
  );
}

// ─────────────────────────────────────────── HYPOTHESIS

export function HypothesisScreen({ view, room }: { view: PlayerView; room: UseRoom }) {
  const { t, loc, lang } = useI18n();
  const somebody = lang === "es" ? "alguien" : "someone";
  const r = view.round;
  const [target, setTarget] = useState<string | null>(null);
  const [category, setCategory] = useState<HypothesisCategory>("loyalty");
  const [submitting, setSubmitting] = useState(false);
  const [mode, setMode] = useState<"none" | "author" | "counter">("none");
  useEffect(() => setMode("none"), [r?.id]);
  if (!r) return null;

  const isAuthor = r.iAmAuthor;
  const hasHypothesis = !!r.hypothesis;
  const isTarget = !!view.me && r.hypothesis?.targetId === view.me.id;
  const iAmCreator = !!view.me && r.hypothesis?.creatorId === view.me.id;

  const submitHypothesis = async (templateId: string) => {
    if (!target || submitting) return;
    setSubmitting(true);
    await room.submitHypothesis({ targetId: target, category, templateId, anonymous: true });
    setSubmitting(false);
  };

  const submitCounter = async (templateId: string) => {
    if (submitting) return;
    setSubmitting(true);
    await room.submitHypothesis({ targetId: r.hypothesis!.targetId, category: r.hypothesis!.category, templateId, anonymous: true, counterOf: r.hypothesis!.id });
    setSubmitting(false);
  };

  // author, hasn't submitted yet: pick target + statement
  if (isAuthor && !hasHypothesis) {
    return (
      <div className="flex flex-1 flex-col px-5 pb-8 pt-4 animate-fade-up">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-[var(--accent)]">{t("hyp.yourTurn")}</p>
        <h1 className="mt-2 text-2xl font-bold leading-tight">{t("hyp.createTheory")}</h1>

        {!target ? (
          <>
            <p className="mt-5 mb-2 text-xs font-mono uppercase tracking-widest text-[var(--muted)]">{t("hyp.whoToTest")}</p>
            <div className="grid gap-2">
              {view.players.filter((p) => p.id !== view.me?.id).map((p) => (
                <button key={p.id} onClick={() => setTarget(p.id)} className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-4 text-left transition hover:border-[var(--accent)]">
                  <Avatar player={p} size={26} />
                  <span>{p.nickname}</span>
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="mt-4 flex gap-1.5 overflow-x-auto pb-2">
              {HYPOTHESIS_CATEGORIES.map((c) => (
                <button key={c} onClick={() => setCategory(c)} className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-mono uppercase tracking-widest ${category === c ? "border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--accent)]" : "border-[var(--border)] text-[var(--muted)]"}`}>
                  {t(`hyp.category.${c}`)}
                </button>
              ))}
            </div>
            <p className="mt-3 mb-2 text-xs font-mono uppercase tracking-widest text-[var(--muted)]">
              {t("hyp.pickStatement", { name: nameOf(view, target) })}
            </p>
            <div className="grid gap-2 pb-8">
              {templatesForCategory(category).map((tpl) => (
                <button
                  key={tpl.id}
                  disabled={submitting}
                  onClick={() => submitHypothesis(tpl.id)}
                  className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3.5 text-left text-sm transition hover:border-[var(--accent)] disabled:opacity-50"
                >
                  {loc(tpl.statement(nameOf(view, target), somebody))}
                </button>
              ))}
            </div>
            <button onClick={() => setTarget(null)} className="mt-1 text-xs text-[var(--muted)] underline underline-offset-4">
              {t("common.back")}
            </button>
          </>
        )}
      </div>
    );
  }

  // hypothesis exists: show it. Others (not creator, not target) can counter or challenge.
  if (hasHypothesis) {
    const h = r.hypothesis!;
    const canRespond = !!view.me && !iAmCreator && !isTarget && mode === "none";
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-6 text-center animate-fade-up">
        <p className="font-mono text-xs uppercase tracking-[0.35em] text-[var(--danger)]">🧠 {t("hyp.theoryBadge")}</p>
        <div className="mt-6"><Timer deadline={view.phaseDeadline} total={r.timeLimit} /></div>
        <p className="mt-8 max-w-sm text-2xl font-bold leading-snug">&quot;{loc(h.statement)}&quot;</p>
        {r.counterHypothesis ? (
          <p className="mt-4 max-w-xs text-sm text-[var(--muted)]">{t("hyp.counterFiled")}</p>
        ) : canRespond && mode === "none" ? (
          <div className="mt-8 flex w-full max-w-xs flex-col gap-2.5">
            <Button variant="surface" onClick={() => setMode("counter")}>{t("hyp.counterTheory").toUpperCase()}</Button>
            <Button variant="ghost" onClick={() => room.challengeHypothesis()}>{t("hyp.challenge").toUpperCase()}</Button>
          </div>
        ) : null}
        {mode === "counter" ? (
          <div className="mt-6 grid w-full max-w-sm gap-2 text-left">
            {counterCandidates(templateById(h.templateId)!).map((tpl) => (
              <button key={tpl.id} disabled={submitting} onClick={() => submitCounter(tpl.id)} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm transition hover:border-[var(--accent)] disabled:opacity-50">
                {loc(tpl.statement(nameOf(view, h.targetId), somebody))}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    );
  }

  // not the author, nothing submitted yet
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 text-center animate-fade-up">
      <p className="font-mono text-xs uppercase tracking-[0.35em] text-[var(--danger)]">🧠 {t("hyp.theoryBadge")}</p>
      <div className="mt-6"><Timer deadline={view.phaseDeadline} total={r.timeLimit} /></div>
      <p className="mt-8 text-lg text-[var(--muted)]">{t("hyp.waitingForAuthor")}</p>
      <Dots />
    </div>
  );
}

// ─────────────────────────────────────────── TEST SETUP

export function TestSetupScreen({ view, room }: { view: PlayerView; room: UseRoom }) {
  const { t, loc } = useI18n();
  const r = view.round;
  const [submitting, setSubmitting] = useState(false);
  if (!r) return null;

  const pick = async (stakes: "low" | "medium" | "high") => {
    if (submitting) return;
    setSubmitting(true);
    await room.submitStakes(stakes);
    setSubmitting(false);
  };

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 text-center animate-fade-up">
      <p className="font-mono text-xs uppercase tracking-[0.35em] text-[var(--accent)]">{t("hyp.designTest")}</p>
      {r.hypothesis ? <p className="mt-4 max-w-sm text-lg font-semibold leading-snug">&quot;{loc(r.hypothesis.statement)}&quot;</p> : null}
      {r.iAmAuthor ? (
        <div className="mt-8 flex w-full max-w-xs flex-col gap-2.5">
          <p className="mb-1 text-xs font-mono uppercase tracking-widest text-[var(--muted)]">{t("hyp.pickStakes")}</p>
          <Button variant="surface" disabled={submitting} onClick={() => pick("low")}>{t("hyp.stakesLow").toUpperCase()}</Button>
          <Button variant="surface" disabled={submitting} onClick={() => pick("medium")}>{t("hyp.stakesMedium").toUpperCase()}</Button>
          <Button variant="surface" disabled={submitting} onClick={() => pick("high")}>{t("hyp.stakesHigh").toUpperCase()}</Button>
        </div>
      ) : (
        <p className="mt-8 flex items-center gap-2 text-sm text-[var(--muted)]">{t("common.waiting")} <Dots /></p>
      )}
    </div>
  );
}

// ─────────────────────────────────────────── ANSWER (PRIVATE_DECISION)

export function AnswerScreen({ view, room }: { view: PlayerView; room: UseRoom }) {
  const { t, loc } = useI18n();
  const r = view.round;
  const [pending, setPending] = useState<string | null>(null);
  useEffect(() => setPending(null), [r?.id]);
  if (!r) return null;

  const prompt = r.body ?? r.prompt;
  const title = r.title ? loc(r.title) : null;
  const isTest = r.kind === "theory_test";
  const isComparison = !!r.comparisonOptions;
  const waiting = Math.max(0, r.respondentCount - r.answeredCount);

  const submit = (id: string) => {
    if (pending || r.iAnswered) return;
    setPending(id);
    room.answer(id);
  };

  return (
    <div className="flex flex-1 flex-col px-5 pb-8 pt-4 animate-fade-up">
      <div className="flex items-start justify-between gap-3">
        <div>
          {title ? (
            <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-[var(--accent)]">{title}</p>
          ) : (
            <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-[var(--muted)]">{t("game.roundIntro", { n: r.index + 1 })}</p>
          )}
        </div>
        <Timer deadline={view.phaseDeadline} total={r.timeLimit} />
      </div>

      {isTest && r.hypothesis ? (
        <div className="mt-3 rounded-2xl border border-[var(--danger)]/40 bg-[var(--danger)]/5 px-3 py-2 text-sm">
          🧠 &quot;{loc(r.hypothesis.statement)}&quot;
        </div>
      ) : null}

      {prompt ? <h2 className="mt-3 text-[22px] font-semibold leading-snug">{loc(prompt)}</h2> : null}

      <div className="mt-6 flex-1">
        {!r.iRespond ? (
          <p className="mt-10 text-center text-sm text-[var(--muted)]">{t("game.spectating")}</p>
        ) : r.iAnswered ? (
          <div className="mt-10 flex flex-col items-center gap-3 text-center">
            <span className="rounded-full border border-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--accent)]">{t("game.locked")}</span>
            <p className="flex items-center gap-2 text-sm text-[var(--muted)]">{waiting > 0 ? t("game.waitingOthers", { count: waiting }) : t("common.waiting")}<Dots /></p>
          </div>
        ) : (
          <>
            <p className="mb-3 text-xs uppercase tracking-widest text-[var(--muted)]">{isComparison ? t("game.pickPlayer") : t("game.chooseOne")}</p>
            <div className="grid gap-2.5">
              {r.myOptions.map((o) => {
                const asPlayer = view.players.find((p) => p.id === o.id);
                return (
                  <button key={o.id} onClick={() => submit(o.id)} disabled={!!pending} className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-4 text-left text-[15px] transition active:scale-[0.99] hover:border-[var(--accent)] disabled:opacity-50">
                    {asPlayer ? <Avatar player={asPlayer} size={26} /> : (
                      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md border border-[var(--border)] font-mono text-xs text-[var(--muted)]">{o.id.toUpperCase().slice(0, 1)}</span>
                    )}
                    <span>{loc(o.label)}</span>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>

      <MiniStandings view={view} />
    </div>
  );
}

function MiniStandings({ view }: { view: PlayerView }) {
  if (view.players.every((p) => p.score === 0)) return null;
  const top = [...view.players].sort((a, b) => b.score - a.score).slice(0, 3);
  return (
    <div className="mt-4 flex items-center gap-3 border-t border-[var(--border)] pt-3 text-xs text-[var(--muted)]">
      {top.map((p, i) => (
        <span key={p.id} className="flex items-center gap-1.5">
          <span className="font-mono">{i + 1}</span>
          <Avatar player={p} size={16} />
          <span className="tabnums">{p.score}</span>
        </span>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────── REVEAL

export function RevealScreen({ view, room }: { view: PlayerView; room: UseRoom }) {
  const { t, loc } = useI18n();
  const reveal = view.reveal;
  const isHost = view.me?.isHost ?? false;
  const myDelta = view.me ? (reveal?.scoreDelta[view.me.id] ?? 0) : 0;
  const wentAgainst = view.me ? reveal?.contrarians.includes(view.me.id) : false;

  const resultMsg = view.round && [...view.aiMessages].reverse().find((m) => m.roundIndex === view.round!.index && m.kind === "test_result");

  return (
    <div className="flex flex-1 flex-col px-5 pb-8 pt-4 animate-fade-up">
      <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-[var(--muted)]">{t("game.revealTitle")}</p>

      <div className="mt-3 space-y-2">
        {reveal?.lines.map((l, i) => <p key={i} className="text-[17px] font-semibold leading-snug">{loc(l)}</p>)}
      </div>

      {resultMsg ? (
        <div className="mt-4">
          <AiCard title={t("ai.name")} tone="accent"><AiSpeech text={resultMsg.text} speed={14} /></AiCard>
        </div>
      ) : null}

      {wentAgainst ? <p className="mt-3 text-sm font-semibold text-[var(--accent)]">{t("game.youWentAgainst")}</p> : null}

      {reveal && reveal.answers.length > 0 && view.round ? (
        <ul className="mt-5 space-y-1.5">
          {reveal.answers.map((a) => {
            const p = view.players.find((x) => x.id === a.playerId);
            if (!p) return null;
            return (
              <li key={a.playerId} className="flex items-center gap-2.5 text-sm">
                <Avatar player={p} size={20} />
                <span className="min-w-0 flex-1 truncate text-[var(--muted)]">{p.nickname}</span>
                <span className="truncate text-right">{a.label ? loc(a.label) : a.optionId}</span>
              </li>
            );
          })}
        </ul>
      ) : null}

      {myDelta !== 0 ? <p className="mt-4 tabnums text-sm text-[var(--muted)]">{myDelta > 0 ? "+" : ""}{myDelta} {t("common.points")}</p> : null}

      <div className="mt-auto pt-8">
        {isHost ? (
          <Button onClick={() => room.advance()}>{t("game.hostContinue").toUpperCase()}</Button>
        ) : (
          <p className="flex items-center justify-center gap-2 text-center text-sm text-[var(--muted)]">{t("common.waiting")} <Dots /></p>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────── CONFIDENCE UPDATE

export function ConfidenceUpdateScreen({ view, room }: { view: PlayerView; room: UseRoom }) {
  const { t, loc } = useI18n();
  const r = view.round;
  const isHost = view.me?.isHost ?? false;
  const msg = view.round && [...view.aiMessages].reverse().find((m) => m.roundIndex === view.round!.index && m.kind === "confidence_update");

  return (
    <div className="flex flex-1 flex-col px-5 pb-8 pt-4 animate-fade-up">
      <AiCard title={t("ai.name")} tone="accent">
        {r?.hypothesis ? (
          <>
            <p className="mb-3 text-lg font-bold leading-tight">&quot;{loc(r.hypothesis.statement)}&quot;</p>
            {msg ? <AiSpeech text={msg.text} /> : null}
            <div className="mt-4 border-t border-[var(--border)] pt-3">
              <ConfidenceBar value={r.hypothesis.confidence} label={t("ai.confidence")} status={r.hypothesis.status} />
            </div>
          </>
        ) : (
          <p className="text-sm text-[var(--muted)]">{t("ai.thinking")}</p>
        )}
        {r?.counterHypothesis ? (
          <div className="mt-4 border-t border-[var(--border)] pt-3">
            <p className="mb-2 text-sm italic text-[var(--muted)]">&quot;{loc(r.counterHypothesis.statement)}&quot;</p>
            <ConfidenceBar value={r.counterHypothesis.confidence} label={t("hyp.counterConfidence")} status={r.counterHypothesis.status} />
          </div>
        ) : null}
      </AiCard>

      <div className="mt-6">
        {isHost ? (
          <Button onClick={() => room.advance()}>{t("game.hostContinue").toUpperCase()}</Button>
        ) : (
          <p className="flex items-center justify-center gap-2 text-center text-sm text-[var(--muted)]">{t("common.waiting")} <Dots /></p>
        )}
      </div>
    </div>
  );
}

export function ConfidenceBar({ value, label, status }: { value: number; label: string; status?: string }) {
  const { t } = useI18n();
  const color = status === "confirmed" ? "var(--accent)" : status === "discarded" ? "var(--danger)" : "var(--muted)";
  return (
    <div>
      <div className="mb-1 flex justify-between text-[10px] font-mono uppercase tracking-widest text-[var(--muted)]">
        <span>{label}</span>
        <span className="tabnums">{Math.round(value)}%{status && status !== "active" ? ` · ${t(`hyp.status.${status}`)}` : ""}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-[var(--border)]">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.round(value)}%`, background: color }} />
      </div>
    </div>
  );
}
