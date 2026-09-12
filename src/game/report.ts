import { topReadings } from "./behavior";
import type { GameState, Hypothesis, Localized, Player } from "./types";

// ─────────────────────────────────────────────────────────────
// Deterministic end-of-game report. Every claim traces back to a
// counter in the model — no invented psychology.
// ─────────────────────────────────────────────────────────────

export interface Superlative {
  key: string;
  label: Localized;
  playerId: string | null;
  detail: Localized;
}

export interface FinalReport {
  superlatives: Superlative[];
  biggestTheory: { hypothesisId: string; statement: Localized; confidence: number } | null;
  biggestPlotTwist: { hypothesisId: string; statement: Localized; confidence: number } | null;
  mostControversial: { targetId: string; a: Localized; b: Localized } | null;
  hypothesesTested: number;
  hypothesesConfirmed: number;
  finalAnalysis: Localized;
  gameWinnerId: string | null;
  theoryWinnerId: string | null;
  standings: { playerId: string; score: number; theoryScore: number }[];
}

const L = (en: string, es: string): Localized => ({ en, es });

function nameOf(players: Player[], id: string | null): string {
  if (!id) return "—";
  return players.find((p) => p.id === id)?.nickname ?? "—";
}

function argmax<T>(items: T[], score: (t: T) => number): T | null {
  let best: T | null = null;
  let bestScore = -Infinity;
  for (const it of items) {
    const s = score(it);
    if (s > bestScore) {
      bestScore = s;
      best = it;
    }
  }
  return best;
}

const DIMENSION_LABELS: Record<string, { high: Localized; low: Localized }> = {
  risk: { high: L("risk-hungry", "arriesgado/a"), low: L("cautious", "cauto/a") },
  competitiveness: { high: L("competitive", "competitivo/a"), low: L("relaxed about winning", "relajado/a con ganar") },
  patience: { high: L("patient", "paciente"), low: L("impatient", "impaciente") },
  greed: { high: L("self-serving", "interesado/a"), low: L("generous", "generoso/a") },
  loyalty: { high: L("loyal", "leal"), low: L("a free agent", "un/a agente libre") },
  conformity: { high: L("group-driven", "gregario/a"), low: L("independent", "independiente") },
  contrarianism: { high: L("contrarian", "contrario/a"), low: L("agreeable", "conciliador/a") },
  trust: { high: L("trusting", "confiado/a"), low: L("guarded", "receloso/a") },
  cooperation: { high: L("cooperative", "cooperativo/a"), low: L("solo-minded", "individualista") },
  individualism: { high: L("an individualist", "individualista"), low: L("team-first", "de equipo") },
  impulsivity: { high: L("impulsive", "impulsivo/a"), low: L("deliberate", "reflexivo/a") },
  consistency: { high: L("predictable", "predecible"), low: L("unpredictable", "impredecible") },
  socialAlignment: { high: L("in tune with the room", "en sintonía con la sala"), low: L("out of step with the room", "a contracorriente") },
};

export function buildFinalReport(state: GameState): FinalReport {
  const players = state.players;
  const resolved = state.hypotheses.filter((h) => h.evidenceCount > 0);

  // --- accuracy per creator (Most Accurate) ---
  const accuracyFor = (playerId: string) => {
    const mine = resolved.filter((h) => h.creatorId === playerId);
    const support = mine.reduce((a, h) => a + h.supportingEvidence, 0);
    const contra = mine.reduce((a, h) => a + h.contradictingEvidence, 0);
    const total = support + contra;
    return total > 0 ? support / total : -1;
  };
  const mostAccurate = argmax(players, (p) => accuracyFor(p.id));

  // --- Best Observer: highest theory score ---
  const bestObserver = argmax(players, (p) => p.theoryScore);

  // --- Most Tested: target of the most hypotheses ---
  const testedCount = new Map<string, number>();
  for (const h of state.hypotheses) testedCount.set(h.targetId, (testedCount.get(h.targetId) ?? 0) + 1);
  const mostTested = argmax(players, (p) => testedCount.get(p.id) ?? 0);

  // --- Most Unpredictable: highest behavior variance ---
  const mostUnpredictable = argmax(players, (p) => {
    const prof = state.behavior[p.id];
    if (!prof) return -1;
    return Object.values(prof).reduce((acc, d) => {
      if (d.history.length < 2) return acc;
      const mean = d.history.reduce((a, b) => a + b, 0) / d.history.length;
      const v = d.history.reduce((a, b) => a + (b - mean) ** 2, 0) / d.history.length;
      return acc + Math.sqrt(v);
    }, 0);
  });

  const superlatives: Superlative[] = [
    {
      key: "most_accurate",
      label: L("Most accurate", "Quien acierta más"),
      playerId: mostAccurate && accuracyFor(mostAccurate.id) >= 0 ? mostAccurate.id : null,
      detail: L("Their theories about others held up most often.", "Sus teorías sobre los demás se cumplieron más a menudo."),
    },
    {
      key: "best_observer",
      label: L("Best observer", "Mejor observador/a"),
      playerId: bestObserver && bestObserver.theoryScore > 0 ? bestObserver.id : null,
      detail: L("Read people better than anyone else at the table.", "Leyó a la gente mejor que nadie en la mesa."),
    },
    {
      key: "most_tested",
      label: L("Most tested", "Más puesto/a a prueba"),
      playerId: mostTested && (testedCount.get(mostTested.id) ?? 0) > 0 ? mostTested.id : null,
      detail: L(`Was the subject of ${testedCount.get(mostTested?.id ?? "") ?? 0} theories tonight.`, `Fue objeto de ${testedCount.get(mostTested?.id ?? "") ?? 0} teorías esta noche.`),
    },
    {
      key: "most_unpredictable",
      label: L("Most unpredictable", "Quien más sorprende"),
      playerId: mostUnpredictable?.id ?? null,
      detail: L("Changed patterns more than anyone else.", "Cambió de patrón más que nadie."),
    },
  ];

  // --- Biggest Theory: most evidence / highest confidence ---
  const biggestTheoryH = argmax(resolved, (h) => h.evidenceCount * 100 + h.confidence);
  const biggestTheory = biggestTheoryH
    ? { hypothesisId: biggestTheoryH.id, statement: biggestTheoryH.statement, confidence: biggestTheoryH.confidence }
    : null;

  // --- Biggest Plot Twist: discarded hypothesis that fell the furthest ---
  const twistCandidates = resolved.filter((h) => h.confidence < h.initialConfidence);
  const biggestTwistH = argmax(twistCandidates, (h) => h.initialConfidence - h.confidence + (h.status === "discarded" ? 20 : 0));
  const biggestPlotTwist = biggestTwistH
    ? { hypothesisId: biggestTwistH.id, statement: biggestTwistH.statement, confidence: biggestTwistH.confidence }
    : null;

  // --- Most Controversial: a hypothesis + its counter-theory ---
  const withCounter = state.hypotheses.filter((h) => h.counterOf);
  const controversialCounter = argmax(withCounter, (h) => h.evidenceCount);
  let mostControversial: FinalReport["mostControversial"] = null;
  if (controversialCounter?.counterOf) {
    const original = state.hypotheses.find((h) => h.id === controversialCounter.counterOf);
    if (original) {
      mostControversial = { targetId: original.targetId, a: original.statement, b: controversialCounter.statement };
    }
  }

  // --- final analysis paragraph ---
  const standoutReadings: { player: Player; dim: string; polarity: number }[] = [];
  for (const p of players) {
    const prof = state.behavior[p.id];
    if (!prof) continue;
    const r = topReadings(prof, { minConfidence: 0.5, minEvidence: 3, limit: 1 })[0];
    if (r) standoutReadings.push({ player: p, dim: r.dimension, polarity: r.polarity });
  }
  const standout = argmax(standoutReadings, (r) => Math.abs(r.polarity));
  const gameWinner = argmax(players, (p) => p.score);

  const finalAnalysisParts: { en: string; es: string }[] = [];
  if (standout) {
    const dimLabel = DIMENSION_LABELS[standout.dim];
    const dir = standout.polarity > 0 ? dimLabel?.high : dimLabel?.low;
    if (dir) {
      finalAnalysisParts.push({
        en: `${standout.player.nickname} turned out to be more ${dir.en} than the early rounds suggested.`,
        es: `${standout.player.nickname} resultó ser más ${dir.es} de lo que sugerían las primeras rondas.`,
      });
    }
  }
  if (biggestTheory) {
    finalAnalysisParts.push({
      en: `The strongest theory of the night: "${biggestTheory.statement.en}" — ${biggestTheory.confidence}% confidence by the end.`,
      es: `La teoría más fuerte de la noche: "${biggestTheory.statement.es}" — ${biggestTheory.confidence}% de confianza al final.`,
    });
  }
  if (gameWinner) {
    finalAnalysisParts.push({ en: `${gameWinner.nickname} played the game best.`, es: `${gameWinner.nickname} jugó mejor la partida.` });
  }
  const finalAnalysis: Localized = {
    en: finalAnalysisParts.map((p) => p.en).join(" ") || "This group is harder to read than it looks.",
    es: finalAnalysisParts.map((p) => p.es).join(" ") || "Este grupo es más difícil de leer de lo que parece.",
  };

  const theoryWinner = argmax(players, (p) => p.theoryScore);

  return {
    superlatives,
    biggestTheory,
    biggestPlotTwist,
    mostControversial,
    hypothesesTested: resolved.length,
    hypothesesConfirmed: resolved.filter((h) => h.status === "confirmed").length,
    finalAnalysis,
    gameWinnerId: gameWinner?.id ?? null,
    theoryWinnerId: theoryWinner && theoryWinner.theoryScore > 0 ? theoryWinner.id : null,
    standings: [...players].map((p) => ({ playerId: p.id, score: p.score, theoryScore: p.theoryScore })).sort((a, b) => b.score - a.score),
  };
}

export function nameForReport(state: GameState, id: string | null): string {
  return nameOf(state.players, id);
}

export type { Hypothesis };
