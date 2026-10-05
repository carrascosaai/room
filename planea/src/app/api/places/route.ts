import { CATALOG_REVALIDATE, listAllPlaces, listCities } from "@/lib/data";

export const revalidate = 3600;

/**
 * Todos los sitios de España en formato compacto para el mapa:
 * [id, ciudad, nombre, tipo, lat, lng, recomendado].
 */
export async function GET() {
  const [places, cities] = await Promise.all([listAllPlaces(), listCities()]);
  const body = {
    cities: cities.map((c) => [c.slug, c.name, +c.lat.toFixed(5), +c.lng.toFixed(5), c.n]),
    places: places.map((p) => [p.id, p.city, p.name, p.kind[0], +p.lat.toFixed(5), +p.lng.toFixed(5), p.top ? 1 : 0]),
  };
  return Response.json(body, {
    headers: { "Cache-Control": `public, max-age=600, s-maxage=${CATALOG_REVALIDATE}, stale-while-revalidate=86400` },
  });
}
