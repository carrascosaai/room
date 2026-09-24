// Estado del cupo gratuito de Groq (para el propietario): hace una petición
// mínima a la IA, a la voz y al oído (Whisper) y devuelve los límites que informa Groq.
// Se guarda 60 s para que abrir la página muchas veces no gaste cupo. La voz
// (solo 100 al día) únicamente se prueba con ?voz=1.
export const config = { runtime: "edge" };

const env = (k: string): string | undefined =>
  (globalThis as unknown as { process?: { env: Record<string, string | undefined> } }).process?.env?.[k];

const BASE = "https://api.groq.com/openai/v1";
let cache: { at: number; data: unknown } | null = null;

type Limits = Record<string, string | number | null>;

function pick(r: Response): Limits {
  const h = (k: string) => r.headers.get(k);
  return {
    status: r.status,
    requestsPerDay: h("x-ratelimit-limit-requests"),
    requestsLeftToday: h("x-ratelimit-remaining-requests"),
    requestsResetIn: h("x-ratelimit-reset-requests"),
    tokensPerMinute: h("x-ratelimit-limit-tokens"),
    tokensLeftThisMinute: h("x-ratelimit-remaining-tokens"),
    tokensResetIn: h("x-ratelimit-reset-tokens"),
  };
}

export async function handle(req: Request, fetchImpl: typeof fetch = fetch): Promise<Response> {
  const key = env("GROQ_API_KEY") ?? env("LLM_API_KEY");
  const headers = { "content-type": "application/json", "cache-control": "no-store" };
  if (!key) return new Response(JSON.stringify({ enabled: false }), { headers });
  // La voz solo se comprueba si se pide (?voz=1): cada prueba gasta 1 de sus 100 diarias.
  const probeVoice = new URL(req.url).searchParams.get("voz") === "1";
  if (!probeVoice && cache && Date.now() - cache.at < 60000) return new Response(JSON.stringify(cache.data), { headers });

  const auth = { "content-type": "application/json", authorization: `Bearer ${key}` };
  const chatModels = (env("LLM_MODELS_FAST") ?? "openai/gpt-oss-20b,openai/gpt-oss-120b").split(",").map((s) => s.trim()).filter(Boolean).slice(0, 2);
  const chat = await Promise.all(
    chatModels.map(async (model) => {
      try {
        const r = await fetchImpl(`${BASE}/chat/completions`, {
          method: "POST",
          headers: auth,
          body: JSON.stringify({ model, messages: [{ role: "user", content: "hi" }], max_tokens: 1 }),
        });
        await r.text().catch(() => "");
        return { model, ...pick(r) };
      } catch (e) {
        return { model, error: String(e) };
      }
    }),
  );
  let voice: Limits | { error: string } | undefined;
  if (probeVoice) try {
    const r = await fetchImpl(`${BASE}/audio/speech`, {
      method: "POST",
      headers: auth,
      body: JSON.stringify({ model: env("TTS_MODEL") ?? "canopylabs/orpheus-v1-english", input: "Hi.", voice: "hannah", response_format: "wav" }),
    });
    await r.arrayBuffer().catch(() => null);
    voice = pick(r);
  } catch (e) {
    voice = { error: String(e) };
  }
  let ears: Limits | { error: string };
  try {
    // 0,5 s de silencio: lo mínimo para leer el cupo de Whisper.
    const pcm = new Uint8Array(44 + 16000);
    const v = new DataView(pcm.buffer);
    [..."RIFF"].forEach((c, i) => v.setUint8(i, c.charCodeAt(0)));
    v.setUint32(4, 36 + 16000, true);
    [..."WAVEfmt "].forEach((c, i) => v.setUint8(8 + i, c.charCodeAt(0)));
    v.setUint32(16, 16, true);
    v.setUint16(20, 1, true);
    v.setUint16(22, 1, true);
    v.setUint32(24, 16000, true);
    v.setUint32(28, 32000, true);
    v.setUint16(32, 2, true);
    v.setUint16(34, 16, true);
    [..."data"].forEach((c, i) => v.setUint8(36 + i, c.charCodeAt(0)));
    v.setUint32(40, 16000, true);
    const form = new FormData();
    form.append("file", new Blob([pcm], { type: "audio/wav" }), "s.wav");
    form.append("model", (env("STT_MODELS") ?? "whisper-large-v3-turbo").split(",")[0].trim());
    const r = await fetchImpl(`${BASE}/audio/transcriptions`, { method: "POST", headers: { authorization: `Bearer ${key}` }, body: form });
    await r.text().catch(() => "");
    ears = pick(r);
  } catch (e) {
    ears = { error: String(e) };
  }
  const data = {
    enabled: true,
    checkedAt: new Date().toISOString(),
    chat,
    voice,
    ears,
    extraProviders: ["GEMINI_API_KEY", "CEREBRAS_API_KEY", "OPENROUTER_API_KEY"].filter((k) => !!env(k)),
  };
  cache = { at: Date.now(), data };
  return new Response(JSON.stringify(data), { headers });
}

export default function handler(req: Request): Promise<Response> {
  return handle(req);
}
