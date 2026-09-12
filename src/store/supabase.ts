import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { GameState } from "@/game/types";
import type { RoomStore } from "./types";

// ─────────────────────────────────────────────────────────────
// Supabase-backed store. The authoritative game state lives in a
// single `jsonb` column with an integer `version` for optimistic
// concurrency. Clients subscribe to row changes via Supabase
// Realtime (see src/lib/useRoom.ts).
// ─────────────────────────────────────────────────────────────

const MAX_RETRIES = 6;

export class SupabaseStore implements RoomStore {
  readonly kind = "supabase" as const;
  private client: SupabaseClient;

  constructor(url: string, serviceKey: string) {
    this.client = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  async create(state: GameState): Promise<void> {
    const { error } = await this.client.from("rooms").insert({
      code: state.code,
      version: state.version,
      state,
      phase: state.phase,
    });
    if (error) throw new Error(`create room failed: ${error.message}`);
  }

  async get(code: string): Promise<GameState | null> {
    const { data, error } = await this.client
      .from("rooms")
      .select("state")
      .eq("code", code)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return (data?.state as GameState) ?? null;
  }

  async exists(code: string): Promise<boolean> {
    const { count } = await this.client
      .from("rooms")
      .select("code", { count: "exact", head: true })
      .eq("code", code);
    return (count ?? 0) > 0;
  }

  async update(
    code: string,
    mutator: (state: GameState) => GameState,
  ): Promise<GameState | null> {
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const { data, error } = await this.client
        .from("rooms")
        .select("state, version")
        .eq("code", code)
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (!data) return null;

      const current = data.state as GameState;
      const expectedVersion = data.version as number;
      const next = mutator(current);
      if (next === current) return current;

      const { data: updated, error: upErr } = await this.client
        .from("rooms")
        .update({
          state: next,
          version: next.version,
          phase: next.phase,
          updated_at: new Date().toISOString(),
        })
        .eq("code", code)
        .eq("version", expectedVersion)
        .select("state")
        .maybeSingle();

      if (upErr) throw new Error(upErr.message);
      if (updated) return updated.state as GameState;
      // version moved under us — retry with fresh read
      await new Promise((r) => setTimeout(r, 25 + attempt * 40));
    }
    throw new Error("update: exhausted retries (contention)");
  }

  async logEvent(event: {
    code: string | null;
    name: string;
    props?: Record<string, unknown>;
  }): Promise<void> {
    await this.client.from("game_events").insert({
      room_code: event.code,
      name: event.name,
      props: event.props ?? {},
    });
  }

  async archive(state: GameState): Promise<void> {
    const confirmed = state.hypotheses.filter((h) => h.status === "confirmed").length;
    await this.client.from("game_archives").insert({
      room_code: state.code,
      player_count: state.players.length,
      rounds: state.rounds.length,
      ai_accuracy: state.hypotheses.length > 0 ? confirmed / state.hypotheses.length : null,
      theories: state.hypotheses,
      behavior: state.behavior,
      group_model: state.group,
      report: state.report ?? null,
      started_at: state.startedAt ? new Date(state.startedAt).toISOString() : null,
      ended_at: state.endedAt ? new Date(state.endedAt).toISOString() : null,
    });
  }
}
