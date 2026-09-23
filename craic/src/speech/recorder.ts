// Grabación del micrófono en PCM para Whisper.
// El micro se abre una vez por conversación y se guarda siempre el último
// medio segundo, así al pulsar no se pierde la primera sílaba.

export type MicFailure = "denied" | "no-mic" | "other";

export class MicRecorder {
  private stream: MediaStream | null = null;
  private ctx: AudioContext | null = null;
  private node: ScriptProcessorNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private ring: Float32Array[] = [];
  private ringSamples = 0;
  private chunks: Float32Array[] = [];
  private recording = false;
  private lastLevel = 0;

  get isOpen() {
    return !!this.stream;
  }

  /** Nivel de entrada 0..1 para animar el botón. */
  get level() {
    return this.lastLevel;
  }

  async open(): Promise<void> {
    if (this.stream) {
      if (this.ctx?.state === "suspended") await this.ctx.resume();
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) throw Object.assign(new Error("no mediaDevices"), { name: "NotFoundError" });
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    });
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new Ctx();
    if (this.ctx.state === "suspended") await this.ctx.resume();
    this.source = this.ctx.createMediaStreamSource(this.stream);
    this.node = this.ctx.createScriptProcessor(4096, 1, 1);
    const preRoll = Math.floor(this.ctx.sampleRate * 0.5);
    this.node.onaudioprocess = (e) => {
      const data = new Float32Array(e.inputBuffer.getChannelData(0));
      let sum = 0;
      for (let i = 0; i < data.length; i += 4) sum += data[i] * data[i];
      this.lastLevel = Math.min(1, Math.sqrt(sum / (data.length / 4)) * 8);
      if (this.recording) {
        this.chunks.push(data);
      } else {
        this.ring.push(data);
        this.ringSamples += data.length;
        while (this.ringSamples - this.ring[0].length > preRoll) this.ringSamples -= this.ring.shift()!.length;
      }
    };
    // Salida silenciada: el nodo tiene que estar conectado para procesar.
    const mute = this.ctx.createGain();
    mute.gain.value = 0;
    this.source.connect(this.node);
    this.node.connect(mute);
    mute.connect(this.ctx.destination);
  }

  start() {
    this.chunks = [...this.ring];
    this.ring = [];
    this.ringSamples = 0;
    this.recording = true;
  }

  /** Para y devuelve el audio a 16 kHz mono. Espera un poco para no cortar la última palabra. */
  async stop(tailMs = 250): Promise<Float32Array> {
    if (!this.recording) return new Float32Array();
    await new Promise((r) => setTimeout(r, tailMs));
    this.recording = false;
    const chunks = this.chunks;
    this.chunks = [];
    const len = chunks.reduce((a, c) => a + c.length, 0);
    const pcm = new Float32Array(len);
    let off = 0;
    for (const c of chunks) {
      pcm.set(c, off);
      off += c.length;
    }
    return resampleTo16k(pcm, this.ctx?.sampleRate ?? 16000);
  }

  cancel() {
    this.recording = false;
    this.chunks = [];
  }

  close() {
    this.recording = false;
    this.node?.disconnect();
    this.source?.disconnect();
    this.stream?.getTracks().forEach((t) => t.stop());
    void this.ctx?.close().catch(() => undefined);
    this.stream = null;
    this.ctx = null;
    this.node = null;
    this.source = null;
    this.ring = [];
    this.ringSamples = 0;
  }
}

export function micFailure(err: unknown): MicFailure {
  const name = (err as { name?: string })?.name ?? "";
  if (name === "NotAllowedError" || name === "SecurityError" || name === "PermissionDeniedError") return "denied";
  if (name === "NotFoundError" || name === "OverconstrainedError" || name === "NotReadableError") return "no-mic";
  return "other";
}

/** Remuestreo con filtro paso bajo simple (promedio por ventana) + interpolación lineal. */
export function resampleTo16k(input: Float32Array, rate: number): Float32Array {
  const target = 16000;
  if (rate === target) return input;
  const ratio = rate / target;
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
