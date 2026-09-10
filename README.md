# ROOM

**The AI is watching your room. — La IA está observando vuestra sala.**

A multiplayer browser party game for **3–10 friends**. Everyone joins from their
own phone with a code or QR. You make choices; an AI silently builds a model of
how your group behaves; then it **changes the game** to test what it thinks it
knows. ~5–10 minutes. No app, no account, no login, free.

> ROOM is **not** "ChatGPT asks your friends questions." The AI is a language
> layer on top of a **deterministic game engine** that does the actual learning
> from **structured behavioral data**.

---

## 1. What was built

| Area | Status |
| --- | --- |
| Landing page (ES/EN), create/join flow, QR join | ✅ |
| Server-authoritative game state machine (`LOBBY → … → FINAL_RESULTS`) | ✅ |
| Realtime multiplayer — polling (always) + Supabase Realtime (when configured) | ✅ |
| Disconnect / refresh / host-transfer / late-join handling | ✅ |
| ~175-question curated bilingual bank with hidden behavioral metadata | ✅ |
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
| 60 unit/integration tests + headless simulation (`npm run simulate`) | ✅ |

**Priority order followed:** multiplayer → fast gameplay → great first minute →
behavioral learning → AI interventions → theory/salseo → results → shareability →
polish.

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
npm run dev          # dev server
npm run build        # production build
npm run typecheck    # tsc --noEmit
npm run lint         # eslint
npm test             # vitest (60 tests)
npm run simulate     # headless: 10 bots, 100+ games, prints learning metrics
bash scripts/e2e.sh  # HTTP end-to-end playthrough (needs dev server on :3111)
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
- Spectator big-screen mode for the host device.
- Rendered OG image per result (currently a static branded `og.svg`).
- More AI-provider adapters (Anthropic, local) — the abstraction is ready.
- Sound design and haptics.

---

## Project layout

```
src/
  app/                 Next.js App Router — pages + /api route handlers
  game/                deterministic engine (types, questions, behavior, group,
                       theories, selector, scoring, engine, report, commentary, sim)
  ai/                  provider abstraction + narrator (language layer only)
  store/               RoomStore: memory (default) | supabase
  server/              server actions + thin HTTP helpers
  i18n/                en.json / es.json / provider
  components/          UI + room screens
  lib/                 rng, ids, player identity, analytics, useRoom hook
supabase/migrations/   0001_init.sql
tests/                 vitest
scripts/               simulate.ts, e2e.sh
```
