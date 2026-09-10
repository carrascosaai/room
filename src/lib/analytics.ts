import { getStore } from "@/store";

// ─────────────────────────────────────────────────────────────
// Lightweight, anonymous, disable-able analytics.
// Set NEXT_PUBLIC_ANALYTICS_ENABLED=0 to turn it off entirely.
// ─────────────────────────────────────────────────────────────

export type AnalyticsEvent =
  | "room_created"
  | "room_joined"
  | "game_started"
  | "round_completed"
  | "ai_observation"
  | "ai_intervention"
  | "theory_created"
  | "theory_success"
  | "theory_discarded"
  | "game_completed"
  | "share_clicked"
  | "play_again";

function enabled(): boolean {
  return process.env.NEXT_PUBLIC_ANALYTICS_ENABLED !== "0";
}

export async function track(
  name: AnalyticsEvent,
  code: string | null,
  props: Record<string, unknown> = {},
): Promise<void> {
  if (!enabled()) return;
  try {
    await getStore().logEvent({ code, name, props });
  } catch {
    /* analytics must never break gameplay */
  }
}

/** client-side beacon (no PII) */
export function trackClient(name: AnalyticsEvent, props: Record<string, unknown> = {}): void {
  if (typeof window === "undefined") return;
  if (process.env.NEXT_PUBLIC_ANALYTICS_ENABLED === "0") return;
  try {
    navigator.sendBeacon?.(
      "/api/analytics",
      new Blob([JSON.stringify({ name, props })], { type: "application/json" }),
    );
  } catch {
    /* ignore */
  }
}
