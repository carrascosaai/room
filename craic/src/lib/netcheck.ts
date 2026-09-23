// Diagnóstico de conexión: los modelos se descargan de huggingface.co y
// algunas redes (universidades, empresas) lo bloquean o lo ralentizan.

export type NetStatus = "ok" | "slow" | "blocked" | "offline";

export async function checkModelHost(timeoutMs = 8000): Promise<NetStatus> {
  if (typeof navigator !== "undefined" && navigator.onLine === false) return "offline";
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  const t0 = performance.now();
  try {
    const res = await fetch(
      "https://huggingface.co/mlc-ai/Llama-3.2-1B-Instruct-q4f16_1-MLC/resolve/main/mlc-chat-config.json",
      { cache: "no-store", signal: ctrl.signal },
    );
    if (!res.ok) return "blocked";
    await res.text();
    return performance.now() - t0 > 4000 ? "slow" : "ok";
  } catch {
    return ctrl.signal.aborted ? "slow" : "blocked";
  } finally {
    clearTimeout(timer);
  }
}

export const NET_TEXT: Record<NetStatus, string> = {
  ok: "La conexión con el servidor de modelos funciona.",
  slow:
    "No hay respuesta de huggingface.co, donde están los modelos. Algunas redes (Wi-Fi de la universidad o del trabajo, VPN, bloqueadores) lo bloquean o lo frenan. Prueba con datos móviles u otra Wi-Fi y recarga.",
  blocked:
    "No se puede conectar con huggingface.co, donde están los modelos. Algunas redes (la Wi-Fi de la universidad o del trabajo, bloqueadores de anuncios, VPN) lo bloquean. Prueba con datos móviles u otra Wi-Fi.",
  offline: "No tienes conexión a internet. La primera vez hace falta para descargar los modelos.",
};
