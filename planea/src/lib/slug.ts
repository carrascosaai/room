import type { Place } from "./types";

/** Segmento de URL de un sitio dentro de su ciudad: "teatro-kapital", "osm-node-123". */
export function placeSlug(p: Pick<Place, "id" | "city">): string {
  return p.id.replace(`cur:${p.city}:`, "").replace(/[:/]/g, "-");
}

export function placeHref(p: Pick<Place, "id" | "city">): string {
  return `/${p.city}/${placeSlug(p)}`;
}
