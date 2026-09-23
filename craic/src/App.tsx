import { useCallback, useEffect, useRef, useState } from "react";
import { getCharacter, type Level } from "./characters";
import { Wordmark } from "./components/Brand";
import { Chat } from "./components/Chat";
import { History } from "./components/History";
import { Icon } from "./components/Icon";
import { Loading } from "./components/Loading";
import { NoWebGPU } from "./components/NoWebGPU";
import { Review } from "./components/Review";
import { Settings } from "./components/Settings";
import { Setup } from "./components/Setup";
import { EndOfSession } from "./components/Summary";
import type { Msg } from "./conversation";
import { clearDraft, loadDraft, saveDraft, type Draft } from "./lib/draft";
import { useInstallPrompt } from "./lib/install";
import { loadPrefs, savePrefs, type Prefs } from "./lib/prefs";
import { useWakeLock } from "./lib/wakeLock";
import { checkWebGPU, type WebGPUStatus } from "./lib/webgpu";
import { deleteCachedModel, isModelCached, loadWebLLM, requestPersistentStorage, type LLM, type LoadProgress } from "./llm/engine";
import { toAppError, type AppError } from "./llm/errors";
import { createMockEngine } from "./llm/mockEngine";
import { MODEL_OPTIONS, modelIdFor } from "./llm/models";
import { getScenario } from "./scenarios";
import { loadASR, loadTTS, useAudioModels } from "./speech/audioModels";
import { recognitionSupported } from "./speech/recognition";
import { needsNeuralVoice, unlockTTS } from "./speech/tts";

type Screen = "check" | "home" | "loading" | "chat" | "summary" | "review" | "progress" | "settings";

const TABS: { id: Screen; label: string; icon: string }[] = [
  { id: "home", label: "Hablar", icon: "chat" },
  { id: "review", label: "Repasar", icon: "cards" },
  { id: "progress", label: "Progreso", icon: "chart" },
];

const demo = new URLSearchParams(location.search).has("demo");

const AUDIO_FLAG = "craic:audio-cached";
const readFlag = () => {
  try {
    return localStorage.getItem(AUDIO_FLAG) === "1";
  } catch {
    return false;
  }
};

export default function App() {
  const [prefs, setPrefs] = useState<Prefs>(loadPrefs);
  const [gpu, setGpu] = useState<WebGPUStatus | null>(null);
  const [screen, setScreen] = useState<Screen>("check");
  const [progress, setProgress] = useState<LoadProgress | null>(null);
  const [loadError, setLoadError] = useState<AppError | null>(null);
  const [firstDownload, setFirstDownload] = useState(false);
  const [chatKey, setChatKey] = useState(0);
  const [draft, setDraft] = useState<Draft | null>(() => loadDraft());
  const [resumeMessages, setResumeMessages] = useState<Msg[] | undefined>(undefined);
  const [ended, setEnded] = useState<{ messages: Msg[]; startedAt: number } | null>(null);
  const [audioCached, setAudioCached] = useState(readFlag);
  const llmRef = useRef<{ id: string; llm: LLM } | null>(null);
  const loadingRef = useRef<{ id: string; promise: Promise<LLM> } | null>(null);
  const startedAtRef = useRef(Date.now());
  const install = useInstallPrompt();
  const audio = useAudioModels();
  const [iosHint, setIosHint] = useState(false);
  const [needTTS, setNeedTTS] = useState(true);
  /** Llamada lista para abrir en cuanto la voz y el oído estén preparados */
  const [pendingOpen, setPendingOpen] = useState<{ messages?: Msg[]; startedAt?: number } | null>(null);

  useWakeLock(screen === "loading");

  useEffect(() => {
    if (prefs.theme === "auto") delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = prefs.theme;
  }, [prefs.theme]);

  useEffect(() => {
    void checkWebGPU().then((s) => {
      setGpu(s);
      setScreen("home");
    });
  }, []);

  // Cuando voz y oído están listos se recuerda (para no volver a avisar del tamaño).
  useEffect(() => {
    const ttsOk = !needTTS || audio.tts === "ready";
    const asrOk = prefs.asrEngine !== "local" || audio.asr === "ready";
    if (ttsOk && asrOk && (audio.tts === "ready" || audio.asr === "ready")) {
      try {
        localStorage.setItem(AUDIO_FLAG, "1");
      } catch {
        /* nada */
      }
      setAudioCached(true);
    }
  }, [audio.tts, audio.asr, needTTS, prefs.asrEngine]);

  const updatePrefs = useCallback((p: Partial<Prefs>) => {
    setPrefs((prev) => {
      const next = { ...prev, ...p };
      savePrefs(next);
      return next;
    });
  }, []);

  const f16 = gpu?.ok ? gpu.f16 : false;
  const canRun = demo || !!gpu?.ok;

  /** Carga (o reutiliza) el modelo de lenguaje. Se comparte entre precarga y «Llamar». */
  const ensureEngine = useCallback(
    (id: string): Promise<LLM> => {
      if (llmRef.current?.id === id) return Promise.resolve(llmRef.current.llm);
      if (loadingRef.current?.id === id) return loadingRef.current.promise;
      // Si se estaba cargando otro modelo, se espera a que termine para
      // descargarlo después: nunca dos modelos a la vez en la GPU.
      const previous = loadingRef.current?.promise;
      const promise = (async () => {
        await previous?.catch(() => undefined);
        const old = llmRef.current;
        llmRef.current = null;
        await old?.llm.unload().catch(() => undefined);
        await requestPersistentStorage();
        const load = async (modelId: string) => {
          try {
            return await loadWebLLM(modelId, setProgress);
          } catch (err) {
            // Atascado: se cierra el motor y se reintenta una vez desde cero.
            if (toAppError(err).kind !== "stall") throw err;
            console.warn("Carga atascada, reintentando", err);
            setProgress({ progress: 0, text: "Reintentando…" });
            return await loadWebLLM(modelId, setProgress);
          }
        };
        let llm: LLM;
        try {
          llm = await load(id);
        } catch (err) {
          // Sin shader-f16: usamos la variante q4f32 automáticamente.
          if (toAppError(err).kind !== "f16") throw err;
          llm = await load(MODEL_OPTIONS[prefs.tier].idF32);
        }
        llmRef.current = { id, llm };
        return llm;
      })();
      loadingRef.current = { id, promise };
      promise
        .finally(() => {
          if (loadingRef.current?.promise === promise) loadingRef.current = null;
        })
        .catch(() => undefined);
      return promise;
    },
    [prefs.tier],
  );

  const character = getCharacter(prefs.characterId);

  // ¿Hace falta la voz neuronal o el navegador ya tiene una voz natural?
  useEffect(() => {
    let alive = true;
    if (prefs.voiceEngine === "system") setNeedTTS(false);
    else if (prefs.voiceEngine === "neural") setNeedTTS(true);
    else void needsNeuralVoice(character.voiceLangs, character.voiceGender).then((n) => alive && setNeedTTS(n));
    return () => {
      alive = false;
    };
  }, [prefs.voiceEngine, character]);

  const loadAudio = useCallback(() => {
    if (demo) return;
    if (needTTS) loadTTS(prefs.voiceQuality === "high" && gpu?.ok ? "webgpu" : "wasm");
    if (prefs.asrEngine === "local") loadASR(prefs.asrModel);
  }, [needTTS, prefs.voiceQuality, prefs.asrEngine, prefs.asrModel, gpu]);

  // Precarga: si el modelo ya está descargado, se carga en segundo plano
  // mientras eliges personaje, así «Llamar» es casi instantáneo.
  useEffect(() => {
    if (screen !== "home" || demo || !gpu?.ok) return;
    const id = modelIdFor(prefs.tier, f16);
    let alive = true;
    void isModelCached(id).then((cached) => {
      if (!alive || !cached) return;
      ensureEngine(id).catch(() => undefined);
      if (audioCached) loadAudio();
    });
    return () => {
      alive = false;
    };
  }, [screen, prefs.tier, f16, gpu, ensureEngine, audioCached, loadAudio]);

  // Si cambias los ajustes de voz durante la conversación, se cargan los modelos necesarios.
  useEffect(() => {
    if (screen === "chat" || (screen === "review" && audioCached)) loadAudio();
  }, [screen, loadAudio, audioCached]);

  const openChat = useCallback((messages?: Msg[], startedAt?: number) => {
    startedAtRef.current = startedAt ?? Date.now();
    setResumeMessages(messages);
    setChatKey((k) => k + 1);
    setScreen("chat");
  }, []);

  const start = useCallback(
    async ({ cached }: { cached: boolean }, resume?: Draft) => {
      unlockTTS();
      if (demo) {
        llmRef.current = { id: "demo", llm: createMockEngine() };
        openChat(resume?.messages, resume?.startedAt);
        return;
      }
      const id = modelIdFor(prefs.tier, f16);
      loadAudio();
      if (llmRef.current?.id === id) {
        // IA ya cargada: se abre en cuanto la voz y el oído estén listos (normalmente ya).
        setFirstDownload(false);
        setLoadError(null);
        setScreen("loading");
        setPendingOpen({ messages: resume?.messages, startedAt: resume?.startedAt });
        return;
      }
      setFirstDownload(!cached);
      setLoadError(null);
      setScreen("loading");
      try {
        await ensureEngine(id);
        setPendingOpen({ messages: resume?.messages, startedAt: resume?.startedAt });
      } catch (err) {
        console.error(err);
        setLoadError(toAppError(err));
      }
    },
    [prefs.tier, f16, ensureEngine, openChat, loadAudio],
  );

  // Se abre la llamada cuando la voz natural y el oído están listos (o fallaron).
  const audioReady =
    (!needTTS || audio.tts === "ready" || audio.tts === "error") &&
    (prefs.asrEngine !== "local" || audio.asr === "ready" || audio.asr === "error" || (recognitionSupported && audio.asr === "idle"));
  useEffect(() => {
    if (pendingOpen && audioReady && screen === "loading") {
      openChat(pendingOpen.messages, pendingOpen.startedAt);
      setPendingOpen(null);
    }
  }, [pendingOpen, audioReady, screen, openChat]);

  const resume = useCallback(() => {
    if (!draft) return;
    updatePrefs({ characterId: draft.characterId, scenarioId: draft.scenarioId, level: draft.level as Level });
    void start({ cached: true }, draft);
  }, [draft, start, updatePrefs]);

  const endChat = useCallback((messages: Msg[]) => {
    clearDraft();
    setDraft(null);
    if (!messages.some((m) => m.role === "user")) {
      setScreen("home");
      return;
    }
    setEnded({ messages, startedAt: startedAtRef.current });
    setScreen("summary");
  }, []);

  const scenario = getScenario(prefs.scenarioId, character.kind);
  const tabbed = screen === "home" || screen === "review" || screen === "progress";

  if (screen === "chat" && llmRef.current) {
    return (
      <div className="app app-chat">
        <Chat
          key={chatKey}
          llm={llmRef.current.llm}
          character={character}
          level={prefs.level}
          scenario={scenario}
          prefs={prefs}
          onPrefs={updatePrefs}
          onEnd={endChat}
          onChange={(messages) =>
            saveDraft({
              characterId: character.id,
              scenarioId: scenario.id,
              level: prefs.level,
              startedAt: startedAtRef.current,
              updatedAt: Date.now(),
              messages,
            })
          }
          initialMessages={resumeMessages}
          demo={demo}
        />
      </div>
    );
  }

  return (
    <div className="app">
      <header className="top">
        {screen === "settings" || screen === "summary" ? (
          <button className="round-btn" aria-label="Volver" onClick={() => setScreen("home")}>
            <Icon name="back" />
          </button>
        ) : install.canPrompt || install.showIOSHint ? (
          <button
            className="round-btn"
            aria-label="Instalar app"
            title="Instalar app"
            onClick={() => (install.canPrompt ? void install.install() : setIosHint((v) => !v))}
          >
            <Icon name="download" />
          </button>
        ) : (
          <span className="top-spacer" />
        )}
        <button className="wordmark-btn" onClick={() => setScreen("home")} aria-label="Inicio">
          <Wordmark />
        </button>
        <button className="round-btn" aria-label="Ajustes" onClick={() => setScreen("settings")}>
          <Icon name="gear" />
        </button>
      </header>
      {iosHint && (
        <p className="note">
          En iPhone/iPad: pulsa <strong>Compartir</strong> en Safari y luego <strong>«Añadir a pantalla de inicio»</strong>.
        </p>
      )}

      {tabbed && canRun && (
        <nav className="tabs" aria-label="Secciones">
          {TABS.map((t) => (
            <button
              key={t.id}
              className={screen === t.id ? "on" : ""}
              aria-current={screen === t.id ? "page" : undefined}
              onClick={() => setScreen(t.id)}
            >
              <Icon name={t.icon} size={18} /> {t.label}
            </button>
          ))}
        </nav>
      )}

      {screen === "check" && <p className="muted center">Comprobando tu dispositivo…</p>}

      {screen === "home" && gpu && !canRun && !gpu.ok && <NoWebGPU status={gpu} />}

      {screen === "home" && gpu && canRun && (
        <Setup
          prefs={prefs}
          f16={f16}
          mobile={gpu.mobile}
          demo={demo}
          draft={draft}
          audioCached={audioCached}
          needTTS={needTTS}
          onChange={updatePrefs}
          onStart={(info) => void start(info)}
          onResume={resume}
          onDiscardDraft={() => {
            clearDraft();
            setDraft(null);
          }}
        />
      )}

      {screen === "loading" && (
        <Loading
          character={character}
          prefs={prefs}
          progress={progress}
          error={loadError}
          firstDownload={firstDownload}
          needTTS={needTTS}
          llmReady={!!pendingOpen}
          onSkip={() => {
            if (pendingOpen) {
              openChat(pendingOpen.messages, pendingOpen.startedAt);
              setPendingOpen(null);
            }
          }}
          onRetry={() => void start({ cached: !firstDownload })}
          onRedownload={async () => {
            const opt = MODEL_OPTIONS[prefs.tier];
            await Promise.allSettled([deleteCachedModel(opt.idF16), deleteCachedModel(opt.idF32)]);
            void start({ cached: false });
          }}
          onSwitchModel={() => {
            updatePrefs({ tier: prefs.tier === "light" ? "quality" : "light" });
            setScreen("home");
          }}
          onBack={() => {
            setPendingOpen(null);
            setScreen("home");
          }}
        />
      )}

      {screen === "summary" && ended && llmRef.current && (
        <EndOfSession
          llm={llmRef.current.llm}
          character={character}
          level={prefs.level}
          messages={ended.messages}
          startedAt={ended.startedAt}
          onNew={() => openChat()}
          onHistory={() => setScreen("progress")}
        />
      )}

      {screen === "review" && <Review prefs={prefs} />}
      {screen === "progress" && <History />}
      {screen === "settings" && <Settings prefs={prefs} onChange={updatePrefs} />}
    </div>
  );
}
