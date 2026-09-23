// Texto a voz con speechSynthesis (voces del propio dispositivo, gratis).

export type SpeechRate = "slow" | "normal";
const RATE_VALUE: Record<SpeechRate, number> = { slow: 0.8, normal: 1 };

export const ttsSupported = typeof window !== "undefined" && "speechSynthesis" in window;

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

/** Elige la mejor voz: primero por acento (en-IE > en-GB > …), luego calidad y género. */
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
    if (/natural|neural|enhanced|premium|siri/i.test(v.name)) s += 20;
    if (/google/i.test(v.name)) s += 10;
    if (gender === "female" && FEMALE.test(v.name)) s += 15;
    if (gender === "male" && MALE.test(v.name) && !FEMALE.test(v.name)) s += 15;
    if (/novelty|whisper|bells|bubbles|jester|organ|zarvox|trinoids|bad news|good news|boing|cellos|superstar|wobble|albert/i.test(v.name)) s -= 200;
    return s;
  };
  return [...english].sort((a, b) => score(b) - score(a))[0];
}

let unlocked = false;
/** iOS solo permite hablar tras un gesto del usuario: llamar en el primer toque. */
export function unlockTTS() {
  if (!ttsSupported || unlocked) return;
  unlocked = true;
  const u = new SpeechSynthesisUtterance(" ");
  u.volume = 0;
  speechSynthesis.speak(u);
}

export function stopSpeaking() {
  if (ttsSupported) speechSynthesis.cancel();
}

/** Trozos cortos: Chrome corta los textos largos a los ~15 s. */
function chunk(text: string): string[] {
  const parts = text.match(/[^.!?]+[.!?]*/g) ?? [text];
  const out: string[] = [];
  for (const p of parts) {
    const s = p.trim();
    if (!s) continue;
    if (out.length && (out[out.length - 1] + " " + s).length < 180) out[out.length - 1] += " " + s;
    else out.push(s);
  }
  return out;
}

export async function speak(
  text: string,
  opts: { rate: SpeechRate; langs: string[]; gender?: "male" | "female" },
): Promise<void> {
  if (!ttsSupported || !text.trim()) return;
  stopSpeaking();
  const voices = await loadVoices();
  const voice = pickVoice(voices, opts.langs, opts.gender);
  const pieces = chunk(text);
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
      u.rate = RATE_VALUE[opts.rate];
      u.onend = finish;
      u.onerror = finish;
      speechSynthesis.speak(u);
    }
    // Por si algún navegador no dispara onend
    setTimeout(resolve, 4000 + text.length * 120);
  });
}
