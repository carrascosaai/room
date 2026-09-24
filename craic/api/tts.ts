// Voz en la nube (Groq · Orpheus): voces muy naturales y rápidas. La clave vive
// en el servidor. Si falla o se satura, la app usa la voz del dispositivo.
export const config = { runtime: "edge" };

const env = (k: string): string | undefined =>
  (globalThis as unknown as { process?: { env: Record<string, string | undefined> } }).process?.env?.[k];

const URL_TTS = "https://api.groq.com/openai/v1/audio/speech";
const MODEL = () => env("TTS_MODEL") ?? "canopylabs/orpheus-v1-english";

const json = (status: number, data: unknown, extra: Record<string, string> = {}) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json", ...extra } });

export async function handle(req: Request, fetchImpl: typeof fetch = fetch): Promise<Response> {
  const key = env("GROQ_API_KEY") ?? env("LLM_API_KEY");
  if (req.method === "GET") {
    const u = new URL(req.url);
    if (key && u.searchParams.has("probe")) {
      // Diagnóstico: el proveedor responde con las voces válidas si la pedida no existe.
      const r = await fetchImpl(URL_TTS, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
        body: JSON.stringify({ model: MODEL(), input: "Hi.", voice: u.searchParams.get("voice") ?? "zz-probe", response_format: "wav" }),
      });
      const h: Record<string, string> = {};
      r.headers.forEach((v, k) => (k.startsWith("x-ratelimit") ? (h[k] = v) : undefined));
      return json(200, { status: r.status, type: r.headers.get("content-type"), body: r.ok ? "(audio)" : (await r.text()).slice(0, 600), limits: h });
    }
    return json(200, { enabled: !!key }, { "cache-control": "no-store" });
  }
  return json(405, { error: "method not allowed" });
}

export default function handler(req: Request): Promise<Response> {
  return handle(req);
}
