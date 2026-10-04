import Link from "next/link";
import { ArrowRight, Map } from "lucide-react";
import { CitySearch } from "@/components/CitySearch";
import { TopTonight } from "@/components/TopTonight";
import { listCities } from "@/lib/data";

export const revalidate = 3600;

export default async function Home() {
  const cities = await listCities();
  const featured = cities.filter((c) => c.curated).slice(0, 24);
  const totalPlaces = cities.reduce((s, c) => s + c.n, 0);
  const lite = cities.map(({ slug, name, region, lat, lng, n }) => ({ slug, name, region, lat, lng, n }));

  return (
    <main className="mx-auto max-w-6xl px-4">
      <section className="relative pt-10 pb-8 sm:pt-16">
        <p className="inline-flex items-center gap-2 rounded-full border border-line px-3 py-1 text-xs text-muted">
          <span className="size-1.5 animate-pulse-dot rounded-full bg-live" /> {totalPlaces.toLocaleString("es-ES")} sitios en {cities.length.toLocaleString("es-ES")} ciudades y pueblos
        </p>
        <h1 className="mt-4 max-w-3xl font-display text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl">
          ¿A dónde vas <span className="text-lime">esta noche</span>?
        </h1>
        <p className="mt-3 max-w-2xl text-base text-muted sm:text-lg">
          Discotecas, bares de copas y las calles con más ambiente de toda España. Pulsa <strong className="text-ink">Voy</strong> y mira a dónde va la gente. Sin registro, sin email; el nombre es opcional.
        </p>
        <div className="mt-6 max-w-2xl">
          <CitySearch cities={lite} />
        </div>
        <Link href="/mapa" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-lime hover:underline">
          <Map size={16} /> Ver el mapa de toda España <ArrowRight size={15} />
        </Link>
      </section>

      <section className="mt-4">
        <h2 className="font-display text-2xl font-bold">🔥 Lo más petado esta noche</h2>
        <p className="mb-3 text-sm text-muted">Según los &quot;Voy&quot; de la gente, en directo.</p>
        <TopTonight />
      </section>

      <section className="mt-10">
        <div className="flex items-end justify-between gap-4">
          <h2 className="font-display text-2xl font-bold">Ciudades con más ambiente</h2>
          <Link href="/ciudades" className="shrink-0 text-sm font-medium text-muted hover:text-ink">
            Todas →
          </Link>
        </div>
        <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {featured.map((c) => (
            <li key={c.slug}>
              <Link href={`/${c.slug}`} className="block rounded-2xl border border-line bg-surface p-4 transition-colors hover:border-lime/50">
                <span className="block font-display text-lg font-bold leading-tight">{c.name}</span>
                <span className="mt-1 block text-xs text-dim">
                  {c.region} · {c.n} sitios
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
