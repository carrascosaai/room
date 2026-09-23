import { useEffect, useRef } from "react";

const BARS = 11;

/** Barras verticales que bailan con el nivel del micrófono (como en ISSEN). */
export function Waveform({ level, tone = "rec" }: { level: () => number; tone?: "rec" | "speak" }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    let raf = 0;
    let t = 0;
    let smooth = 0;
    const tick = () => {
      t += 1;
      smooth = smooth * 0.75 + Math.min(1, level()) * 0.25;
      const bars = ref.current?.children;
      if (bars) {
        for (let i = 0; i < bars.length; i++) {
          const wobble = 0.55 + 0.45 * Math.sin(t / 5 + i * 1.3);
          const h = 0.3 + Math.min(1, smooth * 2) * wobble * 0.7;
          (bars[i] as HTMLElement).style.transform = `scaleY(${h.toFixed(3)})`;
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [level]);
  return (
    <span className={`wave wave-${tone}`} ref={ref} aria-hidden="true">
      {Array.from({ length: BARS }, (_, i) => (
        <i key={i} />
      ))}
    </span>
  );
}
