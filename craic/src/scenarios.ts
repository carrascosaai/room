// Situaciones de role-play. Cada una cambia el contexto del personaje y
// empieza con una frase preparada (instantánea y sin errores).

export type ScenarioKind = "casual" | "interview";

export interface Scenario {
  id: string;
  kind: ScenarioKind;
  emoji: string;
  title: string;
  /** Qué practicas (en español, se muestra en la interfaz) */
  goal: string;
  /** Contexto para el modelo (en inglés). Vacío = charla libre. */
  setting: string;
  /** Frases de apertura; vacío = usar las del personaje */
  openers: string[];
}

export const SCENARIOS: Scenario[] = [
  {
    id: "free",
    kind: "casual",
    emoji: "💬",
    title: "Charla libre",
    goal: "Conversación natural sobre lo que surja",
    setting: "",
    openers: [],
  },
  {
    id: "tapas",
    kind: "casual",
    emoji: "🍤",
    title: "De tapas",
    goal: "Recomendar comida, pedir y hablar de gustos",
    setting:
      "You are sitting with the student at a busy tapas bar in Córdoba. The menu is only in Spanish and you don't know most of the dishes, so you ask them to recommend food and explain what things are. Later you order and chat about the food.",
    openers: [
      "Right, I'm starving, but this menu is all in Spanish. What would you recommend?",
      "Okay, I have no idea what half of these tapas are. What's salmorejo?",
    ],
  },
  {
    id: "directions",
    kind: "casual",
    emoji: "🗺️",
    title: "Dar indicaciones",
    goal: "Explicar cómo llegar a sitios, usar imperativos y preposiciones",
    setting:
      "You are lost in the old town of Córdoba and you stop the student in the street to ask for directions. You want to get to different places (the Mezquita, the Roman bridge, the train station, a good pharmacy). Ask follow-up questions if the directions are not clear.",
    openers: [
      "Sorry to bother you, I think I'm a bit lost. How do I get to the Mezquita from here?",
      "Excuse me, do you know where the train station is? My phone just died.",
    ],
  },
  {
    id: "weekend",
    kind: "casual",
    emoji: "📅",
    title: "Planes del finde",
    goal: "Proponer planes, futuro (going to / will) y quedar",
    setting:
      "You and the student are making plans for this weekend together. Suggest ideas, react to theirs, and agree on a time and place to meet.",
    openers: [
      "So, I'm free this weekend and I want to do something fun. Any plans?",
      "I was thinking we could do something together on Saturday. What do you fancy doing?",
    ],
  },
  {
    id: "travel",
    kind: "casual",
    emoji: "✈️",
    title: "Viajes y experiencias",
    goal: "Contar historias en pasado y hablar de experiencias",
    setting:
      "You are swapping travel stories with the student. Ask about places they have been, what happened, what they liked, and share short stories of your own trips.",
    openers: [
      "I love travelling. What's the best trip you've ever been on?",
      "Have you ever been abroad? I want to hear a good travel story.",
    ],
  },
  {
    id: "studies",
    kind: "casual",
    emoji: "🛠️",
    title: "Tu carrera",
    goal: "Explicar tus estudios, proyectos y planes de futuro",
    setting:
      "You are curious about the student's engineering degree. Ask about their subjects, projects, what is hard, what they want to do in the future, and whether they'd like to work abroad.",
    openers: [
      "So you're studying engineering? That sounds tough. What kind of engineering is it?",
      "I've always wondered what engineers actually study. What are you working on at the moment?",
    ],
  },
  {
    id: "problem",
    kind: "casual",
    emoji: "🆘",
    title: "Resolver un problema",
    goal: "Dar consejos, sugerir soluciones (should, could, why don't you…)",
    setting:
      "You have a small problem and you need the student's help and advice: you lost your wallet, then you need a doctor for a bad sunburn, then your hostel booking was cancelled. Explain one problem at a time and react to their suggestions.",
    openers: [
      "Oh no, I think I've lost my wallet. I had it at the café an hour ago. What should I do?",
      "Ugh, I fell asleep by the pool and now I'm completely sunburnt. Where can I get something for it?",
    ],
  },
  {
    id: "interview",
    kind: "interview",
    emoji: "💼",
    title: "Entrevista general",
    goal: "Presentarte, motivación, puntos fuertes y débiles",
    setting: "",
    openers: [],
  },
  {
    id: "technical",
    kind: "interview",
    emoji: "⚙️",
    title: "Entrevista técnica",
    goal: "Explicar un proyecto técnico, decisiones y problemas resueltos",
    setting:
      "This part of the interview is technical. Ask the candidate to explain an engineering project in detail: the goal, their role, technical decisions, tools, problems they found and how they solved them, and what they would improve. Ask for clarification when answers are vague.",
    openers: [
      "Let's get a bit more technical. Could you walk me through an engineering project you're proud of?",
    ],
  },
  {
    id: "behavioural",
    kind: "interview",
    emoji: "🧩",
    title: "Preguntas de situación",
    goal: "Responder con el método STAR: situación, tarea, acción, resultado",
    setting:
      "Ask behavioural interview questions, one at a time: a time they worked in a team with a conflict, a time they made a mistake, a time they had a tight deadline, a time they showed leadership. Encourage concrete examples (situation, task, action, result).",
    openers: ["Tell me about a time you had to work in a team and something went wrong. What happened?"],
  },
];

export function scenariosFor(kind: ScenarioKind): Scenario[] {
  return SCENARIOS.filter((s) => s.kind === kind);
}

export function getScenario(id: string, kind: ScenarioKind): Scenario {
  const list = scenariosFor(kind);
  return list.find((s) => s.id === id) ?? list[0];
}
