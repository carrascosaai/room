import type { Metadata, Viewport } from "next";
import { Header } from "@/components/Header";
import { ToastProvider } from "@/components/Toasts";
import { SITE_NAME, SITE_URL } from "@/lib/config";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "PLANEA — ¿A dónde vas esta noche?",
    template: `%s · ${SITE_NAME}`,
  },
  description:
    "Todas las discotecas, bares de copas y calles de ambiente de España en un mapa. Di a dónde vas esta noche y mira a dónde va la gente. Sin registro.",
  applicationName: SITE_NAME,
  keywords: ["discotecas", "bares de copas", "zonas de marcha", "salir de fiesta", "ocio nocturno", "España", "dónde salir hoy"],
  openGraph: {
    type: "website",
    locale: "es_ES",
    siteName: SITE_NAME,
    title: "PLANEA — ¿A dónde vas esta noche?",
    description: "Discotecas, bares y zonas de ambiente de toda España. Di a dónde vas, sin registro.",
  },
  twitter: { card: "summary_large_image" },
  appleWebApp: { capable: true, title: SITE_NAME, statusBarStyle: "black-translucent" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#09090d",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <ToastProvider>
          <Header />
          {children}
          <footer className="mx-auto max-w-6xl px-4 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-10 text-xs leading-relaxed text-dim">
            Datos de locales: selección propia a partir de opiniones, rankings y redes sociales + discotecas de{" "}
            <a className="underline" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">
              OpenStreetMap
            </a>{" "}
            (ODbL). Horarios y aperturas pueden cambiar: confirma antes de ir. Los &quot;Voy&quot; se reinician cada día a las 8:00.
          </footer>
        </ToastProvider>
      </body>
    </html>
  );
}
