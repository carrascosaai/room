import { useCallback, useEffect, useRef, useState } from "react";
import { getCharacter } from "./characters";
import { Chat } from "./components/Chat";
import { History } from "./components/History";
import { Loading } from "./components/Loading";
import { NoWebGPU } from "./components/NoWebGPU";
import { Setup } from "./components/Setup";
import { EndOfSession } from "./components/Summary";
import { Vocab } from "./components/Vocab";
import type { Msg } from "./conversation";
import { loadWebLLM, requestPersistentStorage, type LLM, type LoadProgress } from "./llm/engine";
import { toAppError, type AppError } from "./llm/errors";
import { createMockEngine } from "./llm/mockEngine";
import { MODEL_OPTIONS, modelIdFor } from "./llm/models";
import { loadPrefs, savePrefs, type Prefs } from "./lib/prefs";
import { useInstallPrompt } from "./lib/install";
import { checkWebGPU, type WebGPUStatus } from "./lib/webgpu";
import { unlockTTS } from "./speech/tts";

type Screen = "check" | "setup" | "loading" | "chat" | "summary" | "history" | "vocab";

const TABS: { id: Screen; label: string }[] = [
  { id: "setup", label: "Practicar" },
  { id: "history", label: "Historial" },
  { id: "vocab", label: "Vocabulario" },
];

const demo = new URLSearchParams(location.search).has("demo");

const THEME_NEXT = { auto: "light", light: "dark", dark: "auto" } as const;
const THEME_LABEL = { auto: "Tema: automático", light: "Tema: claro", dark: "Tema: oscuro" } as const;
const THEME_ICON = { auto: "◐", light: "☀", dark: "☾" } as const;

export default function App() {
  const [prefs, setPrefs] = useState<Prefs>(loadPrefs);
  const [gpu, setGpu] = useState<WebGPUStatus | null>(null);
  const [screen, setScreen] = useState<Screen>("check");
  const [progress, setProgress] = useState<LoadProgress | null>(null);
  const [loadError, setLoadError] = useState<AppError | null>(null);
  const [firstDownload, setFirstDownload] = useState(false);
  const [chatKey, setChatKey] = useState(0);
  const llmRef = useRef<{ id: string; llm: LLM } | null>(null);
  const install = useInstallPrompt();
  const [iosHint, setIosHint] = useState(false);
  const [ended, setEnded] = useState<{ messages: Msg[]; startedAt: number } | null>(null);
  const startedAtRef = useRef(Date.now());

  useEffect(() => {
    if (prefs.theme === "auto") delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = prefs.theme;
  }, [prefs.theme]);

  useEffect(() => {
    void checkWebGPU().then((s) => {
      setGpu(s);
      setScreen("setup");
    });
  }, []);

  const updatePrefs = useCallback((p: Partial<Prefs>) => {
    setPrefs((prev) => {
      const next = { ...prev, ...p };
      savePrefs(next);
      return next;
    });
  }, []);

  const f16 = gpu?.ok ? gpu.f16 : false;

  const openChat = useCallback(() => {
    startedAtRef.current = Date.now();
    setChatKey((k) => k + 1);
    setScreen("chat");
  }, []);

  const endChat = useCallback((messages: Msg[]) => {
    if (!messages.some((m) => m.role === "user")) {
      setScreen("setup");
      return;
    }
    setEnded({ messages, startedAt: startedAtRef.current });
    setScreen("summary");
  }, []);

  const start = useCallback(
    async ({ cached }: { cached: boolean }) => {
      unlockTTS();
      if (demo) {
        llmRef.current = { id: "demo", llm: createMockEngine() };
        openChat();
        return;
      }
      let id = modelIdFor(prefs.tier, f16);
      if (llmRef.current?.id === id) {
        openChat();
        return;
      }
      setFirstDownload(!cached);
      setLoadError(null);
      setProgress(null);
      setScreen("loading");
      try {
        await llmRef.current?.llm.unload();
      } catch {
        /* ignorar */
      }
      llmRef.current = null;
      await requestPersistentStorage();
      try {
        let llm: LLM;
        try {
          llm = await loadWebLLM(id, setProgress);
        } catch (err) {
          // Sin shader-f16: usamos la variante q4f32 automáticamente.
          if (toAppError(err).kind !== "f16") throw err;
          id = MODEL_OPTIONS[prefs.tier].idF32;
          llm = await loadWebLLM(id, setProgress);
        }
        llmRef.current = { id, llm };
        openChat();
      } catch (err) {
        console.error(err);
        setLoadError(toAppError(err));
      }
    },
    [prefs.tier, f16, openChat],
  );

  const character = getCharacter(prefs.characterId);
  const showTabs = screen === "setup" || screen === "history" || screen === "vocab";

  return (
    <div className="app">
      {screen !== "chat" && (
        <header className="top">
          <div className="top-row">
            <h1>
              <span className="logo" aria-hidden="true">☘</span> Craic
            </h1>
            <div className="top-actions">
              {install.canPrompt && (
                <button className="btn-ghost btn-small" onClick={() => void install.install()}>
                  Instalar app
                </button>
              )}
              {!install.canPrompt && install.showIOSHint && (
                <button className="btn-ghost btn-small" onClick={() => setIosHint((v) => !v)}>
                  Instalar app
                </button>
              )}
              <button
                className="icon-btn icon-small"
                aria-label={THEME_LABEL[prefs.theme]}
                title={THEME_LABEL[prefs.theme]}
                onClick={() => updatePrefs({ theme: THEME_NEXT[prefs.theme] })}
              >
                {THEME_ICON[prefs.theme]}
              </button>
            </div>
          </div>
          <p className="muted">Practica inglés hablando con una IA. Gratis y en tu dispositivo.</p>
          {iosHint && (
            <p className="note">
              En iPhone/iPad: pulsa el botón <strong>Compartir</strong> de Safari y luego{" "}
              <strong>«Añadir a pantalla de inicio»</strong>.
            </p>
          )}
          {showTabs && (
            <nav className="tabs" aria-label="Secciones">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  className={screen === t.id ? "on" : ""}
                  aria-current={screen === t.id ? "page" : undefined}
                  onClick={() => setScreen(t.id)}
                >
                  {t.label}
                </button>
              ))}
            </nav>
          )}
        </header>
      )}

      {screen === "check" && <p className="muted center">Comprobando tu dispositivo…</p>}

      {screen === "setup" && gpu && !gpu.ok && !demo && <NoWebGPU status={gpu} />}

      {screen === "setup" && gpu && (gpu.ok || demo) && (
        <Setup
          prefs={prefs}
          f16={f16}
          mobile={gpu.mobile}
          demo={demo}
          onChange={updatePrefs}
          onStart={(info) => void start(info)}
        />
      )}

      {screen === "loading" && (
        <Loading
          progress={progress}
          error={loadError}
          firstDownload={firstDownload}
          onRetry={() => void start({ cached: !firstDownload })}
          onBack={() => setScreen("setup")}
        />
      )}

      {screen === "chat" && llmRef.current && (
        <Chat
          key={chatKey}
          llm={llmRef.current.llm}
          character={character}
          level={prefs.level}
          rate={prefs.rate}
          onRateChange={(rate) => updatePrefs({ rate })}
          onEnd={endChat}
          demo={demo}
        />
      )}

      {screen === "summary" && ended && llmRef.current && (
        <EndOfSession
          llm={llmRef.current.llm}
          character={character}
          level={prefs.level}
          messages={ended.messages}
          startedAt={ended.startedAt}
          onNew={openChat}
          onHistory={() => setScreen("history")}
        />
      )}

      {screen === "history" && <History />}
      {screen === "vocab" && <Vocab rate={prefs.rate} />}
    </div>
  );
}
