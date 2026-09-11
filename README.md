# ROOM

**The AI is watching your room. — La IA está observando vuestra sala.**

A multiplayer party game for **3–10 friends in the same room**, run by an
**AI director**. Everyone joins from their phone with a code or QR — but the
phone is a spy tool, not a buzzer. The game happens **out loud**: the AI puts
someone in the hot seat and makes them defend themselves, hands two players a
secret deal, calls its shot on who's about to betray whom — in front of
everyone — and ends by **showing you its whole manipulation log**: what it
did to your group, and why. ~15–20 minutes. No app, no account, no login, free.

> ROOM is **not** "ChatGPT asks your friends questions." The AI is a **live
> social director** running on a **deterministic game engine** — every move it
> makes is scored from real behavioral data, never invented, and it admits it
> when it's wrong.

Two modes, picked at room creation:
- **EN DIRECTO (director, default)** — interrogations, secret deals,
  prophecies announced out loud, everyone on their feet. Built for a room full
  of people talking to each other, with an optional shared screen.
- **Clásico** — the quieter, phone-only round system (the original MVP):
  individual decisions, votes, dilemmas, theories. Good for remote/quiet groups.

---

## 1. What was built

| Area | Status |
| --- | --- |
| **AI director mode** — interrogations, secret deals, prophecies, physical "everyone move" rounds | ✅ |
| **The throne** — a challengeable seat of power that doubles the holder's points | ✅ |
| **The whisper network** — a secret mole, private intel, public accusation | ✅ |
| **Movement re-vote ("last call")** — a talk-it-out follow-up after a real split | ✅ |
| **Chemistry check** — the AI's most-compatible pair tested live, the room bets on the match | ✅ |
| **Face-off** — two clashing players head-to-head, the room votes who wins | ✅ |
| Talk phases (`DISCUSSION`) — a timed, out-loud window before every director round | ✅ |
| Reputation economy (trust / suspicion / influence) that the director manipulates | ✅ |
| Shared "stage" screen (`/stage/CODE`) — cast it, no player identity needed | ✅ |
| End-of-game **AI confession** — the director's full move log with reasons | ✅ |
| LLM polish across every AI moment (not just classic mode), with a never-re-polish cost guard | ✅ |
| Classic mode preserved as a selectable, fully working alternative | ✅ |
| Landing page (ES/EN), create/join flow (mode picker), QR join | ✅ |
| Server-authoritative game state machine (`LOBBY → … → FINAL_RESULTS`) | ✅ |
| Realtime multiplayer — polling (always) + Supabase Realtime (when configured) | ✅ |
| Disconnect / refresh / host-transfer / late-join handling | ✅ |
| ~220-question curated bilingual bank with hidden behavioral metadata | ✅ |
| Deterministic behavior model (13 dimensions, value/confidence/evidence/trend) | ✅ |
| Group model (alliances, reciprocal trust, betrayals, alignment, predictions) | ✅ |
| Theory engine — forms falsifiable theories, schedules a test, resolves it | ✅ |
| AI moments — observation, **"I HAVE A THEORY"**, intervention, "I WAS WRONG" | ✅ |
| Salseo — compatibility ("AFFINITY DETECTED"), clashing values, wildcard | ✅ |
| Secret missions — 1–2 players get a private, checkable objective | ✅ |
| Accusation rounds — "who here is the most ___?", room points, reveal | ✅ |
| Dynamic round selection driven by the model (not random) | ✅ |
| Server-side scoring | ✅ |
| Final results + shareable card + Web Share API + viral loop | ✅ |
| Full i18n (`es` / `en`), switchable any time, per-player in mixed-language rooms | ✅ |
| AI provider abstraction (OpenAI-compatible) + deterministic fallback | ✅ |
| Analytics abstraction (anonymous, disable-able) | ✅ |
| Supabase migrations + RLS | ✅ |
| 76 unit/integration tests + headless simulation (`npm run simulate`) | ✅ |

**Priority order followed:** multiplayer → fast gameplay → great first minute →
behavioral learning → AI interventions → theory/salseo → results → shareability →
polish.

---

## The AI director — how "EN DIRECTO" mode works

Classic mode's rounds all resolve on the phone. Director mode moves the game
**into the room**: the phone becomes a tool for secret information and private
votes; the actual game is people talking to, judging, and reading each other.

```
src/game/director.ts        the director's brain — reads signals, picks a move
src/game/directorContent.ts bilingual content for each mechanic
src/game/engine.ts           DISCUSSION phase + reveal logic for each mechanic
src/app/stage/[code]/        the shared screen
```

### The nine mechanics

- **🔥 Interrogation** — the director names a target from real behavioral data
  ("the room thinks you'd burn everyone here to win") and gives them 45 seconds
  to defend themselves **out loud**. Everyone else privately rates 1–5; the
  average verdict pays or costs the target real points and moves their
  reputation.
- **🤝 The deal** — two players get a private message with a secret task
  ("both of you must secretly pick the same option — without making it
  obvious") and a points reward if they pull it off uncaught. Everyone else
  then points at who they think had a deal; get it right and you score, get it
  wrong and the dealmakers walk away with the reward.
- **🔮 The prophecy** — the director picks a player and a prediction from their
  data, and announces it **to the whole room** before they choose
  ("I predict Ana keeps the safe 200 — she plays it safe when it counts").
  The subject can prove it right (small reward, more "readable") or defy it in
  front of everyone (bigger reward, "I was wrong. Fine.").
- **🧍 On your feet** — a statement is read out; everyone physically stands and
  moves to a side (the phone tap just records where they moved). Whoever
  stands **alone** is flagged and rewarded for it. Used both mid-game (to
  break up a room that's agreeing on everything) and as the finale.
- **↔️ Last call (movement re-vote)** — whenever "on your feet" produced a real
  split (both sides got at least one vote), the director can immediately run a
  follow-up round on the same statement: 20 more seconds to talk each other
  into switching sides, then a second tap. Anyone who switches gets a small
  bonus (and a hit to influence — "got talked into it"); whoever's still alone
  after the second call gets a bigger one. Modeled as a normal round linked to
  the movement round via `followsRoundId`, so it reuses the existing
  `DISCUSSION → ANSWERING` machine unchanged.
- **👑 The throne** — a seat of real power. Empty at first: whoever gets the
  plurality of votes claims it and **doubles every point they score** on every
  other round while they hold it. Once held, the round becomes a public
  challenge — the incumbent keeps it on a tie ("ties go to the incumbent"),
  someone has to strictly out-poll them to take it. Who holds it is public
  (crown badge on the phone UI and the shared screen); losing it spikes the
  ex-holder's suspicion.
- **🕵️ The whisper network** — the director privately makes one player "the
  mole" (preferring the group's hardest-to-read wildcard) and slips one or two
  other players a piece of real, genuine intel about the room. Everyone talks,
  then the room votes on who the mole is. Caught: the mole loses big and
  whoever correctly named them scores. Uncaught: the mole scores big instead.
  The mole briefing and the intel text are visible **only** to their
  recipients — enforced by `projectView` and asserted in
  `tests/director.test.ts`.
- **🔥 Chemistry check** — the director picks its most-compatible untested
  pair and puts them on the spot: both answer the same private question at
  once, no talking, no looking at each other. Everyone else bets on whether
  they'll match. A real match ("that's chemistry") pays the pair and every
  correct bettor; a miss pays nobody much. Never runs on the same pair twice.
- **⚔️ Face-off** — the director picks its biggest untested clash (two
  players who read as opposites) and puts them head-to-head on a
  provocative comparison ("who's faker?"). Everyone *else* votes — the two
  contestants don't vote on themselves. The winner gains score and
  influence; the loser loses score and gains suspicion.

### The director's brain (`director.ts`)

Every non-warm-up round it reads deterministic signals — a bored player who
hasn't been in the spotlight, a runaway leader, a suspiciously cozy pair, a
room that's agreeing on everything, a theory that just failed, an empty or
too-comfortable throne, the most-compatible pair nobody's tested yet, the
biggest untested clash — and picks whichever mechanic addresses the strongest
signal, weighted against a target mix so **no mechanic dominates and nothing
repeats back-to-back** (`tests/director.test.ts` asserts both). A genuine
split on an "on your feet" round forces an immediate "last call" follow-up
before the director picks anything else. The first 3 rounds are quiet
data-gathering; the last 2 are the built-up finale (a face-off interrogation,
then everyone on their feet).

### Reputation economy

Alongside points, every player has **trust / suspicion / influence** (0–100,
start at 50), shown live and in the final results. The director's mechanics
move them — winning an interrogation raises trust and influence; getting
caught in a deal spikes suspicion — and the director's targeting reads them
back in, the same way it reads score and behavior.

### The confession

At `FINAL_RESULTS` the director dumps its **move log**: every mechanic it ran,
who it targeted, and — in its own words — why ("Fernando had gone quiet, so I
put him in the middle of the room. Carlos and Lucía were getting too
comfortable, so I offered one of them a reason to turn."). This is the
"holy shit, it was directing us" moment the whole mode is built around.

### Privacy, still enforced

The projection layer (`src/game/view.ts`) keeps the same guarantees as
classic mode: a secret deal's task is visible **only** to the two dealmakers,
the hot-seat player never sees their own rating options, and the shared stage
view (`stage: true`, no player id) never receives a secret deal or mission —
enforced by `tests/director.test.ts`, not just by convention.

### Try it

```bash
npx tsx scripts/ejemplo-directo.ts        # narrated example game, in Spanish
```

---

## 2. Run it locally

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

**With zero environment variables** ROOM uses an in-process memory store and the
deterministic AI voice — perfect for local/LAN play and demos. (Not suitable for
a multi-instance serverless deploy — see §4.)

Scripts:

```bash
npm run dev                        # dev server
npm run build                      # production build
npm run typecheck                  # tsc --noEmit
npm run lint                       # eslint
npm test                           # vitest (82 tests)
npm run simulate                   # headless: 10 bots, 100+ games, prints learning metrics
npx tsx scripts/ejemplo.ts         # narrated classic-mode example game (Spanish)
npx tsx scripts/ejemplo-directo.ts # narrated director-mode example game (Spanish)
bash scripts/e2e.sh                # HTTP end-to-end playthrough (needs dev server on :3111)
```

---

## 3. Environment variables

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

The game **must still work** with no `OPENAI_API_KEY` — it does. The LLM only ever
**rephrases facts the engine already computed**; it can never touch score,
winners, evidence or game state.

---

## 4. Supabase setup

Needed only for production / serverless (Vercel), where lambdas don't share
memory.

1. Create a project at [supabase.com](https://supabase.com).
2. Run the migration: paste `supabase/migrations/0001_init.sql` into the Supabase
   SQL editor, **or** with the CLI:
   ```bash
   supabase link --project-ref <ref>
   supabase db push
   ```
3. Copy **Project URL**, **anon key**, **service_role key** into your env.
4. The migration already:
   - creates `rooms` (live `jsonb` state + `version` for optimistic concurrency),
     `game_events` (analytics), `game_archives` (finished-game snapshots);
   - enables **RLS**: anon can only `SELECT rooms` (for Realtime); all writes are
     server-only via the service role;
   - adds `rooms` to the `supabase_realtime` publication with `replica identity full`.
5. Optional: schedule `select public.purge_stale_rooms();` via `pg_cron` to GC old
   rooms.

**Schema note.** A ROOM game is a small, self-consistent object the engine
rewrites atomically each transition, so it's stored as one versioned `jsonb`
document rather than a normalized per-entity schema that would need a transaction
on every answer. The TypeScript types in `src/game/types.ts` are the schema of
record; `game_archives` denormalizes finished games for analysis.

### Deploy to Vercel

1. Import the repo in Vercel (framework auto-detected).
2. Add the env vars from §3 (at minimum the three Supabase keys for real
   multiplayer).
3. Deploy. `vercel.json` bumps `maxDuration` on the poll/advance routes.

---

## 5. How the AI learning system works

```
        ┌─────────────── DETERMINISTIC ENGINE (authoritative) ───────────────┐
        │                                                                    │
 answer │  behavior.ts   statistical per-player model (EWMA + confidence)     │
 ─────► │  group.ts      relationship counters per ordered pair              │
        │  theories.ts   pattern detection → falsifiable theory + prediction │
        │  selector.ts   picks the NEXT round from what's been learned       │
        │  scoring.ts    all points, server-side                             │
        │  engine.ts     state machine, reveal, theory resolution            │
        └───────────────────────────────┬────────────────────────────────────┘
                                        │ structured evidence (facts only)
                                        ▼
                         ┌─────────── AI LANGUAGE LAYER ───────────┐
                         │ ai/provider.ts   OpenAI-compatible or   │
                         │ ai/narrator.ts   null → fallback text   │
                         │ commentary.ts    deterministic ES/EN    │
                         └─────────────────────────────────────────┘
```

### Behavior model (`src/game/behavior.ts`)

Every question option carries hidden `tags: Partial<Record<Dimension, number>>`
with a signal in `[-1, 1]`. 13 dimensions: `risk, competitiveness, patience,
greed, loyalty, conformity, contrarianism, trust, cooperation, individualism,
impulsivity, consistency, socialAlignment`.

On each choice, the dimension is updated with an **exponentially-weighted moving
average** whose learning rate decays as evidence accumulates (early rounds move
fast, later rounds are sticky — but a *sustained* behavior change still flips the
profile). Each dimension tracks `{ value, confidence, evidenceCount, trend,
history }`. `confidence` rises with evidence and falls with observation spread, so
a noisy player never gets a confident read. Conformity/contrarianism are **also**
learned from real group behavior (did you side with the visible majority?), not
just self-report.

### Group model (`src/game/group.ts`)

Per ordered pair `(a, b)`: selections, protections, cooperations, betrayals,
alignment ratio on comparable rounds, and prediction accuracy. Derived metrics:
mutual selection, one-way loyalty, rivalry, cooperative pairs.

### Theory engine (`src/game/theories.ts`)

Scans the two models each round. When a pattern crosses a threshold it produces a
**candidate** with `type, players, evidenceCount, evidence (a factual string),
confidence, salience`. The selector promotes the most salient one (mixing in one
social/"salseo" theory) to `announced`, builds a **test round** specifically for
it (`selector.ts`), and on reveal `resolveTheory()` checks whether the
engine's `prediction` held:

- held → `strengthened`, `confidence += ~0.15`, "THEORY STRENGTHENED"
- failed → `discarded`, `confidence -= ~0.28`, "I WAS WRONG. My theory doesn't hold up."

The AI is deliberately **not omniscient** — theories fail, and the targeted
players score `+100` for "fooling the AI".

### The single most important moment

After ~7 rounds: **🧠 I HAVE A THEORY.** → the factual observation
("X has chosen Y in 4 of 4 selection rounds") → a bespoke round involving those
players → **THEORY STRENGTHENED / DISCARDED**. This is generated from real game
data; evidence is never invented.

### Salseo layer (`compat.ts`, `missions.ts`, accusation rounds)

Drama, kept structured and bounded:

- **Compatibility** — cosine-ish similarity of two players' behavior vectors +
  answer alignment + `compat_probe` taste/values matches. Drives the
  **"AFFINITY DETECTED"** beat (a bespoke test: one more taste question, side by
  side, everyone else predicts), plus *most compatible pair*, *total opposites*
  and *wildcard* in the results.
- **Secret missions** — 1–2 players get a private objective at game start
  ("Betray someone who's cooperating with you", "Match X's answer as often as you
  can", "Finish in the bottom two"). Every check is **deterministic from the
  final state**. Revealed at the end; the reveal itself is a moment. This is the
  main "let's play again" driver — a different game each time.
- **Accusation rounds** — "Who here is lying the most tonight?" Everyone points at
  a player; the reveal shows the room's pick and whether the AI's data agrees.
- **Nemesis / Drama MVP** — surfaced in the results from real friction
  (betrayals + accusations + sustained disagreement).

### Content safety

The engine separates **OBSERVATION** ("Carlos chose María 5 times") from
**HYPOTHESIS** ("I want to test whether Carlos preferentially trusts María"). It
never asserts relationships, romance, sexuality, crime, health or mental state —
in the deterministic text and in the LLM system prompt. Compatibility is a
statement about **matching choices**, never feelings. Salseo rounds are a bounded
share of the game (`tests/salseo.test.ts` enforces `< 35%`).

### Verifying it

```bash
npm run simulate
```

10 bots with distinct trait vectors (high/low risk, conformist, contrarian,
cooperator, betrayer, wildcard…). It plays 100+ games and asserts the model
**separates** a high-risk from a low-risk player (avg Δ ≈ 0.38), **adapts** when a
bot's behavior is flipped mid-game, and that theories are created, tested and
resolved. Same checks run in `tests/simulation.test.ts`.

---

## 6. How the bilingual system works

- `src/i18n/en.json` / `src/i18n/es.json` — every UI string, identical key trees
  (enforced by `tests/i18n.test.ts`, including interpolation placeholders).
- `src/i18n/index.tsx` — `I18nProvider` + `useI18n()` giving `t(key, params)` and
  `loc(localized)`. Language is remembered in `localStorage`, defaults from
  `navigator.language`, switchable anywhere via the `ES / EN` toggle.
- **Question content is bilingual data**: every prompt and option is
  `{ en, es }`.
- **AI text is bilingual too**: the deterministic commentary produces both
  languages; when the LLM is enabled it's asked for `{ "en": …, "es": … }` in one
  call. So **mixed-language rooms work** — every `AiMessage.text` always carries
  both languages and each player's client renders their own. Verified by
  `tests/engine.test.ts › mixed-language rooms`.

---

## 7. Optional / future work

Core gameplay is complete and playable end-to-end. Deferred:

- **Normalized Supabase schema** with per-answer rows (current design uses one
  versioned `jsonb` doc — deliberate for a 5–10 min ephemeral game).
- **Server-driven display-phase timers** (currently the host client nudges
  display phases; `ANSWERING` already auto-advances server-side on timeout/all-in).
- Richer round types (multi-party dilemmas beyond pairs, live prediction markets).
- Persisted cross-session player identity / rematch with memory of past games.
- Rendered OG image per result (currently a static branded `og.svg`).
- More AI-provider adapters (Anthropic, local) — the abstraction is ready.
- Sound design and haptics.

---

## Project layout

```
src/
  app/                 Next.js App Router — pages + /api route handlers
                       room/[code]  the player's phone view
                       stage/[code] the shared screen (director mode)
  game/                deterministic engine (types, questions, behavior, group,
                       theories, selector, scoring, engine, report, commentary,
                       sim, director, directorContent, compat, missions)
  ai/                  provider abstraction + narrator (language layer only)
  store/               RoomStore: memory (default) | supabase
  server/              server actions + thin HTTP helpers
  i18n/                en.json / es.json / provider
  components/          UI + room screens (incl. DiscussionScreen)
  lib/                 rng, ids, player identity, analytics, useRoom / useStage hooks
supabase/migrations/   0001_init.sql
tests/                 vitest (incl. director.test.ts, salseo.test.ts)
scripts/               simulate.ts, ejemplo.ts, ejemplo-directo.ts, e2e.sh
```
