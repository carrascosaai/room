import type { MLCEngineInterface } from "@mlc-ai/web-llm";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface CompleteOptions {
  temperature?: number;
  maxTokens?: number;
  /** JSON Schema (como string) para forzar salida JSON con gramática. */
  jsonSchema?: string;
  /** Etiqueta de la tarea (solo para depurar y para el modo demo). */
  tag?: "reply" | "correct" | "expressions" | "suggest" | "translate" | "rephrase";
  /** Recibe el texto acumulado; si devuelve true se corta la generación. */
  onText?: (text: string) => boolean | void;
}

export interface LLM {
  complete(messages: ChatMessage[], opts?: CompleteOptions): Promise<string>;
  unload(): Promise<void>;
}

export interface LoadProgress {
  /** 0..1 */
  progress: number;
  text: string;
}

// Las peticiones al modelo se hacen de una en una.
function createQueue() {
  let chain: Promise<unknown> = Promise.resolve();
  return <T>(fn: () => Promise<T>): Promise<T> => {
    const p = chain.then(fn, fn);
    chain = p.catch(() => undefined);
    return p;
  };
}

class WebLLMEngine implements LLM {
  private enqueue = createQueue();
  constructor(private engine: MLCEngineInterface, private worker: Worker) {}

  complete(messages: ChatMessage[], opts: CompleteOptions = {}): Promise<string> {
    return this.enqueue(async () => {
      const base = {
        messages,
        temperature: opts.temperature ?? 0.7,
        max_tokens: opts.maxTokens ?? 256,
      };
      if (opts.jsonSchema) {
        try {
          const res = await this.engine.chat.completions.create({
            ...base,
            stream: false,
            response_format: { type: "json_object", schema: opts.jsonSchema },
          });
          return res.choices[0]?.message?.content ?? "";
        } catch (err) {
          // Si la gramática falla, lo intentamos sin ella; el parseo es tolerante.
          console.warn("JSON mode falló, reintentando sin gramática", err);
          const res = await this.engine.chat.completions.create({ ...base, stream: false });
          return res.choices[0]?.message?.content ?? "";
        }
      }
      const stream = await this.engine.chat.completions.create({ ...base, stream: true });
      let text = "";
      let stopped = false;
      for await (const chunk of stream) {
        if (stopped) continue;
        text += chunk.choices[0]?.delta?.content ?? "";
        if (opts.onText?.(text)) {
          stopped = true;
          this.engine.interruptGenerate();
        }
      }
      return text;
    });
  }

  async unload() {
    try {
      await this.engine.unload();
    } finally {
      this.worker.terminate();
    }
  }
}

export async function loadWebLLM(
  modelId: string,
  onProgress: (p: LoadProgress) => void,
): Promise<LLM> {
  const { CreateWebWorkerMLCEngine } = await import("@mlc-ai/web-llm");
  const worker = new Worker(new URL("./llm.worker.ts", import.meta.url), { type: "module" });
  try {
    const engine = await CreateWebWorkerMLCEngine(worker, modelId, {
      initProgressCallback: (r) => onProgress({ progress: r.progress, text: r.text }),
    });
    return new WebLLMEngine(engine, worker);
  } catch (err) {
    worker.terminate();
    throw err;
  }
}

export async function isModelCached(modelId: string): Promise<boolean> {
  try {
    const { hasModelInCache } = await import("@mlc-ai/web-llm");
    return await hasModelInCache(modelId);
  } catch {
    return false;
  }
}

export async function deleteCachedModel(modelId: string): Promise<void> {
  const { deleteModelAllInfoInCache } = await import("@mlc-ai/web-llm");
  await deleteModelAllInfoInCache(modelId);
}

/** Pide al navegador que no borre el modelo cuando falte espacio. */
export async function requestPersistentStorage(): Promise<void> {
  try {
    if (navigator.storage?.persist && !(await navigator.storage.persisted())) {
      await navigator.storage.persist();
    }
  } catch {
    /* no pasa nada */
  }
}

export async function freeStorageMB(): Promise<number | null> {
  try {
    const est = await navigator.storage?.estimate?.();
    if (!est?.quota) return null;
    return (est.quota - (est.usage ?? 0)) / 1e6;
  } catch {
    return null;
  }
}
