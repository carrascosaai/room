import { useEffect, useState } from "react";
import { CHARACTERS, type Level } from "../characters";
import { freeStorageMB, isModelCached } from "../llm/engine";
import { approxSizeMB, fetchDownloadSizeMB, formatMB, MODEL_OPTIONS, modelIdFor, type ModelTier } from "../llm/models";
import type { Prefs } from "../lib/prefs";

interface Props {
  prefs: Prefs;
  f16: boolean;
  mobile: boolean;
  demo: boolean;
  onChange: (p: Partial<Prefs>) => void;
  onStart: (info: { cached: boolean }) => void;
}

const LEVELS: { id: Level; label: string }[] = [
  { id: "B1", label: "Intermedio" },
  { id: "B2", label: "Interm. alto" },
  { id: "C1", label: "Avanzado" },
];

export function Setup({ prefs, f16, mobile, demo, onChange, onStart }: Props) {
  const [cached, setCached] = useState<Record<ModelTier, boolean | null>>({ light: null, quality: null });
  const [sizes, setSizes] = useState<Record<ModelTier, number | null>>({ light: null, quality: null });
  const [free, setFree] = useState<number | null>(null);

  useEffect(() => {
    if (demo) return;
    let alive = true;
    (Object.keys(MODEL_OPTIONS) as ModelTier[]).forEach(async (tier) => {
      const id = modelIdFor(tier, f16);
      const c = await isModelCached(id);
      if (!alive) return;
      setCached((s) => ({ ...s, [tier]: c }));
      if (!c) {
        const mb = await fetchDownloadSizeMB(id);
        if (alive) setSizes((s) => ({ ...s, [tier]: mb }));
      }
    });
    void freeStorageMB().then((f) => alive && setFree(f));
    return () => {
      alive = false;
    };
  }, [f16, demo]);

  const tier = prefs.tier;
  const isCached = demo || cached[tier] === true;
  const size = sizes[tier] ?? approxSizeMB(tier, f16);
  const lowSpace = !isCached && free !== null && free < size * 1.2;

  return (
    <div className="setup">
      <section className="card">
        <h2>¿Con quién quieres hablar?</h2>
        <div className="char-list">
          {CHARACTERS.map((c) => (
            <button
              key={c.id}
              className={`char${prefs.characterId === c.id ? " on" : ""}`}
              onClick={() => onChange({ characterId: c.id })}
              aria-pressed={prefs.characterId === c.id}
            >
              <span className="avatar" aria-hidden="true">{c.emoji}</span>
              <span>
                <strong>{c.name}</strong>
                <small>{c.tagline}</small>
              </span>
            </button>
          ))}
        </div>

        <h3>Tu nivel</h3>
        <div className="seg seg-wide" role="group" aria-label="Nivel">
          {LEVELS.map((l) => (
            <button key={l.id} className={prefs.level === l.id ? "on" : ""} onClick={() => onChange({ level: l.id })}>
              <strong>{l.id}</strong>
              <small>{l.label}</small>
            </button>
          ))}
        </div>
      </section>

      <section className="card">
        <h2>Modelo de IA</h2>
        <p className="muted">
          Se ejecuta en tu dispositivo: gratis, privado y sin cuentas. Tus conversaciones no salen de aquí.
        </p>
        <div className="model-list">
          {(Object.values(MODEL_OPTIONS)).map((m) => {
            const c = cached[m.tier];
            const s = sizes[m.tier] ?? approxSizeMB(m.tier, f16);
            return (
              <label key={m.tier} className={`model${tier === m.tier ? " on" : ""}`}>
                <input
                  type="radio"
                  name="tier"
                  checked={tier === m.tier}
                  onChange={() => onChange({ tier: m.tier })}
                />
                <span>
                  <strong>
                    {m.label}
                    {m.tier === "light" && <em className="pill">Recomendado</em>}
                  </strong>
                  <small>{m.description}</small>
                  <small className="size">
                    {demo ? "Modo demo" : c ? "✓ Ya descargado" : `Descarga: ${sizes[m.tier] ? "" : "≈ "}${formatMB(s)}`}
                  </small>
                </span>
              </label>
            );
          })}
        </div>
        {mobile && tier === "quality" && (
          <p className="note">
            En móvil el modelo «Mejor calidad» puede quedarse sin memoria. Si falla, vuelve al ligero.
          </p>
        )}
        {!isCached && (
          <p className="note">
            Se descargarán <strong>{sizes[tier] ? "" : "≈ "}{formatMB(size)}</strong> una sola vez. Mejor con Wi-Fi.
            Luego funcionará sin conexión.
          </p>
        )}
        {lowSpace && (
          <p className="note note-warn">
            Puede que no haya espacio suficiente ({formatMB(free ?? 0)} libres). Libera espacio o usa el modelo ligero.
          </p>
        )}
      </section>

      <button className="btn btn-big" onClick={() => onStart({ cached: isCached })}>
        {isCached ? "Empezar a hablar" : `Descargar (${formatMB(size)}) y empezar`}
      </button>
    </div>
  );
}
