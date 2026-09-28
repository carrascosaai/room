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
      const d = (await r.json()) as { enabled?: boolean; reason?: string; retryAfter?: number };
      // Cupo agotado de momento: se vuelve a intentar cuando se recargue.
      if (!d.enabled && d.reason === "quota") {
        state = "ok";
        offUntil = Date.now() + (d.retryAfter ?? 600) * 1000;
      } else state = d.enabled ? "ok" : "off";
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
  // Margen amplio: si hay mucha gente, el servidor espera unos segundos al
  // límite por minuto antes de responder (mejor eso que la voz robótica).
  const t = setTimeout(() => ctrl.abort(), 22000);
  try {
    const r = await fetch(endpoint(), {
      method: "POST",
      headers: { "content-type": "application/json", "x-client-id": clientId() },
      body: JSON.stringify({ text, gender, voice }),
      signal: ctrl.signal,
    });
    if (!r.ok) {
      // Cupo agotado: voz del dispositivo hasta que se recargue. Servicio
      // desactivado: el resto de la sesión. Fallo pasajero: se reintenta pronto.
      if (r.status === 429) offUntil = Date.now() + Math.max(15, Number(r.headers.get("retry-after")) || 0) * 1000;
      else if (r.status === 503 || r.status === 401 || r.status === 403) state = "off";
      else offUntil = Date.now() + 15000;
      throw new Error(`tts ${r.status}`);
    }
    return await r.arrayBuffer();
  } catch (e) {
    if ((e as Error).name === "AbortError") offUntil = Date.now() + 20000;
    throw e;
  } finally {
    clearTimeout(t);
  }
}
