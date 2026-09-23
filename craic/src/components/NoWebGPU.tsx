import type { WebGPUStatus } from "../lib/webgpu";

export function NoWebGPU({ status }: { status: Extract<WebGPUStatus, { ok: false }> }) {
  return (
    <div className="card warn-card">
      <h2>Tu navegador no puede ejecutar la IA</h2>
      {status.reason === "insecure" ? (
        <p>
          La página se ha abierto sin HTTPS. WebGPU solo funciona en páginas seguras (<code>https://</code>) o en{" "}
          <code>localhost</code>. Abre la versión publicada de la app.
        </p>
      ) : status.reason === "no-api" ? (
        <p>
          Esta app ejecuta el modelo de lenguaje <strong>dentro de tu dispositivo</strong> con WebGPU, y este navegador no
          lo tiene disponible.
        </p>
      ) : (
        <p>
          El navegador tiene WebGPU, pero no ha encontrado una GPU compatible (puede estar desactivada o en la lista de
          bloqueo del navegador). Prueba a actualizar el navegador y los drivers.
        </p>
      )}
      <h3>Qué usar</h3>
      <ul>
        <li>
          <strong>Ordenador:</strong> Chrome o Edge actualizados (Windows, macOS, ChromeOS). En Linux puede requerir
          activar WebGPU en <code>chrome://flags</code>.
        </li>
        <li>
          <strong>Android:</strong> Chrome actualizado, Android 12 o superior, con un móvil de gama media-alta
          (4&nbsp;GB de RAM o más).
        </li>
        <li>
          <strong>iPhone / iPad:</strong> Safari con iOS / iPadOS 26 o superior.
        </li>
        <li>
          <strong>Firefox:</strong> soporte de WebGPU todavía parcial según sistema; mejor usa Chrome.
        </li>
      </ul>
      <p className="muted">
        Puedes ver cómo es la app sin IA real en <a href="?demo">modo demo</a>.
      </p>
    </div>
  );
}
