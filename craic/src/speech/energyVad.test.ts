import { describe, expect, it } from "vitest";
import { EnergyVad } from "./energyVad";

const frame = (amp: number) => {
  const f = new Float32Array(512);
  for (let i = 0; i < f.length; i++) f[i] = amp * Math.sin(i / 3) + (Math.random() - 0.5) * 0.004;
  return f;
};

describe("EnergyVad", () => {
  it("detecta inicio y final de frase según la pausa", () => {
    const vad = new EnergyVad(1000);
    const ev: string[] = [];
    for (let i = 0; i < 40; i++) vad.push(frame(0.002));
    for (let i = 0; i < 30; i++) ev.push(vad.push(frame(0.1)) ?? "");
    expect(ev.filter(Boolean)).toEqual(["start"]);
    let n = 0;
    while (vad.push(frame(0.002)) !== "end") n++;
    expect(n * 32).toBeGreaterThanOrEqual(900);
    expect(n * 32).toBeLessThan(1100);
  });

  it("no corta en pausas cortas entre palabras", () => {
    const vad = new EnergyVad(2000);
    for (let i = 0; i < 20; i++) vad.push(frame(0.1));
    for (let i = 0; i < 30; i++) expect(vad.push(frame(0.002))).toBeNull(); // ~1 s
    for (let i = 0; i < 10; i++) vad.push(frame(0.1));
    expect(vad.speaking).toBe(true);
  });

  it("un chasquido suelto no es voz", () => {
    const vad = new EnergyVad(1000);
    for (let i = 0; i < 20; i++) vad.push(frame(0.002));
    expect(vad.push(frame(0.3))).toBeNull();
    expect(vad.push(frame(0.002))).toBeNull();
    expect(vad.speaking).toBe(false);
  });

  it("se adapta a una sala ruidosa", () => {
    const vad = new EnergyVad(1000);
    for (let i = 0; i < 200; i++) vad.push(frame(0.02));
    expect(vad.speaking).toBe(false);
    for (let i = 0; i < 5; i++) vad.push(frame(0.15));
    expect(vad.speaking).toBe(true);
  });
});
