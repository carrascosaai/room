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
      neuralVoice: prefs.voiceOverrides[c.id] ?? c.neuralVoice,
      engine: prefs.voiceEngine,
    });
  };

  const wipe = async () => {
    if (!confirm("¿Borrar TODO el historial y el vocabulario de este dispositivo? No se puede deshacer.")) return;
    await clearAll();
    try {
      localStorage.removeItem("craic:draft");
    } catch {
      /* nada */
    }
    setMsg("Historial y vocabulario borrados.");
  };

  const wipeModels = async () => {
    if (!confirm("¿Borrar los modelos descargados (IA, voz y reconocimiento)? Tendrás que descargarlos otra vez.")) return;
    const ids = Object.values(MODEL_OPTIONS).flatMap((m) => [m.idF16, m.idF32]);
    await Promise.allSettled(ids.map((id) => deleteCachedModel(id)));
    await Promise.allSettled(["transformers-cache", "kokoro-voices"].map((c) => caches.delete(c)));
    try {
      localStorage.removeItem("craic:audio-cached");
    } catch {
      /* nada */
    }
    setMsg("Modelos borrados. Recarga la página para liberar la memoria.");
  };

  return (
    <div className="settings">
      <section className="card">
        <h2>Voz de los personajes</h2>
        <div className="seg seg-wide" role="group" aria-label="Tipo de voz">
          {(
            [
              ["auto", "Automática", "La más natural"],
              ["neural", "IA neuronal", "Kokoro"],
              ["system", "Sistema", "Instantánea"],
            ] as const
          ).map(([id, t, h]) => (
            <button key={id} className={prefs.voiceEngine === id ? "on" : ""} onClick={() => onChange({ voiceEngine: id })}>
              <strong>{t}</strong>
              <small>{h}</small>
            </button>
          ))}
        </div>
        <p className="muted small">
          {prefs.voiceEngine === "auto"
            ? "Usa las voces «naturales» de tu navegador si las tiene (Edge, Safari con voces mejoradas); si no, la voz IA."
            : prefs.voiceEngine === "neural"
              ? "Voz IA en tu dispositivo, suena como una persona."
              : "La voz del sistema: instantánea, pero en algunos navegadores suena robótica."}{" "}
          {audio.tts === "loading" && `Preparando voz IA… ${Math.round(audio.ttsProgress * 100)}%`}
          {audio.tts === "ready" && `Voz IA lista (${audio.ttsDevice === "webgpu" ? "GPU" : "CPU"}).`}
          {audio.tts === "error" && "La voz IA no pudo cargarse en este dispositivo."}
        </p>
        {prefs.voiceEngine !== "system" && (
          <div className="seg seg-wide" role="group" aria-label="Calidad de la voz IA">
            <button className={prefs.voiceQuality === "high" ? "on" : ""} onClick={() => onChange({ voiceQuality: "high" })}>
              <strong>Máxima calidad</strong>
              <small>GPU · ~{TTS_SIZE_MB.webgpu} MB</small>
            </button>
            <button className={prefs.voiceQuality === "light" ? "on" : ""} onClick={() => onChange({ voiceQuality: "light" })}>
              <strong>Ligera</strong>
              <small>CPU · ~{TTS_SIZE_MB.wasm} MB</small>
            </button>
          </div>
        )}
        {CHARACTERS.filter((c) => (c.lang ?? "en") === "en").map((c) => (
          <div key={c.id} className="voice-row">
            <span className="voice-name">{c.name.split(" ")[0]}</span>
            <select
              aria-label={`Voz de ${c.name}`}
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
              Probar
            </button>
          </div>
        ))}
        <Toggle label="Voz lenta" checked={prefs.rate === "slow"} onChange={(v) => onChange({ rate: v ? "slow" : "normal" })} />
        <Toggle label="Leer respuestas en voz alta" checked={prefs.autoSpeak} onChange={(v) => onChange({ autoSpeak: v })} />
        <Toggle
          label="Modo escucha"
          hint="Oculta el texto del personaje hasta que lo toques"
          checked={!prefs.subtitles}
          onChange={(v) => onChange({ subtitles: !v })}
        />
      </section>

      <section className="card">
        <h2>Conversación por voz</h2>
        <Toggle
          label="Modo llamada (manos libres)"
          hint="Te escucha sola y envía cuando dejas de hablar"
          checked={prefs.handsFree}
          onChange={(v) => onChange({ handsFree: v })}
        />
        <PauseSlider value={pauseMs(prefs)} onChange={(ms) => onChange({ pause: ms })} />
        <label className="field">
          <span>Reconocimiento de tu voz</span>
          <div className="seg seg-wide" role="group" aria-label="Motor de reconocimiento">
            <button className={prefs.asrEngine === "local" ? "on" : ""} onClick={() => onChange({ asrEngine: "local" })}>
              <strong>En tu móvil</strong>
              <small>Privado, sin internet</small>
            </button>
            <button
              className={prefs.asrEngine === "browser" ? "on" : ""}
              onClick={() => onChange({ asrEngine: "browser" })}
              disabled={!recognitionSupported}
            >
              <strong>Navegador</strong>
              <small>{recognitionSupported ? "Texto en vivo" : "No disponible"}</small>
            </button>
          </div>
        </label>
        {prefs.asrEngine === "local" ? (
          <>
            <div className="seg seg-wide" role="group" aria-label="Modelo de reconocimiento">
              {(Object.keys(ASR_MODELS) as (keyof typeof ASR_MODELS)[]).map((k) => (
                <button key={k} className={prefs.asrModel === k ? "on" : ""} onClick={() => onChange({ asrModel: k })}>
                  <strong>{ASR_MODELS[k].label}</strong>
                  <small>{ASR_MODELS[k].hint}</small>
                </button>
              ))}
            </div>
            <p className="muted small">
              {audio.asr === "loading" && `Preparando… ${Math.round(audio.asrProgress * 100)}%`}
              {audio.asr === "ready" && "Listo."}
              {audio.asr === "error" && "No se pudo cargar; se usará el del navegador."}
            </p>
          </>
        ) : (
          <label className="field">
            <span>Acento con el que te interpreta</span>
            <select
              value={prefs.recognitionLang}
              onChange={(e) => onChange({ recognitionLang: e.target.value as Prefs["recognitionLang"] })}
            >
              <option value="auto">Automático (según el personaje)</option>
              <option value="en-GB">Inglés británico</option>
              <option value="en-US">Inglés americano</option>
            </select>
          </label>
        )}
        <Toggle
          label="Revisar lo que digo antes de enviarlo"
          hint="La transcripción aparece en el cuadro de texto para corregirla"
          checked={prefs.reviewTranscript}
          onChange={(v) => onChange({ reviewTranscript: v })}
        />
      </section>

      <section className="card">
        <h2>Apariencia</h2>
        <div className="seg seg-wide" role="group" aria-label="Tema">
          {(["auto", "light", "dark"] as const).map((t) => (
            <button key={t} className={prefs.theme === t ? "on" : ""} onClick={() => onChange({ theme: t })}>
              <strong>{t === "auto" ? "Automático" : t === "light" ? "Claro" : "Oscuro"}</strong>
            </button>
          ))}
        </div>
      </section>

      <section className="card">
        <h2>Tus datos</h2>
        <p className="muted small">Todo se guarda solo en este dispositivo. Nadie más (ni el desarrollador) puede verlo.</p>
        <div className="actions">
          <button className="btn-ghost" onClick={async () => downloadBlob(await exportAll(), `craic-${today()}.json`)}>
            Exportar todo (JSON)
          </button>
          <button className="btn-ghost" onClick={async () => downloadBlob(await exportVocabCSV(), `craic-vocabulario-${today()}.csv`)}>
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

      <p className="foot muted">
        Craic · IA local con WebLLM, Moonshine, Silero y Kokoro · Built with Llama · Código abierto (MIT) · versión {__APP_VERSION__}
      </p>
    </div>
  );
}
