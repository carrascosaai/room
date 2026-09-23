// Texto a voz. Motor principal: voz neuronal Kokoro (realista, en el
// dispositivo). Respaldo: speechSynthesis (voces del sistema) mientras la voz
// neuronal carga o si falla.
import { useSyncExternalStore } from "react";
import { getAudioStatus, synthesize } from "./audioModels";

export type SpeechRate = "slow" | "normal";
export type VoiceEngine = "neural" | "system";

const SYSTEM_RATE: Record<SpeechRate, number> = { slow: 0.8, normal: 1 };
const NEURAL_SPEED: Record<SpeechRate, number> = { slow: 0.82, normal: 1 };

export const ttsSupported = typeof window !== "undefined" && "speechSynthesis" in window;

export interface SpeakOptions {
  rate: SpeechRate;
  langs: string[];
  gender?: "male" | "female";
  /** Voz Kokoro, p. ej. "bm_george" */
  neuralVoice?: string;
  engine?: VoiceEngine;
}

// ---------- Estado «hablando» (para el botón de parar) ----------
let speaking = false;
const listeners = new Set<() => void>();
function setSpeaking(v: boolean) {
  if (speaking === v) return;
  speaking = v;
  listeners.forEach((l) => l());
}
export function useSpeaking(): boolean {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => speaking,
  );
}

// ---------- Voces del sistema ----------
let voicesPromise: Promise<SpeechSynthesisVoice[]> | null = null;

export function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  if (!ttsSupported) return Promise.resolve([]);
  if (voicesPromise) return voicesPromise;
  const p = new Promise<SpeechSynthesisVoice[]>((resolve) => {
    const now = speechSynthesis.getVoices();
    if (now.length) return resolve(now);
    const done = () => resolve(speechSynthesis.getVoices());
    speechSynthesis.addEventListener("voiceschanged", done, { once: true });
    setTimeout(done, 2000);
  }).then((v) => {
    if (!v.length) voicesPromise = null; // reintentar la próxima vez
    return v;
  });
  voicesPromise = p;
  return p;
}

const FEMALE = /female|woman|samantha|serena|kate|moira|fiona|karen|tessa|susan|hazel|libby|sonia|emily|jenny|aria|victoria|martha|stephanie|sarah|google uk english female/i;
const MALE = /\bmale\b|daniel|arthur|oliver|george|ryan|thomas|guy|connor|alex|fred|aaron|tom|rishi|google uk english male/i;

/** Elige la mejor voz del sistema: primero por acento, luego calidad y género. */
export function pickVoice(
  voices: SpeechSynthesisVoice[],
  langs: string[],
  gender?: "male" | "female",
): SpeechSynthesisVoice | undefined {
  const english = voices.filter((v) => /^en([-_]|$)/i.test(v.lang));
  if (!english.length) return undefined;
  const langScore = (v: SpeechSynthesisVoice) => {
    const l = v.lang.replace("_", "-").toLowerCase();
    const i = langs.findIndex((p) => l === p.toLowerCase() || (p.length === 2 && l.startsWith(p)));
    return i < 0 ? langs.length : i;
  };
  const score = (v: SpeechSynthesisVoice) => {
    let s = (langs.length - langScore(v)) * 100;
    if (/natural|neural|enhanced|premium|siri/i.test(v.name)) s += 40;
    if (/google/i.test(v.name)) s += 10;
    if (gender === "female" && FEMALE.test(v.name)) s += 15;
    if (gender === "male" && MALE.test(v.name) && !FEMALE.test(v.name)) s += 15;
    if (/novelty|whisper|bells|bubbles|jester|organ|zarvox|trinoids|bad news|good news|boing|cellos|superstar|wobble|albert/i.test(v.name)) s -= 200;
    return s;
  };
  return [...english].sort((a, b) => score(b) - score(a))[0];
}

// ---------- Reproducción de audio (voz neuronal) ----------
let audioCtx: AudioContext | null = null;
function ctx(): AudioContext {
  if (!audioCtx) {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    audioCtx = new Ctx();
  }
  return audioCtx;
}

let unlocked = false;
/** iOS/Safari solo permiten audio tras un gesto del usuario: llamar en cada toque. */
export function unlockTTS() {
  try {
    const c = ctx();
    if (c.state === "suspended") void c.resume();
    if (!unlocked) {
      // Un buffer silencioso «desbloquea» el audio en iOS
      const b = c.createBuffer(1, 1, 22050);
      const s = c.createBufferSource();
      s.buffer = b;
      s.connect(c.destination);
      s.start(0);
    }
  } catch {
    /* sin Web Audio */
  }
  if (ttsSupported && !unlocked) {
    const u = new SpeechSynthesisUtterance(" ");
    u.volume = 0;
    speechSynthesis.speak(u);
  }
  unlocked = true;
}

// Caché de audios generados: repetir una frase es instantáneo.
const cache = new Map<string, { audio: Float32Array; sampleRate: number }>();
function cacheGet(key: string) {
  const v = cache.get(key);
  if (v) {
    cache.delete(key);
    cache.set(key, v);
  }
  return v;
}
function cachePut(key: string, v: { audio: Float32Array; sampleRate: number }) {
  cache.set(key, v);
  while (cache.size > 40) cache.delete(cache.keys().next().value!);
}

let token = 0;
let currentSource: AudioBufferSourceNode | null = null;

export function stopSpeaking() {
  token++;
  try {
    currentSource?.stop();
  } catch {
    /* ya parado */
  }
  currentSource = null;
  if (ttsSupported) speechSynthesis.cancel();
  setSpeaking(false);
}

/** Frases para la voz neuronal: las dos primeras solas (empieza antes), el resto agrupado. */
export function splitForSpeech(text: string): string[] {
  const parts = (text.match(/[^.!?…]+[.!?…]*["'’”)]*/g) ?? [text]).map((s) => s.trim()).filter(Boolean);
  const out: string[] = [];
  for (const p of parts) {
    if (out.length > 2 && (out[out.length - 1] + " " + p).length < 200) out[out.length - 1] += " " + p;
    else out.push(p);
  }
  return out;
}

function playBuffer(data: { audio: Float32Array; sampleRate: number }, myToken: number): Promise<void> {
  return new Promise((resolve) => {
    if (myToken !== token) return resolve();
    const c = ctx();
    const buf = c.createBuffer(1, data.audio.length, data.sampleRate);
    buf.copyToChannel(data.audio as Float32Array<ArrayBuffer>, 0);
    const src = c.createBufferSource();
    src.buffer = buf;
    src.connect(c.destination);
    src.onended = () => resolve();
    currentSource = src;
    src.start();
  });
}

async function speakNeural(text: string, opts: SpeakOptions, myToken: number): Promise<boolean> {
  const voice = opts.neuralVoice!;
  const speed = NEURAL_SPEED[opts.rate];
  const pieces = splitForSpeech(text);
  const gen = (s: string) => {
    const key = `${voice}|${speed}|${s}`;
    const hit = cacheGet(key);
    if (hit) return Promise.resolve(hit);
    return synthesize(s, voice, speed).then((v) => {
      cachePut(key, v);
      return v;
    });
  };
  try {
    if (ctx().state === "suspended") await ctx().resume();
    // Se genera la frase siguiente mientras suena la actual.
    let next = gen(pieces[0]);
    for (let i = 0; i < pieces.length; i++) {
      const data = await next;
      if (myToken !== token) return true;
      if (i + 1 < pieces.length) next = gen(pieces[i + 1]);
      await playBuffer(data, myToken);
      if (myToken !== token) return true;
    }
    return true;
  } catch (err) {
    console.warn("Voz neuronal falló, uso la del sistema", err);
    return false;
  }
}

async function speakSystem(text: string, opts: SpeakOptions, myToken: number): Promise<void> {
  if (!ttsSupported) return;
  const voices = await loadVoices();
  if (myToken !== token) return;
  const voice = pickVoice(voices, opts.langs, opts.gender);
  const pieces = splitForSpeech(text);
  await new Promise<void>((resolve) => {
    let pending = pieces.length;
    const finish = () => {
      pending -= 1;
      if (pending <= 0) resolve();
    };
    for (const piece of pieces) {
      const u = new SpeechSynthesisUtterance(piece);
      if (voice) u.voice = voice;
      u.lang = voice?.lang ?? opts.langs[0] ?? "en-GB";
      u.rate = SYSTEM_RATE[opts.rate];
      u.onend = finish;
      u.onerror = finish;
      speechSynthesis.speak(u);
    }
    // Por si algún navegador no dispara onend
    setTimeout(resolve, 4000 + text.length * 120);
  });
}

export function neuralReady() {
  return getAudioStatus().tts === "ready";
}

export async function speak(text: string, opts: SpeakOptions): Promise<void> {
  if (!text.trim()) return;
  stopSpeaking();
  const myToken = token;
  setSpeaking(true);
  try {
    const useNeural = (opts.engine ?? "neural") === "neural" && !!opts.neuralVoice && neuralReady();
    if (useNeural && (await speakNeural(text, opts, myToken))) return;
    if (myToken === token) await speakSystem(text, opts, myToken);
  } finally {
    if (myToken === token) setSpeaking(false);
  }
}
