import { useCallback, useEffect, useRef, useState } from "react";
import type { Character, Level } from "./characters";
import type { LLM } from "./llm/engine";
import { toAppError, type AppError } from "./llm/errors";
import {
  cleanReply,
  cleanTranslation,
  hasCompleteQuestion,
  parseCorrections,
  parseSuggestions,
  questionOf,
  similarQuestion,
  type CorrectionResult,
  type Suggestion,
} from "./llm/parse";
import {
  buildCorrectionMessages,
  buildRephraseMessages,
  buildReplyMessages,
  buildSuggestionMessages,
  buildTranslateMessages,
  CORRECTION_SCHEMA,
  SUGGESTION_SCHEMA,
} from "./llm/prompts";
import type { Scenario } from "./scenarios";
import { speak, stopSpeaking, type SpeechRate, type VoiceEngine } from "./speech/tts";

export interface Msg {
  id: string;
  role: "user" | "assistant";
  text: string;
  streaming?: boolean;
  correctionState?: "pending" | "done" | "error";
  corrections?: CorrectionResult;
  /** Traducción al español (bajo demanda) */
  translation?: string;
  translating?: boolean;
  /** Mensaje repetido más fácil tras «No entiendo» */
  rephrase?: boolean;
}

export interface VoiceSettings {
  rate: SpeechRate;
  engine: VoiceEngine;
  neuralVoice: string;
  autoSpeak: boolean;
}

const uid = () => Math.random().toString(36).slice(2, 10);
const words = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;

const SHORT_TIP =
  "Respuesta muy corta. Para practicar más, contesta con una frase completa, por ejemplo: «Yes, I've been there a couple of times.»";

interface Options {
  llm: LLM;
  character: Character;
  level: Level;
  scenario: Scenario;
  voice: VoiceSettings;
  initialMessages?: Msg[];
  onChange?: (messages: Msg[]) => void;
}

export function useConversation({ llm, character, level, scenario, voice, initialMessages, onChange }: Options) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [thinking, setThinking] = useState(false);
  const [engineError, setEngineError] = useState<AppError | null>(null);
  const messagesRef = useRef<Msg[]>([]);
  const pendingRef = useRef<Promise<void>>(Promise.resolve());
  const voiceRef = useRef(voice);
  voiceRef.current = voice;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const update = useCallback((fn: (prev: Msg[]) => Msg[]) => {
    messagesRef.current = fn(messagesRef.current);
    setMessages(messagesRef.current);
    if (!messagesRef.current.some((m) => m.streaming)) onChangeRef.current?.(messagesRef.current);
  }, []);

  const patch = useCallback(
    (id: string, p: Partial<Msg>) => update((prev) => prev.map((m) => (m.id === id ? { ...m, ...p } : m))),
    [update],
  );

  const say = useCallback(
    (text: string, rate?: SpeechRate) => {
      const v = voiceRef.current;
      return speak(text, {
        rate: rate ?? v.rate,
        langs: character.voiceLangs,
        gender: character.voiceGender,
        neuralVoice: v.neuralVoice,
        engine: v.engine,
      });
    },
    [character],
  );

  // El personaje abre la conversación con una frase preparada (instantánea),
  // o se retoma una conversación guardada.
  useEffect(() => {
    if (initialMessages?.length) {
      update(() => initialMessages);
      return () => stopSpeaking();
    }
    const pool = scenario.openers.length ? scenario.openers : character.openers;
    const opener = pool[Math.floor(Math.random() * pool.length)];
    update(() => [{ id: uid(), role: "assistant", text: opener }]);
    if (voiceRef.current.autoSpeak) void say(opener);
    return () => stopSpeaking();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [character, scenario]);

  const handleEngineError = (err: unknown) => {
    console.error(err);
    const e = toAppError(err);
    if (e.kind === "memory" || e.kind === "webgpu") setEngineError(e);
  };

  const send = useCallback(
    async (rawText: string) => {
      const text = rawText.replace(/\s+/g, " ").trim();
      if (!text || thinking) return;
      stopSpeaking();
      const prev = messagesRef.current;
      const assistantMsgs = prev.filter((m) => m.role === "assistant");
      const previousQuestion = assistantMsgs[assistantMsgs.length - 1]?.text;
      const askedBefore = assistantMsgs.map((m) => questionOf(m.text)).filter((q): q is string => !!q);
      const userMsg: Msg = { id: uid(), role: "user", text, correctionState: "pending" };
      const botMsg: Msg = { id: uid(), role: "assistant", text: "", streaming: true };
      update((p) => [...p, userMsg, botMsg]);
      setThinking(true);

      // 1) Respuesta del personaje
      const history = [...prev, userMsg].map((m) => ({ role: m.role, text: m.text }));
      const generate = async (temperature: number) => {
        const raw = await llm.complete(
          buildReplyMessages(character, level, history, { scenario, avoidQuestions: askedBefore }),
          {
            tag: "reply",
            temperature,
            maxTokens: level === "C1" ? 110 : 90,
            onText: (partial) => {
              patch(botMsg.id, { text: cleanPartial(partial, character.name) });
              return hasCompleteQuestion(partial);
            },
          },
        );
        return cleanReply(raw, character.name);
      };
      let reply: string;
      try {
        reply = await generate(0.7);
        // Si repite una pregunta que ya hizo, se genera otra vez con más variedad.
        const q = questionOf(reply);
        if (q && askedBefore.some((old) => similarQuestion(old, q))) reply = await generate(1.0);
      } catch (err) {
        handleEngineError(err);
        reply = "Sorry, my mind went blank for a second. Can you say that again?";
      }
      patch(botMsg.id, { text: reply, streaming: false });
      setThinking(false);
      if (voiceRef.current.autoSpeak) void say(reply);

      // 2) Correcciones (llamada aparte, más fiable en modelos pequeños)
      const job = (async () => {
        if (words(text) <= 2) {
          patch(userMsg.id, { corrections: { errors: [], tip: SHORT_TIP }, correctionState: "done" });
          return;
        }
        try {
          const raw = await llm.complete(buildCorrectionMessages(level, previousQuestion, text), {
            tag: "correct",
            temperature: 0.1,
            maxTokens: 320,
            jsonSchema: CORRECTION_SCHEMA,
          });
          patch(userMsg.id, { corrections: parseCorrections(raw, text), correctionState: "done" });
        } catch (err) {
          handleEngineError(err);
          patch(userMsg.id, { correctionState: "error" });
        }
      })();
      pendingRef.current = Promise.all([pendingRef.current, job]).then(() => undefined);
      await job;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [llm, character, level, scenario, thinking, update, patch, say],
  );

  /** «No entiendo»: el personaje lo repite más fácil y más despacio. */
  const rephrase = useCallback(async () => {
    const last = [...messagesRef.current].reverse().find((m) => m.role === "assistant" && !m.streaming);
    if (!last || thinking) return;
    stopSpeaking();
    const msg: Msg = { id: uid(), role: "assistant", text: "", streaming: true, rephrase: true };
    update((p) => [...p, msg]);
    setThinking(true);
    let text: string;
    try {
      const raw = await llm.complete(buildRephraseMessages(character, last.text), {
        tag: "rephrase",
        temperature: 0.4,
        maxTokens: 70,
      });
      text = cleanReply(raw, character.name);
    } catch (err) {
      handleEngineError(err);
      text = last.text;
    }
    patch(msg.id, { text, streaming: false });
    setThinking(false);
    void say(text, "slow");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [llm, character, thinking, update, patch, say]);

  /** «¿Qué digo?»: tres posibles respuestas. */
  const suggest = useCallback(async (): Promise<Suggestion[]> => {
    const last = [...messagesRef.current].reverse().find((m) => m.role === "assistant" && !m.streaming);
    if (!last) return [];
    try {
      const raw = await llm.complete(
        buildSuggestionMessages(
          level,
          last.text,
          messagesRef.current.map((m) => ({ role: m.role, text: m.text })),
        ),
        { tag: "suggest", temperature: 0.8, maxTokens: 260, jsonSchema: SUGGESTION_SCHEMA },
      );
      return parseSuggestions(raw);
    } catch (err) {
      handleEngineError(err);
      return [];
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [llm, level]);

  const translate = useCallback(
    async (id: string) => {
      const m = messagesRef.current.find((x) => x.id === id);
      if (!m || m.translation || m.translating) return;
      patch(id, { translating: true });
      try {
        const raw = await llm.complete(buildTranslateMessages(m.text), {
          tag: "translate",
          temperature: 0.2,
          maxTokens: 160,
        });
        patch(id, { translation: cleanTranslation(raw) || "(no se pudo traducir)", translating: false });
      } catch (err) {
        handleEngineError(err);
        patch(id, { translating: false });
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [llm, patch],
  );

  /** Espera a que terminen las correcciones pendientes y devuelve la conversación. */
  const finish = useCallback(async () => {
    stopSpeaking();
    await pendingRef.current;
    return messagesRef.current;
  }, []);

  return { messages, thinking, engineError, send, say, rephrase, suggest, translate, finish };
}

function cleanPartial(partial: string, name: string): string {
  return partial
    .replace(/<think>[\s\S]*?(<\/think>|$)/gi, "")
    .replace(new RegExp(`^\\s*${name}\\s*:\\s*`, "i"), "")
    .replace(/[*_#`]+/g, "")
    .replace(/\?[\s\S]*$/, "?")
    .trim();
}
