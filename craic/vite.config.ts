import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// BASE_PATH permite publicar en una subcarpeta (p. ej. GitHub Pages: /nombre-repo/).
const base = process.env.BASE_PATH ?? "/";

export default defineConfig({
  base,
  plugins: [react()],
  worker: { format: "es" },
  build: { target: "es2022", chunkSizeWarningLimit: 8000 },
});
