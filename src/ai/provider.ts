// ─────────────────────────────────────────────────────────────
// AI provider abstraction. The game NEVER depends on this being
// available. It is a language-polish layer over deterministic
// commentary only.
// ─────────────────────────────────────────────────────────────

export interface AiRequest {
  system: string;
  user: string;
  /** hard cap; keep small — these are one-liners */
  maxTokens?: number;
  temperature?: number;
  timeoutMs?: number;
}

export interface AiProvider {
  readonly available: boolean;
  readonly label: string;
  complete(req: AiRequest): Promise<string | null>;
}

class NullProvider implements AiProvider {
  readonly available = false;
  readonly label = "deterministic";
  async complete(): Promise<string | null> {
    return null;
  }
}

class OpenAiProvider implements AiProvider {
  readonly available = true;
  readonly label: string;
  constructor(
    private apiKey: string,
    private model: string,
    private baseUrl: string,
  ) {
    this.label = `openai:${model}`;
  }

  async complete(req: AiRequest): Promise<string | null> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), req.timeoutMs ?? 6000);
    try {
      const res = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: "system", content: req.system },
            { role: "user", content: req.user },
          ],
          max_tokens: req.maxTokens ?? 220,
          temperature: req.temperature ?? 0.8,
          response_format: { type: "json_object" },
        }),
        signal: controller.signal,
      });
      if (!res.ok) return null;
      const data = (await res.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      return data.choices?.[0]?.message?.content ?? null;
    } catch {
      return null;
    } finally {
      clearTimeout(timeout);
    }
  }
}

let cached: AiProvider | null = null;

export function getAiProvider(): AiProvider {
  if (cached) return cached;
  const key = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  const baseUrl = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
  cached = key ? new OpenAiProvider(key, model, baseUrl) : new NullProvider();
  return cached;
}
