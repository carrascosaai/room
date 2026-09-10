"use client";

import { useEffect, useState } from "react";

export function Timer({ deadline, total }: { deadline?: number; total: number }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, []);
  if (!deadline || total <= 0) return null;
  const remaining = Math.max(0, deadline - now);
  const secs = Math.ceil(remaining / 1000);
  const frac = Math.max(0, Math.min(1, remaining / (total * 1000)));
  const size = 44;
  const stroke = 3;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const danger = secs <= 5;

  return (
    <div className="relative" style={{ width: size, height: size }} aria-label={`${secs}s`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={danger ? "var(--danger)" : "var(--accent)"}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - frac)}
          style={{ transition: "stroke-dashoffset 0.25s linear" }}
        />
      </svg>
      <span
        className={`tabnums absolute inset-0 flex items-center justify-center text-xs font-semibold ${
          danger ? "text-[var(--danger)]" : "text-[var(--text)]"
        }`}
      >
        {secs}
      </span>
    </div>
  );
}
