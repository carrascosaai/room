// Voz en la nube (/api/tts → Groq Orpheus). Si no está disponible o falla,
// quien llama usa la voz del dispositivo.
const endpoint = () => `${import.meta.env.BASE_URL}api/tts`;

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

/** ¿Se puede usar la voz en la nube ahora mismo? (sin esperar) */
export function cloudTtsReady(): boolean {
  return state === "ok" && Date.now() >= offUntil;
}

/** Comprueba una vez si el servidor tiene la voz en la nube activa. */
export function checkCloudTts(): Promise<boolean> {
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

/** Audio (WAV/MP3) de una frase. Lanza si falla; tras un fallo se deja de usar un rato. */
export async function fetchSpeech(text: string, gender: "male" | "female", voice?: string): Promise<ArrayBuffer> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 10000);
  try {
    const r = await fetch(endpoint(), {
      method: "POST",
      headers: { "content-type": "application/json", "x-client-id": clientId() },
      body: JSON.stringify({ text, gender, voice }),
      signal: ctrl.signal,
    });
    if (!r.ok) {
      // Saturada: un minuto con la voz del dispositivo. Otro error: el resto de la sesión.
      if (r.status === 429) offUntil = Date.now() + 60000;
      else state = "off";
      throw new Error(`tts ${r.status}`);
    }
    return await r.arrayBuffer();
  } catch (e) {
    if ((e as Error).name === "AbortError") offUntil = Date.now() + 30000;
    throw e;
  } finally {
    clearTimeout(t);
  }
}
