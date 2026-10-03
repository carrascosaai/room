import { describe, expect, it } from "vitest";
import { formatTime, nightKey, openIntervals, wallToDate, windowFor } from "@/lib/time";

describe("hora de Madrid", () => {
  it("convierte hora de pared a instante absoluto (verano y invierno)", () => {
    expect(wallToDate({ year: 2026, month: 7, day: 10 }, "23:30").toISOString()).toBe("2026-07-10T21:30:00.000Z");
    expect(wallToDate({ year: 2026, month: 1, day: 10 }, "23:30").toISOString()).toBe("2026-01-10T22:30:00.000Z");
  });
  it("la noche no termina hasta las 07:00", () => {
    expect(nightKey(new Date("2026-10-03T23:00:00Z"))).toBe("2026-10-03"); // 01:00 del domingo
    expect(nightKey(new Date("2026-10-04T06:30:00Z"))).toBe("2026-10-04"); // 08:30
  });
  it("los horarios de madrugada pertenecen al día siguiente", () => {
    const sat = new Date("2026-10-03T20:00:00Z"); // sábado 22:00
    const [iv] = openIntervals({ 6: ["00:30", "07:00"] }, sat, new Date(sat.getTime() + 12 * 3600_000));
    expect(formatTime(iv!.from)).toBe("00:30");
    expect(iv!.from.toISOString()).toBe("2026-10-03T22:30:00.000Z");
    expect(iv!.to.toISOString()).toBe("2026-10-04T05:00:00.000Z");
  });
  it("finde: entre semana empieza el viernes por la tarde", () => {
    const tue = new Date("2026-10-06T10:00:00Z");
    const w = windowFor("finde", tue);
    expect(w.from.toISOString()).toBe("2026-10-09T16:00:00.000Z");
    expect(w.to.toISOString()).toBe("2026-10-12T05:00:00.000Z");
  });
});
