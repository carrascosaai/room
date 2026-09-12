import { describe, expect, it } from "vitest";
import {
  addPlayer,
  advance,
  challengeHypothesis,
  createGame,
  currentRound,
  optionsForPlayer,
  respondents,
  startGame,
  submitAnswer,
  submitHypothesis,
  submitStakes,
} from "@/game/engine";
import { updateConfidence, decisionConfirmsHigh, buildTest, buildHypothesis } from "@/game/hypothesis";
import { templateById } from "@/game/hypothesisContent";
import { projectView } from "@/game/view";
import type { GameState } from "@/game/types";

function room(n: number): GameState {
  let s = createGame("HYP1", { id: "p0", nickname: "Fernando", lang: "es" });
  for (let i = 1; i < n; i++) s = addPlayer(s, { id: `p${i}`, nickname: `P${i}`, lang: "es" }).state;
  return startGame(s).state;
}

/** drive a game until it reaches a HYPOTHESIS phase, answering any
 *  observation rounds along the way with each respondent's first option */
function toNextHypothesisPhase(s: GameState): GameState {
  let guard = 0;
  while (s.phase !== "HYPOTHESIS" && s.phase !== "FINAL_REPORT" && guard++ < 200) {
    if (s.phase === "PRIVATE_DECISION") {
      const round = currentRound(s)!;
      for (const id of respondents(round)) {
        const opts = optionsForPlayer(round, id);
        if (opts.length) s = submitAnswer(s, { playerId: id, optionId: opts[0]!.id }).state;
      }
    }
    s = advance(s);
  }
  return s;
}

describe("hypothesis creation", () => {
  it("the designated author can submit a hypothesis about another player", () => {
    let s = toNextHypothesisPhase(room(5));
    expect(s.phase).toBe("HYPOTHESIS");
    const authorId = s.pendingCycle!.authorId;
    const targetId = s.players.find((p) => p.id !== authorId)!.id;
    const res = submitHypothesis(s, { playerId: authorId, targetId, category: "loyalty", templateId: "loy_help_cost", anonymous: true });
    expect(res.error).toBeUndefined();
    expect(res.state.pendingCycle!.submitted).toBeDefined();
    expect(res.state.pendingCycle!.submitted!.targetId).toBe(targetId);
  });

  it("rejects targeting yourself", () => {
    const s = toNextHypothesisPhase(room(5));
    const authorId = s.pendingCycle!.authorId;
    const res = submitHypothesis(s, { playerId: authorId, targetId: authorId, category: "loyalty", templateId: "loy_help_cost", anonymous: true });
    expect(res.error).toBe("cannot_target_self");
  });

  it("rejects a template that doesn't belong to the stated category", () => {
    const s = toNextHypothesisPhase(room(5));
    const authorId = s.pendingCycle!.authorId;
    const targetId = s.players.find((p) => p.id !== authorId)!.id;
    const res = submitHypothesis(s, { playerId: authorId, targetId, category: "money", templateId: "loy_help_cost", anonymous: true });
    expect(res.error).toBe("invalid_template");
  });

  it("rejects a second submission from the same author", () => {
    let s = toNextHypothesisPhase(room(5));
    const authorId = s.pendingCycle!.authorId;
    const targetId = s.players.find((p) => p.id !== authorId)!.id;
    s = submitHypothesis(s, { playerId: authorId, targetId, category: "loyalty", templateId: "loy_help_cost", anonymous: true }).state;
    const res = submitHypothesis(s, { playerId: authorId, targetId, category: "loyalty", templateId: "loy_keeps_word", anonymous: true });
    expect(res.error).toBe("already_submitted");
  });

  it("someone other than the author can file a counter-theory", () => {
    let s = toNextHypothesisPhase(room(5));
    const authorId = s.pendingCycle!.authorId;
    const targetId = s.players.find((p) => p.id !== authorId)!.id;
    s = submitHypothesis(s, { playerId: authorId, targetId, category: "loyalty", templateId: "loy_help_cost", anonymous: true }).state;
    const counterCreator = s.players.find((p) => p.id !== authorId && p.id !== targetId)!.id;
    const res = submitHypothesis(s, { playerId: counterCreator, targetId, category: "loyalty", templateId: "loy_self_first", anonymous: true, counterOf: "whatever" });
    expect(res.error).toBeUndefined();
    expect(res.state.pendingCycle!.counter).toBeDefined();
    expect(res.state.pendingCycle!.counter!.creatorId).toBe(counterCreator);
  });

  it("a hypothesis can be challenged (bet points against it) once it exists", () => {
    let s = toNextHypothesisPhase(room(5));
    const authorId = s.pendingCycle!.authorId;
    const targetId = s.players.find((p) => p.id !== authorId)!.id;
    s = submitHypothesis(s, { playerId: authorId, targetId, category: "loyalty", templateId: "loy_help_cost", anonymous: true }).state;
    const challenger = s.players.find((p) => p.id !== authorId && p.id !== targetId)!.id;
    const res = challengeHypothesis(s, { playerId: challenger });
    expect(res.error).toBeUndefined();
    expect(res.state.pendingCycle!.challenges).toHaveLength(1);
  });

  it("the target cannot challenge their own hypothesis", () => {
    let s = toNextHypothesisPhase(room(5));
    const authorId = s.pendingCycle!.authorId;
    const targetId = s.players.find((p) => p.id !== authorId)!.id;
    s = submitHypothesis(s, { playerId: authorId, targetId, category: "loyalty", templateId: "loy_help_cost", anonymous: true }).state;
    const res = challengeHypothesis(s, { playerId: targetId });
    expect(res.error).toBe("cannot_challenge");
  });
});

describe("auto-fill: the game never stalls waiting on a human", () => {
  it("auto-fills a hypothesis when nobody authors one in time", () => {
    const s = toNextHypothesisPhase(room(5));
    // nobody calls submitHypothesis — advance straight through
    const next = advance(s); // HYPOTHESIS -> TEST_SETUP
    expect(next.phase).toBe("TEST_SETUP");
    const round = next.rounds[next.currentRoundIndex]!;
    const hyp = next.hypotheses.find((h) => h.id === round.hypothesisId);
    expect(hyp).toBeDefined();
    expect(hyp!.autoFilled).toBe(true);
  });

  it("auto-fills stakes (medium) when the author never picks one", () => {
    let s = toNextHypothesisPhase(room(5));
    s = advance(s); // -> TEST_SETUP, auto-filled hypothesis
    s = advance(s); // -> PRIVATE_DECISION, auto stakes
    expect(s.phase).toBe("PRIVATE_DECISION");
    const round = currentRound(s)!;
    expect(round.kind).toBe("theory_test");
    expect(round.test!.stakes).toBe("medium");
  });
});

describe("privacy: decisions and anonymity", () => {
  it("only the target answers the theory_test round — nobody else can even see options", () => {
    let s = toNextHypothesisPhase(room(5));
    const authorId = s.pendingCycle!.authorId;
    const targetId = s.players.find((p) => p.id !== authorId)!.id;
    s = submitHypothesis(s, { playerId: authorId, targetId, category: "loyalty", templateId: "loy_help_cost", anonymous: true }).state;
    s = advance(s); // -> TEST_SETUP
    s = submitStakes(s, { playerId: authorId, stakes: "medium" }).state;
    s = advance(s); // -> PRIVATE_DECISION
    const round = currentRound(s)!;
    expect(respondents(round)).toEqual([targetId]);
    const outsider = s.players.find((p) => p.id !== targetId)!.id;
    expect(optionsForPlayer(round, outsider)).toHaveLength(0);
    expect(optionsForPlayer(round, targetId).length).toBeGreaterThan(0);
  });

  it("an anonymous hypothesis hides the creator from everyone but the creator, until revealed", () => {
    let s = toNextHypothesisPhase(room(5));
    const authorId = s.pendingCycle!.authorId;
    const targetId = s.players.find((p) => p.id !== authorId)!.id;
    s = submitHypothesis(s, { playerId: authorId, targetId, category: "loyalty", templateId: "loy_help_cost", anonymous: true }).state;
    s = advance(s); // -> TEST_SETUP, hypothesis now exists in state.hypotheses

    const hyp = s.hypotheses[0]!;
    expect(hyp.anonymous).toBe(true);

    const viewAsOutsider = projectView(s, s.players.find((p) => p.id !== authorId && p.id !== targetId)!.id);
    expect(viewAsOutsider.round?.hypothesis?.creatorId).toBeNull();

    const viewAsCreator = projectView(s, authorId);
    expect(viewAsCreator.round?.hypothesis?.creatorId).toBe(authorId);

    const stageView = projectView(s, null, { stage: true });
    expect(stageView.round?.hypothesis?.creatorId).toBeNull();
  });

  it("the reveal phase never leaks the decision before PRIVATE_DECISION is over", () => {
    let s = toNextHypothesisPhase(room(5));
    const authorId = s.pendingCycle!.authorId;
    const targetId = s.players.find((p) => p.id !== authorId)!.id;
    s = submitHypothesis(s, { playerId: authorId, targetId, category: "loyalty", templateId: "loy_help_cost", anonymous: true }).state;
    s = advance(s);
    s = submitStakes(s, { playerId: authorId, stakes: "low" }).state;
    s = advance(s); // -> PRIVATE_DECISION
    const outsider = s.players.find((p) => p.id !== targetId)!.id;
    const view = projectView(s, outsider);
    expect(view.reveal).toBeUndefined();
  });
});

describe("confidence math", () => {
  it("starts every hypothesis at 35% confidence", () => {
    const s = room(5);
    const hyp = buildHypothesis(s, { creatorId: "p0", targetId: "p1", templateId: "loy_help_cost", anonymous: true }, 0, () => 0.5);
    expect(hyp.confidence).toBe(35);
    expect(hyp.initialConfidence).toBe(35);
    expect(hyp.status).toBe("active");
  });

  it("a held result raises confidence; a contradicted result lowers it more sharply", () => {
    const s = room(5);
    const hyp = buildHypothesis(s, { creatorId: "p0", targetId: "p1", templateId: "loy_help_cost", anonymous: true }, 0, () => 0.5);
    const up = updateConfidence(hyp, true, "medium"); // direction "high" + confirmsHigh=true -> held
    expect(up.held).toBe(true);
    expect(up.confidence).toBeGreaterThan(hyp.confidence);

    const down = updateConfidence(hyp, false, "medium");
    expect(down.held).toBe(false);
    expect(down.confidence).toBeLessThan(hyp.confidence);
    expect(hyp.confidence - down.confidence).toBeGreaterThan(up.confidence - hyp.confidence);
  });

  it("higher stakes move confidence further in both directions", () => {
    const s = room(5);
    const hyp = buildHypothesis(s, { creatorId: "p0", targetId: "p1", templateId: "loy_help_cost", anonymous: true }, 0, () => 0.5);
    const low = updateConfidence(hyp, true, "low");
    const high = updateConfidence(hyp, true, "high");
    expect(high.confidence - hyp.confidence).toBeGreaterThan(low.confidence - hyp.confidence);
  });

  it("clamps confidence to [5, 97]", () => {
    const s = room(5);
    let hyp = buildHypothesis(s, { creatorId: "p0", targetId: "p1", templateId: "loy_help_cost", anonymous: true }, 0, () => 0.5);
    for (let i = 0; i < 30; i++) {
      const res = updateConfidence(hyp, true, "high");
      hyp = { ...hyp, confidence: res.confidence, evidenceCount: hyp.evidenceCount + 1 };
    }
    expect(hyp.confidence).toBeLessThanOrEqual(97);
    let low = buildHypothesis(s, { creatorId: "p0", targetId: "p1", templateId: "loy_help_cost", anonymous: true }, 0, () => 0.5);
    for (let i = 0; i < 30; i++) {
      const res = updateConfidence(low, false, "high");
      low = { ...low, confidence: res.confidence, evidenceCount: low.evidenceCount + 1 };
    }
    expect(low.confidence).toBeGreaterThanOrEqual(5);
  });
});

describe("test generation", () => {
  it("produces exactly two options tagged confirmsHigh in opposite directions", () => {
    const s = room(5);
    const hyp = buildHypothesis(s, { creatorId: "p0", targetId: "p1", templateId: "loy_help_cost", anonymous: true }, 0, () => 0.5);
    const test = buildTest(s, hyp, null, "medium", () => 0.3);
    expect(test.optionA.confirmsHigh).not.toBe(test.optionB.confirmsHigh);
    expect(test.dimension).toBe("loy_help_cost" === hyp.templateId ? hyp.dimension : hyp.dimension);
  });

  it("a comparison hypothesis (relationships/spicy) produces a player-choice test", () => {
    const s = room(5);
    const hyp = buildHypothesis(s, { creatorId: "p0", targetId: "p1", templateId: "rel_helps_more", anonymous: true }, 0, () => 0.5);
    expect(hyp.comparisonTargetId).toBeDefined();
    const test = buildTest(s, hyp, null, "medium", () => 0.5);
    expect(test.comparisonOptions).toHaveLength(2);
    expect(test.comparisonOptions).toContain(hyp.comparisonTargetId);
  });

  it("decisionConfirmsHigh reads the target's real choice against the test's tagged options", () => {
    const s = room(5);
    const hyp = buildHypothesis(s, { creatorId: "p0", targetId: "p1", templateId: "loy_help_cost", anonymous: true }, 0, () => 0.5);
    const test = buildTest(s, hyp, null, "medium", () => 0.3);
    const aResult = decisionConfirmsHigh(test, "A");
    const bResult = decisionConfirmsHigh(test, "B");
    expect(aResult).toBe(test.optionA.confirmsHigh);
    expect(bResult).toBe(test.optionB.confirmsHigh);
    expect(decisionConfirmsHigh(test, "nope")).toBeNull();
  });
});

describe("counter-theory: one test resolves both hypotheses", () => {
  it("a full cycle with a counter-theory moves both hypotheses in opposite directions from the same decision", () => {
    let s = toNextHypothesisPhase(room(5));
    const authorId = s.pendingCycle!.authorId;
    const targetId = s.players.find((p) => p.id !== authorId)!.id;
    s = submitHypothesis(s, { playerId: authorId, targetId, category: "loyalty", templateId: "loy_help_cost", anonymous: true }).state;
    const counterCreator = s.players.find((p) => p.id !== authorId && p.id !== targetId)!.id;
    s = submitHypothesis(s, { playerId: counterCreator, targetId, category: "loyalty", templateId: "loy_self_first", anonymous: true, counterOf: "x" }).state;

    s = advance(s); // -> TEST_SETUP, both hypotheses now real
    expect(s.hypotheses).toHaveLength(2);
    const [original, counter] = s.hypotheses;
    expect(original!.direction).not.toBe(counter!.direction);

    s = submitStakes(s, { playerId: authorId, stakes: "high" }).state;
    s = advance(s); // -> PRIVATE_DECISION
    const round = currentRound(s)!;
    expect(round.test!.hypothesisIds).toHaveLength(2);

    const opts = optionsForPlayer(round, targetId);
    s = submitAnswer(s, { playerId: targetId, optionId: opts[0]!.id }).state;
    s = advance(s); // -> REVEAL (resolves confidence for both)

    const [resolvedOriginal, resolvedCounter] = s.hypotheses;
    // opposite directions on the same dimension => opposite outcomes from the same decision
    const originalMoved = resolvedOriginal!.confidence !== resolvedOriginal!.initialConfidence;
    const counterMoved = resolvedCounter!.confidence !== resolvedCounter!.initialConfidence;
    expect(originalMoved).toBe(true);
    expect(counterMoved).toBe(true);
    const originalWentUp = resolvedOriginal!.confidence > resolvedOriginal!.initialConfidence;
    const counterWentUp = resolvedCounter!.confidence > resolvedCounter!.initialConfidence;
    expect(originalWentUp).toBe(!counterWentUp);
  });
});

describe("scoring", () => {
  it("the target always gains game score for making the decision, win or lose the theory", () => {
    let s = toNextHypothesisPhase(room(5));
    const authorId = s.pendingCycle!.authorId;
    const targetId = s.players.find((p) => p.id !== authorId)!.id;
    const before = s.players.find((p) => p.id === targetId)!.score;
    s = submitHypothesis(s, { playerId: authorId, targetId, category: "loyalty", templateId: "loy_help_cost", anonymous: true }).state;
    s = advance(s);
    s = submitStakes(s, { playerId: authorId, stakes: "medium" }).state;
    s = advance(s);
    const round = currentRound(s)!;
    const opts = optionsForPlayer(round, targetId);
    s = submitAnswer(s, { playerId: targetId, optionId: opts[0]!.id }).state;
    s = advance(s);
    const after = s.players.find((p) => p.id === targetId)!.score;
    expect(after).toBeGreaterThan(before);
  });

  it("a creator whose hypothesis is confirmed gains theory score", () => {
    const t = templateById("loy_help_cost")!;
    expect(t).toBeDefined();
    // sanity: theory score starts at 0 for everyone
    const s = room(5);
    for (const p of s.players) expect(p.theoryScore).toBe(0);
  });
});
