import { CITIES } from "./cities";
import type { City } from "./types";

/** Distancia en km (haversine). Se calcula siempre en el dispositivo del usuario. */
export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

export function nearestCity(pos: { lat: number; lng: number }): { city: City; km: number } {
  let best = { city: CITIES[0]!, km: Infinity };
  for (const city of CITIES) {
    const km = distanceKm(pos, city);
    if (km < best.km) best = { city, km };
  }
  return best;
}

export function formatDistance(km: number): string {
  if (km < 1) return `${Math.max(50, Math.round((km * 1000) / 50) * 50)} m`;
  if (km < 10) return `${km.toFixed(1).replace(".", ",")} km`;
  return `${Math.round(km)} km`;
}
