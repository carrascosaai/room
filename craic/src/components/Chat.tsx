import { useEffect, useRef, useState } from "react";
import type { Character, Level } from "../characters";
import { useConversation, type Msg } from "../conversation";
import type { LLM } from "../llm/engine";
import { MIC_ERROR_TEXT, useSpeechRecognition } from "../speech/recognition";
import { stopSpeaking, ttsSupported, unlockTTS, type SpeechRate } from "../speech/tts";
import { CorrectionCard } from "./CorrectionCard";
import { TalkButton } from "./TalkButton";

interface Props {
  llm: LLM;
  character: Character;
  level: Level;
  rate: SpeechRate;
  onRateChange: (r: SpeechRate) => void;
  onEnd: (messages: Msg[]) => void;
  demo: boolean;
}

export function Chat({ llm, character, level, rate, onRateChange, onEnd, demo }: Props) {
  const { messages, thinking, send, say } = useConversation(llm, character, level, rate);
  const mic = useSpeechRecognition("en-GB");
  const [typing, setTyping] = useState(!mic.supported);
  const [draft, setDraft] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, mic.transcript]);

  const startTalking = () => {
    unlockTTS();
    stopSpeaking();
    mic.clearError();
    mic.start();
  };

  const finishTalking = async () => {
    const text = await mic.stop();
    if (text) void send(text);
  };

  const submitDraft = (e: React.FormEvent) => {
    e.preventDefault();
    unlockTTS();
    if (!draft.trim() || thinking) return;
    void send(draft);
    setDraft("");
  };

  return (
    <div className="chat">
      <header className="chat-head">
        <div className="who">
          <span className="avatar" aria-hidden="true">{character.emoji}</span>
          <div>
            <strong>{character.name}</strong>
            <small>
              {character.short} · {level}
            </small>
          </div>
        </div>
        <div className="head-actions">
          <div className="seg" role="group" aria-label="Velocidad de voz">
            <button className={rate === "slow" ? "on" : ""} onClick={() => onRateChange("slow")}>
              Lenta
            </button>
            <button className={rate === "normal" ? "on" : ""} onClick={() => onRateChange("normal")}>
              Normal
            </button>
          </div>
          <button className="btn-ghost" onClick={() => onEnd(messages)}>
            Terminar
          </button>
        </div>
      </header>

      {demo && <div className="banner banner-warn">Modo demo: respuestas de prueba, sin modelo real.</div>}
      {!mic.supported && (
        <div className="banner">
          Tu navegador no permite reconocimiento de voz. Puedes escribir tus respuestas (Chrome, Edge o Safari sí lo permiten).
        </div>
      )}
      {!ttsSupported && <div className="banner">Tu navegador no puede leer en voz alta las respuestas.</div>}

      <div className="messages" ref={listRef} aria-live="polite">
        {messages.map((m) => (
          <div key={m.id} className={`row row-${m.role}`}>
            <div className={`bubble bubble-${m.role}`} lang={m.role === "assistant" ? "en" : undefined}>
              {m.text || (m.streaming ? <span className="dots" aria-label="Pensando" /> : null)}
              {m.role === "assistant" && !m.streaming && m.text && (
                <button className="replay" aria-label="Repetir en voz alta" onClick={() => void say(m.text)}>
                  🔊
                </button>
              )}
            </div>
            {m.role === "user" && <CorrectionCard msg={m} />}
          </div>
        ))}
        {mic.listening && (
          <div className="row row-user">
            <div className="bubble bubble-user bubble-live">{mic.transcript || "…"}</div>
          </div>
        )}
      </div>

      <footer className="chat-foot">
        {mic.error && <p className="mic-error">{MIC_ERROR_TEXT[mic.error]}</p>}
        {typing ? (
          <form className="type-row" onSubmit={submitDraft}>
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Write in English…"
              lang="en"
              autoComplete="off"
              enterKeyHint="send"
              aria-label="Escribe tu respuesta"
            />
            <button className="btn" type="submit" disabled={thinking || !draft.trim()}>
              Enviar
            </button>
            {mic.supported && (
              <button type="button" className="icon-btn" aria-label="Hablar" onClick={() => setTyping(false)}>
                🎙️
              </button>
            )}
          </form>
        ) : (
          <div className="talk-row">
            <span className="spacer" />
            <TalkButton
              disabled={thinking}
              listening={mic.listening}
              onStart={startTalking}
              onFinish={() => void finishTalking()}
            />
            <button type="button" className="icon-btn" aria-label="Escribir" onClick={() => setTyping(true)}>
              ⌨️
            </button>
          </div>
        )}
      </footer>
    </div>
  );
}
