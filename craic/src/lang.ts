// Idiomas que se pueden practicar. Todo lo que cambia entre inglés y francés
// (nombre para el modelo, reconocimiento, textos de la interfaz…) vive aquí.
export type TargetLang = "en" | "fr";

export interface LangInfo {
  /** Nombre del idioma para el modelo (en inglés) */
  name: string;
  /** Nombre en español para la interfaz */
  es: string;
  /** Idioma por defecto del reconocimiento de voz */
  sr: string;
  /** Texto de la caja de escribir durante la llamada */
  placeholder: string;
  /** «Call with Liam» / «Appel avec Camille» */
  callWith: string;
  /** Ejemplo para el prompt de traducción */
  translateExample: [string, string];
  /** Estilo por nivel */
  levelStyle: Record<"B1" | "B2" | "C1", string>;
  /** Frases de ejemplo para el prompt de correcciones */
  fewShot: [string, string][];
}

export const LANGS: Record<TargetLang, LangInfo> = {
  en: {
    name: "English",
    es: "inglés",
    sr: "en-GB",
    placeholder: "Write in English…",
    callWith: "Call with",
    translateExample: ["Do you fancy grabbing a coffee later?", "¿Te apetece tomar un café luego?"],
    levelStyle: {
      B1: "Simple everyday English (B1 level), common words.",
      B2: "Natural everyday English (B2 level), common phrasal verbs are fine.",
      C1: "Fully natural native English (C1 level), idioms welcome.",
    },
    fewShot: [
      [
        'Learner: "Yesterday I go to the beach and I like a lot."',
        '{"errors":[{"original":"I go","corrected":"I went","explanation":"Con \'yesterday\' va pasado: go → went.","type":"tiempo verbal"},{"original":"I like a lot","corrected":"I really liked it","explanation":"\'Like\' necesita objeto (it) y va en pasado.","type":"gramática"}],"tip":""}',
      ],
      [
        'Learner: "I am studying engineering here."',
        '{"errors":[],"tip":"¡Perfecto! Suena más natural con contracción: \\"I\'m studying engineering here.\\""}',
      ],
    ],
  },
  fr: {
    name: "French",
    es: "francés",
    sr: "fr-FR",
    placeholder: "Écris en français…",
    callWith: "Appel avec",
    translateExample: ["Ça te dirait d'aller boire un café tout à l'heure ?", "¿Te apetece tomar un café luego?"],
    levelStyle: {
      B1: "Simple everyday French (B1 level), common words, short sentences.",
      B2: "Natural everyday French (B2 level), common expressions are fine.",
      C1: "Fully natural native French (C1 level), idioms and familiar French welcome.",
    },
    fewShot: [
      [
        'Learner: "Hier je vais à la plage et je suis très content de la mer."',
        '{"errors":[{"original":"je vais","corrected":"je suis allé","explanation":"Con «hier» va en passé composé: je suis allé.","type":"tiempo verbal"},{"original":"content de la mer","corrected":"j\'ai adoré la mer","explanation":"«Content de» suena raro aquí; lo natural es «j\'ai adoré».","type":"vocabulario"}],"tip":""}',
      ],
      [
        'Learner: "J\'étudie l\'ingénierie à Cordoue."',
        '{"errors":[],"tip":"¡Perfecto! También se dice «Je fais des études d\'ingénieur à Cordoue»."}',
      ],
    ],
  },
};

export const langOf = (c: { lang?: TargetLang }): TargetLang => c.lang ?? "en";
export const infoOf = (c: { lang?: TargetLang }): LangInfo => LANGS[langOf(c)];
