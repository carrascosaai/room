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
  /** Temas para ir cambiando de conversación (cada pocas intervenciones) */
  topics?: string[];
}

/** Temas de «De todo»: el personaje va saltando de uno a otro como en una charla real. */
export const EVERYDAY_TOPICS = [
  "their hometown and what it's like to live there",
  "food they love and hate, and cooking",
  "music: what they listen to, concerts, favourite bands",
  "films and TV series they're watching",
  "sport and staying fit",
  "travel: best trip ever and dream destination",
  "their studies or job, and what a normal day looks like",
  "family and friends",
  "weekend plans and what they did last weekend",
  "childhood memories",
  "hobbies and free time",
  "technology, phones and social media",
  "artificial intelligence and the future",
  "their dreams and plans for the next five years",
  "a funny or embarrassing story",
  "Spanish traditions and festivals (Semana Santa, Feria, Christmas)",
  "differences between Spain and your country",
  "pets and animals",
  "books, podcasts or video games",
  "a 'what would you do if…' hypothetical question (winning the lottery, a superpower, living abroad)",
  "the weather and their favourite season",
  "fashion and shopping habits",
  "learning English: what's hard and why they're learning",
  "cars, transport and getting around",
  "the environment and climate change",
  "healthy habits, sleep and stress",
  "money: saving, spending and first jobs",
  "an unpopular opinion they have",
  "the best advice they've ever received",
  "their favourite place to relax",
  "celebrities, influencers and the news",
  "house, flatmates and living alone vs with family",
];

export const SCENARIOS: Scenario[] = [
  {
    id: "free",
    kind: "casual",
    emoji: "🌍",
    title: "De todo",
    goal: "Charla de persona a persona: te pregunta de todo y va cambiando de tema",
    setting:
      "A relaxed chat between two people getting to know each other. Talk about anything. Share your own opinions and little stories from your life, answer their questions properly, and ask about them. After two or three exchanges on one topic, move naturally to a different one.",
    openers: [],
    topics: EVERYDAY_TOPICS,
  },
  {
    id: "opinions",
    kind: "casual",
    emoji: "🗣️",
    title: "Opiniones y debate",
    goal: "Dar tu opinión, estar de acuerdo o no, argumentar",
    setting:
      "You enjoy friendly debates. Give a clear opinion on one topic at a time (social media, working from home, tourism, AI, city vs village life, school uniforms…), ask what they think, and gently push back so they have to explain why.",
    openers: [
      "Okay, quick question, and be honest: do you think social media makes people happier or unhappier?",
      "I've got a debate for you. Is it better to live in a big city or in a small village?",
    ],
  },
  {
    id: "whatif",
    kind: "casual",
    emoji: "🎲",
    title: "¿Qué harías si…?",
    goal: "Condicionales (would, if I were…) e imaginación",
    setting:
      "You play a fun game of hypothetical questions: winning the lottery, having a superpower, living in another century, being invisible for a day, being president… Answer your own questions too, and ask one at a time.",
    openers: [
      "Let's play a game. If you won a million euros tomorrow, what's the first thing you'd do?",
      "Here's one for you: if you could have any superpower, which one would you pick?",
    ],
  },
  {
    id: "screens",
    kind: "casual",
    emoji: "🎬",
    title: "Series, música y pelis",
    goal: "Recomendar, describir argumentos y gustos",
    setting:
      "You chat about films, series, music and video games: what you're watching or listening to, recommendations, favourite characters, and describing plots without spoilers.",
    openers: [
      "I need a new series to watch. What have you been watching lately?",
      "What kind of music do you listen to? I'm always looking for new stuff.",
    ],
  },
  {
    id: "sports",
    kind: "casual",
    emoji: "⚽",
    title: "Deporte",
    goal: "Hablar de equipos, partidos, entrenar y rutinas",
    setting:
      "You chat about sport: teams you support, big matches, the sports you play, the gym, running, and sport in Spain versus your country.",
    openers: [
      "Do you play any sports, or are you more of a watch-it-on-the-sofa kind of person?",
      "Did you see any football this weekend? Who do you support?",
    ],
  },
  {
    id: "past",
    kind: "casual",
    emoji: "🕰️",
    title: "Recuerdos",
    goal: "Pasado simple, used to y anécdotas",
    setting:
      "You swap memories: childhood, school, first jobs, holidays when you were little, funny or embarrassing moments. Tell short anecdotes of your own and ask for theirs.",
    openers: [
      "What were you like as a kid? I bet you were a bit of a troublemaker.",
      "What's your best memory from school?",
    ],
  },
  {
    id: "future",
    kind: "casual",
    emoji: "🚀",
    title: "Sueños y futuro",
    goal: "Futuro, planes, predicciones y ambiciones",
    setting:
      "You chat about the future: plans for next year, dream jobs, places to live, goals, and predictions about technology and the world in 20 years.",
    openers: [
      "Where do you see yourself in five years? Be honest, even if it's crazy.",
      "If you could have any job in the world, what would it be?",
    ],
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
    title: "Estudios y trabajo",
    goal: "Explicar lo que estudias o en qué trabajas, proyectos y planes",
    setting:
      "You are curious about what the student studies or works on. Ask about their subjects or job, projects, what is hard, what they enjoy, what they want to do in the future and whether they'd like to work abroad. Share a bit about your own job too.",
    openers: [
      "So tell me, are you studying or working at the moment? What do you do?",
      "I've always wondered what people's jobs are really like. What does a normal day look like for you?",
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
