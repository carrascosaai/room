import { getAudioStatus } from "../speech/audioModels";
import { loadDiagnostics } from "../llm/engine";

// Detección de otras pestañas de Craic abiertas (pueden competir por la GPU).
let otherTabs = 0;
try {
  const bc = new BroadcastChannel("craic-tabs");
  bc.onmessage = (e) => {
    if (e.data === "hello") bc.postMessage("here");
    else if (e.data === "here") otherTabs++;
  };
  bc.postMessage("hello");
} catch {
  /* sin BroadcastChannel */
}
export const hasOtherTabs = () => otherTabs > 0;

/** Informe técnico para enviar al desarrollador cuando algo falla. */
export async function collectDiagnostics(): Promise<string> {
  const lines: string[] = [];
  const add = (k: string, v: unknown) => lines.push(`${k}: ${typeof v === "string" ? v : JSON.stringify(v)}`);
  add("versión", __APP_VERSION__);
  add("navegador", navigator.userAgent);
  add("aislado (COOP/COEP)", window.crossOriginIsolated);
  add("núcleos", navigator.hardwareConcurrency);
  add("memoria (GB)", (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? "?");
  add("otras pestañas de Craic", otherTabs);
  add("service worker", !!navigator.serviceWorker?.controller);
  try {
    type Adapter = {
      features: Set<string>;
      limits: Record<string, number>;
      info?: Record<string, string>;
      requestAdapterInfo?: () => Promise<Record<string, string>>;
    };
    const gpu = (navigator as Navigator & { gpu?: { requestAdapter(): Promise<Adapter | null> } }).gpu;
    const a = await gpu?.requestAdapter();
    if (!a) add("gpu", "sin adaptador");
    else {
      const info = a.info ?? (await a.requestAdapterInfo?.()) ?? {};
      add("gpu", { vendor: info.vendor, architecture: info.architecture, description: info.description });
      add("shader-f16", a.features.has("shader-f16"));
      add("maxBufferSize (MB)", Math.round(a.limits.maxBufferSize / 1e6));
      add("maxStorageBufferBindingSize (MB)", Math.round(a.limits.maxStorageBufferBindingSize / 1e6));
    }
  } catch (e) {
    add("gpu", `error: ${String(e)}`);
  }
  try {
    const est = await navigator.storage?.estimate?.();
    if (est) add("almacenamiento (MB)", { usado: Math.round((est.usage ?? 0) / 1e6), cuota: Math.round((est.quota ?? 0) / 1e6) });
  } catch {
    /* nada */
  }
  add("modelo", loadDiagnostics.modelId);
  add("último paso", loadDiagnostics.lastProgressText);
  add("error", loadDiagnostics.error);
  const a = getAudioStatus();
  add("voz", { estado: a.tts, dispositivo: a.ttsDevice, error: a.ttsError });
  add("oído", { estado: a.asr, modelo: a.asrModel, error: a.asrError });
  return lines.join("\n");
}
