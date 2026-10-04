import type { Kind } from "./types";

export const KINDS: Record<Kind, { label: string; plural: string; emoji: string; color: string }> = {
  zona: { label: "Zona de ambiente", plural: "Calles y zonas de ambiente", emoji: "🔥", color: "#ff4d7e" },
  discoteca: { label: "Discoteca", plural: "Discotecas", emoji: "🪩", color: "#c8ff3d" },
  bar: { label: "Bar de copas", plural: "Bares y pubs", emoji: "🍸", color: "#5ce1e6" },
  sala: { label: "Sala / música en directo", plural: "Salas y música en directo", emoji: "🎤", color: "#a78bfa" },
};

export const KIND_ORDER: Kind[] = ["zona", "discoteca", "bar", "sala"];

export function mapsUrl(p: { name: string; lat: number; lng: number }): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${p.name}`)}%20${p.lat},${p.lng}`;
}

export function directionsUrl(p: { lat: number; lng: number }): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}`;
}
