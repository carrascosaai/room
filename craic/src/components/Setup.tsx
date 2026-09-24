import { t } from "../i18n";
import { useEffect, useState } from "react";
import { CHARACTERS, REGIONS, type Region, getCharacter, type Level } from "../characters";
import type { Draft } from "../lib/draft";
import type { Prefs } from "../lib/prefs";
import { freeStorageMB, isModelCached } from "../llm/engine";
import { approxSizeMB, fetchDownloadSizeMB, formatMB, MODEL_OPTIONS, modelIdFor, type ModelTier } from "../llm/models";
import { getScenario, scenariosFor } from "../scenarios";
import { ASR_MODELS, TTS_SIZE_MB } from "../speech/audioModels";
import { Flag } from "./Brand";
import { langOf, type TargetLang } from "../lang";
import { Icon } from "./Icon";
import { ShareButton } from "./ShareButton";
import { UiLangSelect } from "./UiLangSelect";

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

export const LEVELS: { id: Level; label: string }[] = [
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
    // Con la IA en la nube no hace falta mirar los modelos del dispositivo (ni gastar red).
    if (demo || cloud) return;
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
  }, [f16, demo, cloud]);

  const character = getCharacter(prefs.characterId);
  const lang = langOf(character);
  const targets: TargetLang[] = ["en", "fr"];
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
            <strong>{t("Continúa con {name}", { name: draftChar.name.split(" ")[0] })}</strong>
            <small>
              {t("{n} intervenciones · la dejaste a medias", { n: draft.messages.filter((m) => m.role === "user").length })}
            </small>
          </div>
          <div className="resume-actions">
            <button className="btn-dark btn-small" onClick={onResume}>
              {t("Seguir")}
            </button>
            <button className="icon-plain" onClick={onDiscardDraft} aria-label={t("Descartar conversación guardada")}>
              <Icon name="close" size={18} />
            </button>
          </div>
        </div>
      )}

      {targets.length > 1 && (
      <section>
        <h2 className="section-title">{t("¿Qué idioma quieres practicar?")}</h2>
        <div className="seg seg-wide lang-seg" role="group" aria-label={t("Idioma")}>
          {targets.map((l) => (
            <button
              key={l}
              className={lang === l ? "on" : ""}
              aria-pressed={lang === l}
              onClick={() => {
                if (l === lang) return;
                const first = CHARACTERS.find((c) => langOf(c) === l)!;
                setRegion("all");
                onChange({ lang: l, characterId: first.id, scenarioId: scenariosFor(first.kind)[0].id });
              }}
            >
              <Flag code={l === "en" ? "gb" : "fr"} size={30} />
              <strong>{l === "en" ? t("Inglés") : t("Francés")}</strong>
            </button>
          ))}
        </div>
      </section>
      )}

      <section>
        <h2 className="section-title">{t("¿Con quién quieres hablar?")}</h2>
        <div className="region-chips" role="group" aria-label={t("Filtrar por acento")}>
          {REGIONS[lang].map((r) => (
            <button key={r.id} type="button" className={region === r.id ? "on" : ""} onClick={() => setRegion(r.id)} aria-pressed={region === r.id}>
              {t(r.label)}
            </button>
          ))}
        </div>
        <div className="char-grid">
          {CHARACTERS.filter((c) => langOf(c) === lang && (region === "all" || c.region === region)).map((c) => (
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
              <span className="char-accent">{t(c.accent)}</span>
              <small>{t(c.tagline)}</small>
            </button>
          ))}
        </div>
      </section>

      <section>
        <h2 className="section-title">{t("Situación")}</h2>
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
                <strong>{t(s.title)}</strong>
                <small>{t(s.goal)}</small>
              </span>
            </button>
          ))}
        </div>
      </section>

      {character.kind === "casual" && (
        <section>
          <h2 className="section-title">{t("¿Quién empieza?")}</h2>
          <div className="seg seg-wide" role="group" aria-label={t("Quién empieza la llamada")}>
            <button className={!prefs.userStarts ? "on" : ""} onClick={() => onChange({ userStarts: false })}>
              <strong>{character.name.split(" ")[0]}</strong>
              <small>{t("Te saluda y pregunta")}</small>
            </button>
            <button className={prefs.userStarts ? "on" : ""} onClick={() => onChange({ userStarts: true })}>
              <strong>{t("Yo")}</strong>
              <small>{t("Tú sacas el tema")}</small>
            </button>
          </div>
        </section>
      )}

      <section>
        <h2 className="section-title">{t("Tu nivel")}</h2>
        <div className="seg seg-wide" role="group" aria-label={t("Nivel")}>
          {LEVELS.map((l) => (
            <button key={l.id} className={prefs.level === l.id ? "on" : ""} onClick={() => onChange({ level: l.id })}>
              <strong>{l.id}</strong>
              <small>{t(l.label)}</small>
            </button>
          ))}
        </div>
      </section>

      <section className="card model-card">
        {cloudOk && (
          <div className="seg seg-wide engine-seg" role="group" aria-label={t("Dónde funciona la IA")}>
            <button className={cloud ? "on" : ""} onClick={() => onChange({ aiEngine: "cloud" })}>
              <strong>{t("☁️ En la nube")}</strong>
              <small>{t("Rápida · sin descargas")}</small>
            </button>
            <button className={!cloud ? "on" : ""} onClick={() => onChange({ aiEngine: "local" })}>
              <strong>{t("🔒 En tu dispositivo")}</strong>
              <small>{t("Privada · sin internet")}</small>
            </button>
          </div>
        )}
        {cloud ? (
          <p className="muted small">
            {t("Responde al instante. Tus frases se envían a la IA (Groq) para contestarte; no se guardan en ningún sitio de la app. La voz y el reconocimiento siguen funcionando en tu dispositivo.")}
          </p>
        ) : (
          <>
        <button className="model-summary" onClick={() => setShowModels((v) => !v)} aria-expanded={showModels}>
          <span>
            <strong>{t("IA: {model}", { model: t(MODEL_OPTIONS[tier].label) })}</strong>
            <small>
              {demo
                ? t("Modo demo")
                : isCached
                  ? t("✓ Descargada · funciona sin conexión")
                  : t("Descarga única de {size}", { size: (sizes[tier] ? "" : "≈ ") + formatMB(llmMB) })}
            </small>
          </span>
          <span className="muted small">{t("Cambiar")}</span>
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
                      {t(m.label)}
                      {m.tier === "light" && <em className="pill">{t("Recomendado")}</em>}
                    </strong>
                    <small>{t(m.description)}</small>
                    <small className="size">{demo ? t("Modo demo") : c ? t("✓ Ya descargado") : t("Descarga: {size}", { size: (sizes[m.tier] ? "" : "≈ ") + formatMB(s) })}</small>
                  </span>
                </label>
              );
            })}
          </div>
        )}
          </>
        )}
        {!cloud && mobile && tier === "quality" && (
          <p className="note">{t("En móvil el modelo «Mejor calidad» puede quedarse sin memoria. Si falla, vuelve al ligero.")}</p>
        )}
        {totalMB > 0 && (
          <p className="note">
            {t("Primera vez: se descargarán")} <strong>≈ {formatMB(totalMB)}</strong>
            {cloud ? (
              <> {t("para la voz natural y el oído, una sola vez.")}</>
            ) : (
              extraMB > 0 && <> {t("(IA {llm} + voz natural y oído {extra})", { llm: formatMB(llmMB), extra: formatMB(extraMB) })}</>
            )}{" "}
            {t("Mejor con Wi-Fi.")}{!cloud && " " + t("Después funciona sin conexión.")}
          </p>
        )}
        {lowSpace && (
          <p className="note note-warn">
            {t("Puede que no haya espacio suficiente ({free} libres). Libera espacio o usa el modelo ligero.", { free: formatMB(free ?? 0) })}
          </p>
        )}
      </section>

      <div className="share-row">
        <span className="muted small">{t("100% gratis · sin registro · sin anuncios")}</span>
        <ShareButton className="btn-ghost btn-small" label={t("Compartir")} />
      </div>
      <div className="home-footer">
        <UiLangSelect />
      </div>

      <button className="cta" onClick={() => onStart({ cached: isCached })}>
        <Icon name="call" /> {isCached || cloud ? t("Llamar a {name}", { name: character.name.split(" ")[0] }) : t("Descargar y llamar a {name}", { name: character.name.split(" ")[0] })}
      </button>
    </div>
  );
}
