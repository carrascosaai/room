import type { ChatMessage, CompleteOptions, LLM } from "./engine";

// IA en la nube (Groq a través de /api/chat en Vercel): rápida y sin descargas.
// Las peticiones pueden ir en paralelo (las correcciones no frenan la respuesta).

const endpoint = () => `${import.meta.env.BASE_URL}api/chat`;

let availability: Promise<boolean> | null = null;

/** ¿Está configurada la IA en la nube en este despliegue? */
export function cloudAvailable(recheck = false): Promise<boolean> {
  const check = async (ms: number) => {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), ms);
      const res = await fetch(endpoint(), { cache: "no-store", signal: ctrl.signal });
      clearTimeout(t);
      if (!res.ok) return false;
      const data = (await res.json()) as { enabled?: boolean };
      return !!data.enabled;
    } catch {
      return false;
    }
  };
  // Un «no» puede ser una red lenta: se reintenta una vez con más margen.
  availability ??= check(6000).then((ok) => ok || check(12000));
  if (recheck) {
    availability = availability.then((ok) => ok || check(12000));
  }
  return availability;
}

export class CloudError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "CloudError";
  }
}

export class CloudLLM implements LLM {
  async complete(messages: ChatMessage[], opts: CompleteOptions = {}): Promise<string> {
    const stream = !!opts.onText && !opts.jsonSchema;
    const smart = opts.tag === "correct" || opts.tag === "expressions" || opts.tag === "suggest";
    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), stream ? 30000 : 45000);
    try {
      const res = await fetch(endpoint(), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          messages,
          temperature: opts.temperature ?? 0.7,
          max_tokens: opts.maxTokens ?? 256,
          stream,
          json: !!opts.jsonSchema,
          tier: smart ? "smart" : "fast",
        }),
        signal: ctrl.signal,
      });
      if (!res.ok) {
        const msg = await res.text().catch(() => "");
        throw new CloudError(`Cloud ${res.status}: ${msg.slice(0, 200)}`, res.status);
      }
      if (!stream) {
        const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
        return data.choices?.[0]?.message?.content ?? "";
      }
      return await readSSE(res, (text) => !!opts.onText?.(text));
    } catch (err) {
      // Parada voluntaria tras la primera pregunta: no es un error.
      if (ctrl.signal.aborted && (err as Error)?.name === "AbortError" && stopped.has(ctrl)) return stopped.get(ctrl)!;
      if ((err as Error)?.name === "AbortError") throw new CloudError("La IA en la nube tardó demasiado", 504);
      throw err;
    } finally {
      clearTimeout(timeout);
      stopped.delete(ctrl);
    }

    async function readSSE(res: Response, onText: (t: string) => boolean): Promise<string> {
      const reader = res.body!.getReader();
      const dec = new TextDecoder();
      let buf = "";
      let text = "";
      for (;;) {
        let chunk: ReadableStreamReadResult<Uint8Array>;
        try {
          chunk = await reader.read();
        } catch (e) {
          if (stopped.has(ctrl)) return text;
          throw e;
        }
        if (chunk.done) break;
        buf += dec.decode(chunk.value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          const l = line.trim();
          if (!l.startsWith("data:")) continue;
          const data = l.slice(5).trim();
          if (data === "[DONE]") return text;
          try {
            const j = JSON.parse(data) as { choices?: { delta?: { content?: string } }[] };
            const d = j.choices?.[0]?.delta?.content ?? "";
            if (!d) continue;
            text += d;
            if (onText(text)) {
              stopped.set(ctrl, text);
              try {
                await reader.cancel();
              } catch {
                /* nada */
              }
              return text;
            }
          } catch {
            /* línea incompleta */
          }
        }
      }
      return text;
    }
  }

  async unload() {}
}

const stopped = new Map<AbortController, string>();
