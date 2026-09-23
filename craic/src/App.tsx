import { useCallback, useEffect, useRef, useState } from "react";
import { getCharacter } from "./characters";
import { Chat } from "./components/Chat";
import { Loading } from "./components/Loading";
import { NoWebGPU } from "./components/NoWebGPU";
import { Setup } from "./components/Setup";
import { loadWebLLM, requestPersistentStorage, type LLM, type LoadProgress } from "./llm/engine";
import { toAppError, type AppError } from "./llm/errors";
import { createMockEngine } from "./llm/mockEngine";
import { MODEL_OPTIONS, modelIdFor } from "./llm/models";
import { loadPrefs, savePrefs, type Prefs } from "./lib/prefs";
import { checkWebGPU, type WebGPUStatus } from "./lib/webgpu";
import { unlockTTS } from "./speech/tts";

type Screen = "check" | "setup" | "loading" | "chat";

const demo = new URLSearchParams(location.search).has("demo");

export default function App() {
  const [prefs, setPrefs] = useState<Prefs>(loadPrefs);
  const [gpu, setGpu] = useState<WebGPUStatus | null>(null);
  const [screen, setScreen] = useState<Screen>("check");
  const [progress, setProgress] = useState<LoadProgress | null>(null);
  const [loadError, setLoadError] = useState<AppError | null>(null);
  const [firstDownload, setFirstDownload] = useState(false);
  const [chatKey, setChatKey] = useState(0);
  const llmRef = useRef<{ id: string; llm: LLM } | null>(null);

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

  const start = useCallback(
    async ({ cached }: { cached: boolean }) => {
      unlockTTS();
      if (demo) {
        llmRef.current = { id: "demo", llm: createMockEngine() };
        setChatKey((k) => k + 1);
        setScreen("chat");
        return;
      }
      let id = modelIdFor(prefs.tier, f16);
      if (llmRef.current?.id === id) {
        setChatKey((k) => k + 1);
        setScreen("chat");
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
        setChatKey((k) => k + 1);
        setScreen("chat");
      } catch (err) {
        console.error(err);
        setLoadError(toAppError(err));
      }
    },
    [prefs.tier, f16],
  );

  return (
    <div className="app" data-theme={prefs.theme}>
      {screen !== "chat" && (
        <header className="top">
          <h1>
            <span className="logo" aria-hidden="true">☘</span> Craic
          </h1>
          <p className="muted">Practica inglés hablando con una IA. Gratis y en tu dispositivo.</p>
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
          character={getCharacter(prefs.characterId)}
          level={prefs.level}
          rate={prefs.rate}
          onRateChange={(rate) => updatePrefs({ rate })}
          onEnd={() => setScreen("setup")}
          demo={demo}
        />
      )}
    </div>
  );
}
