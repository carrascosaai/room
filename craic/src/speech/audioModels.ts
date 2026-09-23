import { useSyncExternalStore } from "react";
import type { WorkerIn, WorkerOut } from "./audio.worker";

// Gestor de los modelos de audio (voz neuronal y Whisper) que viven en un worker.

export type ModelState = "idle" | "loading" | "ready" | "error";

export interface AudioModelsStatus {
  tts: ModelState;
  asr: ModelState;
  ttsProgress: number; // 0..1
  asrProgress: number;
  asrModel: string;
  ttsError?: string;
  asrError?: string;
}

export const WHISPER_MODELS = {
  base: { id: "Xenova/whisper-base.en", label: "Normal", sizeMB: 80 },
  small: { id: "Xenova/whisper-small.en", label: "Alta precisión", sizeMB: 250 },
} as const;
export type WhisperSize = keyof typeof WHISPER_MODELS;
export const TTS_SIZE_MB = 92;

let status: AudioModelsStatus = { tts: "idle", asr: "idle", ttsProgress: 0, asrProgress: 0, asrModel: "" };
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

let worker: Worker | null = null;
let nextId = 1;
const pending = new Map<number, { resolve: (v: WorkerOut) => void; reject: (e: Error) => void }>();

function getWorker(): Worker {
  if (worker) return worker;
  worker = new Worker(new URL("./audio.worker.ts", import.meta.url), { type: "module" });
  const wasmPaths = new URL(`${import.meta.env.BASE_URL}ort/`, location.href).href;
  worker.postMessage({ type: "init", wasmPaths } satisfies WorkerIn);
  worker.onmessage = (e: MessageEvent<WorkerOut>) => {
    const m = e.data;
    switch (m.type) {
      case "progress": {
        const p = m.total ? m.loaded / m.total : 0;
        set(m.model === "tts" ? { ttsProgress: p } : { asrProgress: p });
        break;
      }
      case "ready":
        set(m.model === "tts" ? { tts: "ready", ttsProgress: 1 } : { asr: "ready", asrProgress: 1 });
        break;
      case "load-error":
        console.error(`Modelo de audio ${m.model} no disponible:`, m.message);
        set(m.model === "tts" ? { tts: "error", ttsError: m.message } : { asr: "error", asrError: m.message });
        break;
      case "audio":
      case "transcript":
        pending.get(m.id)?.resolve(m);
        pending.delete(m.id);
        break;
      case "error":
        pending.get(m.id)?.reject(new Error(m.message));
        pending.delete(m.id);
        break;
    }
  };
  worker.onerror = (e) => {
    console.error("Worker de audio caído", e);
    set({
      tts: status.tts === "ready" ? "error" : status.tts,
      asr: status.asr === "ready" ? "error" : status.asr,
    });
    pending.forEach((p) => p.reject(new Error("audio worker crashed")));
    pending.clear();
    worker = null;
  };
  return worker;
}

export function loadTTS() {
  if (status.tts === "loading" || status.tts === "ready") return;
  set({ tts: "loading", ttsProgress: 0, ttsError: undefined });
  getWorker().postMessage({ type: "load-tts" } satisfies WorkerIn);
}

export function loadASR(size: WhisperSize) {
  const model = WHISPER_MODELS[size].id;
  if ((status.asr === "loading" || status.asr === "ready") && status.asrModel === model) return;
  set({ asr: "loading", asrProgress: 0, asrModel: model, asrError: undefined });
  getWorker().postMessage({ type: "load-asr", model } satisfies WorkerIn);
}

function request<T extends WorkerOut>(msg: WorkerIn, transfer: Transferable[] = []): Promise<T> {
  const w = getWorker();
  return new Promise<T>((resolve, reject) => {
    const id = (msg as { id: number }).id;
    pending.set(id, { resolve: resolve as (v: WorkerOut) => void, reject });
    w.postMessage(msg, transfer);
  });
}

export async function synthesize(text: string, voice: string, speed: number) {
  const id = nextId++;
  const out = await request<Extract<WorkerOut, { type: "audio" }>>({ type: "tts", id, text, voice, speed });
  return { audio: out.audio, sampleRate: out.sampleRate };
}

export async function transcribe(audio16k: Float32Array): Promise<string> {
  const id = nextId++;
  const out = await request<Extract<WorkerOut, { type: "transcript" }>>({ type: "asr", id, audio: audio16k }, [
    audio16k.buffer,
  ]);
  return out.text;
}
