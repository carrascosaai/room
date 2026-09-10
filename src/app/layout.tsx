import type { Metadata, Viewport } from "next";
import "./globals.css";
import { I18nProvider } from "@/i18n";
import en from "@/i18n/en.json";

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: en.seo.title,
    template: "%s — ROOM",
  },
  description: en.seo.description,
  applicationName: "ROOM",
  openGraph: {
    title: en.seo.title,
    description: en.seo.description,
    siteName: "ROOM",
    type: "website",
    images: ["/og.svg"],
  },
  twitter: {
    card: "summary_large_image",
    title: en.seo.title,
    description: en.seo.description,
    images: ["/og.svg"],
  },
  icons: {
    icon: "/favicon.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#08080a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="room-grain">
        <I18nProvider>
          <div className="relative z-10 mx-auto flex min-h-[100dvh] w-full max-w-[520px] flex-col">
            {children}
          </div>
        </I18nProvider>
      </body>
    </html>
  );
}
