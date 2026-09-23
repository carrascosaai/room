/// <reference lib="webworker" />
// Worker de escucha: detecta con Silero VAD cuándo empiezas y terminas de
// hablar, y transcribe con Moonshine (rápido, pensado para tiempo real) o
// Whisper small (más preciso). Todo en tu dispositivo.
import { AutoModel, env, pipeline, Tensor, type AutomaticSpeechRecognitionPipeline } from "@huggingface/transformers";

export type AsrModelId = "moonshine" | "whisper";

export type AsrIn =
  | { type: "init"; wasmPaths: string }
  | { type: "load"; model: AsrModelId }
  | { type: "listen"; silenceMs: number }
  | { type: "frame"; frame: Float32Array }
  | { type: "finish" }
  | { type: "cancel" };

export type AsrOut =
  | { type: "progress"; loaded: number; total: number }
  | { type: "ready" }
  | { type: "load-error"; message: string }
  | { type: "speech-start" }
  | { type: "transcribing" }
  | { type: "final"; text: string }
  | { type: "error"; message: string };

const post = (m: AsrOut) => (self as unknown as DedicatedWorkerGlobalScope).postMessage(m);

env.allowLocalModels = false;
env.useBrowserCache = true;

const SR = 16000;
const SPEECH_THRESHOLD = 0.35;
const EXIT_THRESHOLD = 0.15;
const PAD_FRAMES = 10; // ~320 ms de audio antes de que empieces a hablar
const MIN_SPEECH = 0.3 * SR;
const MAX_SPEECH = 28 * SR;

const MODELS: Record<AsrModelId, { id: string; dtype: Record<string, string> | string }> = {
  moonshine: { id: "onnx-community/moonshine-base-ONNX", dtype: { encoder_model: "fp32", decoder_model_merged: "q8" } },
  whisper: { id: "Xenova/whisper-small.en", dtype: "q8" },
};

type VadModel = (inputs: Record<string, Tensor>) => Promise<{ stateN: Tensor; output: Tensor }>;
let vad: VadModel | null = null;
let asr: AutomaticSpeechRecognitionPipeline | null = null;
let loading: Promise<void> | null = null;
let loadedModel: AsrModelId | null = null;

// Estado de escucha
let listening = false;
let silenceSamples = 0.9 * SR;
let recording = false;
let chunks: Float32Array[] = [];
let recorded = 0;
let postSpeech = 0;
let prev: Float32Array[] = [];
let vadState = new Tensor("float32", new Float32Array(2 * 128), [2, 1, 128]);
const srTensor = new Tensor("int64", [SR] as never, []);
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

async function load(model: AsrModelId) {
  const cfg = MODELS[model];
  const onProgress = progress();
  const vadModel = (await AutoModel.from_pretrained("onnx-community/silero-vad", {
    config: { model_type: "custom" } as never,
    dtype: "fp32",
    progress_callback: onProgress as never,
  })) as unknown as VadModel;
  const make = pipeline as unknown as (t: string, m: string, o: Record<string, unknown>) => Promise<AutomaticSpeechRecognitionPipeline>;
  const asrModel = await make("automatic-speech-recognition", cfg.id, {
    device: "wasm",
    dtype: cfg.dtype,
    progress_callback: onProgress,
  });
  await asrModel(new Float32Array(SR)); // calentamiento
  vad = vadModel;
  asr = asrModel;
}

function resetRecording() {
  recording = false;
  chunks = [];
  recorded = 0;
  postSpeech = 0;
}

async function isSpeech(frame: Float32Array): Promise<boolean> {
  if (!vad) return false;
  const input = new Tensor("float32", frame, [1, frame.length]);
  const { stateN, output } = await vad({ input, sr: srTensor, state: vadState });
  vadState = stateN;
  const p = (output.data as Float32Array)[0];
  return p > SPEECH_THRESHOLD || (recording && p >= EXIT_THRESHOLD);
}

async function transcribe(audio: Float32Array) {
  listening = false;
  post({ type: "transcribing" });
  try {
    const out = await asr!(audio);
    const text = Array.isArray(out) ? out.map((o) => o.text).join(" ") : out.text;
    post({ type: "final", text: String(text ?? "").trim() });
  } catch (err) {
    post({ type: "error", message: String((err as Error)?.message ?? err) });
  }
}

function concat(parts: Float32Array[]): Float32Array {
  const len = parts.reduce((a, p) => a + p.length, 0);
  const out = new Float32Array(len);
  let off = 0;
  for (const p of parts) {
    out.set(p, off);
    off += p.length;
  }
  return out;
}

async function onFrame(frame: Float32Array) {
  if (!listening) return;
  const speech = await isSpeech(frame);
  if (!listening) return;
  if (!recording) {
    if (!speech) {
      prev.push(frame);
      if (prev.length > PAD_FRAMES) prev.shift();
      return;
    }
    recording = true;
    chunks = [...prev, frame];
    recorded = chunks.reduce((a, c) => a + c.length, 0);
    prev = [];
    postSpeech = 0;
    post({ type: "speech-start" });
    return;
  }
  chunks.push(frame);
  recorded += frame.length;
  postSpeech = speech ? 0 : postSpeech + frame.length;
  if (recorded >= MAX_SPEECH || postSpeech >= silenceSamples) {
    const speechLen = recorded - postSpeech;
    const audio = concat(chunks);
    resetRecording();
    if (speechLen < MIN_SPEECH) return; // un ruido corto: se ignora y se sigue escuchando
    await transcribe(audio);
  }
}

self.onmessage = (e: MessageEvent<AsrIn>) => {
  const msg = e.data;
  switch (msg.type) {
    case "init":
      env.backends.onnx.wasm!.wasmPaths = msg.wasmPaths;
      break;
    case "load":
      if (loading && loadedModel === msg.model) break;
      loadedModel = msg.model;
      loading = load(msg.model).then(
        () => post({ type: "ready" }),
        (err) => {
          loading = null;
          loadedModel = null;
          post({ type: "load-error", message: String((err as Error)?.message ?? err) });
        },
      );
      break;
    case "listen":
      silenceSamples = Math.round((msg.silenceMs / 1000) * SR);
      resetRecording();
      prev = [];
      vadState = new Tensor("float32", new Float32Array(2 * 128), [2, 1, 128]);
      listening = true;
      break;
    case "frame":
      // Los frames se procesan en orden (el VAD tiene estado).
      chain = chain.then(() => onFrame(msg.frame)).catch((err) => post({ type: "error", message: String(err) }));
      break;
    case "finish":
      // Parada manual: se transcribe lo que haya.
      chain = chain.then(async () => {
        if (!listening) return;
        const audio = concat(chunks);
        const had = recording && recorded - postSpeech >= MIN_SPEECH;
        resetRecording();
        if (had) await transcribe(audio);
        else {
          listening = false;
          post({ type: "final", text: "" });
        }
      });
      break;
    case "cancel":
      listening = false;
      resetRecording();
      break;
  }
};
