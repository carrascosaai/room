import { useEffect } from "react";

interface WakeLockSentinelLike {
  release(): Promise<void>;
}

/** Mantiene la pantalla encendida (p. ej. durante la descarga del modelo). */
export function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const wl = (navigator as Navigator & { wakeLock?: { request(t: "screen"): Promise<WakeLockSentinelLike> } }).wakeLock;
    if (!wl) return;
    let sentinel: WakeLockSentinelLike | null = null;
    let cancelled = false;
    const acquire = () =>
      wl
        .request("screen")
        .then((s) => {
          if (cancelled) void s.release();
          else sentinel = s;
        })
        .catch(() => undefined);
    void acquire();
    // Al volver a la pestaña el bloqueo se pierde: se pide otra vez.
    const onVis = () => document.visibilityState === "visible" && !cancelled && void acquire();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVis);
      void sentinel?.release().catch(() => undefined);
    };
  }, [active]);
}
