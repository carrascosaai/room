import { describe, expect, it } from "vitest";
import { MemoryStore } from "@/store/memory";
import { createGame } from "@/game/engine";

describe("MemoryStore", () => {
  it("creates, reads and mutates a room atomically", async () => {
    const store = new MemoryStore();
    const s = createGame("MEM1", { id: "h", nickname: "H", lang: "en" });
    await store.create(s);
    expect(await store.exists("MEM1")).toBe(true);

    const next = await store.update("MEM1", (g) => ({ ...g, version: g.version + 1 }));
    expect(next?.version).toBe(s.version + 1);
  });

  it("serializes concurrent mutations (no lost updates)", async () => {
    const store = new MemoryStore();
    await store.create(createGame("MEM2", { id: "h", nickname: "H", lang: "en" }));
    await Promise.all(
      Array.from({ length: 50 }, () =>
        store.update("MEM2", (g) => ({ ...g, version: g.version + 1 })),
      ),
    );
    const final = await store.get("MEM2");
    expect(final?.version).toBe(1 + 50);
  });

  it("returns null for unknown rooms", async () => {
    const store = new MemoryStore();
    expect(await store.get("NOPE")).toBeNull();
    expect(await store.update("NOPE", (g) => g)).toBeNull();
  });
});
