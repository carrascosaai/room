import { describe, expect, it } from "vitest";
import { applyCorrections, cleanTranslation, parseSuggestions, questionOf, similarQuestion } from "../llm/parse";
import { cleanTranscript, hasSpeech, normalize } from "../speech/asrText";
import { resampleTo16k } from "../speech/mic";
import { splitForSpeech } from "../speech/tts";
import { computeProgress } from "./progress";
import { scoreSpeech, tokenize } from "./scoring";
import { dueQueue, isDue, review } from "./srs";

describe("scoring", () => {
  it("expands contractions and numbers", () => {
    expect(tokenize("I'm 3, don't worry!")).toEqual(["i", "am", "three", "do", "not", "worry"]);
  });
  it("scores a perfect repetition as 100", () => {
    expect(scoreSpeech("I went to the beach.", "i went to the beach").score).toBe(100);
  });
  it("marks missing words", () => {
    const r = scoreSpeech("I went to the beach yesterday", "I went beach yesterday");
    expect(r.words.filter((w) => !w.ok).map((w) => w.word)).toEqual(["to", "the"]);
    expect(r.score).toBeLessThan(100);
    expect(r.score).toBeGreaterThan(50);
  });
  it("treats contractions as equal", () => {
    expect(scoreSpeech("I am going to Madrid", "I'm gonna Madrid").score).toBe(100);
  });
});

describe("srs", () => {
  const now = 1_000_000_000_000;
  it("moves up a box when known and resets when not", () => {
    const a = review({}, true, now);
    expect(a.box).toBe(1);
    expect(a.due).toBeGreaterThan(now);
    const b = review({ box: 4 }, false, now);
    expect(b.box).toBe(0);
  });
  it("queues due items, lowest box first", () => {
    const items = [
      { id: "a", box: 3, due: now - 1 },
      { id: "b", box: 0, due: now - 1 },
      { id: "c", box: 0, due: now + 1000 },
    ];
    expect(dueQueue(items, now).map((i) => i.id)).toEqual(["b", "a"]);
    expect(isDue({}, now)).toBe(true);
  });
});

describe("progress", () => {
  const day = 86_400_000;
  const now = new Date(2026, 8, 23, 18).getTime();
  const s = (daysAgo: number, errors: number) => ({
    startedAt: now - daysAgo * day - 10 * 60000,
    endedAt: now - daysAgo * day,
    messages: [
      { role: "user" as const, text: "one two three" },
      { role: "assistant" as const, text: "x" },
    ],
    errorStats: [{ count: errors }],
  });
  it("counts streak, minutes and words", () => {
    const p = computeProgress([s(0, 1), s(1, 0), s(2, 2), s(4, 0)], now);
    expect(p.streak).toBe(3);
    expect(p.practicedToday).toBe(true);
    expect(p.minutes).toBe(40);
    expect(p.wordsSpoken).toBe(12);
    expect(p.week).toHaveLength(7);
    expect(p.week[6].minutes).toBe(10);
  });
  it("keeps the streak alive if you practised yesterday but not yet today", () => {
    expect(computeProgress([s(1, 0), s(2, 0)], now).streak).toBe(2);
    expect(computeProgress([s(3, 0)], now).streak).toBe(0);
  });
});

describe("conversation helpers", () => {
  it("applies corrections to build the full natural sentence", () => {
    expect(
      applyCorrections("yesterday I go to the  beach and eat paella", [
        { original: "I go to the beach", corrected: "I went to the beach", explanation: "", type: "tiempo verbal" },
        { original: "eat paella", corrected: "ate paella", explanation: "", type: "tiempo verbal" },
      ]),
    ).toBe("Yesterday I went to the beach and ate paella");
    expect(applyCorrections("hello", [{ original: "xyz", corrected: "abc", explanation: "", type: "otro" }])).toBeNull();
  });
  it("finds the question and detects repeated questions", () => {
    expect(questionOf("Nice! Do you like it here?")).toBe("Do you like it here?");
    expect(similarQuestion("What do you study?", "So what do you study at university?")).toBe(false);
    expect(similarQuestion("Where are you from originally?", "And where are you from originally?")).toBe(true);
  });
  it("parses suggestions from JSON or plain lines", () => {
    expect(parseSuggestions('{"suggestions":[{"en":"I live here.","es":"Vivo aquí."}]}')).toEqual([
      { en: "I live here.", es: "Vivo aquí." },
    ]);
    expect(parseSuggestions("1. Yes, I do — Sí\n2. Not really | No mucho").map((s) => s.en)).toEqual([
      "Yes, I do",
      "Not really",
    ]);
  });
  it("cleans translations", () => {
    expect(cleanTranslation('Traducción: "¿De dónde eres?"\n\nNota: ...')).toBe("¿De dónde eres?");
  });
});

describe("audio helpers", () => {
  it("drops Whisper hallucinations and noise tags", () => {
    expect(cleanTranscript(" Thank you for watching!")).toBe("");
    expect(cleanTranscript("[BLANK_AUDIO]")).toBe("");
    expect(cleanTranscript("I went to the market. (music)")).toBe("I went to the market.");
    expect(cleanTranscript("Thank you, I had a great time")).toBe("Thank you, I had a great time");
  });
  it("detects speech vs silence", () => {
    expect(hasSpeech(new Float32Array(16000))).toBe(false);
    const tone = new Float32Array(16000).map((_, i) => 0.2 * Math.sin(i / 5));
    expect(hasSpeech(tone)).toBe(true);
  });
  it("normalizes quiet audio and resamples to 16 kHz", () => {
    const quiet = new Float32Array([0.1, -0.1, 0.05]);
    expect(Math.max(...normalize(quiet))).toBeCloseTo(0.9);
    expect(resampleTo16k(new Float32Array(48000), 48000).length).toBe(16000);
  });
  it("splits speech so the first sentence starts quickly", () => {
    expect(splitForSpeech("Hi! I'm Liam. I'm from Dublin. Do you live here?")).toEqual([
      "Hi!",
      "I'm Liam.",
      "I'm from Dublin. Do you live here?",
    ]);
  });
});
