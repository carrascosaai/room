import { useEffect, useState } from "react";
import { clearAll, deleteVocab, downloadBlob, exportAll, exportVocabCSV, listVocab, type VocabItem } from "../lib/db";
import { deleteCachedModel } from "../llm/engine";
import { MODEL_OPTIONS } from "../llm/models";
import { speak, type SpeechRate } from "../speech/tts";

const today = () => new Date().toISOString().slice(0, 10);

export function Vocab({ rate }: { rate: SpeechRate }) {
  const [items, setItems] = useState<VocabItem[] | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const reload = () => listVocab().then(setItems, () => setItems([]));
  useEffect(() => {
    void reload();
  }, []);

  const wipe = async () => {
    if (!confirm("¿Borrar TODO el historial y el vocabulario de este dispositivo? No se puede deshacer.")) return;
    await clearAll();
    await reload();
    setMsg("Historial y vocabulario borrados.");
  };

  const wipeModels = async () => {
    if (!confirm("¿Borrar los modelos de IA descargados? Tendrás que descargarlos otra vez para usar la app.")) return;
    const ids = Object.values(MODEL_OPTIONS).flatMap((m) => [m.idF16, m.idF32]);
    await Promise.allSettled(ids.map((id) => deleteCachedModel(id)));
    setMsg("Modelos borrados. Recarga la página para liberar la memoria.");
  };

  return (
    <div>
      <section className="card">
        <h2>Tu vocabulario</h2>
        {!items ? (
          <p className="muted">Cargando…</p>
        ) : !items.length ? (
          <p className="muted">Aquí se guardan las expresiones del resumen de cada conversación.</p>
        ) : (
          <ul className="expr-list">
            {items.map((x) => (
              <li key={x.id} className="vocab-item">
                <div>
                  <strong lang="en">{x.en}</strong>
                  <span>{x.es}</span>
                  {x.example && (
                    <em lang="en" className="muted">
                      {x.example}
                    </em>
                  )}
                </div>
                <div className="vocab-actions">
                  <button
                    className="icon-btn icon-small"
                    aria-label={`Escuchar «${x.en}»`}
                    onClick={() => void speak(x.example || x.en, { rate, langs: ["en-GB", "en-IE", "en"] })}
                  >
                    🔊
                  </button>
                  <button
                    className="icon-btn icon-small"
                    aria-label={`Borrar «${x.en}»`}
                    onClick={async () => {
                      await deleteVocab(x.id);
                      await reload();
                    }}
                  >
                    ✕
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card">
        <h2>Tus datos</h2>
        <p className="muted">
          Todo se guarda solo en este dispositivo. Nadie más (ni el desarrollador) puede verlo.
        </p>
        <div className="actions">
          <button className="btn-ghost" onClick={async () => downloadBlob(await exportAll(), `craic-${today()}.json`)}>
            Exportar todo (JSON)
          </button>
          <button
            className="btn-ghost"
            onClick={async () => downloadBlob(await exportVocabCSV(), `craic-vocabulario-${today()}.csv`)}
          >
            Vocabulario (CSV para Anki)
          </button>
        </div>
        <div className="actions">
          <button className="btn-ghost danger" onClick={() => void wipe()}>
            Borrar historial y vocabulario
          </button>
          <button className="btn-ghost danger" onClick={() => void wipeModels()}>
            Borrar modelos descargados
          </button>
        </div>
        {msg && <p className="note">{msg}</p>}
      </section>
    </div>
  );
}
