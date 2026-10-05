import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "PLANEA — ¿A dónde vas esta noche?",
    short_name: "PLANEA",
    description: "Discotecas, bares y zonas de ambiente de toda España. Di a dónde vas esta noche.",
    start_url: "/",
    display: "standalone",
    background_color: "#09090d",
    theme_color: "#09090d",
    lang: "es",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}
