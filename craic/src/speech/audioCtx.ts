// Un único AudioContext para toda la app (voz y micrófono). iOS solo deja
// arrancarlo tras un toque: se desbloquea una vez y se reutiliza siempre.
let audioCtx: AudioContext | null = null;

export function sharedAudioCtx(): AudioContext {
  if (!audioCtx || audioCtx.state === "closed") {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    audioCtx = new Ctx();
  }
  return audioCtx;
}
