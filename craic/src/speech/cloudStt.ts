// Tu voz a texto en la nube (/api/stt → Groq Whisper). Si no está disponible
// o falla, se usa el reconocimiento del navegador o el del dispositivo.
const endpoint = () => `${import.meta.env.BASE_URL}api/stt`;

let state: "unknown" | "ok" | "off" = "unknown";
let offUntil = 0;
let checking: Promise<boolean> | null = null;

function clientId(): string {
  try {
    return localStorage.getItem("craic:cid") ?? "";
  } catch {
    return "";
  }
}

export function cloudSttReady(): boolean {
  return state === "ok" && Date.now() >= offUntil;
}

/** Deja de usarlo un rato (o el resto de la sesión si ms es Infinity). */
export function cloudSttOff(ms: number) {
  if (ms === Infinity) state = "off";
  else offUntil = Date.now() + ms;
}

export function checkCloudStt(): Promise<boolean> {
  checking ??= (async () => {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 8000);
      const r = await fetch(endpoint(), { cache: "no-store", signal: ctrl.signal });
      clearTimeout(t);
      const d = (await r.json()) as { enabled?: boolean };
      state = d.enabled ? "ok" : "off";
    } catch {
      state = "off";
    }
    return state === "ok";
  })();
  return checking;
}

/** Audio de 16 kHz mono → WAV PCM de 16 bits. */
export function encodeWav(samples: Float32Array, rate = 16000): ArrayBuffer {
  const buf = new ArrayBuffer(44 + samples.length * 2);
  const v = new DataView(buf);
  const str = (o: number, s: string) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  str(0, "RIFF");
  v.setUint32(4, 36 + samples.length * 2, true);
  str(8, "WAVE");
  str(12, "fmt ");
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, 1, true);
  v.setUint32(24, rate, true);
  v.setUint32(28, rate * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  str(36, "data");
  v.setUint32(40, samples.length * 2, true);
  for (let i = 0; i < samples.length; i++) {
    const x = Math.max(-1, Math.min(1, samples[i]));
    v.setInt16(44 + i * 2, x < 0 ? x * 0x8000 : x * 0x7fff, true);
  }
  return buf;
}

// Frases que Whisper «se inventa» con ruido o silencio.
const PHANTOM =
  /^(thank you( very much)?|thanks( for watching)?|you|bye|okay|merci( beaucoup)?|sous-titr\w*.*|amara\.org.*|\.+|…)[.!]*$/i;

/** Texto de un audio. Lanza si falla (y deja de usar la nube un rato). */
export async function transcribe(samples: Float32Array, lang: string, signal?: AbortSignal): Promise<string> {
  const body = encodeWav(samples);
  const base = lang.toLowerCase().startsWith("fr") ? "fr" : "en";
  for (let attempt = 0; ; attempt++) {
    const ctrl = new AbortController();
    const abort = () => ctrl.abort();
    signal?.addEventListener("abort", abort);
    const t = setTimeout(abort, 15000);
    try {
      const r = await fetch(`${endpoint()}?lang=${base}`, {
        method: "POST",
        headers: { "content-type": "audio/wav", "x-client-id": clientId() },
        body,
        signal: ctrl.signal,
      });
      if (r.ok) {
        const d = (await r.json()) as { text?: string };
        const text = (d.text ?? "").trim();
        // Un audio cortito que sale como «Thank you.» casi siempre es ruido.
        return samples.length < 16000 * 2.5 && PHANTOM.test(text) ? "" : text;
      }
      if (r.status === 429 && attempt === 0) {
        await new Promise((res) => setTimeout(res, 1200));
        continue;
      }
      cloudSttOff(r.status === 429 ? 60000 : r.status >= 500 ? 30000 : Infinity);
      throw new Error(`stt ${r.status}`);
    } catch (e) {
      if ((e as Error).name === "AbortError" && !signal?.aborted) cloudSttOff(30000);
      throw e;
    } finally {
      clearTimeout(t);
      signal?.removeEventListener("abort", abort);
    }
  }
}
