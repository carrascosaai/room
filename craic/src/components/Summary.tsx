import { useEffect, useRef, useState } from "react";
import type { Character, Level } from "../characters";
import type { Msg } from "../conversation";
import type { LLM } from "../llm/engine";
import { addVocab, newId, saveSession, type SessionRecord, type StoredMessage } from "../lib/db";
import { buildExpressionMessages, computeErrorStats, EXPRESSION_SCHEMA, parseExpressions } from "../summary";

interface Props {
  llm: LLM;
  character: Character;
  level: Level;
  messages: Msg[];
  startedAt: number;
  onNew: () => void;
  onHistory: () => void;
}

/** Al terminar: calcula errores repetidos, pide expresiones nuevas al modelo y lo guarda todo. */
export function EndOfSession({ llm, character, level, messages, startedAt, onNew, onHistory }: Props) {
  const [session, setSession] = useState<SessionRecord | null>(null);
  const [added, setAdded] = useState<number | null>(null);
  const [saveError, setSaveError] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const stored: StoredMessage[] = messages
      .filter((m) => m.text)
      .map((m) => ({
        role: m.role,
        text: m.text,
        ...(m.corrections ? { corrections: m.corrections } : {}),
      }));
    (async () => {
      let expressions = parseExpressions("", stored);
      try {
        const raw = await llm.complete(buildExpressionMessages(character, level, stored), {
          temperature: 0.3,
          maxTokens: 500,
          jsonSchema: EXPRESSION_SCHEMA,
        });
        expressions = parseExpressions(raw, stored);
      } catch (err) {
        console.error(err);
      }
      const record: SessionRecord = {
        id: newId(),
        characterId: character.id,
        characterName: character.name,
        level,
        startedAt,
        endedAt: Date.now(),
        messages: stored,
        errorStats: computeErrorStats(stored),
        expressions,
      };
      setSession(record);
      try {
        await saveSession(record);
        setAdded(await addVocab(expressions, record.id));
      } catch (err) {
        console.error(err);
        setSaveError(true);
      }
    })();
  }, [llm, character, level, messages, startedAt]);

  if (!session) {
    return (
      <div className="card">
        <h2>Preparando tu resumen…</h2>
        <p className="muted">Buscando tus errores más repetidos y expresiones útiles de la conversación.</p>
        <div className="progress">
          <div className="progress-bar progress-indeterminate" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <SessionReport session={session} />
      {saveError ? (
        <p className="note note-warn">No se pudo guardar la sesión en este dispositivo (¿modo incógnito?).</p>
      ) : (
        added !== null && (
          <p className="note">
            Sesión guardada.{" "}
            {added > 0
              ? `${added} ${added === 1 ? "expresión nueva añadida" : "expresiones nuevas añadidas"} a tu vocabulario.`
              : "Las expresiones ya estaban en tu vocabulario."}
          </p>
        )
      )}
      <div className="actions">
        <button className="btn" onClick={onNew}>
          Nueva conversación
        </button>
        <button className="btn-ghost" onClick={onHistory}>
          Ver historial
        </button>
      </div>
    </div>
  );
}

export function SessionReport({ session, showTranscript = false }: { session: SessionRecord; showTranscript?: boolean }) {
  const userTurns = session.messages.filter((m) => m.role === "user").length;
  const totalErrors = session.errorStats.reduce((a, s) => a + s.count, 0);
  const minutes = Math.max(1, Math.round((session.endedAt - session.startedAt) / 60000));

  return (
    <>
      <section className="card">
        <h2>Resumen · {session.characterName}</h2>
        <div className="stats">
          <div>
            <strong>{userTurns}</strong>
            <small>intervenciones</small>
          </div>
          <div>
            <strong>{totalErrors}</strong>
            <small>correcciones</small>
          </div>
          <div>
            <strong>{minutes}</strong>
            <small>min · {session.level}</small>
          </div>
        </div>
      </section>

      <section className="card">
        <h2>Errores más repetidos</h2>
        {session.errorStats.length === 0 ? (
          <p className="muted">¡No se detectaron errores! 🎉</p>
        ) : (
          <ul className="err-list">
            {session.errorStats.slice(0, 4).map((s) => (
              <li key={s.type}>
                <div className="err-head">
                  <span className="corr-tag">{s.type}</span>
                  <span className="muted">×{s.count}</span>
                </div>
                {s.examples.map((e, i) => (
                  <div key={i} className="corr-line">
                    <s>{e.original}</s> → <strong lang="en">{e.corrected}</strong>
                  </div>
                ))}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card">
        <h2>Expresiones para aprender</h2>
        {session.expressions.length === 0 ? (
          <p className="muted">Esta vez no se encontraron expresiones. Prueba una conversación más larga.</p>
        ) : (
          <ul className="expr-list">
            {session.expressions.map((x) => (
              <li key={x.en}>
                <strong lang="en">{x.en}</strong>
                <span>{x.es}</span>
                {x.example && (
                  <em lang="en" className="muted">
                    {x.example}
                  </em>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {showTranscript && (
        <details className="card">
          <summary>
            <strong>Conversación completa</strong>
          </summary>
          <div className="transcript">
            {session.messages.map((m, i) => (
              <div key={i} className={`t-line t-${m.role}`}>
                <b>{m.role === "user" ? "Tú" : session.characterName}:</b> <span lang="en">{m.text}</span>
                {m.corrections?.errors.map((e, j) => (
                  <div key={j} className="corr-line t-fix">
                    <s>{e.original}</s> → <strong lang="en">{e.corrected}</strong>
                    {e.explanation && <span className="muted"> · {e.explanation}</span>}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </details>
      )}
    </>
  );
}
