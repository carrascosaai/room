// Texto a voz, frase a frase: la primera frase empieza a sonar mientras el
// modelo aún escribe el resto.
// Motor «auto»: 1) una voz natural del sistema si existe (Edge «Natural»,
// Apple «Premium/Mejorada»…), que es instantánea; 2) si no, la voz neuronal
// Kokoro en el dispositivo; 3) como último recurso, la voz normal del sistema.
import { useSyncExternalStore } from "react";
import { getAudioStatus, synthesize } from "./audioModels";

export type SpeechRate = "slow" | "normal";
export type VoiceEngine = "auto" | "neural" | "system";

const SYSTEM_RATE: Record<SpeechRate, number> = { slow: 0.82, normal: 1 };
const NEURAL_SPEED: Record<SpeechRate, number> = { slow: 0.85, normal: 1 };

export const ttsSupported = typeof window !== "undefined" && "speechSynthesis" in window;

export interface SpeakOptions {
  rate: SpeechRate;
  langs: string[];
  gender?: "male" | "female";
  /** Nombres de voces del sistema con el acento del personaje (regex), p. ej. "fiona" */
  hint?: string;
  /** Voz Kokoro, p. ej. "af_heart" */
  neuralVoice?: string;
  engine?: VoiceEngine;
}

// ---------- Estado «hablando» ----------
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
let voicesCache: SpeechSynthesisVoice[] = [];
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
    if (!v.length) voicesPromise = null;
    voicesCache = v;
    return v;
  });
  voicesPromise = p;
  return p;
}
if (ttsSupported) void loadVoices();

const FEMALE = /female|woman|samantha|serena|kate|moira|fiona|karen|tessa|susan|hazel|libby|sonia|emily|jenny|aria|ava|victoria|martha|stephanie|sarah|michelle|natasha|clara|emma|molly|ana\b|google uk english female/i;
const MALE = /\bmale\b|daniel|arthur|oliver|george|ryan|thomas|guy|connor|alex|fred|aaron|tom|rishi|andrew|brian|christopher|eric|roger|steffan|william|liam|google uk english male/i;
const NOVELTY = /novelty|whisper|bells|bubbles|jester|organ|zarvox|trinoids|bad news|good news|boing|cellos|superstar|wobble|albert|grandma|grandpa|rocko|shelley|flo|eddy|reed|sandy/i;
/** Voces que suenan a persona: Edge «Natural/Online», Apple «Premium/Mejorada», Google «Studio/WaveNet». */
const PREMIUM = /natural|neural|premium|enhanced|mejorada|online|wavenet|studio|siri/i;

function langRank(v: SpeechSynthesisVoice, langs: string[]) {
  const l = v.lang.replace("_", "-").toLowerCase();
  const i = langs.findIndex((p) => l === p.toLowerCase() || (p.length === 2 && l.startsWith(p)));
  return i < 0 ? langs.length : i;
}

function hintScore(v: SpeechSynthesisVoice, hint?: string) {
  if (!hint) return 0;
  try {
    const byName = new RegExp(`\\b(${hint})\\b`, "i").test(v.name);
    const scottish = /scot/i.test(hint) && /scot/i.test(`${v.lang} ${v.name}`);
    return byName || scottish ? 30 : 0;
  } catch {
    return 0;
  }
}

function genderScore(v: SpeechSynthesisVoice, gender?: "male" | "female") {
  if (gender === "female" && FEMALE.test(v.name)) return 15;
  if (gender === "male" && MALE.test(v.name) && !FEMALE.test(v.name)) return 15;
  return 0;
}

/** Elige la mejor voz del sistema: primero por acento, luego calidad y género. */
export function pickVoice(
  voices: SpeechSynthesisVoice[],
  langs: string[],
  gender?: "male" | "female",
  hint?: string,
): SpeechSynthesisVoice | undefined {
  const english = voices.filter((v) => /^en([-_]|$)/i.test(v.lang) && !NOVELTY.test(v.name));
  if (!english.length) return undefined;
  const score = (v: SpeechSynthesisVoice) =>
    (langs.length - langRank(v, langs)) * 100 + (PREMIUM.test(v.name) ? 60 : 0) + (/google/i.test(v.name) ? 10 : 0) + genderScore(v, gender) + hintScore(v, hint);
  return [...english].sort((a, b) => score(b) - score(a))[0];
}

/** Una voz del sistema de calidad «humana» (si el navegador la tiene). */
export function premiumSystemVoice(
  voices: SpeechSynthesisVoice[],
  langs: string[],
  gender?: "male" | "female",
  hint?: string,
): SpeechSynthesisVoice | undefined {
  // Solo voces con el acento del personaje (una voz «natural» americana no sirve para alguien de Sídney).
  const accents = langs.filter((l) => l.length > 2).slice(0, 2);
  const good = voices.filter(
    (v) => PREMIUM.test(v.name) && !NOVELTY.test(v.name) && (accents.length ? langRank(v, accents) < accents.length : /^en([-_]|$)/i.test(v.lang)),
  );
  if (!good.length) return undefined;
  const score = (v: SpeechSynthesisVoice) => (langs.length - langRank(v, langs)) * 10 + genderScore(v, gender) + hintScore(v, hint);
  return [...good].sort((a, b) => score(b) - score(a))[0];
}

type Mode = { kind: "neural"; voice: string } | { kind: "system"; voice?: SpeechSynthesisVoice };

export function resolveMode(opts: SpeakOptions): Mode {
  const engine = opts.engine ?? "auto";
  const neuralOk = !!opts.neuralVoice && getAudioStatus().tts === "ready";
  if (engine !== "system") {
    if (engine === "auto") {
      const premium = premiumSystemVoice(voicesCache, opts.langs, opts.gender, opts.hint);
      if (premium) return { kind: "system", voice: premium };
    }
    if (neuralOk) return { kind: "neural", voice: opts.neuralVoice! };
  }
  return { kind: "system", voice: pickVoice(voicesCache, opts.langs, opts.gender, opts.hint) };
}

/** ¿Hace falta cargar la voz neuronal o ya hay una voz natural del sistema? */
export async function needsNeuralVoice(langs: string[], gender?: "male" | "female"): Promise<boolean> {
  const voices = await loadVoices();
  return !premiumSystemVoice(voices, langs, gender);
}

// ---------- Reproducción ----------
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

// Caché de audios: repetir una frase es instantáneo.
type Clip = { audio: Float32Array; sampleRate: number };
const cache = new Map<string, Clip>();
function cachePut(key: string, v: Clip) {
  cache.set(key, v);
  while (cache.size > 60) cache.delete(cache.keys().next().value!);
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

function playClip(clip: Clip, myToken: number): Promise<void> {
  return new Promise((resolve) => {
    if (myToken !== token) return resolve();
    const c = ctx();
    const buf = c.createBuffer(1, clip.audio.length, clip.sampleRate);
    buf.copyToChannel(clip.audio as Float32Array<ArrayBuffer>, 0);
    const src = c.createBufferSource();
    src.buffer = buf;
    src.connect(c.destination);
    src.onended = () => resolve();
    currentSource = src;
    src.start();
  });
}

function speakSystemSentence(text: string, voice: SpeechSynthesisVoice | undefined, opts: SpeakOptions): Promise<void> {
  return new Promise((resolve) => {
    const u = new SpeechSynthesisUtterance(text);
    if (voice) u.voice = voice;
    u.lang = voice?.lang ?? opts.langs[0] ?? "en-GB";
    u.rate = SYSTEM_RATE[opts.rate];
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      resolve();
    };
    u.onend = finish;
    u.onerror = finish;
    speechSynthesis.speak(u);
    // Por si algún navegador no dispara onend
    setTimeout(finish, 3000 + text.length * 110);
  });
}

export interface SpeechStream {
  /** Añade una frase: empieza a prepararse y sonará cuando le toque. */
  push(sentence: string): void;
  /** No habrá más frases. Se resuelve cuando termina de sonar todo. */
  end(): Promise<void>;
}

/** Voz por frases: la siguiente se genera mientras suena la actual. */
export function createSpeechStream(opts: SpeakOptions): SpeechStream {
  stopSpeaking();
  const myToken = token;
  const mode = resolveMode(opts);
  const speed = NEURAL_SPEED[opts.rate];
  let chain: Promise<void> = Promise.resolve();
  let started = false;

  const push = (sentence: string) => {
    const s = sentence.trim();
    if (!s || myToken !== token) return;
    if (!started) {
      started = true;
      setSpeaking(true);
    }
    if (mode.kind === "neural") {
      const key = `${mode.voice}|${speed}|${s}`;
      const hit = cache.get(key);
      // La generación empieza YA (en paralelo a lo que esté sonando).
      const clip: Promise<Clip | null> = hit
        ? Promise.resolve(hit)
        : synthesize(s, mode.voice, speed).then(
            (c) => (cachePut(key, c), c),
            () => null,
          );
      chain = chain.then(async () => {
        if (myToken !== token) return;
        const c = await clip;
        if (myToken !== token) return;
        if (c) await playClip(c, myToken);
        else await speakSystemSentence(s, pickVoice(voicesCache, opts.langs, opts.gender, opts.hint), opts);
      });
    } else {
      chain = chain.then(() => (myToken === token ? speakSystemSentence(s, mode.voice, opts) : undefined));
    }
  };

  return {
    push,
    end: async () => {
      await chain;
      if (myToken === token) setSpeaking(false);
    },
  };
}

/** Divide un texto en frases para la voz. */
export function splitForSpeech(text: string): string[] {
  const parts = (text.match(/[^.!?…]+[.!?…]*["'’”)]*/g) ?? [text]).map((s) => s.trim()).filter(Boolean);
  const out: string[] = [];
  for (const p of parts) {
    if (out.length > 2 && (out[out.length - 1] + " " + p).length < 200) out[out.length - 1] += " " + p;
    else out.push(p);
  }
  return out;
}

export async function speak(text: string, opts: SpeakOptions): Promise<void> {
  if (!text.trim()) return;
  if (!voicesCache.length) await loadVoices();
  const s = createSpeechStream(opts);
  for (const p of splitForSpeech(text)) s.push(p);
  await s.end();
}
