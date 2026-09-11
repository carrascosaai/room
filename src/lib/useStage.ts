"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PlayerView } from "@/game/view";

// ─────────────────────────────────────────────────────────────
// Read-only connection for the shared "stage" screen (a TV, a
// laptop, a phone held up). No player identity — it only ever
// shows what's safe for everyone in the room to see at once.
// Phones still drive every action; the stage just watches.
// ─────────────────────────────────────────────────────────────

const FAST_MS = 1000;
const SLOW_MS = 2500;

export interface UseStage {
  view: PlayerView | null;
  status: "connecting" | "live" | "error" | "gone";
}

export function useStage(code: string): UseStage {
  const [view, setView] = useState<PlayerView | null>(null);
  const [status, setStatus] = useState<UseStage["status"]>("connecting");
  const viewRef = useRef<PlayerView | null>(null);
  const mounted = useRef(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/rooms/${code}?stage=1`, { cache: "no-store" });
      if (res.status === 404) {
        if (mounted.current) setStatus("gone");
        return;
      }
      const data = (await res.json()) as { ok: boolean; view?: PlayerView };
      if (data.ok && data.view) {
        if (!mounted.current) return;
        viewRef.current = data.view;
        setView(data.view);
        setStatus("live");
      }
    } catch {
      if (mounted.current) setStatus("error");
    }
  }, [code]);

  useEffect(() => {
    mounted.current = true;
    let timer: ReturnType<typeof setTimeout>;
    const loop = async () => {
      await refresh();
      const v = viewRef.current;
      const fast = v?.phase !== "LOBBY" && v?.phase !== "FINAL_RESULTS";
      timer = setTimeout(loop, fast ? FAST_MS : SLOW_MS);
    };
    loop();
    return () => {
      mounted.current = false;
      clearTimeout(timer);
    };
  }, [refresh]);

  return { view, status };
}
