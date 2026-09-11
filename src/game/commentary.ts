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
  if (theory.type === "high_compatibility" || theory.type === "clashing_values") {
    return affinityText(theory, players);
  }
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

export function affinityText(theory: Theory, players: Player[]): Localized {
  const a = players.find((p) => p.id === theory.players[0])?.nickname ?? "?";
  const b = players.find((p) => p.id === theory.players[1])?.nickname ?? "?";
  if (theory.type === "clashing_values") {
    return L(
      `${a} and ${b} are opposites. Every values question, they split. Let's confirm it.`,
      `${a} y ${b} sois polos opuestos. Cada pregunta de valores, os separáis. Vamos a confirmarlo.`,
    );
  }
  return L(
    `Affinity detected. ${a} and ${b} keep giving the exact same answers — taste included. One more, at the same time.`,
    `Afinidad detectada. ${a} y ${b} dais exactamente las mismas respuestas, gustos incluidos. Una más, a la vez.`,
  );
}

export function affinityResultText(theory: Theory, held: boolean): Localized {
  const clash = theory.type === "clashing_values";
  if (held) {
    return clash
      ? L("Confirmed. You two do not agree on anything.", "Confirmado. Vosotros dos no coincidís en nada.")
      : L("Confirmed. That's real chemistry — on paper, at least.", "Confirmado. Eso es química de verdad. Sobre el papel, al menos.");
  }
  return clash
    ? L("Huh. This time you matched. I'll keep watching.", "Vaya. Esta vez coincidisteis. Seguiré mirando.")
    : L("You broke the pattern right when it mattered. Suspicious.", "Rompisteis el patrón justo cuando importaba. Sospechoso.");
}

export function accusationText(
  targetName: string | null,
  votes: number,
  total: number,
  matchesData: boolean,
): Localized {
  if (!targetName) {
    return L("The room couldn't agree. Nobody's off the hook.", "La sala no se pone de acuerdo. Nadie se libra.");
  }
  const en = `The room pointed at ${targetName} (${votes}/${total}). ${
    matchesData ? "My data says the same." : "My data isn't so sure."
  }`;
  const es = `La sala ha señalado a ${targetName} (${votes}/${total}). ${
    matchesData ? "Mis datos dicen lo mismo." : "Mis datos no lo tienen tan claro."
  }`;
  return L(en, es);
}

export function missionsRevealText(count: number, completed: number): Localized {
  return L(
    `${count === 1 ? "One player" : `${count} players`} had a secret mission. ${completed} pulled it off.`,
    `${count === 1 ? "Una persona tenía" : `${count} personas tenían`} una misión secreta. ${completed} la ${completed === 1 ? "completó" : "completaron"}.`,
  );
}

// ---------- director mechanics ----------

export function hotSeatVerdictText(
  name: string,
  believed: boolean,
  avgRating: number,
): Localized {
  if (believed) {
    return L(
      `The room bought it. ${name} talked their way out — average ${avgRating.toFixed(1)}/5.`,
      `La sala se lo tragó. ${name} habló y salió — media de ${avgRating.toFixed(1)}/5.`,
    );
  }
  return L(
    `The room didn't buy it. ${name} — ${avgRating.toFixed(1)}/5. I'm marking that.`,
    `La sala no se lo tragó. ${name} — ${avgRating.toFixed(1)}/5. Lo apunto.`,
  );
}

export function accusationConsequenceText(name: string, exiled: boolean): Localized {
  return exiled
    ? L(`${name} sits out the next round. The room has spoken.`, `${name} se salta la próxima ronda. La sala ha hablado.`)
    : L("", "");
}

export function dealRevealText(
  existed: boolean,
  caught: boolean,
  aName: string,
  bName: string,
): Localized {
  if (!existed) {
    return L(
      "There was no deal. You spent all that energy suspecting each other for nothing.",
      "No había ningún trato. Habéis gastado toda esa energía sospechando entre vosotros para nada.",
    );
  }
  if (caught) {
    return L(
      `Caught. ${aName} and ${bName} had a deal — and the room saw it. They lose everything.`,
      `Pillados. ${aName} y ${bName} tenían un trato, y la sala lo vio. Lo pierden todo.`,
    );
  }
  return L(
    `${aName} and ${bName} had a deal. Nobody caught it. That's how it's done.`,
    `${aName} y ${bName} tenían un trato. Nadie lo pilló. Así se hace.`,
  );
}

export function prophecyResultText(name: string, held: boolean, defied: boolean): Localized {
  if (held) {
    return L(
      `I called it. ${name} did exactly what I said. I've got you.`,
      `Lo dije. ${name} hizo exactamente lo que dije. Te tengo.`,
    );
  }
  void defied;
  return L(
    `${name} defied me — right in front of everyone. Fine. I didn't see that coming.`,
    `${name} me llevó la contraria — delante de todos. Vale. No me lo esperaba.`,
  );
}

export function throneResultText(
  newHolderName: string,
  previousHolderName: string | null,
  changed: boolean,
): Localized {
  if (!previousHolderName) {
    return L(
      `The throne goes to ${newHolderName}. Double points, starting now.`,
      `El trono es para ${newHolderName}. Puntos dobles, a partir de ahora.`,
    );
  }
  if (changed) {
    return L(
      `${previousHolderName} is out. ${newHolderName} takes the throne.`,
      `${previousHolderName} está fuera. ${newHolderName} se lleva el trono.`,
    );
  }
  return L(
    `The room isn't done with ${previousHolderName} yet. The throne holds.`,
    `La sala no ha terminado con ${previousHolderName} todavía. El trono aguanta.`,
  );
}

export function whisperResultText(moleName: string, caught: boolean): Localized {
  if (caught) {
    return L(`Caught. ${moleName} was the mole.`, `Pillado. ${moleName} era el topo.`);
  }
  return L(
    `${moleName} was the mole — and got away with it.`,
    `${moleName} era el topo — y se salió con la suya.`,
  );
}

export function chemistryResultText(n1: string, n2: string, matched: boolean): Localized {
  if (matched) {
    return L(
      `${n1} and ${n2} gave the exact same answer, unprompted. That's chemistry.`,
      `${n1} y ${n2} dieron exactamente la misma respuesta, sin hablarlo. Eso es química.`,
    );
  }
  return L(
    `${n1} and ${n2} didn't match. So much for that theory.`,
    `${n1} y ${n2} no coincidieron. Se acabó esa teoría.`,
  );
}

export function faceoffResultText(winnerName: string, loserName: string, tie: boolean): Localized {
  if (tie) {
    return L(
      `The room couldn't choose between ${winnerName} and ${loserName}. A tie.`,
      `La sala no pudo elegir entre ${winnerName} y ${loserName}. Empate.`,
    );
  }
  return L(
    `The room picked ${winnerName} over ${loserName}.`,
    `La sala eligió a ${winnerName} antes que a ${loserName}.`,
  );
}

export function movementText(
  statement: Localized,
  alone: string | null,
  switched: string[],
  players: Player[],
  counts: { left: number; right: number } = { left: 0, right: 0 },
): Localized {
  const nameOf = (id: string) => players.find((p) => p.id === id)?.nickname ?? "?";
  const parts: { en: string; es: string }[] = [];
  if (alone) {
    parts.push({
      en: `${nameOf(alone)} stood alone on that one.`,
      es: `${nameOf(alone)} se quedó solo en esa.`,
    });
  }
  if (switched.length === 1) {
    parts.push({
      en: `${nameOf(switched[0]!)} got talked into switching sides.`,
      es: `A ${nameOf(switched[0]!)} le convencieron para cambiarse de lado.`,
    });
  } else if (switched.length > 1) {
    parts.push({
      en: `${switched.length} people switched sides after talking.`,
      es: `${switched.length} personas se cambiaron de lado tras hablar.`,
    });
  }
  if (parts.length === 0) {
    if (counts.left > 0 && counts.right > 0) {
      parts.push({
        en: `The room split ${counts.left}-${counts.right}. Nobody stood alone.`,
        es: `La sala se dividió ${counts.left}-${counts.right}. Nadie se quedó solo.`,
      });
    } else {
      parts.push({ en: "The room moved as one.", es: "La sala se movió como una sola." });
    }
  }
  void statement;
  return { en: parts.map((p) => p.en).join(" "), es: parts.map((p) => p.es).join(" ") };
}

export function interventionText(state: GameState, pair: [string, string]): Localized {
  const a = state.players.find((p) => p.id === pair[0])?.nickname ?? "?";
  const b = state.players.find((p) => p.id === pair[1])?.nickname ?? "?";
  return L(
    `I'm changing the game. ${a} and ${b} keep landing on the same side. Now it costs something.`,
    `Voy a cambiar el juego. ${a} y ${b} acabáis siempre en el mismo lado. Ahora cuesta algo.`,
  );
}

// Evidence strings are authored in English in the theory engine (they're the
// canonical factual record, also fed to the LLM). We render clean Spanish here
// from the known templates so mixed-language / no-API-key rooms read naturally.
const ES_PATTERNS: [RegExp, (m: RegExpMatchArray) => string][] = [
  [
    /^(.+) and (.+) have chosen each other (\d+) times in selection rounds\.$/,
    (m) => `${m[1]} y ${m[2]} se han elegido mutuamente ${m[3]} veces en rondas de elección.`,
  ],
  [
    /^(.+) and (.+) made the same choice in (\d+) of (\d+) comparable rounds\.$/,
    (m) => `${m[1]} y ${m[2]} eligieron lo mismo en ${m[3]} de ${m[4]} rondas comparables.`,
  ],
  [
    /^(.+) and (.+) disagreed in (\d+) of (\d+) comparable rounds\.$/,
    (m) => `${m[1]} y ${m[2]} discreparon en ${m[3]} de ${m[4]} rondas comparables.`,
  ],
  [
    /^(.+) has chosen (.+) (\d+) times; (.+) has chosen (.+) (\d+) times\.$/,
    (m) => `${m[1]} ha elegido a ${m[2]} ${m[3]} veces; ${m[4]} ha elegido a ${m[5]} ${m[6]} veces.`,
  ],
  [
    /^(.+) correctly predicted (.+) in (\d+) of (\d+) attempts\.$/,
    (m) => `${m[1]} predijo correctamente a ${m[2]} en ${m[3]} de ${m[4]} intentos.`,
  ],
  [
    /^(.+) chose the higher-risk option in most rounds where risk was in play \((\d+) data points\)\.$/,
    (m) => `${m[1]} eligió la opción más arriesgada en casi todas las rondas con riesgo en juego (${m[2]} datos).`,
  ],
  [
    /^(.+) chose the safer option in most rounds where risk was in play \((\d+) data points\)\.$/,
    (m) => `${m[1]} eligió la opción más segura en casi todas las rondas con riesgo en juego (${m[2]} datos).`,
  ],
  [
    /^(.+) has sided with the apparent majority in (\d+) tracked rounds\.$/,
    (m) => `${m[1]} se ha alineado con la mayoría aparente en ${m[2]} rondas registradas.`,
  ],
  [
    /^(.+) has gone against the apparent majority in (\d+) tracked rounds\.$/,
    (m) => `${m[1]} ha ido contra la mayoría aparente en ${m[2]} rondas registradas.`,
  ],
];

function translateEvidence(evidence: string, _players: Player[]): string {
  for (const [re, fn] of ES_PATTERNS) {
    const m = evidence.match(re);
    if (m) return fn(m);
  }
  return evidence;
}

function translateEvidenceShort(theory: Theory): string {
  return translateEvidence(theory.evidence, []).replace(/\.$/, "");
}

/** Public helper: a localized version of a theory's factual evidence. */
export function evidenceLocalized(theory: Theory): Localized {
  return L(theory.evidence, translateEvidence(theory.evidence, []));
}
