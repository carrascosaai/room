import { useRef, useState } from "react";

interface Props {
  disabled: boolean;
  listening: boolean;
  onStart: () => void;
  onFinish: () => void;
}

/**
 * Botón grande de «mantener para hablar». Un toque corto también funciona:
 * empieza a escuchar y se para con el siguiente toque.
 */
export function TalkButton({ disabled, listening, onStart, onFinish }: Props) {
  const pressedAt = useRef(0);
  const [tapMode, setTapMode] = useState(false);

  const down = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (disabled) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    if (listening && tapMode) {
      setTapMode(false);
      onFinish();
      return;
    }
    pressedAt.current = Date.now();
    onStart();
  };

  const up = () => {
    if (!listening || tapMode) return;
    if (Date.now() - pressedAt.current < 350) {
      setTapMode(true);
      return;
    }
    onFinish();
  };

  const label = listening
    ? tapMode
      ? "Escuchando… toca para enviar"
      : "Escuchando… suelta para enviar"
    : "Mantén pulsado para hablar";

  return (
    <div className="talk">
      <button
        type="button"
        className={`talk-btn${listening ? " is-listening" : ""}`}
        disabled={disabled}
        aria-label={label}
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
            onFinish();
          }
        }}
      >
        <svg viewBox="0 0 24 24" width="38" height="38" aria-hidden="true">
          <path
            fill="currentColor"
            d="M12 15a3.5 3.5 0 0 0 3.5-3.5v-6a3.5 3.5 0 1 0-7 0v6A3.5 3.5 0 0 0 12 15Zm6-3.5a1 1 0 1 0-2 0 4 4 0 0 1-8 0 1 1 0 1 0-2 0 6 6 0 0 0 5 5.91V20H9a1 1 0 1 0 0 2h6a1 1 0 1 0 0-2h-2v-2.59a6 6 0 0 0 5-5.91Z"
          />
        </svg>
      </button>
      <span className="talk-label">{label}</span>
    </div>
  );
}
