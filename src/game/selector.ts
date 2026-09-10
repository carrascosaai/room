import { QUESTIONS, QUESTIONS_BY_ID } from "./questions";
import { underexploredDimensions } from "./behavior";
import { detectTheories, candidateToTheory, type TheoryCandidate } from "./theories";
import { pairMetrics } from "./group";
import { allCompatibility } from "./compat";
import { mulberry32, hashString, shuffle } from "@/lib/rng";
import type {
  Dimension,
  GameState,
  Localized,
  Player,
  Question,
  QuestionOption,
  Round,
  RoundKind,
  RoundSlot,
  Theory,
} from "./types";

// ─────────────────────────────────────────────────────────────
// The selector turns an abstract "slot" into a concrete Round,
// using what the engine has learned. The LLM is never in this loop.
// ─────────────────────────────────────────────────────────────

export const DEFAULT_PLAN: RoundSlot[] = [
  { type: "warmup", focus: ["risk", "impulsivity"] },
  { type: "compat_probe" }, // early taste read → chemistry
  { type: "group_vote" },
  { type: "individual", focus: ["risk", "greed"] },
  { type: "majority_minority", focus: ["risk", "conformity", "contrarianism"] },
  { type: "observation_slot" },
  { type: "social_dilemma" },
  { type: "accusation_slot" }, // the room points at someone
  { type: "affinity_slot" }, // AFINIDAD DETECTADA
  { type: "theory_slot" }, // announce (social-biased)
  { type: "theory_slot" }, // test (paired)
  { type: "trust" },
  { type: "intervention_slot" },
  { type: "majority_minority", focus: ["conformity", "contrarianism", "risk"] },
  { type: "final_slot" },
];

function rngFor(state: GameState, salt: string): () => number {
  return mulberry32((state.seed ^ hashString(salt)) >>> 0);
}

function timeLimitFor(kind: RoundKind): number {
  switch (kind) {
    case "social_dilemma":
    case "ai_intervention":
    case "ai_theory_test":
      return 25;
    case "prediction":
      return 15;
    case "accusation":
      return 16;
    case "compat_probe":
      return 16;
    default:
      return 20;
  }
}

/** Build the A/B/... options for a player-target round from the roster. */
function playerOptions(players: Player[], exclude: string[]): QuestionOption[] {
  return players
    .filter((p) => !exclude.includes(p.id))
    .map((p) => ({ id: p.id, label: { en: p.nickname, es: p.nickname }, tags: {} }));
}

function scoreQuestion(q: Question, wantDims: Dimension[], rand: () => number): number {
  let s = rand() * 0.25;
  const focus = wantDims.slice(0, 4);
  let focusSignal = 0;
  let totalSignal = 0;
  for (const opt of q.options) {
    for (const k of Object.keys(opt.tags) as Dimension[]) {
      const mag = Math.abs(opt.tags[k] ?? 0);
      totalSignal += mag;
      if (focus.includes(k)) focusSignal += mag;
    }
  }
  // reward strong signal on the dimensions we want, relative to noise
  s += focusSignal * 1.4;
  if (totalSignal > 0) s += (focusSignal / totalSignal) * 0.8;
  return s;
}

function chooseQuestion(
  state: GameState,
  kind: RoundKind,
  focus: Dimension[] | undefined,
  salt: string,
): Question {
  const rand = rngFor(state, "q" + salt);
  const wantDims = focus ?? (underexploredDimensions(Object.values(state.behavior)) as Dimension[]);
  const playerTarget = kind === "group_vote" || kind === "trust" || kind === "accusation";
  const matches = (q: (typeof QUESTIONS)[number]) =>
    q.kinds.includes(kind) && (playerTarget ? q.options.length === 0 : q.options.length >= 2);
  const pool = QUESTIONS.filter((q) => matches(q) && !state.usedQuestionIds.includes(q.id));
  const usable = pool.length > 0 ? pool : QUESTIONS.filter(matches);
  let best = usable[0]!;
  let bestScore = -Infinity;
  for (const q of usable) {
    const sc = scoreQuestion(q, wantDims, rand);
    if (sc > bestScore) {
      bestScore = sc;
      best = q;
    }
  }
  return best;
}

function makeRound(partial: Omit<Round, "createdAt" | "timeLimit"> & { timeLimit?: number }): Round {
  return {
    ...partial,
    timeLimit: partial.timeLimit ?? timeLimitFor(partial.kind),
    createdAt: Date.now(),
  };
}

// ---------- localized text for engine-generated rounds ----------

const L = (en: string, es: string): Localized => ({ en, es });

// ---------- main entry ----------

export interface BuildResult {
  round: Round;
  /** theory mutations to merge into state.theories */
  theoryPatch?: Theory[];
}

export function buildRoundForSlot(state: GameState, slotIndex: number): BuildResult {
  const slot = state.plan[slotIndex] ?? { type: "individual" };
  const index = slotIndex;
  const activePlayers = state.players.filter((p) => p.connected);
  const roster = activePlayers.length >= 3 ? activePlayers : state.players;
  const allIds = roster.map((p) => p.id);
  const idBase = `r${index}`;

  switch (slot.type) {
    case "warmup": {
      const q = chooseQuestion(state, "individual", ["risk", "patience", "impulsivity"], idBase);
      return {
        round: makeRound({
          id: idBase,
          index,
          kind: "individual",
          questionId: q.id,
          participants: allIds,
          timeLimit: 18,
        }),
      };
    }

    case "individual":
    case "majority_minority":
    case "prediction":
    case "compat_probe": {
      const q = chooseQuestion(state, slot.type, slot.focus, idBase);
      return {
        round: makeRound({
          id: idBase,
          index,
          kind: slot.type,
          questionId: q.id,
          participants: allIds,
          title: slot.type === "compat_probe" ? L("Same answer?", "¿La misma respuesta?") : undefined,
        }),
      };
    }

    case "accusation": {
      return { round: buildAccusationRound(state, index, idBase) };
    }

    case "accusation_slot": {
      return { round: buildAccusationRound(state, index, idBase) };
    }

    case "affinity_slot": {
      return buildAffinitySlot(state, index, idBase);
    }

    case "group_vote":
    case "trust": {
      const q = chooseQuestion(state, slot.type, undefined, idBase);
      return {
        round: makeRound({
          id: idBase,
          index,
          kind: slot.type,
          questionId: q.id,
          participants: allIds,
          optionsByPlayer: Object.fromEntries(
            roster.map((p) => [p.id, playerOptions(roster, [p.id])]),
          ),
        }),
      };
    }

    case "social_dilemma": {
      const q = chooseQuestion(state, "social_dilemma", undefined, idBase);
      // pair everyone up; odd one out is auto-paired for a 3-way resolved pairwise
      const rand = rngFor(state, "pair" + idBase);
      const shuffled = shuffle(rand, allIds);
      const pairs: [string, string][] = [];
      for (let i = 0; i + 1 < shuffled.length; i += 2) {
        pairs.push([shuffled[i]!, shuffled[i + 1]!]);
      }
      if (shuffled.length % 2 === 1 && pairs.length > 0) {
        // attach the leftover to the first pair's first member as a mirror match
        pairs.push([shuffled[shuffled.length - 1]!, shuffled[0]!]);
      }
      return {
        round: makeRound({
          id: idBase,
          index,
          kind: "social_dilemma",
          questionId: q.id,
          participants: allIds,
          pairs,
          title: L("Dilemma", "Dilema"),
          body: q.prompt,
        }),
      };
    }

    case "observation_slot": {
      return { round: makeObservationRound(state, index, idBase) };
    }

    case "final_slot": {
      return { round: makeObservationRound(state, index, idBase, true) };
    }

    case "theory_slot": {
      return buildTheorySlot(state, slotIndex, idBase);
    }

    case "intervention_slot": {
      return buildInterventionSlot(state, slotIndex, idBase);
    }

    default: {
      const q = chooseQuestion(state, "individual", undefined, idBase);
      return {
        round: makeRound({
          id: idBase,
          index,
          kind: "individual",
          questionId: q.id,
          participants: allIds,
        }),
      };
    }
  }
}

// ---------- special-round builders ----------

function makeObservationRound(
  state: GameState,
  index: number,
  id: string,
  isFinal = false,
): Round {
  return makeRound({
    id,
    index,
    kind: "ai_observation",
    participants: [],
    timeLimit: 0,
    title: isFinal
      ? L("The pattern I keep coming back to", "El patrón al que sigo volviendo")
      : L("I'm starting to see a pattern", "Estoy empezando a ver un patrón"),
    // body is filled by the engine when it enters the phase (needs the freshest model)
  });
}

function pickTheoryCandidate(state: GameState): TheoryCandidate | null {
  let cands = detectTheories(state.players, state.behavior, state.group);
  // the affinity slot already delivered a compatibility beat — don't repeat it
  const hadCompat = state.theories.some(
    (t) => t.type === "high_compatibility" || t.type === "clashing_values",
  );
  if (hadCompat) cands = cands.filter((c) => c.type !== "high_compatibility" && c.type !== "clashing_values");
  if (cands.length === 0) return null;
  const rand = rngFor(state, "theorypick");
  cands.sort((a, b) => b.salience - a.salience);
  // Salseo bias: unless a non-social theory is much stronger, go social.
  const social = cands.filter((c) => c.social);
  const nonSocial = cands.filter((c) => !c.social);
  const wantSocial = rand() < 0.7;
  if (social.length && (wantSocial || !nonSocial.length)) return social[0]!;
  if (social.length && nonSocial.length && nonSocial[0]!.salience - social[0]!.salience < 0.3) {
    return social[0]!;
  }
  return cands[0]!;
}

function buildTheorySlot(state: GameState, slotIndex: number, id: string): BuildResult {
  const prevSameSlot = state.plan[slotIndex - 1]?.type === "theory_slot";

  if (prevSameSlot) {
    // this is the TEST round; find the announced theory
    const theory = [...state.theories].reverse().find((t) => t.status === "announced" || t.status === "testing");
    if (theory) return buildTheoryTest(state, slotIndex, id, theory);
    // fallback: a normal individual round
    const q = chooseQuestion(state, "individual", undefined, id);
    return {
      round: makeRound({
        id,
        index: slotIndex,
        kind: "individual",
        questionId: q.id,
        participants: state.players.map((p) => p.id),
      }),
    };
  }

  // ANNOUNCE round
  const cand = pickTheoryCandidate(state);
  if (!cand) {
    const q = chooseQuestion(state, "social_dilemma", undefined, id);
    return {
      round: makeRound({
        id,
        index: slotIndex,
        kind: "social_dilemma",
        questionId: q.id,
        participants: state.players.map((p) => p.id),
        body: q.prompt,
      }),
    };
  }
  const theory = candidateToTheory(cand, slotIndex);
  theory.status = "announced";
  return {
    round: makeRound({
      id,
      index: slotIndex,
      kind: "ai_theory",
      participants: [],
      timeLimit: 0,
      theoryId: theory.id,
      title: L("I have a theory", "Tengo una teoría"),
    }),
    theoryPatch: [theory],
  };
}

function nameOf(state: GameState, id: string): string {
  return state.players.find((p) => p.id === id)?.nickname ?? "?";
}

function buildTheoryTest(state: GameState, slotIndex: number, id: string, theory: Theory): BuildResult {
  const [p1, p2] = theory.players;
  const others = state.players.map((p) => p.id).filter((x) => !theory.players.includes(x));

  // selection-style test
  if (["mutual_bond", "one_way_loyalty", "repeated_selection"].includes(theory.type) && p1) {
    const optionsByPlayer: Record<string, QuestionOption[]> = {};
    optionsByPlayer[p1] = state.players
      .filter((p) => p.id !== p1)
      .map((p) => ({ id: p.id, label: { en: p.nickname, es: p.nickname }, tags: {} }));
    for (const o of others) {
      optionsByPlayer[o] = [
        { id: "yes", label: L(`Yes, ${nameOf(state, p1)} picks ${nameOf(state, p2!)}`, `Sí, ${nameOf(state, p1)} elige a ${nameOf(state, p2!)}`), tags: {} },
        { id: "no", label: L("No", "No"), tags: {} },
      ];
    }
    return {
      round: makeRound({
        id,
        index: slotIndex,
        kind: "ai_theory_test",
        participants: [p1],
        predictors: others,
        theoryId: theory.id,
        title: L("Testing the theory", "Poniendo la teoría a prueba"),
        body: L(
          `${nameOf(state, p1)}: choose one player to protect you from losing 200 points.`,
          `${nameOf(state, p1)}: elige a un jugador para que te proteja de perder 200 puntos.`,
        ),
        optionsByPlayer,
        timeLimit: 22,
      }),
    };
  }

  // high_compatibility / clashing_values -> one more taste question, side by side
  if (["high_compatibility", "clashing_values"].includes(theory.type) && p1 && p2) {
    const q = chooseQuestion(state, "compat_probe", undefined, id + "cv");
    const predOpts: QuestionOption[] = [
      { id: "yes", label: L("They'll match again", "Vuelven a coincidir"), tags: {} },
      { id: "no", label: L("Not this time", "Esta vez no"), tags: {} },
    ];
    return {
      round: makeRound({
        id,
        index: slotIndex,
        kind: "ai_theory_test",
        questionId: q.id,
        participants: [p1, p2],
        predictors: others,
        theoryId: theory.id,
        title:
          theory.type === "clashing_values"
            ? L("Opposites", "Polos opuestos")
            : L("Testing the theory", "Poniendo la teoría a prueba"),
        body: L(
          `${nameOf(state, p1)} and ${nameOf(state, p2)}: same question, same time. Everyone else — call it.`,
          `${nameOf(state, p1)} y ${nameOf(state, p2)}: misma pregunta, a la vez. El resto, mojaos.`,
        ),
        optionsByPlayer: Object.fromEntries(others.map((o) => [o, predOpts])),
      }),
    };
  }

  // alliance / rivalry -> break-the-alliance dilemma for the pair, prediction for others
  if (["alliance", "rivalry"].includes(theory.type) && p1 && p2) {
    const dilemma: QuestionOption[] = [
      { id: "A", label: L("Cooperate", "Cooperar"), tags: { cooperation: 0.8, loyalty: 0.4 } },
      { id: "B", label: L("Betray for +500", "Traicionar por +500"), tags: { cooperation: -0.7, greed: 0.6, individualism: 0.6 } },
    ];
    const optionsByPlayer: Record<string, QuestionOption[]> = { [p1]: dilemma, [p2]: dilemma };
    for (const o of others) {
      optionsByPlayer[o] = [
        { id: "A", label: L("Both cooperate", "Ambos cooperan"), tags: {} },
        { id: "B", label: L("At least one betrays", "Al menos uno traiciona"), tags: {} },
      ];
    }
    return {
      round: makeRound({
        id,
        index: slotIndex,
        kind: "ai_theory_test",
        participants: [p1, p2],
        pairs: [[p1, p2]],
        predictors: others,
        theoryId: theory.id,
        title: L("Break the alliance", "Romper la alianza"),
        body: L(
          `${nameOf(state, p1)} & ${nameOf(state, p2)}: +200 each if you both cooperate. Betray and you get +500, they get 0.`,
          `${nameOf(state, p1)} y ${nameOf(state, p2)}: +200 cada uno si ambos cooperáis. Traiciona y ganas +500, el otro 0.`,
        ),
        optionsByPlayer,
      }),
    };
  }

  // conformist / contrarian -> go against the room
  if (["conformist", "contrarian"].includes(theory.type) && p1) {
    const optionsByPlayer: Record<string, QuestionOption[]> = {};
    optionsByPlayer["*"] = [
      { id: "A", label: L("A — with the room", "A — con la sala"), tags: { conformity: 0.6 } },
      { id: "B", label: L("B — higher reward", "B — más recompensa"), tags: { contrarianism: 0.6, risk: 0.3 } },
    ];
    return {
      round: makeRound({
        id,
        index: slotIndex,
        kind: "ai_theory_test",
        participants: state.players.map((p) => p.id),
        theoryId: theory.id,
        title: L("Go against the room", "Contra la sala"),
        body: L(
          `The room is leaning toward A. ${nameOf(state, p1)}: choosing B pays you more.`,
          `La sala se inclina por A. ${nameOf(state, p1)}: elegir B te da más a ti.`,
        ),
        optionsByPlayer,
      }),
    };
  }

  // risk_seeker / risk_averse -> a clean risk gamble
  if (["risk_seeker", "risk_averse"].includes(theory.type) && p1) {
    const q = QUESTIONS_BY_ID["risk_safe_vs_gamble"]!;
    return {
      round: makeRound({
        id,
        index: slotIndex,
        kind: "ai_theory_test",
        participants: [p1],
        questionId: q.id,
        theoryId: theory.id,
        title: L("Testing the theory", "Poniendo la teoría a prueba"),
        body: L(`${nameOf(state, p1)}, one clean choice.`, `${nameOf(state, p1)}, una elección limpia.`),
      }),
    };
  }

  // prediction_link
  if (theory.type === "prediction_link" && p1 && p2) {
    return {
      round: makeRound({
        id,
        index: slotIndex,
        kind: "ai_theory_test",
        participants: [p1, p2],
        theoryId: theory.id,
        title: L("The read", "La lectura"),
        body: L(
          `${nameOf(state, p1)}: predict ${nameOf(state, p2)}'s next choice. ${nameOf(state, p2)}: just choose.`,
          `${nameOf(state, p1)}: predice la elección de ${nameOf(state, p2)}. ${nameOf(state, p2)}: solo elige.`,
        ),
        optionsByPlayer: {
          [p1]: [
            { id: "A", label: L("They pick A / safe", "Elige A / seguro"), tags: {} },
            { id: "B", label: L("They pick B / risky", "Elige B / arriesgado"), tags: {} },
          ],
          [p2]: [
            { id: "A", label: L("A / safe", "A / seguro"), tags: { risk: -0.5 } },
            { id: "B", label: L("B / risky", "B / arriesgado"), tags: { risk: 0.5 } },
          ],
        },
      }),
    };
  }

  // fallback
  const q = chooseQuestion(state, "individual", undefined, id);
  return {
    round: makeRound({
      id,
      index: slotIndex,
      kind: "individual",
      questionId: q.id,
      participants: state.players.map((p) => p.id),
    }),
  };
}

function buildInterventionSlot(state: GameState, slotIndex: number, id: string): BuildResult {
  const ids = state.players.map((p) => p.id);
  const metrics = pairMetrics(state.group, ids);

  // strongest cooperative / bonded pair
  const bonded = [...metrics]
    .filter((m) => m.cooperation >= 1 || m.mutualSelection >= 2 || m.alignmentRatio >= 0.7)
    .sort((a, b) => b.cooperation + b.mutualSelection + b.alignmentRatio - (a.cooperation + a.mutualSelection + a.alignmentRatio))[0];

  if (bonded) {
    const p1 = bonded.a;
    const p2 = bonded.b;
    const others = ids.filter((x) => x !== p1 && x !== p2);
    const dilemma: QuestionOption[] = [
      { id: "A", label: L("Stay loyal (+200 each)", "Seguir leal (+200 cada uno)"), tags: { loyalty: 0.8, cooperation: 0.6 } },
      { id: "B", label: L("Break it (+500 for you)", "Romperla (+500 para ti)"), tags: { loyalty: -0.7, greed: 0.6, competitiveness: 0.5 } },
    ];
    const optionsByPlayer: Record<string, QuestionOption[]> = { [p1]: dilemma, [p2]: dilemma };
    for (const o of others) {
      optionsByPlayer[o] = [
        { id: "A", label: L("They stay loyal", "Se mantienen leales"), tags: {} },
        { id: "B", label: L("One of them breaks it", "Uno la rompe"), tags: {} },
      ];
    }
    return {
      round: makeRound({
        id,
        index: slotIndex,
        kind: "ai_intervention",
        participants: [p1, p2],
        pairs: [[p1, p2]],
        predictors: others,
        title: L("I'm changing the game", "Voy a cambiar el juego"),
        body: L(
          `${nameOf(state, p1)} and ${nameOf(state, p2)} keep ending up on the same side. Let's see what a real incentive does.`,
          `${nameOf(state, p1)} y ${nameOf(state, p2)} acabáis siempre en el mismo lado. Veamos qué hace un incentivo de verdad.`,
        ),
        optionsByPlayer,
      }),
    };
  }

  // otherwise: generic high-stakes split & steal among a random pair, others predict
  const rand = rngFor(state, "intv" + id);
  const shuffled = shuffle(rand, ids);
  const p1 = shuffled[0]!;
  const p2 = shuffled[1] ?? shuffled[0]!;
  const q = QUESTIONS_BY_ID["mix_split_or_steal_final"]!;
  return {
    round: makeRound({
      id,
      index: slotIndex,
      kind: "ai_intervention",
      participants: [p1, p2],
      pairs: [[p1, p2]],
      predictors: ids.filter((x) => x !== p1 && x !== p2),
      questionId: q.id,
      title: L("I'm changing the game", "Voy a cambiar el juego"),
      body: q.prompt,
      optionsByPlayer: {
        [p1]: q.options,
        [p2]: q.options,
        "*": [
          { id: "A", label: L("Both split", "Ambos reparten"), tags: {} },
          { id: "B", label: L("Someone steals", "Alguien roba"), tags: {} },
        ],
      },
    }),
  };
}

// ---------- salseo builders ----------

function buildAccusationRound(state: GameState, slotIndex: number, id: string): Round {
  const roster = state.players.filter((p) => p.connected);
  const list = roster.length >= 3 ? roster : state.players;
  const q = chooseQuestion(state, "accusation", undefined, id);
  return makeRound({
    id,
    index: slotIndex,
    kind: "accusation",
    questionId: q.id,
    participants: list.map((p) => p.id),
    title: L("Point at someone", "Señalad a alguien"),
    body: q.prompt,
    // everyone can point at anyone (including nobody? no — must pick someone else)
    optionsByPlayer: Object.fromEntries(
      list.map((p) => [
        p.id,
        list
          .filter((x) => x.id !== p.id)
          .map((x) => ({ id: x.id, label: { en: x.nickname, es: x.nickname }, tags: {} as Record<string, number> })),
      ]),
    ),
  });
}

function buildAffinitySlot(state: GameState, slotIndex: number, id: string): BuildResult {
  const ids = state.players.map((p) => p.id);
  const compat = allCompatibility(state);
  const top = compat.find((c) => c.grounded) ?? compat[0];

  if (!top || ids.length < 4) {
    // not enough signal — fall back to a compat_probe for everyone
    const q = chooseQuestion(state, "compat_probe", undefined, id);
    return {
      round: makeRound({
        id,
        index: slotIndex,
        kind: "compat_probe",
        questionId: q.id,
        participants: ids,
        title: L("Same answer?", "¿La misma respuesta?"),
      }),
    };
  }

  const [p1, p2] = [top.a, top.b];
  const others = ids.filter((x) => x !== p1 && x !== p2);
  const q = chooseQuestion(state, "compat_probe", undefined, id + "aff");

  // attach a high_compatibility theory so this resolves with a verdict + confidence
  const theory: Theory = {
    id: "t_aff_" + hashString(p1 + p2 + slotIndex).toString(36),
    type: "high_compatibility",
    players: [p1, p2],
    evidenceCount: top.comparable + top.tasteMatches,
    evidence: `${nameOf(state, p1)} and ${nameOf(state, p2)} have matched on ${Math.round(top.alignmentRatio * top.comparable) + top.tasteMatches} of their comparable answers so far.`,
    confidence: Number(Math.min(0.85, 0.4 + top.score * 0.5).toFixed(2)),
    status: "announced",
    createdRound: slotIndex,
    prediction: "the two players will give the same answer again",
  };

  const predOpts = [
    { id: "yes", label: L("They'll match again", "Vuelven a coincidir"), tags: {} as Record<string, number> },
    { id: "no", label: L("Not this time", "Esta vez no"), tags: {} as Record<string, number> },
  ];

  return {
    round: makeRound({
      id,
      index: slotIndex,
      kind: "ai_theory_test",
      questionId: q.id,
      participants: [p1, p2],
      predictors: others,
      theoryId: theory.id,
      title: L("Affinity detected", "Afinidad detectada"),
      body: L(
        `${nameOf(state, p1)} and ${nameOf(state, p2)}: one more question, at the same time. Everyone else — call it.`,
        `${nameOf(state, p1)} y ${nameOf(state, p2)}: una pregunta más, a la vez. El resto, mojaos.`,
      ),
      optionsByPlayer: {
        ...Object.fromEntries(others.map((o) => [o, predOpts])),
      },
    }),
    theoryPatch: [theory],
  };
}
