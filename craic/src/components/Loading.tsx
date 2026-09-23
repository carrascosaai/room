import type { AppError } from "../llm/errors";
import type { LoadProgress } from "../llm/engine";

function describe(text: string): string {
  if (/fetching|download/i.test(text)) {
    const mb = text.match(/(\d+)\s*MB fetched/i)?.[1];
    return mb ? `Descargando modelo… ${mb} MB` : "Descargando modelo…";
  }
  if (/from cache/i.test(text)) return "Cargando el modelo desde tu dispositivo…";
  if (/shader|gpu/i.test(text)) return "Preparando la GPU…";
  if (/finish/i.test(text)) return "¡Listo!";
  return "Preparando…";
}

interface Props {
  progress: LoadProgress | null;
  error: AppError | null;
  firstDownload: boolean;
  onRetry: () => void;
  onBack: () => void;
}

export function Loading({ progress, error, firstDownload, onRetry, onBack }: Props) {
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
          <button className="btn" onClick={onRetry}>
            Reintentar
          </button>
          <button className="btn-ghost" onClick={onBack}>
            Volver
          </button>
        </div>
      </div>
    );
  }
  const pct = Math.round((progress?.progress ?? 0) * 100);
  return (
    <div className="card">
      <h2>{firstDownload ? "Descargando la IA" : "Cargando la IA"}</h2>
      <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
        <div className="progress-bar" style={{ width: `${Math.max(pct, 2)}%` }} />
      </div>
      <p className="progress-text">
        {pct}% · {describe(progress?.text ?? "")}
      </p>
      {firstDownload && (
        <p className="muted">
          Solo se descarga la primera vez. Después se guarda en el dispositivo, carga rápido y funciona sin conexión. No
          cierres la pestaña.
        </p>
      )}
    </div>
  );
}
