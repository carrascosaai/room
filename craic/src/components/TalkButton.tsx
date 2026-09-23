import { useEffect, useRef, useState } from "react";
import type { VoicePhase } from "../speech/voiceInput";
import { Icon } from "./Icon";

interface Props {
  disabled: boolean;
  phase: VoicePhase;
  /** Nivel de micrófono 0..1 para animar el anillo */
  level: () => number;
  onStart: () => void;
  onFinish: () => void;
}

const vibrate = (ms: number) => {
  try {
    navigator.vibrate?.(ms);
  } catch {
    /* sin vibración */
  }
};

/**
 * Botón grande de «mantener para hablar». Un toque corto también funciona:
 * empieza a escuchar y se para con el siguiente toque.
 */
export function TalkButton({ disabled, phase, level, onStart, onFinish }: Props) {
  const pressedAt = useRef(0);
  const [tapMode, setTapMode] = useState(false);
  const ringRef = useRef<HTMLSpanElement>(null);
  const listening = phase === "listening";

  // Anillo que crece con tu voz: así ves que te está oyendo.
  useEffect(() => {
    if (!listening) return;
    let raf = 0;
    let smooth = 0;
    const tick = () => {
      smooth = smooth * 0.7 + level() * 0.3;
      if (ringRef.current) ringRef.current.style.transform = `scale(${1 + Math.min(smooth, 1) * 0.55})`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [listening, level]);

  useEffect(() => {
    if (!listening) setTapMode(false);
  }, [listening]);

  const finish = () => {
    vibrate(10);
    setTapMode(false);
    onFinish();
  };

  const down = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (disabled || phase === "transcribing") return;
    e.preventDefault();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    if (listening && tapMode) {
      finish();
      return;
    }
    pressedAt.current = Date.now();
    vibrate(15);
    onStart();
  };

  const up = () => {
    if (!listening || tapMode) return;
    if (Date.now() - pressedAt.current < 350) {
      setTapMode(true);
      return;
    }
    finish();
  };

  const label =
    phase === "transcribing"
      ? "Transcribiendo…"
      : listening
        ? tapMode
          ? "Escuchando… toca para enviar"
          : "Escuchando… suelta para enviar"
        : "Mantén pulsado para hablar";

  return (
    <div className="talk-wrap">
      {listening && <span className="talk-ring" ref={ringRef} aria-hidden="true" />}
      <button
        type="button"
        className={`dock-btn talk-btn${listening ? " is-listening" : ""}${phase === "transcribing" ? " is-busy" : ""}`}
        disabled={disabled}
        aria-label={label}
        title={label}
        aria-pressed={listening}
        onPointerDown={down}
        onPointerUp={up}
        onPointerCancel={up}
        onContextMenu={(e) => e.preventDefault()}
        onKeyDown={(e) => {
          if ((e.key === " " || e.key === "Enter") && !e.repeat && !listening) {
            e.preventDefault();
            pressedAt.current = 0;
            onStart();
          }
        }}
        onKeyUp={(e) => {
          if ((e.key === " " || e.key === "Enter") && listening) {
            e.preventDefault();
            finish();
          }
        }}
      >
        {phase === "transcribing" ? <span className="spinner" aria-hidden="true" /> : <Icon name="mic" size={26} />}
      </button>
    </div>
  );
}
