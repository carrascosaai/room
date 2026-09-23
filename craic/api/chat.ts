// Función de Vercel (Edge, plan gratuito): puente seguro con la IA en la nube.
// La clave del proveedor vive en una variable de entorno de Vercel y nunca
// llega al navegador. Compatible con cualquier API tipo OpenAI (Groq por defecto).
//
// Variables de entorno (Vercel → Settings → Environment Variables):
//   GROQ_API_KEY      clave gratuita de https://console.groq.com/keys (obligatoria)
//   LLM_API_URL       opcional, otro proveedor compatible con OpenAI
//   LLM_MODELS_FAST   opcional, modelos para responder (separados por comas)
//   LLM_MODELS_SMART  opcional, modelos para correcciones y resúmenes

export const config = { runtime: "edge" };

const env = (k: string): string | undefined =>
  (globalThis as unknown as { process?: { env: Record<string, string | undefined> } }).process?.env?.[k];

const DEFAULT_FAST = "llama-3.1-8b-instant,openai/gpt-oss-20b,meta-llama/llama-4-scout-17b-16e-instruct,llama-3.3-70b-versatile";
const DEFAULT_SMART = "llama-3.3-70b-versatile,openai/gpt-oss-20b,llama-3.1-8b-instant";

const MAX_MESSAGES = 40;
const MAX_CHARS = 20000;
const MAX_TOKENS = 700;
const RATE_PER_MIN = 40;

// Modelo que ha funcionado (se recuerda mientras la instancia siga viva).
const working: Record<string, string | undefined> = {};
const hits = new Map<string, { n: number; t: number }>();

type Msg = { role: string; content: string };
interface Body {
  messages: Msg[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
  json?: boolean;
  tier?: "fast" | "smart";
}

const json = (status: number, data: unknown, extra: Record<string, string> = {}) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json", ...extra } });

function allowedOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true; // mismo origen en algunos navegadores
  try {
    const o = new URL(origin);
    const self = new URL(req.url);
    return o.host === self.host || o.hostname === "localhost" || o.hostname === "127.0.0.1";
  } catch {
    return false;
  }
}

function rateLimited(req: Request): boolean {
  const ip = req.headers.get("x-real-ip") ?? req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "?";
  const now = Date.now();
  const h = hits.get(ip);
  if (!h || now - h.t > 60000) {
    hits.set(ip, { n: 1, t: now });
    if (hits.size > 5000) hits.clear();
    return false;
  }
  h.n++;
  return h.n > RATE_PER_MIN;
}

function validate(b: unknown): Body | string {
  if (!b || typeof b !== "object") return "cuerpo inválido";
  const body = b as Body;
  if (!Array.isArray(body.messages) || !body.messages.length || body.messages.length > MAX_MESSAGES) return "mensajes inválidos";
  let chars = 0;
  for (const m of body.messages) {
    if (!m || typeof m.content !== "string" || !["system", "user", "assistant"].includes(m.role)) return "mensaje inválido";
    chars += m.content.length;
  }
  if (chars > MAX_CHARS) return "conversación demasiado larga";
  return body;
}

export async function handle(req: Request, fetchImpl: typeof fetch = fetch): Promise<Response> {
  const key = env("GROQ_API_KEY") ?? env("LLM_API_KEY");
  if (req.method === "GET") return json(200, { enabled: !!key }, { "cache-control": "no-store" });
  if (req.method !== "POST") return json(405, { error: "method not allowed" });
  if (!key) return json(503, { error: "cloud disabled" });
  if (!allowedOrigin(req)) return json(403, { error: "forbidden" });
  if (rateLimited(req)) return json(429, { error: "rate limited" });

  let parsed: unknown;
  try {
    parsed = await req.json();
  } catch {
    return json(400, { error: "invalid json" });
  }
  const body = validate(parsed);
  if (typeof body === "string") return json(400, { error: body });

  const tier = body.tier === "smart" ? "smart" : "fast";
  const list = (env(tier === "smart" ? "LLM_MODELS_SMART" : "LLM_MODELS_FAST") ?? (tier === "smart" ? DEFAULT_SMART : DEFAULT_FAST))
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const models = working[tier] ? [working[tier]!, ...list.filter((m) => m !== working[tier])] : list;
  const url = env("LLM_API_URL") ?? "https://api.groq.com/openai/v1/chat/completions";

  let lastStatus = 502;
  let lastError = "sin modelos disponibles";
  for (const model of models) {
    const payload: Record<string, unknown> = {
      model,
      messages: body.messages,
      temperature: Math.min(Math.max(body.temperature ?? 0.7, 0), 1.5),
      max_tokens: Math.min(body.max_tokens ?? 256, MAX_TOKENS),
      stream: !!body.stream,
    };
    if (body.json) payload.response_format = { type: "json_object" };
    if (model.startsWith("openai/gpt-oss")) {
      // Modelos con razonamiento: el mínimo, para responder rápido.
      payload.reasoning_effort = "low";
      payload.include_reasoning = false;
      payload.max_tokens = Math.min((payload.max_tokens as number) + 400, 1200);
    }
    let res: Response;
    try {
      res = await fetchImpl(url, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
        body: JSON.stringify(payload),
      });
    } catch (e) {
      lastStatus = 502;
      lastError = String(e);
      continue;
    }
    if (res.ok) {
      working[tier] = model;
      return new Response(res.body, {
        status: 200,
        headers: {
          "content-type": res.headers.get("content-type") ?? (body.stream ? "text/event-stream" : "application/json"),
          "cache-control": "no-store",
          "x-model": model,
        },
      });
    }
    const text = await res.text().catch(() => "");
    lastStatus = res.status;
    lastError = text.slice(0, 300);
    // Modelo retirado o no disponible → probar el siguiente. Otros errores se devuelven.
    const modelProblem =
      res.status === 404 ||
      ((res.status === 400 || res.status === 422) && /model|decommission|not found|does not exist/i.test(text)) ||
      (body.json && res.status === 400 && /json|response_format/i.test(text));
    if (!modelProblem && res.status !== 503) break;
    if (working[tier] === model) working[tier] = undefined;
  }
  return json(lastStatus === 429 ? 429 : lastStatus >= 500 ? 502 : lastStatus, { error: lastError });
}

export default function handler(req: Request): Promise<Response> {
  return handle(req);
}
