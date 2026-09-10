import { topReadings } from "./behavior";
import type { Dimension, GameState, Localized, Player, Theory } from "./types";
import { mulberry32, hashString } from "@/lib/rng";

// ─────────────────────────────────────────────────────────────
// Deterministic AI voice. Always available, no network.
// The LLM layer (src/ai) may replace these strings with richer
// phrasing, but the STRUCTURE and the underlying facts come from
// here and never change.
// ─────────────────────────────────────────────────────────────

const L = (en: string, es: string): Localized => ({ en, es });

const QUIPS: Localized[] = [
  L("Interesting.", "Interesante."),
  L("That wasn't random.", "Eso no ha sido casualidad."),
  L("Noted.", "Anotado."),
  L("I saw that coming.", "Me lo veía venir."),
  L("Hm. Not what I expected.", "Hm. No me lo esperaba."),
  L("The pattern just moved.", "El patrón acaba de moverse."),
];

export function quip(seed: string): Localized {
  const r = mulberry32(hashString(seed));
  return QUIPS[Math.floor(r() * QUIPS.length)]!;
}

const DIM_PHRASE: Record<Dimension, (name: string) => Localized> = {
  risk: (n) => L(`${n} takes the higher-risk option when the reward is personal.`, `${n} elige la opción más arriesgada cuando la recompensa es personal.`),
  competitiveness: (n) => L(`${n} plays to win, even against friends.`, `${n} juega para ganar, incluso contra amigos.`),
  patience: (n) => L(`${n} waits for the bigger payoff instead of taking the quick one.`, `${n} espera la recompensa mayor en lugar de coger la rápida.`),
  greed: (n) => L(`${n} keeps the larger share when it's offered.`, `${n} se queda la parte mayor cuando se la ofrecen.`),
  loyalty: (n) => L(`${n} sticks with the same people round after round.`, `${n} sigue con las mismas personas ronda tras ronda.`),
  conformity: (n) => L(`${n} moves with the room more often than against it.`, `${n} se mueve con la sala más a menudo que en contra.`),
  contrarianism: (n) => L(`${n} breaks from the majority on purpose.`, `${n} se separa de la mayoría a propósito.`),
  trust: (n) => L(`${n} hands control to other players without much hesitation.`, `${n} cede el control a otros jugadores sin dudarlo mucho.`),
  cooperation: (n) => L(`${n} picks the option that helps the group.`, `${n} elige la opción que ayuda al grupo.`),
  individualism: (n) => L(`${n} optimises for their own score first.`, `${n} optimiza primero su propia puntuación.`),
  impulsivity: (n) => L(`${n} locks in an answer fast.`, `${n} fija una respuesta rápido.`),
  consistency: (n) => L(`${n} answers the same type of question the same way every time.`, `${n} responde el mismo tipo de pregunta igual cada vez.`),
  socialAlignment: (n) => L(`${n} ends up where the room ends up.`, `${n} acaba donde acaba la sala.`),
};

/** "I'm starting to see a pattern" — first real observation. Evidence-based. */
export function observationText(state: GameState, isFinal: boolean): { text: Localized; playerId: string | null } {
  let best: { name: string; id: string; strength: number; dim: Dimension } | null = null;
  for (const p of state.players) {
    const prof = state.behavior[p.id];
    if (!prof) continue;
    const r = topReadings(prof, { minConfidence: 0.35, minEvidence: 2, limit: 1 })[0];
    if (!r) continue;
    const strength = Math.abs(r.polarity) * r.confidence;
    if (!best || strength > best.strength) {
      best = { name: p.nickname, id: p.id, strength, dim: r.dimension };
    }
  }
  if (!best) {
    return {
      text: isFinal
        ? L("You kept me guessing the whole way. I don't have a clean read on this room.", "Me habéis tenido dudando todo el rato. No tengo una lectura clara de esta sala.")
        : L("Not enough yet. Keep choosing.", "Aún no es suficiente. Seguid eligiendo."),
      playerId: null,
    };
  }
  const line = DIM_PHRASE[best.dim](best.name);
  const prefix = isFinal
    ? L("The pattern I keep coming back to: ", "El patrón al que sigo volviendo: ")
    : L("", "");
  return {
    text: L(prefix.en + line.en, prefix.es + line.es),
    playerId: best.id,
  };
}

/** "I HAVE A THEORY." announcement text. */
export function theoryAnnounceText(theory: Theory, players: Player[]): Localized {
  const factEn = theory.evidence;
  const factEs = translateEvidence(theory.evidence, players);
  return L(
    `${factEn} That's interesting. I want to test it.`,
    `${factEs} Es interesante. Quiero ponerlo a prueba.`,
  );
}

export function theoryResultText(theory: Theory, held: boolean): Localized {
  if (held) {
    return L(
      `Theory strengthened. ${theory.evidence.replace(/\.$/, "")} — and it held up when it mattered.`,
      `Teoría reforzada. ${translateEvidenceShort(theory)} — y aguantó cuando importaba.`,
    );
  }
  return L(
    `I was wrong. My theory doesn't hold up. ${theory.evidence.replace(/\.$/, "")}, but not when I pushed on it.`,
    `Me equivoqué. Mi teoría no se sostiene. Lo observé, pero no cuando apreté.`,
  );
}

export function interventionText(state: GameState, pair: [string, string]): Localized {
  const a = state.players.find((p) => p.id === pair[0])?.nickname ?? "?";
  const b = state.players.find((p) => p.id === pair[1])?.nickname ?? "?";
  return L(
    `I'm changing the game. ${a} and ${b} keep landing on the same side. Now it costs something.`,
    `Voy a cambiar el juego. ${a} y ${b} acabáis siempre en el mismo lado. Ahora cuesta algo.`,
  );
}

// Evidence strings are authored in English in the theory engine.
// We keep a light Spanish rendering here so mixed-language rooms
// still get Spanish. (The LLM layer does this better when enabled.)
function translateEvidence(evidence: string, _players: Player[]): string {
  return evidence
    .replace(/ have chosen each other /, " se han elegido mutuamente ")
    .replace(/ times in selection rounds\./, " veces en rondas de elección.")
    .replace(/ made the same choice in /, " hicieron la misma elección en ")
    .replace(/ of /, " de ")
    .replace(/ comparable rounds\./, " rondas comparables.")
    .replace(/ disagreed in /, " no coincidieron en ")
    .replace(/ has chosen /g, " ha elegido a ")
    .replace(/ times;/, " veces;")
    .replace(/ correctly predicted /, " predijo correctamente a ")
    .replace(/ in (\d+) of (\d+) attempts\./, " en $1 de $2 intentos.")
    .replace(/ chose the higher-risk option in most rounds where risk was in play /, " eligió la opción más arriesgada en la mayoría de rondas con riesgo en juego ")
    .replace(/ chose the safer option in most rounds where risk was in play /, " eligió la opción más segura en la mayoría de rondas con riesgo en juego ")
    .replace(/ has sided with the apparent majority in /, " se ha puesto del lado de la mayoría aparente en ")
    .replace(/ has gone against the apparent majority in /, " ha ido contra la mayoría aparente en ")
    .replace(/ tracked rounds\./, " rondas registradas.")
    .replace(/\(([\d]+) data points\)/, "($1 datos)");
}

function translateEvidenceShort(theory: Theory): string {
  return translateEvidence(theory.evidence, []).replace(/\.$/, "");
}
