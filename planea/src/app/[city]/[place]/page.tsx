import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, Navigation, Star } from "lucide-react";
import { GoingButton, GoingLine } from "@/components/GoingButton";
import { GoingProvider } from "@/components/GoingProvider";
import { PlaceMap } from "@/components/map/PlaceMap";
import { getCity, getPlace, listPlaces } from "@/lib/data";
import { directionsUrl, KINDS } from "@/lib/kinds";
import { placeHref } from "@/lib/slug";

export const revalidate = 3600;

/** Las fichas se generan la primera vez que alguien las visita y quedan cacheadas (ISR). */
export async function generateStaticParams() {
  return [];
}

type Params = Promise<{ city: string; place: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { city: c, place: s } = await params;
  const [city, place] = await Promise.all([getCity(c), getPlace(c, s)]);
  if (!city || !place) return {};
  return {
    title: `${place.name} (${city.name})`,
    description: place.note ?? `${KINDS[place.kind].label} en ${city.name}. Mira cuánta gente va esta noche y di si vas tú.`,
    alternates: { canonical: placeHref(place) },
  };
}

export default async function PlacePage({ params }: { params: Params }) {
  const { city: c, place: s } = await params;
  const [city, place] = await Promise.all([getCity(c), getPlace(c, s)]);
  if (!city || !place) notFound();
  const k = KINDS[place.kind];
  const nearby = (await listPlaces(c))
    .filter((p) => p.id !== place.id)
    .map((p) => ({ p, d: Math.hypot(p.lat - place.lat, (p.lng - place.lng) * Math.cos((place.lat * Math.PI) / 180)) }))
    .sort((a, b) => a.d - b.d)
    .slice(0, 6)
    .map((x) => x.p);

  return (
    <GoingProvider city={city.slug}>
      <main className="mx-auto max-w-3xl px-4 pt-6">
        <Link href={`/${city.slug}`} className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink">
          <ArrowLeft size={16} /> {city.name}
        </Link>
        <div className="mt-3 flex items-start gap-4">
          <span className="grid size-16 shrink-0 place-items-center rounded-2xl text-4xl" style={{ background: `${k.color}1f`, boxShadow: `inset 0 0 0 1px ${k.color}55` }}>
            {k.emoji}
          </span>
          <div className="min-w-0">
            <p className="text-sm text-dim">
              {k.label} · {city.name}
            </p>
            <h1 className="font-display text-3xl font-extrabold leading-tight sm:text-4xl">{place.name}</h1>
            {place.top && (
              <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-amber/15 px-2 py-0.5 text-xs font-semibold text-amber">
                <Star size={12} fill="currentColor" /> Recomendado por la gente
              </span>
            )}
          </div>
        </div>
        {place.note && <p className="mt-4 text-lg text-muted">{place.note}</p>}
        {place.address && <p className="mt-2 text-sm text-dim">📍 {place.address}</p>}

        <div className="mt-5 rounded-card border border-line bg-surface p-4">
          <GoingLine id={place.id} className="!text-sm" />
          <div className="mt-3 flex flex-wrap gap-2">
            <GoingButton id={place.id} city={place.city} name={place.name} size="lg" />
            <a
              href={directionsUrl(place)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-12 items-center gap-1.5 rounded-full border border-line-strong px-5 font-medium text-muted hover:text-ink"
            >
              <Navigation size={17} /> Cómo llegar
            </a>
            {place.website && (
              <a href={place.website} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex h-12 items-center gap-1.5 rounded-full border border-line-strong px-5 font-medium text-muted hover:text-ink">
                <ExternalLink size={17} /> Web
              </a>
            )}
          </div>
        </div>

        <div className="relative mt-5 h-72 overflow-hidden rounded-card border border-line">
          <PlaceMap place={place} nearby={nearby} />
        </div>

        {nearby.length > 0 && (
          <section className="mt-8">
            <h2 className="font-display text-xl font-bold">Cerca de aquí</h2>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {nearby.map((p) => (
                <li key={p.id}>
                  <Link href={placeHref(p)} className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-3 hover:border-line-strong">
                    <span className="text-2xl">{KINDS[p.kind].emoji}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">{p.name}</span>
                      <GoingLine id={p.id} />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </GoingProvider>
  );
}
