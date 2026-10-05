"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Globe, ImagePlus, Link2, MapPin, Search, X } from "lucide-react";
import { useApp } from "@/components/providers/AppProvider";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { categoryOf, PLAN_CATEGORIES } from "@/lib/categories";
import { CITIES, getCity } from "@/lib/cities";
import { addDays, civilKey, formatTime, madridParts, nightDate, wallToDate } from "@/lib/time";
import type { PlanInput } from "@/lib/backend/types";
import type { CategorySlug, PlanVisibility } from "@/lib/types";
import { cn } from "@/lib/utils";
import { fieldErrors, planSchema } from "@/lib/validation";

interface VenueLite {
  id: string;
  name: string;
  category: CategorySlug;
  neighborhood: string;
}

const MAX_IMAGE = 8 * 1024 * 1024;

export function CreatePlanForm({ defaultCity, defaultVenue }: { defaultCity: string; defaultVenue: string | null }) {
  const { backend, requireAuth, toast, xp, reload } = useApp();
  const router = useRouter();
  const [citySlug, setCitySlug] = useState(defaultCity);
  const [venues, setVenues] = useState<VenueLite[]>([]);
  const [title, setTitle] = useState("");
  const [placeQuery, setPlaceQuery] = useState("");
  const [venue, setVenue] = useState<VenueLite | null>(null);
  const [showVenues, setShowVenues] = useState(false);
  const [category, setCategory] = useState<CategorySlug>("copas");
  const [when, setWhen] = useState<"now" | "custom">("now");
  const [date, setDate] = useState(() => civilKey(nightDate(new Date())));
  const [time, setTime] = useState(() => `${String((madridParts(new Date()).hour + 1) % 24).padStart(2, "0")}:00`);
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<PlanVisibility>("public");
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/venues?city=${citySlug}`)
      .then((r) => (r.ok ? (r.json() as Promise<VenueLite[]>) : []))
      .then((list) => {
        if (cancelled) return;
        setVenues(list);
        const pre = defaultVenue ? list.find((v) => v.id === defaultVenue) : undefined;
        if (pre) {
          setVenue(pre);
          setPlaceQuery(pre.name);
          setCategory(PLAN_CATEGORIES.includes(pre.category) ? pre.category : "copas");
          setTitle((t) => t || `Estamos en ${pre.name}`);
        }
      })
      .catch(() => setVenues([]));
    return () => {
      cancelled = true;
    };
  }, [citySlug, defaultVenue]);

  useEffect(() => () => void (preview && URL.revokeObjectURL(preview)), [preview]);

  const matches = useMemo(() => {
    const q = placeQuery.trim().toLowerCase();
    return venues.filter((v) => !q || v.name.toLowerCase().includes(q) || v.neighborhood.toLowerCase().includes(q)).slice(0, 6);
  }, [venues, placeQuery]);

  const dayOptions = useMemo(() => {
    const night = nightDate(new Date());
    return [0, 1, 2].map((n) => ({ key: civilKey(addDays(night, n)), label: n === 0 ? "Hoy" : n === 1 ? "Mañana" : "Pasado" }));
  }, []);

  function pickImage(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) return toast({ message: "Elige una imagen", tone: "error" });
    if (file.size > MAX_IMAGE) return toast({ message: "La imagen pesa demasiado (máx. 8 MB)", tone: "error" });
    setImage(file);
    setPreview(URL.createObjectURL(file));
  }

  async function submit() {
    setErrors({});
    const parsed = planSchema.safeParse({
      title,
      placeName: venue?.name ?? placeQuery,
      venueId: venue?.id ?? null,
      category,
      date: when === "now" ? dayOptions[0]!.key : date,
      time: when === "now" ? formatTime(new Date()) : time,
      description,
      visibility,
    });
    if (!parsed.success) return setErrors(fieldErrors(parsed.error));
    let startsAt: Date;
    if (when === "now") startsAt = new Date();
    else {
      const [y, m, d] = parsed.data.date.split("-").map(Number) as [number, number, number];
      startsAt = wallToDate({ year: y, month: m, day: d }, parsed.data.time);
      const problem = checkStart(startsAt);
      if (problem) return setErrors(problem);
    }
    const input = {
      citySlug,
      title: parsed.data.title,
      placeName: parsed.data.placeName,
      venueId: parsed.data.venueId,
      category: parsed.data.category as CategorySlug,
      description: parsed.data.description,
      startsAt: startsAt.toISOString(),
      visibility,
      image,
    };
    const run = () => void publish(input);
    if (requireAuth("Inicia sesión para publicar tu plan", run)) run();
  }

  async function publish(input: PlanInput) {
    setBusy(true);
    const res = await backend.createPlan(input);
    setBusy(false);
    if (!res.ok) return setErrors({ _: res.error });
    await reload();
    toast({ message: "¡Plan publicado! 🎉" });
    xp("createPlan");
    router.push(`/${input.citySlug}/planes/${res.data.id}`);
  }

  return (
    <main className="mx-auto max-w-xl px-4 pt-4 lg:pt-10">
      <h1 className="font-display text-3xl font-extrabold tracking-tight">Crear plan</h1>
      <p className="mt-1 text-muted">Di dónde vais a estar y que se apunte quien quiera. Solo se verá cuánta gente va, nunca dónde está nadie.</p>

      <form
        className="mt-6 space-y-6"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <Field label="Nombre del plan" error={errors.title}>
          <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} placeholder="Estamos en la terraza, venid" className="field text-lg font-semibold" />
        </Field>

        <Field label="Ciudad">
          <select
            value={citySlug}
            onChange={(e) => {
              setCitySlug(e.target.value);
              setVenue(null);
              setPlaceQuery("");
            }}
            className="field appearance-none"
          >
            {CITIES.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Lugar" error={errors.placeName}>
          <div className="relative">
            <Search size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-dim" />
            <input
              value={placeQuery}
              onChange={(e) => {
                setPlaceQuery(e.target.value);
                setVenue(null);
                setShowVenues(true);
              }}
              onFocus={() => setShowVenues(true)}
              onBlur={() => setTimeout(() => setShowVenues(false), 150)}
              maxLength={80}
              placeholder={`Un local de ${getCity(citySlug)?.name} o cualquier sitio`}
              className="field pl-10"
            />
            {venue ? (
              <button type="button" aria-label="Quitar lugar" onClick={() => (setVenue(null), setPlaceQuery(""))} className="absolute right-3 top-1/2 -translate-y-1/2 text-dim">
                <X size={18} />
              </button>
            ) : null}
            {showVenues && !venue && matches.length ? (
              <ul className="absolute inset-x-0 top-[calc(100%+6px)] z-20 overflow-hidden rounded-2xl border border-line-strong bg-surface-2 shadow-2xl shadow-black/50">
                {matches.map((v) => (
                  <li key={v.id}>
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        setVenue(v);
                        setPlaceQuery(v.name);
                        setShowVenues(false);
                        if (PLAN_CATEGORIES.includes(v.category)) setCategory(v.category);
                      }}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-surface-3"
                    >
                      <span className="text-xl">{categoryOf(v.category).emoji}</span>
                      <span className="flex-1">
                        <span className="block font-medium">{v.name}</span>
                        <span className="block text-xs text-muted">{v.neighborhood}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
          {venue ? (
            <p className="mt-1.5 flex items-center gap-1 text-xs text-live">
              <MapPin size={12} /> Vinculado a {venue.name}: aparecerá en su ficha
            </p>
          ) : null}
        </Field>

        <Field label="¿Cuándo?" error={errors.date ?? errors.time}>
          <div className="flex flex-wrap gap-2">
            <Chip active={when === "now"} onClick={() => setWhen("now")}>
              ⚡ Ahora
            </Chip>
            {dayOptions.map((d) => (
              <Chip key={d.key} active={when === "custom" && date === d.key} onClick={() => (setWhen("custom"), setDate(d.key))}>
                {d.label}
              </Chip>
            ))}
          </div>
          {when === "custom" ? (
            <div className="mt-3 grid grid-cols-2 gap-3">
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="field" aria-label="Fecha" />
              <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="field" aria-label="Hora" />
            </div>
          ) : null}
        </Field>

        <Field label="Categoría">
          <div className="flex flex-wrap gap-2">
            {PLAN_CATEGORIES.map((c) => (
              <Chip key={c} active={category === c} onClick={() => setCategory(c)}>
                {categoryOf(c).emoji} {categoryOf(c).label}
              </Chip>
            ))}
          </div>
        </Field>

        <Field label="Descripción (opcional)" error={errors.description}>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500} rows={3} placeholder="Somos 4, buen rollo, nos vamos sobre las 2…" className="field resize-none" />
        </Field>

        <Field label="¿Quién puede verlo?">
          <div className="grid grid-cols-2 gap-3">
            {(
              [
                { id: "public", icon: Globe, title: "Público", text: "Aparece en el feed de la ciudad" },
                { id: "link", icon: Link2, title: "Solo amigos", text: "Solo quien tenga el enlace" },
              ] as const
            ).map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => setVisibility(o.id)}
                aria-pressed={visibility === o.id}
                className={cn("rounded-2xl border p-3 text-left transition-colors", visibility === o.id ? "border-lime bg-lime/10" : "border-line bg-surface-2")}
              >
                <o.icon size={18} className={visibility === o.id ? "text-lime" : "text-muted"} />
                <span className="mt-2 block text-sm font-semibold">{o.title}</span>
                <span className="block text-xs text-muted">{o.text}</span>
              </button>
            ))}
          </div>
        </Field>

        <Field label="Imagen (opcional)">
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => pickImage(e.target.files?.[0])} />
          {preview ? (
            <div className="relative h-44 overflow-hidden rounded-2xl">
              <Image src={preview} alt="Vista previa" fill unoptimized className="object-cover" />
              <button type="button" aria-label="Quitar imagen" onClick={() => (setImage(null), setPreview(null))} className="absolute right-2 top-2 grid size-9 place-items-center rounded-full bg-black/60">
                <X size={18} />
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => fileRef.current?.click()} className="flex h-24 w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-line-strong text-muted hover:text-ink">
              <ImagePlus size={20} /> Añadir foto del sitio
            </button>
          )}
          <p className="mt-1.5 text-xs text-dim">Sin caras de otras personas sin su permiso.</p>
        </Field>

        {errors._ ? <p className="rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger">{errors._}</p> : null}

        <Button type="submit" size="lg" className="w-full" loading={busy}>
          Publicar plan
        </Button>
        <p className="pb-4 text-center text-xs text-dim">+50 XP por crear un plan</p>
      </form>
    </main>
  );
}

function checkStart(startsAt: Date): Record<string, string> | null {
  const now = Date.now();
  if (startsAt.getTime() < now - 30 * 60_000) return { time: "Esa hora ya ha pasado" };
  if (startsAt.getTime() > now + 60 * 86_400_000) return { date: "Como mucho, con dos meses de antelación" };
  return null;
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-sm font-semibold text-muted">{label}</p>
      {children}
      {error ? <p className="mt-1.5 text-sm text-danger">{error}</p> : null}
    </div>
  );
}
