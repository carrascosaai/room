import { useEffect, useState } from "react";
import { CHARACTERS, REGIONS, type Region, getCharacter, type Level } from "../characters";
import type { Draft } from "../lib/draft";
import type { Prefs } from "../lib/prefs";
import { freeStorageMB, isModelCached } from "../llm/engine";
import { approxSizeMB, fetchDownloadSizeMB, formatMB, MODEL_OPTIONS, modelIdFor, type ModelTier } from "../llm/models";
import { getScenario, scenariosFor } from "../scenarios";
import { ASR_MODELS, TTS_SIZE_MB } from "../speech/audioModels";
import { Flag } from "./Brand";
import { Icon } from "./Icon";

interface Props {
  prefs: Prefs;
  f16: boolean;
  mobile: boolean;
  demo: boolean;
  draft: Draft | null;
  audioCached: boolean;
  needTTS: boolean;
  /** Hay IA en la nube disponible / se está usando */
  cloudOk: boolean;
  cloud: boolean;
  onChange: (p: Partial<Prefs>) => void;
  onStart: (info: { cached: boolean }) => void;
  onResume: () => void;
  onDiscardDraft: () => void;
}

const LEVELS: { id: Level; label: string }[] = [
  { id: "B1", label: "Intermedio" },
  { id: "B2", label: "Interm. alto" },
  { id: "C1", label: "Avanzado" },
];

export function Setup({ prefs, f16, mobile, demo, draft, audioCached, needTTS, cloudOk, cloud, onChange, onStart, onResume, onDiscardDraft }: Props) {
  const [cached, setCached] = useState<Record<ModelTier, boolean | null>>({ light: null, quality: null });
  const [sizes, setSizes] = useState<Record<ModelTier, number | null>>({ light: null, quality: null });
  const [free, setFree] = useState<number | null>(null);
  const [showModels, setShowModels] = useState(false);
  const [region, setRegion] = useState<Region | "all">(() => getCharacter(prefs.characterId).region);

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

  const character = getCharacter(prefs.characterId);
  const scenarios = scenariosFor(character.kind);
  const scenario = getScenario(prefs.scenarioId, character.kind);
  const tier = prefs.tier;
  const isCached = demo || cached[tier] === true;
  const audioMB = needTTS ? TTS_SIZE_MB[prefs.voiceQuality === "high" ? "webgpu" : "wasm"] : 0;
  const asrMB = prefs.asrEngine === "local" ? ASR_MODELS[prefs.asrModel].sizeMB : 0;
  const extraMB = demo || audioCached ? 0 : audioMB + asrMB;
  const llmMB = cloud || isCached ? 0 : (sizes[tier] ?? approxSizeMB(tier, f16));
  const totalMB = llmMB + extraMB;
  const lowSpace = totalMB > 0 && free !== null && free < totalMB * 1.2;
  const draftChar = draft ? getCharacter(draft.characterId) : null;

  return (
    <div className="home">
      {draft && draftChar && (
        <div className="card resume-card">
          <Flag code={draftChar.flag} size={44} />
          <div className="resume-text">
            <strong>Continúa con {draftChar.name.split(" ")[0]}</strong>
            <small>
              {draft.messages.filter((m) => m.role === "user").length} intervenciones · la dejaste a medias
            </small>
          </div>
          <div className="resume-actions">
            <button className="btn-dark btn-small" onClick={onResume}>
              Seguir
            </button>
            <button className="icon-plain" onClick={onDiscardDraft} aria-label="Descartar conversación guardada">
              <Icon name="close" size={18} />
            </button>
          </div>
        </div>
      )}

      <section>
        <h2 className="section-title">¿Con quién quieres hablar?</h2>
        <div className="region-chips" role="group" aria-label="Filtrar por acento">
          {REGIONS.map((r) => (
            <button key={r.id} type="button" className={region === r.id ? "on" : ""} onClick={() => setRegion(r.id)} aria-pressed={region === r.id}>
              {r.label}
            </button>
          ))}
        </div>
        <div className="char-grid">
          {CHARACTERS.filter((c) => region === "all" || c.region === region).map((c) => (
            <button
              key={c.id}
              className={`char-card${prefs.characterId === c.id ? " on" : ""}`}
              onClick={() => {
                const kind = c.kind;
                onChange({
                  characterId: c.id,
                  scenarioId: kind === character.kind ? prefs.scenarioId : scenariosFor(kind)[0].id,
                });
              }}
              aria-pressed={prefs.characterId === c.id}
            >
              <Flag code={c.flag} size={44} />
              <strong>{c.name}</strong>
              <span className="char-accent">{c.accent}</span>
              <small>{c.tagline}</small>
            </button>
          ))}
        </div>
      </section>

      <section>
        <h2 className="section-title">Situación</h2>
        <div className="scenario-list">
          {scenarios.map((s) => (
            <button
              key={s.id}
              className={`scenario${scenario.id === s.id ? " on" : ""}`}
              onClick={() => onChange({ scenarioId: s.id })}
              aria-pressed={scenario.id === s.id}
            >
              <span className="scenario-emoji" aria-hidden="true">
                {s.emoji}
              </span>
              <span>
                <strong>{s.title}</strong>
                <small>{s.goal}</small>
              </span>
            </button>
          ))}
        </div>
      </section>

      {character.kind === "casual" && (
        <section>
          <h2 className="section-title">¿Quién empieza?</h2>
          <div className="seg seg-wide" role="group" aria-label="Quién empieza la llamada">
            <button className={!prefs.userStarts ? "on" : ""} onClick={() => onChange({ userStarts: false })}>
              <strong>{character.name.split(" ")[0]}</strong>
              <small>Te saluda y pregunta</small>
            </button>
            <button className={prefs.userStarts ? "on" : ""} onClick={() => onChange({ userStarts: true })}>
              <strong>Yo</strong>
              <small>Tú sacas el tema</small>
            </button>
          </div>
        </section>
      )}

      <section>
        <h2 className="section-title">Tu nivel</h2>
        <div className="seg seg-wide" role="group" aria-label="Nivel">
          {LEVELS.map((l) => (
            <button key={l.id} className={prefs.level === l.id ? "on" : ""} onClick={() => onChange({ level: l.id })}>
              <strong>{l.id}</strong>
              <small>{l.label}</small>
            </button>
          ))}
        </div>
      </section>

      <section className="card model-card">
        {cloudOk && (
          <div className="seg seg-wide engine-seg" role="group" aria-label="Dónde funciona la IA">
            <button className={cloud ? "on" : ""} onClick={() => onChange({ aiEngine: "cloud" })}>
              <strong>☁️ En la nube</strong>
              <small>Rápida · sin descargas</small>
            </button>
            <button className={!cloud ? "on" : ""} onClick={() => onChange({ aiEngine: "local" })}>
              <strong>🔒 En tu dispositivo</strong>
              <small>Privada · sin internet</small>
            </button>
          </div>
        )}
        {cloud ? (
          <p className="muted small">
            Responde al instante. Tus frases se envían a la IA (Groq) para contestarte; no se guardan en ningún sitio de la
            app. La voz y el reconocimiento siguen funcionando en tu dispositivo.
          </p>
        ) : (
          <>
        <button className="model-summary" onClick={() => setShowModels((v) => !v)} aria-expanded={showModels}>
          <span>
            <strong>IA: {MODEL_OPTIONS[tier].label}</strong>
            <small>
              {demo
                ? "Modo demo"
                : isCached
                  ? "✓ Descargada · funciona sin conexión"
                  : `Descarga única de ${sizes[tier] ? "" : "≈ "}${formatMB(llmMB)}`}
            </small>
          </span>
          <span className="muted small">Cambiar</span>
        </button>
        {showModels && (
          <div className="model-list">
            {Object.values(MODEL_OPTIONS).map((m) => {
              const c = cached[m.tier];
              const s = sizes[m.tier] ?? approxSizeMB(m.tier, f16);
              return (
                <label key={m.tier} className={`model${tier === m.tier ? " on" : ""}`}>
                  <input type="radio" name="tier" checked={tier === m.tier} onChange={() => onChange({ tier: m.tier })} />
                  <span>
                    <strong>
                      {m.label}
                      {m.tier === "light" && <em className="pill">Recomendado</em>}
                    </strong>
                    <small>{m.description}</small>
                    <small className="size">{demo ? "Modo demo" : c ? "✓ Ya descargado" : `Descarga: ${sizes[m.tier] ? "" : "≈ "}${formatMB(s)}`}</small>
                  </span>
                </label>
              );
            })}
          </div>
        )}
          </>
        )}
        {!cloud && mobile && tier === "quality" && (
          <p className="note">En móvil el modelo «Mejor calidad» puede quedarse sin memoria. Si falla, vuelve al ligero.</p>
        )}
        {totalMB > 0 && (
          <p className="note">
            Primera vez: se descargarán <strong>≈ {formatMB(totalMB)}</strong>
            {cloud ? (
              <> para la voz natural y el oído, una sola vez.</>
            ) : (
              extraMB > 0 && <> (IA {formatMB(llmMB)} + voz natural y oído {formatMB(extraMB)})</>
            )}{" "}
            Mejor con Wi-Fi.{!cloud && " Después funciona sin conexión."}
          </p>
        )}
        {lowSpace && (
          <p className="note note-warn">
            Puede que no haya espacio suficiente ({formatMB(free ?? 0)} libres). Libera espacio o usa el modelo ligero.
          </p>
        )}
      </section>

      <button className="cta" onClick={() => onStart({ cached: isCached })}>
        <Icon name="call" /> {isCached || cloud ? `Llamar a ${character.name.split(" ")[0]}` : `Descargar y llamar a ${character.name.split(" ")[0]}`}
      </button>
    </div>
  );
}
