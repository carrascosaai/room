import type { Metadata, Viewport } from "next";
import { AppProvider } from "@/components/providers/AppProvider";
import { SITE_NAME, SITE_URL } from "@/lib/config";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "PLANEA — ¿Qué hacemos hoy?",
    template: `%s · ${SITE_NAME}`,
  },
  description:
    "Descubre qué está pasando cerca de ti: discotecas, bares de copas, conciertos, fiestas universitarias y planes de la gente de tu ciudad.",
  applicationName: SITE_NAME,
  keywords: ["ocio nocturno", "qué hacer hoy", "discotecas", "bares de copas", "conciertos", "fiestas universitarias", "planes"],
  openGraph: {
    type: "website",
    locale: "es_ES",
    siteName: SITE_NAME,
    title: "PLANEA — ¿Qué hacemos hoy?",
    description: "Descubre qué está pasando cerca de ti esta noche.",
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
        <AppProvider>{children}</AppProvider>
      </body>
    </html>
  );
}
