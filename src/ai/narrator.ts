import { getAiProvider } from "./provider";
import type { AiMessage, GameState, Localized } from "@/game/types";

// ─────────────────────────────────────────────────────────────
// The narrator turns the engine's structured evidence into the
// AI's voice. If no provider is configured (or it times out), the
// deterministic text the engine already produced is kept as-is.
//
// It is ONLY ever asked to rephrase facts it is given. It cannot
// change scores, winners, evidence or game state.
// ─────────────────────────────────────────────────────────────

const SYSTEM = `You are "THE AI", the unseen intelligence inside the party game ROOM.
Voice: confident, observant, a little provocative, witty, concise. Never creepy, never moralizing.
You will receive STRUCTURED EVIDENCE (facts derived from real in-game choices) and must rephrase it.
Hard rules:
- Only state what the evidence supports. Never invent evidence, numbers, names or motives.
- Distinguish OBSERVATION ("X chose Y five times") from HYPOTHESIS ("I think X trusts Y — let's test it").
- Never claim anything about real relationships, romance, sexuality, crime, health or mental state.
- Max 2 short sentences per language. No emojis. No hashtags.
Respond ONLY with JSON: {"en": "...", "es": "..."}`;

interface NarrateInput {
  kind: AiMessage["kind"];
  evidence: string;
  fallback: Localized;
  /** extra structured context, already fact-checked by the engine */
  context?: Record<string, unknown>;
}

export async function narrate(input: NarrateInput): Promise<Localized> {
  const provider = getAiProvider();
  if (!provider.available) return input.fallback;

  const user = JSON.stringify(
    {
      moment: input.kind,
      structured_evidence: input.evidence,
      deterministic_version: input.fallback,
      context: input.context ?? {},
      instruction:
        "Rephrase the deterministic_version in THE AI's voice. Keep every fact identical. Return {en, es}.",
    },
    null,
    0,
  );

  const raw = await provider.complete({
    system: SYSTEM,
    user,
    maxTokens: 260,
    temperature: 0.85,
    timeoutMs: 6500,
  });
  if (!raw) return input.fallback;

  try {
    const parsed = JSON.parse(raw) as Partial<Localized>;
    const en = typeof parsed.en === "string" ? parsed.en.trim() : "";
    const es = typeof parsed.es === "string" ? parsed.es.trim() : "";
    if (en.length >= 3 && es.length >= 3 && en.length < 400 && es.length < 400) {
      return { en, es };
    }
  } catch {
    /* fall through */
  }
  return input.fallback;
}

/**
 * After a state transition, polish the most recent AI message for the
 * moments that matter. Returns a new state (or the same one).
 */
export async function polishLatestAiMessage(state: GameState): Promise<GameState> {
  const provider = getAiProvider();
  if (!provider.available) return state;
  const last = state.aiMessages[state.aiMessages.length - 1];
  // never re-polish: a message is sent to the LLM at most once, ever, no
  // matter how many times a client polls while the phase sits on it
  if (!last || last.polished) return state;

  const round = state.rounds.find((r) => r.index === last.roundIndex);
  const hypothesis = round?.hypothesisId
    ? state.hypotheses.find((h) => h.id === round.hypothesisId)
    : state.hypotheses.find((h) => h.status === "active");

  const polished = await narrate({
    kind: last.kind,
    evidence: hypothesis?.statement.en ?? last.text.en,
    fallback: last.text,
    context: {
      confidence: hypothesis?.confidence,
      category: hypothesis?.category,
      players: state.players.map((p) => p.nickname),
    },
  });

  const aiMessages = state.aiMessages.map((m) =>
    m.id === last.id ? { ...m, text: polished, polished: true } : m,
  );
  return { ...state, aiMessages, version: state.version + 1 };
}

// ─────────────────────────────────────────────────────────────
// Named entry points matching the four AI touchpoints in the design
// doc. Each is a thin wrapper over `narrate()` — same fallback-safe
// contract, same single implementation. The engine always computes
// the deterministic `fallback` first; these only ever rephrase it.
// ─────────────────────────────────────────────────────────────

export async function generateHypothesis(fallback: Localized, context: Record<string, unknown>): Promise<Localized> {
  return narrate({ kind: "hypothesis", evidence: fallback.en, fallback, context });
}

export async function generateTest(fallback: Localized, context: Record<string, unknown>): Promise<Localized> {
  return narrate({ kind: "hypothesis", evidence: fallback.en, fallback, context });
}

export async function explainResult(fallback: Localized, context: Record<string, unknown>): Promise<Localized> {
  return narrate({ kind: "confidence_update", evidence: fallback.en, fallback, context });
}

export async function generateFinalAnalysis(fallback: Localized, context: Record<string, unknown>): Promise<Localized> {
  return narrate({ kind: "final", evidence: fallback.en, fallback, context });
}
