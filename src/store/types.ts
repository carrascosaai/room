import type { GameState } from "@/game/types";

export interface RoomStore {
  readonly kind: "memory" | "supabase";
  create(state: GameState): Promise<void>;
  get(code: string): Promise<GameState | null>;
  /**
   * Serialized read-modify-write. `mutator` must be pure and return the
   * next state (or the same reference to signal "no change"). The store
   * guarantees no two mutators for the same room run concurrently.
   */
  update(
    code: string,
    mutator: (state: GameState) => GameState,
  ): Promise<GameState | null>;
  exists(code: string): Promise<boolean>;
  logEvent(event: {
    code: string | null;
    name: string;
    props?: Record<string, unknown>;
  }): Promise<void>;
  /** persist a finished game for offline analysis; no-op in memory mode */
  archive(state: GameState): Promise<void>;
}
