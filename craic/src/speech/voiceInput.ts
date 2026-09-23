// Escucha con detección de final de frase: cuando dejas de hablar, se envía solo.
//  - "local": Silero VAD + Moonshine/Whisper en el dispositivo (sin pitidos, sin internet).
//  - "browser": reconocimiento del navegador con temporizador de silencio.
import { cleanTranscript } from "./asrText";
import { asrSend, getAudioStatus, onAsrMessage } from "./audioModels";
import { acquireMic, mic, micFailure, releaseMic } from "./mic";
import { getSR, joinResults, mapSRError, recognitionSupported, type MicError } from "./recognition";

export type AsrEngine = "local" | "browser";
export type ListenPhase = "idle" | "listening" | "hearing" | "transcribing";

export interface ListenOptions {
  engine: AsrEngine;
  lang: string;
  /** Silencio (ms) que marca el final de tu frase */
  silenceMs: number;
  onPhase: (p: ListenPhase) => void;
  onPartial?: (text: string) => void;
  onFinal: (text: string) => void;
  onError: (e: MicError) => void;
}

export interface ListenHandle {
  /** Termina ya y transcribe lo que haya (p. ej. al tocar el micro). */
  finish(): void;
  cancel(): void;
}

let active: ListenHandle | null = null;

export const voiceInputAvailable =
  (typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia) || recognitionSupported;

/** Qué motor se usará de verdad ahora mismo. */
export function effectiveEngine(engine: AsrEngine): AsrEngine | null {
  const localReady = getAudioStatus().asr === "ready";
  if (engine === "local") return localReady ? "local" : recognitionSupported ? "browser" : null;
  return recognitionSupported ? "browser" : localReady ? "local" : null;
}

export function listen(opts: ListenOptions): ListenHandle {
  active?.cancel();
  const engine = effectiveEngine(opts.engine);
  console.info(`[craic] escuchando con: ${engine ?? "ninguno"} (oído local: ${getAudioStatus().asr})`);
  let handle: ListenHandle;
  if (!engine) {
    opts.onError("loading");
    handle = { finish() {}, cancel() {} };
  } else handle = engine === "local" ? listenLocal(opts) : listenBrowser(opts);
  active = handle;
  return handle;
}

export function micLevel(): number {
  return mic.level;
}

function listenLocal(opts: ListenOptions): ListenHandle {
  let done = false;
  let offFrame: (() => void) | null = null;
  let offMsg: (() => void) | null = null;
  const cleanup = () => {
    done = true;
    offFrame?.();
    offMsg?.();
    releaseMic();
    if (active === handle) active = null;
  };
  acquireMic();
  offMsg = onAsrMessage((m) => {
    if (done) return;
    if (m.type === "speech-start") opts.onPhase("hearing");
    else if (m.type === "transcribing") {
      offFrame?.();
      opts.onPhase("transcribing");
    } else if (m.type === "final") {
      cleanup();
      opts.onPhase("idle");
      opts.onFinal(cleanTranscript(m.text));
    } else if (m.type === "error") {
      cleanup();
      opts.onPhase("idle");
      opts.onError("other");
    }
  });
  const handle: ListenHandle = {
    finish() {
      if (!done) asrSend({ type: "finish" });
    },
    cancel() {
      if (done) return;
      asrSend({ type: "cancel" });
      cleanup();
      opts.onPhase("idle");
    },
  };
  mic
    .open()
    .then(() => {
      if (done) return;
      asrSend({ type: "listen", silenceMs: opts.silenceMs });
      offFrame = mic.onFrame((frame) => asrSend({ type: "frame", frame }, [frame.buffer]));
      opts.onPhase("listening");
    })
    .catch((err) => {
      cleanup();
      opts.onPhase("idle");
      const f = micFailure(err);
      opts.onError(f === "denied" ? "denied" : f === "no-mic" ? "no-mic" : "other");
    });
  return handle;
}

function listenBrowser(opts: ListenOptions): ListenHandle {
  const SR = getSR()!;
  let done = false;
  let text = "";
  let finishing = false;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let rec: ReturnType<typeof make> | null = null;
  let restarts = 0;

  const clear = () => {
    if (timer) clearTimeout(timer);
    timer = null;
  };
  const end = (final: boolean) => {
    if (done) return;
    done = true;
    clear();
    try {
      rec?.abort();
    } catch {
      /* nada */
    }
    if (active === handle) active = null;
    opts.onPhase("idle");
    if (final) opts.onFinal(cleanTranscript(text));
  };

  function make() {
    const r = new SR();
    r.lang = opts.lang;
    r.continuous = true;
    r.interimResults = true;
    r.maxAlternatives = 1;
    r.onresult = (e) => {
      const t = joinResults(e);
      if (!t) return;
      text = t;
      opts.onPhase("hearing");
      opts.onPartial?.(text);
      clear();
      // El navegador tarda un poco en dar resultados: se añade margen.
      timer = setTimeout(() => {
        finishing = true;
        end(true);
      }, opts.silenceMs + 250);
    };
    r.onerror = (e) => {
      const err = mapSRError(e.error);
      if (!err || err === "no-speech") return; // se reinicia en onend
      done = true;
      clear();
      if (active === handle) active = null;
      opts.onPhase("idle");
      opts.onError(err);
    };
    r.onend = () => {
      if (done || finishing) return;
      if (text) return end(true);
      // Se cortó sin oír nada: seguimos escuchando.
      if (restarts++ > 30) return end(false);
      try {
        rec = make();
        rec.start();
      } catch {
        end(false);
      }
    };
    return r;
  }

  const handle: ListenHandle = {
    finish() {
      finishing = true;
      end(!!text);
      if (!text) opts.onFinal("");
    },
    cancel() {
      end(false);
    },
  };
  try {
    rec = make();
    rec.start();
    opts.onPhase("listening");
  } catch {
    done = true;
    opts.onError("other");
  }
  return handle;
}

/** Escucha una sola frase (p. ej. «Dilo tú») y devuelve el texto. */
export function listenOnce(
  opts: Omit<ListenOptions, "onFinal" | "onError"> & { onError?: (e: MicError) => void },
): { result: Promise<string>; handle: ListenHandle } {
  let handle!: ListenHandle;
  const result = new Promise<string>((resolve) => {
    handle = listen({
      ...opts,
      onFinal: resolve,
      onError: (e) => {
        opts.onError?.(e);
        resolve("");
      },
    });
  });
  return { result, handle };
}
