import type { MLCEngineInterface } from "@mlc-ai/web-llm";
import { PriorityScheduler, type Priority } from "./scheduler";

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
  /** high = respuesta del personaje, normal = ayudas, low = correcciones (interrumpibles) */
  priority?: Priority;
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

class WebLLMEngine implements LLM {
  private scheduler: PriorityScheduler;
  constructor(private engine: MLCEngineInterface, private worker: Worker) {
    this.scheduler = new PriorityScheduler(() => this.engine.interruptGenerate());
  }

  complete(messages: ChatMessage[], opts: CompleteOptions = {}): Promise<string> {
    return this.scheduler.submit(async () => {
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
    }, opts.priority ?? "normal");
  }

  async unload() {
    try {
      await this.engine.unload();
    } finally {
      this.worker.terminate();
    }
  }
}

/** Último estado de la carga, para el diagnóstico. */
export const loadDiagnostics = { modelId: "", lastProgressText: "", error: "" };

/**
 * Carga el modelo en un worker. Nunca se queda colgada en silencio: si el
 * worker falla se rechaza con el error, y si no hay progreso en `stallMs`
 * se rechaza con un StallError (el llamante puede reintentar).
 */
export async function loadWebLLM(
  modelId: string,
  onProgress: (p: LoadProgress) => void,
  stallMs = 45000,
): Promise<LLM> {
  const { CreateWebWorkerMLCEngine } = await import("@mlc-ai/web-llm");
  const worker = new Worker(new URL("./llm.worker.ts", import.meta.url), { type: "module" });
  loadDiagnostics.modelId = modelId;
  loadDiagnostics.lastProgressText = "";
  loadDiagnostics.error = "";
  let lastProgress = Date.now();
  let timer: ReturnType<typeof setInterval> | undefined;
  const guard = new Promise<never>((_, reject) => {
    worker.onerror = (e) => {
      e.preventDefault?.();
      reject(new Error(`Error en el motor de IA: ${e.message || "desconocido"} (${e.filename ?? ""}:${e.lineno ?? ""})`));
    };
    worker.onmessageerror = () => reject(new Error("Error de comunicación con el motor de IA"));
    timer = setInterval(() => {
      if (Date.now() - lastProgress > stallMs) {
        reject(
          Object.assign(
            new Error(
              `Sin progreso durante ${Math.round(stallMs / 1000)} s (último paso: ${loadDiagnostics.lastProgressText || "ninguno"})`,
            ),
            { name: "StallError" },
          ),
        );
      }
    }, 1000);
  });
  try {
    const engine = await Promise.race([
      CreateWebWorkerMLCEngine(worker, modelId, {
        initProgressCallback: (r) => {
          lastProgress = Date.now();
          loadDiagnostics.lastProgressText = r.text;
          onProgress({ progress: r.progress, text: r.text });
        },
      }),
      guard,
    ]);
    const llm = new WebLLMEngine(engine, worker);
    // Calentamiento: compila los shaders de la GPU ya, para que la primera
    // respuesta de verdad no tarde de más.
    void llm
      .complete([{ role: "user", content: "Hi" }], { maxTokens: 1, priority: "low", temperature: 0 })
      .catch(() => undefined);
    return llm;
  } catch (err) {
    loadDiagnostics.error = `${(err as Error)?.name ?? ""}: ${(err as Error)?.message ?? String(err)}`;
    worker.terminate();
    throw err;
  } finally {
    clearInterval(timer);
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
