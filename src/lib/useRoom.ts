"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PlayerView } from "@/game/view";
import { getStoredPlayer } from "./player";

// ─────────────────────────────────────────────────────────────
// Client room connection. Server-authoritative: this hook only
// reads a projected view and posts intents. It polls (adaptive
// interval) and, when Supabase is configured, also subscribes to
// realtime row changes for instant updates.
// ─────────────────────────────────────────────────────────────

const FAST_MS = 1100;
const SLOW_MS = 2600;

type Status = "connecting" | "live" | "error" | "gone";

export interface UseRoom {
  view: PlayerView | null;
  status: Status;
  error: string | null;
  playerId: string | null;
  answer: (optionId: string, targetId?: string) => Promise<void>;
  start: () => Promise<void>;
  advance: () => Promise<void>;
  leave: () => Promise<void>;
  setServerLang: (lang: "es" | "en") => Promise<void>;
  refresh: () => Promise<void>;
}

async function post(path: string, body: unknown) {
  const res = await fetch(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  return res.json().catch(() => ({ ok: false, error: "generic" }));
}

export function useRoom(code: string): UseRoom {
  const [view, setView] = useState<PlayerView | null>(null);
  const [status, setStatus] = useState<Status>("connecting");
  const [error, setError] = useState<string | null>(null);
  const playerIdRef = useRef<string | null>(null);
  const viewRef = useRef<PlayerView | null>(null);
  const busyAdvance = useRef(false);
  const mounted = useRef(true);

  if (playerIdRef.current === null && typeof window !== "undefined") {
    playerIdRef.current = getStoredPlayer(code)?.id ?? null;
  }

  const refresh = useCallback(async () => {
    const pid = playerIdRef.current;
    try {
      const res = await fetch(
        `/api/rooms/${code}${pid ? `?pid=${encodeURIComponent(pid)}` : ""}`,
        { cache: "no-store" },
      );
      if (res.status === 404) {
        if (mounted.current) setStatus("gone");
        return;
      }
      const data = (await res.json()) as { ok: boolean; view?: PlayerView; error?: string };
      if (data.ok && data.view) {
        if (!mounted.current) return;
        viewRef.current = data.view;
        setView(data.view);
        setStatus("live");
        setError(null);
      } else if (data.error === "room_not_found") {
        if (mounted.current) setStatus("gone");
      }
    } catch {
      if (mounted.current) setStatus("error");
    }
  }, [code]);

  // adaptive polling
  useEffect(() => {
    mounted.current = true;
    let timer: ReturnType<typeof setTimeout>;
    const loop = async () => {
      await refresh();
      const v = viewRef.current;
      const fast =
        v?.phase === "ANSWERING" ||
        v?.phase === "LOBBY" ||
        v?.phase === "ROUND_INTRO" ||
        v?.phase?.startsWith("AI_");
      timer = setTimeout(loop, fast ? FAST_MS : SLOW_MS);
    };
    loop();
    return () => {
      mounted.current = false;
      clearTimeout(timer);
    };
  }, [refresh]);

  // Supabase realtime (optional, snappier)
  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) return;
    let channel: { unsubscribe: () => void } | null = null;
    let cancelled = false;
    (async () => {
      try {
        const { createClient } = await import("@supabase/supabase-js");
        const client = createClient(url, key, { auth: { persistSession: false } });
        if (cancelled) return;
        channel = client
          .channel(`room:${code}`)
          .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "rooms", filter: `code=eq.${code}` },
            () => {
              void refresh();
            },
          )
          .subscribe();
      } catch {
        /* realtime optional */
      }
    })();
    return () => {
      cancelled = true;
      channel?.unsubscribe();
    };
  }, [code, refresh]);

  // host / timer-driven auto-advance for display + answering phases
  useEffect(() => {
    if (!view) return;
    const isHost = view.me?.isHost ?? false;
    const deadline = view.phaseDeadline ?? 0;
    const now = Date.now();

    const displayPhases = ["ROUND_INTRO", "REVEAL", "ROUND_RESULT", "AI_OBSERVATION", "AI_THEORY", "AI_INTERVENTION"];
    const shouldNudge =
      (view.phase === "ANSWERING" && deadline && now >= deadline) ||
      (displayPhases.includes(view.phase) && deadline && now >= deadline && isHost);

    if (!shouldNudge || busyAdvance.current) return;
    busyAdvance.current = true;
    const pid = playerIdRef.current;
    (async () => {
      if (pid) await post(`/api/rooms/${code}/advance`, { playerId: pid });
      await refresh();
      busyAdvance.current = false;
    })();
  }, [view, code, refresh]);

  const answer = useCallback(
    async (optionId: string, targetId?: string) => {
      const pid = playerIdRef.current;
      if (!pid) return;
      const res = await post(`/api/rooms/${code}/answer`, { playerId: pid, optionId, targetId });
      if (res.ok && res.view) {
        viewRef.current = res.view;
        setView(res.view);
      } else if (res.error && res.error !== "already_answered") {
        setError(res.error);
      }
    },
    [code],
  );

  const start = useCallback(async () => {
    const pid = playerIdRef.current;
    if (!pid) return;
    const res = await post(`/api/rooms/${code}/start`, { playerId: pid });
    if (res.ok && res.view) {
      viewRef.current = res.view;
      setView(res.view);
    } else if (res.error) setError(res.error);
  }, [code]);

  const advance = useCallback(async () => {
    const pid = playerIdRef.current;
    if (!pid) return;
    const res = await post(`/api/rooms/${code}/advance`, { playerId: pid });
    if (res.ok && res.view) {
      viewRef.current = res.view;
      setView(res.view);
    }
  }, [code]);

  const leave = useCallback(async () => {
    const pid = playerIdRef.current;
    if (!pid) return;
    await post(`/api/rooms/${code}/leave`, { playerId: pid });
  }, [code]);

  const setServerLang = useCallback(
    async (lang: "es" | "en") => {
      const pid = playerIdRef.current;
      if (!pid) return;
      await post(`/api/rooms/${code}/lang`, { playerId: pid, lang });
    },
    [code],
  );

  return {
    view,
    status,
    error,
    playerId: playerIdRef.current,
    answer,
    start,
    advance,
    leave,
    setServerLang,
    refresh,
  };
}
