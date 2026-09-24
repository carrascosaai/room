import { t } from "../i18n";
import { useCallback, useEffect, useRef, useState } from "react";
import { NEURAL_VOICES, type Character, type Level } from "../characters";
import { useConversation, type Msg } from "../conversation";
import { PAUSE_MAX, PAUSE_MIN, pauseMs, type Prefs } from "../lib/prefs";
import type { LLM } from "../llm/engine";
import type { Suggestion } from "../llm/parse";
import type { Scenario } from "../scenarios";
import { getAudioStatus, useAudioModels } from "../speech/audioModels";
import { MIC_ERROR_TEXT, type MicError } from "../speech/recognition";
import { stopSpeaking, unlockTTS, useSpeaking } from "../speech/tts";
import { listen, listenOnce, micLevel, pauseProgress, voiceInputAvailable, type ListenHandle, type ListenPhase } from "../speech/voiceInput";
import { Flag, Wordmark } from "./Brand";
import { CorrectionCard } from "./CorrectionCard";
import { infoOf, langOf } from "../lang";
import { Icon } from "./Icon";
import { PauseBar, Waveform } from "./Waveform";

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
  // Francés: el reconocimiento de Francia (o de Canadá para Quebec).
  if (langOf(character) !== "en") return character.voiceLangs[0] === "fr-CA" ? "fr-CA" : "fr-FR";
  if (prefs.recognitionLang !== "auto") return prefs.recognitionLang;
  return character.voiceLangs[0] === "en-US" ? "en-US" : "en-GB";
}

const firstName = (c: Character) => c.name.split(" ")[0];

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
    userStarts: prefs.userStarts,
  });
  const waitsForYou = prefs.userStarts && character.kind === "casual" && !initialMessages?.length;
  const { messages, thinking, engineError, say } = convo;
  const messagesRef = useRef(messages);
  messagesRef.current = messages;
  const audio = useAudioModels();
  const speaking = useSpeaking();
  const [phase, setPhase] = useState<ListenPhase>("idle");
  const [partial, setPartial] = useState("");
  const [micError, setMicError] = useState<MicError | null>(null);
  const [paused, setPaused] = useState(!prefs.handsFree);
  const [draft, setDraft] = useState("");
  const [ending, setEnding] = useState(false);
  const [cardOpen, setCardOpen] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [suggestions, setSuggestions] = useState<Suggestion[] | "loading" | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const handleRef = useRef<ListenHandle | null>(null);
  const netErrorsRef = useRef(0);
  const pausedRef = useRef(paused);
  pausedRef.current = paused;
  const busyRef = useRef(false); // el personaje piensa o habla
  const aliveRef = useRef(true);
  const prefsRef = useRef(prefs);
  prefsRef.current = prefs;
  const sendRef = useRef(convo.send);
  sendRef.current = convo.send;

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, partial, phase, suggestions]);

  const listenOpts = useCallback(
    () => ({
      // El oído local (Moonshine) solo sabe inglés: en francés, el del navegador.
      engine: langOf(character) === "en" ? prefsRef.current.asrEngine : "browser",
      lang: recognitionLangFor(prefsRef.current, character),
      silenceMs: pauseMs(prefsRef.current),
      // Lo último que dijo el personaje: ayuda a Whisper con nombres y temas.
      context: [...messagesRef.current].reverse().find((m) => m.role === "assistant")?.text,
    }),
    [character],
  );

  const stopListening = useCallback(() => {
    handleRef.current?.cancel();
    handleRef.current = null;
    setPartial("");
  }, []);

  /** Ciclo de la llamada: escuchar → (pausa) enviar → el personaje habla → escuchar. */
  const startListening = useCallback(() => {
    if (!aliveRef.current || pausedRef.current || busyRef.current || !voiceInputAvailable) return;
    setMicError(null);
    handleRef.current?.cancel();
    handleRef.current = listen({
      ...listenOpts(),
      onPhase: setPhase,
      onPartial: setPartial,
      onError: (e) => {
        setMicError(e);
        if (e === "loading" && getAudioStatus().asr === "loading") setTimeout(() => startListening(), 1200);
        // Fallo de red al transcribir: se sigue escuchando (hasta 3 veces seguidas).
        else if (e === "network" && ++netErrorsRef.current <= 3) setTimeout(() => startListening(), 1000);
        else if (e === "denied" || e === "no-mic" || e === "loading" || e === "language") {
          setPaused(true);
          pausedRef.current = true;
        }
      },
      onFinal: (text) => {
        handleRef.current = null;
        netErrorsRef.current = 0;
        setPartial("");
        if (!text) {
          // No se entendió nada: se sigue escuchando.
          setTimeout(() => startListening(), 150);
          return;
        }
        if (prefsRef.current.reviewTranscript) {
          setDraft(text);
          setPaused(true);
          setTimeout(() => inputRef.current?.focus(), 50);
          return;
        }
        void respondRef.current(text);
      },
    });
  }, [listenOpts]);

  const respondRef = useRef<(text: string) => Promise<void>>(async () => {});
  const respond = useCallback(
    async (text: string) => {
      stopListening();
      setSuggestions(null);
      busyRef.current = true;
      try {
        await sendRef.current(text);
      } finally {
        busyRef.current = false;
      }
      startListening();
    },
    [startListening, stopListening],
  );
  respondRef.current = respond;

  // Arranque: el personaje saluda y después empieza a escucharte.
  useEffect(() => {
    if (!messages.length && !waitsForYou) return; // aún no hay saludo
    aliveRef.current = true;
    let cancelled = false;
    const opener = initialMessages?.length ? null : messages[0]?.text;
    (async () => {
      if (opener && prefs.autoSpeak) {
        busyRef.current = true;
        await say(opener);
        busyRef.current = false;
      }
      if (!cancelled) startListening();
    })();
    return () => {
      cancelled = true;
      aliveRef.current = false;
      handleRef.current?.cancel();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length > 0 || waitsForYou]);

  // Si la app pasa a segundo plano, se deja de escuchar.
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "hidden") stopListening();
      else startListening();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [startListening, stopListening]);

  const onMic = () => {
    unlockTTS();
    if (speaking) {
      // Interrumpir al personaje y hablar tú
      stopSpeaking();
      setPaused(false);
      pausedRef.current = false;
      busyRef.current = false;
      startListening();
      return;
    }
    if (phase === "hearing") {
      handleRef.current?.finish(); // enviar ya
      return;
    }
    if (phase === "listening") {
      setPaused(true);
      pausedRef.current = true;
      stopListening();
      setPhase("idle");
      return;
    }
    setPaused(false);
    pausedRef.current = false;
    startListening();
  };

  const submitDraft = (e: React.FormEvent) => {
    e.preventDefault();
    unlockTTS();
    if (!draft.trim() || thinking) return;
    const text = draft;
    setDraft("");
    if (prefs.handsFree) {
      setPaused(false);
      pausedRef.current = false;
    }
    void respond(text);
  };

  const toggleSuggestions = async () => {
    unlockTTS();
    if (suggestions) return setSuggestions(null);
    setSuggestions("loading");
    const s = await convo.suggest();
    setSuggestions(s);
  };

  const rephrase = async () => {
    stopListening();
    busyRef.current = true;
    try {
      await convo.rephrase();
    } finally {
      busyRef.current = false;
    }
    startListening();
  };

  /** «Dilo tú» en una corrección: pausa la llamada, escucha una frase y la devuelve. */
  const practiceHandle = useRef<ListenHandle | null>(null);
  const practiceListen = useCallback(async () => {
    stopListening();
    stopSpeaking();
    busyRef.current = true;
    const { result, handle } = listenOnce({ ...listenOpts(), onPhase: () => {}, onError: setMicError });
    practiceHandle.current = handle;
    const text = await result;
    practiceHandle.current = null;
    busyRef.current = false;
    startListening();
    return text;
  }, [listenOpts, startListening, stopListening]);

  const end = async () => {
    aliveRef.current = false;
    stopListening();
    setEnding(true);
    onEnd(await convo.finish());
  };

  const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant");
  const name = firstName(character);

  const loadingAudio =
    audio.tts === "loading"
      ? t("Descargando la voz natural… {p}% · mientras, voz del sistema", { p: Math.round(audio.ttsProgress * 100) })
      : audio.asr === "loading" && prefs.asrEngine === "local"
        ? t("Mejorando el oído… {p}%", { p: Math.round(audio.asrProgress * 100) })
        : null;

  const status: { tone: "rec" | "speak" | "idle"; text: string } | null =
    phase === "hearing"
      ? { tone: "rec", text: t("Te escucho…") }
      : phase === "listening"
        ? { tone: "rec", text: t("Escuchando…") }
        : phase === "transcribing"
          ? { tone: "idle", text: t("Un momento…") }
          : thinking
            ? { tone: "idle", text: t("{name} está pensando…", { name }) }
            : speaking
              ? { tone: "speak", text: t("{name} habla…", { name }) }
              : null;

  return (
    <div className="call">
      <header className="call-top">
        <span className="top-spacer" />
        <Wordmark small />
        <button className="round-btn" aria-label={t("Ajustes de la conversación")} onClick={() => setSheet(true)}>
          <Icon name="sliders" />
        </button>
      </header>

      <button className={`convo-card${cardOpen ? " open" : ""}`} onClick={() => setCardOpen((v) => !v)} aria-expanded={cardOpen}>
        <Flag code={character.flag} />
        <span className="convo-card-text">
          <strong>{`${infoOf(character).callWith} ${name}`}</strong>
          <small>
            {t(character.accent)} · {level}
          </small>
        </span>
        <Icon name="chevron" className="chev" />
      </button>
      {cardOpen && (
        <div className="convo-details">
          <p>
            {scenario.emoji} <strong>{t(scenario.title)}</strong> — {t(scenario.goal)}
          </p>
          <p className="muted small">
            {prefs.handsFree
              ? t("Modo llamada: habla cuando quieras; al hacer una pausa se envía solo.")
              : t("Toca el micro para hablar; al hacer una pausa se envía solo.")}
          </p>
        </div>
      )}

      {demo && <div className="banner banner-warn">{t("Modo demo: respuestas de prueba, sin modelo real.")}</div>}
      {engineError && (
        <div className="banner banner-warn">
          {t(engineError.title)}. {t(engineError.detail)}{" "}
          <button className="link-btn" onClick={() => location.reload()}>
            {t("Recargar")}
          </button>
        </div>
      )}
      {loadingAudio && <div className="banner banner-soft">{loadingAudio}</div>}

      <div className="messages" ref={listRef} aria-live="polite">
        <div className="messages-spacer" />
        {!messages.length && (
          <p className="muted start-hint">
            {t("{name} ha descolgado y te escucha. Empieza tú: salúdale, pregúntale algo o cuéntale cualquier cosa.", {
              name: character.name.split(" ")[0],
            })}
          </p>
        )}
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
                  {m.role === "user" ? t("Tú") : name}
                  {m.rephrase && <em> · {t("más fácil")}</em>}
                </span>
                {hidden ? (
                  <span className="hidden-text">👂 Escucha y responde · toca para ver el texto</span>
                ) : (
                  <span lang={m.role === "assistant" ? langOf(character) : undefined}>
                    {m.text || (m.streaming ? <span className="dots" aria-label={t("Pensando")} /> : null)}
                  </span>
                )}
                {m.translation && <span className="translation">{m.translation}</span>}
                {m.role === "assistant" && !m.streaming && m.text && (
                  <span className="bubble-actions" onClick={(e) => e.stopPropagation()}>
                    <button
                      className="mini-btn"
                      onClick={() => {
                        stopListening();
                        void say(m.text).then(startListening);
                      }}
                      aria-label={t("Repetir en voz alta")}
                    >
                      <Icon name="volume" /> {t("Repetir")}
                    </button>
                    <button
                      className="mini-btn"
                      onClick={() => {
                        stopListening();
                        void say(m.text, "slow").then(startListening);
                      }}
                      aria-label={t("Repetir despacio")}
                    >
                      🐢 {t("Despacio")}
                    </button>
                    {!m.translation && (
                      <button className="mini-btn" onClick={() => void convo.translate(m.id)} disabled={m.translating}>
                        {m.translating ? t("Traduciendo…") : t("🌐 Traducir")}
                      </button>
                    )}
                    {isLast && (
                      <button className="mini-btn" onClick={() => void rephrase()} disabled={thinking}>
                        {t("🤔 No entiendo")}
                      </button>
                    )}
                  </span>
                )}
              </div>
              {m.role === "user" && (
                <CorrectionCard
                  lang={langOf(character)}
                  msg={m}
                  listenOnce={practiceListen}
                  onStopListening={() => practiceHandle.current?.finish()}
                  onSay={(t) => void say(t)}
                />
              )}
            </div>
          );
        })}
        {(phase === "hearing" || phase === "transcribing") && (
          <div className="row row-user">
            <div className="bubble bubble-user bubble-live">
              <span className="bubble-who">{t("Tú")}</span>
              {partial ||
                (phase === "hearing" ? (
                  <span className="live-voice" title={t("Cuando la barra se llena, se envía")}>
                    <span className="dots" aria-label={t("Escuchando")} />
                    <PauseBar progress={pauseProgress} />
                  </span>
                ) : (
                  <span className="dots" aria-label={t("Escuchando")} />
                ))}
            </div>
          </div>
        )}
        {suggestions && (
          <div className="suggestions">
            <div className="suggestions-head">
              <strong>{t("💡 Ideas para responder")}</strong>
              <button className="mini-btn" onClick={() => setSuggestions(null)} aria-label={t("Cerrar ideas")}>
                ✕
              </button>
            </div>
            {suggestions === "loading" ? (
              <p className="muted small">{t("Pensando respuestas posibles…")}</p>
            ) : suggestions.length === 0 ? (
              <p className="muted small">{t("No se me ocurren ideas ahora mismo. Prueba otra vez.")}</p>
            ) : (
              <>
                {suggestions.map((s, i) => (
                  <div key={i} className="suggestion">
                    <div>
                      <strong lang={langOf(character)}>{s.en}</strong>
                      {s.es && <small>{s.es}</small>}
                    </div>
                    <div className="suggestion-actions">
                      <button className="mini-btn" onClick={() => void say(s.en)} aria-label={t("Escuchar")}>
                        <Icon name="volume" />
                      </button>
                    </div>
                  </div>
                ))}
                <p className="muted small">{t("Dilas con tus palabras: te estoy escuchando.")}</p>
              </>
            )}
          </div>
        )}
      </div>

      <div className="composer-wrap">
        {micError && micError !== "no-speech" && <p className="mic-error">{t(MIC_ERROR_TEXT[micError])}</p>}
        {status ? (
          <button
            className="composer composer-live"
            onClick={() => {
              // Tocar la barra: pausar y escribir
              if (phase === "listening") {
                setPaused(true);
                pausedRef.current = true;
                stopListening();
                setPhase("idle");
                setTimeout(() => inputRef.current?.focus(), 50);
              }
            }}
            aria-label={status.text}
          >
            <span className={`rec-dot${status.tone === "rec" ? "" : " rec-dot-idle"}`}>
              <Icon name={status.tone === "speak" ? "volume" : "mic"} />
            </span>
            <Waveform
              level={status.tone === "rec" ? micLevel : status.tone === "speak" ? speakLevel : idleLevel}
              tone={status.tone === "rec" ? "rec" : "speak"}
            />
            <span className="composer-status">{status.text}</span>
          </button>
        ) : (
          <form className="composer" onSubmit={submitDraft}>
            <input
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={paused ? t("Escribe en {lang} o toca el micro…", { lang: t(infoOf(character).es) }) : infoOf(character).placeholder}
              lang={langOf(character)}
              autoComplete="off"
              autoCapitalize="sentences"
              spellCheck={false}
              enterKeyHint="send"
              aria-label={t("Escribe tu respuesta")}
            />
            <button className="send-btn" type="submit" disabled={thinking || !draft.trim()} aria-label={t("Enviar")}>
              <Icon name="send" />
            </button>
          </form>
        )}
      </div>

      <nav className="dock" aria-label={t("Controles de la llamada")}>
        <button
          className={`dock-btn${suggestions ? " on" : ""}`}
          onClick={() => void toggleSuggestions()}
          disabled={thinking && !suggestions}
          aria-label={t("Ideas para responder")}
          title={t("¿Qué digo?")}
        >
          <Icon name="bulb" />
        </button>
        <button className="dock-btn dock-end" onClick={() => void end()} disabled={ending} aria-label={t("Colgar")} title={t("Colgar")}>
          {ending ? <span className="spinner" /> : <Icon name="phone" />}
        </button>
        <button className="dock-btn" onClick={() => setSheet(true)} aria-label={t("Ajustes")} title={t("Ajustes")}>
          <Icon name="gear" />
        </button>
        <button
          className={`dock-btn talk-btn${phase === "listening" || phase === "hearing" ? " is-listening" : ""}${paused ? " is-muted" : ""}`}
          onClick={onMic}
          disabled={!voiceInputAvailable}
          aria-label={
            speaking ? t("Interrumpir y hablar") : phase === "hearing" ? t("Enviar ya") : phase === "listening" ? t("Silenciar micro") : t("Activar micro")
          }
          aria-pressed={!paused}
        >
          {phase === "transcribing" ? <span className="spinner" /> : <Icon name={paused ? "micOff" : "mic"} size={26} />}
        </button>
      </nav>
      <p className="dock-hint">
        {paused
          ? t("Micro en pausa · toca 🎤 para hablar")
          : phase === "hearing"
            ? t("Haz una pausa y se enviará solo")
            : t("Habla cuando quieras · se envía al hacer una pausa")}
      </p>

      {sheet && (
        <div className="sheet-backdrop" onClick={() => setSheet(false)}>
          <div className="sheet" role="dialog" aria-label={t("Ajustes de la conversación")} onClick={(e) => e.stopPropagation()}>
            <div className="sheet-handle" />
            <h2>{t("Ajustes de la conversación")}</h2>
            <Toggle
              label={t("Modo llamada")}
              hint={t("Escucha sola después de cada respuesta")}
              checked={prefs.handsFree}
              onChange={(v) => onPrefs({ handsFree: v })}
            />
            <PauseSlider value={pauseMs(prefs)} onChange={(ms) => onPrefs({ pause: ms })} />
            <Toggle label={t("Voz lenta")} hint={t("El personaje habla más despacio")} checked={prefs.rate === "slow"} onChange={(v) => onPrefs({ rate: v ? "slow" : "normal" })} />
            <Toggle label={t("Modo escucha")} hint={t("Oculta el texto: entrena el oído")} checked={!prefs.subtitles} onChange={(v) => onPrefs({ subtitles: !v })} />
            <Toggle
              label={t("Revisar lo que digo antes de enviarlo")}
              hint={t("La transcripción va al cuadro de texto")}
              checked={prefs.reviewTranscript}
              onChange={(v) => onPrefs({ reviewTranscript: v })}
            />
            {langOf(character) === "en" && (
            <label className="field">
              <span>{t("Voz de {name}", { name })}</span>
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
              <button className="btn-dark" onClick={() => void say(lastAssistant?.text ?? (langOf(character) === "fr" ? "Bonjour ! Voilà ma voix." : "Hello! This is how I sound."))}>
                {t("Probar voz")}
              </button>
              <button className="btn-ghost" onClick={() => setSheet(false)}>
                {t("Cerrar")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const speakLevel = () => 0.55;
const idleLevel = () => 0.06;

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

/** Cuánto silencio espera antes de enviar lo que has dicho (1–10 s). */
export function PauseSlider({ value, onChange }: { value: number; onChange: (ms: number) => void }) {
  const s = value / 1000;
  return (
    <label className="field pause-field">
      <span>
        {t("Espera antes de enviar:")} <strong>{s % 1 ? s.toFixed(1) : s} s</strong>
      </span>
      <input
        type="range"
        min={PAUSE_MIN}
        max={PAUSE_MAX}
        step={500}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={t("Segundos de silencio antes de enviar")}
      />
      <small className="muted">
        {s <= 2 ? t("Rápido: para frases cortas.") : s <= 5 ? t("Te da tiempo a pensar a mitad de frase.") : t("Mucho margen: piensa con calma, no se enviará hasta que calles del todo.")}
      </small>
    </label>
  );
}
