/// <reference lib="webworker" />
// Worker de voz: Kokoro-82M. En GPU (WebGPU, fp32) suena natural y va rápido;
// si no hay GPU disponible para ello, en CPU (WASM, q8).
import { env } from "@huggingface/transformers";
import { KokoroTTS } from "kokoro-js";

export type TtsIn =
  | { type: "init"; wasmPaths: string }
  | { type: "load"; device: "webgpu" | "wasm" }
  | { type: "tts"; id: number; text: string; voice: string; speed: number };

export type TtsOut =
  | { type: "progress"; loaded: number; total: number }
  | { type: "ready"; device: "webgpu" | "wasm" }
  | { type: "load-error"; message: string }
  | { type: "audio"; id: number; audio: Float32Array; sampleRate: number }
  | { type: "error"; id: number; message: string };

const post = (m: TtsOut, transfer: Transferable[] = []) =>
  (self as unknown as DedicatedWorkerGlobalScope).postMessage(m, transfer);

env.allowLocalModels = false;
env.useBrowserCache = true;

const MODEL = "onnx-community/Kokoro-82M-v1.0-ONNX";
let tts: Promise<KokoroTTS> | null = null;
// Kokoro no admite dos generaciones a la vez: se encadenan.
let chain: Promise<unknown> = Promise.resolve();

function progress() {
  const files = new Map<string, { loaded: number; total: number }>();
  let last = 0;
  return (p: { status: string; file?: string; loaded?: number; total?: number }) => {
    if (p.status !== "progress" || !p.file) return;
    files.set(p.file, { loaded: p.loaded ?? 0, total: p.total ?? 0 });
    if (Date.now() - last < 150) return;
    last = Date.now();
    let loaded = 0;
    let total = 0;
    files.forEach((f) => ((loaded += f.loaded), (total += f.total)));
    post({ type: "progress", loaded, total });
  };
}

async function load(device: "webgpu" | "wasm"): Promise<{ model: KokoroTTS; device: "webgpu" | "wasm" }> {
  try {
    const model = await KokoroTTS.from_pretrained(MODEL, {
      dtype: device === "webgpu" ? "fp32" : "q8",
      device,
      progress_callback: progress() as never,
    });
    // Calentamiento: la primera generación compila los shaders.
    await model.generate("Hi.", { voice: "af_heart" });
    return { model, device };
  } catch (err) {
    if (device === "webgpu") {
      console.warn("Kokoro en GPU falló, uso CPU", err);
      return load("wasm");
    }
    throw err;
  }
}

self.onmessage = async (e: MessageEvent<TtsIn>) => {
  const msg = e.data;
  if (msg.type === "init") {
    env.backends.onnx.wasm!.wasmPaths = msg.wasmPaths;
    return;
  }
  if (msg.type === "load") {
    if (!tts) {
      const p = load(msg.device);
      tts = p.then((r) => r.model);
      try {
        const r = await p;
        post({ type: "ready", device: r.device });
      } catch (err) {
        tts = null;
        post({ type: "load-error", message: String((err as Error)?.message ?? err) });
      }
    }
    return;
  }
  if (msg.type === "tts") {
    const job = chain.then(async () => {
      try {
        if (!tts) throw new Error("voice not loaded");
        const model = await tts;
        const out = await model.generate(msg.text, { voice: msg.voice as never, speed: msg.speed });
        const audio = new Float32Array(out.audio as Float32Array);
        post({ type: "audio", id: msg.id, audio, sampleRate: out.sampling_rate }, [audio.buffer]);
      } catch (err) {
        post({ type: "error", id: msg.id, message: String((err as Error)?.message ?? err) });
      }
    });
    chain = job;
  }
};
