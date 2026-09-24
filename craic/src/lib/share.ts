// Compartir la app: menú nativo del móvil (WhatsApp, TikTok, Instagram…) o,
// si no existe, copiar el enlace.
export const SHARE_URL = "https://craic.vercel.app";
export const SHARE_TEXT =
  "Estoy practicando inglés hablando por llamada con una IA: 18 acentos (Irlanda, Liverpool, Escocia, Texas, Australia…) y te corrige en español. Es GRATIS y sin registrarse 👉";

export async function shareApp(): Promise<"shared" | "copied" | "cancelled"> {
  const data = { title: "Craic · Aprende inglés hablando gratis", text: SHARE_TEXT, url: SHARE_URL };
  try {
    if (navigator.share) {
      await navigator.share(data);
      return "shared";
    }
  } catch (err) {
    if ((err as Error)?.name === "AbortError") return "cancelled";
  }
  try {
    await navigator.clipboard.writeText(`${SHARE_TEXT} ${SHARE_URL}`);
    return "copied";
  } catch {
    window.prompt("Copia el enlace:", SHARE_URL);
    return "copied";
  }
}
