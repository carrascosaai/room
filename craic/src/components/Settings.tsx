import { useState } from "react";
import { CHARACTERS, NEURAL_VOICES } from "../characters";
import { clearAll, downloadBlob, exportAll, exportVocabCSV } from "../lib/db";
import type { Prefs } from "../lib/prefs";
import { deleteCachedModel } from "../llm/engine";
import { MODEL_OPTIONS } from "../llm/models";
import { useAudioModels, WHISPER_MODELS, type WhisperSize } from "../speech/audioModels";
import { recognitionSupported } from "../speech/recognition";
import { speak, unlockTTS } from "../speech/tts";
import { Flag } from "./Brand";
import { Toggle } from "./Chat";

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
        <Toggle
          label="Voz realista (IA neuronal)"
          hint={
            audio.tts === "ready"
              ? "Lista · se ejecuta en tu dispositivo"
              : audio.tts === "loading"
                ? `Preparando… ${Math.round(audio.ttsProgress * 100)}%`
                : audio.tts === "error"
                  ? "No se pudo cargar; se usa la voz del sistema"
                  : "Kokoro-82M · ~90 MB, se descarga una vez"
          }
          checked={prefs.voiceEngine === "neural"}
          onChange={(v) => onChange({ voiceEngine: v ? "neural" : "system" })}
        />
        {CHARACTERS.map((c) => (
          <div key={c.id} className="voice-row">
            <Flag code={c.flag} size={32} />
            <span className="voice-name">{c.name.split(" ")[0]}</span>
            {prefs.voiceEngine === "neural" ? (
              <select
                aria-label={`Voz de ${c.name}`}
                value={prefs.voiceOverrides[c.id] ?? c.neuralVoice}
                onChange={(e) => onChange({ voiceOverrides: { ...prefs.voiceOverrides, [c.id]: e.target.value } })}
              >
                {NEURAL_VOICES.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.label}
                  </option>
                ))}
              </select>
            ) : (
              <span className="muted small grow">Voz del sistema</span>
            )}
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
        <h2>Reconocimiento de tu voz</h2>
        <div className="seg seg-wide" role="group" aria-label="Motor de reconocimiento">
          <button className={prefs.asrEngine === "whisper" ? "on" : ""} onClick={() => onChange({ asrEngine: "whisper" })}>
            <strong>Whisper</strong>
            <small>IA en tu dispositivo</small>
          </button>
          <button
            className={prefs.asrEngine === "browser" ? "on" : ""}
            onClick={() => onChange({ asrEngine: "browser" })}
            disabled={!recognitionSupported}
          >
            <strong>Navegador</strong>
            <small>{recognitionSupported ? "Más rápido, en vivo" : "No disponible"}</small>
          </button>
        </div>
        {prefs.asrEngine === "whisper" ? (
          <>
            <p className="muted small">
              Whisper entiende muy bien el acento español, funciona sin conexión y tu voz no sale del dispositivo.{" "}
              {audio.asr === "loading" && `Preparando… ${Math.round(audio.asrProgress * 100)}%`}
              {audio.asr === "error" && "No se pudo cargar; se usará el del navegador."}
            </p>
            <div className="seg seg-wide" role="group" aria-label="Precisión">
              {(Object.keys(WHISPER_MODELS) as WhisperSize[]).map((k) => (
                <button key={k} className={prefs.whisperSize === k ? "on" : ""} onClick={() => onChange({ whisperSize: k })}>
                  <strong>{WHISPER_MODELS[k].label}</strong>
                  <small>~{WHISPER_MODELS[k].sizeMB} MB</small>
                </button>
              ))}
            </div>
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
        Craic · IA local con WebLLM, Whisper y Kokoro · Built with Llama · Código abierto (MIT)
      </p>
    </div>
  );
}
