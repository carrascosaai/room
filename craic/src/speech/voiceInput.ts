import { useCallback, useEffect, useRef, useState } from "react";
import { cleanTranscript, hasSpeech, normalize } from "./asrText";
import { getAudioStatus, transcribe } from "./audioModels";
import { micFailure, MicRecorder } from "./recorder";
import { recognitionSupported, useSpeechRecognition, type MicError } from "./recognition";

export type AsrEngine = "whisper" | "browser";
export type VoicePhase = "idle" | "listening" | "transcribing";

const whisperCapable = typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia;

/**
 * Entrada de voz. Con Whisper se graba el audio y se transcribe en el
 * dispositivo (mejor con acento español). Si Whisper aún no está listo y el
 * navegador tiene reconocimiento propio, se usa ese mientras tanto.
 */
export function useVoiceInput(engine: AsrEngine, lang: string) {
  const browser = useSpeechRecognition(lang);
  const recRef = useRef<MicRecorder | null>(null);
  const modeRef = useRef<AsrEngine>(engine);
  const [phase, setPhase] = useState<VoicePhase>("idle");
  const [error, setError] = useState<MicError | null>(null);

  useEffect(() => () => recRef.current?.close(), []);

  const shouldUseWhisper = () => {
    if (!whisperCapable) return false;
    if (engine === "browser" && recognitionSupported) return false;
    // Whisper elegido: si aún está cargando, usamos el del navegador mientras tanto.
    return getAudioStatus().asr === "ready" || !recognitionSupported;
  };

  const start = useCallback(async () => {
    setError(null);
    browser.clearError();
    const whisper = shouldUseWhisper();
    modeRef.current = whisper ? "whisper" : "browser";
    if (!whisper) {
      browser.start();
      setPhase("listening");
      return;
    }
    try {
      recRef.current ??= new MicRecorder();
      await recRef.current.open();
      recRef.current.start();
      setPhase("listening");
    } catch (err) {
      setError(micFailure(err) === "denied" ? "denied" : micFailure(err) === "no-mic" ? "no-mic" : "other");
      setPhase("idle");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engine, browser.start, browser.clearError]);

  const stop = useCallback(async (): Promise<string> => {
    if (modeRef.current === "browser") {
      const text = await browser.stop();
      setPhase("idle");
      return text;
    }
    const rec = recRef.current;
    if (!rec) return "";
    const audio = await rec.stop();
    if (audio.length < 16000 * 0.3 || !hasSpeech(audio)) {
      setPhase("idle");
      setError("no-speech");
      return "";
    }
    setPhase("transcribing");
    try {
      const text = cleanTranscript(await transcribe(normalize(audio)));
      if (!text) setError("no-speech");
      return text;
    } catch (err) {
      console.error(err);
      setError("other");
      return "";
    } finally {
      setPhase("idle");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [browser.stop]);

  const cancel = useCallback(() => {
    browser.cancel();
    recRef.current?.cancel();
    setPhase("idle");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [browser.cancel]);

  const level = useCallback(() => (modeRef.current === "whisper" ? recRef.current?.level ?? 0 : 0.35), []);

  const listening = modeRef.current === "browser" ? browser.listening : phase === "listening";

  return {
    available: whisperCapable || recognitionSupported,
    phase: (modeRef.current === "browser" ? (browser.listening ? "listening" : "idle") : phase) as VoicePhase,
    listening,
    /** Texto en vivo (solo con el reconocimiento del navegador) */
    transcript: modeRef.current === "browser" ? browser.transcript : "",
    error: error ?? browser.error,
    clearError: () => {
      setError(null);
      browser.clearError();
    },
    level,
    start,
    stop,
    cancel,
  };
}
