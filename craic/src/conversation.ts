import { langOf } from "./lang";
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
  splitSentences,
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
import { createSpeechStream, speak, stopSpeaking, type SpeakOptions, type SpeechRate, type VoiceEngine } from "./speech/tts";

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
  /** Empiezas tú: el personaje no saluda, espera a que hables. */
  userStarts?: boolean;
}

export function useConversation({ llm, character, level, scenario, voice, initialMessages, onChange, userStarts }: Options) {
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

  const speakOpts = useCallback(
    (rate?: SpeechRate): SpeakOptions => {
      const v = voiceRef.current;
      return {
        rate: rate ?? v.rate,
        langs: character.voiceLangs,
        gender: character.voiceGender,
        hint: character.voiceHint,
        neuralVoice: v.neuralVoice,
        engine: v.engine,
      };
    },
    [character],
  );

  const say = useCallback((text: string, rate?: SpeechRate) => speak(text, speakOpts(rate)), [speakOpts]);

  // El personaje abre la conversación con una frase preparada (instantánea),
  // o se retoma una conversación guardada.
  useEffect(() => {
    if (initialMessages?.length) {
      update(() => initialMessages);
      return () => stopSpeaking();
    }
    if (userStarts && character.kind === "casual") {
      update(() => []);
      return () => stopSpeaking();
    }
    const scenarioOpeners = langOf(character) === "fr" ? (scenario.openersFr ?? []) : scenario.openers;
    const pool = scenarioOpeners.length ? scenarioOpeners : character.openers;
    const opener = pool[Math.floor(Math.random() * pool.length)];
    update(() => [{ id: uid(), role: "assistant", text: opener }]);
    return () => stopSpeaking();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [character, scenario]);

  const handleEngineError = (err: unknown) => {
    console.error(err);
    const e = toAppError(err);
    if (e.kind === "memory" || e.kind === "webgpu" || e.kind === "cloud") setEngineError(e);
  };

  /**
   * Envía tu frase. Se resuelve cuando el personaje ha terminado de hablar
   * (para volver a escucharte). Las correcciones van en segundo plano.
   */
  const send = useCallback(
    async (rawText: string): Promise<void> => {
      const text = rawText.replace(/\s+/g, " ").trim();
      if (!text || thinking) return;
      stopSpeaking();
      const prev = messagesRef.current;
      const previousQuestion = [...prev].reverse().find((m) => m.role === "assistant")?.text;
      const userMsg: Msg = { id: uid(), role: "user", text, correctionState: "pending" };
      const botMsg: Msg = { id: uid(), role: "assistant", text: "", streaming: true };
      update((p) => [...p, userMsg, botMsg]);
      setThinking(true);

      // La voz empieza con la primera frase completa, mientras se escribe el resto.
      const speech = voiceRef.current.autoSpeak ? createSpeechStream(speakOpts()) : null;
      let spoken = 0;
      const pushComplete = (clean: string, final: boolean) => {
        if (!speech) return;
        const sentences = splitSentences(clean);
        const complete = final ? sentences : sentences.filter((s, i) => i < sentences.length - 1 || /\?["'’”)]*$/.test(s));
        for (; spoken < complete.length; spoken++) speech.push(complete[spoken]);
      };

      const history = [...prev, userMsg].map((m) => ({ role: m.role, text: m.text }));
      let reply: string;
      try {
        const raw = await llm.complete(buildReplyMessages(character, level, history, { scenario }), {
          tag: "reply",
          priority: "high",
          temperature: 0.7,
          maxTokens: level === "C1" ? 75 : 60,
          onText: (partial) => {
            const clean = cleanPartial(partial, character.name);
            patch(botMsg.id, { text: clean });
            pushComplete(clean, false);
            return hasCompleteQuestion(partial);
          },
        });
        reply = cleanReply(raw, character.name);
      } catch (err) {
        handleEngineError(err);
        reply = "Sorry, my mind went blank for a second. Can you say that again?";
      }
      patch(botMsg.id, { text: reply, streaming: false });
      setThinking(false);
      pushComplete(reply, true);

      // Correcciones: prioridad baja. Si vuelves a hablar, se pausan y se retoman después.
      const job = (async () => {
        if (words(text) <= 2) {
          patch(userMsg.id, { corrections: { errors: [], tip: SHORT_TIP }, correctionState: "done" });
          return;
        }
        try {
          const raw = await llm.complete(buildCorrectionMessages(level, previousQuestion, text, langOf(character)), {
            tag: "correct",
            priority: "low",
            temperature: 0.1,
            maxTokens: 180,
            jsonSchema: CORRECTION_SCHEMA,
          });
          patch(userMsg.id, { corrections: parseCorrections(raw, text), correctionState: "done" });
        } catch (err) {
          // Una corrección que falla (p. ej. la nube saturada un momento) no debe
          // alarmar: la conversación sigue funcionando.
          console.warn("Corrección no disponible", err);
          if (toAppError(err).kind === "memory") handleEngineError(err);
          patch(userMsg.id, { correctionState: "error" });
        }
      })();
      pendingRef.current = Promise.all([pendingRef.current, job]).then(() => undefined);

      await speech?.end();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [llm, character, level, scenario, thinking, update, patch, speakOpts],
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
        priority: "high",
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
    await say(text, "slow");
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
          langOf(character),
        ),
        { tag: "suggest", temperature: 0.8, maxTokens: 260, jsonSchema: SUGGESTION_SCHEMA },
      );
      return parseSuggestions(raw);
    } catch (err) {
      handleEngineError(err);
      return [];
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [llm, level, character]);

  const translate = useCallback(
    async (id: string) => {
      const m = messagesRef.current.find((x) => x.id === id);
      if (!m || m.translation || m.translating) return;
      patch(id, { translating: true });
      try {
        const raw = await llm.complete(buildTranslateMessages(m.text, langOf(character)), {
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
    [llm, patch, character],
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
