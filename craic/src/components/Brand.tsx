import "@fontsource/rubik/latin-900.css";
import type { FlagCode } from "../characters";

export function Wordmark({ small = false }: { small?: boolean }) {
  return (
    <span className={`wordmark${small ? " wordmark-sm" : ""}`} aria-label="Craic">
      CRAIC
    </span>
  );
}

/** Banderas dibujadas en SVG (los emojis de bandera no se ven en Windows). */
/** Union Jack en un cuadrado de 60×60 (se reutiliza a escala en Australia y NZ). */
function UnionJack() {
  return (
    <>
      <rect width="60" height="60" fill="#012169" />
      <path d="M0 0l60 60M60 0L0 60" stroke="#fff" strokeWidth="12" />
      <path d="M0 0l60 60M60 0L0 60" stroke="#c8102e" strokeWidth="4" />
      <path d="M30 0v60M0 30h60" stroke="#fff" strokeWidth="18" />
      <path d="M30 0v60M0 30h60" stroke="#c8102e" strokeWidth="10" />
    </>
  );
}

function Star({ x, y, r, fill, stroke }: { x: number; y: number; r: number; fill: string; stroke?: string }) {
  const pts = Array.from({ length: 10 }, (_, i) => {
    const a = (Math.PI / 5) * i - Math.PI / 2;
    const rr = i % 2 ? r * 0.45 : r;
    return `${(x + rr * Math.cos(a)).toFixed(2)},${(y + rr * Math.sin(a)).toFixed(2)}`;
  }).join(" ");
  return <polygon points={pts} fill={fill} stroke={stroke} strokeWidth={stroke ? 1 : 0} />;
}

export function Flag({ code, size = 52 }: { code: FlagCode; size?: number }) {
  return (
    <span className="flag" style={{ width: size, height: size }} aria-hidden="true">
      <svg viewBox="0 0 60 60" width={size} height={size}>
        <defs>
          <clipPath id={`c-${code}`}>
            <circle cx="30" cy="30" r="30" />
          </clipPath>
        </defs>
        <g clipPath={`url(#c-${code})`}>
          {code === "ie" && (
            <>
              <rect width="20" height="60" fill="#169b62" />
              <rect x="20" width="20" height="60" fill="#fff" />
              <rect x="40" width="20" height="60" fill="#ff883e" />
            </>
          )}
          {code === "gb" && <UnionJack />}
          {code === "eng" && (
            <>
              <rect width="60" height="60" fill="#fff" />
              <path d="M30 0v60M0 30h60" stroke="#ce1124" strokeWidth="12" />
            </>
          )}
          {code === "sco" && (
            <>
              <rect width="60" height="60" fill="#005eb8" />
              <path d="M0 0l60 60M60 0L0 60" stroke="#fff" strokeWidth="10" />
            </>
          )}
          {code === "wal" && (
            <>
              <rect width="60" height="30" fill="#fff" />
              <rect y="30" width="60" height="30" fill="#00b140" />
              <path
                d="M14 38c4-6 10-8 16-7l6-7 3 4 6-3-2 6 5 2-6 3c1 5-2 9-7 10l3 6-6-2-4 5-2-6c-5 0-9-3-12-7z"
                fill="#d30731"
              />
            </>
          )}
          {(code === "au" || code === "nz") && (
            <>
              <rect width="60" height="60" fill="#012169" />
              <g transform="scale(0.5)">
                <UnionJack />
              </g>
              {code === "au" ? (
                <>
                  <Star x={15} y={46} r={6} fill="#fff" />
                  <Star x={45} y={14} r={3} fill="#fff" />
                  <Star x={38} y={28} r={3} fill="#fff" />
                  <Star x={52} y={26} r={3} fill="#fff" />
                  <Star x={45} y={48} r={3.5} fill="#fff" />
                </>
              ) : (
                <>
                  <Star x={45} y={14} r={3.5} fill="#c8102e" stroke="#fff" />
                  <Star x={37} y={29} r={3.5} fill="#c8102e" stroke="#fff" />
                  <Star x={52} y={27} r={3} fill="#c8102e" stroke="#fff" />
                  <Star x={45} y={47} r={4} fill="#c8102e" stroke="#fff" />
                </>
              )}
            </>
          )}
          {code === "fr" && (
            <>
              <rect width="20" height="60" fill="#0055a4" />
              <rect x="20" width="20" height="60" fill="#fff" />
              <rect x="40" width="20" height="60" fill="#ef4135" />
            </>
          )}
          {code === "be" && (
            <>
              <rect width="20" height="60" fill="#1a1a1a" />
              <rect x="20" width="20" height="60" fill="#fdda24" />
              <rect x="40" width="20" height="60" fill="#ef3340" />
            </>
          )}
          {code === "ch" && (
            <>
              <rect width="60" height="60" fill="#da291c" />
              <path d="M30 16v28M16 30h28" stroke="#fff" strokeWidth="9" />
            </>
          )}
          {code === "qc" && (
            <>
              <rect width="60" height="60" fill="#003da5" />
              <path d="M30 0v60M0 30h60" stroke="#fff" strokeWidth="8" />
              {[
                [15, 15],
                [45, 15],
                [15, 45],
                [45, 45],
              ].map(([x, y]) => (
                <path key={`${x}${y}`} d={`M${x} ${y - 6}c3 3 3 6 0 9c-3-3-3-6 0-9zM${x - 5} ${y + 1}h10`} stroke="#fff" strokeWidth="2" fill="#fff" />
              ))}
            </>
          )}
          {code === "sn" && (
            <>
              <rect width="20" height="60" fill="#00853f" />
              <rect x="20" width="20" height="60" fill="#fdef42" />
              <rect x="40" width="20" height="60" fill="#e31b23" />
              <Star x={30} y={31} r={7} fill="#00853f" />
            </>
          )}
          {code === "ca" && (
            <>
              <rect width="60" height="60" fill="#fff" />
              <rect width="15" height="60" fill="#d52b1e" />
              <rect x="45" width="15" height="60" fill="#d52b1e" />
              <path
                d="M30 14l3 6 4-2-1 9 5-5 1 3 5-1-2 6 2 1-9 7 1 3-8-1v8h-2v-8l-8 1 1-3-9-7 2-1-2-6 5 1 1-3 5 5-1-9 4 2z"
                fill="#d52b1e"
              />
            </>
          )}
          {code === "us" && (
            <>
              <rect width="60" height="60" fill="#fff" />
              {[0, 2, 4, 6, 8, 10, 12].map((i) => (
                <rect key={i} y={i * 4.62} width="60" height="4.62" fill="#b22234" />
              ))}
              <rect width="30" height="32.3" fill="#3c3b6e" />
              {[6, 14, 22].map((y) => [6, 13, 20].map((x) => <circle key={`${x}-${y}`} cx={x + 1} cy={y} r="1.6" fill="#fff" />))}
            </>
          )}
        </g>
      </svg>
    </span>
  );
}
