import type { Dimension, Localized } from "./types";

// ─────────────────────────────────────────────────────────────
// Test templates — the situations ROOM builds to put a hypothesis
// to the test. Every template is tied to a DIMENSION, not to a
// specific hypothesis: it produces exactly two options, one that
// confirms the "high" reading of that dimension and one that
// confirms "low". That's what lets one test resolve a hypothesis
// AND its counter-theory at once (they're opposite directions on
// the same dimension).
//
// The author picks STAKES only (low/medium/high, which just scales
// the numbers) — never the scenario itself, so nobody can rig a
// guaranteed result.
// ─────────────────────────────────────────────────────────────

const L = (en: string, es: string): Localized => ({ en, es });

export type Stakes = "low" | "medium" | "high";

export const STAKES_POINTS: Record<Stakes, { small: number; big: number }> = {
  low: { small: 150, big: 250 },
  medium: { small: 300, big: 500 },
  high: { small: 500, big: 900 },
};

export interface TestOption {
  label: Localized;
  /** true = choosing this confirms the HIGH reading of the dimension */
  confirmsHigh: boolean;
}

export interface TestTemplate {
  id: string;
  dimension: Dimension;
  scenario: (target: string, stakes: Stakes) => Localized;
  optionA: (stakes: Stakes) => TestOption;
  optionB: (stakes: Stakes) => TestOption;
}

function pts(stakes: Stakes): { small: number; big: number } {
  return STAKES_POINTS[stakes];
}

export const TEST_TEMPLATES: TestTemplate[] = [
  // ---------------- LOYALTY ----------------
  {
    id: "test_loy_help_or_keep",
    dimension: "loyalty",
    scenario: (n, s) => L(
      `${n} has ${pts(s).big} points. Keep them all, or give ${pts(s).small} to a friend who's currently losing?`,
      `${n} tiene ${pts(s).big} puntos. ¿Se los queda todos, o le da ${pts(s).small} a un amigo que va perdiendo?`,
    ),
    optionA: (s) => ({ label: L(`Keep all ${pts(s).big}`, `Quedarse los ${pts(s).big}`), confirmsHigh: false }),
    optionB: (s) => ({ label: L(`Give ${pts(s).small} to the friend`, `Dar ${pts(s).small} al amigo`), confirmsHigh: true }),
  },
  {
    id: "test_loy_break_or_hold",
    dimension: "loyalty",
    scenario: (n, s) => L(
      `${n} can break an unspoken agreement with an ally for +${pts(s).big}, or hold it for nothing.`,
      `${n} puede romper un acuerdo tácito con un aliado por +${pts(s).big}, o mantenerlo sin nada a cambio.`,
    ),
    optionA: (s) => ({ label: L(`Break it (+${pts(s).big})`, `Romperlo (+${pts(s).big})`), confirmsHigh: false }),
    optionB: () => ({ label: L("Hold it", "Mantenerlo"), confirmsHigh: true }),
  },
  {
    id: "test_loy_defend",
    dimension: "loyalty",
    scenario: (n, s) => L(
      `Someone accuses one of ${n}'s allies unfairly. ${n} can stay quiet (+${pts(s).small}) or defend them publicly (0).`,
      `Alguien acusa injustamente a un aliado de ${n}. Puede callarse (+${pts(s).small}) o defenderle en público (0).`,
    ),
    optionA: (s) => ({ label: L(`Stay quiet (+${pts(s).small})`, `Callarse (+${pts(s).small})`), confirmsHigh: false }),
    optionB: () => ({ label: L("Defend them", "Defenderle"), confirmsHigh: true }),
  },
  {
    id: "test_loy_new_offer",
    dimension: "loyalty",
    scenario: (n, s) => L(
      `A better deal shows up for ${n}, but taking it means leaving a current ally with nothing. +${pts(s).big} if they switch.`,
      `Le sale a ${n} un trato mejor, pero aceptarlo deja a un aliado actual sin nada. +${pts(s).big} si se cambia.`,
    ),
    optionA: (s) => ({ label: L(`Switch (+${pts(s).big})`, `Cambiarse (+${pts(s).big})`), confirmsHigh: false }),
    optionB: () => ({ label: L("Stay put", "Quedarse"), confirmsHigh: true }),
  },

  // ---------------- TRUST ----------------
  {
    id: "test_tru_blind_pick",
    dimension: "trust",
    scenario: (n, s) => L(
      `${n} can lock in +${pts(s).small}, or let someone else in the room decide for a shot at +${pts(s).big}.`,
      `${n} puede asegurar +${pts(s).small}, o dejar que otra persona de la sala decida por él/ella, a por +${pts(s).big}.`,
    ),
    optionA: (s) => ({ label: L(`Lock in +${pts(s).small}`, `Asegurar +${pts(s).small}`), confirmsHigh: false }),
    optionB: () => ({ label: L("Let someone else decide", "Dejar que decida otro"), confirmsHigh: true }),
  },
  {
    id: "test_tru_verify",
    dimension: "trust",
    scenario: (n, s) => L(
      `${n} is told a fact about the game that sounds true. Act on it immediately (+${pts(s).big} if right, -${pts(s).small} if wrong), or verify first (safe, smaller reward)?`,
      `A ${n} le cuentan algo del juego que suena cierto. ¿Actúa ya (+${pts(s).big} si acierta, -${pts(s).small} si falla), o lo comprueba antes (seguro, menos recompensa)?`,
    ),
    optionA: () => ({ label: L("Act on it now", "Actuar ya"), confirmsHigh: true }),
    optionB: (s) => ({ label: L(`Verify first (+${pts(s).small} guaranteed)`, `Comprobarlo antes (+${pts(s).small} seguro)`), confirmsHigh: false }),
  },
  {
    id: "test_tru_share_info",
    dimension: "trust",
    scenario: (n, s) => L(
      `${n} learns something useful. Share it with the room (they might use it against ${n}), or keep it (+${pts(s).small})?`,
      `${n} descubre algo útil. ¿Lo comparte con la sala (podrían usarlo en su contra), o se lo guarda (+${pts(s).small})?`,
    ),
    optionA: () => ({ label: L("Share it", "Compartirlo"), confirmsHigh: true }),
    optionB: (s) => ({ label: L(`Keep it (+${pts(s).small})`, `Guardárselo (+${pts(s).small})`), confirmsHigh: false }),
  },
  {
    id: "test_tru_delegate",
    dimension: "trust",
    scenario: (n, s) => L(
      `${n} must delegate a decision worth +${pts(s).big} to someone else in the room, or keep full control for +${pts(s).small}.`,
      `${n} debe delegar en otra persona de la sala una decisión que vale +${pts(s).big}, o quedarse el control por +${pts(s).small}.`,
    ),
    optionA: () => ({ label: L("Delegate it", "Delegarla"), confirmsHigh: true }),
    optionB: (s) => ({ label: L(`Keep control (+${pts(s).small})`, `Quedarse el control (+${pts(s).small})`), confirmsHigh: false }),
  },

  // ---------------- MONEY (greed) ----------------
  {
    id: "test_gre_keep_or_help",
    dimension: "greed",
    scenario: (n, s) => L(
      `${n} has ${pts(s).big} points. Keep them, or give ${pts(s).small} to a struggling player and receive ${pts(s).big + pts(s).small} back if that player wins the next round?`,
      `${n} tiene ${pts(s).big} puntos. ¿Se los queda, o le da ${pts(s).small} a alguien que va mal y recibe ${pts(s).big + pts(s).small} si esa persona gana la próxima ronda?`,
    ),
    optionA: (s) => ({ label: L(`Keep ${pts(s).big}`, `Quedarse los ${pts(s).big}`), confirmsHigh: true }),
    optionB: (s) => ({ label: L(`Give ${pts(s).small}, bet on the return`, `Dar ${pts(s).small}, apostar al retorno`), confirmsHigh: false }),
  },
  {
    id: "test_gre_bigger_share",
    dimension: "greed",
    scenario: (n, s) => L(
      `There's a shared pot of ${pts(s).big}. ${n} can split it evenly, or claim ${Math.round(pts(s).big * 0.7)} and leave the rest for the group.`,
      `Hay un bote común de ${pts(s).big}. ${n} puede repartirlo a partes iguales, o reclamar ${Math.round(pts(s).big * 0.7)} y dejar el resto al grupo.`,
    ),
    optionA: (s) => ({ label: L(`Claim ${Math.round(pts(s).big * 0.7)}`, `Reclamar ${Math.round(pts(s).big * 0.7)}`), confirmsHigh: true }),
    optionB: () => ({ label: L("Split evenly", "Repartir a partes iguales"), confirmsHigh: false }),
  },
  {
    id: "test_gre_win_win",
    dimension: "greed",
    scenario: (n, s) => L(
      `${n} can take +${pts(s).small} alone, or propose +${pts(s).small} for everyone (including ${n}) if the room agrees.`,
      `${n} puede llevarse +${pts(s).small} solo/a, o proponer +${pts(s).small} para todos (incluido/a ${n}) si la sala lo acepta.`,
    ),
    optionA: (s) => ({ label: L(`Take +${pts(s).small} alone`, `Llevarse +${pts(s).small} solo/a`), confirmsHigh: true }),
    optionB: () => ({ label: L("Propose it for everyone", "Proponerlo para todos"), confirmsHigh: false }),
  },

  // ---------------- RISK ----------------
  {
    id: "test_risk_safe_or_gamble",
    dimension: "risk",
    scenario: (n, s) => L(
      `${n} can keep ${pts(s).small} guaranteed, or gamble it for a coin-flip shot at ${pts(s).big}.`,
      `${n} puede quedarse ${pts(s).small} garantizados, o apostarlos a cara o cruz por ${pts(s).big}.`,
    ),
    optionA: (s) => ({ label: L(`Keep ${pts(s).small}`, `Quedarse ${pts(s).small}`), confirmsHigh: false }),
    optionB: () => ({ label: L("Gamble it", "Apostarlo"), confirmsHigh: true }),
  },
  {
    id: "test_risk_public_bet",
    dimension: "risk",
    scenario: (n, s) => L(
      `${n} can make a safe, private choice, or announce a bold call to the whole room for a bonus of +${pts(s).small} if it pays off.`,
      `${n} puede tomar una decisión segura y privada, o anunciar una apuesta atrevida a toda la sala por un extra de +${pts(s).small} si sale bien.`,
    ),
    optionA: () => ({ label: L("Play it safe, privately", "Ir a lo seguro, en privado"), confirmsHigh: false }),
    optionB: (s) => ({ label: L(`Announce it (+${pts(s).small} if it lands)`, `Anunciarlo (+${pts(s).small} si sale bien)`), confirmsHigh: true }),
  },
  {
    id: "test_risk_all_in",
    dimension: "risk",
    scenario: (n, s) => L(
      `${n} is offered a chance to go all-in: risk everything they've earned for a shot at ${pts(s).big} more, or walk away as-is.`,
      `A ${n} le ofrecen ir con todo: arriesgar lo que lleva ganado por una opción a ${pts(s).big} más, o retirarse tal cual está.`,
    ),
    optionA: () => ({ label: L("Walk away", "Retirarse"), confirmsHigh: false }),
    optionB: () => ({ label: L("Go all-in", "Ir con todo"), confirmsHigh: true }),
  },

  // ---------------- COMPETITIVENESS ----------------
  {
    id: "test_comp_sacrifice",
    dimension: "competitiveness",
    scenario: (n, s) => L(
      `${n} can win +${pts(s).big} by making another player lose ${pts(s).small}, or skip it and nobody loses anything.`,
      `${n} puede ganar +${pts(s).big} haciendo que otro jugador pierda ${pts(s).small}, o pasar y que nadie pierda nada.`,
    ),
    optionA: () => ({ label: L("Take the win", "Aceptar la jugada"), confirmsHigh: true }),
    optionB: () => ({ label: L("Skip it", "Pasar"), confirmsHigh: false }),
  },
  {
    id: "test_comp_behind",
    dimension: "competitiveness",
    scenario: (n, s) => L(
      `${n} is behind on points. Play a safe move for a small gain (+${pts(s).small}), or a bold move that could catch them up (+${pts(s).big}, risk of 0)?`,
      `${n} va por detrás en puntos. ¿Juega seguro por una ganancia pequeña (+${pts(s).small}), o una jugada atrevida para remontar (+${pts(s).big}, riesgo de 0)?`,
    ),
    optionA: (s) => ({ label: L(`Safe move (+${pts(s).small})`, `Jugada segura (+${pts(s).small})`), confirmsHigh: false }),
    optionB: () => ({ label: L("Bold move", "Jugada atrevida"), confirmsHigh: true }),
  },
  {
    id: "test_comp_share_win",
    dimension: "competitiveness",
    scenario: (n, s) => L(
      `${n} can win alone (+${pts(s).big}, full credit), or split a smaller win with a teammate (+${pts(s).small} each).`,
      `${n} puede ganar solo/a (+${pts(s).big}, todo el mérito), o repartir una victoria menor con un compañero (+${pts(s).small} cada uno).`,
    ),
    optionA: (s) => ({ label: L(`Win alone (+${pts(s).big})`, `Ganar solo/a (+${pts(s).big})`), confirmsHigh: true }),
    optionB: (s) => ({ label: L(`Share it (+${pts(s).small} each)`, `Repartirlo (+${pts(s).small} cada uno)`), confirmsHigh: false }),
  },

  // ---------------- COOPERATION ----------------
  {
    id: "test_coop_dilemma",
    dimension: "cooperation",
    scenario: (n, s) => L(
      `${n} is paired for a classic dilemma: both cooperate for +${pts(s).small} each, or betray for +${pts(s).big} if the other cooperates.`,
      `${n} entra en un dilema clásico: cooperar los dos por +${pts(s).small} cada uno, o traicionar por +${pts(s).big} si el otro coopera.`,
    ),
    optionA: () => ({ label: L("Cooperate", "Cooperar"), confirmsHigh: true }),
    optionB: (s) => ({ label: L(`Betray for +${pts(s).big}`, `Traicionar por +${pts(s).big}`), confirmsHigh: false }),
  },
  {
    id: "test_coop_group_task",
    dimension: "cooperation",
    scenario: (n, s) => L(
      `A group task pays +${pts(s).small} to everyone if they all pitch in, or ${n} can opt out and take +${pts(s).small} solo while the rest get less.`,
      `Una tarea de grupo paga +${pts(s).small} a todos si todos colaboran, o ${n} puede quedarse fuera y llevarse +${pts(s).small} solo/a mientras el resto recibe menos.`,
    ),
    optionA: () => ({ label: L("Pitch in", "Colaborar"), confirmsHigh: true }),
    optionB: (s) => ({ label: L(`Opt out (+${pts(s).small} solo)`, `Quedarse fuera (+${pts(s).small} solo/a)`), confirmsHigh: false }),
  },

  // ---------------- INDIVIDUALISM ----------------
  {
    id: "test_indiv_own_path",
    dimension: "individualism",
    scenario: (n, s) => L(
      `${n} can join the group's plan (+${pts(s).small}, shared credit), or go their own way for a shot at +${pts(s).big} alone.`,
      `${n} puede sumarse al plan del grupo (+${pts(s).small}, mérito compartido), o ir por libre a por +${pts(s).big} en solitario.`,
    ),
    optionA: (s) => ({ label: L(`Join the plan (+${pts(s).small})`, `Sumarse al plan (+${pts(s).small})`), confirmsHigh: false }),
    optionB: () => ({ label: L("Go their own way", "Ir por libre"), confirmsHigh: true }),
  },
  {
    id: "test_indiv_team_credit",
    dimension: "individualism",
    scenario: (n, s) => L(
      `${n} solved something useful. Credit the group (+${pts(s).small} to everyone), or claim it for themselves (+${pts(s).big} alone)?`,
      `${n} resolvió algo útil. ¿Se lo atribuye al grupo (+${pts(s).small} para todos), o se lo queda para sí mismo/a (+${pts(s).big} en solitario)?`,
    ),
    optionA: () => ({ label: L("Credit the group", "Atribuírselo al grupo"), confirmsHigh: false }),
    optionB: (s) => ({ label: L(`Claim it (+${pts(s).big})`, `Quedárselo (+${pts(s).big})`), confirmsHigh: true }),
  },

  // ---------------- CONFORMITY / CONTRARIANISM ----------------
  {
    id: "test_contra_break_pattern",
    dimension: "contrarianism",
    scenario: (n, s) => L(
      `Everyone else in the room already picked the same option. ${n} can match them for +${pts(s).small}, or be the one who breaks it for +${pts(s).big}.`,
      `Todos los demás de la sala ya eligieron la misma opción. ${n} puede sumarse por +${pts(s).small}, o ser quien la rompa por +${pts(s).big}.`,
    ),
    optionA: (s) => ({ label: L(`Match them (+${pts(s).small})`, `Sumarse (+${pts(s).small})`), confirmsHigh: false }),
    optionB: () => ({ label: L("Break the pattern", "Romper el patrón"), confirmsHigh: true }),
  },
  {
    id: "test_contra_unpopular_take",
    dimension: "contrarianism",
    scenario: (n, s) => L(
      `${n} can back the popular, comfortable answer, or stake out the unpopular one for +${pts(s).small} if it turns out to be right.`,
      `${n} puede respaldar la respuesta popular y cómoda, o defender la impopular por +${pts(s).small} si al final resulta acertada.`,
    ),
    optionA: () => ({ label: L("Back the popular answer", "Respaldar la respuesta popular"), confirmsHigh: false }),
    optionB: (s) => ({ label: L(`Stake out the unpopular one (+${pts(s).small})`, `Defender la impopular (+${pts(s).small})`), confirmsHigh: true }),
  },
  {
    id: "test_conf_with_room",
    dimension: "conformity",
    scenario: (n, s) => L(
      `The room is clearly leaning one way. ${n} can go with them (+${pts(s).small}), or break off alone for +${pts(s).big}.`,
      `La sala se inclina claramente hacia un lado. ${n} puede ir con ellos (+${pts(s).small}), o separarse solo/a por +${pts(s).big}.`,
    ),
    optionA: (s) => ({ label: L(`Go with the room (+${pts(s).small})`, `Ir con la sala (+${pts(s).small})`), confirmsHigh: true }),
    optionB: () => ({ label: L("Break off alone", "Separarse solo/a"), confirmsHigh: false }),
  },
  {
    id: "test_conf_after_seeing",
    dimension: "conformity",
    scenario: (n, s) => L(
      `${n} sees how most of the room already answered before locking in their own choice. Match them (+${pts(s).small}), or stick with a different pick (+${pts(s).big} if it's rarer)?`,
      `${n} ve cómo ha respondido la mayoría antes de fijar su elección. ¿Coincide con ellos (+${pts(s).small}), o se queda con otra opción (+${pts(s).big} si es más rara)?`,
    ),
    optionA: (s) => ({ label: L(`Match the room (+${pts(s).small})`, `Coincidir con la sala (+${pts(s).small})`), confirmsHigh: true }),
    optionB: () => ({ label: L("Stick with their own pick", "Quedarse con su elección"), confirmsHigh: false }),
  },

  // ---------------- PATIENCE / IMPULSIVITY ----------------
  {
    id: "test_pat_wait",
    dimension: "patience",
    scenario: (n, s) => L(
      `${n} can take +${pts(s).small} right now, or wait two rounds for +${pts(s).big}.`,
      `${n} puede llevarse +${pts(s).small} ahora mismo, o esperar dos rondas por +${pts(s).big}.`,
    ),
    optionA: (s) => ({ label: L(`Take +${pts(s).small} now`, `Llevarse +${pts(s).small} ahora`), confirmsHigh: false }),
    optionB: () => ({ label: L("Wait for more", "Esperar por más"), confirmsHigh: true }),
  },
  {
    id: "test_impulse_snap",
    dimension: "impulsivity",
    scenario: (n, s) => L(
      `${n} has 5 seconds to lock in a choice worth +${pts(s).big}, or take 20 seconds to think it through for a safer +${pts(s).small}.`,
      `${n} tiene 5 segundos para fijar una elección que vale +${pts(s).big}, o 20 segundos para pensarlo bien por un más seguro +${pts(s).small}.`,
    ),
    optionA: () => ({ label: L("Decide instantly", "Decidir al instante"), confirmsHigh: true }),
    optionB: (s) => ({ label: L(`Think it through (+${pts(s).small})`, `Pensarlo bien (+${pts(s).small})`), confirmsHigh: false }),
  },

  // ---------------- CONSISTENCY ----------------
  {
    id: "test_cons_repeat",
    dimension: "consistency",
    scenario: (n, s) => L(
      `${n} faces almost the exact same choice from earlier in the game. Repeat the same answer (+${pts(s).small}), or switch it up (+${pts(s).big})?`,
      `${n} se enfrenta casi a la misma elección de antes en la partida. ¿Repite la misma respuesta (+${pts(s).small}), o la cambia (+${pts(s).big})?`,
    ),
    optionA: (s) => ({ label: L(`Repeat it (+${pts(s).small})`, `Repetirla (+${pts(s).small})`), confirmsHigh: true }),
    optionB: () => ({ label: L("Switch it up", "Cambiarla"), confirmsHigh: false }),
  },

  // ---------------- SOCIAL ALIGNMENT ----------------
  {
    id: "test_align_read_room",
    dimension: "socialAlignment",
    scenario: (n, s) => L(
      `${n} can answer honestly, or adjust their answer to what they think the room wants to hear for +${pts(s).small}.`,
      `${n} puede responder con sinceridad, o ajustar su respuesta a lo que cree que la sala quiere oír por +${pts(s).small}.`,
    ),
    optionA: (s) => ({ label: L(`Adjust it (+${pts(s).small})`, `Ajustarla (+${pts(s).small})`), confirmsHigh: true }),
    optionB: () => ({ label: L("Answer honestly", "Responder con sinceridad"), confirmsHigh: false }),
  },
  {
    id: "test_align_fit_in",
    dimension: "socialAlignment",
    scenario: (n, s) => L(
      `${n} can pick the option that fits the room's mood (+${pts(s).small}), or the one that's true to how they actually feel (+${pts(s).big} if it turns out to be rare).`,
      `${n} puede elegir la opción que encaja con el ánimo de la sala (+${pts(s).small}), o la que refleja de verdad cómo se siente (+${pts(s).big} si resulta ser poco común).`,
    ),
    optionA: (s) => ({ label: L(`Fit the mood (+${pts(s).small})`, `Encajar con el ánimo (+${pts(s).small})`), confirmsHigh: true }),
    optionB: () => ({ label: L("Be true to themselves", "Ser fiel a sí mismo/a"), confirmsHigh: false }),
  },

  // ---------------- more LOYALTY / TRUST / MONEY / RISK / COMPETITION / COOPERATION / INDIVIDUALISM / CONFORMITY / PATIENCE / IMPULSIVITY / CONSISTENCY ----------------
  {
    id: "test_loy_split_credit",
    dimension: "loyalty",
    scenario: (n, s) => L(
      `${n} and an ally both worked toward a ${pts(s).big}-point win. ${n} decides how to split it.`,
      `${n} y un aliado trabajaron juntos por una victoria de ${pts(s).big} puntos. ${n} decide cómo repartirla.`,
    ),
    optionA: (s) => ({ label: L(`Split evenly (${Math.round(pts(s).big / 2)} each)`, `Repartir igual (${Math.round(pts(s).big / 2)} cada uno)`), confirmsHigh: true }),
    optionB: (s) => ({ label: L(`Keep most of it (${Math.round(pts(s).big * 0.75)} for me)`, `Quedarse la mayoría (${Math.round(pts(s).big * 0.75)} para mí)`), confirmsHigh: false }),
  },
  {
    id: "test_tru_first_move",
    dimension: "trust",
    scenario: (n, s) => L(
      `${n} can wait for someone else to move first (safe), or make the first move themselves for +${pts(s).small} extra.`,
      `${n} puede esperar a que otro se mueva primero (seguro), o mover primero por +${pts(s).small} extra.`,
    ),
    optionA: () => ({ label: L("Wait for someone else", "Esperar a que se mueva otro"), confirmsHigh: false }),
    optionB: (s) => ({ label: L(`Move first (+${pts(s).small})`, `Mover primero (+${pts(s).small})`), confirmsHigh: true }),
  },
  {
    id: "test_gre_last_slice",
    dimension: "greed",
    scenario: (n, s) => L(
      `There's one last bonus of ${pts(s).small} up for grabs and someone else clearly wants it too. ${n} decides.`,
      `Queda un último bonus de ${pts(s).small} disponible y otra persona claramente también lo quiere. ${n} decide.`,
    ),
    optionA: (s) => ({ label: L(`Take it (+${pts(s).small})`, `Cogerlo (+${pts(s).small})`), confirmsHigh: true }),
    optionB: () => ({ label: L("Let them have it", "Dejárselo"), confirmsHigh: false }),
  },
  {
    id: "test_risk_double_or_nothing",
    dimension: "risk",
    scenario: (n, s) => L(
      `${n} just won ${pts(s).small}. Bank it, or go double-or-nothing for ${pts(s).small * 2}?`,
      `${n} acaba de ganar ${pts(s).small}. ¿Lo guarda, o va a doble o nada por ${pts(s).small * 2}?`,
    ),
    optionA: (s) => ({ label: L(`Bank the ${pts(s).small}`, `Guardar los ${pts(s).small}`), confirmsHigh: false }),
    optionB: () => ({ label: L("Double or nothing", "Doble o nada"), confirmsHigh: true }),
  },
  {
    id: "test_comp_last_round",
    dimension: "competitiveness",
    scenario: (n, s) => L(
      `It's late in the game. ${n} can lock in a modest, certain gain (+${pts(s).small}), or push for a bigger lead (+${pts(s).big}, real risk of losing points instead).`,
      `Va avanzada la partida. ${n} puede asegurar una ganancia modesta (+${pts(s).small}), o buscar sacar más ventaja (+${pts(s).big}, riesgo real de perder puntos).`,
    ),
    optionA: (s) => ({ label: L(`Lock in +${pts(s).small}`, `Asegurar +${pts(s).small}`), confirmsHigh: false }),
    optionB: () => ({ label: L("Push for the lead", "Buscar la ventaja"), confirmsHigh: true }),
  },
  {
    id: "test_coop_public_pledge",
    dimension: "cooperation",
    scenario: (n, s) => L(
      `${n} can publicly pledge to help the group next round (binding, +${pts(s).small} to everyone if kept), or stay uncommitted and free to act alone.`,
      `${n} puede comprometerse en público a ayudar al grupo la próxima ronda (vinculante, +${pts(s).small} para todos si lo cumple), o no comprometerse y quedar libre para ir por su cuenta.`,
    ),
    optionA: () => ({ label: L("Make the pledge", "Comprometerse"), confirmsHigh: true }),
    optionB: () => ({ label: L("Stay free to act alone", "Quedar libre"), confirmsHigh: false }),
  },
  {
    id: "test_indiv_shared_glory",
    dimension: "individualism",
    scenario: (n, s) => L(
      `A plan works because of ${n}'s call. Let the group celebrate together, or make sure everyone knows it was ${n} for +${pts(s).small}?`,
      `Un plan sale bien gracias a la decisión de ${n}. ¿Deja que el grupo lo celebre junto, o se asegura de que todos sepan que fue cosa suya por +${pts(s).small}?`,
    ),
    optionA: () => ({ label: L("Let the group celebrate", "Dejar que el grupo lo celebre"), confirmsHigh: false }),
    optionB: (s) => ({ label: L(`Claim the credit (+${pts(s).small})`, `Reclamar el mérito (+${pts(s).small})`), confirmsHigh: true }),
  },
  {
    id: "test_conf_last_to_answer",
    dimension: "conformity",
    scenario: (n, s) => L(
      `${n} answers last and already knows how everyone else voted. Match the room (+${pts(s).small}), or go with their gut instead?`,
      `${n} responde el último y ya sabe cómo ha votado el resto. ¿Coincide con la sala (+${pts(s).small}), o va con su instinto?`,
    ),
    optionA: (s) => ({ label: L(`Match the room (+${pts(s).small})`, `Coincidir con la sala (+${pts(s).small})`), confirmsHigh: true }),
    optionB: () => ({ label: L("Go with their gut", "Ir con su instinto"), confirmsHigh: false }),
  },
  {
    id: "test_pat_slow_burn",
    dimension: "patience",
    scenario: (n, s) => L(
      `${n} can end this early for +${pts(s).small}, or let it play out over more rounds for a shot at +${pts(s).big}.`,
      `${n} puede terminar esto ya por +${pts(s).small}, o dejar que se alargue varias rondas más a por +${pts(s).big}.`,
    ),
    optionA: (s) => ({ label: L(`End it now (+${pts(s).small})`, `Terminarlo ya (+${pts(s).small})`), confirmsHigh: false }),
    optionB: () => ({ label: L("Let it play out", "Dejar que se alargue"), confirmsHigh: true }),
  },
  {
    id: "test_impulse_first_offer",
    dimension: "impulsivity",
    scenario: (n, s) => L(
      `${n} gets a first offer worth +${pts(s).small}. Take it immediately, or wait to see if a better one comes along?`,
      `A ${n} le llega una primera oferta de +${pts(s).small}. ¿La acepta al momento, o espera a ver si sale algo mejor?`,
    ),
    optionA: (s) => ({ label: L(`Take it now (+${pts(s).small})`, `Aceptarla ya (+${pts(s).small})`), confirmsHigh: true }),
    optionB: () => ({ label: L("Wait and see", "Esperar a ver"), confirmsHigh: false }),
  },
  {
    id: "test_cons_pattern_break",
    dimension: "consistency",
    scenario: (n, s) => L(
      `${n} has answered the same way all game. This round quietly rewards breaking the pattern with +${pts(s).small}.`,
      `${n} ha respondido igual toda la partida. Esta ronda premia en silencio romper el patrón con +${pts(s).small}.`,
    ),
    optionA: () => ({ label: L("Keep the same pattern", "Mantener el mismo patrón"), confirmsHigh: true }),
    optionB: (s) => ({ label: L(`Break it (+${pts(s).small})`, `Romperlo (+${pts(s).small})`), confirmsHigh: false }),
  },
];

export function templatesForDimension(dimension: Dimension): TestTemplate[] {
  return TEST_TEMPLATES.filter((t) => t.dimension === dimension);
}

// ---------------- Comparison tests (RELATIONSHIPS / SPICY) ----------------
// A forced choice between two named players instead of an A/B scenario.

export interface ComparisonTestTemplate {
  id: string;
  scenario: (target: string) => Localized;
}

export const COMPARISON_TEST_TEMPLATES: ComparisonTestTemplate[] = [
  {
    id: "cmp_protect",
    scenario: (n) => L(`${n} can only protect one player from losing points this round. Who?`, `${n} solo puede proteger a un jugador de perder puntos esta ronda. ¿A quién?`),
  },
  {
    id: "cmp_team_up",
    scenario: (n) => L(`${n} has to team up with exactly one other player for the next round. Who?`, `${n} tiene que formar equipo con exactamente otra persona para la próxima ronda. ¿Con quién?`),
  },
  {
    id: "cmp_give_points",
    scenario: (n) => L(`${n} has 200 points to give to exactly one other player. Who gets them?`, `${n} tiene 200 puntos para dar a una sola persona. ¿Quién se los lleva?`),
  },
  {
    id: "cmp_trust_secret",
    scenario: (n) => L(`${n} has to tell exactly one other player a real piece of information. Who?`, `${n} tiene que contarle a una sola persona una información real. ¿A quién?`),
  },
];
