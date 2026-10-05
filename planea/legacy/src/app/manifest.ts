import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "PLANEA — ¿Qué hacemos hoy?",
    short_name: "PLANEA",
    description: "Descubre qué está pasando cerca de ti esta noche.",
    start_url: "/ciudades",
    display: "standalone",
    background_color: "#09090d",
    theme_color: "#09090d",
    lang: "es",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}
