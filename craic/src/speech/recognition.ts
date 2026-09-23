// Tipos mínimos de la Web Speech API (no vienen en lib.dom de TS) y textos de error.
interface SRAlternative {
  transcript: string;
}
interface SRResult {
  isFinal: boolean;
  0: SRAlternative;
  length: number;
}
export interface SREvent {
  resultIndex: number;
  results: { length: number; [i: number]: SRResult };
}
export interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: SREvent) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  onspeechstart?: (() => void) | null;
}
type SRConstructor = new () => SpeechRecognitionLike;

export function getSR(): SRConstructor | undefined {
  if (typeof window === "undefined") return undefined;
  const w = window as unknown as { SpeechRecognition?: SRConstructor; webkitSpeechRecognition?: SRConstructor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}

export const recognitionSupported = !!getSR();

export type MicError = "denied" | "no-speech" | "no-mic" | "network" | "language" | "loading" | "other";

export const MIC_ERROR_TEXT: Record<MicError, string> = {
  denied:
    "Permiso de micrófono denegado. Actívalo en los ajustes del navegador (icono del candado junto a la dirección) y recarga. Mientras tanto, puedes escribir.",
  "no-speech": "No te he oído. Habla un poco más cerca del móvil.",
  "no-mic": "No se encuentra ningún micrófono en este dispositivo.",
  network: "El reconocimiento de voz del navegador necesita internet. Comprueba la red o escribe.",
  language: "Tu navegador no reconoce inglés por voz. Puedes escribir tu respuesta.",
  loading: "El reconocimiento de voz aún se está preparando. Un momento…",
  other: "El reconocimiento de voz ha fallado. Inténtalo otra vez o escribe tu respuesta.",
};

export function mapSRError(code: string): MicError | null {
  switch (code) {
    case "not-allowed":
    case "service-not-allowed":
      return "denied";
    case "no-speech":
      return "no-speech";
    case "audio-capture":
      return "no-mic";
    case "network":
      return "network";
    case "language-not-supported":
      return "language";
    case "aborted":
      return null;
    default:
      return "other";
  }
}

/** Chrome en Android repite resultados acumulados en modo continuo: se deduplican. */
export function joinResults(e: SREvent): string {
  const parts: string[] = [];
  for (let i = 0; i < e.results.length; i++) {
    const t = e.results[i][0].transcript.trim();
    if (!t) continue;
    const last = parts[parts.length - 1];
    if (last && t.toLowerCase().startsWith(last.toLowerCase())) parts[parts.length - 1] = t;
    else parts.push(t);
  }
  return parts.join(" ").replace(/\s+/g, " ").trim();
}
