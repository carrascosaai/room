/**
 * Generador del conjunto de datos DEMO.
 * Las fechas se calculan relativas a la noche en curso para que la demo
 * siempre tenga algo pasando "esta noche". Determinista: mismos ids siempre.
 */
import { CITIES } from "../cities";
import { addDays, nightDate, nightKey, wallToDate, weekdayOf, type CivilDate } from "../time";
import type { CityEvent, LineupItem, Plan, PollOption, Post, PostKind, Reply, Report, Review, TargetStats, Venue } from "../types";
import { hash, slugify } from "../utils";
import { DEMO_ARTISTS, DEMO_DJS, DEMO_PEOPLE, FESTIVAL_NAMES, HOURS, UNI_THEMES, VENUES_BY_CITY, type VenueSpec } from "./catalog";

/** UUID determinista (formato v4) a partir de una clave. */
export function seedId(key: string): string {
  const hex = [0, 1, 2, 3].map((i) => hash(`${key}#${i}`).toString(16).padStart(8, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

function rng(seed: string) {
  let a = hash(seed);
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(arr: readonly T[], r: () => number): T {
  return arr[Math.floor(r() * arr.length)]!;
}

const DESCRIPTIONS: Record<string, (s: VenueSpec) => string> = {
  discotecas: (s) =>
    `Una de las pistas de referencia de ${s.hood}. ${s.music.slice(0, 2).join(" y ")} hasta el cierre, buen sonido y ambiente de ${s.age[0]} a ${s.age[1]} años. Suele llenarse a partir de la 1:30.`,
  copas: (s) =>
    `Para tomar algo bien hecho sin gritar para hablar. ${s.tags.join(" · ")}. Perfecto para empezar la noche o para alargar la sobremesa.`,
  pubs: (s) =>
    `Pub de los de toda la vida en ${s.hood}: precios amables, ${s.music[0]?.toLowerCase() ?? "buena música"} y gente con ganas. Ideal para la previa.`,
  conciertos: (s) =>
    `Sala de directo en ${s.hood} con programación casi diaria: ${s.music.join(", ").toLowerCase()}. Después de los conciertos, sesión de DJ.`,
  restaurantes: (s) =>
    `Cenar bien antes de salir. ${s.tags.join(" · ")}. Cocina abierta hasta tarde y raciones para compartir.`,
};

const POST_TEMPLATES: { kind: PostKind; body: string; options?: string[]; anon: boolean }[] = [
  { kind: "question", body: "¿Quién crees que va a acabar liándose esta noche?", anon: true },
  { kind: "question", body: "¿Quién llega siempre tarde?", anon: true },
  { kind: "question", body: "¿Quién tiene peor gusto musical del grupo?", anon: true },
  { kind: "poll", body: "¿A qué hora se pone bueno esto?", options: ["Antes de la 1", "Entre la 1 y las 2", "Después de las 2"], anon: false },
  { kind: "poll", body: "¿Merece la pena pagar la entrada hoy?", options: ["Sí, sin duda", "Solo con lista", "Ni de broma"], anon: false },
  { kind: "poll", body: "¿Cuál es el peor sitio para una primera cita?", options: ["La pista", "La cola del baño", "El ropero", "Aquí no, mejor la terraza"], anon: false },
  { kind: "confession", body: "Confieso que vine solo por la música y acabé cantando a gritos con un grupo que no conocía de nada.", anon: true },
  { kind: "confession", body: "Confieso que dije que me iba a casa a las 2 y salí con el sol.", anon: true },
  { kind: "opinion", body: "La pista de abajo tiene mucho mejor ambiente que el reservado. Hacedme caso.", anon: false },
  { kind: "opinion", body: "Lo mejor de aquí es que nadie va de nada. Se viene a pasarlo bien.", anon: false },
  { kind: "prediction", body: "Predicción: hoy cierran con un remember y lloramos todos.", anon: false },
  { kind: "prediction", body: "Va a haber cola a las 2. Venid antes, avisados estáis.", anon: false },
];

const REPLIES: Record<string, string[]> = {
  "¿Quién crees que va a acabar liándose esta noche?": [
    "El que siempre dice 'yo solo vengo a una' 😂",
    "La pareja que lleva tres meses diciendo que son solo amigos",
    "Yo, si ponen Bad Bunny. No me hago responsable.",
  ],
  "¿Quién llega siempre tarde?": ["El que vive más cerca, siempre", "El que dice 'estoy saliendo' desde la ducha", "Yo. Lo admito."],
  "¿Quién tiene peor gusto musical del grupo?": ["El que pide reggaeton de 2012 en bucle", "El del grupo que solo escucha a un artista", "Todos menos yo, claramente"],
};

const REVIEW_TEMPLATES: Record<string, [number, string][]> = {
  discotecas: [
    [5, "El DJ estuvo increíble y la pista no se vació en toda la noche."],
    [4, "Muy buen ambiente. Ve antes de la 1:30 si no quieres cola."],
    [3, "Bien la música, pero las copas un poco caras para lo que son."],
  ],
  copas: [
    [5, "Cócteles de diez y se puede hablar. Repetiremos."],
    [4, "Sitio bonito y tranquilo, el personal muy majo."],
    [4, "Perfecto para empezar la noche. El gin tonic, de lo mejor."],
  ],
  pubs: [
    [4, "Precios buenos y la música de siempre. Para la previa es perfecto."],
    [5, "El sitio donde siempre acabamos. Nunca falla."],
    [3, "Se llena muchísimo, pero el ambiente lo compensa."],
  ],
  conciertos: [
    [5, "Sonido espectacular y se ve bien desde cualquier sitio."],
    [4, "Buena programación. La barra, algo lenta en el descanso."],
  ],
  restaurantes: [
    [5, "Cenamos genial y a buen precio. Las raciones son enormes."],
    [4, "Muy rico todo. Reservad el fin de semana."],
  ],
};

export interface DemoDataset {
  key: string;
  venues: Venue[];
  events: CityEvent[];
  plans: Plan[];
  posts: Post[];
  replies: Reply[];
  reviews: Review[];
  /** Actividad agregada (demo) por objetivo: `${type}:${id}`. */
  activity: Map<string, TargetStats>;
  reports: Report[];
}

function lineupFor(kind: "dj" | "concert" | "uni" | "tardeo" | "festival" | "jam" | "karaoke", main: string, r: () => number): LineupItem[] {
  switch (kind) {
    case "dj":
      return [
        { time: "00:30", label: "Apertura de puertas" },
        { time: "01:30", label: `${main} — sesión principal` },
        { time: "04:00", label: "Remember hasta el cierre" },
        { time: "06:30", label: "Cierre" },
      ];
    case "concert":
      return [
        { time: "21:00", label: "Apertura de puertas" },
        { time: "21:30", label: `Telonero: ${pick(DEMO_ARTISTS, r)}` },
        { time: "22:15", label: `${main} en directo` },
        { time: "00:30", label: "Sesión de DJ" },
      ];
    case "uni":
      return [
        { time: "00:00", label: "Apertura — entrada con carné universitario" },
        { time: "01:00", label: `${pick(DEMO_DJS, r)} al mando` },
        { time: "03:00", label: "Concurso de disfraces" },
        { time: "06:00", label: "Cierre" },
      ];
    case "tardeo":
      return [
        { time: "18:00", label: "Vermut y sesión chill" },
        { time: "20:00", label: `${main}` },
        { time: "23:00", label: "Cierre del tardeo" },
      ];
    case "festival":
      return [
        { time: "18:00", label: "Apertura del recinto y food trucks" },
        { time: "20:00", label: pick(DEMO_ARTISTS, r) },
        { time: "22:00", label: main },
        { time: "00:30", label: `${pick(DEMO_DJS, r)} cierra el día` },
      ];
    case "jam":
      return [
        { time: "21:30", label: "Apuntaos en barra" },
        { time: "22:00", label: "Micro abierto" },
        { time: "23:30", label: "Jam con la banda de la casa" },
      ];
    case "karaoke":
      return [
        { time: "22:00", label: "Lista de canciones abierta" },
        { time: "23:30", label: "Final de la noche: duetos" },
      ];
  }
}

function buildCity(citySlug: string, night: CivilDate, out: DemoDataset) {
  const city = CITIES.find((c) => c.slug === citySlug)!;
  const specs = VENUES_BY_CITY[citySlug] ?? [];
  const r = rng(`city:${citySlug}`);

  const venues: Venue[] = specs.map((s) => {
    const slug = slugify(s.name);
    const nightly: LineupItem[] =
      s.category === "discotecas"
        ? [
            { time: HOURS[s.hours][5]?.[0] ?? "00:30", label: "Apertura" },
            { time: "01:30", label: "DJ residente" },
            { time: "04:00", label: "Remember" },
            { time: HOURS[s.hours][5]?.[1] ?? "06:30", label: "Cierre" },
          ]
        : s.category === "conciertos"
          ? [
              { time: "21:00", label: "Puertas" },
              { time: "22:00", label: "Directo" },
              { time: "00:30", label: "DJ hasta el cierre" },
            ]
          : [];
    return {
      id: seedId(`venue:${citySlug}:${slug}`),
      slug,
      citySlug,
      name: s.name,
      category: s.category,
      description: (DESCRIPTIONS[s.category] ?? DESCRIPTIONS.copas!)(s),
      neighborhood: s.hood,
      lat: +(city.lat + s.d[0]).toFixed(5),
      lng: +(city.lng + s.d[1]).toFixed(5),
      priceLevel: s.price[0],
      priceFrom: s.price[1],
      ageMin: s.age[0],
      ageMax: s.age[1],
      music: s.music,
      vibe: s.vibe,
      tags: s.tags,
      hours: HOURS[s.hours],
      nightly,
      imageUrl: null,
      baseInterest: s.heat,
      baseRating: s.rating,
      baseRatingCount: 20 + Math.floor(r() * 180),
      isDemo: true,
      isFeatured: false,
    };
  });
  out.venues.push(...venues);
  if (!venues.length) return;

  const find = (pred: (s: VenueSpec) => boolean) => {
    const i = specs.findIndex(pred);
    return i >= 0 ? venues[i]! : undefined;
  };
  const disco = find((s) => s.category === "discotecas" && s.hours === "disco");
  const uni = find((s) => s.hours === "discoUni");
  const sala = find((s) => s.category === "conciertos");
  const terraza = find((s) => s.hours === "terraza");
  const pub = find((s) => s.category === "pubs");
  const copas = find((s) => s.category === "copas");

  const wd = weekdayOf(night);
  const toSaturday = wd === 6 ? 7 : 6 - wd; // próximo sábado (no hoy)

  type Ev = {
    key: string;
    title: string;
    category: CityEvent["category"];
    venue?: Venue;
    offset: number;
    start: string;
    end: string;
    price: number;
    lineup: LineupItem[];
    music: string[];
    vibe: CityEvent["vibe"];
    age: [number, number];
    heat: number;
    description: string;
  };
  const evs: Ev[] = [];
  const dj = pick(DEMO_DJS, r);
  const artist = pick(DEMO_ARTISTS, r);
  const artist2 = pick(DEMO_ARTISTS.filter((a) => a !== artist), r);
  if (disco)
    evs.push({
      key: "dj", title: `${dj} · Noche ${disco.music[0] ?? "Club"}`, category: "discotecas", venue: disco, offset: 0,
      start: "00:30", end: "06:30", price: disco.priceFrom, lineup: lineupFor("dj", dj, r), music: disco.music, vibe: "fiesta",
      age: [disco.ageMin, disco.ageMax], heat: Math.round(disco.baseInterest * 0.8),
      description: `${dj} vuelve a ${disco.name} con una sesión de ${disco.music.slice(0, 2).join(" y ").toLowerCase()} de las que se recuerdan. Entrada con consumición.`,
    });
  if (sala)
    evs.push({
      key: "concierto", title: `${artist} en directo`, category: "conciertos", venue: sala, offset: 0,
      start: "22:00", end: "00:30", price: 12 + Math.floor(r() * 8), lineup: lineupFor("concert", artist, r), music: sala.music, vibe: "fiesta",
      age: [18, 40], heat: 60 + Math.floor(r() * 80),
      description: `${artist} presenta su nuevo disco en ${sala.name}. Grupo ficticio de la demo de PLANEA.`,
    });
  if (terraza)
    evs.push({
      key: "tardeo", title: `Tardeo en ${terraza.name}`, category: "eventos", venue: terraza, offset: 0,
      start: "18:00", end: "23:00", price: 0, lineup: lineupFor("tardeo", `Sesión de ${pick(DEMO_DJS, r)}`, r), music: ["House", "Pop"], vibe: "tranquilo",
      age: [21, 40], heat: 40 + Math.floor(r() * 60),
      description: "Tardeo con vermut, música suave y atardecer. Entrada libre hasta completar aforo.",
    });
  if (uni)
    evs.push({
      key: "uni", title: pick(UNI_THEMES, r), category: "universitario", venue: uni, offset: 1,
      start: "00:00", end: "06:00", price: 5, lineup: lineupFor("uni", "", r), music: uni.music, vibe: "fiesta",
      age: [18, 24], heat: Math.round(uni.baseInterest * 0.9),
      description: `La fiesta universitaria de la semana en ${uni.name}. Entrada reducida con carné y primera copa incluida.`,
    });
  if (pub)
    evs.push({
      key: "jam", title: "Micro abierto & jam session", category: "conciertos", venue: pub, offset: 2,
      start: "21:30", end: "00:30", price: 0, lineup: lineupFor("jam", "", r), music: ["Acústico", "Rock"], vibe: "tranquilo",
      age: [18, 40], heat: 25 + Math.floor(r() * 40),
      description: "Trae tu guitarra o tu voz. Micro abierto para quien se atreva y jam al final.",
    });
  if (sala)
    evs.push({
      key: "concierto2", title: `${artist2} + invitados`, category: "conciertos", venue: sala, offset: 1,
      start: "21:30", end: "23:45", price: 10 + Math.floor(r() * 6), lineup: lineupFor("concert", artist2, r), music: sala.music, vibe: "fiesta",
      age: [18, 40], heat: 35 + Math.floor(r() * 50),
      description: `Noche de directo con ${artist2} y bandas invitadas. Grupo ficticio de la demo de PLANEA.`,
    });
  const festival = FESTIVAL_NAMES[hash(citySlug) % FESTIVAL_NAMES.length]!;
  evs.push({
    key: "festival", title: festival, category: "festivales", offset: toSaturday,
    start: "18:00", end: "02:00", price: 15, lineup: lineupFor("festival", artist, r), music: ["Indie", "Pop", "Electrónica"], vibe: "fiesta",
    age: [18, 45], heat: 150 + Math.floor(r() * 150),
    description: `Un día entero de música al aire libre, food trucks y mercado de diseño en ${city.name}. Festival ficticio de la demo.`,
  });
  const karaokeAt = copas ?? pub;
  if (karaokeAt)
    evs.push({
      key: "karaoke", title: "Karaoke sin vergüenza", category: "eventos", venue: karaokeAt, offset: 3,
      start: "22:00", end: "01:30", price: 0, lineup: lineupFor("karaoke", "", r), music: ["Pop español", "Clásicos"], vibe: "fiesta",
      age: [18, 40], heat: 30 + Math.floor(r() * 40),
      description: "Canciones de siempre, cero vergüenza y premio para el mejor dueto.",
    });

  for (const e of evs) {
    const day = addDays(night, e.offset);
    const startAt = wallToDate(addDays(day, e.start < "07:00" ? 1 : 0), e.start);
    let endAt = wallToDate(addDays(day, e.end < "07:00" ? 1 : 0), e.end);
    if (endAt <= startAt) endAt = new Date(endAt.getTime() + 86_400_000);
    const slug = slugify(e.title);
    out.events.push({
      id: seedId(`event:${citySlug}:${e.key}`),
      slug,
      citySlug,
      venueId: e.venue?.id ?? null,
      venueName: e.venue?.name ?? null,
      title: e.title,
      category: e.category,
      description: e.description,
      startsAt: startAt.toISOString(),
      endsAt: endAt.toISOString(),
      priceFrom: e.price,
      lineup: e.lineup,
      music: e.music,
      vibe: e.vibe,
      ageMin: e.age[0],
      ageMax: e.age[1],
      lat: e.venue?.lat ?? +(city.lat - 0.004).toFixed(5),
      lng: e.venue?.lng ?? +(city.lng + 0.008).toFixed(5),
      imageUrl: null,
      ticketUrl: null,
      baseInterest: e.heat,
      isDemo: true,
      isFeatured: false,
    });
  }

  // Planes espontáneos de la comunidad (demo).
  const planSpecs: { key: string; title: string; venue?: Venue; place?: string; cat: Plan["category"]; offset: number; at: string; n: number; desc: string }[] = [];
  if (terraza) planSpecs.push({ key: "p1", title: `Tardeo en ${terraza.name}`, venue: terraza, cat: "copas", offset: 0, at: "19:30", n: 6, desc: "Pillamos mesa al fondo. Quien se quiera unir, bienvenido." });
  if (pub) planSpecs.push({ key: "p2", title: `Estamos en ${pub.name}`, venue: pub, cat: "pubs", offset: 0, at: "22:30", n: 8, desc: "Previa tranquila y luego vemos. Hay buen rollo." });
  if (disco) planSpecs.push({ key: "p3", title: `Previa y a ${disco.name}`, venue: disco, cat: "discotecas", offset: 0, at: "00:15", n: 14, desc: "Nos vemos en la puerta a la 1. Vamos con lista." });
  if (copas) planSpecs.push({ key: "p4", title: "Cócteles para celebrar el viernes", venue: copas, cat: "copas", offset: 1, at: "21:30", n: 5, desc: "Plan tranqui para empezar el finde." });
  planSpecs.push({ key: "p5", title: "Ruta de tapas por el centro", place: `Centro de ${city.name}`, cat: "restaurantes", offset: 0, at: "21:00", n: 4, desc: "Tres bares, tres tapas y luego decidimos." });
  if (uni) planSpecs.push({ key: "p6", title: `Grupo para la fiesta uni de ${uni.name}`, venue: uni, cat: "universitario", offset: 1, at: "23:30", n: 11, desc: "Somos de varias facultades. Cuantos más, mejor." });

  for (const p of planSpecs) {
    const day = addDays(night, p.offset);
    const at = wallToDate(addDays(day, p.at < "07:00" ? 1 : 0), p.at);
    const person = pick(DEMO_PEOPLE, r);
    out.plans.push({
      id: seedId(`plan:${citySlug}:${p.key}`),
      citySlug,
      creatorId: null,
      creatorName: person.name,
      title: p.title,
      placeName: p.venue?.name ?? p.place ?? city.name,
      venueId: p.venue?.id ?? null,
      category: p.cat,
      description: p.desc,
      startsAt: at.toISOString(),
      visibility: "public",
      imageUrl: null,
      baseAttendees: p.n,
      createdAt: new Date(at.getTime() - (2 + Math.floor(r() * 20)) * 3_600_000).toISOString(),
      isDemo: true,
    });
  }
}

function buildSocial(out: DemoDataset, now: Date) {
  const targets: { type: "venue" | "event" | "plan"; id: string; category: string; base: number; rating?: number }[] = [
    ...out.venues.map((v) => ({ type: "venue" as const, id: v.id, category: v.category, base: v.baseInterest, rating: v.baseRating })),
    ...out.events.map((e) => ({ type: "event" as const, id: e.id, category: e.category, base: e.baseInterest })),
    ...out.plans.map((p) => ({ type: "plan" as const, id: p.id, category: p.category, base: p.baseAttendees })),
  ];

  for (const t of targets) {
    const r = rng(`social:${t.id}`);
    const nPosts = t.type === "plan" ? Math.floor(r() * 2) : 2 + Math.floor(r() * 3);
    const pool = [...POST_TEMPLATES];
    let postCount = 0;
    for (let i = 0; i < nPosts && pool.length; i++) {
      const tpl = pool.splice(Math.floor(r() * pool.length), 1)[0]!;
      if (t.category === "restaurantes" && tpl.kind === "question") continue;
      const person = pick(DEMO_PEOPLE, r);
      const id = seedId(`post:${t.id}:${tpl.body}`);
      const options: PollOption[] = (tpl.options ?? []).map((label, j) => ({
        id: seedId(`opt:${id}:${j}`),
        label,
        votes: 3 + Math.floor(r() * 40),
      }));
      const replies = REPLIES[tpl.body] ?? [];
      const createdAt = new Date(now.getTime() - (10 + Math.floor(r() * 600)) * 60_000).toISOString();
      replies.forEach((body, j) => {
        out.replies.push({
          id: seedId(`reply:${id}:${j}`),
          postId: id,
          authorId: null,
          authorName: "Anónimo",
          authorEmoji: "🎭",
          isAnonymous: true,
          body,
          createdAt: new Date(new Date(createdAt).getTime() + (j + 1) * 7 * 60_000).toISOString(),
        });
      });
      out.posts.push({
        id,
        targetType: t.type,
        targetId: t.id,
        authorId: null,
        authorName: tpl.anon ? "Anónimo" : person.name,
        authorEmoji: tpl.anon ? "🎭" : person.emoji,
        isAnonymous: tpl.anon,
        kind: tpl.kind,
        body: tpl.body,
        options,
        replyCount: replies.length,
        createdAt,
        isDemo: true,
      });
      postCount++;
    }

    if (t.type === "venue") {
      const tpls = REVIEW_TEMPLATES[t.category] ?? REVIEW_TEMPLATES.copas!;
      tpls.forEach(([rating, body], j) => {
        const person = DEMO_PEOPLE[(hash(t.id) + j * 5) % DEMO_PEOPLE.length]!;
        out.reviews.push({
          id: seedId(`review:${t.id}:${j}`),
          venueId: t.id,
          authorId: null,
          authorName: person.name,
          authorEmoji: person.emoji,
          rating,
          body,
          createdAt: new Date(now.getTime() - (1 + j * 3 + Math.floor(r() * 20)) * 86_400_000).toISOString(),
        });
      });
    }

    const yesRatio = t.rating ? Math.min(0.95, Math.max(0.35, (t.rating - 2) / 3)) : 0.6 + r() * 0.3;
    const totalVotes = Math.round(t.base * (0.2 + r() * 0.3));
    const votesYes = Math.round(totalVotes * yesRatio);
    out.activity.set(`${t.type}:${t.id}`, {
      interested: t.base,
      hereNow: Math.round(t.base * (0.08 + r() * 0.2)),
      votesYes,
      votesNo: totalVotes - votesYes,
      posts: postCount,
      views24h: Math.round(t.base * (2 + r() * 6)),
      interested24h: Math.round(t.base * (0.1 + r() * 0.4)),
    });
  }

  // Denuncias de ejemplo para que el panel de moderación no esté vacío en la demo.
  const sample = out.posts.filter((p) => p.kind === "opinion").slice(0, 2);
  sample.forEach((p, i) => {
    out.reports.push({
      id: seedId(`report:${p.id}`),
      reporterId: "demo",
      targetType: "post",
      targetId: p.id,
      reason: i === 0 ? "spam" : "otro",
      details: i === 0 ? "Parece publicidad del propio local." : "",
      status: "open",
      createdAt: new Date(now.getTime() - (30 + i * 45) * 60_000).toISOString(),
      preview: p.body,
    });
  });
}

let cache: DemoDataset | null = null;

export function getDemoDataset(now: Date = new Date()): DemoDataset {
  const key = nightKey(now);
  if (cache?.key === key) return cache;
  const night = nightDate(now);
  const out: DemoDataset = { key, venues: [], events: [], plans: [], posts: [], replies: [], reviews: [], activity: new Map(), reports: [] };
  for (const city of CITIES) buildCity(city.slug, night, out);
  // Las marcas de tiempo del contenido social se anclan al inicio de la noche
  // para que el conjunto sea estable durante toda la noche.
  buildSocial(out, wallToDate(night, "22:00") < now ? wallToDate(night, "22:00") : now);
  cache = out;
  return out;
}
