import "@fontsource/rubik/latin-900.css";

export function Wordmark({ small = false }: { small?: boolean }) {
  return (
    <span className={`wordmark${small ? " wordmark-sm" : ""}`} aria-label="Craic">
      CRAIC
    </span>
  );
}

/** Banderas dibujadas en SVG (los emojis de bandera no se ven en Windows). */
export function Flag({ code, size = 52 }: { code: "ie" | "gb" | "us"; size?: number }) {
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
          {code === "gb" && (
            <>
              <rect width="60" height="60" fill="#012169" />
              <path d="M0 0l60 60M60 0L0 60" stroke="#fff" strokeWidth="12" />
              <path d="M0 0l60 60M60 0L0 60" stroke="#c8102e" strokeWidth="4" />
              <path d="M30 0v60M0 30h60" stroke="#fff" strokeWidth="18" />
              <path d="M30 0v60M0 30h60" stroke="#c8102e" strokeWidth="10" />
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
