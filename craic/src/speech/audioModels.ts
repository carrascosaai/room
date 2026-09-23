import { useSyncExternalStore } from "react";
import type { AsrIn, AsrModelId, AsrOut } from "./asr.worker";
import type { TtsIn, TtsOut } from "./tts.worker";

// Gestor de los modelos de audio, cada uno en su worker:
//  - voz (Kokoro) → tts.worker
//  - escucha (Silero VAD + Moonshine/Whisper) → asr.worker

export type ModelState = "idle" | "loading" | "ready" | "error";

export interface AudioModelsStatus {
  tts: ModelState;
  asr: ModelState;
  ttsProgress: number; // 0..1
  asrProgress: number;
  ttsDevice?: "webgpu" | "wasm";
  asrModel?: AsrModelId;
  ttsError?: string;
  asrError?: string;
}

export const ASR_MODELS: Record<AsrModelId, { label: string; hint: string; sizeMB: number }> = {
  moonshine: { label: "Rápido", hint: "Moonshine · transcribe al instante", sizeMB: 200 },
  whisper: { label: "Preciso", hint: "Whisper small · algo más lento", sizeMB: 250 },
};
export const TTS_SIZE_MB = { webgpu: 330, wasm: 92 };

let status: AudioModelsStatus = { tts: "idle", asr: "idle", ttsProgress: 0, asrProgress: 0 };
const listeners = new Set<() => void>();
function set(p: Partial<AudioModelsStatus>) {
  status = { ...status, ...p };
  listeners.forEach((l) => l());
}

export function useAudioModels(): AudioModelsStatus {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => status,
  );
}

export const getAudioStatus = () => status;
const wasmPaths = () => new URL(`${import.meta.env.BASE_URL}ort/`, location.href).href;

// ---------------- Voz ----------------
let ttsWorker: Worker | null = null;
let nextId = 1;
const pendingTts = new Map<number, { resolve: (v: { audio: Float32Array; sampleRate: number }) => void; reject: (e: Error) => void }>();

function getTtsWorker(): Worker {
  if (ttsWorker) return ttsWorker;
  const w = new Worker(new URL("./tts.worker.ts", import.meta.url), { type: "module" });
  w.postMessage({ type: "init", wasmPaths: wasmPaths() } satisfies TtsIn);
  w.onmessage = (e: MessageEvent<TtsOut>) => {
    const m = e.data;
    if (m.type === "progress") set({ ttsProgress: m.total ? m.loaded / m.total : 0 });
    else if (m.type === "ready") set({ tts: "ready", ttsProgress: 1, ttsDevice: m.device });
    else if (m.type === "load-error") {
      console.error("Voz neuronal no disponible:", m.message);
      set({ tts: "error", ttsError: m.message });
    } else if (m.type === "audio") {
      pendingTts.get(m.id)?.resolve({ audio: m.audio, sampleRate: m.sampleRate });
      pendingTts.delete(m.id);
    } else if (m.type === "error") {
      pendingTts.get(m.id)?.reject(new Error(m.message));
      pendingTts.delete(m.id);
    }
  };
  w.onerror = (e) => {
    console.error("Worker de voz caído", e);
    set({ tts: "error", ttsError: "worker crashed" });
    pendingTts.forEach((p) => p.reject(new Error("tts worker crashed")));
    pendingTts.clear();
    ttsWorker = null;
  };
  ttsWorker = w;
  return w;
}

export function loadTTS(device: "webgpu" | "wasm") {
  if (status.tts === "loading" || status.tts === "ready") return;
  set({ tts: "loading", ttsProgress: 0, ttsError: undefined });
  getTtsWorker().postMessage({ type: "load", device } satisfies TtsIn);
}

export function synthesize(text: string, voice: string, speed: number): Promise<{ audio: Float32Array; sampleRate: number }> {
  const id = nextId++;
  return new Promise((resolve, reject) => {
    pendingTts.set(id, { resolve, reject });
    getTtsWorker().postMessage({ type: "tts", id, text, voice, speed } satisfies TtsIn);
  });
}

// ---------------- Escucha ----------------
let asrWorker: Worker | null = null;
type AsrListener = (m: AsrOut) => void;
const asrListeners = new Set<AsrListener>();

function getAsrWorker(): Worker {
  if (asrWorker) return asrWorker;
  const w = new Worker(new URL("./asr.worker.ts", import.meta.url), { type: "module" });
  w.postMessage({ type: "init", wasmPaths: wasmPaths() } satisfies AsrIn);
  w.onmessage = (e: MessageEvent<AsrOut>) => {
    const m = e.data;
    if (m.type === "progress") set({ asrProgress: m.total ? m.loaded / m.total : 0 });
    else if (m.type === "ready") set({ asr: "ready", asrProgress: 1 });
    else if (m.type === "load-error") {
      console.error("Reconocimiento local no disponible:", m.message);
      set({ asr: "error", asrError: m.message });
    }
    asrListeners.forEach((l) => l(m));
  };
  w.onerror = (e) => {
    console.error("Worker de escucha caído", e);
    set({ asr: "error", asrError: "worker crashed" });
    asrListeners.forEach((l) => l({ type: "error", message: "worker crashed" }));
    asrWorker = null;
  };
  asrWorker = w;
  return w;
}

export function loadASR(model: AsrModelId) {
  if ((status.asr === "loading" || status.asr === "ready") && status.asrModel === model) return;
  set({ asr: "loading", asrProgress: 0, asrModel: model, asrError: undefined });
  getAsrWorker().postMessage({ type: "load", model } satisfies AsrIn);
}

export function asrSend(msg: AsrIn, transfer: Transferable[] = []) {
  getAsrWorker().postMessage(msg, transfer);
}

export function onAsrMessage(l: AsrListener): () => void {
  asrListeners.add(l);
  return () => asrListeners.delete(l);
}
