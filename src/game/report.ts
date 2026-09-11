import { topReadings } from "./behavior";
import { pairMetrics, getEdge } from "./group";
import { allCompatibility, biggestClash, wildcardPlayer } from "./compat";
import { missionText } from "./missions";
import type { GameState, Localized, Player } from "./types";

// ─────────────────────────────────────────────────────────────
// Deterministic end-of-game report. Every claim traces back to a
// counter in the model. No psychology, no relationship claims.
// ─────────────────────────────────────────────────────────────

export interface Superlative {
  key: string;
  label: Localized;
  playerId: string | null;
  detail: Localized;
}

export interface FinalReport {
  superlatives: Superlative[];
  biggestAlliance: { a: string; b: string; detail: Localized } | null;
  biggestBetrayal: { from: string; to: string; detail: Localized } | null;
  mostCompatible: { a: string; b: string; percent: number } | null;
  biggestClash: { a: string; b: string; percent: number } | null;
  wildcardId: string | null;
  salseoMvpId: string | null;
  /** playerId -> the person they clashed with most */
  nemesis: Record<string, string>;
  missions: {
    playerId: string;
    text: Localized;
    completed: boolean;
  }[];
  aiAccuracy: number; // 0..1
  theoriesTested: number;
  theoriesHeld: number;
  timesGroupFooledAi: number;
  surprisingPattern: Localized;
  finalTheory: Localized;
  winnerId: string | null;
  standings: { playerId: string; score: number }[];

  /** director mode only — "what the AI did and why", most recent first */
  directorLog: { round: number; kind: string; targets: string[]; reason: Localized }[];
  /** final reputation snapshot, director mode */
  reputation: { playerId: string; trust: number; suspicion: number; influence: number }[];
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

export function buildFinalReport(state: GameState): FinalReport {
  const players = state.players;
  const ids = players.map((p) => p.id);
  const metrics = pairMetrics(state.group, ids);

  // --- superlatives ---
  const mostCompetitive = argmax(players, (p) => {
    const s = state.behavior[p.id]?.competitiveness;
    return s && s.evidenceCount >= 1 ? s.value * (0.5 + s.confidence) : -1;
  });
  const mostCooperative = argmax(players, (p) => {
    const s = state.behavior[p.id]?.cooperation;
    const coop = metrics
      .filter((m) => m.a === p.id || m.b === p.id)
      .reduce((acc, m) => acc + m.cooperation, 0);
    return (s?.value ?? 0) + coop * 0.15;
  });
  const mostUnpredictable = argmax(players, (p) => {
    const prof = state.behavior[p.id];
    if (!prof) return -1;
    const cons = prof.consistency;
    const spread = Object.values(prof).reduce((acc, d) => {
      if (d.history.length < 2) return acc;
      const mean = d.history.reduce((a, b) => a + b, 0) / d.history.length;
      const v = d.history.reduce((a, b) => a + (b - mean) ** 2, 0) / d.history.length;
      return acc + Math.sqrt(v);
    }, 0);
    return spread - (cons.value - 0.5);
  });
  const mostTrusted = argmax(players, (p) =>
    ids.reduce((acc, other) => acc + (other === p.id ? 0 : getEdge(state.group, other, p.id).selectedCount), 0),
  );
  const trustedVotes = mostTrusted
    ? ids.reduce((acc, other) => acc + getEdge(state.group, other, mostTrusted.id).selectedCount, 0)
    : 0;

  const superlatives: Superlative[] = [
    {
      key: "most_competitive",
      label: L("Most competitive", "Quien más compite"),
      playerId: mostCompetitive?.id ?? null,
      detail: L("Chose the winning move over the fair move most often.", "Eligió la jugada ganadora antes que la justa más veces."),
    },
    {
      key: "most_cooperative",
      label: L("Most cooperative", "Quien más coopera"),
      playerId: mostCooperative?.id ?? null,
      detail: L("Kept choosing the option that helped the group.", "Siguió eligiendo la opción que ayudaba al grupo."),
    },
    {
      key: "most_unpredictable",
      label: L("Most unpredictable", "Quien más sorprende"),
      playerId: mostUnpredictable?.id ?? null,
      detail: L("Changed patterns more than anyone else.", "Cambió de patrón más que nadie."),
    },
    {
      key: "most_trusted",
      label: L("Most trusted", "Quien más confianza genera"),
      playerId: mostTrusted?.id ?? null,
      detail: L(`Received ${trustedVotes} trust picks.`, `Recibió ${trustedVotes} elecciones de confianza.`),
    },
  ];

  // --- alliance ---
  const alliance = argmax(metrics, (m) => m.alignmentRatio * m.comparable + m.cooperation * 2 + m.mutualSelection * 2);
  const biggestAlliance =
    alliance && (alliance.comparable >= 2 || alliance.cooperation >= 1 || alliance.mutualSelection >= 1)
      ? {
          a: alliance.a,
          b: alliance.b,
          detail: L(
            `Aligned on ${Math.round(alliance.alignmentRatio * alliance.comparable)}/${alliance.comparable} comparable rounds.`,
            `Coincidieron en ${Math.round(alliance.alignmentRatio * alliance.comparable)}/${alliance.comparable} rondas comparables.`,
          ),
        }
      : null;

  // --- betrayal ---
  let betrayal: { from: string; to: string; count: number } | null = null;
  for (const from of ids) {
    for (const to of ids) {
      if (from === to) continue;
      const e = getEdge(state.group, from, to);
      if (e.betrayedCount > 0 && (!betrayal || e.betrayedCount > betrayal.count)) {
        betrayal = { from, to, count: e.betrayedCount };
      }
    }
  }
  const biggestBetrayal = betrayal
    ? {
        from: betrayal.from,
        to: betrayal.to,
        detail: L(
          `${nameOf(players, betrayal.from)} broke cooperation with ${nameOf(players, betrayal.to)} ${betrayal.count}×.`,
          `${nameOf(players, betrayal.from)} rompió la cooperación con ${nameOf(players, betrayal.to)} ${betrayal.count} vez/veces.`,
        ),
      }
    : null;

  // --- AI accuracy ---
  const tested = state.theories.filter((t) => t.status === "strengthened" || t.status === "discarded");
  const held = tested.filter((t) => t.status === "strengthened").length;
  let predCorrect = 0;
  let predTotal = 0;
  for (const from of ids) {
    for (const to of ids) {
      if (from === to) continue;
      const e = getEdge(state.group, from, to);
      predCorrect += e.predictedCorrect;
      predTotal += e.predictedTotal;
    }
  }
  const theoryAcc = tested.length > 0 ? held / tested.length : null;
  const predAcc = predTotal > 0 ? predCorrect / predTotal : null;
  const parts = [theoryAcc, predAcc].filter((x): x is number => x !== null);
  const aiAccuracy = parts.length ? parts.reduce((a, b) => a + b, 0) / parts.length : 0.5;

  // --- surprising pattern ---
  let surprising: Localized = L(
    "The group agreed less than it thought it did.",
    "El grupo estuvo de acuerdo menos de lo que creía.",
  );
  const surpriseCandidate = argmax(players, (p) => {
    const prof = state.behavior[p.id];
    if (!prof) return -1;
    const r = topReadings(prof, { minConfidence: 0.5, minEvidence: 3, limit: 1 })[0];
    return r ? Math.abs(r.polarity) * r.confidence : -1;
  });
  if (surpriseCandidate && state.behavior[surpriseCandidate.id]) {
    const r = topReadings(state.behavior[surpriseCandidate.id]!, { minConfidence: 0.5, minEvidence: 3, limit: 1 })[0];
    const dimLabel = r ? DIMENSION_LABELS[r.dimension] : undefined;
    if (r && dimLabel) {
      const dir = r.polarity > 0 ? dimLabel.high : dimLabel.low;
      surprising = L(
        `${surpriseCandidate.nickname} turned out to be more ${dir.en} than the early rounds suggested.`,
        `${surpriseCandidate.nickname} resultó ser más ${dir.es} de lo que sugerían las primeras rondas.`,
      );
    }
  }

  // --- final theory paragraph ---
  const winner = argmax(players, (p) => p.score);
  const allianceNames = biggestAlliance
    ? `${nameOf(players, biggestAlliance.a)} + ${nameOf(players, biggestAlliance.b)}`
    : null;
  const finalTheory: Localized = {
    en: [
      allianceNames
        ? `This room organised itself around ${allianceNames}, who kept landing on the same side.`
        : `This room stayed fluid — no pair held together for long.`,
      biggestBetrayal
        ? `The turning points came from ${nameOf(players, biggestBetrayal.from)}, who was willing to break cooperation when it paid.`
        : `Nobody was willing to fully break cooperation when it counted.`,
      winner ? `${winner.nickname} read that better than anyone.` : "",
    ]
      .filter(Boolean)
      .join(" "),
    es: [
      allianceNames
        ? `Esta sala se organizó alrededor de ${allianceNames}, que acababan siempre en el mismo lado.`
        : `Esta sala se mantuvo fluida: ninguna pareja aguantó unida mucho tiempo.`,
      biggestBetrayal
        ? `Los puntos de inflexión vinieron de ${nameOf(players, biggestBetrayal.from)}, que no dudó en romper la cooperación cuando compensaba.`
        : `Nadie llegó a romper del todo la cooperación en el momento clave.`,
      winner ? `${winner.nickname} lo leyó mejor que nadie.` : "",
    ]
      .filter(Boolean)
      .join(" "),
  };

  // --- salseo: compatibility, clash, wildcard, nemesis, MVP ---
  const compat = allCompatibility(state).filter((c) => c.grounded);
  const topCompat = compat[0] ?? null;
  const clash = biggestClash(state);
  const wc = wildcardPlayer(state);

  const nemesis: Record<string, string> = {};
  for (const p of players) {
    let worst: { id: string; score: number } | null = null;
    for (const m of metrics) {
      if (m.a !== p.id && m.b !== p.id) continue;
      const other = m.a === p.id ? m.b : m.a;
      // "nemesis energy" needs real friction: a betrayal, an accusation, or
      // sustained disagreement — not just a couple of different answers.
      const disagreement = m.comparable >= 4 ? Math.max(0, 0.55 - m.alignmentRatio) : 0;
      const score = m.betrayal * 1 + m.accusationsExchanged * 0.7 + disagreement * 1.5;
      if (!worst || score > worst.score) worst = { id: other, score };
    }
    if (worst && worst.score >= 1) nemesis[p.id] = worst.id;
  }

  // salseo MVP: most betrayals dealt + times accused + swings + being in a social theory
  const salseoMvp = argmax(players, (p) => {
    const dealt = players.reduce((acc, o) => acc + (o.id === p.id ? 0 : getEdge(state.group, p.id, o.id).betrayedCount), 0);
    const accused = players.reduce((acc, o) => acc + (o.id === p.id ? 0 : getEdge(state.group, o.id, p.id).accusedCount), 0);
    const inSocial = state.theories.some(
      (t) => t.players.includes(p.id) && t.status !== "forming" && ["mutual_bond", "one_way_loyalty", "high_compatibility", "clashing_values", "rivalry"].includes(t.type),
    );
    return dealt * 2 + accused * 1.5 + (inSocial ? 2 : 0);
  });

  const missions = state.missions.map((m) => ({
    playerId: m.playerId,
    text: missionText(m, players),
    completed: !!m.completed,
  }));

  return {
    superlatives,
    biggestAlliance,
    biggestBetrayal,
    mostCompatible: topCompat
      ? { a: topCompat.a, b: topCompat.b, percent: Math.round(topCompat.score * 100) }
      : null,
    biggestClash: clash
      ? { a: clash.a, b: clash.b, percent: Math.round((1 - clash.score) * 100) }
      : null,
    wildcardId: wc?.id ?? null,
    salseoMvpId: salseoMvp?.id ?? null,
    nemesis,
    missions,
    aiAccuracy: Number(aiAccuracy.toFixed(2)),
    theoriesTested: tested.length,
    theoriesHeld: held,
    timesGroupFooledAi: tested.length - held,
    surprisingPattern: surprising,
    finalTheory,
    winnerId: winner?.id ?? null,
    standings: [...players]
      .map((p) => ({ playerId: p.id, score: p.score }))
      .sort((a, b) => b.score - a.score),
    directorLog: [...state.directorLog]
      .filter((m) => m.signal !== "warmup")
      .reverse()
      .map((m) => ({ round: m.roundIndex, kind: m.kind, targets: m.targets, reason: m.reason })),
    reputation: players.map((p) => ({
      playerId: p.id,
      trust: p.trust,
      suspicion: p.suspicion,
      influence: p.influence,
    })),
  };
}

const DIMENSION_LABELS: Record<string, { high: Localized; low: Localized }> = {
  risk: { high: L("risk-hungry", "arriesgado"), low: L("cautious", "cauto") },
  competitiveness: { high: L("competitive", "competitivo"), low: L("relaxed about winning", "relajado con ganar") },
  patience: { high: L("patient", "paciente"), low: L("impatient", "impaciente") },
  greed: { high: L("self-serving", "interesado"), low: L("generous", "generoso") },
  loyalty: { high: L("loyal", "leal"), low: L("free-agent", "agente libre") },
  conformity: { high: L("group-driven", "gregario"), low: L("independent", "independiente") },
  contrarianism: { high: L("contrarian", "contrario") , low: L("agreeable", "conciliador") },
  trust: { high: L("trusting", "confiado"), low: L("guarded", "receloso") },
  cooperation: { high: L("cooperative", "cooperativo"), low: L("solo-minded", "individualista") },
  individualism: { high: L("individualist", "individualista"), low: L("team-first", "de equipo") },
  impulsivity: { high: L("impulsive", "impulsivo"), low: L("deliberate", "reflexivo") },
  consistency: { high: L("predictable", "predecible"), low: L("unpredictable", "impredecible") },
  socialAlignment: { high: L("in tune with the room", "en sintonía con la sala"), low: L("out of step with the room", "a contracorriente") },
};
