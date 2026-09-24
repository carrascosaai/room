import { t } from "../i18n";
// Compartir la app: menú nativo del móvil (WhatsApp, TikTok, Instagram…) o,
// si no existe, copiar el enlace.
export const SHARE_URL = "https://craic.vercel.app";
export const shareText = () =>
  t("Estoy practicando idiomas hablando por llamada con una IA: acentos de Irlanda, Liverpool, Texas, Australia, París, Quebec… y te corrige en tu idioma. Es GRATIS y sin registrarse 👉");

export async function shareApp(): Promise<"shared" | "copied" | "cancelled"> {
  const data = { title: t("Craic · Aprende inglés y francés hablando gratis"), text: shareText(), url: SHARE_URL };
  try {
    if (navigator.share) {
      await navigator.share(data);
      return "shared";
    }
  } catch (err) {
    if ((err as Error)?.name === "AbortError") return "cancelled";
  }
  try {
    await navigator.clipboard.writeText(`${shareText()} ${SHARE_URL}`);
    return "copied";
  } catch {
    window.prompt(t("Copia el enlace:"), SHARE_URL);
    return "copied";
  }
}
