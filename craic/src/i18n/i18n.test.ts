import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { CHARACTERS, REGIONS } from "../characters";
import { LANGS } from "../lang";
import { CORRECTION_TYPES } from "../llm/parse";
import { MODEL_OPTIONS } from "../llm/models";
import { NET_TEXT } from "../lib/netcheck";
import { masteryLabel } from "../lib/srs";
import { scoreLabel } from "../lib/scoring";
import { SCENARIOS } from "../scenarios";
import { ASR_MODELS } from "../speech/audioModels";
import { MIC_ERROR_TEXT } from "../speech/recognition";
import { detectUiLang } from ".";
import { EN } from "./en";
import { FR } from "./fr";

const SRC = join(__dirname, "..");
function files(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) return files(p);
    return /\.tsx?$/.test(f) && !/\.test\./.test(f) && !p.includes("i18n") ? [p] : [];
  });
}

/** Todos los textos de la interfaz que pasan por t(). */
export function allKeys(): string[] {
  const keys = new Set<string>();
  for (const f of files(SRC)) {
    const src = readFileSync(f, "utf8");
    for (const m of src.matchAll(/\bt\(\s*"((?:[^"\\]|\\.)*)"/g)) keys.add(JSON.parse(`"${m[1]}"`));
  }
  // Textos que viven en datos y se traducen al mostrarlos
  const data: string[] = [
    ...CHARACTERS.flatMap((c) => [c.accent, c.tagline]),
    ...SCENARIOS.flatMap((s) => [s.title, s.goal]),
    ...Object.values(REGIONS).flatMap((r) => r.map((x) => x.label)),
    ...Object.values(MODEL_OPTIONS).flatMap((m) => [m.label, m.description]),
    ...Object.values(ASR_MODELS).flatMap((m) => [m.label, m.hint]),
    ...Object.values(MIC_ERROR_TEXT),
    ...Object.values(NET_TEXT),
    ...Object.values(LANGS).map((l) => l.es),
    ...CORRECTION_TYPES.filter((x) => x !== "español"),
    "otro",
    "palabra en tu idioma",
    ...[0, 1, 2, 3, 4, 5].map((b) => masteryLabel(b)),
    ...[100, 85, 70, 10].map((s) => scoreLabel(s)),
    ..."DLMXJVS".split(""),
    "Intermedio",
    "Interm. alto",
    "Avanzado",
    "Hablar",
    "Repasar",
    "Progreso",
    ...["Automática", "La más natural", "IA neuronal", "Kokoro", "Sistema", "Instantánea"],
  ];
  // Mensajes de error (src/llm/errors.ts): title/detail
  const err = readFileSync(join(SRC, "llm/errors.ts"), "utf8");
  for (const m of err.matchAll(/"((?:[^"\\\n]|\\.)*)"/g)) {
    const s = JSON.parse(`"${m[1]}"`);
    if (/[a-záéíóúñ]/.test(s) && / /.test(s) && !/[|\\]/.test(s)) data.push(s);
  }
  data.forEach((d) => keys.add(d));
  return [...keys].filter((k) => /[A-Za-zÀ-ÿ]/.test(k));
}

describe("traducciones", () => {
  const keys = allKeys();
  it("hay muchos textos", () => expect(keys.length).toBeGreaterThan(200));
  it("todos tienen inglés", () => expect(keys.filter((k) => !(k in EN))).toEqual([]));
  it("todos tienen francés", () => expect(keys.filter((k) => !(k in FR))).toEqual([]));
  it("las variables {x} se conservan", () => {
    for (const k of keys) {
      const vars = (k.match(/\{\w+\}/g) ?? []).sort().join();
      if (EN[k]) expect((EN[k].match(/\{\w+\}/g) ?? []).sort().join(), `EN: ${k}`).toBe(vars);
      if (FR[k]) expect((FR[k].match(/\{\w+\}/g) ?? []).sort().join(), `FR: ${k}`).toBe(vars);
    }
  });
  it("detecta el idioma del navegador", () => {
    expect(detectUiLang(["fr-CA", "en"])).toBe("fr");
    expect(detectUiLang(["es-MX"])).toBe("es");
    expect(detectUiLang(["de-DE", "en-US"])).toBe("en");
    expect(detectUiLang(["pt-BR"])).toBe("en");
  });
});
