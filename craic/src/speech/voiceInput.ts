// Escucha con detección de final de frase: cuando dejas de hablar, se envía solo.
//  - "cloud" (por defecto si está disponible): la app graba tu voz, detecta la
//    pausa y la transcribe Whisper en la nube. Mucho más fiable que el del navegador.
//  - "local": Silero VAD + Moonshine/Whisper en el dispositivo (sin pitidos, sin internet).
//  - "browser": reconocimiento del navegador con temporizador de silencio.
import { cleanTranscript } from "./asrText";
import { asrSend, getAudioStatus, onAsrMessage } from "./audioModels";
import { cloudSttOff, cloudSttReady, transcribe } from "./cloudStt";
import { EnergyVad, FRAME_MS } from "./energyVad";
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

/** Si el micro se quedó mudo una vez (sin datos), no se insiste con la grabación propia. */
let micStuck = false;

export function listen(opts: ListenOptions): ListenHandle {
  active?.cancel();
  if (cloudSttReady() && !micStuck && typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia) {
    console.info("[craic] escuchando con: nube (Whisper)");
    const h = listenCloud(opts);
    active = h;
    return h;
  }
  // El oído local solo entiende inglés: otros idiomas, solo con el del navegador.
  const english = /^en\b/i.test(opts.lang);
  const engine = english ? effectiveEngine(opts.engine) : recognitionSupported ? "browser" : null;
  console.info(`[craic] escuchando con: ${engine ?? "ninguno"} (oído local: ${getAudioStatus().asr})`);
  let handle: ListenHandle;
  if (!engine) {
    opts.onError(english ? "loading" : "language");
    handle = { finish() {}, cancel() {} };
  } else handle = engine === "local" ? listenLocal(opts) : listenBrowser(opts);
  active = handle;
  return handle;
}

export function micLevel(): number {
  return mic.level;
}

const MAX_UTTERANCE_MS = 30000;
const MAX_WAIT_MS = 45000;
const PRE_ROLL = 10; // ~320 ms antes de detectar voz, para no comerse la primera sílaba
const MIN_VOICED_MS = 200;

function listenCloud(opts: ListenOptions): ListenHandle {
  let done = false;
  let opened = false;
  let offFrame: (() => void) | null = null;
  let released = false;
  const vad = new EnergyVad(opts.silenceMs);
  const pre: Float32Array[] = [];
  let chunks: Float32Array[] = [];
  let recording = false;
  let frames = 0;
  const ctrl = new AbortController();
  let watchdog: ReturnType<typeof setTimeout> | null = null;

  const release = () => {
    offFrame?.();
    offFrame = null;
    if (watchdog) clearTimeout(watchdog);
    watchdog = null;
    if (!released) {
      released = true;
      // Soltar el micro en seguida: en iPhone, mientras está abierto la voz
      // del personaje sale bajita por el auricular.
      releaseMic();
    }
  };
  const finishWith = (fn: () => void) => {
    if (done) return;
    done = true;
    release();
    if (active === handle) active = null;
    opts.onPhase("idle");
    fn();
  };

  const send = () => {
    if (done) return;
    const audio = concat(chunks);
    chunks = [];
    const voicedMs = vad.voicedFrames * FRAME_MS;
    if (!audio.length || voicedMs < MIN_VOICED_MS) return finishWith(() => opts.onFinal(""));
    release();
    opts.onPhase("transcribing");
    transcribe(audio, opts.lang, ctrl.signal)
      .then((text) => finishWith(() => opts.onFinal(cleanTranscript(text))))
      .catch(() => {
        if (ctrl.signal.aborted) return;
        finishWith(() => opts.onError("network"));
      });
  };

  const onFrame = (frame: Float32Array) => {
    if (done) return;
    frames++;
    const ev = vad.push(frame);
    if (!recording) {
      pre.push(frame);
      if (pre.length > PRE_ROLL) pre.shift();
      if (ev === "start") {
        recording = true;
        chunks = [...pre];
        opts.onPhase("hearing");
        opts.onPartial?.("…");
      } else if (frames * FRAME_MS > MAX_WAIT_MS) {
        // Nadie habla: se vuelve a empezar (libera el micro un momento).
        finishWith(() => opts.onFinal(""));
      }
      return;
    }
    chunks.push(frame);
    if (ev === "end" || chunks.length * FRAME_MS > MAX_UTTERANCE_MS) {
      recording = false;
      send();
    }
  };

  const handle: ListenHandle = {
    finish() {
      if (done) return;
      if (recording && chunks.length) {
        recording = false;
        vad.voicedFrames = Math.max(vad.voicedFrames, MIN_VOICED_MS / FRAME_MS);
        send();
      } else if (!offFrame && opened) {
        /* ya transcribiendo */
      } else finishWith(() => opts.onFinal(""));
    },
    cancel() {
      if (done) return;
      ctrl.abort();
      finishWith(() => undefined);
    },
  };

  acquireMic();
  mic
    .open()
    .then(() => {
      if (done) return;
      opened = true;
      offFrame = mic.onFrame(onFrame);
      opts.onPhase("listening");
      // Si en 4 s no llega ni un dato, el micro está bloqueado (pasa en algunos
      // iPhone): se cambia al reconocimiento del navegador.
      watchdog = setTimeout(() => {
        if (done || frames > 0) return;
        micStuck = true;
        console.warn("[craic] el micro no da audio: se usa el reconocimiento del navegador");
        done = true;
        release();
        if (active === handle) active = null;
        const next = listen(opts);
        handle.finish = () => next.finish();
        handle.cancel = () => next.cancel();
      }, 4000);
    })
    .catch((err) => {
      finishWith(() => {
        const f = micFailure(err);
        if (f === "other") cloudSttOff(Infinity);
        opts.onError(f === "denied" ? "denied" : f === "no-mic" ? "no-mic" : "other");
      });
    });
  return handle;
}

function concat(parts: Float32Array[]): Float32Array {
  const out = new Float32Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
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
  /** Texto de sesiones anteriores: Chrome en Android corta la escucha en cada pausa. */
  let committed = "";
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
      text = `${committed} ${t}`.trim();
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
      // El navegador cortó por su cuenta (pasa en Android en cada pausa): se
      // sigue escuchando y se conserva lo dicho; el envío lo decide tu pausa.
      committed = text;
      if (restarts++ > 60) return end(!!text);
      try {
        rec = make();
        rec.start();
      } catch {
        end(!!text);
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
