// Micrófono → trozos de 512 muestras a 16 kHz (lo que espera Silero VAD).
// Un único stream compartido por toda la app; se cierra cuando nadie lo usa.
import { sharedAudioCtx } from "./audioCtx";

export type MicFailure = "denied" | "no-mic" | "other";

const FRAME = 512;
const TARGET_RATE = 16000;

type FrameListener = (frame: Float32Array) => void;

class MicStream {
  private stream: MediaStream | null = null;
  private ctx: AudioContext | null = null;
  private node: ScriptProcessorNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private mute: GainNode | null = null;
  private pending = new Float32Array(0);
  private listeners = new Set<FrameListener>();
  private opening: Promise<void> | null = null;
  level = 0;

  get isOpen() {
    return !!this.stream;
  }

  open(): Promise<void> {
    if (this.stream) {
      if (this.ctx?.state === "suspended") return Promise.race([this.ctx.resume(), new Promise<void>((r) => setTimeout(r, 1500))]);
      return Promise.resolve();
    }
    this.opening ??= this.doOpen().finally(() => (this.opening = null));
    return this.opening;
  }

  private async doOpen() {
    if (!navigator.mediaDevices?.getUserMedia) throw Object.assign(new Error("no mediaDevices"), { name: "NotFoundError" });
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    });
    // Se usa la frecuencia nativa del dispositivo y se remuestrea a 16 kHz en
    // código: forzar 16 kHz en el AudioContext da problemas en iOS y Firefox.
    // El contexto es el de la voz (ya desbloqueado con un toque): uno nuevo
    // en iOS se quedaría «suspendido» y el micro no daría ni un dato.
    const ctx = sharedAudioCtx();
    const source = ctx.createMediaStreamSource(stream);
    if (ctx.state === "suspended") {
      await Promise.race([ctx.resume(), new Promise((r) => setTimeout(r, 1500))]);
    }
    const bufferSize = ctx.sampleRate > 24000 ? 2048 : 512;
    const node = ctx.createScriptProcessor(bufferSize, 1, 1);
    const rate = ctx.sampleRate;
    node.onaudioprocess = (e) => {
      const input = e.inputBuffer.getChannelData(0);
      const data = rate === TARGET_RATE ? new Float32Array(input) : resampleTo16k(input, rate);
      let sum = 0;
      for (let i = 0; i < data.length; i += 2) sum += data[i] * data[i];
      this.level = Math.min(1, Math.sqrt(sum / Math.max(1, data.length / 2)) * 8);
      if (!this.listeners.size) return;
      // Trocear en frames exactos de 512 muestras
      const merged = new Float32Array(this.pending.length + data.length);
      merged.set(this.pending);
      merged.set(data, this.pending.length);
      let off = 0;
      while (off + FRAME <= merged.length) {
        const frame = merged.slice(off, off + FRAME);
        this.listeners.forEach((l) => l(frame));
        off += FRAME;
      }
      this.pending = merged.slice(off);
    };
    const mute = ctx.createGain();
    this.mute = mute;
    mute.gain.value = 0;
    source.connect(node);
    node.connect(mute);
    mute.connect(ctx.destination);
    this.stream = stream;
    this.ctx = ctx;
    this.node = node;
    this.source = source;
  }

  onFrame(l: FrameListener): () => void {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  }

  close() {
    this.node?.disconnect();
    this.source?.disconnect();
    this.stream?.getTracks().forEach((t) => t.stop());
    this.mute?.disconnect();
    this.stream = null;
    this.ctx = null;
    this.node = null;
    this.source = null;
    this.mute = null;
    this.pending = new Float32Array(0);
    this.level = 0;
  }
}

export const mic = new MicStream();

let users = 0;
export function acquireMic() {
  users++;
}
export function releaseMic() {
  users = Math.max(0, users - 1);
  if (users === 0) mic.close();
}

export function micFailure(err: unknown): MicFailure {
  const name = (err as { name?: string })?.name ?? "";
  if (name === "NotAllowedError" || name === "SecurityError" || name === "PermissionDeniedError") return "denied";
  if (name === "NotFoundError" || name === "OverconstrainedError" || name === "NotReadableError") return "no-mic";
  return "other";
}

/** Remuestreo con filtro paso bajo simple (promedio por ventana). */
export function resampleTo16k(input: Float32Array, rate: number): Float32Array {
  if (rate === TARGET_RATE) return input;
  const ratio = rate / TARGET_RATE;
  const outLen = Math.floor(input.length / ratio);
  const out = new Float32Array(outLen);
  for (let i = 0; i < outLen; i++) {
    const start = i * ratio;
    const end = Math.min(input.length, start + ratio);
    let s = 0;
    let n = 0;
    for (let j = Math.floor(start); j < end; j++) {
      s += input[j];
      n++;
    }
    out[i] = n ? s / n : 0;
  }
  return out;
}
