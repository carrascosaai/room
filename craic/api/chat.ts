// Función de Vercel (Edge, plan gratuito): puente seguro con la IA en la nube.
// La clave del proveedor vive en una variable de entorno de Vercel y nunca
// llega al navegador. Compatible con cualquier API tipo OpenAI (Groq por defecto).
//
// Variables de entorno (Vercel → Settings → Environment Variables):
//   GROQ_API_KEY      clave gratuita de https://console.groq.com/keys (obligatoria)
//   LLM_API_URL       opcional, otro proveedor compatible con OpenAI
//   LLM_MODELS_FAST   opcional, modelos para responder (separados por comas)
//   LLM_MODELS_SMART  opcional, modelos para correcciones y resúmenes
//
// Más capacidad gratis para muchos usuarios (opcionales; se usan cuando Groq
// llega a su límite, cada una con su propio cupo gratuito):
//   GROQ_API_KEYS       varias claves de Groq de cuentas distintas, separadas por comas
//   GEMINI_API_KEY      https://aistudio.google.com/apikey
//   CEREBRAS_API_KEY    https://cloud.cerebras.ai
//   OPENROUTER_API_KEY  https://openrouter.ai/keys (modelos «:free»)

export const config = { runtime: "edge" };

const env = (k: string): string | undefined =>
  (globalThis as unknown as { process?: { env: Record<string, string | undefined> } }).process?.env?.[k];

// Modelos de Groq disponibles (septiembre 2026; ver GET /api/chat?models=1).
// Los que ya no existan se saltan solos durante una hora.
const DEFAULT_FAST = "openai/gpt-oss-20b,openai/gpt-oss-120b,qwen/qwen3.8-27b";
const DEFAULT_SMART = "openai/gpt-oss-120b,openai/gpt-oss-20b,qwen/qwen3.8-27b";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

/** Proveedores extra compatibles con OpenAI (se usan cuando Groq está saturado). */
const EXTRA: { keyEnv: string; url: string; modelsEnv: string; fast: string; smart: string }[] = [
  {
    keyEnv: "CEREBRAS_API_KEY",
    url: "https://api.cerebras.ai/v1/chat/completions",
    modelsEnv: "CEREBRAS_MODELS",
    fast: "llama3.1-8b,gpt-oss-120b,llama-3.3-70b",
    smart: "gpt-oss-120b,llama-3.3-70b,llama3.1-8b",
  },
  {
    keyEnv: "GEMINI_API_KEY",
    url: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
    modelsEnv: "GEMINI_MODELS",
    fast: "gemini-2.5-flash-lite,gemini-2.0-flash-lite,gemini-2.0-flash",
    smart: "gemini-2.5-flash,gemini-2.5-flash-lite,gemini-2.0-flash",
  },
  {
    keyEnv: "OPENROUTER_API_KEY",
    url: "https://openrouter.ai/api/v1/chat/completions",
    modelsEnv: "OPENROUTER_MODELS",
    fast: "meta-llama/llama-3.3-70b-instruct:free,openai/gpt-oss-20b:free",
    smart: "meta-llama/llama-3.3-70b-instruct:free,openai/gpt-oss-20b:free",
  },
];

type Candidate = { url: string; key: string; model: string; id: string };

const list = (v: string | undefined, fallback: string) =>
  (v ?? fallback)
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);

function groqKeys(): string[] {
  const keys = [env("GROQ_API_KEY") ?? env("LLM_API_KEY"), ...list(env("GROQ_API_KEYS"), "")].filter(Boolean) as string[];
  return [...new Set(keys)];
}

/** Todas las combinaciones proveedor/clave/modelo, en orden de preferencia. */
function candidates(tier: "fast" | "smart"): Candidate[] {
  const out: Candidate[] = [];
  const models = list(env(tier === "smart" ? "LLM_MODELS_SMART" : "LLM_MODELS_FAST"), tier === "smart" ? DEFAULT_SMART : DEFAULT_FAST);
  const url = env("LLM_API_URL") ?? GROQ_URL;
  const keys = groqKeys();
  // Primero cada modelo con cada clave (en Groq el cupo va por modelo y por cuenta).
  for (const model of models) keys.forEach((key, i) => out.push({ url, key, model, id: `g${i}:${model}` }));
  for (const p of EXTRA) {
    const key = env(p.keyEnv);
    if (!key) continue;
    for (const model of list(env(p.modelsEnv), tier === "smart" ? p.smart : p.fast)) out.push({ url: p.url, key, model, id: `${p.keyEnv}:${model}` });
  }
  return out;
}

/** Combinaciones saturadas (429) o retiradas: se saltan durante un rato. */
const cooldown = new Map<string, number>();

const MAX_MESSAGES = 40;
const MAX_CHARS = 20000;
const MAX_TOKENS = 700;
const RATE_PER_MIN = 40;
const RATE_PER_IP = 1500;

// Combinación que ha funcionado (se recuerda mientras la instancia siga viva).
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

function bump(key: string, limit: number, now: number): boolean {
  const h = hits.get(key);
  if (!h || now - h.t > 60000) {
    hits.set(key, { n: 1, t: now });
    if (hits.size > 20000) hits.clear();
    return false;
  }
  h.n++;
  return h.n > limit;
}

/**
 * Límite por dispositivo (identificador aleatorio del navegador) y, mucho más
 * alto, por IP: las operadoras móviles comparten una IP entre muchos clientes.
 */
function rateLimited(req: Request): boolean {
  const ip = req.headers.get("x-real-ip") ?? req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "?";
  const cid = (req.headers.get("x-client-id") ?? "").replace(/[^\w-]/g, "").slice(0, 40);
  const now = Date.now();
  const perIp = bump(`ip:${ip}`, RATE_PER_IP, now);
  const perClient = bump(`c:${ip}|${cid || "none"}`, cid ? RATE_PER_MIN : RATE_PER_MIN * 2, now);
  return perIp || perClient;
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
  const key = groqKeys()[0] ?? EXTRA.map((p) => env(p.keyEnv)).find(Boolean);
  if (req.method === "GET") {
    // ?models=1 → modelos disponibles en Groq (solo nombres; para diagnóstico).
    const k = groqKeys()[0];
    if (k && new URL(req.url).searchParams.has("models")) {
      try {
        const r = await fetchImpl("https://api.groq.com/openai/v1/models", { headers: { authorization: `Bearer ${k}` } });
        const d = (await r.json()) as { data?: { id: string }[] };
        return json(200, { models: (d.data ?? []).map((m) => m.id).sort() }, { "cache-control": "no-store" });
      } catch (e) {
        return json(502, { error: String(e) });
      }
    }
    return json(200, { enabled: !!key }, { "cache-control": "no-store" });
  }
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
  const now = Date.now();
  const all = candidates(tier);
  const fresh = all.filter((c) => (cooldown.get(c.id) ?? 0) <= now);
  // Si todo está en pausa, se prueba igualmente (quizá ya se liberó el cupo).
  const pool = fresh.length ? fresh : all;
  const first = pool.find((c) => c.id === working[tier]);
  const order = first ? [first, ...pool.filter((c) => c !== first)] : pool;

  let lastStatus = 502;
  let lastError = "sin modelos disponibles";
  // Si algún modelo estaba saturado, se responde 429 (el navegador reintenta)
  // aunque el último fallo fuera otro (p. ej. un modelo retirado).
  let saturated = false;
  for (const c of order.slice(0, 8)) {
    const payload: Record<string, unknown> = {
      model: c.model,
      messages: body.messages,
      temperature: Math.min(Math.max(body.temperature ?? 0.7, 0), 1.5),
      max_tokens: Math.min(body.max_tokens ?? 256, MAX_TOKENS),
      stream: !!body.stream,
    };
    if (body.json) payload.response_format = { type: "json_object" };
    if (/gpt-oss/.test(c.model)) {
      // Modelos con razonamiento: el mínimo, para responder rápido.
      payload.reasoning_effort = "low";
      if (c.url === GROQ_URL) payload.include_reasoning = false;
      payload.max_tokens = Math.min((payload.max_tokens as number) + 400, 1200);
    } else if (/qwen3/.test(c.model) && c.url === GROQ_URL) {
      // Qwen3 piensa antes de responder: se oculta el razonamiento.
      payload.reasoning_format = "hidden";
      payload.max_tokens = Math.min((payload.max_tokens as number) + 400, 1200);
    }
    let res: Response;
    try {
      res = await fetchImpl(c.url, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${c.key}` },
        body: JSON.stringify(payload),
      });
    } catch (e) {
      lastStatus = 502;
      lastError = String(e);
      continue;
    }
    if (res.ok) {
      working[tier] = c.id;
      return new Response(res.body, {
        status: 200,
        headers: {
          "content-type": res.headers.get("content-type") ?? (body.stream ? "text/event-stream" : "application/json"),
          "cache-control": "no-store",
          "x-model": c.model,
        },
      });
    }
    const text = await res.text().catch(() => "");
    lastStatus = res.status;
    lastError = text.slice(0, 300);
    if (working[tier] === c.id) working[tier] = undefined;
    // Cupo agotado: esta combinación descansa (lo que diga el proveedor, 20 s–10 min) y se prueba otra.
    if (res.status === 429) {
      saturated = true;
      const retry = Number(res.headers.get("retry-after"));
      const ms = Math.min(Math.max(Number.isFinite(retry) && retry > 0 ? retry * 1000 : 20000, 20000), 600000);
      cooldown.set(c.id, Date.now() + ms);
      continue;
    }
    // Modelo retirado o no disponible → siguiente (y no se vuelve a intentar en un buen rato).
    const modelProblem =
      res.status === 404 ||
      ((res.status === 400 || res.status === 422) && /model|decommission|not found|does not exist|reasoning|not supported|unsupported/i.test(text)) ||
      (body.json && res.status === 400 && /json|response_format/i.test(text));
    if (modelProblem) {
      cooldown.set(c.id, Date.now() + 3600000);
      continue;
    }
    if (res.status >= 500 || res.status === 401 || res.status === 403) continue;
    break;
  }
  if (cooldown.size > 500) cooldown.clear();
  if (saturated) return json(429, { error: "busy" }, { "retry-after": "2" });
  return json(lastStatus === 429 ? 429 : lastStatus >= 500 ? 502 : lastStatus, { error: lastError });
}

export default function handler(req: Request): Promise<Response> {
  return handle(req);
}
