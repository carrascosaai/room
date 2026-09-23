import { useCallback, useEffect, useRef, useState } from "react";
import type { Character, Level } from "./characters";
import type { LLM } from "./llm/engine";
import { cleanReply, hasCompleteQuestion, parseCorrections, type CorrectionResult } from "./llm/parse";
import { buildCorrectionMessages, buildReplyMessages, CORRECTION_SCHEMA } from "./llm/prompts";
import { speak, stopSpeaking, type SpeechRate } from "./speech/tts";

export interface Msg {
  id: string;
  role: "user" | "assistant";
  text: string;
  streaming?: boolean;
  correctionState?: "pending" | "done" | "error";
  corrections?: CorrectionResult;
}

const uid = () => Math.random().toString(36).slice(2, 10);

export function useConversation(llm: LLM, character: Character, level: Level, rate: SpeechRate) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [thinking, setThinking] = useState(false);
  const messagesRef = useRef<Msg[]>([]);
  const rateRef = useRef(rate);
  rateRef.current = rate;

  const update = useCallback((fn: (prev: Msg[]) => Msg[]) => {
    messagesRef.current = fn(messagesRef.current);
    setMessages(messagesRef.current);
  }, []);

  const say = useCallback(
    (text: string) =>
      speak(text, { rate: rateRef.current, langs: character.voiceLangs, gender: character.voiceGender }),
    [character],
  );

  // El personaje abre la conversación con una frase preparada (instantánea).
  useEffect(() => {
    const opener = character.openers[Math.floor(Math.random() * character.openers.length)];
    update(() => [{ id: uid(), role: "assistant", text: opener }]);
    void say(opener);
    return () => stopSpeaking();
  }, [character, update, say]);

  const send = useCallback(
    async (rawText: string) => {
      const text = rawText.trim();
      if (!text || thinking) return;
      stopSpeaking();
      const prev = messagesRef.current;
      const previousQuestion = [...prev].reverse().find((m) => m.role === "assistant")?.text;
      const userMsg: Msg = { id: uid(), role: "user", text, correctionState: "pending" };
      const botMsg: Msg = { id: uid(), role: "assistant", text: "", streaming: true };
      update((p) => [...p, userMsg, botMsg]);
      setThinking(true);

      // 1) Respuesta del personaje
      let reply: string;
      try {
        const history = [...prev, userMsg].map((m) => ({ role: m.role, text: m.text }));
        const raw = await llm.complete(buildReplyMessages(character, level, history), {
          temperature: 0.7,
          maxTokens: 90,
          onText: (partial) => {
            update((p) => p.map((m) => (m.id === botMsg.id ? { ...m, text: cleanPartial(partial, character.name) } : m)));
            return hasCompleteQuestion(partial);
          },
        });
        reply = cleanReply(raw, character.name);
      } catch (err) {
        console.error(err);
        reply = "Sorry, my mind went blank for a second. Can you say that again?";
      }
      update((p) => p.map((m) => (m.id === botMsg.id ? { ...m, text: reply, streaming: false } : m)));
      setThinking(false);
      void say(reply);

      // 2) Correcciones (llamada aparte, más fiable en modelos pequeños)
      try {
        const raw = await llm.complete(buildCorrectionMessages(level, previousQuestion, text), {
          temperature: 0.1,
          maxTokens: 320,
          jsonSchema: CORRECTION_SCHEMA,
        });
        const corrections = parseCorrections(raw, text);
        update((p) => p.map((m) => (m.id === userMsg.id ? { ...m, corrections, correctionState: "done" } : m)));
      } catch (err) {
        console.error(err);
        update((p) => p.map((m) => (m.id === userMsg.id ? { ...m, correctionState: "error" } : m)));
      }
    },
    [llm, character, level, thinking, update, say],
  );

  return { messages, thinking, send, say };
}

function cleanPartial(partial: string, name: string): string {
  return partial
    .replace(/<think>[\s\S]*?(<\/think>|$)/gi, "")
    .replace(new RegExp(`^\\s*${name}\\s*:\\s*`, "i"), "")
    .replace(/[*_#`]+/g, "")
    .replace(/\?[\s\S]*$/, "?")
    .trim();
}
