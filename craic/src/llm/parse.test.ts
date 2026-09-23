import { describe, expect, it } from "vitest";
import { cleanReply, FALLBACK_REPLY, hasCompleteQuestion, parseCorrections, parseJsonLoose } from "./parse";

describe("cleanReply", () => {
  it("keeps only the first question", () => {
    expect(cleanReply("That's great! I love Córdoba. Do you live here? What do you study?")).toBe(
      "That's great! I love Córdoba. Do you live here?",
    );
  });

  it("strips speaker prefix, emojis, asterisks and invented user turns", () => {
    expect(cleanReply("Liam: *laughs* Ah, grand 😄 What's your name?\nUser: I'm Ana", "Liam")).toBe(
      "Ah, grand What's your name?",
    );
  });

  it("drops a sentence cut by the token limit", () => {
    expect(cleanReply("I went to the Mezquita. It was amazing and the")).toBe("I went to the Mezquita.");
  });

  it("removes think blocks and wrapping quotes", () => {
    expect(cleanReply('<think>hmm</think> "Nice one! Where are you from?"')).toBe("Nice one! Where are you from?");
  });

  it("falls back on empty output", () => {
    expect(cleanReply("   ")).toBe(FALLBACK_REPLY);
    expect(cleanReply("🙂")).toBe(FALLBACK_REPLY);
  });

  it("detects a complete question while streaming", () => {
    expect(hasCompleteQuestion("Oh nice. Do you")).toBe(false);
    expect(hasCompleteQuestion("Oh nice. Do you like it?")).toBe(true);
  });
});

describe("parseJsonLoose", () => {
  it("parses JSON inside code fences and prose", () => {
    expect(parseJsonLoose('Sure! ```json\n{"a":1}\n``` hope it helps')).toEqual({ a: 1 });
  });
  it("repairs trailing commas and smart quotes", () => {
    expect(parseJsonLoose("{“a”: [1,2,],}")).toEqual({ a: [1, 2] });
  });
  it("closes truncated output", () => {
    expect(parseJsonLoose('{"errors":[{"original":"I go","corrected":"I went","explanation":"Pasa')).toEqual({
      errors: [{ original: "I go", corrected: "I went", explanation: "Pasa" }],
    });
  });
  it("returns null for garbage", () => {
    expect(parseJsonLoose("no json here")).toBeNull();
  });
});

describe("parseCorrections", () => {
  const user = "Yesterday I go to the cinema with my friends";

  it("reads valid corrections", () => {
    const r = parseCorrections(
      '{"errors":[{"original":"I go to the cinema","corrected":"I went to the cinema","explanation":"Pasado simple.","type":"tiempo verbal"}],"tip":""}',
      user,
    );
    expect(r.errors).toHaveLength(1);
    expect(r.errors[0].type).toBe("tiempo verbal");
  });

  it("discards no-op and invented corrections", () => {
    const r = parseCorrections(
      JSON.stringify({
        errors: [
          { original: "with my friends", corrected: "With my friends.", explanation: "", type: "gramática" },
          { original: "She don't like pizza", corrected: "She doesn't like pizza", explanation: "", type: "gramática" },
        ],
        tip: "Muy bien",
      }),
      user,
    );
    expect(r.errors).toHaveLength(0);
    expect(r.tip).toBe("Muy bien");
  });

  it("normalises unknown types", () => {
    const r = parseCorrections(
      '{"errors":[{"original":"I go","corrected":"I went","explanation":"x","type":"Verb Tense"}]}',
      user,
    );
    expect(r.errors[0].type).toBe("tiempo verbal");
  });

  it("never throws on broken output", () => {
    for (const raw of ["", "null", "[]", '{"errors":"nope"}', '{"errors":[null,1,"x"]}', "}{", "original: x"]) {
      expect(() => parseCorrections(raw, user)).not.toThrow();
    }
  });

  it("recovers pairs from non-JSON text", () => {
    const r = parseCorrections('original: "I go to the cinema" corrected: "I went to the cinema"', user);
    expect(r.errors[0]?.corrected).toBe("I went to the cinema");
  });
});

import { topicHint } from "./prompts";
describe("topicHint", () => {
  const t = (n: number) =>
    Array.from({ length: n }, (_, i) => [
      { role: "assistant" as const, text: `q${i}` },
      { role: "user" as const, text: `a${i}` },
    ]).flat();
  it("changes topic every three answers", () => {
    expect(topicHint(t(1), ["a", "b"])).toBe("");
    expect(topicHint(t(3), ["a", "b"])).toMatch(/new topic: [ab]/);
    expect(topicHint(t(3), undefined)).toBe("");
  });
});
