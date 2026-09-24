import type { Level } from "../characters";
import { getUiLang } from "../i18n";
import { defaultTarget, type TargetLang } from "../lang";
import type { ModelTier } from "../llm/models";
import type { AsrModelId } from "../speech/asr.worker";
import type { SpeechRate, VoiceEngine } from "../speech/tts";
import type { AsrEngine } from "../speech/voiceInput";

export interface Prefs {
  /** Dónde corre la IA: auto = en la nube si está disponible (rápida), si no en el dispositivo */
  aiEngine: "auto" | "cloud" | "local";
  /** Idioma que practicas */
  lang: TargetLang;
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
  /** Silencio (ms, de 1 a 10 s) que marca el final de tu turno */
  pause: number;
  /** Quién empieza la llamada: el personaje o tú */
  userStarts: boolean;
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
  lang: "en",
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
  pause: 3000,
  userStarts: false,
  recognitionLang: "auto",
  autoSpeak: true,
  subtitles: true,
  reviewTranscript: false,
};

export const PAUSE_MIN = 1000;
export const PAUSE_MAX = 10000;
/** Silencio que marca el final de tu turno (entre 1 y 10 s). */
export const pauseMs = (p: Prefs) => Math.min(PAUSE_MAX, Math.max(PAUSE_MIN, Number(p.pause) || 3000));

export function loadPrefs(): Prefs {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? "{}") as Partial<Prefs> & { whisperSize?: string };
    // Primera visita: el idioma a practicar según el de la página (inglés → francés).
    if (!saved.characterId && defaultTarget(getUiLang()) === "fr") {
      saved.characterId = "camille";
      saved.lang = "fr";
    }
    // Migración de versiones anteriores
    if ((saved.asrEngine as string) === "whisper") saved.asrEngine = "local";
    if (saved.voiceEngine === "neural" && saved.voiceQuality === undefined) saved.voiceEngine = "auto";
    delete saved.whisperSize;
    // v2: la IA en la nube pasa a ser la opción por defecto para todos
    // (la del dispositivo solo si se elige a propósito después de esto).
    const raw = saved as Record<string, unknown>;
    if (typeof raw.mig !== "number" || raw.mig < 2) saved.aiEngine = "auto";
    // v3: pausas más largas (3 s por defecto) para poder pensar sin que se envíe.
    if (typeof raw.mig !== "number" || raw.mig < 3 || typeof saved.pause !== "number") saved.pause = 3000;
    raw.mig = 3;
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
