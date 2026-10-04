import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CityView } from "@/components/CityView";
import { GoingProvider } from "@/components/GoingProvider";
import { getCity, listCities, listPlaces } from "@/lib/data";
import { KINDS } from "@/lib/kinds";

export const revalidate = 3600;

/** Se prerenderizan las ciudades con más oferta; el resto se genera la primera vez que alguien entra. */
export async function generateStaticParams() {
  const cities = await listCities();
  return cities.filter((c) => c.curated || c.n >= 5).map((c) => ({ city: c.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ city: string }> }): Promise<Metadata> {
  const { city: slug } = await params;
  const city = await getCity(slug);
  if (!city) return {};
  return {
    title: `Discotecas, bares y zonas de marcha en ${city.name}`,
    description: `Dónde salir esta noche en ${city.name}: las mejores discotecas, bares de copas y calles con ambiente según la gente. Mira a dónde van y di a dónde vas tú.`,
    alternates: { canonical: `/${city.slug}` },
  };
}

export default async function CityPage({ params }: { params: Promise<{ city: string }> }) {
  const { city: slug } = await params;
  const city = await getCity(slug);
  if (!city) notFound();
  const places = await listPlaces(slug);
  const zones = places.filter((p) => p.kind === "zona");

  return (
    <GoingProvider city={city.slug}>
      <main className="mx-auto max-w-6xl px-4 pt-6">
        <p className="text-sm text-dim">{city.region}</p>
        <h1 className="font-display text-3xl font-extrabold leading-tight sm:text-5xl">Esta noche en {city.name}</h1>
        <p className="mt-2 max-w-2xl text-muted">
          {places.length} sitios: {places.filter((p) => p.kind === "discoteca").length} discotecas, {places.filter((p) => p.kind === "bar" || p.kind === "sala").length} bares y salas
          {zones.length > 0 && ` y ${zones.length} zonas de ambiente`}. Pulsa <strong className="text-lime">Voy</strong> en el sitio al que vas.
        </p>
        {zones.length > 0 && (
          <p className="mt-3 flex flex-wrap gap-1.5 text-sm">
            <span className="text-dim">{KINDS.zona.emoji} Dónde está el ambiente:</span>
            {zones.slice(0, 6).map((z) => (
              <span key={z.id} className="rounded-full bg-hot/10 px-2.5 py-0.5 font-medium text-[#ff9ab6]">
                {z.name}
              </span>
            ))}
          </p>
        )}
        <div className="mt-6">
          <CityView city={city} places={places} />
        </div>
      </main>
    </GoingProvider>
  );
}
