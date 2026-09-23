import type { Level } from "../characters";
import type { ModelTier } from "../llm/models";
import type { AsrModelId } from "../speech/asr.worker";
import type { SpeechRate, VoiceEngine } from "../speech/tts";
import type { AsrEngine } from "../speech/voiceInput";

export interface Prefs {
  /** Dónde corre la IA: auto = en la nube si está disponible (rápida), si no en el dispositivo */
  aiEngine: "auto" | "cloud" | "local";
  tier: ModelTier;
  rate: SpeechRate;
  level: Level;
  characterId: string;
  scenarioId: string;
  theme: "auto" | "light" | "dark";
  /** auto = la voz más natural disponible; neural = Kokoro; system = la del sistema */
  voiceEngine: VoiceEngine;
  /** Calidad de la voz neuronal: alta (GPU, ~330 MB) o ligera (CPU, ~90 MB) */
  voiceQuality: "high" | "light";
  /** Voz neuronal elegida por personaje (si no, la de por defecto) */
  voiceOverrides: Record<string, string>;
  /** Reconocimiento: modelo local (Moonshine/Whisper + VAD) o el del navegador */
  asrEngine: AsrEngine;
  asrModel: AsrModelId;
  /** Modo llamada: escucha sola y envía cuando dejas de hablar */
  handsFree: boolean;
  /** Pausa que marca el final de tu frase */
  pause: "short" | "normal" | "long";
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
  aiEngine: "auto",
  tier: "light",
  rate: "normal",
  level: "B1",
  characterId: "liam",
  scenarioId: "free",
  theme: "auto",
  voiceEngine: "auto",
  voiceQuality: "high",
  voiceOverrides: {},
  asrEngine: "local",
  asrModel: "moonshine",
  handsFree: true,
  pause: "normal",
  recognitionLang: "auto",
  autoSpeak: true,
  subtitles: true,
  reviewTranscript: false,
};

export const PAUSE_MS: Record<Prefs["pause"], number> = { short: 650, normal: 1000, long: 1600 };

export function loadPrefs(): Prefs {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? "{}") as Partial<Prefs> & { whisperSize?: string };
    // Migración de versiones anteriores
    if ((saved.asrEngine as string) === "whisper") saved.asrEngine = "local";
    if (saved.voiceEngine === "neural" && saved.voiceQuality === undefined) saved.voiceEngine = "auto";
    delete saved.whisperSize;
    return { ...DEFAULT_PREFS, ...saved };
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
