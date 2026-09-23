import { describe, expect, it } from "vitest";
import { PriorityScheduler } from "./scheduler";

const tick = () => new Promise((r) => setTimeout(r, 0));

describe("PriorityScheduler", () => {
  it("runs jobs one at a time, highest priority first", async () => {
    const order: string[] = [];
    const s = new PriorityScheduler(() => {});
    let release!: () => void;
    const first = s.submit(() => new Promise<string>((r) => (release = () => r("a"))).then((v) => (order.push(v), v)), "normal");
    const low = s.submit(async () => (order.push("low"), "low"), "low");
    const high = s.submit(async () => (order.push("high"), "high"), "high");
    await tick();
    release();
    await Promise.all([first, low, high]);
    expect(order).toEqual(["a", "high", "low"]);
  });

  it("interrupts a low-priority job for a high one and retries it later", async () => {
    let interrupted = 0;
    let finishLow: (() => void) | null = null;
    const s = new PriorityScheduler(() => {
      interrupted++;
      finishLow?.();
    });
    let lowRuns = 0;
    const low = s.submit(() => {
      lowRuns++;
      return new Promise<string>((r) => {
        finishLow = () => r("partial");
        if (lowRuns > 1) r("full correction");
      });
    }, "low");
    await tick();
    const high = await s.submit(async () => "reply", "high");
    expect(high).toBe("reply");
    expect(interrupted).toBe(1);
    expect(await low).toBe("full correction");
    expect(lowRuns).toBe(2);
  });
});
