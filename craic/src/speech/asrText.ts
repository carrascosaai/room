// Utilidades puras para el audio grabado y la transcripción de Whisper.

/** Frases que Whisper «se inventa» con silencio o ruido de fondo. */
const HALLUCINATIONS = [
  /^\s*(thank you|thanks)( (so|very) much)?( for (watching|listening))?[.!]?\s*$/i,
  /^\s*(please )?subscribe[^.]*[.!]?\s*$/i,
  /^\s*(you|bye|okay|so)[.!]?\s*$/i,
  /^\s*\.+\s*$/,
];

/** Limpia la salida de Whisper: marcas de ruido, repeticiones y alucinaciones. */
export function cleanTranscript(raw: string): string {
  let t = (raw ?? "")
    .replace(/\[[^\]]*\]|\([^)]*(music|noise|silence|blank|inaudible|applause|laugh)[^)]*\)|♪/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  // Bucles típicos: la misma frase repetida muchas veces
  t = t.replace(/(\b.{4,60}?[.!?,]?)(\s+\1){2,}/gi, "$1");
  if (HALLUCINATIONS.some((re) => re.test(t))) return "";
  return t;
}

/** Energía media (RMS) del audio, para detectar grabaciones sin voz. */
export function rms(audio: Float32Array): number {
  if (!audio.length) return 0;
  let sum = 0;
  for (let i = 0; i < audio.length; i++) sum += audio[i] * audio[i];
  return Math.sqrt(sum / audio.length);
}

/**
 * ¿Hay voz? Busca ventanas de 30 ms con energía suficiente. Más robusto que el
 * RMS global cuando hay mucho silencio alrededor de una frase corta.
 */
export function hasSpeech(audio: Float32Array, sampleRate = 16000, threshold = 0.012): boolean {
  const win = Math.floor(sampleRate * 0.03);
  let voiced = 0;
  for (let i = 0; i + win <= audio.length; i += win) {
    if (rms(audio.subarray(i, i + win)) > threshold) voiced++;
    if (voiced >= 6) return true; // ~180 ms de voz
  }
  return false;
}

/** Normaliza el volumen para que Whisper reciba una señal clara. */
export function normalize(audio: Float32Array, target = 0.9): Float32Array {
  let peak = 0;
  for (let i = 0; i < audio.length; i++) peak = Math.max(peak, Math.abs(audio[i]));
  if (peak < 1e-4 || peak > target) return audio;
  const gain = Math.min(target / peak, 20);
  const out = new Float32Array(audio.length);
  for (let i = 0; i < audio.length; i++) out[i] = audio[i] * gain;
  return out;
}
