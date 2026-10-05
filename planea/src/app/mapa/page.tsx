import type { Metadata } from "next";
import { GoingProvider } from "@/components/GoingProvider";
import { SpainMap } from "@/components/SpainMap";

export const metadata: Metadata = {
  title: "Mapa de discotecas, bares y zonas de ambiente de España",
  description: "Todas las discotecas, bares de copas y calles con ambiente de España en un mapa, con la gente que va esta noche.",
  alternates: { canonical: "/mapa" },
};

export default function MapPage() {
  return (
    <GoingProvider>
      <h1 className="sr-only">Mapa de España</h1>
      <SpainMap />
    </GoingProvider>
  );
}
