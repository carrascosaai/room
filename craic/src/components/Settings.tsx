import { t } from "../i18n";
import { useState } from "react";
import { CHARACTERS, NEURAL_VOICES } from "../characters";
import { clearAll, downloadBlob, exportAll, exportVocabCSV } from "../lib/db";
import type { Prefs } from "../lib/prefs";
import { deleteCachedModel } from "../llm/engine";
import { MODEL_OPTIONS } from "../llm/models";
import { pauseMs } from "../lib/prefs";
import { ASR_MODELS, TTS_SIZE_MB, useAudioModels } from "../speech/audioModels";
import { recognitionSupported } from "../speech/recognition";
import { speak, unlockTTS } from "../speech/tts";
import { PauseSlider, Toggle } from "./Chat";
import { UiLangSelect } from "./UiLangSelect";

const today = () => new Date().toISOString().slice(0, 10);

export function Settings({ prefs, onChange }: { prefs: Prefs; onChange: (p: Partial<Prefs>) => void }) {
  const [msg, setMsg] = useState<string | null>(null);
  const audio = useAudioModels();

  const test = (charId: string) => {
    unlockTTS();
    const c = CHARACTERS.find((x) => x.id === charId)!;
    void speak(`Hi, I'm ${c.name.split(" ")[0]}. This is how I sound. Nice to meet you!`, {
      rate: prefs.rate,
      langs: c.voiceLangs,
      gender: c.voiceGender,
      hint: c.voiceHint,
      cloudVoice: c.cloudVoice,
      neuralVoice: prefs.voiceOverrides[c.id] ?? c.neuralVoice,
      engine: prefs.voiceEngine,
    });
  };

  const wipe = async () => {
    if (!confirm(t("¿Borrar TODO el historial y el vocabulario de este dispositivo? No se puede deshacer."))) return;
    await clearAll();
    try {
      localStorage.removeItem("craic:draft");
    } catch {
      /* nada */
    }
    setMsg(t("Historial y vocabulario borrados."));
  };

  const wipeModels = async () => {
    if (!confirm(t("¿Borrar los modelos descargados (IA, voz y reconocimiento)? Tendrás que descargarlos otra vez."))) return;
    const ids = Object.values(MODEL_OPTIONS).flatMap((m) => [m.idF16, m.idF32]);
    await Promise.allSettled(ids.map((id) => deleteCachedModel(id)));
    await Promise.allSettled(["transformers-cache", "kokoro-voices"].map((c) => caches.delete(c)));
    try {
      localStorage.removeItem("craic:audio-cached");
    } catch {
      /* nada */
    }
    setMsg(t("Modelos borrados. Recarga la página para liberar la memoria."));
  };

  return (
    <div className="settings">
      <section className="card">
        <h2>{t("Idioma de la página")}</h2>
        <UiLangSelect />
      </section>

      <section className="card">
        <h2>{t("Voz de los personajes")}</h2>
        <div className="seg seg-wide" role="group" aria-label={t("Tipo de voz")}>
          {(
            [
              ["auto", "Automática", "La más natural"],
              ["neural", "IA neuronal", "Kokoro"],
              ["system", "Sistema", "Instantánea"],
            ] as const
          ).map(([id, title, h]) => (
            <button key={id} className={prefs.voiceEngine === id ? "on" : ""} onClick={() => onChange({ voiceEngine: id })}>
              <strong>{t(title)}</strong>
              <small>{t(h)}</small>
            </button>
          ))}
        </div>
        <p className="muted small">
          {prefs.voiceEngine === "auto"
            ? t("Usa las voces «naturales» de tu navegador si las tiene (Edge, Safari con voces mejoradas); si no, la voz IA.")
            : prefs.voiceEngine === "neural"
              ? t("Voz IA en tu dispositivo, suena como una persona.")
              : t("La voz del sistema: instantánea, pero en algunos navegadores suena robótica.")}{" "}
          {audio.tts === "loading" && t("Preparando voz IA… {p}%", { p: Math.round(audio.ttsProgress * 100) })}
          {audio.tts === "ready" && t("Voz IA lista ({device}).", { device: audio.ttsDevice === "webgpu" ? "GPU" : "CPU" })}
          {audio.tts === "error" && t("La voz IA no pudo cargarse en este dispositivo.")}
        </p>
        {prefs.voiceEngine !== "system" && (
          <div className="seg seg-wide" role="group" aria-label={t("Calidad de la voz IA")}>
            <button className={prefs.voiceQuality === "high" ? "on" : ""} onClick={() => onChange({ voiceQuality: "high" })}>
              <strong>{t("Máxima calidad")}</strong>
              <small>GPU · ~{TTS_SIZE_MB.webgpu} MB</small>
            </button>
            <button className={prefs.voiceQuality === "light" ? "on" : ""} onClick={() => onChange({ voiceQuality: "light" })}>
              <strong>{t("Ligera")}</strong>
              <small>CPU · ~{TTS_SIZE_MB.wasm} MB</small>
            </button>
          </div>
        )}
        {CHARACTERS.filter((c) => (c.lang ?? "en") === "en").map((c) => (
          <div key={c.id} className="voice-row">
            <span className="voice-name">{c.name.split(" ")[0]}</span>
            <select
              aria-label={t("Voz de {name}", { name: c.name })}
              value={prefs.voiceOverrides[c.id] ?? c.neuralVoice}
              onChange={(e) => onChange({ voiceOverrides: { ...prefs.voiceOverrides, [c.id]: e.target.value } })}
              disabled={prefs.voiceEngine === "system"}
            >
              {NEURAL_VOICES.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.label}
                </option>
              ))}
            </select>
            <button className="btn-ghost btn-small" onClick={() => test(c.id)}>
              {t("Probar")}
            </button>
          </div>
        ))}
        <Toggle label={t("Voz lenta")} checked={prefs.rate === "slow"} onChange={(v) => onChange({ rate: v ? "slow" : "normal" })} />
        <Toggle label={t("Leer respuestas en voz alta")} checked={prefs.autoSpeak} onChange={(v) => onChange({ autoSpeak: v })} />
        <Toggle
          label={t("Modo escucha")}
          hint={t("Oculta el texto del personaje hasta que lo toques")}
          checked={!prefs.subtitles}
          onChange={(v) => onChange({ subtitles: !v })}
        />
      </section>

      <section className="card">
        <h2>{t("Conversación por voz")}</h2>
        <Toggle
          label={t("Modo llamada (manos libres)")}
          hint={t("Te escucha sola y envía cuando dejas de hablar")}
          checked={prefs.handsFree}
          onChange={(v) => onChange({ handsFree: v })}
        />
        <PauseSlider value={pauseMs(prefs)} onChange={(ms) => onChange({ pause: ms })} />
        <label className="field">
          <span>{t("Reconocimiento de tu voz")}</span>
          <div className="seg seg-wide" role="group" aria-label={t("Motor de reconocimiento")}>
            <button className={prefs.asrEngine === "local" ? "on" : ""} onClick={() => onChange({ asrEngine: "local" })}>
              <strong>{t("En tu móvil")}</strong>
              <small>{t("Privado, sin internet")}</small>
            </button>
            <button
              className={prefs.asrEngine === "browser" ? "on" : ""}
              onClick={() => onChange({ asrEngine: "browser" })}
              disabled={!recognitionSupported}
            >
              <strong>{t("Navegador")}</strong>
              <small>{recognitionSupported ? t("Texto en vivo") : t("No disponible")}</small>
            </button>
          </div>
        </label>
        {prefs.asrEngine === "local" ? (
          <>
            <div className="seg seg-wide" role="group" aria-label={t("Modelo de reconocimiento")}>
              {(Object.keys(ASR_MODELS) as (keyof typeof ASR_MODELS)[]).map((k) => (
                <button key={k} className={prefs.asrModel === k ? "on" : ""} onClick={() => onChange({ asrModel: k })}>
                  <strong>{t(ASR_MODELS[k].label)}</strong>
                  <small>{t(ASR_MODELS[k].hint)}</small>
                </button>
              ))}
            </div>
            <p className="muted small">
              {audio.asr === "loading" && t("Preparando… {p}%", { p: Math.round(audio.asrProgress * 100) })}
              {audio.asr === "ready" && t("Listo.")}
              {audio.asr === "error" && t("No se pudo cargar; se usará el del navegador.")}
            </p>
          </>
        ) : (
          <label className="field">
            <span>{t("Acento con el que te interpreta")}</span>
            <select
              value={prefs.recognitionLang}
              onChange={(e) => onChange({ recognitionLang: e.target.value as Prefs["recognitionLang"] })}
            >
              <option value="auto">{t("Automático (según el personaje)")}</option>
              <option value="en-GB">{t("Inglés británico")}</option>
              <option value="en-US">{t("Inglés americano")}</option>
            </select>
          </label>
        )}
        <Toggle
          label={t("Revisar lo que digo antes de enviarlo")}
          hint={t("La transcripción aparece en el cuadro de texto para corregirla")}
          checked={prefs.reviewTranscript}
          onChange={(v) => onChange({ reviewTranscript: v })}
        />
      </section>

      <section className="card">
        <h2>{t("Apariencia")}</h2>
        <div className="seg seg-wide" role="group" aria-label={t("Tema")}>
          {(["auto", "light", "dark"] as const).map((th) => (
            <button key={th} className={prefs.theme === th ? "on" : ""} onClick={() => onChange({ theme: th })}>
              <strong>{th === "auto" ? t("Automático") : th === "light" ? t("Claro") : t("Oscuro")}</strong>
            </button>
          ))}
        </div>
      </section>

      <section className="card">
        <h2>{t("Tus datos")}</h2>
        <p className="muted small">{t("Todo se guarda solo en este dispositivo. Nadie más (ni el desarrollador) puede verlo.")}</p>
        <div className="actions">
          <button className="btn-ghost" onClick={async () => downloadBlob(await exportAll(), `craic-${today()}.json`)}>
            {t("Exportar todo (JSON)")}
          </button>
          <button className="btn-ghost" onClick={async () => downloadBlob(await exportVocabCSV(), `craic-vocabulario-${today()}.csv`)}>
            {t("Vocabulario (CSV para Anki)")}
          </button>
        </div>
        <div className="actions">
          <button className="btn-ghost danger" onClick={() => void wipe()}>
            {t("Borrar historial y vocabulario")}
          </button>
          <button className="btn-ghost danger" onClick={() => void wipeModels()}>
            {t("Borrar modelos descargados")}
          </button>
        </div>
        {msg && <p className="note">{msg}</p>}
      </section>

      <p className="foot muted">
        Craic · WebLLM, Moonshine, Silero, Kokoro · Built with Llama · {t("Código abierto (MIT)")} · {t("versión")} {__APP_VERSION__}
      </p>
    </div>
  );
}
