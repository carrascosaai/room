import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

// BASE_PATH permite publicar en una subcarpeta (p. ej. GitHub Pages: /nombre-repo/).
const base = process.env.BASE_PATH ?? "/";

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "auto",
      includeAssets: ["favicon.svg", "apple-touch-icon.png"],
      manifest: {
        name: "Craic · Practica inglés hablando",
        short_name: "Craic",
        description: "Practica inglés hablando con una IA que se ejecuta en tu dispositivo. Gratis, sin cuentas.",
        lang: "es",
        start_url: ".",
        scope: ".",
        display: "standalone",
        orientation: "portrait",
        background_color: "#0f1413",
        theme_color: "#1a8f5f",
        categories: ["education"],
        icons: [
          { src: "pwa-192.png", sizes: "192x192", type: "image/png" },
          { src: "pwa-512.png", sizes: "512x512", type: "image/png" },
          { src: "maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        // La app completa (incluida la librería WebLLM, ~6 MB) queda en caché
        // para funcionar sin conexión. Los pesos del modelo los guarda WebLLM
        // en su propia caché, no el service worker.
        globPatterns: ["**/*.{js,css,html,svg,png,webmanifest}"],
        maximumFileSizeToCacheInBytes: 15 * 1024 * 1024,
        navigateFallback: "index.html",
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  worker: { format: "es" },
  build: { target: "es2022", chunkSizeWarningLimit: 8000 },
});
