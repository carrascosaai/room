import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  outputFileTracingRoot: dirname(fileURLToPath(import.meta.url)),
  // Taimo (app de gastos) se publica como web estática en public/taimo: cualquier
  // ruta suya (/taimo/pay, /taimo/groups…) abre su index.html.
  async rewrites() {
    return [{ source: "/taimo/:path*", destination: "/taimo/index.html" }];
  },
};

export default nextConfig;
