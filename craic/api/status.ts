// Estado del cupo gratuito de Groq (para el propietario): hace una petición
// mínima a la IA y a la voz y devuelve los límites que informa Groq.
// Se guarda 60 s para que abrir la página muchas veces no gaste cupo.
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

export async function handle(_req: Request, fetchImpl: typeof fetch = fetch): Promise<Response> {
  const key = env("GROQ_API_KEY") ?? env("LLM_API_KEY");
  const headers = { "content-type": "application/json", "cache-control": "no-store" };
  if (!key) return new Response(JSON.stringify({ enabled: false }), { headers });
  if (cache && Date.now() - cache.at < 60000) return new Response(JSON.stringify(cache.data), { headers });

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
  let voice: Limits | { error: string };
  try {
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
  const data = {
    enabled: true,
    checkedAt: new Date().toISOString(),
    chat,
    voice,
    extraProviders: ["GEMINI_API_KEY", "CEREBRAS_API_KEY", "OPENROUTER_API_KEY"].filter((k) => !!env(k)),
  };
  cache = { at: Date.now(), data };
  return new Response(JSON.stringify(data), { headers });
}

export default function handler(req: Request): Promise<Response> {
  return handle(req);
}
