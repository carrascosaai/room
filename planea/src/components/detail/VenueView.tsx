import Link from "next/link";
import { CalendarDays, MapPin } from "lucide-react";
import { categoryOf } from "@/lib/categories";
import { getStats, getVenueRating, listEvents, listPlans, listPosts, listReviews } from "@/lib/data/catalog";
import { eventItem } from "@/lib/feed";
import { venueStatus, weeklyHours } from "@/lib/venue";
import type { City, Venue } from "@/lib/types";
import { priceFromLabel, priceLevelLabel } from "@/lib/utils";
import { RowCard } from "@/components/cards/RowCard";
import { InterestButton } from "@/components/social/InterestButton";
import { HereButton } from "@/components/social/HereButton";
import { WorthVote } from "@/components/social/WorthVote";
import { Salseo } from "@/components/salseo/Salseo";
import { Stars } from "@/components/ui/Stars";
import { DetailHero } from "./DetailHero";
import { InfoGrid, SectionTitle } from "./InfoGrid";
import { PlansHere } from "./PlansHere";
import { Reviews } from "./Reviews";
import { Timeline } from "./Timeline";
import { ViewTracker } from "./ViewTracker";

const SCHEMA_TYPE: Record<string, string> = { discotecas: "NightClub", copas: "BarOrPub", pubs: "BarOrPub", conciertos: "MusicVenue", restaurantes: "Restaurant" };

export async function VenueView({ city, venue }: { city: City; venue: Venue }) {
  const now = new Date();
  const [events, plans, { posts, replies }, reviews, rating] = await Promise.all([
    listEvents(city.slug),
    listPlans(city.slug),
    listPosts("venue", venue.id),
    listReviews(venue.id),
    getVenueRating(venue),
  ]);
  const here = events.filter((e) => e.venueId === venue.id);
  const stats = await getStats([{ type: "venue", id: venue.id }, ...here.map((e) => ({ type: "event" as const, id: e.id })), ...plans.map((p) => ({ type: "plan" as const, id: p.id }))]);
  const s = stats[`venue:${venue.id}`];
  const status = venueStatus(venue.hours, now);
  const cat = categoryOf(venue.category);
  const tonightEvent = status.tonight ? here.find((e) => new Date(e.startsAt) < status.tonight!.to && new Date(e.endsAt) > status.tonight!.from) : undefined;
  const lineup = tonightEvent?.lineup ?? venue.nightly;
  const meta = { category: venue.category, citySlug: city.slug, startsAt: status.tonight?.from.toISOString() };
  const target = { type: "venue" as const, id: venue.id };

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": SCHEMA_TYPE[venue.category] ?? "LocalBusiness",
    name: venue.name,
    description: venue.description,
    address: { "@type": "PostalAddress", addressLocality: city.name, addressRegion: city.region, addressCountry: "ES" },
    geo: { "@type": "GeoCoordinates", latitude: venue.lat, longitude: venue.lng },
    priceRange: priceLevelLabel(venue.priceLevel),
    aggregateRating: rating.count ? { "@type": "AggregateRating", ratingValue: rating.rating, reviewCount: rating.count } : undefined,
  };

  return (
    <main className="mx-auto max-w-2xl px-4">
      <ViewTracker target={target} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <DetailHero seed={venue.id} category={venue.category} imageUrl={venue.imageUrl} title={venue.name} isDemo={venue.isDemo} backHref={`/${city.slug}`}>
        <Link href={`/${city.slug}/${venue.category}`} className="inline-flex items-center gap-1.5 rounded-full bg-black/50 px-3 py-1 text-sm font-medium backdrop-blur">
          {cat.emoji} {cat.label}
        </Link>
        <h1 className="mt-2 font-display text-4xl font-extrabold leading-none tracking-tight">{venue.name}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
          <span className="inline-flex items-center gap-1">
            <MapPin size={14} /> {venue.neighborhood}, {city.name}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Stars value={rating.rating} size={13} /> <span className="text-ink">{rating.rating.toFixed(1)}</span> ({rating.count})
          </span>
        </div>
      </DetailHero>

      <div className="mt-4 flex items-center gap-2 text-sm font-semibold">
        <span className={`size-2 rounded-full ${status.open ? "animate-pulse-dot bg-live" : "bg-dim"}`} />
        <span className={status.open ? "text-live" : "text-muted"}>{status.label}</span>
      </div>

      <div className="mt-4">
        <InterestButton size="lg" target={target} baseCount={s?.interested ?? venue.baseInterest} meta={meta} />
      </div>

      <div className="mt-8 space-y-8">
        {lineup.length ? (
          <section>
            <SectionTitle>{tonightEvent ? tonightEvent.title : "Esta noche"}</SectionTitle>
            <div className="rounded-[1.5rem] border border-line bg-surface p-5">
              <Timeline items={lineup} />
            </div>
          </section>
        ) : null}

        <p className="text-[15px] leading-relaxed text-ink/85">{venue.description}</p>

        <section>
          <SectionTitle>Información</SectionTitle>
          <InfoGrid
            items={[
              { label: "Precio", value: <span>{priceLevelLabel(venue.priceLevel)} <span className="text-sm font-normal text-muted">· {priceFromLabel(venue.priceFrom).toLowerCase()}</span></span> },
              { label: "Edad habitual", value: `${venue.ageMin}–${venue.ageMax}` },
              { label: "Ambiente", value: venue.vibe === "fiesta" ? "🔥 De fiesta" : "🌿 Tranquilo" },
              { label: "Música", value: venue.music.length ? venue.music.join(" · ") : "Ambiente" },
            ]}
          />
          {venue.tags.length ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {venue.tags.map((t) => (
                <span key={t} className="rounded-full border border-line px-3 py-1 text-sm text-muted">
                  {t}
                </span>
              ))}
            </div>
          ) : null}
          <details className="group mt-3 rounded-2xl border border-line bg-surface px-4 py-3">
            <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold">
              <CalendarDays size={16} /> Horario de la semana
            </summary>
            <dl className="mt-3 grid grid-cols-2 gap-y-1.5 text-sm">
              {weeklyHours(venue.hours).map((h) => (
                <div key={h.day} className="contents">
                  <dt className="text-muted">{h.day}</dt>
                  <dd className={h.value === "Cerrado" ? "text-dim" : ""}>{h.value}</dd>
                </div>
              ))}
            </dl>
          </details>
        </section>

        <section>
          <SectionTitle>Comunidad</SectionTitle>
          <div className="space-y-3">
            <HereButton target={target} baseCount={status.open ? (s?.hereNow ?? 0) : 0} meta={meta} />
            <WorthVote target={target} baseYes={s?.votesYes ?? 0} baseNo={s?.votesNo ?? 0} />
          </div>
        </section>

        {here.length ? (
          <section>
            <SectionTitle>Próximos eventos aquí</SectionTitle>
            <div className="-mx-2">
              {here.map((e) => (
                <RowCard key={e.id} item={eventItem(e, stats[`event:${e.id}`], now)} />
              ))}
            </div>
          </section>
        ) : null}

        <PlansHere citySlug={city.slug} venueId={venue.id} initial={plans.filter((p) => p.venueId === venue.id)} stats={stats} nowIso={now.toISOString()} />

        <Salseo target={target} initialPosts={posts} initialReplies={replies} />

        <Reviews venueId={venue.id} venueName={venue.name} initial={reviews} />

        <Link href={`/${city.slug}/mapa?foco=${venue.id}`} className="flex items-center justify-center gap-2 rounded-2xl border border-line py-3 text-sm font-semibold text-muted hover:text-ink">
          <MapPin size={16} /> Ver en el mapa
        </Link>
      </div>
    </main>
  );
}
