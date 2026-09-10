import { describe, expect, it } from "vitest";
import { QUESTIONS, QUESTIONS_BY_ID, isPlayerTargetKind } from "@/game/questions";
import { DIMENSIONS } from "@/game/types";

const DIM_SET = new Set<string>(DIMENSIONS);

describe("question bank", () => {
  it("has at least 100 curated questions", () => {
    expect(QUESTIONS.length).toBeGreaterThanOrEqual(100);
  });

  it("has unique ids", () => {
    const ids = QUESTIONS.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every question has both language strings", () => {
    for (const q of QUESTIONS) {
      expect(q.prompt.en.length, q.id).toBeGreaterThan(0);
      expect(q.prompt.es.length, q.id).toBeGreaterThan(0);
      for (const o of q.options) {
        expect(o.label.en.length, `${q.id}/${o.id}`).toBeGreaterThan(0);
        expect(o.label.es.length, `${q.id}/${o.id}`).toBeGreaterThan(0);
      }
    }
  });

  it("only uses valid behavioral dimensions as tags, in [-1, 1]", () => {
    for (const q of QUESTIONS) {
      for (const o of q.options) {
        for (const [k, v] of Object.entries(o.tags)) {
          expect(DIM_SET.has(k), `${q.id}/${o.id}: ${k}`).toBe(true);
          expect(Math.abs(v as number), `${q.id}/${o.id}/${k}`).toBeLessThanOrEqual(1);
        }
      }
    }
  });

  it("player-target questions carry no fixed options; others carry >= 2", () => {
    for (const q of QUESTIONS) {
      const playerTarget = q.kinds.every(isPlayerTargetKind);
      if (playerTarget) {
        expect(q.options.length, q.id).toBe(0);
      } else if (!q.kinds.includes("group_vote") && !q.kinds.includes("trust")) {
        expect(q.options.length, q.id).toBeGreaterThanOrEqual(2);
      }
    }
  });

  it("covers all 15 categories", () => {
    const cats = new Set(QUESTIONS.map((q) => q.category));
    expect(cats.size).toBeGreaterThanOrEqual(15);
  });

  it("keeps spicy content bounded (socialSensitivity 3 is rare)", () => {
    const spicy = QUESTIONS.filter((q) => q.socialSensitivity === 3);
    expect(spicy.length / QUESTIONS.length).toBeLessThan(0.1);
  });

  it("index is consistent", () => {
    expect(Object.keys(QUESTIONS_BY_ID).length).toBe(QUESTIONS.length);
  });
});
