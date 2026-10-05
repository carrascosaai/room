import { describe, expect, it } from "vitest";
import { buildFeed } from "@/lib/feed";
import { getDemoDataset, seedId } from "@/lib/seed";
import { computeTrending } from "@/lib/trending";

const now = new Date("2026-10-03T23:30:00Z"); // sábado 01:30 en Madrid
const ds = getDemoDataset(now);
const input = (city: string) => ({
  citySlug: city,
  venues: ds.venues.filter((v) => v.citySlug === city),
  events: ds.events.filter((e) => e.citySlug === city),
  plans: ds.plans.filter((p) => p.citySlug === city),
  stats: Object.fromEntries(ds.activity),
});

describe("datos demo", () => {
  it("todo está marcado como demo y con ids uuid estables", () => {
    expect(ds.venues.every((v) => v.isDemo)).toBe(true);
    expect(ds.events.every((e) => e.isDemo)).toBe(true);
    expect(seedId("x")).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-8[0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(new Set(ds.venues.map((v) => v.id)).size).toBe(ds.venues.length);
  });
  it("cubre las ciudades principales", () => {
    for (const c of ["cordoba", "sevilla", "malaga", "granada", "madrid", "barcelona", "valencia", "salamanca"])
      expect(ds.venues.some((v) => v.citySlug === c)).toBe(true);
  });
});

describe("feed", () => {
  it("'Ahora' un sábado de madrugada tiene sitios en marcha, primero los en vivo", () => {
    const feed = buildFeed(input("cordoba"), "ahora", now);
    expect(feed.length).toBeGreaterThan(3);
    expect(feed[0]!.live).toBe(true);
  });
  it("no duplica un local que tiene evento en la misma ventana", () => {
    const feed = buildFeed(input("cordoba"), "noche", now);
    const eventVenueIds = new Set(input("cordoba").events.filter((e) => feed.some((f) => f.id === e.id)).map((e) => e.venueId));
    expect(feed.some((f) => f.type === "venue" && eventVenueIds.has(f.id))).toBe(false);
  });
  it("el ranking de tendencias está ordenado por puntuación", () => {
    const t = computeTrending(input("madrid"), now);
    expect(t.length).toBeGreaterThan(3);
    for (let i = 1; i < t.length; i++) expect(t[i - 1]!.score).toBeGreaterThanOrEqual(t[i]!.score);
  });
});
