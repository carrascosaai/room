"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PlayerView } from "@/game/view";
import { getStoredPlayer } from "./player";

// ─────────────────────────────────────────────────────────────
// Client room connection. Server-authoritative: this hook only
// reads a projected view and posts intents. It polls (adaptive
// interval) and, when Supabase is configured, also subscribes to
// realtime row changes for instant updates.
//
// Polling is a SAFETY NET, not the primary update path, whenever
// realtime is actually connected — this is what lets many rooms run
// concurrently without turning every phone into a request-per-second
// hammer on the server. Every request here fans out across however
// many rooms are live at once, so this interval is a scale lever, not
// just a UX one.
// ─────────────────────────────────────────────────────────────

const FAST_MS = 1100;
const SLOW_MS = 2600;
/** poll interval once realtime has confirmed it's connected — realtime
 *  pushes the real updates instantly; this just guards against a missed
 *  message or a silently dead channel. */
const REALTIME_BACKOFF_MS = 12_000;

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
  const realtimeLive = useRef(false);

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

  // adaptive polling — backs way off once realtime confirms it's live
  useEffect(() => {
    mounted.current = true;
    let timer: ReturnType<typeof setTimeout>;
    const loop = async () => {
      await refresh();
      if (realtimeLive.current) {
        timer = setTimeout(loop, REALTIME_BACKOFF_MS);
        return;
      }
      const v = viewRef.current;
      const fast =
        v?.phase === "ANSWERING" ||
        v?.phase === "LOBBY" ||
        v?.phase === "ROUND_INTRO" ||
        v?.phase === "DISCUSSION" ||
        v?.phase?.startsWith("AI_");
      timer = setTimeout(loop, fast ? FAST_MS : SLOW_MS);
    };
    loop();
    return () => {
      mounted.current = false;
      clearTimeout(timer);
    };
  }, [refresh]);

  // Supabase realtime (the primary update path when available — polling
  // above only kicks back into full speed if this drops)
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
          .subscribe((subStatus) => {
            realtimeLive.current = subStatus === "SUBSCRIBED";
          });
      } catch {
        /* realtime optional — polling above stays at full speed */
      }
    })();
    return () => {
      cancelled = true;
      realtimeLive.current = false;
      channel?.unsubscribe();
    };
  }, [code, refresh]);

  // host / timer-driven auto-advance for display + answering phases.
  // Runs on its own local 1s clock (no network cost) so it keeps noticing
  // a deadline has passed even while the network poll itself has backed
  // off to REALTIME_BACKOFF_MS — "time is up" is a client-side fact, it
  // doesn't need a round trip to detect.
  useEffect(() => {
    const displayPhases = [
      "ROUND_INTRO",
      "DISCUSSION",
      "REVEAL",
      "ROUND_RESULT",
      "AI_OBSERVATION",
      "AI_THEORY",
      "AI_INTERVENTION",
    ];
    const tick = () => {
      const v = viewRef.current;
      if (!v) return;
      const isHost = v.me?.isHost ?? false;
      const deadline = v.phaseDeadline ?? 0;
      const now = Date.now();
      const shouldNudge =
        (v.phase === "ANSWERING" && deadline && now >= deadline) ||
        (displayPhases.includes(v.phase) && deadline && now >= deadline && isHost);
      if (!shouldNudge || busyAdvance.current) return;
      busyAdvance.current = true;
      const pid = playerIdRef.current;
      (async () => {
        if (pid) await post(`/api/rooms/${code}/advance`, { playerId: pid });
        await refresh();
        busyAdvance.current = false;
      })();
    };
    const interval = setInterval(tick, 1000);
    tick();
    return () => clearInterval(interval);
  }, [code, refresh]);

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
