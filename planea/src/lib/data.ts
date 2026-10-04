/**
 * Lecturas del catálogo (servidor). Los datos viven en Supabase (tablas planea_cities y
 * planea_places, expuestas solo mediante funciones de lectura) y se cachean con ISR:
 * miles de visitas a la vez se sirven desde la CDN sin tocar la base de datos.
 */
import "server-only";
import { cache } from "react";
import { HAS_BACKEND, SUPABASE_ANON_KEY, SUPABASE_URL } from "./config";
import { SAMPLE_CITIES, SAMPLE_PLACES } from "./sample";
import { placeSlug } from "./slug";
import type { City, Place } from "./types";

export const CATALOG_REVALIDATE = 3600;

async function rpc<T>(fn: string, params: Record<string, string> = {}): Promise<T> {
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}${qs ? `?${qs}` : ""}`, {
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
    next: { revalidate: CATALOG_REVALIDATE, tags: ["catalog"] },
  });
  if (!res.ok) throw new Error(`[supabase] ${fn}: ${res.status} ${await res.text()}`);
  return (await res.json()) as T;
}

export const listCities = cache(async (): Promise<City[]> => {
  if (!HAS_BACKEND) return SAMPLE_CITIES;
  return rpc<City[]>("planea_list_cities");
});

export const getCity = cache(async (slug: string): Promise<City | null> => {
  return (await listCities()).find((c) => c.slug === slug) ?? null;
});

export const listPlaces = cache(async (city: string): Promise<Place[]> => {
  if (!HAS_BACKEND) return SAMPLE_PLACES.filter((p) => p.city === city);
  return rpc<Place[]>("planea_list_places", { p_city: city });
});

export const listAllPlaces = cache(async (): Promise<Place[]> => {
  if (!HAS_BACKEND) return SAMPLE_PLACES;
  return rpc<Place[]>("planea_list_places");
});

export async function getPlace(city: string, id: string): Promise<Place | null> {
  return (await listPlaces(city)).find((p) => placeSlug(p) === id) ?? null;
}
