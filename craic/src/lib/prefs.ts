import type { Level } from "../characters";
import type { ModelTier } from "../llm/models";
import type { SpeechRate } from "../speech/tts";

export interface Prefs {
  tier: ModelTier;
  rate: SpeechRate;
  level: Level;
  characterId: string;
  theme: "auto" | "light" | "dark";
}

const KEY = "craic:prefs";
const DEFAULTS: Prefs = { tier: "light", rate: "normal", level: "B1", characterId: "liam", theme: "auto" };

export function loadPrefs(): Prefs {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) ?? "{}") };
  } catch {
    return DEFAULTS;
  }
}

export function savePrefs(p: Prefs) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* sin almacenamiento: no pasa nada */
  }
}
