import { useState } from "react";
import { scoreLabel, scoreSpeech, type SpeechScore } from "../lib/scoring";
import { MIC_ERROR_TEXT } from "../speech/recognition";
import { unlockTTS } from "../speech/tts";
import { useVoiceInput, type AsrEngine } from "../speech/voiceInput";

interface Props {
  target: string;
  engine: AsrEngine;
  lang: string;
  onListen: () => void;
}

/** «Dilo tú»: repite la frase y comprueba palabra a palabra qué se entendió. */
export function PracticeSpeech({ target, engine, lang, onListen }: Props) {
  const mic = useVoiceInput(engine, lang);
  const [result, setResult] = useState<(SpeechScore & { heard: string }) | null>(null);

  const toggle = async () => {
    unlockTTS();
    if (mic.phase === "listening") {
      const heard = await mic.stop();
      if (heard) setResult({ ...scoreSpeech(target, heard), heard });
      return;
    }
    if (mic.phase === "idle") {
      setResult(null);
      await mic.start();
    }
  };

  return (
    <div className="practice">
      <div className="practice-row">
        <button type="button" className="chip" onClick={onListen}>
          🔊 Escuchar
        </button>
        <button
          type="button"
          className={`chip${mic.phase === "listening" ? " chip-rec" : ""}`}
          onClick={() => void toggle()}
          disabled={mic.phase === "transcribing" || !mic.available}
        >
          {mic.phase === "listening" ? "⏹ Parar" : mic.phase === "transcribing" ? "Escuchándote…" : "🎤 Dilo tú"}
        </button>
      </div>
      {mic.error && <p className="practice-err">{MIC_ERROR_TEXT[mic.error]}</p>}
      {result && (
        <div className="practice-result" aria-live="polite">
          <p>
            <strong>{result.score}%</strong> · {scoreLabel(result.score)}
          </p>
          <p className="practice-words" lang="en">
            {result.words.map((w, i) => (
              <span key={i} className={w.ok ? "w-ok" : "w-miss"}>
                {w.word}{" "}
              </span>
            ))}
          </p>
          <p className="muted small">
            Se entendió: <em lang="en">«{result.heard}»</em>
          </p>
        </div>
      )}
    </div>
  );
}
