import { t, useUiLang } from "./i18n";
import { langOf } from "./lang";
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
import { CloudLLM, cloudAvailable } from "./llm/cloudEngine";
import { createMockEngine } from "./llm/mockEngine";
import { MODEL_OPTIONS, modelIdFor } from "./llm/models";
import { getScenario } from "./scenarios";
import { loadASR, loadTTS, useAudioModels } from "./speech/audioModels";
import { recognitionSupported } from "./speech/recognition";
import { needsNeuralVoice, ttsSupported, unlockTTS } from "./speech/tts";

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
    // La comprobación de la nube solo sirve para el diagnóstico (y para despertar la función).
    if (!demo) void cloudAvailable();
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
  /** IA en la nube: si la eliges, o en «auto» cuando está disponible, o si no hay WebGPU. */
  // La nube se usa salvo que elijas la IA del dispositivo a propósito (y tengas WebGPU).
  // No depende de la comprobación inicial: una red lenta no debe mandarte a la IA local.
  const useCloud = !demo && (prefs.aiEngine !== "local" || !gpu?.ok);
  const canRun = true;

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
            setProgress({ progress: 0, text: t("Reintentando…") });
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
  const uiLang = useUiLang();

  useEffect(() => {
    document.title = t("Craic · Aprende inglés y francés hablando gratis");
  }, [uiLang]);

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
    // En el móvil, la voz ligera (~90 MB) en vez de la de alta calidad (~330 MB).
    if (needTTS) loadTTS(prefs.voiceQuality === "high" && gpu?.ok && !gpu.mobile ? "webgpu" : "wasm");
    // El oído local solo entiende inglés.
    if (prefs.asrEngine === "local" && langOf(character) === "en") loadASR(prefs.asrModel);
  }, [needTTS, prefs.voiceQuality, prefs.asrEngine, prefs.asrModel, gpu, character]);

  // Precarga: si el modelo ya está descargado, se carga en segundo plano
  // mientras eliges personaje, así «Llamar» es casi instantáneo.
  useEffect(() => {
    if (screen !== "home" || demo || !gpu?.ok) return;
    if (useCloud) {
      if (audioCached) loadAudio();
      return;
    }
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
  }, [screen, prefs.tier, f16, gpu, ensureEngine, audioCached, loadAudio, useCloud]);

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
      loadAudio();
      const goCloud = () => {
        // IA en la nube: nada que descargar; solo se espera a la voz y el oído.
        if (llmRef.current?.id !== "cloud") {
          void llmRef.current?.llm.unload().catch(() => undefined);
          llmRef.current = { id: "cloud", llm: new CloudLLM() };
        }
        setFirstDownload(!audioCached);
        setLoadError(null);
        setScreen("loading");
        setPendingOpen({ messages: resume?.messages, startedAt: resume?.startedAt });
      };
      // Sin WebGPU (o si la comprobación inicial falló por red lenta) se vuelve a mirar la nube.
      if (useCloud) {
        goCloud();
        return;
      }
      const id = modelIdFor(prefs.tier, f16);
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
        // La IA del dispositivo ha fallado: si hay nube, se sigue con ella sin preguntar.
        console.warn("IA local falló; se usa la nube", err);
        updatePrefs({ aiEngine: "cloud" });
        goCloud();
      }
    },
    [prefs.tier, f16, ensureEngine, openChat, loadAudio, useCloud, audioCached, gpu, updatePrefs],
  );

  // La llamada se abre ya: mientras se descarga la voz natural se usa la del
  // sistema, y mientras se prepara el oído local, el reconocimiento del
  // navegador. Solo se espera si no hay ninguna alternativa.
  const audioReady =
    (!needTTS || ttsSupported || audio.tts === "ready" || audio.tts === "error") &&
    (prefs.asrEngine !== "local" || langOf(character) !== "en" || recognitionSupported || audio.asr === "ready" || audio.asr === "error");
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
          <button className="round-btn" aria-label={t("Volver")} onClick={() => setScreen("home")}>
            <Icon name="back" />
          </button>
        ) : install.canPrompt || install.showIOSHint ? (
          <button
            className="round-btn"
            aria-label={t("Instalar app")}
            title={t("Instalar app")}
            onClick={() => (install.canPrompt ? void install.install() : setIosHint((v) => !v))}
          >
            <Icon name="download" />
          </button>
        ) : (
          <span className="top-spacer" />
        )}
        <button className="wordmark-btn" onClick={() => setScreen("home")} aria-label={t("Inicio")}>
          <Wordmark />
        </button>
        <button className="round-btn" aria-label={t("Ajustes")} onClick={() => setScreen("settings")}>
          <Icon name="gear" />
        </button>
      </header>
      {iosHint && (
        <p className="note">
          {t("En iPhone/iPad: pulsa «Compartir» en Safari y luego «Añadir a pantalla de inicio».")}
        </p>
      )}

      {tabbed && canRun && (
        <nav className="tabs" aria-label={t("Secciones")}>
          {TABS.map((tab) => (
            <button
              key={tab.id}
              className={screen === tab.id ? "on" : ""}
              aria-current={screen === tab.id ? "page" : undefined}
              onClick={() => setScreen(tab.id)}
            >
              <Icon name={tab.icon} size={18} /> {t(tab.label)}
            </button>
          ))}
        </nav>
      )}

      {screen === "check" && <p className="muted center">{t("Comprobando tu dispositivo…")}</p>}

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
          cloudOk={!demo}
          cloud={useCloud}
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
          cloudOk={!demo}
          cloud={useCloud}
          onUseCloud={() => {
            updatePrefs({ aiEngine: "cloud" });
            setScreen("home");
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
