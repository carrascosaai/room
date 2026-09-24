import { locale, t } from "../i18n";
import { useEffect, useMemo, useState } from "react";
import { deleteSession, listSessions, type SessionRecord } from "../lib/db";
import { computeProgress } from "../lib/progress";
import { Icon } from "./Icon";
import { SessionReport } from "./Summary";

const fmt = () => new Intl.DateTimeFormat(locale(), { dateStyle: "medium", timeStyle: "short" });

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
          <Icon name="back" size={16} /> {t("Progreso")}
        </button>
        <p className="muted">{fmt().format(open.endedAt)}</p>
        <SessionReport session={open} showTranscript />
        <button
          className="btn-ghost danger"
          onClick={async () => {
            if (!confirm(t("¿Borrar esta sesión?"))) return;
            await deleteSession(open.id);
            setSessions((s) => s?.filter((x) => x.id !== open.id) ?? null);
            setOpen(null);
          }}
        >
          {t("Borrar esta sesión")}
        </button>
      </div>
    );
  }

  if (failed) return <p className="note note-warn">{t("No se puede acceder al almacenamiento local en este navegador.")}</p>;
  if (!sessions) return <p className="muted center">{t("Cargando…")}</p>;

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
            {progress.streak === 1 ? t("1 día seguido") : t("{n} días seguidos", { n: progress.streak })}
          </strong>
          <small>{progress.practicedToday ? t("¡Hoy ya has practicado!") : t("Habla un rato hoy para mantener la racha")}</small>
        </div>
      </div>

      <div className="stat-row">
        <div className="stat">
          <strong>{progress.sessions}</strong>
          <small>{t("conversaciones")}</small>
        </div>
        <div className="stat">
          <strong>{progress.minutes}</strong>
          <small>{t("minutos")}</small>
        </div>
        <div className="stat">
          <strong>{progress.wordsSpoken}</strong>
          <small>{t("palabras dichas")}</small>
        </div>
      </div>

      <div className="card">
        <h2>{t("Esta semana")}</h2>
        <div className="week" role="img" aria-label={t("Minutos de práctica por día")}>
          {progress.week.map((d, i) => (
            <div key={i} className="week-day">
              <span className="week-bar" style={{ height: `${Math.max(4, (d.minutes / maxMin) * 100)}%` }} title={`${d.minutes} min`} />
              <small>{t(d.label)}</small>
            </div>
          ))}
        </div>
        {progress.errorRateRecent !== null && (
          <p className="muted small">
            {t("Errores por intervención (últimas 5):")} <strong>{progress.errorRateRecent.toFixed(1)}</strong>
            {trend !== null && " · " + (trend < 0 ? t("¡bajando! 📉") : trend > 0 ? t("algo más que antes") : t("estable"))}
          </p>
        )}
      </div>

      <h2 className="section-title">{t("Conversaciones")}</h2>
      {!sessions.length ? (
        <div className="card empty">
          <Icon name="chat" size={32} />
          <p className="muted">{t("Cuando cuelgues una conversación, aparecerá aquí con su resumen.")}</p>
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
                    <small>{fmt().format(s.endedAt)}</small>
                  </span>
                  <small className="muted">
                    {turns === 1 ? t("1 turno") : t("{n} turnos", { n: turns })} · {errors === 1 ? t("1 corrección") : t("{n} correcciones", { n: errors })}
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
