import Link from "next/link";
import { CalendarDays, ChevronRight, Ticket } from "lucide-react";
import { categoryOf } from "@/lib/categories";
import { getStats, listPosts, listVenues } from "@/lib/data/catalog";
import { formatLongDay, formatTime, startLabel } from "@/lib/time";
import type { City, CityEvent } from "@/lib/types";
import { priceFromLabel } from "@/lib/utils";
import { InterestButton } from "@/components/social/InterestButton";
import { HereButton } from "@/components/social/HereButton";
import { WorthVote } from "@/components/social/WorthVote";
import { Salseo } from "@/components/salseo/Salseo";
import { Cover } from "@/components/ui/Cover";
import { DetailHero } from "./DetailHero";
import { InfoGrid, SectionTitle } from "./InfoGrid";
import { Timeline } from "./Timeline";
import { ViewTracker } from "./ViewTracker";

export async function EventView({ city, event }: { city: City; event: CityEvent }) {
  const now = new Date();
  const start = new Date(event.startsAt);
  const end = new Date(event.endsAt);
  const live = start <= now && end > now;
  const ended = end <= now;
  const venues = await listVenues(city.slug);
  const venue = event.venueId ? (venues.find((v) => v.id === event.venueId) ?? null) : null;
  const [{ posts, replies }, stats] = await Promise.all([listPosts("event", event.id), getStats([{ type: "event", id: event.id }])]);
  const s = stats[`event:${event.id}`];
  const cat = categoryOf(event.category);
  const target = { type: "event" as const, id: event.id };
  const meta = { category: event.category, citySlug: city.slug, startsAt: event.startsAt };

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": event.category === "conciertos" ? "MusicEvent" : event.category === "festivales" ? "Festival" : "Event",
    name: event.title,
    description: event.description,
    startDate: event.startsAt,
    endDate: event.endsAt,
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    location: { "@type": "Place", name: event.venueName ?? city.name, address: { "@type": "PostalAddress", addressLocality: city.name, addressCountry: "ES" } },
    offers: { "@type": "Offer", price: event.priceFrom, priceCurrency: "EUR", url: event.ticketUrl ?? undefined },
  };

  return (
    <main className="mx-auto max-w-2xl px-4">
      <ViewTracker target={target} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <DetailHero seed={event.id} category={event.category} imageUrl={event.imageUrl} title={event.title} isDemo={event.isDemo} backHref={`/${city.slug}`}>
        <Link href={`/${city.slug}/${event.category}`} className="inline-flex items-center gap-1.5 rounded-full bg-black/50 px-3 py-1 text-sm font-medium backdrop-blur">
          {cat.emoji} {cat.label}
        </Link>
        <h1 className="mt-2 font-display text-4xl font-extrabold leading-none tracking-tight">{event.title}</h1>
        <p className="mt-2 text-sm text-muted">
          {event.venueName ?? "Al aire libre"} · {city.name}
        </p>
      </DetailHero>

      <div className="mt-4 flex items-center gap-3 rounded-2xl border border-line bg-surface p-4">
        <span className="grid size-11 place-items-center rounded-xl bg-surface-3 text-lime">
          <CalendarDays size={20} />
        </span>
        <div className="flex-1 leading-tight">
          <p className="font-semibold">{formatLongDay(start)}</p>
          <p className="text-sm text-muted">
            {formatTime(start)}–{formatTime(end)} ·{" "}
            <span className={live ? "font-semibold text-live" : ended ? "text-dim" : ""}>{ended ? "Terminado" : startLabel(start, end, now)}</span>
          </p>
        </div>
        <span className="font-display text-lg font-bold">{priceFromLabel(event.priceFrom)}</span>
      </div>

      <div className="mt-4 flex gap-3">
        <InterestButton size="lg" className="flex-1" target={target} baseCount={s?.interested ?? event.baseInterest} meta={meta} />
        {event.ticketUrl ? (
          <a href={event.ticketUrl} target="_blank" rel="noopener noreferrer sponsored" className="inline-flex h-14 items-center gap-2 rounded-full border border-line bg-surface-2 px-5 font-semibold">
            <Ticket size={18} /> Entradas
          </a>
        ) : null}
      </div>

      <div className="mt-8 space-y-8">
        {event.lineup.length ? (
          <section>
            <SectionTitle>Programa</SectionTitle>
            <div className="rounded-[1.5rem] border border-line bg-surface p-5">
              <Timeline items={event.lineup} />
            </div>
          </section>
        ) : null}

        <p className="text-[15px] leading-relaxed text-ink/85">{event.description}</p>

        <section>
          <SectionTitle>Información</SectionTitle>
          <InfoGrid
            items={[
              { label: "Precio", value: priceFromLabel(event.priceFrom) },
              { label: "Edad habitual", value: `${event.ageMin}–${event.ageMax}` },
              { label: "Ambiente", value: event.vibe === "fiesta" ? "🔥 De fiesta" : "🌿 Tranquilo" },
              { label: "Música", value: event.music.join(" · ") || "Variada" },
            ]}
          />
        </section>

        <section>
          <SectionTitle>Comunidad</SectionTitle>
          <div className="space-y-3">
            {live ? <HereButton target={target} baseCount={s?.hereNow ?? 0} meta={meta} /> : null}
            <WorthVote target={target} baseYes={s?.votesYes ?? 0} baseNo={s?.votesNo ?? 0} title={live ? "¿Merece la pena ahora?" : "¿Merece la pena ir?"} />
          </div>
        </section>

        {venue ? (
          <Link href={`/${city.slug}/${venue.slug}`} className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-3 hover:border-line-strong">
            <Cover seed={venue.id} category={venue.category} imageUrl={venue.imageUrl} alt="" emojiSize="text-3xl" className="size-14 shrink-0 rounded-xl" sizes="56px" />
            <div className="flex-1">
              <p className="text-xs text-dim">Dónde</p>
              <p className="font-semibold">{venue.name}</p>
              <p className="text-sm text-muted">{venue.neighborhood}</p>
            </div>
            <ChevronRight className="text-dim" />
          </Link>
        ) : null}

        <Salseo target={target} initialPosts={posts} initialReplies={replies} />
      </div>
    </main>
  );
}
