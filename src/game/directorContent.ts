import type { Dimension, Localized, QuestionOption } from "./types";

// ─────────────────────────────────────────────────────────────
// Bilingual content for the AI-director mechanics. Hand-written.
// The director picks WHICH of these to use and WHO to target,
// from real behavioural data.
// ─────────────────────────────────────────────────────────────

const L = (en: string, es: string): Localized => ({ en, es });

// ---------- INTERROGATION ----------
// The AI names a target and an accusation drawn from their profile.
// They defend out loud; the room rates and judges.

export interface Accusation {
  dimension: Dimension;
  /** true = high value on the dimension triggers this, false = low value */
  high: boolean;
  line: (name: string) => Localized;
}

export const ACCUSATIONS: Accusation[] = [
  {
    dimension: "competitiveness",
    high: true,
    line: (n) => L(`${n}, the room thinks you'd burn everyone here to win. Defend yourself.`, `${n}, la sala cree que quemarías a todos los de aquí por ganar. Defiéndete.`),
  },
  {
    dimension: "loyalty",
    high: false,
    line: (n) => L(`${n}, they think you switch sides the second it pays. Talk them out of it.`, `${n}, creen que cambias de bando en cuanto compensa. Convéncelos de lo contrario.`),
  },
  {
    dimension: "cooperation",
    high: false,
    line: (n) => L(`${n}, the room says you only ever play for your own score. Prove them wrong.`, `${n}, la sala dice que solo juegas para tu puntuación. Demuéstrales que se equivocan.`),
  },
  {
    dimension: "contrarianism",
    high: true,
    line: (n) => L(`${n}, they think you argue just to argue. Make your case.`, `${n}, creen que llevas la contraria solo por deporte. Argumenta.`),
  },
  {
    dimension: "risk",
    high: true,
    line: (n) => L(`${n}, the room thinks you gamble with everyone's chips, not just yours. Answer for it.`, `${n}, la sala cree que apuestas con las fichas de todos, no solo con las tuyas. Responde.`),
  },
  {
    dimension: "greed",
    high: true,
    line: (n) => L(`${n}, they say you take the bigger slice every single time. Deny it.`, `${n}, dicen que te quedas la parte más grande siempre. Niégalo.`),
  },
  {
    dimension: "trust",
    high: false,
    line: (n) => L(`${n}, the room thinks you trust nobody here. Tell them why they're wrong.`, `${n}, la sala cree que no te fías de nadie. Diles por qué se equivocan.`),
  },
  {
    dimension: "conformity",
    high: true,
    line: (n) => L(`${n}, they think you just follow whoever's loudest. Show some spine.`, `${n}, creen que solo sigues al que más grita. Demuestra carácter.`),
  },
  {
    dimension: "individualism",
    high: true,
    line: (n) => L(`${n}, the room says you're playing your own game and don't care about the rest. Explain.`, `${n}, la sala dice que juegas a tu propio juego y el resto te da igual. Explícate.`),
  },
];

/** Generic accusation used when the AI has no confident read yet, or for suspicion. */
export const GENERIC_ACCUSATIONS: ((name: string) => Localized)[] = [
  (n) => L(`${n}, something about how you've been playing doesn't add up. The room wants an explanation.`, `${n}, algo de cómo estás jugando no cuadra. La sala quiere una explicación.`),
  (n) => L(`${n}, you've been quiet at exactly the wrong moments. Talk.`, `${n}, has estado callado justo en los peores momentos. Habla.`),
  (n) => L(`${n}, the room has a bad feeling about you. Change their minds. 45 seconds.`, `${n}, la sala tiene un mal presentimiento contigo. Cámbialo. 45 segundos.`),
];

export function consequenceOptions(name: string): QuestionOption[] {
  return [
    { id: "believe", label: L(`We believe ${name}`, `Le creemos a ${name}`), tags: {} },
    { id: "lying", label: L(`${name} is lying`, `${name} miente`), tags: {} },
    { id: "exile", label: L(`Make ${name} sit out the next round`, `Que ${name} se salte la próxima ronda`), tags: {} },
  ];
}

// ---------- DEAL ----------

export const DEAL_TASKS: { id: string; task: Localized; reward: number }[] = [
  {
    id: "same_choice",
    task: L(
      "Both of you must secretly pick the SAME option (A or B) in this round — without making it obvious.",
      "Los dos tenéis que elegir en secreto la MISMA opción (A o B) en esta ronda, sin que se note.",
    ),
    reward: 400,
  },
  {
    id: "both_bold",
    task: L(
      "Both of you must pick the bold option (B). Look like you decided alone.",
      "Los dos tenéis que elegir la opción atrevida (B). Que parezca que lo decidisteis solos.",
    ),
    reward: 350,
  },
  {
    id: "both_safe",
    task: L(
      "Both of you must pick the safe option (A). Don't look at each other.",
      "Los dos tenéis que elegir la opción segura (A). No os miréis.",
    ),
    reward: 350,
  },
];

export function dealChoiceOptions(): QuestionOption[] {
  return [
    { id: "A", label: L("A — play it safe", "A — a lo seguro"), tags: { risk: -0.4 } },
    { id: "B", label: L("B — go bold", "B — a por todas"), tags: { risk: 0.4 } },
  ];
}

// ---------- PROPHECY ----------

export const PROPHECIES: {
  id: string;
  /** the binary the subject faces */
  prompt: Localized;
  options: [QuestionOption, QuestionOption];
  /** which option the AI predicts (index) — chosen by the director from data */
  call: (name: string, predictBold: boolean) => Localized;
}[] = [
  {
    id: "risk_it",
    prompt: L("Keep 200 guaranteed points, or risk them all for a shot at 600?", "¿200 puntos garantizados, o los arriesgas todos por una opción a 600?"),
    options: [
      { id: "A", label: L("Keep the 200", "Quedarme los 200"), tags: { risk: -0.7 } },
      { id: "B", label: L("Risk it all", "Arriesgarlo todo"), tags: { risk: 0.7 } },
    ],
    call: (n, bold) =>
      bold
        ? L(`I predict ${n} risks it all. ${n} can't help themselves.`, `Predigo que ${n} lo arriesga todo. ${n} no puede evitarlo.`)
        : L(`I predict ${n} keeps the 200. ${n} plays it safe when it counts.`, `Predigo que ${n} se queda los 200. ${n} juega seguro cuando importa.`),
  },
  {
    id: "with_room",
    prompt: L("The room is leaning one way. Go with them, or break off alone for a bigger reward?", "La sala se inclina hacia un lado. ¿Vas con ellos, o te separas solo por más recompensa?"),
    options: [
      { id: "A", label: L("Go with the room", "Ir con la sala"), tags: { conformity: 0.7 } },
      { id: "B", label: L("Break off alone", "Separarme solo"), tags: { contrarianism: 0.7 } },
    ],
    call: (n, bold) =>
      bold
        ? L(`I predict ${n} breaks off alone. ${n} doesn't follow.`, `Predigo que ${n} se separa solo. ${n} no sigue a nadie.`)
        : L(`I predict ${n} goes with the room. ${n} won't stand out.`, `Predigo que ${n} va con la sala. ${n} no destacará.`),
  },
  {
    id: "betray_ally",
    prompt: L("You can lock in +150 with the person you trust most, or take +300 by cutting them out.", "Puedes asegurar +150 con la persona en quien más confías, o llevarte +300 dejándola fuera."),
    options: [
      { id: "A", label: L("Stay loyal (+150)", "Seguir leal (+150)"), tags: { loyalty: 0.7 } },
      { id: "B", label: L("Cut them out (+300)", "Dejarla fuera (+300)"), tags: { loyalty: -0.7, greed: 0.5 } },
    ],
    call: (n, bold) =>
      bold
        ? L(`I predict ${n} cuts their ally out. When it pays, ${n} does it.`, `Predigo que ${n} deja fuera a su aliado. Cuando compensa, ${n} lo hace.`)
        : L(`I predict ${n} stays loyal. ${n} won't break it.`, `Predigo que ${n} sigue leal. ${n} no la rompe.`),
  },
  {
    id: "make_a_move",
    prompt: L("Someone here catches your eye tonight. Do you say something, or keep it to yourself?", "Alguien de aquí te llama la atención esta noche. ¿Se lo dices, o te lo callas?"),
    options: [
      { id: "A", label: L("Keep it to myself", "Me lo callo"), tags: { risk: -0.6, impulsivity: -0.5 } },
      { id: "B", label: L("Say something", "Se lo digo"), tags: { risk: 0.7, impulsivity: 0.6 } },
    ],
    call: (n, bold) =>
      bold
        ? L(`I predict ${n} says something. ${n} doesn't sit on it.`, `Predigo que ${n} dice algo. ${n} no se lo guarda.`)
        : L(`I predict ${n} keeps it to themselves. ${n} plays it close.`, `Predigo que ${n} se lo calla. ${n} lo lleva por dentro.`),
  },
  {
    id: "public_or_private",
    prompt: L("You can win +150 quietly, or +350 if you announce it to the whole room first.", "Puedes ganar +150 en silencio, o +350 si lo anuncias antes a toda la sala."),
    options: [
      { id: "A", label: L("Quietly (+150)", "En silencio (+150)"), tags: { individualism: 0.3, risk: -0.4 } },
      { id: "B", label: L("Announce it (+350)", "Anunciarlo (+350)"), tags: { risk: 0.7, impulsivity: 0.5, socialAlignment: 0.3 } },
    ],
    call: (n, bold) =>
      bold
        ? L(`I predict ${n} announces it. ${n} wants the room watching.`, `Predigo que ${n} lo anuncia. ${n} quiere que la sala mire.`)
        : L(`I predict ${n} keeps it quiet. ${n} doesn't need an audience.`, `Predigo que ${n} lo hace en silencio. ${n} no necesita público.`),
  },
];

export function prophecyBetOptions(): QuestionOption[] {
  return [
    { id: "yes", label: L("The AI is right", "La IA acierta"), tags: {} },
    { id: "no", label: L("The AI is wrong", "La IA falla"), tags: {} },
  ];
}

// ---------- MOVEMENT (physical) ----------

export const MOVEMENT_STATEMENTS: Localized[] = [
  L("You would sacrifice the group to win.", "Sacrificarías al grupo por ganar."),
  L("You've lied to someone in this room tonight.", "Has mentido a alguien de esta sala esta noche."),
  L("You trust the person on your right.", "Confías en la persona a tu derecha."),
  L("You'd break a deal if nobody found out.", "Romperías un pacto si nadie se enterara."),
  L("There is someone here you do not trust.", "Hay alguien aquí en quien no confías."),
  L("You'd play with this exact group again.", "Volverías a jugar con este grupo exacto."),
  L("You've already picked who you want to lose.", "Ya has decidido a quién quieres que pierda."),
  L("You care more about winning than about being liked.", "Te importa más ganar que caer bien."),
  L("You've had a crush on someone in this exact room.", "Has tenido un crush con alguien de esta sala exacta."),
  L("You'd rather be right than be liked.", "Prefieres tener razón antes que caer bien."),
  L("You've stalked someone's social media tonight.", "Has cotilleado las redes de alguien esta noche."),
  L("Someone here could talk you into almost anything.", "Alguien de aquí te podría convencer de casi cualquier cosa."),
  L("You've pretended to like a gift more than you did.", "Has fingido que un regalo te gustaba más de lo que te gustaba."),
  L("You'd rather know an uncomfortable truth than a comfortable lie.", "Prefieres saber una verdad incómoda antes que una mentira cómoda."),
  L("There's someone in this room you'd trust with a secret nobody else knows.", "Hay alguien en esta sala a quien confiarías un secreto que nadie más sabe."),
  L("You've flirted with someone just to see if it would work.", "Has ligado con alguien solo para ver si funcionaba."),
];

export function movementOptions(): QuestionOption[] {
  return [
    { id: "A", label: L("Move LEFT — yes, that's me", "IZQUIERDA — sí, ese soy yo"), tags: {} },
    { id: "B", label: L("Move RIGHT — no, not me", "DERECHA — no, ese no soy yo"), tags: {} },
  ];
}

// ---------- TALK PROMPTS (shown big on the stage) ----------

export const TALK = {
  open: L("Talk it out. Out loud. The AI is listening.", "Habladlo. En voz alta. La IA escucha."),
  defend: L("Defend yourself. The room is judging.", "Defiéndete. La sala te juzga."),
  convince: L("30 seconds — convince someone to switch sides.", "30 segundos — convenced a alguien de que se cambie de lado."),
  negotiate: L("Negotiate. Out loud or in a whisper.", "Negociad. En voz alta o al oído."),
  react: L("React. Say something. The AI wants to see the room move.", "Reaccionad. Decid algo. La IA quiere ver moverse la sala."),
};

// ---------- THE THRONE ----------
// One seat, real power (double points while held). The room can vote
// to overthrow whoever's on it, but only after they've defended it
// out loud.

export function throneClaimBody(): Localized {
  return L(
    "The throne is empty. Whoever wins it doubles every point they score while they hold it.",
    "El trono está vacío. Quien lo gane dobla cada punto que consiga mientras lo lleve.",
  );
}

export function throneClaimTalk(): Localized {
  return L(
    "Make your case — out loud — for why it should be you.",
    "Defended en voz alta por qué debería ser vuestro.",
  );
}

export function throneChallengeBody(holder: string): Localized {
  return L(
    `${holder} holds the throne — double points, every round. Does the room let them keep it?`,
    `${holder} lleva el trono — puntos dobles, cada ronda. ¿La sala le deja seguir?`,
  );
}

export function throneChallengeTalk(holder: string): Localized {
  return L(
    `${holder} defends the throne. Anyone who wants it, speak up now.`,
    `${holder} defiende el trono. Quien lo quiera, que hable ahora.`,
  );
}

export function throneStageInstruction(): Localized {
  return L("Vote for who deserves the throne.", "Votad quién merece el trono.");
}

// ---------- THE WHISPER NETWORK ----------
// One player is privately the mole; a couple of others get real,
// privately delivered intel. Everyone talks, then the room votes
// on who the mole is.

export function moleBriefing(): Localized {
  return L(
    "You're the mole this round. Nobody else knows. Muddy the water — but don't get caught.",
    "Esta ronda eres el topo. Nadie más lo sabe. Enturbia el ambiente — que no te pillen.",
  );
}

export function whisperOutsiderHint(): Localized {
  return L(
    "Someone here is playing their own game tonight. Talk. Figure out who.",
    "Alguien aquí juega esta noche a su propio juego. Hablad. Averiguad quién.",
  );
}

export function whisperTalkPrompt(): Localized {
  return L(
    "Trade what you know. Out loud, or lean in and whisper it.",
    "Intercambiad lo que sabéis. En voz alta, o inclinaos y susurradlo.",
  );
}

export function whoIsMolePrompt(): Localized {
  return L("Who is the mole?", "¿Quién es el topo?");
}

// ---------- CHEMISTRY ----------
// The AI puts its most-compatible pair on the spot: both answer the same
// private question at once, in front of everyone. The room bets on whether
// they'll match.

export function chemistryCallout(n1: string, n2: string): Localized {
  return L(
    `I've noticed ${n1} and ${n2} keep landing on the same side. Let's see if that's real.`,
    `He notado que ${n1} y ${n2} llevan cayendo del mismo lado. Vamos a ver si es real.`,
  );
}

export function chemistryTalk(n1: string, n2: string): Localized {
  return L(
    `${n1}, ${n2} — no talking, no looking at each other. Everyone else: get ready to bet.`,
    `${n1}, ${n2} — sin hablar, sin miraros. El resto: preparaos para apostar.`,
  );
}

export function chemistryStageInstruction(n1: string, n2: string): Localized {
  return L(
    `${n1} and ${n2} answer in secret. Everyone else: will they match?`,
    `${n1} y ${n2} responden en secreto. El resto: ¿coincidirán?`,
  );
}

export function chemistryBetOptions(): QuestionOption[] {
  return [
    { id: "yes", label: L("They'll match", "Van a coincidir"), tags: {} },
    { id: "no", label: L("No chance", "Ni de broma"), tags: {} },
  ];
}

// ---------- FACE-OFF ----------
// The AI puts two players head-to-head on a provocative comparison.
// Everyone else votes; the contestants don't vote on themselves.

export interface FaceoffPrompt {
  id: string;
  prompt: (n1: string, n2: string) => Localized;
  talk: (n1: string, n2: string) => Localized;
  stage: (n1: string, n2: string) => Localized;
}

export const FACEOFF_PROMPTS: FaceoffPrompt[] = [
  {
    id: "fake",
    prompt: (n1, n2) => L(`${n1} or ${n2} — who's faker?`, `${n1} o ${n2} — ¿quién es más falso?`),
    talk: (n1, n2) => L(`${n1}, ${n2} — make your case. Everyone else decides.`, `${n1}, ${n2} — defendeos. El resto decide.`),
    stage: (n1, n2) => L(`Vote: ${n1} or ${n2}?`, `Votad: ¿${n1} o ${n2}?`),
  },
  {
    id: "self_interest",
    prompt: (n1, n2) => L(`${n1} or ${n2} — who'd sell the group out first?`, `${n1} o ${n2} — ¿quién vendería antes al grupo?`),
    talk: (n1, n2) => L(`${n1}, ${n2} — 20 seconds each to argue it's not you.`, `${n1}, ${n2} — 20 segundos cada uno para defender que no sois vosotros.`),
    stage: (n1, n2) => L(`Vote: ${n1} or ${n2}?`, `Votad: ¿${n1} o ${n2}?`),
  },
  {
    id: "unreadable",
    prompt: (n1, n2) => L(`${n1} or ${n2} — who's harder to actually trust?`, `${n1} o ${n2} — ¿de quién te fías menos de verdad?`),
    talk: (n1, n2) => L(`${n1}, ${n2} — the room is deciding right now.`, `${n1}, ${n2} — la sala está decidiendo ahora mismo.`),
    stage: (n1, n2) => L(`Vote: ${n1} or ${n2}?`, `Votad: ¿${n1} o ${n2}?`),
  },
  {
    id: "loudest",
    prompt: (n1, n2) => L(`${n1} or ${n2} — who's been playing everyone else this whole time?`, `${n1} o ${n2} — ¿quién ha estado jugando con el resto toda la noche?`),
    talk: (n1, n2) => L(`${n1}, ${n2} — face each other. Talk it out.`, `${n1}, ${n2} — encaraos. Habladlo.`),
    stage: (n1, n2) => L(`Vote: ${n1} or ${n2}?`, `Votad: ¿${n1} o ${n2}?`),
  },
  {
    id: "better_flirt",
    prompt: (n1, n2) => L(`${n1} or ${n2} — who's the better flirt?`, `${n1} o ${n2} — ¿quién liga mejor?`),
    talk: (n1, n2) => L(`${n1}, ${n2} — prove it, right now, out loud.`, `${n1}, ${n2} — demostradlo, ahora mismo, en voz alta.`),
    stage: (n1, n2) => L(`Vote: ${n1} or ${n2}?`, `Votad: ¿${n1} o ${n2}?`),
  },
  {
    id: "would_you_rather_date",
    prompt: (n1, n2) => L(`${n1} or ${n2} — if you had to date one of them, who?`, `${n1} o ${n2} — si tuvieras que salir con uno de los dos, ¿con quién?`),
    talk: (n1, n2) => L(`${n1}, ${n2} — sell yourselves. 15 seconds each.`, `${n1}, ${n2} — vendeos. 15 segundos cada uno.`),
    stage: (n1, n2) => L(`Vote: ${n1} or ${n2}?`, `Votad: ¿${n1} o ${n2}?`),
  },
  {
    id: "worst_ex",
    prompt: (n1, n2) => L(`${n1} or ${n2} — who'd make the worse ex?`, `${n1} o ${n2} — ¿quién sería peor ex?`),
    talk: (n1, n2) => L(`${n1}, ${n2} — defend your honor.`, `${n1}, ${n2} — defended vuestro honor.`),
    stage: (n1, n2) => L(`Vote: ${n1} or ${n2}?`, `Votad: ¿${n1} o ${n2}?`),
  },
  {
    id: "most_likely_secret",
    prompt: (n1, n2) => L(`${n1} or ${n2} — who's hiding the bigger secret tonight?`, `${n1} o ${n2} — ¿quién esconde el secreto más gordo esta noche?`),
    talk: (n1, n2) => L(`${n1}, ${n2} — 20 seconds to convince the room it's not you.`, `${n1}, ${n2} — 20 segundos para convencer a la sala de que no sois vosotros.`),
    stage: (n1, n2) => L(`Vote: ${n1} or ${n2}?`, `Votad: ¿${n1} o ${n2}?`),
  },
];

export function faceoffOptions(n1: string, id1: string, n2: string, id2: string): QuestionOption[] {
  return [
    { id: id1, label: L(n1, n1), tags: {} },
    { id: id2, label: L(n2, n2), tags: {} },
  ];
}

// ---------- WARM-UP (director gathers data quietly) ----------

export const WARMUP_FOCUS: Dimension[][] = [
  ["risk", "impulsivity", "greed"],
  ["cooperation", "loyalty", "individualism"],
  ["conformity", "contrarianism"],
];
