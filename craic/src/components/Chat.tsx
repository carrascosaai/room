import { useEffect, useRef, useState } from "react";
import { NEURAL_VOICES, type Character, type Level } from "../characters";
import { useConversation, type Msg } from "../conversation";
import type { Prefs } from "../lib/prefs";
import type { LLM } from "../llm/engine";
import type { Suggestion } from "../llm/parse";
import type { Scenario } from "../scenarios";
import { useAudioModels } from "../speech/audioModels";
import { MIC_ERROR_TEXT } from "../speech/recognition";
import { stopSpeaking, unlockTTS, useSpeaking } from "../speech/tts";
import { useVoiceInput } from "../speech/voiceInput";
import { Flag, Wordmark } from "./Brand";
import { CorrectionCard } from "./CorrectionCard";
import { Icon } from "./Icon";
import { TalkButton } from "./TalkButton";
import { Waveform } from "./Waveform";

interface Props {
  llm: LLM;
  character: Character;
  level: Level;
  scenario: Scenario;
  prefs: Prefs;
  onPrefs: (p: Partial<Prefs>) => void;
  onEnd: (messages: Msg[]) => void;
  onChange: (messages: Msg[]) => void;
  initialMessages?: Msg[];
  demo: boolean;
}

export function recognitionLangFor(prefs: Prefs, character: Character) {
  if (prefs.recognitionLang !== "auto") return prefs.recognitionLang;
  return character.voiceLangs[0] === "en-US" ? "en-US" : "en-GB";
}

export function Chat({ llm, character, level, scenario, prefs, onPrefs, onEnd, onChange, initialMessages, demo }: Props) {
  const neuralVoice = prefs.voiceOverrides[character.id] ?? character.neuralVoice;
  const convo = useConversation({
    llm,
    character,
    level,
    scenario,
    voice: { rate: prefs.rate, engine: prefs.voiceEngine, neuralVoice, autoSpeak: prefs.autoSpeak },
    initialMessages,
    onChange,
  });
  const { messages, thinking, engineError, send, say } = convo;
  const asrLang = recognitionLangFor(prefs, character);
  const mic = useVoiceInput(prefs.asrEngine, asrLang);
  const audio = useAudioModels();
  const speaking = useSpeaking();
  const [draft, setDraft] = useState("");
  const [ending, setEnding] = useState(false);
  const [cardOpen, setCardOpen] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [suggestions, setSuggestions] = useState<Suggestion[] | "loading" | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, mic.transcript, mic.phase, suggestions]);

  const submit = (text: string) => {
    setSuggestions(null);
    void send(text);
  };

  const startTalking = () => {
    unlockTTS();
    stopSpeaking();
    mic.clearError();
    setSuggestions(null);
    void mic.start();
  };

  const finishTalking = async () => {
    const text = await mic.stop();
    if (!text) return;
    if (prefs.reviewTranscript) {
      setDraft(text);
      setTimeout(() => inputRef.current?.focus(), 50);
    } else submit(text);
  };

  const submitDraft = (e: React.FormEvent) => {
    e.preventDefault();
    unlockTTS();
    if (!draft.trim() || thinking) return;
    submit(draft);
    setDraft("");
  };

  const toggleSuggestions = async () => {
    unlockTTS();
    if (suggestions) return setSuggestions(null);
    setSuggestions("loading");
    const s = await convo.suggest();
    setSuggestions(s);
  };

  const end = async () => {
    mic.cancel();
    setEnding(true);
    onEnd(await convo.finish());
  };

  const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant");
  const busy = thinking || mic.phase !== "idle";

  const loadingAudio =
    audio.tts === "loading" && prefs.voiceEngine === "neural"
      ? `Preparando la voz realista… ${Math.round(audio.ttsProgress * 100)}%`
      : audio.asr === "loading" && prefs.asrEngine === "whisper"
        ? `Preparando el reconocimiento de voz… ${Math.round(audio.asrProgress * 100)}%`
        : null;

  return (
    <div className="call">
      <header className="call-top">
        <span className="top-spacer" />
        <Wordmark small />
        <button className="round-btn" aria-label="Ajustes de la conversación" onClick={() => setSheet(true)}>
          <Icon name="sliders" />
        </button>
      </header>

      <button className={`convo-card${cardOpen ? " open" : ""}`} onClick={() => setCardOpen((v) => !v)} aria-expanded={cardOpen}>
        <Flag code={character.flag} />
        <span className="convo-card-text">
          <strong>Conversation with {character.name.split(" ")[0]}</strong>
          <small>
            {character.accent} · {level}
          </small>
        </span>
        <Icon name="chevron" className="chev" />
      </button>
      {cardOpen && (
        <div className="convo-details">
          <p>
            {scenario.emoji} <strong>{scenario.title}</strong> — {scenario.goal}
          </p>
          <p className="muted small">{character.tagline}</p>
        </div>
      )}

      {demo && <div className="banner banner-warn">Modo demo: respuestas de prueba, sin modelo real.</div>}
      {engineError && (
        <div className="banner banner-warn">
          {engineError.title}. {engineError.detail}{" "}
          <button className="link-btn" onClick={() => location.reload()}>
            Recargar
          </button>
        </div>
      )}
      {loadingAudio && <div className="banner banner-soft">{loadingAudio} · mientras tanto se usa la del sistema</div>}

      <div className="messages" ref={listRef} aria-live="polite">
        <div className="messages-spacer" />
        {messages.map((m) => {
          const hidden = m.role === "assistant" && !prefs.subtitles && !revealed.has(m.id) && !m.streaming;
          const isLast = m.id === lastAssistant?.id;
          return (
            <div key={m.id} className={`row row-${m.role}`}>
              <div
                className={`bubble bubble-${m.role}${hidden ? " bubble-hidden" : ""}`}
                onClick={hidden ? () => setRevealed((s) => new Set(s).add(m.id)) : undefined}
                role={hidden ? "button" : undefined}
                tabIndex={hidden ? 0 : undefined}
              >
                <span className="bubble-who">
                  {m.role === "user" ? "You" : character.name.split(" ")[0]}
                  {m.rephrase && <em> · más fácil</em>}
                </span>
                {hidden ? (
                  <span className="hidden-text">👂 Escucha y responde · toca para ver el texto</span>
                ) : (
                  <span lang={m.role === "assistant" ? "en" : undefined}>
                    {m.text || (m.streaming ? <span className="dots" aria-label="Pensando" /> : null)}
                  </span>
                )}
                {m.translation && <span className="translation">{m.translation}</span>}
                {m.role === "assistant" && !m.streaming && m.text && (
                  <span className="bubble-actions" onClick={(e) => e.stopPropagation()}>
                    <button className="mini-btn" onClick={() => void say(m.text)} aria-label="Repetir en voz alta">
                      <Icon name="volume" /> Repetir
                    </button>
                    <button className="mini-btn" onClick={() => void say(m.text, "slow")} aria-label="Repetir despacio">
                      🐢 Despacio
                    </button>
                    {!m.translation && (
                      <button className="mini-btn" onClick={() => void convo.translate(m.id)} disabled={m.translating}>
                        {m.translating ? "Traduciendo…" : "🌐 Traducir"}
                      </button>
                    )}
                    {isLast && (
                      <button className="mini-btn" onClick={() => void convo.rephrase()} disabled={busy}>
                        🤔 No entiendo
                      </button>
                    )}
                  </span>
                )}
              </div>
              {m.role === "user" && (
                <CorrectionCard msg={m} asrEngine={prefs.asrEngine} asrLang={asrLang} onSay={(t) => void say(t)} />
              )}
            </div>
          );
        })}
        {mic.phase !== "idle" && (mic.transcript || mic.phase === "transcribing") && (
          <div className="row row-user">
            <div className="bubble bubble-user bubble-live">
              <span className="bubble-who">You</span>
              {mic.phase === "transcribing" ? <span className="dots" aria-label="Transcribiendo" /> : mic.transcript}
            </div>
          </div>
        )}
        {suggestions && (
          <div className="suggestions">
            <div className="suggestions-head">
              <strong>💡 Ideas para responder</strong>
              <button className="mini-btn" onClick={() => setSuggestions(null)} aria-label="Cerrar ideas">
                ✕
              </button>
            </div>
            {suggestions === "loading" ? (
              <p className="muted small">Pensando respuestas posibles…</p>
            ) : suggestions.length === 0 ? (
              <p className="muted small">No se me ocurren ideas ahora mismo. Prueba otra vez.</p>
            ) : (
              <>
                {suggestions.map((s, i) => (
                  <div key={i} className="suggestion">
                    <div>
                      <strong lang="en">{s.en}</strong>
                      {s.es && <small>{s.es}</small>}
                    </div>
                    <div className="suggestion-actions">
                      <button className="mini-btn" onClick={() => void say(s.en)} aria-label="Escuchar">
                        <Icon name="volume" />
                      </button>
                      <button
                        className="mini-btn"
                        aria-label="Escribirla"
                        onClick={() => {
                          setDraft(s.en);
                          setSuggestions(null);
                          setTimeout(() => inputRef.current?.focus(), 50);
                        }}
                      >
                        ✎
                      </button>
                    </div>
                  </div>
                ))}
                <p className="muted small">Mejor dilas con tus palabras: mantén pulsado el micro.</p>
              </>
            )}
          </div>
        )}
      </div>

      <div className="composer-wrap">
        {mic.error && <p className="mic-error">{MIC_ERROR_TEXT[mic.error]}</p>}
        {mic.phase === "listening" ? (
          <div className="composer composer-live">
            <span className="rec-dot">
              <Icon name="mic" />
            </span>
            <Waveform level={mic.level} />
            <span className="composer-status">Listening…</span>
          </div>
        ) : mic.phase === "transcribing" ? (
          <div className="composer composer-live">
            <span className="rec-dot rec-dot-idle">
              <Icon name="mic" />
            </span>
            <Waveform level={() => 0.08} />
            <span className="composer-status">Transcribiendo…</span>
          </div>
        ) : speaking ? (
          <div className="composer composer-live">
            <span className="rec-dot rec-dot-idle">
              <Icon name="volume" />
            </span>
            <Waveform level={() => 0.5} tone="speak" />
            <button className="composer-status link-btn" onClick={() => stopSpeaking()}>
              Parar voz
            </button>
          </div>
        ) : (
          <form className="composer" onSubmit={submitDraft}>
            <input
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={thinking ? `${character.name.split(" ")[0]} está pensando…` : "Write in English or hold the mic…"}
              lang="en"
              autoComplete="off"
              autoCapitalize="sentences"
              spellCheck={false}
              enterKeyHint="send"
              aria-label="Escribe tu respuesta"
            />
            <button className="send-btn" type="submit" disabled={thinking || !draft.trim()} aria-label="Enviar">
              <Icon name="send" />
            </button>
          </form>
        )}
      </div>

      <nav className="dock" aria-label="Controles de la llamada">
        <button
          className={`dock-btn${suggestions ? " on" : ""}`}
          onClick={() => void toggleSuggestions()}
          disabled={busy && !suggestions}
          aria-label="Ideas para responder"
          title="¿Qué digo?"
        >
          <Icon name="bulb" />
        </button>
        <button className="dock-btn dock-end" onClick={() => void end()} disabled={ending || thinking} aria-label="Terminar conversación" title="Terminar">
          {ending ? <span className="spinner" /> : <Icon name="phone" />}
        </button>
        <button className="dock-btn" onClick={() => setSheet(true)} aria-label="Ajustes" title="Ajustes">
          <Icon name="gear" />
        </button>
        <TalkButton
          disabled={thinking || !mic.available}
          phase={mic.phase}
          level={mic.level}
          onStart={startTalking}
          onFinish={() => void finishTalking()}
        />
      </nav>
      <p className="dock-hint">{mic.phase === "listening" ? "Suelta o toca para enviar" : "Mantén pulsado o toca el micro para hablar"}</p>

      {sheet && (
        <div className="sheet-backdrop" onClick={() => setSheet(false)}>
          <div className="sheet" role="dialog" aria-label="Ajustes de la conversación" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-handle" />
            <h2>Ajustes de la conversación</h2>
            <Toggle label="Voz lenta" hint="El personaje habla más despacio" checked={prefs.rate === "slow"} onChange={(v) => onPrefs({ rate: v ? "slow" : "normal" })} />
            <Toggle label="Modo escucha" hint="Oculta el texto: entrena el oído" checked={!prefs.subtitles} onChange={(v) => onPrefs({ subtitles: !v })} />
            <Toggle label="Leer respuestas en voz alta" checked={prefs.autoSpeak} onChange={(v) => onPrefs({ autoSpeak: v })} />
            <Toggle label="Revisar lo que digo antes de enviarlo" hint="Puedes corregir la transcripción" checked={prefs.reviewTranscript} onChange={(v) => onPrefs({ reviewTranscript: v })} />
            <Toggle label="Voz realista (IA)" hint="Voz neuronal en tu dispositivo" checked={prefs.voiceEngine === "neural"} onChange={(v) => onPrefs({ voiceEngine: v ? "neural" : "system" })} />
            {prefs.voiceEngine === "neural" && (
              <label className="field">
                <span>Voz de {character.name.split(" ")[0]}</span>
                <select
                  value={neuralVoice}
                  onChange={(e) => {
                    onPrefs({ voiceOverrides: { ...prefs.voiceOverrides, [character.id]: e.target.value } });
                    unlockTTS();
                  }}
                >
                  {NEURAL_VOICES.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.label}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <div className="actions">
              <button className="btn-dark" onClick={() => void say(lastAssistant?.text ?? "Hello! This is how I sound.")}>
                Probar voz
              </button>
              <button className="btn-ghost" onClick={() => setSheet(false)}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="toggle">
      <span>
        {label}
        {hint && <small>{hint}</small>}
      </span>
      <input type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    </label>
  );
}
