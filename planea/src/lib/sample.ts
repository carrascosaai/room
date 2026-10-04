/**
 * Catálogo mínimo de ejemplo para desarrollo local sin Supabase.
 * En producción los datos salen de la base de datos (ver supabase/README.md).
 */
import type { City, Place } from "./types";

export const SAMPLE_CITIES: City[] = [
  { slug: "madrid", name: "Madrid", region: "Comunidad de Madrid", lat: 40.4168, lng: -3.7038, n: 4, curated: true },
  { slug: "sevilla", name: "Sevilla", region: "Andalucía", lat: 37.3891, lng: -5.9845, n: 2, curated: true },
];

const P = (id: string, city: string, name: string, kind: Place["kind"], lat: number, lng: number, note: string, top = true): Place => ({
  id,
  city,
  name,
  kind,
  lat,
  lng,
  note,
  top,
  address: null,
  website: null,
});

export const SAMPLE_PLACES: Place[] = [
  P("cur:madrid:teatro-kapital", "madrid", "Teatro Kapital", "discoteca", 40.40977, -3.69322, "7 plantas con ambientes distintos"),
  P("cur:madrid:zona-malasana", "madrid", "Malasaña", "zona", 40.42736, -3.70398, "Bares alternativos y música en directo"),
  P("cur:madrid:tupperware", "madrid", "Tupperware", "bar", 40.42611, -3.70379, "Indie, rock y pop ochentero"),
  P("cur:madrid:joy-eslava", "madrid", "Joy Eslava", "discoteca", 40.41722, -3.70722, "Clásico de Sol en un antiguo teatro"),
  P("cur:sevilla:zona-alfalfa", "sevilla", "Alfalfa", "zona", 37.39083, -5.99083, "Pérez Galdós llena los fines de semana"),
  P("cur:sevilla:zona-alameda-de-hercules", "sevilla", "Alameda de Hércules", "zona", 37.39812, -5.99389, "Zona alternativa y LGTBI+"),
];
