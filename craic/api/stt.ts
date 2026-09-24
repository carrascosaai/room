// Tu voz a texto en la nube (Groq · Whisper): mucho más fiable que el
// reconocimiento del navegador, sobre todo con acento español.
// Recibe un WAV (16 kHz mono) y devuelve { text }.
export const config = { runtime: "edge" };

const env = (k: string): string | undefined =>
  (globalThis as unknown as { process?: { env: Record<string, string | undefined> } }).process?.env?.[k];

const URL_STT = "https://api.groq.com/openai/v1/audio/transcriptions";
const MODELS = () => (env("STT_MODELS") ?? "whisper-large-v3-turbo,whisper-large-v3").split(",").map((s) => s.trim()).filter(Boolean);
const MAX_BYTES = 3_000_000; // ~90 s a 16 kHz
const RATE_PER_MIN = 40;
const hits = new Map<string, { n: number; t: number }>();

const json = (s: number, data: unknown, extra: Record<string, string> = {}) =>
  new Response(JSON.stringify(data), { status: s, headers: { "content-type": "application/json", "cache-control": "no-store", ...extra } });

function allowedOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true;
  try {
    const o = new URL(origin);
    return o.host === new URL(req.url).host || o.hostname === "localhost" || o.hostname === "127.0.0.1";
  } catch {
    return false;
  }
}

function limited(req: Request): boolean {
  const ip = req.headers.get("x-real-ip") ?? req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "?";
  const cid = (req.headers.get("x-client-id") ?? "").replace(/[^\w-]/g, "").slice(0, 40);
  const key = `${ip}|${cid}`;
  const now = Date.now();
  const h = hits.get(key);
  if (!h || now - h.t > 60000) {
    hits.set(key, { n: 1, t: now });
    if (hits.size > 20000) hits.clear();
    return false;
  }
  return ++h.n > RATE_PER_MIN;
}

export async function handle(req: Request, fetchImpl: typeof fetch = fetch): Promise<Response> {
  const key = env("GROQ_API_KEY") ?? env("LLM_API_KEY");
  if (req.method === "GET") return json(200, { enabled: !!key });
  if (req.method !== "POST") return json(405, { error: "method not allowed" });
  if (!key) return json(503, { error: "disabled" });
  if (!allowedOrigin(req)) return json(403, { error: "forbidden" });
  if (limited(req)) return json(429, { error: "rate limited" });

  const declared = Number(req.headers.get("content-length"));
  if (declared > MAX_BYTES) return json(413, { error: "audio too long" });
  const audio = await req.arrayBuffer();
  if (audio.byteLength < 1000 || audio.byteLength > MAX_BYTES) return json(400, { error: "invalid audio" });
  const params = new URL(req.url).searchParams;
  const lang = params.get("lang") === "fr" ? "fr" : "en";
  // Contexto (lo último que dijo el personaje): ayuda con nombres y temas.
  const prompt = (params.get("prompt") ?? "").slice(0, 300);

  let last: Response | null = null;
  for (const model of MODELS()) {
    const form = new FormData();
    form.append("file", new Blob([audio], { type: "audio/wav" }), "speech.wav");
    form.append("model", model);
    form.append("language", lang);
    form.append("temperature", "0");
    form.append("response_format", "json");
    if (prompt) form.append("prompt", prompt);
    const r = await fetchImpl(URL_STT, { method: "POST", headers: { authorization: `Bearer ${key}` }, body: form });
    if (r.ok) {
      const d = (await r.json()) as { text?: string };
      return json(200, { text: (d.text ?? "").trim(), model });
    }
    const body = await r.text().catch(() => "");
    last = json(r.status === 429 ? 429 : r.status >= 500 ? 502 : r.status, { error: body.slice(0, 300) });
    // Saturado o modelo no disponible → el siguiente.
    if (r.status === 429 || r.status >= 500 || /model/i.test(body)) continue;
    break;
  }
  return last ?? json(502, { error: "no model" });
}

export default function handler(req: Request): Promise<Response> {
  return handle(req);
}
