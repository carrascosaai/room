import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { ArrowRight, EyeOff, Flame, MapPin, Plus, ShieldCheck, Users } from "lucide-react";
import { Logo } from "@/components/shell/Logo";
import { ButtonLink } from "@/components/ui/Button";
import { Cover } from "@/components/ui/Cover";
import { CITIES, CITY_COOKIE, getCity } from "@/lib/cities";
import { categoryOf } from "@/lib/categories";
import { IS_DEMO } from "@/lib/config";
import { getStats, listEvents, listPlans, listVenues } from "@/lib/data/catalog";
import { buildFeed } from "@/lib/feed";
import { computeTrending } from "@/lib/trending";
import { compactNumber } from "@/lib/utils";

export const revalidate = 300;

export const metadata: Metadata = {
  title: { absolute: "PLANEA — ¿Qué hacemos hoy? Discotecas, copas, conciertos y planes cerca de ti" },
  alternates: { canonical: "/" },
};

export default async function Landing() {
  const remembered = (await cookies()).get(CITY_COOKIE)?.value;
  const cityHref = remembered && getCity(remembered) ? `/${remembered}` : "/ciudades";
  const showcase = getCity("cordoba")!;
  const [venues, events, plans] = await Promise.all([listVenues(showcase.slug), listEvents(showcase.slug), listPlans(showcase.slug)]);
  const stats = await getStats([
    ...venues.map((v) => ({ type: "venue" as const, id: v.id })),
    ...events.map((e) => ({ type: "event" as const, id: e.id })),
    ...plans.map((p) => ({ type: "plan" as const, id: p.id })),
  ]);
  const now = new Date();
  const feed = buildFeed({ citySlug: showcase.slug, venues, events, plans, stats }, "noche", now).filter((i) => i.type !== "plan").slice(0, 3);
  const trending = computeTrending({ venues, events, plans, stats }, now, 4);

  const all = await Promise.all(CITIES.map(async (c) => ({ c, v: (await listVenues(c.slug)).length, e: (await listEvents(c.slug)).length, p: (await listPlans(c.slug)).length })));
  const totals = all.reduce((a, x) => ({ cities: a.cities + (x.v ? 1 : 0), venues: a.venues + x.v, events: a.events + x.e, plans: a.plans + x.p }), { cities: 0, venues: 0, events: 0, plans: 0 });

  return (
    <div className="overflow-x-clip">
      <header className="sticky top-0 z-50 border-b border-line/60 bg-bg/75 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
          <Logo />
          <nav className="hidden gap-7 text-sm text-muted md:flex">
            <a href="#como" className="hover:text-ink">Cómo funciona</a>
            <a href="#salseo" className="hover:text-ink">Salseo</a>
            <a href="#privacidad" className="hover:text-ink">Privacidad</a>
            <a href="#ciudades" className="hover:text-ink">Ciudades</a>
          </nav>
          <ButtonLink href={cityHref} size="sm">
            Abrir app
          </ButtonLink>
        </div>
      </header>

      <section className="relative mx-auto grid max-w-6xl items-center gap-12 px-5 pb-20 pt-12 lg:grid-cols-[1.1fr_0.9fr] lg:pt-20">
        <div className="pointer-events-none absolute -left-40 top-0 size-[520px] rounded-full bg-lime/10 blur-[120px]" />
        <div className="relative">
          <p className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5 text-sm text-muted">
            <span className="size-2 animate-pulse-dot rounded-full bg-live" /> Lo que está pasando esta noche en tu ciudad
          </p>
          <h1 className="mt-6 font-display text-6xl font-extrabold leading-[0.92] tracking-tight sm:text-7xl lg:text-8xl">
            ¿Qué hacemos <span className="text-lime">hoy</span>?
          </h1>
          <p className="mt-6 max-w-lg text-xl text-muted">Descubre qué está pasando cerca de ti. Discotecas, copas, conciertos, fiestas universitarias y los planes que monta la gente, en una sola pantalla.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink href={cityHref} size="lg">
              <MapPin size={20} /> Explorar mi ciudad
            </ButtonLink>
            <ButtonLink href="/crear" size="lg" variant="secondary">
              <Plus size={20} /> Crear un plan
            </ButtonLink>
          </div>
          <p className="mt-4 text-sm text-dim">Gratis · Sin descargar nada · Sin cuenta para explorar</p>
        </div>

        <div className="relative mx-auto w-full max-w-[360px]">
          <div className="absolute -inset-8 rounded-[3rem] bg-hot/10 blur-3xl" />
          <div className="relative rounded-[2.6rem] border border-line-strong bg-bg p-3 shadow-2xl shadow-black">
            <div className="mx-auto mb-3 h-6 w-28 rounded-full bg-surface-2" />
            <div className="px-2">
              <p className="text-xs text-muted">Esta noche · {showcase.name}</p>
              <p className="font-display text-2xl font-extrabold">¿Qué hacemos hoy?</p>
              <div className="mt-3 flex gap-1 rounded-full bg-surface p-1 text-[11px] font-semibold">
                {["Ahora", "Esta noche", "Mañana", "Finde"].map((t, i) => (
                  <span key={t} className={`flex-1 rounded-full py-1.5 text-center ${i === 1 ? "bg-ink text-bg" : "text-muted"}`}>
                    {t}
                  </span>
                ))}
              </div>
            </div>
            <div className="mt-3 space-y-2.5">
              {feed.map((item) => (
                <div key={item.key} className="overflow-hidden rounded-2xl border border-line bg-surface">
                  <Cover seed={item.id} category={item.category} alt="" className="h-20" emojiSize="text-4xl" sizes="340px" />
                  <div className="p-3">
                    <p className="text-[11px] text-muted">
                      {categoryOf(item.category).emoji} {item.subtitle} · {item.timeLabel}
                    </p>
                    <p className="font-display font-bold leading-tight">{item.title}</p>
                    <p className="mt-1 flex items-center gap-1 text-xs text-muted">
                      <Flame size={12} className="text-hot" /> <span className="font-semibold text-ink">{item.interest}</span> interesados
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-line bg-surface/40">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-5 py-10 md:grid-cols-4">
          {[
            { n: totals.cities, l: "ciudades activas" },
            { n: totals.venues, l: "locales" },
            { n: totals.events, l: "eventos esta semana" },
            { n: totals.plans, l: "planes de la gente" },
          ].map((s) => (
            <div key={s.l}>
              <p className="font-display text-5xl font-extrabold tabular-nums">{compactNumber(s.n)}</p>
              <p className="text-muted">{s.l}</p>
            </div>
          ))}
        </div>
        {IS_DEMO ? <p className="pb-4 text-center text-xs text-dim">Cifras de la versión demo, con datos ficticios.</p> : null}
      </section>

      <section id="como" className="mx-auto max-w-6xl scroll-mt-20 px-5 py-24">
        <h2 className="max-w-2xl font-display text-4xl font-extrabold tracking-tight sm:text-5xl">No es otro mapa de bares. Es lo que está pasando.</h2>
        <div className="mt-12 grid gap-4 md:grid-cols-3">
          <Feature emoji="⚡" title="Ahora, esta noche, el finde" text="Abres, eliges ciudad y ves qué está en marcha y qué empieza en un rato. Sin buscar, sin filtrar." />
          <Feature emoji="🗺️" title="Todo en el mapa" text="Discotecas, copas, conciertos y eventos en el mapa, con horario, precio y cuánta gente quiere ir." />
          <Feature emoji="✨" title="Planes de la gente" text="“Estamos en la terraza, venid.” Crea un plan en 30 segundos y que se apunte quien quiera." />
        </div>
      </section>

      <section id="salseo" className="mx-auto grid max-w-6xl scroll-mt-20 items-center gap-12 px-5 pb-24 lg:grid-cols-2">
        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-hot">🔥 Salseo</p>
          <h2 className="mt-2 font-display text-4xl font-extrabold tracking-tight sm:text-5xl">La parte divertida de la noche.</h2>
          <p className="mt-4 text-lg text-muted">Encuestas, preguntas, confesiones anónimas y predicciones en cada sitio y cada plan. Con moderación desde el primer día: sin nombres, sin datos personales, sin acoso.</p>
        </div>
        <div className="space-y-3">
          <div className="rounded-[1.25rem] border border-line bg-surface p-4">
            <p className="text-xs text-dim">📊 Encuesta · hace 12 min</p>
            <p className="mt-2 font-semibold">¿A qué hora se pone bueno esto?</p>
            {[
              ["Antes de la 1", 18],
              ["Entre la 1 y las 2", 57],
              ["Después de las 2", 25],
            ].map(([l, p]) => (
              <div key={l} className="relative mt-2 flex h-10 items-center overflow-hidden rounded-xl border border-line px-3 text-sm">
                <span className="absolute inset-y-0 left-0 bg-hot/20" style={{ width: `${p}%` }} />
                <span className="relative flex-1">{l}</span>
                <span className="relative font-semibold">{p}%</span>
              </div>
            ))}
          </div>
          <div className="rounded-[1.25rem] border border-line bg-surface p-4">
            <p className="text-xs text-dim">🎭 Anónimo · ❓ Pregunta</p>
            <p className="mt-2 font-semibold">¿Quién llega siempre tarde?</p>
            <p className="mt-2 text-sm text-muted">🎭 El que dice &quot;estoy saliendo&quot; desde la ducha · 🎭 Yo. Lo admito.</p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-24">
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-[2rem] border border-line bg-surface p-6">
            <p className="text-sm font-semibold uppercase tracking-widest text-lime">En tendencia · {showcase.name}</p>
            <ol className="mt-4 space-y-3">
              {trending.map((t) => (
                <li key={t.item.key} className="flex items-center gap-4">
                  <span className="w-6 font-display text-3xl font-extrabold text-lime">{t.rank}</span>
                  <span className="flex-1">
                    <span className="block font-semibold">{t.item.title}</span>
                    <span className="block text-xs text-muted">{t.reasons.slice(0, 2).join(" · ")}</span>
                  </span>
                </li>
              ))}
            </ol>
          </div>
          <div id="privacidad" className="scroll-mt-20 rounded-[2rem] border border-live/20 bg-live/[0.04] p-6">
            <EyeOff className="text-live" />
            <h3 className="mt-4 font-display text-3xl font-extrabold tracking-tight">Tu ubicación es tuya.</h3>
            <p className="mt-3 text-muted">Puedes decir &quot;Estoy aquí&quot; o &quot;Me apunto&quot;, pero los demás solo ven un número: cuánta gente va. Nunca quién, nunca dónde estás.</p>
            <ul className="mt-5 space-y-2 text-sm">
              <li className="flex items-center gap-2"><Users size={16} className="text-live" /> Solo contadores agregados</li>
              <li className="flex items-center gap-2"><ShieldCheck size={16} className="text-live" /> Salseo moderado y con denuncias</li>
              <li className="flex items-center gap-2"><MapPin size={16} className="text-live" /> Tu GPS no sale de tu móvil</li>
            </ul>
          </div>
        </div>
      </section>

      <section id="ciudades" className="mx-auto max-w-6xl scroll-mt-20 px-5 pb-24">
        <h2 className="font-display text-4xl font-extrabold tracking-tight">¿Dónde sales?</h2>
        <div className="mt-6 flex flex-wrap gap-2">
          {all.map(({ c, v }) => (
            <Link key={c.slug} href={`/${c.slug}`} className={`rounded-full border px-4 py-2 font-medium transition-colors ${v ? "border-line-strong hover:border-lime hover:text-lime" : "border-line text-dim hover:text-muted"}`}>
              {c.name}
              {v ? "" : " · pronto"}
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-24">
        <div className="relative overflow-hidden rounded-[2.5rem] bg-lime px-8 py-14 text-lime-ink sm:px-14">
          <h2 className="max-w-xl font-display text-4xl font-extrabold leading-none tracking-tight sm:text-6xl">Hoy hay plan. Seguro.</h2>
          <Link href={cityHref} className="mt-8 inline-flex h-14 items-center gap-2 rounded-full bg-lime-ink px-7 font-semibold text-lime transition-transform active:scale-95">
            Explorar mi ciudad <ArrowRight size={20} />
          </Link>
          <span aria-hidden className="pointer-events-none absolute -bottom-10 -right-4 rotate-12 text-[11rem] leading-none opacity-90">🪩</span>
        </div>
      </section>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-8 text-sm text-dim sm:flex-row sm:items-center sm:justify-between">
          <Logo />
          <div className="flex gap-5">
            <Link href="/normas" className="hover:text-ink">Normas y privacidad</Link>
            <Link href="/ciudades" className="hover:text-ink">Ciudades</Link>
          </div>
          <p>© {now.getFullYear()} PLANEA · Hecho en España</p>
        </div>
      </footer>
    </div>
  );
}

function Feature({ emoji, title, text }: { emoji: string; title: string; text: string }) {
  return (
    <div className="rounded-[1.75rem] border border-line bg-surface p-6 transition-colors hover:border-line-strong">
      <span className="grid size-12 place-items-center rounded-2xl bg-surface-3 text-2xl">{emoji}</span>
      <h3 className="mt-5 font-display text-xl font-bold">{title}</h3>
      <p className="mt-2 text-muted">{text}</p>
    </div>
  );
}
