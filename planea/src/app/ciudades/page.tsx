import type { Metadata } from "next";
import Link from "next/link";
import { CitySearch } from "@/components/CitySearch";
import { listCities } from "@/lib/data";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Ciudades y pueblos",
  description: "Discotecas, bares y zonas de ambiente en todas las ciudades y pueblos de España.",
};

export default async function CitiesPage() {
  const cities = await listCities();
  const byRegion = new Map<string, typeof cities>();
  for (const c of cities) {
    const r = c.region ?? "Otros";
    byRegion.set(r, [...(byRegion.get(r) ?? []), c]);
  }
  const regions = [...byRegion.entries()].sort((a, b) => a[0].localeCompare(b[0], "es"));
  const lite = cities.map(({ slug, name, region, lat, lng, n }) => ({ slug, name, region, lat, lng, n }));

  return (
    <main className="mx-auto max-w-6xl px-4 pt-8">
      <h1 className="font-display text-3xl font-extrabold sm:text-4xl">Ciudades y pueblos</h1>
      <p className="mt-1 text-muted">{cities.length.toLocaleString("es-ES")} sitios con discotecas, bares o zonas de ambiente.</p>
      <div className="mt-5 max-w-2xl">
        <CitySearch cities={lite} />
      </div>
      <div className="mt-8 space-y-8">
        {regions.map(([region, list]) => (
          <section key={region}>
            <h2 className="font-display text-xl font-bold">{region}</h2>
            <ul className="mt-2 flex flex-wrap gap-2">
              {list
                .sort((a, b) => Number(b.curated) - Number(a.curated) || b.n - a.n || a.name.localeCompare(b.name, "es"))
                .map((c) => (
                  <li key={c.slug}>
                    <Link
                      href={`/${c.slug}`}
                      className={
                        c.curated
                          ? "inline-flex rounded-full border border-lime/40 bg-lime/10 px-3 py-1.5 text-sm font-semibold text-ink hover:bg-lime/20"
                          : "inline-flex rounded-full border border-line px-3 py-1.5 text-sm text-muted hover:text-ink"
                      }
                    >
                      {c.name} <span className="ml-1.5 text-dim">{c.n}</span>
                    </Link>
                  </li>
                ))}
            </ul>
          </section>
        ))}
      </div>
    </main>
  );
}
