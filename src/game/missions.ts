import { getEdge } from "./group";
import { mulberry32, shuffle } from "@/lib/rng";
import type {
  GameState,
  Localized,
  MissionAssignment,
  MissionId,
  Player,
} from "./types";

// ─────────────────────────────────────────────────────────────
// Secret missions. At the start of a game 1–2 players are handed
// a private objective. Nobody else knows. At the end it's revealed
// whether they pulled it off — and the room gets to guess who had
// one. This is the biggest driver of "let's play again".
//
// Every check() is DETERMINISTIC from the final GameState — it
// reads counters the engine already tracks. No LLM, no ambiguity.
// ─────────────────────────────────────────────────────────────

const L = (en: string, es: string): Localized => ({ en, es });

interface MissionDef {
  id: MissionId;
  /** does this mission reference another player? */
  needsTarget: boolean;
  text: (targetName?: string) => Localized;
  check: (state: GameState, m: MissionAssignment) => boolean;
}

function outgoing(state: GameState, from: string, field: keyof ReturnType<typeof getEdge>): number {
  let total = 0;
  for (const p of state.players) {
    if (p.id === from) continue;
    total += getEdge(state.group, from, p.id)[field] as number;
  }
  return total;
}

function incoming(state: GameState, to: string, field: keyof ReturnType<typeof getEdge>): number {
  let total = 0;
  for (const p of state.players) {
    if (p.id === to) continue;
    total += getEdge(state.group, p.id, to)[field] as number;
  }
  return total;
}

export const MISSIONS: MissionDef[] = [
  {
    id: "betray_twice",
    needsTarget: false,
    text: () => L("Betray someone who's cooperating with you.", "Traiciona a alguien que esté cooperando contigo."),
    check: (s, m) => outgoing(s, m.playerId, "betrayedCount") >= 1,
  },
  {
    id: "never_cooperate",
    needsTarget: false,
    text: () => L("Never cooperate in a dilemma.", "No cooperes en ningún dilema."),
    check: (s, m) => {
      // cooperatedCount on any edge from this player means a mutual-cooperate happened
      const coop = outgoing(s, m.playerId, "cooperatedCount") + incoming(s, m.playerId, "cooperatedCount");
      return coop === 0;
    },
  },
  {
    id: "win_trust_votes",
    needsTarget: false,
    text: () => L("Get picked by others 3+ times in trust/vote rounds.", "Consigue que te elijan 3 veces o más en rondas de confianza o voto."),
    check: (s, m) => incoming(s, m.playerId, "selectedCount") >= 3,
  },
  {
    id: "mirror_target",
    needsTarget: true,
    text: (n) => L(`Match ${n}'s answer as often as you can.`, `Responde lo mismo que ${n} siempre que puedas.`),
    check: (s, m) => {
      if (!m.targetId) return false;
      const e = getEdge(s.group, m.playerId, m.targetId);
      return e.comparableCount >= 3 && e.alignedCount / e.comparableCount >= 0.7;
    },
  },
  {
    id: "oppose_target",
    needsTarget: true,
    text: (n) => L(`Answer the opposite of ${n} whenever you can.`, `Responde lo contrario que ${n} siempre que puedas.`),
    check: (s, m) => {
      if (!m.targetId) return false;
      const e = getEdge(s.group, m.playerId, m.targetId);
      return e.comparableCount >= 3 && e.alignedCount / e.comparableCount <= 0.3;
    },
  },
  {
    id: "finish_bottom",
    needsTarget: false,
    text: () => L("Finish in the bottom two on points.", "Termina entre los dos últimos en puntos."),
    check: (s, m) => {
      const sorted = [...s.players].sort((a, b) => b.score - a.score);
      const rank = sorted.findIndex((p) => p.id === m.playerId);
      return rank >= sorted.length - 2;
    },
  },
  {
    id: "stay_risky",
    needsTarget: false,
    text: () => L("Keep taking the risky option — the AI must read you as a risk-taker.", "Sigue eligiendo lo arriesgado: la IA tiene que verte como alguien arriesgado."),
    check: (s, m) => (s.behavior[m.playerId]?.risk.value ?? 0.5) >= 0.62,
  },
  {
    id: "get_protected",
    needsTarget: false,
    text: () => L("Get another player to choose you for protection.", "Consigue que otra persona te elija para protegerte."),
    check: (s, m) => incoming(s, m.playerId, "protectedCount") >= 1,
  },
  {
    id: "fixate_on_one",
    needsTarget: true,
    text: (n) => L(`Pick ${n} in every selection round you can.`, `Elige a ${n} en todas las rondas de elección que puedas.`),
    check: (s, m) => {
      if (!m.targetId) return false;
      return getEdge(s.group, m.playerId, m.targetId).selectedCount >= 2;
    },
  },
  {
    id: "go_unnoticed",
    needsTarget: false,
    text: () => L("Get to the end without ever being the most-accused player and without a theory about you.", "Llega al final sin ser nunca la persona más señalada y sin que la IA tenga una teoría sobre ti."),
    check: (s, m) => {
      const accusedAgainst = incoming(s, m.playerId, "accusedCount");
      const maxAccused = Math.max(
        0,
        ...s.players.map((p) => incoming(s, p.id, "accusedCount")),
      );
      const inTheory = s.theories.some(
        (t) => t.players.includes(m.playerId) && t.status !== "forming",
      );
      return !inTheory && (accusedAgainst < maxAccused || maxAccused === 0);
    },
  },
];

export const MISSION_BY_ID: Record<MissionId, MissionDef> = Object.fromEntries(
  MISSIONS.map((m) => [m.id, m]),
) as Record<MissionId, MissionDef>;

/** Assign 1–2 missions at game start based on player count. */
export function assignMissions(players: Player[], seed: number): MissionAssignment[] {
  const rand = mulberry32(seed ^ 0x5a15e0);
  const count = players.length >= 6 ? 2 : 1;
  const holders = shuffle(rand, players).slice(0, count);
  const defs = shuffle(rand, MISSIONS);
  const out: MissionAssignment[] = [];
  for (let i = 0; i < holders.length; i++) {
    const holder = holders[i]!;
    const def = defs[i % defs.length]!;
    let targetId: string | undefined;
    if (def.needsTarget) {
      const others = players.filter((p) => p.id !== holder.id);
      targetId = shuffle(rand, others)[0]?.id;
    }
    out.push({ playerId: holder.id, missionId: def.id, targetId });
  }
  return out;
}

export function missionText(m: MissionAssignment, players: Player[]): Localized {
  const def = MISSION_BY_ID[m.missionId];
  const targetName = m.targetId
    ? players.find((p) => p.id === m.targetId)?.nickname
    : undefined;
  return def.text(targetName);
}

export function evaluateMissions(state: GameState): MissionAssignment[] {
  return state.missions.map((m) => ({ ...m, completed: MISSION_BY_ID[m.missionId].check(state, m) }));
}
