import { useEffect, useState } from "react";
import { deleteSession, listSessions, type SessionRecord } from "../lib/db";
import { SessionReport } from "./Summary";

const fmt = new Intl.DateTimeFormat("es-ES", { dateStyle: "medium", timeStyle: "short" });

export function History() {
  const [sessions, setSessions] = useState<SessionRecord[] | null>(null);
  const [open, setOpen] = useState<SessionRecord | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    listSessions().then(setSessions, () => setFailed(true));
  }, []);

  if (open) {
    return (
      <div>
        <button className="btn-ghost btn-small back" onClick={() => setOpen(null)}>
          ← Historial
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
  if (!sessions.length) {
    return (
      <div className="card">
        <h2>Aún no hay sesiones</h2>
        <p className="muted">Cuando termines una conversación con «Terminar», aparecerá aquí con su resumen.</p>
      </div>
    );
  }

  return (
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
  );
}
