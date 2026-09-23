import type { Character } from "../characters";
import type { AppError } from "../llm/errors";
import type { LoadProgress } from "../llm/engine";
import type { Prefs } from "../lib/prefs";
import { useAudioModels, type ModelState } from "../speech/audioModels";
import { Flag } from "./Brand";

function describe(text: string): string {
  if (/fetching|download/i.test(text)) {
    const mb = text.match(/(\d+)\s*MB fetched/i)?.[1];
    return mb ? `Descargando… ${mb} MB` : "Descargando…";
  }
  if (/from cache/i.test(text)) return "Cargando desde tu dispositivo…";
  if (/shader|gpu/i.test(text)) return "Preparando la GPU…";
  if (/finish/i.test(text)) return "Lista";
  return "Preparando…";
}

function Row({ label, value, state, text }: { label: string; value: number; state: ModelState | "llm"; text: string }) {
  const pct = Math.round(value * 100);
  return (
    <div className="load-row">
      <div className="load-head">
        <strong>{label}</strong>
        <span className="muted small">{state === "ready" ? "✓ Lista" : state === "error" ? "Voz del sistema" : text}</span>
      </div>
      <div className="progress" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
        <div className="progress-bar" style={{ width: `${Math.max(pct, 2)}%` }} />
      </div>
    </div>
  );
}

interface Props {
  character: Character;
  prefs: Prefs;
  progress: LoadProgress | null;
  error: AppError | null;
  firstDownload: boolean;
  onRetry: () => void;
  onBack: () => void;
}

export function Loading({ character, prefs, progress, error, firstDownload, onRetry, onBack }: Props) {
  const audio = useAudioModels();
  if (error) {
    return (
      <div className="card warn-card">
        <h2>{error.title}</h2>
        <p>{error.detail}</p>
        {error.raw && (
          <details className="muted">
            <summary>Detalle técnico</summary>
            <code className="raw">{error.raw}</code>
          </details>
        )}
        <div className="actions">
          <button className="btn-dark" onClick={onRetry}>
            Reintentar
          </button>
          <button className="btn-ghost" onClick={onBack}>
            Volver
          </button>
        </div>
      </div>
    );
  }
  return (
    <div className="card calling">
      <div className="calling-avatar">
        <Flag code={character.flag} size={88} />
        <span className="calling-pulse" />
      </div>
      <h2>Llamando a {character.name.split(" ")[0]}…</h2>
      <p className="muted small">{firstDownload ? "Primera vez: preparando todo en tu dispositivo" : "Cargando desde tu dispositivo"}</p>
      <Row label="Cerebro (IA)" value={progress?.progress ?? 0} state="llm" text={describe(progress?.text ?? "")} />
      {prefs.voiceEngine === "neural" && (
        <Row label="Voz realista" value={audio.ttsProgress} state={audio.tts} text={`${Math.round(audio.ttsProgress * 100)}%`} />
      )}
      {prefs.asrEngine === "whisper" && (
        <Row label="Oído (Whisper)" value={audio.asrProgress} state={audio.asr} text={`${Math.round(audio.asrProgress * 100)}%`} />
      )}
      {firstDownload && (
        <p className="muted small">
          Solo se descarga la primera vez; después carga en segundos y funciona sin conexión. No cierres la app. La
          conversación empieza cuando la IA esté lista; la voz y el oído terminan en segundo plano.
        </p>
      )}
    </div>
  );
}
