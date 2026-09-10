import { describe, expect, it } from "vitest";
import en from "@/i18n/en.json";
import es from "@/i18n/es.json";

function paths(obj: unknown, prefix = ""): string[] {
  if (typeof obj !== "object" || obj === null) return [prefix];
  return Object.entries(obj as Record<string, unknown>).flatMap(([k, v]) =>
    paths(v, prefix ? `${prefix}.${k}` : k),
  );
}

describe("i18n", () => {
  it("en and es have exactly the same keys", () => {
    const a = paths(en).sort();
    const b = paths(es).sort();
    expect(b).toEqual(a);
  });

  it("no value is an empty string", () => {
    for (const [lang, dict] of [
      ["en", en],
      ["es", es],
    ] as const) {
      const walk = (o: Record<string, unknown>) => {
        for (const [k, v] of Object.entries(o)) {
          if (typeof v === "string") expect(v.trim(), `${lang}.${k}`).not.toBe("");
          else if (v && typeof v === "object") walk(v as Record<string, unknown>);
        }
      };
      walk(dict as Record<string, unknown>);
    }
  });

  it("keeps interpolation placeholders consistent across languages", () => {
    const grab = (s: string) => (s.match(/\{(\w+)\}/g) ?? []).sort();
    const walk = (a: Record<string, unknown>, b: Record<string, unknown>, p = "") => {
      for (const [k, v] of Object.entries(a)) {
        const bv = b[k];
        if (typeof v === "string" && typeof bv === "string") {
          expect(grab(bv), `${p}${k}`).toEqual(grab(v));
        } else if (v && typeof v === "object") {
          walk(v as Record<string, unknown>, bv as Record<string, unknown>, `${p}${k}.`);
        }
      }
    };
    walk(en as Record<string, unknown>, es as Record<string, unknown>);
  });
});
