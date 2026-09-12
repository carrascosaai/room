import type { Hypothesis, Localized, Player } from "./types";

// ─────────────────────────────────────────────────────────────
// Deterministic AI voice for the hypothesis loop. Always available,
// no network. The LLM layer (src/ai) may replace these strings with
// richer phrasing, but the FACTS always come from here.
// ─────────────────────────────────────────────────────────────

const L = (en: string, es: string): Localized => ({ en, es });

function name(players: Player[], id: string): string {
  return players.find((p) => p.id === id)?.nickname ?? "?";
}

export function hypothesisAnnounceText(
  hypothesis: Hypothesis,
  players: Player[],
): Localized {
  const target = name(players, hypothesis.targetId);
  if (hypothesis.autoFilled) {
    return L(
      `I have a theory about ${target}. I've been watching for a while. Let's test it.`,
      `Tengo una teoría sobre ${target}. Llevo un rato observando. Vamos a ponerla a prueba.`,
    );
  }
  if (hypothesis.anonymous) {
    return L(
      `Someone in this room has a theory about ${target}.`,
      `Alguien de esta sala tiene una teoría sobre ${target}.`,
    );
  }
  const creator = name(players, hypothesis.creatorId);
  return L(
    `${creator} has a theory about ${target}.`,
    `${creator} tiene una teoría sobre ${target}.`,
  );
}

export function counterTheoryText(anonymous: boolean, creator: string): Localized {
  if (anonymous) {
    return L("Someone here disagrees completely.", "Alguien de aquí no está nada de acuerdo.");
  }
  return L(`${creator} disagrees completely.`, `${creator} no está nada de acuerdo.`);
}

export function testResultText(target: string, decisionLabel: Localized): Localized {
  return L(
    `${target} chose: ${decisionLabel.en}`,
    `${target} eligió: ${decisionLabel.es}`,
  );
}

export function confidenceUpdateText(held: boolean, delta: number): Localized {
  if (held) {
    return L(
      `This decision supports the theory. Confidence ${delta >= 0 ? "+" : ""}${delta}.`,
      `Esta decisión respalda la teoría. Confianza ${delta >= 0 ? "+" : ""}${delta}.`,
    );
  }
  return L(
    `This result contradicts the theory. Confidence ${delta}.`,
    `Este resultado contradice la teoría. Confianza ${delta}.`,
  );
}

export function confirmedText(target: string, statement: string): Localized {
  return L(
    `Confirmed. ${target}: "${statement}"`,
    `Confirmado. ${target}: "${statement}"`,
  );
}

export function discardedText(target: string): Localized {
  return L(
    `That theory about ${target} didn't hold up.`,
    `Esa teoría sobre ${target} no se sostuvo.`,
  );
}

export function salseoTestedText(target: string, count: number): Localized {
  return L(
    `${count} theories tested on ${target} tonight.`,
    `${count} teorías puestas a prueba sobre ${target} esta noche.`,
  );
}

export function salseoSplitText(target: string): Localized {
  return L(
    `Two players have opposite theories about ${target}.`,
    `Dos jugadores tienen teorías opuestas sobre ${target}.`,
  );
}
