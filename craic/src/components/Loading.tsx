import { t } from "../i18n";
import { useEffect, useRef, useState } from "react";
import type { Character } from "../characters";
import { collectDiagnostics, hasOtherTabs } from "../lib/diagnostics";
import { checkModelHost, NET_TEXT, type NetStatus } from "../lib/netcheck";
import type { AppError } from "../llm/errors";
import type { LoadProgress } from "../llm/engine";
import type { Prefs } from "../lib/prefs";
import { useAudioModels, type ModelState } from "../speech/audioModels";
import { Flag } from "./Brand";

function describe(text: string): string {
  if (/fetching|download/i.test(text)) {
    const mb = text.match(/(\d+)\s*MB fetched/i)?.[1];
    return mb ? t("Descargando… {mb} MB", { mb }) : t("Descargando…");
  }
  if (/from cache/i.test(text)) return t("Cargando desde tu dispositivo…");
  if (/start to fetch|param/i.test(text)) return t("Abriendo el modelo…");
  if (/shader|gpu/i.test(text)) return t("Preparando la GPU…");
  if (/finish/i.test(text)) return t("Lista");
  return t("Preparando…");
}

function Row({ label, value, state, text }: { label: string; value: number; state: ModelState | "llm"; text: string }) {
  const pct = Math.round(value * 100);
  return (
    <div className="load-row">
      <div className="load-head">
        <strong>{label}</strong>
        <span className="muted small">{state === "ready" ? t("✓ Lista") : state === "error" ? t("No disponible") : text}</span>
      </div>
      <div className="progress" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
        <div className="progress-bar" style={{ width: `${Math.max(pct, 2)}%` }} />
      </div>
    </div>
  );
}

interface Props {
  character: Character;
  prefs: Prefs;
  progress: LoadProgress | null;
  error: AppError | null;
  firstDownload: boolean;
  needTTS: boolean;
  /** La IA ya está lista; solo se espera a la voz / el oído */
  llmReady: boolean;
  onSkip: () => void;
  onRetry: () => void;
  onRedownload: () => void;
  onSwitchModel: () => void;
  onBack: () => void;
  cloudOk: boolean;
  cloud: boolean;
  onUseCloud: () => void;
}

function DiagnosticsButton() {
  const [state, setState] = useState<"idle" | "copied" | "shown">("idle");
  const [text, setText] = useState("");
  return (
    <>
      <button
        className="btn-ghost btn-small"
        onClick={async () => {
          const d = await collectDiagnostics();
          setText(d);
          try {
            await navigator.clipboard.writeText(d);
            setState("copied");
          } catch {
            setState("shown");
          }
        }}
      >
        {state === "copied" ? t("✓ Diagnóstico copiado") : t("Copiar diagnóstico")}
      </button>
      {state !== "idle" && <pre className="diag">{text}</pre>}
    </>
  );
}

const STALL_MS = 20000;

export function Loading({
  character,
  prefs,
  progress,
  error,
  firstDownload,
  needTTS,
  llmReady,
  onSkip,
  onRetry,
  onRedownload,
  onSwitchModel,
  onBack,
  cloudOk,
  cloud,
  onUseCloud,
}: Props) {
  const audio = useAudioModels();
  // Vigilante: si nada avanza en 20 s, se diagnostica la conexión.
  const lastChange = useRef(Date.now());
  const [stalled, setStalled] = useState(false);
  const [net, setNet] = useState<NetStatus | "checking" | null>(null);
  const signature = `${progress?.progress}|${progress?.text}|${audio.ttsProgress}|${audio.asrProgress}|${audio.tts}|${audio.asr}|${llmReady}`;
  useEffect(() => {
    lastChange.current = Date.now();
    setStalled(false);
  }, [signature]);
  useEffect(() => {
    const id = setInterval(() => {
      if (!stalled && Date.now() - lastChange.current > STALL_MS) {
        setStalled(true);
        setNet("checking");
        void checkModelHost().then(setNet);
      }
    }, 2000);
    return () => clearInterval(id);
  }, [stalled]);
  if (error) {
    return (
      <div className="card warn-card">
        <h2>{t(error.title)}</h2>
        <p>{t(error.detail)}</p>
        {error.raw && (
          <details className="muted">
            <summary>{t("Detalle técnico")}</summary>
            <code className="raw">{error.raw}</code>
          </details>
        )}
        <div className="actions">
          <button className="btn-dark" onClick={onRetry}>
            {t("Reintentar")}
          </button>
          {(error.kind === "stall" || error.kind === "unknown") && (
            <button className="btn-ghost" onClick={onRedownload}>
              {t("Borrar el modelo y descargarlo de nuevo")}
            </button>
          )}
          {cloudOk && !cloud && (
            <button className="btn-dark" onClick={onUseCloud}>
              {t("Usar la IA en la nube (rápida)")}
            </button>
          )}
          {(error.kind === "stall" || error.kind === "memory") && (
            <button className="btn-ghost" onClick={onSwitchModel}>
              {t("Probar el otro modelo")}
            </button>
          )}
          <button className="btn-ghost" onClick={onBack}>
            {t("Volver")}
          </button>
        </div>
        {hasOtherTabs() && <p className="note note-warn">{t("Tienes Craic abierto en otra pestaña: ciérrala, puede estar bloqueando la GPU.")}</p>}
        <div className="actions">
          <DiagnosticsButton />
        </div>
        <p className="muted tiny">{t("versión")} {__APP_VERSION__}</p>
      </div>
    );
  }
  return (
    <div className="card calling">
      <div className="calling-avatar">
        <Flag code={character.flag} size={88} />
        <span className="calling-pulse" />
      </div>
      <h2>{t("Llamando a {name}…", { name: character.name.split(" ")[0] })}</h2>
      <p className="muted small">{firstDownload ? t("Primera vez: preparando todo en tu dispositivo") : t("Cargando desde tu dispositivo")}</p>
      <Row
        label={cloud ? t("Cerebro (IA en la nube)") : t("Cerebro (IA)")}
        value={llmReady || cloud ? 1 : (progress?.progress ?? 0)}
        state={llmReady || cloud ? "ready" : "llm"}
        text={describe(progress?.text ?? "")}
      />
      {needTTS && (
        <Row label={t("Voz natural")} value={audio.ttsProgress} state={audio.tts} text={`${Math.round(audio.ttsProgress * 100)}%`} />
      )}
      {prefs.asrEngine === "local" && (
        <Row label={t("Oído")} value={audio.asrProgress} state={audio.asr} text={`${Math.round(audio.asrProgress * 100)}%`} />
      )}
      {progress?.text && !cloud && (
        <p className="muted tiny raw-progress" title={progress.text}>
          {progress.text.slice(0, 120)}
        </p>
      )}
      {stalled && (
        <div className="note note-warn stall">
          <strong>{t("Esto está tardando más de lo normal.")}</strong>
          <p>
            {net === "checking" || net === null
              ? t("Comprobando la conexión…")
              : net === "ok"
                ? t("La conexión funciona, así que puede ser que el navegador se haya quedado bloqueado. Recarga la página; lo ya descargado se conserva.")
                : t(NET_TEXT[net])}
          </p>
          {hasOtherTabs() && <p>{t("Tienes Craic abierto en otra pestaña: ciérrala, puede estar bloqueando la GPU.")}</p>}
          <div className="actions">
            <button className="btn-dark btn-small" onClick={() => location.reload()}>
              {t("Recargar")}
            </button>
            <DiagnosticsButton />
            {llmReady && (
              <button className="btn-ghost btn-small" onClick={onSkip}>
                {t("Empezar sin voz natural")}
              </button>
            )}
            {cloudOk && !cloud && (
              <button className="btn-ghost btn-small" onClick={onUseCloud}>
                {t("Usar la IA en la nube")}
              </button>
            )}
          </div>
        </div>
      )}
      {llmReady && (
        <button className="btn-ghost skip-btn" onClick={onSkip}>
          {t("Empezar ya (voz provisional mientras termina)")}
        </button>
      )}
      {firstDownload && (
        <p className="muted small">
          {t("Solo se descarga la primera vez; después carga en segundos y funciona sin conexión. No cierres la app. La llamada empieza en cuanto todo esté listo.")}
        </p>
      )}
    </div>
  );
}
