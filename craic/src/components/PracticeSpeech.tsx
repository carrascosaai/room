import { t } from "../i18n";
import { useState } from "react";
import { scoreLabel, scoreSpeech, type SpeechScore } from "../lib/scoring";
import { MIC_ERROR_TEXT, type MicError } from "../speech/recognition";
import { unlockTTS } from "../speech/tts";

interface Props {
  target: string;
  /** Escucha una frase (se para sola cuando dejas de hablar) y devuelve el texto. */
  listenOnce: () => Promise<string>;
  onListen: () => void;
  /** Detiene la escucha en curso (tocar otra vez). */
  onStop?: () => void;
  error?: MicError | null;
}

/** «Dilo tú»: repite la frase y comprueba palabra a palabra qué se entendió. */
export function PracticeSpeech({ target, listenOnce, onListen, onStop, error }: Props) {
  const [state, setState] = useState<"idle" | "listening">("idle");
  const [result, setResult] = useState<(SpeechScore & { heard: string }) | null>(null);

  const go = async () => {
    unlockTTS();
    if (state === "listening") {
      onStop?.();
      return;
    }
    setResult(null);
    setState("listening");
    const heard = await listenOnce();
    setState("idle");
    if (heard) setResult({ ...scoreSpeech(target, heard), heard });
  };

  return (
    <div className="practice">
      <div className="practice-row">
        <button type="button" className="chip" onClick={onListen}>
          {t("🔊 Escuchar")}
        </button>
        <button type="button" className={`chip${state === "listening" ? " chip-rec" : ""}`} onClick={() => void go()}>
          {state === "listening" ? t("● Te escucho… (para al terminar)") : t("🎤 Dilo tú")}
        </button>
      </div>
      {error && state === "idle" && !result && <p className="practice-err">{t(MIC_ERROR_TEXT[error])}</p>}
      {result && (
        <div className="practice-result" aria-live="polite">
          <p>
            <strong>{result.score}%</strong> · {t(scoreLabel(result.score))}
          </p>
          <p className="practice-words" lang="en">
            {result.words.map((w, i) => (
              <span key={i} className={w.ok ? "w-ok" : "w-miss"}>
                {w.word}{" "}
              </span>
            ))}
          </p>
          <p className="muted small">
            {t("Se entendió:")} <em>«{result.heard}»</em>
          </p>
        </div>
      )}
    </div>
  );
}
