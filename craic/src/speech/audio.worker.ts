/// <reference lib="webworker" />
// Worker de audio: voz neuronal (Kokoro-82M) y transcripción (Whisper).
// Ambos se ejecutan en CPU (WebAssembly) para no competir con el modelo de
// lenguaje por la GPU. Los modelos se descargan de Hugging Face la primera
// vez y quedan en la caché del navegador.
import { env, pipeline, type AutomaticSpeechRecognitionPipeline } from "@huggingface/transformers";
import { KokoroTTS } from "kokoro-js";

export type WorkerIn =
  | { type: "init"; wasmPaths: string }
  | { type: "load-tts" }
  | { type: "load-asr"; model: string }
  | { type: "tts"; id: number; text: string; voice: string; speed: number }
  | { type: "asr"; id: number; audio: Float32Array };

export type WorkerOut =
  | { type: "progress"; model: "tts" | "asr"; loaded: number; total: number }
  | { type: "ready"; model: "tts" | "asr" }
  | { type: "load-error"; model: "tts" | "asr"; message: string }
  | { type: "audio"; id: number; audio: Float32Array; sampleRate: number }
  | { type: "transcript"; id: number; text: string }
  | { type: "error"; id: number; message: string };

const post = (m: WorkerOut, transfer: Transferable[] = []) =>
  (self as unknown as DedicatedWorkerGlobalScope).postMessage(m, transfer);

env.allowLocalModels = false;
env.useBrowserCache = true;

let tts: Promise<KokoroTTS> | null = null;
let asr: Promise<AutomaticSpeechRecognitionPipeline> | null = null;
let asrModel = "";

/** Suma el progreso de todos los archivos de un modelo. */
function progressTracker(model: "tts" | "asr") {
  const files = new Map<string, { loaded: number; total: number }>();
  let last = 0;
  return (p: { status: string; file?: string; loaded?: number; total?: number }) => {
    if (p.status !== "progress" || !p.file) return;
    files.set(p.file, { loaded: p.loaded ?? 0, total: p.total ?? 0 });
    const now = Date.now();
    if (now - last < 150) return;
    last = now;
    let loaded = 0;
    let total = 0;
    for (const f of files.values()) {
      loaded += f.loaded;
      total += f.total;
    }
    post({ type: "progress", model, loaded, total });
  };
}

function loadTTS() {
  tts ??= KokoroTTS.from_pretrained("onnx-community/Kokoro-82M-v1.0-ONNX", {
    dtype: "q8",
    device: "wasm",
    progress_callback: progressTracker("tts") as never,
  });
  return tts;
}

function loadASR(model: string) {
  if (!asr || asrModel !== model) {
    asrModel = model;
    // (cast: los tipos de pipeline() son demasiado complejos para TS)
    const make = pipeline as unknown as (
      task: string,
      model: string,
      opts: Record<string, unknown>,
    ) => Promise<AutomaticSpeechRecognitionPipeline>;
    asr = make("automatic-speech-recognition", model, {
      dtype: "q8",
      device: "wasm",
      progress_callback: progressTracker("asr"),
    });
  }
  return asr;
}

self.onmessage = async (e: MessageEvent<WorkerIn>) => {
  const msg = e.data;
  switch (msg.type) {
    case "init":
      env.backends.onnx.wasm!.wasmPaths = msg.wasmPaths;
      break;
    case "load-tts":
      try {
        await loadTTS();
        post({ type: "ready", model: "tts" });
      } catch (err) {
        tts = null;
        post({ type: "load-error", model: "tts", message: String((err as Error)?.message ?? err) });
      }
      break;
    case "load-asr":
      try {
        await loadASR(msg.model);
        post({ type: "ready", model: "asr" });
      } catch (err) {
        asr = null;
        post({ type: "load-error", model: "asr", message: String((err as Error)?.message ?? err) });
      }
      break;
    case "tts":
      try {
        const model = await loadTTS();
        const out = await model.generate(msg.text, { voice: msg.voice as never, speed: msg.speed });
        const audio = out.audio as Float32Array;
        post({ type: "audio", id: msg.id, audio, sampleRate: out.sampling_rate }, [audio.buffer]);
      } catch (err) {
        post({ type: "error", id: msg.id, message: String((err as Error)?.message ?? err) });
      }
      break;
    case "asr":
      try {
        const model = await (asr ?? loadASR(asrModel || "Xenova/whisper-base.en"));
        const out = await model(msg.audio, {
          // Whisper .en: solo inglés. Trozos de 30 s por si hablas mucho.
          chunk_length_s: 30,
          stride_length_s: 5,
          return_timestamps: false,
        });
        const text = Array.isArray(out) ? out.map((o) => o.text).join(" ") : out.text;
        post({ type: "transcript", id: msg.id, text: String(text ?? "") });
      } catch (err) {
        post({ type: "error", id: msg.id, message: String((err as Error)?.message ?? err) });
      }
      break;
  }
};
