export type WebGPUStatus =
  | { ok: true; f16: boolean; mobile: boolean }
  | { ok: false; reason: "insecure" | "no-api" | "no-adapter"; mobile: boolean };

export function isMobile(): boolean {
  const ua = navigator.userAgent;
  return /Android|iPhone|iPad|iPod|Mobile/i.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

type GPUAdapterLike = { features: { has(f: string): boolean } };
type GPULike = { requestAdapter(opts?: unknown): Promise<GPUAdapterLike | null> };

export async function checkWebGPU(): Promise<WebGPUStatus> {
  const mobile = isMobile();
  if (!window.isSecureContext) return { ok: false, reason: "insecure", mobile };
  const gpu = (navigator as Navigator & { gpu?: GPULike }).gpu;
  if (!gpu) return { ok: false, reason: "no-api", mobile };
  try {
    const adapter = await gpu.requestAdapter({ powerPreference: "high-performance" });
    if (!adapter) return { ok: false, reason: "no-adapter", mobile };
    return { ok: true, f16: adapter.features.has("shader-f16"), mobile };
  } catch {
    return { ok: false, reason: "no-adapter", mobile };
  }
}
