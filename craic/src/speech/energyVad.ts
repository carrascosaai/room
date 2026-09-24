// Detector de voz por energía, sobre trozos de 512 muestras a 16 kHz (32 ms).
// Se adapta al ruido de fondo: aprende el «silencio» de tu sala y considera
// voz lo que suene claramente por encima.
export const FRAME_MS = 32;

export type VadEvent = "start" | "end" | null;

export class EnergyVad {
  noise = 0.004;
  speaking = false;
  private loud = 0;
  private quiet = 0;
  voicedFrames = 0;
  /** Primeros ~250 ms: solo se escucha el fondo para calibrar. */
  private calib: number[] = [];

  constructor(private silenceMs: number) {}

  static rms(frame: Float32Array): number {
    let s = 0;
    for (let i = 0; i < frame.length; i++) s += frame[i] * frame[i];
    return Math.sqrt(s / frame.length);
  }

  /** Milisegundos de silencio seguidos desde la última palabra (0 si estás hablando). */
  quietMs(): number {
    return this.speaking ? this.quiet * FRAME_MS : 0;
  }

  silenceFraction(): number {
    return this.speaking ? Math.min(1, (this.quiet * FRAME_MS) / this.silenceMs) : 0;
  }

  threshold(): number {
    // Mínimo bajo: en muchos móviles (con cancelación de eco) la voz llega flojita.
    return Math.max(0.005, this.noise * 3);
  }

  push(frame: Float32Array): VadEvent {
    const e = EnergyVad.rms(frame);
    if (this.calib.length < 8) {
      this.calib.push(e);
      if (this.calib.length === 8) {
        const sorted = [...this.calib].sort((a, b) => a - b);
        this.noise = Math.min(0.03, Math.max(0.0005, sorted[3]));
      }
      return null;
    }
    const th = this.threshold();
    if (!this.speaking) {
      if (e > th) {
        if (++this.loud >= 3) {
          this.speaking = true;
          this.quiet = 0;
          this.voicedFrames = this.loud;
          return "start";
        }
      } else {
        this.loud = 0;
        // Aprende el ruido solo mientras no hablas (sube despacio, baja rápido).
        const a = e > this.noise ? 0.03 : 0.15;
        this.noise = Math.min(0.06, Math.max(0.0005, this.noise + (e - this.noise) * a));
      }
      return null;
    }
    // Con histéresis: una voz que baja un poco sigue contando como voz.
    if (e > th * 0.6) {
      this.quiet = 0;
      this.voicedFrames++;
    } else if (++this.quiet * FRAME_MS >= this.silenceMs) {
      this.speaking = false;
      this.loud = 0;
      return "end";
    }
    return null;
  }
}
