import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import App from "./App";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Service worker: con una versión nueva publicada, se activa y la página se
// recarga sola (en vez de seguir mostrando la versión antigua de la caché).
if ("serviceWorker" in navigator) {
  const update = registerSW({
    immediate: true,
    onRegisteredSW(_url, reg) {
      if (reg) setInterval(() => void reg.update().catch(() => undefined), 30 * 60 * 1000);
    },
  });
  void update;
}
