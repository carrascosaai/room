import { t } from "../i18n";
import type { WebGPUStatus } from "../lib/webgpu";

export function NoWebGPU({ status }: { status: Extract<WebGPUStatus, { ok: false }> }) {
  return (
    <div className="card warn-card">
      <h2>{t("Tu navegador no puede ejecutar la IA")}</h2>
      <p>
        {status.reason === "insecure"
          ? t("La página se ha abierto sin HTTPS. WebGPU solo funciona en páginas seguras (https://) o en localhost. Abre la versión publicada de la app.")
          : status.reason === "no-api"
            ? t("Esta app ejecuta el modelo de lenguaje dentro de tu dispositivo con WebGPU, y este navegador no lo tiene disponible.")
            : t("El navegador tiene WebGPU, pero no ha encontrado una GPU compatible (puede estar desactivada o en la lista de bloqueo del navegador). Prueba a actualizar el navegador y los drivers.")}
      </p>
      <h3>{t("Qué usar")}</h3>
      <ul>
        <li>{t("Ordenador: Chrome o Edge actualizados (Windows, macOS, ChromeOS).")}</li>
        <li>{t("Android: Chrome actualizado, Android 12 o superior.")}</li>
        <li>{t("iPhone / iPad: Safari con iOS / iPadOS 26 o superior.")}</li>
      </ul>
      <p className="muted small">
        <a href="?demo">{t("Ver la app en modo demo")}</a>
      </p>
    </div>
  );
}
