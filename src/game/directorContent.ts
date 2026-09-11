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

// ---------- WARM-UP (director gathers data quietly) ----------

export const WARMUP_FOCUS: Dimension[][] = [
  ["risk", "impulsivity", "greed"],
  ["cooperation", "loyalty", "individualism"],
  ["conformity", "contrarianism"],
];
