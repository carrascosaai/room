// Voz en la nube (Groq · Orpheus): voces muy naturales y rápidas. La clave vive
// en el servidor. Si falla o se satura, la app usa la voz del dispositivo.
//
// Variables opcionales: TTS_MODEL (por defecto canopylabs/orpheus-v1-english),
// TTS_VOICES_FEMALE / TTS_VOICES_MALE (nombres separados por comas).
export const config = { runtime: "edge" };

const env = (k: string): string | undefined =>
  (globalThis as unknown as { process?: { env: Record<string, string | undefined> } }).process?.env?.[k];

const URL_TTS = "https://api.groq.com/openai/v1/audio/speech";
const MODEL = () => env("TTS_MODEL") ?? "canopylabs/orpheus-v1-english";
const list = (v: string | undefined, d: string) => (v ?? d).split(",").map((s) => s.trim()).filter(Boolean);
const VOICES = {
  female: () => list(env("TTS_VOICES_FEMALE"), "hannah,diana,autumn,tara,leah,jess,mia,zoe"),
  male: () => list(env("TTS_VOICES_MALE"), "daniel,austin,troy,leo,dan,zac"),
};
const MAX_CHARS = 400;
const RATE_PER_MIN = 60;

/** Voz que ha funcionado para cada género (se recuerda mientras viva la instancia). */
const working: Record<string, string | undefined> = {};
const badVoices = new Set<string>();
/** Estado del servicio: ¿aceptados los términos? ¿cupo? (comprobado de verdad, 10 min). */
let status: { ok: boolean; at: number; reason?: string } | null = null;
const hits = new Map<string, { n: number; t: number }>();

const json = (s: number, data: unknown, extra: Record<string, string> = {}) =>
  new Response(JSON.stringify(data), { status: s, headers: { "content-type": "application/json", ...extra } });

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

async function speak(key: string, text: string, gender: "female" | "male", fetchImpl: typeof fetch): Promise<Response> {
  const candidates = [working[gender], ...VOICES[gender]()].filter((v, i, a): v is string => !!v && a.indexOf(v) === i && !badVoices.has(v));
  let last: Response | null = null;
  for (const voice of candidates.slice(0, 4)) {
    const r = await fetchImpl(URL_TTS, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
      body: JSON.stringify({ model: MODEL(), input: text, voice, response_format: "wav" }),
    });
    if (r.ok) {
      working[gender] = voice;
      return new Response(r.body, {
        status: 200,
        headers: { "content-type": r.headers.get("content-type") ?? "audio/wav", "cache-control": "private, max-age=86400", "x-voice": voice },
      });
    }
    const body = await r.text().catch(() => "");
    last = json(r.status === 429 ? 429 : r.status >= 500 ? 502 : r.status, { error: body.slice(0, 300) });
    // Voz que no existe → probar la siguiente; cualquier otro error se devuelve.
    if (r.status === 400 && /voice/i.test(body) && !/terms/i.test(body)) {
      badVoices.add(voice);
      continue;
    }
    if (/terms/i.test(body)) status = { ok: false, at: Date.now(), reason: "terms" };
    break;
  }
  return last ?? json(502, { error: "no voice" });
}

export async function handle(req: Request, fetchImpl: typeof fetch = fetch): Promise<Response> {
  const key = env("GROQ_API_KEY") ?? env("LLM_API_KEY");
  if (req.method === "GET") {
    if (!key) return json(200, { enabled: false }, { "cache-control": "no-store" });
    // Comprobación real (una vez cada 10 min por instancia): así la app no intenta
    // usar la voz si, por ejemplo, faltan por aceptar los términos del modelo.
    if (!status || Date.now() - status.at > 600000) {
      const r = await speak(key, "Hi.", "female", fetchImpl).catch(() => json(502, {}));
      status = r.ok ? { ok: true, at: Date.now() } : { ok: false, at: Date.now(), reason: status?.reason ?? String(r.status) };
    }
    return json(200, { enabled: status.ok, reason: status.ok ? undefined : status.reason }, { "cache-control": "no-store" });
  }
  if (req.method !== "POST") return json(405, { error: "method not allowed" });
  if (!key) return json(503, { error: "disabled" });
  if (!allowedOrigin(req)) return json(403, { error: "forbidden" });
  if (limited(req)) return json(429, { error: "rate limited" });
  let body: { text?: unknown; gender?: unknown };
  try {
    body = await req.json();
  } catch {
    return json(400, { error: "invalid json" });
  }
  const text = typeof body.text === "string" ? body.text.trim() : "";
  if (!text || text.length > MAX_CHARS) return json(400, { error: "invalid text" });
  const gender = body.gender === "male" ? "male" : "female";
  return speak(key, text, gender, fetchImpl);
}

export default function handler(req: Request): Promise<Response> {
  return handle(req);
}
