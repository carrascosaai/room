import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

// BASE_PATH permite publicar en una subcarpeta (p. ej. GitHub Pages: /nombre-repo/).
const base = process.env.BASE_PATH ?? "/";

// Aislamiento entre orígenes: permite a los modelos de voz usar varios hilos
// (SharedArrayBuffer). Todo lo externo se pide con CORS, así que no se rompe nada.
const isolation = {
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Embedder-Policy": "require-corp",
};

const version = new Date().toISOString().slice(0, 16).replace("T", " ");

export default defineConfig({
  base,
  define: { __APP_VERSION__: JSON.stringify(version) },
  server: { headers: isolation },
  preview: { headers: isolation },
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      // Se registra desde main.tsx para recargar sola al publicar una versión nueva.
      injectRegister: false,
      includeAssets: ["favicon.svg", "apple-touch-icon.png"],
      manifest: {
        name: "Craic · Practica inglés hablando",
        short_name: "Craic",
        description: "Aprende inglés hablando por llamada con una IA. 18 acentos, correcciones en español. Gratis y sin registro.",
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
        // Solo lo imprescindible se descarga al entrar (unos 400 KB). Los motores
        // pesados (IA local ~12 MB, voz y oído) se guardan la primera vez que se
        // usan: con la IA en la nube la mayoría de gente nunca los descarga.
        globPatterns: ["**/*.{js,css,html,svg,png,webmanifest}"],
        globIgnores: ["**/og.png", "**/*.worker-*.js", "**/lib-*.js"],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        navigateFallback: "index.html",
        navigateFallbackDenylist: [/^\/api\//],
        cleanupOutdatedCaches: true,
        // El runtime ONNX (voz y Whisper, ~21 MB) se guarda la primera vez que se usa.
        runtimeCaching: [
          {
            // Archivos con hash (no cambian nunca): se guardan al usarse por primera vez.
            urlPattern: ({ url }) => url.pathname.startsWith("/assets/"),
            handler: "CacheFirst",
            options: { cacheName: "craic-assets", expiration: { maxEntries: 40, purgeOnQuotaError: true } },
          },
          {
            urlPattern: ({ url }) => url.pathname.includes("/ort/"),
            handler: "CacheFirst",
            options: { cacheName: "craic-ort", expiration: { maxEntries: 6 } },
          },
        ],
      },
    }),
  ],
  worker: { format: "es" },
  build: { target: "es2022", chunkSizeWarningLimit: 8000 },
});
