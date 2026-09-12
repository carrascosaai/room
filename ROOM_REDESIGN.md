# ROOM — Redesign: "You think you know your friends. Test them."

## 1. What exists today

ROOM is a Next.js 15 App Router app, server-authoritative, deployed on Vercel + Supabase.

- **Engine** (`src/game/*`) is pure and deterministic. `engine.ts` is the phase-machine
  reducer; `selector.ts` turns an abstract "slot" into a concrete `Round`; `behavior.ts`
  maintains a 13-dimension EWMA behavior profile per player from tagged question options;
  `group.ts` tracks pairwise relationship edges (selections, cooperation, betrayal,
  alignment, accusations, taste matches); `theories.ts` **already implements almost exactly
  the target loop**: it auto-detects falsifiable patterns (`TheoryCandidate`), turns one into
  an announced `Theory` with `confidence`/`evidence`, schedules a paired test round via
  `selector.ts`, and `resolveTheory()` moves confidence up/down based on whether the test's
  outcome matched the prediction.
- **Two modes**: `classic` (the theory loop above, auto-detected, ~2 theory slots/game) and
  `director` (an AI "director" in `director.ts`/`directorContent.ts` that actively runs 9
  talk-out-loud confrontation mechanics: interrogation, deal, prophecy, movement, throne,
  whisper network, chemistry check, face-off — plus a reputation economy and a
  end-of-game "confession" log).
- **Content**: ~223 hand-written bilingual questions (`questions.ts`) tagged with behavior
  signals, organized by round kind and category.
- **Infra**: room create/join/QR (`server/actions.ts`, `lib/id.ts`), Supabase store with
  optimistic concurrency (`store/supabase.ts`), Supabase Realtime as the primary update path
  with polling as a backoff safety net (`lib/useRoom.ts`), a real i18n system
  (`i18n/index.tsx` + `en.json`/`es.json`, centralized lookup, no scattered `if (lang)`),
  an AI provider abstraction (`ai/provider.ts`) that the game works fully without
  (`ai/narrator.ts` only ever rephrases facts it's handed, never invents state), a headless
  bot simulator (`sim.ts`) with 10 named trait archetypes matching the requested test roster,
  and a full Vitest suite.
- Landing page **already** has the exact "01/02/03 how it works" structure requested.
  `ui.tsx` primitives (Button, Field, TextInput, Screen, TopBar, LanguageToggle) are
  reusable as-is.

## 2. What we keep (almost) untouched

- All infra: room lifecycle, Supabase store, Realtime, i18n system, UI primitives, QR/join,
  analytics abstraction, AI provider abstraction (extended, not replaced), deploy pipeline.
- The **behavior model** (`behavior.ts`, `DIMENSIONS`) — it's exactly the "observation →
  signal" engine the new hypothesis system needs.
- The **group model** (`group.ts`) — pairwise edges are exactly what RELATIONSHIPS/SPICY
  hypotheses need (e.g. "Carlos picks María over Pablo" reads `selectedCount`/`protectedCount`
  on the Carlos→María vs Carlos→Pablo edges).
- **Observation-round kinds**: `individual`, `majority_minority`, `social_dilemma`, `trust`,
  `group_vote` stay as the FASE 1 (OBSERVE) rounds, basically unchanged — this is most of the
  existing ~223-question bank and it stays in play.
- `sim.ts` bot archetypes and the simulation harness.
- The landing page structure and `ui.tsx`.

## 3. What we remove / replace

- **`director` mode entirely**: `director.ts`, `directorContent.ts`, the 9 director round
  kinds (`interrogation`, `deal`, `prophecy`, `movement`, `movement_switch`, `throne`,
  `whisper`, `chemistry`, `faceoff`), the reputation economy (`trust`/`suspicion`/
  `influence`/`spotlightCount` on `Player`), `DirectorState`/`DirectorMove`/`DirectorSignal`,
  and the director's "confession" log. This is the old "AI actively directs the room"
  paradigm the brief explicitly wants replaced.
- **Auto-detected theories** (`theories.ts`'s `detectTheories`): replaced by
  player-authored hypotheses. The confidence math and the "test resolves the prediction"
  shape survive, generalized.
- **`compat_probe`/`accusation`/`prediction`/`revenge` round kinds**: retired as *round
  kinds* (chemistry/room-voting isn't part of the new loop), but their **question content**
  (personal/values prompts) is triaged: reusable prompts get repurposed as `individual`
  observation content; anything meaningless outside the old kind is dropped.
  Nothing is deleted blind — see §9 content triage.
- **Secret missions** (`missions.ts`): dropped. It's a self-contained side-system that
  doesn't serve "test what you think you know about your friends" and the brief is explicit
  about not padding the app with tangential features.
- **`GameMode`**: collapses to a single mode. No mode picker on `/create` anymore — there's
  only one ROOM now.
- **`report.ts`**: rebuilt around the new superlative set (§6).

## 4. New architecture

### Phases (server-authoritative, exact transitions from the brief)

```
LOBBY → ROUND_INTRO → PRIVATE_DECISION → REVEAL
                    ↘ HYPOTHESIS → TEST_SETUP → PRIVATE_DECISION → REVEAL → CONFIDENCE_UPDATE
→ NEXT_ROUND (loops back) → ... → FINAL_REPORT
```

`ROUND_INTRO` is a brief framing beat (kept from today, cheap connective tissue).
`PRIVATE_DECISION` replaces `ANSWERING` (renamed to match the brief's vocabulary).
`CONFIDENCE_UPDATE` only occurs after a hypothesis-test round; plain observation rounds go
straight `REVEAL → NEXT_ROUND`. All transitions are server-decided in `advance()`; the
client only ever posts an answer or a hypothesis and reads the projected view — exactly
today's model, just with new round kinds.

### Round plan

Total ~13 rounds. Rounds 0-2 are always **observation** (FASE 1, no hypothesis allowed —
matches the brief exactly). From round 3 on, each round slot is either:

- **observation** — an ordinary `individual`/`majority_minority`/`social_dilemma`/`trust`/
  `group_vote` round, reusing the existing question bank and `behavior.ts` signal pipeline
  unchanged.
- **hypothesis cycle** (counts as one round slot, itself sub-phases through
  `HYPOTHESIS → TEST_SETUP → PRIVATE_DECISION → REVEAL → CONFIDENCE_UPDATE`) — see §5.

The engine deterministically designates one connected player as this cycle's **author**
(round-robin, preferring whoever has authored the fewest hypotheses so far — mirrors the
existing spotlight-fairness logic from the old director). The author gets a bounded window
(`HYPOTHESIS` phase, ~25s) to pick a target + a hypothesis statement (or a counter-theory
against an existing one). **If they don't act before the deadline, the server falls back to
auto-picking a reasonable hypothesis from the template bank targeting whoever has the most
interesting observation data so far** — this guarantees the phase machine never stalls
waiting on a human, exactly like the existing `shouldAutoAdvance`/timeout pattern used
everywhere else in the engine. Roughly 60% of rounds end up observation, ~30% hypothesis
cycles, matching the brief's "60% decisions / 20% theories / 20% salseo-as-flavor" ratio
(salseo is layered as AI commentary — "3 people have theories about Carlos" — not as
separate rounds).

The last 2 rounds are the finale: a guaranteed hypothesis cycle on whoever has accumulated
the most theories about them (biggest-theory payoff), then `FINAL_REPORT`.

## 5. The hypothesis system

### Data model (`src/game/types.ts`)

```ts
type HypothesisCategory = "loyalty" | "trust" | "money" | "social" | "competition" | "relationships" | "spicy";

interface Hypothesis {
  id: string;
  roomId: string; // = state.code
  creatorId: string;
  targetId: string;
  category: HypothesisCategory;
  dimension: Dimension;          // the behavior dimension this reads
  direction: "high" | "low";     // which polarity the hypothesis claims
  comparisonTargetId?: string;   // RELATIONSHIPS/SPICY: "prefers X over <comparisonTargetId>"
  statement: Localized;          // rendered statement, name-interpolated
  anonymous: boolean;            // default true; creator can choose "reveal later"
  revealed: boolean;             // has the creator's identity been shown yet
  confidence: number;            // 0..100
  initialConfidence: number;
  evidenceCount: number;
  supportingEvidence: number;
  contradictingEvidence: number;
  status: "active" | "confirmed" | "discarded"; // discarded = confidence collapsed, not "wrong forever"
  counterOf?: string;            // id of the hypothesis this one opposes (same target+dimension, opposite direction)
  createdRound: number;
}

interface TheoryTest {
  id: string;
  hypothesisIds: string[];       // 1 (solo) or 2 (hypothesis vs counter-theory)
  targetId: string;
  dimension: Dimension;
  stakes: "low" | "medium" | "high";
  templateId: string;
  scenario: Localized;
  optionA: { label: Localized; confirmsHigh: boolean };
  optionB: { label: Localized; confirmsHigh: boolean };
  decision?: string;              // "A" | "B" once the target answers
  createdRound: number;
}
```

### Confidence formula (`src/game/hypothesis.ts`, new module — replaces `theories.ts`)

Starts at **35** on creation (matches the brief's worked example). On resolution:

```
stakesFactor = { low: 0.6, medium: 1.0, high: 1.5 }[stakes]
evidenceFactor = 1 / (1 + evidenceCount * 0.15)      // diminishing returns
if held:      delta = +12 * stakesFactor * max(0.4, evidenceFactor)
if contradicted: delta = -18 * stakesFactor * (1 + (1 - evidenceFactor) * 0.5)  // bigger hit if it was already strong
confidence = clamp(confidence + delta, 5, 97)
```

This reproduces the brief's qualitative examples (fast early moves, diminishing
confirmations, sharp drops on contradiction) with a single deterministic, testable formula.

### Counter-theories, for free

A test's two options are tagged `confirmsHigh: boolean` on the **dimension**, not on a
specific hypothesis. So when Fernando's "Carlos prioritizes money" (dimension=loyalty,
direction=low) and María's counter "Carlos is loyal when he trusts someone"
(dimension=loyalty, direction=high) both exist on the same target+dimension, **the same
test round resolves both at once** — Carlos's single decision moves Fernando's confidence
one way and María's the other. No special-casing needed; this falls directly out of the
option-tagging shape, and matches the brief's "TWO THEORIES. ONE TEST." example exactly.

### Test templates (`src/game/testContent.ts`, new — replaces `directorContent.ts`)

A curated bank (~40 templates, §9) keyed by `dimension`, parameterized by target name and
stakes-scaled point values (low/medium/high stakes just scale the numbers, chosen
deterministically per-game via the existing `rngFor` seeded RNG, avoiding repeats via the
same `usedQuestionIds`-style tracking already used for the question bank). The author picks
**stakes** only — never the scenario itself — so they can't rig a guaranteed result, per
the brief's constraint.

RELATIONSHIPS/SPICY hypotheses use a distinct comparison-test shape: the target is forced
to pick between two named players (reusing the existing `playerOptions()` helper from
`selector.ts`); `held` = whether the pick matches `comparisonTargetId`.

### Anonymity & privacy (`src/game/view.ts`)

- `creatorId` is stripped from any hypothesis a viewer isn't the creator of, unless
  `revealed`. The stage/no-viewer projection never includes it either.
- Counter-theories filed against an *unrevealed* hypothesis are shown to the room as
  "someone thinks the opposite" without naming who, until reveal.
- The target's private decision options are never sent to other players until `REVEAL`.
  Server-authoritative exactly like today's `submitAnswer` model — nothing new to build here,
  the existing `optionsByPlayer`/`respondents()` privacy boundary already enforces this.

### Challenge (bet points against a theory)

Implemented as a lightweight action (`challengeHypothesis`) available during the brief
window after a `HYPOTHESIS` is announced and before its `TEST_SETUP` locks in: a challenger
stakes a small fixed amount of their own points that the test will **not** hold. Resolved
alongside the hypothesis at `CONFIDENCE_UPDATE`. Kept intentionally simple — internal points
only, no separate betting subsystem, per the brief's explicit "no convertir en betting app."

## 6. AI architecture

`src/ai/provider.ts` keeps its existing shape (`AiProvider.complete()`, `NullProvider`
fallback, OpenAI-compatible `complete()`). `src/ai/narrator.ts` gains four purpose-built
entry points, **all backed by a deterministic fallback that renders the full result without
ever calling the LLM**:

```ts
generateHypothesis(ctx)   // picks/phrases a hypothesis statement — falls back to template bank
generateTest(ctx)         // varies a test template's flavor text — falls back to the template as-is
explainResult(ctx)        // "This decision supports/contradicts the theory" — falls back to deterministic copy
generateFinalAnalysis(ctx)// the closing "What ROOM learned" paragraph — falls back to report.ts's own text
```

The LLM is **never** the source of truth for confidence, evidence, or state — it only
rephrases what `hypothesis.ts` already computed, exactly like today's `narrate()`/
`polishLatestAiMessage()` pattern (kept, generalized to the four new kinds). No LLM call
happens on every player answer — only at the handful of moments listed above, gated behind
the same `AI_POLISH_KINDS`-style phase check and the never-re-polish `polished` flag already
in place. Game is fully playable with zero API key.

The "🧠 I HAVE A THEORY" beat is the `HYPOTHESIS` phase's framing message when the *engine*
auto-fills (author didn't act in time) or on the finale's guaranteed cycle — it's rare by
construction, not spammed every round.

## 7. Scoring

`Player` gains a second counter, `theoryScore`, alongside the existing `score` (renamed
conceptually to "Game Score" in the UI):

- **Game Score**: participation + observation-round outcomes (unchanged math from today's
  `scoring.ts`).
- **Theory Score**: `+`points per hypothesis that resolves `confirmed` (crossed a
  confidence threshold, e.g. ≥75), scaled by how contested it was (a hypothesis that beat a
  live counter-theory is worth more); small consolation for a good-faith hypothesis that
  still moved confidence in the right direction without confirming.

Final report shows both, so "Carlos won the game" and "María understood people best" can
both be true.

## 8. Implementation plan (order)

1. `types.ts` — new phase list, `Hypothesis`/`TheoryTest`/`HypothesisCategory`, trimmed
   `RoundKind`, `Player.theoryScore`, drop director-mode + mission types.
2. `hypothesisContent.ts` + `testContent.ts` — the template banks (§9).
3. `hypothesis.ts` — confidence math, candidate template lookup, resolution.
4. `questions.ts` — triage (§9): keep/repurpose observation content, drop the rest.
5. `selector.ts` — new round-plan builder (observation vs. hypothesis-cycle), author
   rotation, auto-fill fallback.
6. `engine.ts` — new phase machine, `submitHypothesis`/`submitCounterTheory`/
   `challengeHypothesis` reducers, drop director/mission code paths.
7. `view.ts` — privacy projection for the new fields.
8. `report.ts` — new superlatives (§9 wording).
9. `ai/narrator.ts` — the four new entry points.
10. `server/actions.ts` + new API routes for hypothesis/counter-theory/challenge.
11. UI: `screens.tsx` (new phase screens), `stage/[code]/page.tsx`, `create/page.tsx`
    (drop mode picker), landing/i18n copy.
12. `sim.ts` — bots pass on authoring by default (engine auto-fills), keeping the simulator
    simple and deterministic.
13. Tests: hypothesis lifecycle, confidence math, counter-theory resolution, privacy,
    scoring, report, i18n parity, simulation.
14. `lint`, `typecheck`, `test`, `build`; fix; verify in browser; deploy.

## 9. Content plan

- **Observation rounds**: keep `individual`/`majority_minority`/`social_dilemma`/`trust`/
  `group_vote` questions from the existing bank as-is (well over the 50 required). Drop
  `compat_probe`/`accusation`/`prediction`/`revenge`-only entries that have no life outside
  those retired kinds; anything with reusable prompt text gets re-tagged as `individual`.
- **Hypothesis templates**: ≥50 across the 7 categories (loyalty/trust/money/social/
  competition/relationships/spicy), each with `en`+`es`, dimension + direction tagged.
  Spicy ones stay behavior-only (no claims about orientation, real relationships, or
  infidelity — framed as in-game preference, per the brief).
- **Test templates**: ≥40 across the 13 dimensions, each producing exactly 2 options with
  `confirmsHigh` tagged, stakes-scalable.
- **Counter-theory seed situations**: ≥20 dimension pairs pre-checked to produce a
  genuinely discriminating test (both directions have a real behavioral cost).

## 10. Explicitly deferred (not needed for a great 5-friends/20-minute session)

- Rich free-text hypothesis authoring (curated templates only, per the brief).
- A separate points-betting economy for challenges (kept as a small fixed stake).
- Cross-session identity, rematch history, global leaderboards (brief's own "NO HACER" list).
