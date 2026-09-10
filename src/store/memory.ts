import type { GameState } from "@/game/types";
import type { RoomStore } from "./types";

// ─────────────────────────────────────────────────────────────
// In-process store. Perfect for `next dev` on a local network
// (one Node process, everyone on the same Wi-Fi). NOT for
// serverless / multi-instance deploys — use Supabase there.
// ─────────────────────────────────────────────────────────────

interface Entry {
  state: GameState;
  chain: Promise<unknown>;
  touched: number;
}

const g = globalThis as unknown as { __roomStore?: Map<string, Entry> };
const rooms: Map<string, Entry> = g.__roomStore ?? new Map();
g.__roomStore = rooms;

const ROOM_TTL_MS = 1000 * 60 * 60 * 3; // 3h

function sweep() {
  const now = Date.now();
  for (const [code, e] of rooms) {
    if (now - e.touched > ROOM_TTL_MS) rooms.delete(code);
  }
}

export class MemoryStore implements RoomStore {
  readonly kind = "memory" as const;

  async create(state: GameState): Promise<void> {
    sweep();
    rooms.set(state.code, { state, chain: Promise.resolve(), touched: Date.now() });
  }

  async get(code: string): Promise<GameState | null> {
    return rooms.get(code)?.state ?? null;
  }

  async exists(code: string): Promise<boolean> {
    return rooms.has(code);
  }

  async update(
    code: string,
    mutator: (state: GameState) => GameState,
  ): Promise<GameState | null> {
    const entry = rooms.get(code);
    if (!entry) return null;
    const run = entry.chain.then(() => {
      const current = rooms.get(code);
      if (!current) return null;
      const next = mutator(current.state);
      current.state = next;
      current.touched = Date.now();
      return next;
    });
    entry.chain = run.catch(() => undefined);
    return run;
  }

  async logEvent(): Promise<void> {
    // no-op in memory mode
  }

  async archive(): Promise<void> {
    // no-op in memory mode
  }
}
