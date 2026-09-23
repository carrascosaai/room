import { useEffect, useMemo, useState } from "react";
import { deleteSession, listSessions, type SessionRecord } from "../lib/db";
import { computeProgress } from "../lib/progress";
import { Icon } from "./Icon";
import { SessionReport } from "./Summary";

const fmt = new Intl.DateTimeFormat("es-ES", { dateStyle: "medium", timeStyle: "short" });

/** Progreso: racha, minutos, tendencia de errores e historial de sesiones. */
export function History() {
  const [sessions, setSessions] = useState<SessionRecord[] | null>(null);
  const [open, setOpen] = useState<SessionRecord | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    listSessions().then(setSessions, () => setFailed(true));
  }, []);

  const progress = useMemo(() => computeProgress(sessions ?? []), [sessions]);

  if (open) {
    return (
      <div>
        <button className="btn-ghost btn-small back" onClick={() => setOpen(null)}>
          <Icon name="back" size={16} /> Progreso
        </button>
        <p className="muted">{fmt.format(open.endedAt)}</p>
        <SessionReport session={open} showTranscript />
        <button
          className="btn-ghost danger"
          onClick={async () => {
            if (!confirm("¿Borrar esta sesión?")) return;
            await deleteSession(open.id);
            setSessions((s) => s?.filter((x) => x.id !== open.id) ?? null);
            setOpen(null);
          }}
        >
          Borrar esta sesión
        </button>
      </div>
    );
  }

  if (failed) return <p className="note note-warn">No se puede acceder al almacenamiento local en este navegador.</p>;
  if (!sessions) return <p className="muted center">Cargando…</p>;

  const maxMin = Math.max(10, ...progress.week.map((d) => d.minutes));
  const trend =
    progress.errorRateRecent !== null && progress.errorRatePrevious !== null
      ? progress.errorRateRecent - progress.errorRatePrevious
      : null;

  return (
    <div className="progress-screen">
      <div className="card streak-card">
        <span className={`streak-flame${progress.practicedToday ? " lit" : ""}`}>
          <Icon name="flame" size={30} />
        </span>
        <div>
          <strong>
            {progress.streak} {progress.streak === 1 ? "día seguido" : "días seguidos"}
          </strong>
          <small>{progress.practicedToday ? "¡Hoy ya has practicado!" : "Habla un rato hoy para mantener la racha"}</small>
        </div>
      </div>

      <div className="stat-row">
        <div className="stat">
          <strong>{progress.sessions}</strong>
          <small>conversaciones</small>
        </div>
        <div className="stat">
          <strong>{progress.minutes}</strong>
          <small>minutos</small>
        </div>
        <div className="stat">
          <strong>{progress.wordsSpoken}</strong>
          <small>palabras dichas</small>
        </div>
      </div>

      <div className="card">
        <h2>Esta semana</h2>
        <div className="week" role="img" aria-label="Minutos de práctica por día">
          {progress.week.map((d, i) => (
            <div key={i} className="week-day">
              <span className="week-bar" style={{ height: `${Math.max(4, (d.minutes / maxMin) * 100)}%` }} title={`${d.minutes} min`} />
              <small>{d.label}</small>
            </div>
          ))}
        </div>
        {progress.errorRateRecent !== null && (
          <p className="muted small">
            Errores por intervención (últimas 5): <strong>{progress.errorRateRecent.toFixed(1)}</strong>
            {trend !== null && (trend < 0 ? " · ¡bajando! 📉" : trend > 0 ? " · algo más que antes" : " · estable")}
          </p>
        )}
      </div>

      <h2 className="section-title">Conversaciones</h2>
      {!sessions.length ? (
        <div className="card empty">
          <Icon name="chat" size={32} />
          <p className="muted">Cuando cuelgues una conversación, aparecerá aquí con su resumen.</p>
        </div>
      ) : (
        <ul className="session-list">
          {sessions.map((s) => {
            const errors = s.errorStats.reduce((a, x) => a + x.count, 0);
            const turns = s.messages.filter((m) => m.role === "user").length;
            return (
              <li key={s.id}>
                <button className="session-item" onClick={() => setOpen(s)}>
                  <span>
                    <strong>{s.characterName}</strong> <span className="corr-tag">{s.level}</span>
                    <small>{fmt.format(s.endedAt)}</small>
                  </span>
                  <small className="muted">
                    {turns} {turns === 1 ? "turno" : "turnos"} · {errors} {errors === 1 ? "corrección" : "correcciones"}
                  </small>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
