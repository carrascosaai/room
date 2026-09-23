import { useCallback, useEffect, useRef, useState } from "react";

// Tipos mínimos de la Web Speech API (no vienen en lib.dom de TS).
interface SRAlternative { transcript: string }
interface SRResult { isFinal: boolean; 0: SRAlternative; length: number }
interface SREvent { resultIndex: number; results: { length: number; [i: number]: SRResult } }
interface SRErrorEvent { error: string }
interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: SREvent) => void) | null;
  onerror: ((e: SRErrorEvent) => void) | null;
  onend: (() => void) | null;
}
type SRConstructor = new () => SpeechRecognitionLike;

function getSR(): SRConstructor | undefined {
  const w = window as unknown as { SpeechRecognition?: SRConstructor; webkitSpeechRecognition?: SRConstructor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}

export const recognitionSupported = typeof window !== "undefined" && !!getSR();

export type MicError =
  | "denied"
  | "no-speech"
  | "no-mic"
  | "network"
  | "language"
  | "other";

export const MIC_ERROR_TEXT: Record<MicError, string> = {
  denied:
    "Permiso de micrófono denegado. Actívalo en los ajustes del navegador (icono del candado junto a la dirección) y recarga. Mientras tanto, puedes escribir.",
  "no-speech": "No te he oído. Mantén pulsado el botón mientras hablas.",
  "no-mic": "No se encuentra ningún micrófono en este dispositivo.",
  network:
    "El reconocimiento de voz de este navegador necesita conexión a internet. Comprueba la red o escribe tu respuesta.",
  language: "Tu navegador no reconoce inglés por voz. Puedes escribir tu respuesta.",
  other: "El reconocimiento de voz ha fallado. Inténtalo otra vez o escribe tu respuesta.",
};

function mapError(code: string): MicError | null {
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

/**
 * Reconocimiento de voz en inglés. `start()` empieza a escuchar y `stop()`
 * devuelve la transcripción final.
 */
export function useSpeechRecognition(lang = "en-GB") {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState<MicError | null>(null);
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const textRef = useRef("");
  const endWaiters = useRef<(() => void)[]>([]);

  useEffect(() => () => recRef.current?.abort(), []);

  const start = useCallback(() => {
    const SR = getSR();
    if (!SR) return;
    recRef.current?.abort();
    const rec = new SR();
    rec.lang = lang;
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 1;
    textRef.current = "";
    setTranscript("");
    setError(null);
    rec.onresult = (e) => {
      // Chrome en Android repite resultados acumulados en modo continuo: se deduplican.
      const parts: string[] = [];
      for (let i = 0; i < e.results.length; i++) {
        const t = e.results[i][0].transcript.trim();
        if (!t) continue;
        const last = parts[parts.length - 1];
        if (last && t.toLowerCase().startsWith(last.toLowerCase())) parts[parts.length - 1] = t;
        else parts.push(t);
      }
      textRef.current = parts.join(" ").replace(/\s+/g, " ").trim();
      setTranscript(textRef.current);
    };
    rec.onerror = (e) => {
      const mapped = mapError(e.error);
      // "no-speech" solo es un error si no hemos oído nada
      if (mapped && !(mapped === "no-speech" && textRef.current)) setError(mapped);
    };
    rec.onend = () => {
      if (recRef.current === rec) recRef.current = null;
      setListening(false);
      endWaiters.current.splice(0).forEach((f) => f());
    };
    recRef.current = rec;
    try {
      rec.start();
      setListening(true);
    } catch {
      setError("other");
    }
  }, [lang]);

  const stop = useCallback(async (): Promise<string> => {
    const rec = recRef.current;
    if (rec) {
      await new Promise<void>((resolve) => {
        endWaiters.current.push(resolve);
        try {
          rec.stop();
        } catch {
          resolve();
        }
        // Algunos navegadores tardan en disparar onend
        setTimeout(resolve, 1500);
      });
    }
    setListening(false);
    return textRef.current;
  }, []);

  const cancel = useCallback(() => {
    recRef.current?.abort();
    recRef.current = null;
    textRef.current = "";
    setTranscript("");
    setListening(false);
  }, []);

  return {
    supported: recognitionSupported,
    listening,
    transcript,
    error,
    clearError: () => setError(null),
    start,
    stop,
    cancel,
  };
}
