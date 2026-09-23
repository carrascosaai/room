// Modelos elegidos de `prebuiltAppConfig.model_list` de @mlc-ai/web-llm 0.2.85.
// Cada opción tiene dos variantes: q4f16 (más rápida y ligera, necesita la
// extensión WebGPU `shader-f16`) y q4f32 (compatible con más GPUs).

export type ModelTier = "light" | "quality";

export interface ModelOption {
  tier: ModelTier;
  label: string;
  description: string;
  /** model_id para GPUs con shader-f16 */
  idF16: string;
  /** model_id de respaldo sin shader-f16 */
  idF32: string;
  /** Tamaño aproximado de descarga (MB) por si no se puede consultar el real. */
  approxDownloadMB: { f16: number; f32: number };
  /** Memoria de GPU aproximada (MB), sacada de vram_required_MB. */
  vramMB: { f16: number; f32: number };
}

export const MODEL_OPTIONS: Record<ModelTier, ModelOption> = {
  light: {
    tier: "light",
    label: "Ligero",
    description: "Llama 3.2 1B · rápido y apto para la mayoría de móviles",
    idF16: "Llama-3.2-1B-Instruct-q4f16_1-MLC",
    idF32: "Llama-3.2-1B-Instruct-q4f32_1-MLC",
    approxDownloadMB: { f16: 700, f32: 750 },
    vramMB: { f16: 879, f32: 1129 },
  },
  quality: {
    tier: "quality",
    label: "Mejor calidad",
    description: "Llama 3.2 3B · conversación más natural, necesita más memoria",
    idF16: "Llama-3.2-3B-Instruct-q4f16_1-MLC",
    idF32: "Llama-3.2-3B-Instruct-q4f32_1-MLC",
    approxDownloadMB: { f16: 1800, f32: 1900 },
    vramMB: { f16: 2264, f32: 2952 },
  },
};

export function modelIdFor(tier: ModelTier, f16: boolean): string {
  const opt = MODEL_OPTIONS[tier];
  return f16 ? opt.idF16 : opt.idF32;
}

export function approxSizeMB(tier: ModelTier, f16: boolean): number {
  const opt = MODEL_OPTIONS[tier];
  return f16 ? opt.approxDownloadMB.f16 : opt.approxDownloadMB.f32;
}

export function formatMB(mb: number): string {
  if (mb >= 1000) return `${(mb / 1000).toFixed(1).replace(".", ",")} GB`;
  return `${Math.round(mb)} MB`;
}

/**
 * Consulta el tamaño real de los pesos en Hugging Face sumando los shards de
 * tensor-cache.json (unos pocos KB). Devuelve null si no se puede.
 */
export async function fetchDownloadSizeMB(modelId: string): Promise<number | null> {
  try {
    const { prebuiltAppConfig } = await import("@mlc-ai/web-llm");
    const record = prebuiltAppConfig.model_list.find((m) => m.model_id === modelId);
    if (!record) return null;
    let base = record.model.endsWith("/") ? record.model : record.model + "/";
    if (!/\/resolve\/.+\//.test(base)) base += "resolve/main/";
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch(base + "tensor-cache.json", { signal: ctrl.signal });
    clearTimeout(timer);
    if (!res.ok) return null;
    const json = (await res.json()) as { records?: { nbytes?: number }[] };
    const bytes = (json.records ?? []).reduce((acc, r) => acc + (r.nbytes ?? 0), 0);
    if (!bytes) return null;
    // + ~5 MB de la librería wasm y el tokenizador
    return bytes / 1e6 + 5;
  } catch {
    return null;
  }
}
