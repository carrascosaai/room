import { t } from "../i18n";
import { useState } from "react";
import { shareApp } from "../lib/share";

/** Botón «Compartir»: abre el menú de compartir del móvil o copia el enlace. */
export function ShareButton({ className = "btn-ghost", label = t("Compartir Craic") }: { className?: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className={className}
      onClick={async () => {
        if ((await shareApp()) === "copied") {
          setCopied(true);
          setTimeout(() => setCopied(false), 2500);
        }
      }}
    >
      {copied ? t("✓ Enlace copiado") : `📤 ${label}`}
    </button>
  );
}
