# ROOM

**You think you know your friends. Test them. — Crees que conoces a tus amigos. Ponlos a prueba.**

A multiplayer party game for **3–10 friends in the same room**. Everyone joins
from their phone with a code or QR, but the game is played **out loud**:
someone forms a theory about a friend ("Carlos always picks money over
loyalty"), ROOM designs a real situation to test it, the target decides in
private, and the room finds out — together — whether the theory held up.
~15–25 minutes. No app, no account, no login, free, replayable immediately.

> ROOM is not a quiz, not "Most Likely To," not a prediction market, and not a
> chatbot asking questions. It's a **theory-testing engine**: players make
> falsifiable claims about each other, the engine builds a scenario designed
> to discriminate whether the claim is true, and confidence updates from real
> decisions — never from a vote, never from an LLM's opinion.

---

## 1. The core loop

```
OBSERVE  →  THEORIZE  →  TEST  →  DECIDE  →  REVEAL  →  CONFIDENCE UPDATE
```

- **Observe.** Early rounds are simple situations — votes, dilemmas, trust
  calls — that give everyone something real to notice about each other.
- **Theorize.** A rotating author picks a target and a hypothesis from
  curated categories: **loyalty, trust, money, social, competition,
  relationships**, and an optional 18+ **spicy** category (about in-game
  behavior only — never real orientation, relationships, or infidelity).
  The hypothesis is anonymous by default; the creator can be revealed later.
- **Test.** ROOM builds a scenario tied to the hypothesis's dimension, with
  the author only choosing the **stakes** (low/medium/high) — never the exact
  scenario, so nobody can rig their own theory.
- **Decide.** Only the target sees the test, and only they answer. Nobody
  else — not even the shared screen — sees the decision before reveal.
- **Reveal & update.** The decision is shown, then the theory's confidence
  moves — up if it held, down (harder) if it didn't. Never binary, never an
  instant 100%: confidence is cumulative evidence, with diminishing returns
  on repeated confirmation and a sharper penalty for contradiction.
- **Counter-theories.** Anyone can propose the *opposite* claim about the
  same person and dimension. One test then resolves **both** theories at
  once, in opposite directions, from a single decision.
- **Challenges.** Anyone can stake a modest amount of points betting a theory
  will **not** hold — a light side-bet, never a full economy.

Two separate scores are kept: **Game Score** (from decisions and outcomes)
and **Theory Score** (how accurate a player's theories about others turn out
to be) — so "Carlos won the game" and "María understood people best" can both
be true.

---

## 2. What was built

| Area | Status |
| --- | --- |
| Player-authored hypotheses (7 categories, anonymous by default, revealable) | ✅ |
| Server-built tests tied to the hypothesis's dimension (author picks stakes only) | ✅ |
| Confidence system — evidence-weighted, diminishing returns, clamped 5–97% | ✅ |
| Counter-theories — one test resolves two opposing theories at once | ✅ |
| Theory challenges — a light side-bet that a theory won't hold | ✅ |
| Rotating authorship + hard auto-fill fallback (the game never stalls) | ✅ |
| Dual scoring — Game Score and Theory Score, tracked and shown separately | ✅ |
| Server-authoritative phase machine, no client-side phase skipping | ✅ |
| Privacy projection — anonymous creators, private decisions, per-viewer visibility | ✅ |
| Final report — Most Accurate, Best Observer, Most Tested, Most Unpredictable, Biggest Theory, Biggest Plot Twist, Most Controversial, data-grounded final analysis | ✅ |
| 223 bilingual observation situations across 5 kinds (individual/group/trust/dilemma) | ✅ |
| 56 hypothesis templates across 7 categories, 40 test templates across 13 dimensions | ✅ |
| Deterministic 13-dimension behavior model + pairwise relationship model (unchanged core) | ✅ |
| AI layer — phrasing/commentary only, never decides outcomes; full deterministic fallback | ✅ |
| Realtime multiplayer — polling (always) + Supabase Realtime (when configured) | ✅ |
| Disconnect / refresh / host-transfer / late-join handling | ✅ |
| Full i18n (`es` / `en`), switchable any time, per-player in mixed-language rooms | ✅ |
| Landing page explaining the concept in three steps | ✅ |
| Analytics abstraction (anonymous, disable-able) | ✅ |
| Supabase migrations + RLS | ✅ |
| 68 unit/integration tests + headless bot simulation (`npm run simulate`) | ✅ |

**Explicitly not added:** chat, profiles, followers, monetization, ads,
achievements, global ranking, accounts, native app. This is one good game,
not a platform.

---

## 3. Architecture

```
src/game/
  types.ts             Hypothesis, TheoryTest, Round, GameState, Player
  hypothesisContent.ts  56 hypothesis templates (7 categories, ES/EN)
  testContent.ts        40 test templates (13 dimensions) + comparison tests
  hypothesis.ts         author/target selection, confidence formula, test building
  behavior.ts           13-dimension deterministic behavior model (unchanged)
  group.ts              pairwise relationship tracking (unchanged)
  selector.ts           picks each round's kind (warmup → mixed observation/theory)
  engine.ts             server-authoritative state machine, all phase transitions
  view.ts               per-viewer privacy projection (anonymity, private decisions)
  report.ts             final report — superlatives, biggest theory, plot twist
  commentary.ts         deterministic bilingual text for every AI moment
  sim.ts                headless bot simulation for behavioral validation
ai/
  provider.ts           OpenAI-compatible provider abstraction (or null)
  narrator.ts           generateHypothesis / generateTest / explainResult /
                         generateFinalAnalysis — thin wrappers, deterministic fallback
```

### Phase machine

```
LOBBY → ROUND_INTRO → PRIVATE_DECISION → REVEAL [→ CONFIDENCE_UPDATE]      (observation round)
LOBBY → ROUND_INTRO → HYPOTHESIS → TEST_SETUP → PRIVATE_DECISION → REVEAL → CONFIDENCE_UPDATE   (theory round)
                                                                             ↓
                                                                        NEXT_ROUND / FINAL_REPORT
```

Every transition is decided server-side in `engine.ts`. The client can never
skip a phase, see another player's private decision early, or learn an
anonymous hypothesis's creator unless the server's projection (`view.ts`)
allows it for that specific viewer.

### The confidence formula

Starts at **35%**. Each resolved test moves it by:

- held: `+12 × stakesFactor × max(0.4, evidenceFactor)`
- contradicted: `−18 × stakesFactor × (1 + (1 − evidenceFactor) × 0.5)`

where `stakesFactor` is 0.6/1.0/1.5 for low/medium/high stakes and
`evidenceFactor = 1 / (1 + evidenceCount × 0.15)` — so early evidence moves
confidence fast, and it gets sticky (but never frozen) as evidence piles up.
Confidence is clamped to `[5, 97]`; a theory is **confirmed** at ≥75%,
**discarded** at ≤15%.

### Counter-theories, mechanically

A test's two options are tagged with `confirmsHigh: boolean` on the
**dimension**, not on any one hypothesis. So a hypothesis (`direction:
"high"`) and its counter-theory (`direction: "low"`) on the same dimension
both resolve from the exact same decision, moving in opposite directions —
no special-case branching needed.

### AI's job (and non-job)

The AI never decides who's right, never invents a theory's truth value, and
is never called per-answer. Its only jobs: phrase a hypothesis naturally,
vary a scenario's wording, explain a result in plain language, and write the
end-of-game analysis — all from facts the deterministic engine already
computed. The game is **fully playable with zero API key** (deterministic
fallback text for every AI moment).

### Try it

```bash
npx tsx scripts/ejemplo.ts     # narrated example game, in Spanish
npm run simulate               # 10 named bots, 100+ games, behavioral separation metrics
```

---

## 4. Run it locally

```bash
npm install
cp .env.example .env.local   # optional — the game runs with NOTHING set
npm run dev
```

Open `http://localhost:3000`. To play with friends on the same Wi-Fi, run:

```bash
npm run dev -- -H 0.0.0.0
```

and have them open `http://<your-lan-ip>:3000`.

**With zero environment variables** ROOM uses an in-process memory store and
the deterministic AI voice — perfect for local/LAN play and demos. (Not
suitable for a multi-instance serverless deploy — see §6.)

Scripts:

```bash
npm run dev              # dev server
npm run build             # production build
npm run typecheck         # tsc --noEmit
npm run lint              # eslint
npm test                  # vitest (68 tests)
npm run simulate           # headless: 10 bots, 100+ games, behavioral metrics
npx tsx scripts/ejemplo.ts # narrated example game (Spanish)
bash scripts/e2e.sh        # HTTP end-to-end playthrough (needs dev server on :3111)
```

---

## 5. Environment variables

Everything is optional. See `.env.example`.

| Variable | Purpose | If unset |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | memory store |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key (client, Realtime + room reads) | polling only |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role (server writes) | memory store |
| `OPENAI_API_KEY` | Any OpenAI-compatible key for AI phrasing | deterministic AI voice |
| `OPENAI_MODEL` | model id (default `gpt-4o-mini`) | — |
| `OPENAI_BASE_URL` | override endpoint (Groq, local, …) | `https://api.openai.com/v1` |
| `NEXT_PUBLIC_BASE_URL` | public origin for QR / share links | `http://localhost:3000` |
| `NEXT_PUBLIC_ANALYTICS_ENABLED` | `0` disables analytics entirely | enabled |

The redesign introduces **no new external services** — same env vars as
before.

---

## 6. Supabase setup

Needed only for production / serverless (Vercel), where lambdas don't share
memory.

1. Create a project at [supabase.com](https://supabase.com).
2. Run the migrations, in order: paste `supabase/migrations/0001_init.sql`
   then `supabase/migrations/0002_schedule_cleanup.sql` into the Supabase SQL
   editor, **or** with the CLI:
   ```bash
   supabase link --project-ref <ref>
   supabase db push
   ```
3. Copy **Project URL**, **anon key**, **service_role key** into your env.
4. `0001_init.sql`:
   - creates `rooms` (live `jsonb` state + `version` for optimistic
     concurrency), `game_events` (analytics), `game_archives` (finished-game
     snapshots);
   - enables **RLS**: anon can only `SELECT rooms` (for Realtime); all
     writes are server-only via the service role;
   - adds `rooms` to the `supabase_realtime` publication with `replica
     identity full`.
5. `0002_schedule_cleanup.sql` schedules `purge_stale_rooms()` via `pg_cron`
   to run every 30 minutes, so abandoned rooms don't sit in the table
   forever at scale.

**Schema note.** A ROOM game is a small, self-consistent object the engine
rewrites atomically each transition, so it's stored as one versioned `jsonb`
document rather than a normalized per-entity schema. The TypeScript types in
`src/game/types.ts` are the schema of record; `game_archives` denormalizes
finished games for analysis.

### Deploy to Vercel

1. Import the repo in Vercel (framework auto-detected).
2. Add the env vars from §5 (at minimum the three Supabase keys for real
   multiplayer).
3. Deploy. `vercel.json` bumps `maxDuration` on the poll/advance routes.

---

## 7. How the bilingual system works

- `src/i18n/en.json` / `src/i18n/es.json` — every UI string, identical key
  trees (enforced by `tests/i18n.test.ts`, including interpolation
  placeholders).
- `src/i18n/index.tsx` — `I18nProvider` + `useI18n()` giving `t(key, params)`
  and `loc(localized)`. Language is remembered in `localStorage`, defaults
  from `navigator.language`, switchable anywhere via the `ES / EN` toggle.
- **All content is bilingual data**: every observation situation, hypothesis
  template, and test scenario is `{ en, es }`, written naturally rather than
  machine-translated.
- **AI text is bilingual too**: deterministic commentary produces both
  languages; when the LLM is enabled it's asked for `{ "en": …, "es": … }` in
  one call — so **mixed-language rooms work**, each player's client renders
  their own language regardless of what language generated the content.

---

## 8. Optional / future work

Core gameplay is complete and playable end-to-end. Deferred:

- **Normalized Supabase schema** with per-answer rows (current design uses
  one versioned `jsonb` doc — deliberate for a 15–25 min ephemeral game).
- Free-text hypothesis authoring (currently curated templates only, by
  design — keeps content quality and translation consistent).
- Persisted cross-session player identity / rematch with memory of past
  games.
- Rendered OG image per result (currently a static branded `og.svg`).
- More AI-provider adapters (Anthropic, local) — the abstraction is ready.

---

## Project layout

```
src/
  app/                 Next.js App Router — pages + /api route handlers
                       room/[code]  the player's phone view
                       stage/[code] the shared screen
  game/                deterministic engine — types, questions, behavior, group,
                       hypothesis, hypothesisContent, testContent, selector,
                       engine, view, report, commentary, sim
  ai/                  provider abstraction + narrator (language layer only)
  store/               RoomStore: memory (default) | supabase
  server/              server actions + thin HTTP helpers
  i18n/                en.json / es.json / provider
  components/          UI + room screens (Lobby, HypothesisScreen, TestSetupScreen,
                       RevealScreen, ConfidenceUpdateScreen, Results)
  lib/                 rng, ids, player identity, analytics, useRoom / useStage hooks
supabase/migrations/   0001_init.sql, 0002_schedule_cleanup.sql
tests/                 vitest — engine, hypothesis, narrator, simulation, behavior, i18n
scripts/               simulate.ts, ejemplo.ts, e2e.sh
```
