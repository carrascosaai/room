import type { Level } from "../characters";
import type { ModelTier } from "../llm/models";
import type { WhisperSize } from "../speech/audioModels";
import type { SpeechRate, VoiceEngine } from "../speech/tts";
import type { AsrEngine } from "../speech/voiceInput";

export interface Prefs {
  tier: ModelTier;
  rate: SpeechRate;
  level: Level;
  characterId: string;
  scenarioId: string;
  theme: "auto" | "light" | "dark";
  /** Voz neuronal realista o la del sistema */
  voiceEngine: VoiceEngine;
  /** Voz neuronal elegida por personaje (si no, la de por defecto) */
  voiceOverrides: Record<string, string>;
  /** Reconocimiento: Whisper en el dispositivo o el del navegador */
  asrEngine: AsrEngine;
  whisperSize: WhisperSize;
  /** Acento con el que el navegador interpreta tu voz (solo motor del navegador) */
  recognitionLang: "auto" | "en-GB" | "en-US";
  /** Leer en voz alta las respuestas automáticamente */
  autoSpeak: boolean;
  /** Mostrar el texto del personaje (si no, modo escucha) */
  subtitles: boolean;
  /** Revisar/editar lo transcrito antes de enviarlo */
  reviewTranscript: boolean;
}

const KEY = "craic:prefs";
export const DEFAULT_PREFS: Prefs = {
  tier: "light",
  rate: "normal",
  level: "B1",
  characterId: "liam",
  scenarioId: "free",
  theme: "auto",
  voiceEngine: "neural",
  voiceOverrides: {},
  asrEngine: "whisper",
  whisperSize: "base",
  recognitionLang: "auto",
  autoSpeak: true,
  subtitles: true,
  reviewTranscript: false,
};

export function loadPrefs(): Prefs {
  try {
    return { ...DEFAULT_PREFS, ...JSON.parse(localStorage.getItem(KEY) ?? "{}") };
  } catch {
    return DEFAULT_PREFS;
  }
}

export function savePrefs(p: Prefs) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* sin almacenamiento: no pasa nada */
  }
}
