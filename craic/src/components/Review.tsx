import { useEffect, useMemo, useState } from "react";
import { deleteVocab, listVocab, updateVocab, type VocabItem } from "../lib/db";
import type { Prefs } from "../lib/prefs";
import { dueQueue, masteryLabel, review } from "../lib/srs";
import { PAUSE_MS } from "../lib/prefs";
import type { MicError } from "../speech/recognition";
import { speak, unlockTTS } from "../speech/tts";
import { listenOnce, type ListenHandle } from "../speech/voiceInput";
import { Icon } from "./Icon";
import { PracticeSpeech } from "./PracticeSpeech";

const DEFAULT_VOICE = "af_heart";

/** Repaso del vocabulario: ves el español, lo dices en inglés y te autoevalúas. */
export function Review({ prefs }: { prefs: Prefs }) {
  const [items, setItems] = useState<VocabItem[] | null>(null);
  const [queue, setQueue] = useState<VocabItem[]>([]);
  const [flipped, setFlipped] = useState(false);
  const [done, setDone] = useState(0);
  const [showList, setShowList] = useState(false);
  const [micError, setMicError] = useState<MicError | null>(null);
  const [handle, setHandle] = useState<ListenHandle | null>(null);

  const practice = async () => {
    setMicError(null);
    const { result, handle: h } = listenOnce({
      engine: prefs.asrEngine,
      lang: prefs.recognitionLang === "auto" ? "en-GB" : prefs.recognitionLang,
      silenceMs: PAUSE_MS[prefs.pause],
      onPhase: () => {},
      onError: setMicError,
    });
    setHandle(h);
    const text = await result;
    setHandle(null);
    return text;
  };

  const reload = async () => {
    const all = await listVocab().catch(() => []);
    setItems(all);
    return all;
  };

  useEffect(() => {
    void reload().then((all) => setQueue(dueQueue(all)));
  }, []);

  const card = queue[0];
  const say = (text: string) =>
    speak(text, {
      rate: prefs.rate,
      langs: ["en-GB", "en-IE", "en"],
      neuralVoice: DEFAULT_VOICE,
      engine: prefs.voiceEngine,
    });

  const answer = async (knew: boolean) => {
    if (!card) return;
    const next = { ...card, ...review(card, knew) };
    await updateVocab(next);
    setFlipped(false);
    setDone((d) => d + 1);
    setQueue((q) => {
      const rest = q.slice(1);
      // Las falladas vuelven al final de esta misma sesión
      return knew ? rest : [...rest, next];
    });
    void reload();
  };

  const stats = useMemo(() => {
    const all = items ?? [];
    return {
      total: all.length,
      learned: all.filter((i) => (i.box ?? 0) >= 4).length,
    };
  }, [items]);

  if (!items) return <p className="muted center">Cargando…</p>;

  return (
    <div className="review">
      <div className="stat-row">
        <div className="stat">
          <strong>{queue.length}</strong>
          <small>para hoy</small>
        </div>
        <div className="stat">
          <strong>{stats.total}</strong>
          <small>expresiones</small>
        </div>
        <div className="stat">
          <strong>{stats.learned}</strong>
          <small>dominadas</small>
        </div>
      </div>

      {!stats.total ? (
        <div className="card empty">
          <Icon name="cards" size={32} />
          <h2>Tu mazo está vacío</h2>
          <p className="muted">
            Al terminar cada conversación se guardan expresiones útiles. También puedes añadir correcciones con «+ A mi
            vocabulario».
          </p>
        </div>
      ) : card ? (
        <div className="card flashcard">
          <span className="corr-tag">{masteryLabel(card.box)}</span>
          <p className="muted small">¿Cómo se dice en inglés?</p>
          <p className="flash-es">{card.es}</p>
          {flipped ? (
            <>
              <p className="flash-en" lang="en">
                {card.en}
              </p>
              {card.example && (
                <p className="muted flash-ex" lang="en">
                  {card.example}
                </p>
              )}
              <PracticeSpeech
                target={card.en}
                listenOnce={practice}
                onStop={() => handle?.finish()}
                error={micError}
                onListen={() => void say(card.example || card.en)}
              />
              <div className="flash-actions">
                <button className="btn-ghost" onClick={() => void answer(false)}>
                  No lo sabía
                </button>
                <button className="btn-dark" onClick={() => void answer(true)}>
                  ¡Lo sabía!
                </button>
              </div>
            </>
          ) : (
            <button
              className="btn-dark flash-show"
              onClick={() => {
                unlockTTS();
                setFlipped(true);
                void say(card.en);
              }}
            >
              Dilo en voz alta y toca para comprobar
            </button>
          )}
        </div>
      ) : (
        <div className="card empty">
          <span className="big-emoji">🎉</span>
          <h2>{done ? "¡Repaso terminado!" : "Todo al día"}</h2>
          <p className="muted">Vuelve mañana: las expresiones reaparecen justo antes de que las olvides.</p>
        </div>
      )}

      {stats.total > 0 && (
        <section>
          <button className="section-toggle" onClick={() => setShowList((v) => !v)} aria-expanded={showList}>
            Todas las expresiones ({stats.total}) <Icon name="chevron" size={18} className={showList ? "rot" : ""} />
          </button>
          {showList && (
            <ul className="vocab-list">
              {items.map((x) => (
                <li key={x.id} className="card vocab-item">
                  <div>
                    <strong lang="en">{x.en}</strong>
                    <span>{x.es}</span>
                    <small className="muted">{masteryLabel(x.box)}</small>
                  </div>
                  <div className="vocab-actions">
                    <button className="icon-plain" aria-label={`Escuchar «${x.en}»`} onClick={() => void say(x.example || x.en)}>
                      <Icon name="volume" size={20} />
                    </button>
                    <button
                      className="icon-plain"
                      aria-label={`Borrar «${x.en}»`}
                      onClick={async () => {
                        await deleteVocab(x.id);
                        const all = await reload();
                        setQueue((q) => q.filter((i) => all.some((a) => a.id === i.id)));
                      }}
                    >
                      <Icon name="trash" size={20} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
