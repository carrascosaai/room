/**
 * "Voy" — sin cuentas ni emails. Cada navegador tiene un identificador anónimo
 * (localStorage) y puede poner su nombre si quiere. Las escrituras van directas a
 * Supabase (funciones planea_mark_going / planea_unmark_going, con límites
 * anti-spam en la base de datos); las lecturas pasan por /api/going, cacheadas en la CDN.
 */
import { HAS_BACKEND, MAX_GOING_PER_NIGHT, SUPABASE_ANON_KEY, SUPABASE_URL } from "./config";
import type { Going, GoingMap } from "./types";
import { uid } from "./utils";

const DEVICE_KEY = "planea:device";
const NAME_KEY = "planea:name";
const MINE_KEY = "planea:mine";

function store(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

/** La noche va de 08:00 a 08:00 (hora de Madrid), igual que en la base de datos. */
export function nightKey(now = new Date()): string {
  const madrid = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Madrid" }));
  madrid.setHours(madrid.getHours() - 8);
  const y = madrid.getFullYear();
  const m = String(madrid.getMonth() + 1).padStart(2, "0");
  const d = String(madrid.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function deviceId(): string {
  const s = store();
  let id = s?.getItem(DEVICE_KEY);
  if (!id || !/^[0-9a-f-]{36}$/.test(id)) {
    id = uid();
    s?.setItem(DEVICE_KEY, id);
  }
  return id;
}

export function savedName(): string | null {
  return store()?.getItem(NAME_KEY) ?? null;
}

export function saveName(name: string | null) {
  const s = store();
  if (!s) return;
  if (name) s.setItem(NAME_KEY, name);
  else s.removeItem(NAME_KEY);
}

/** Sitios marcados por este dispositivo esta noche (para pintar el botón al instante). */
export function myGoing(): Set<string> {
  try {
    const raw = JSON.parse(store()?.getItem(MINE_KEY) ?? "null") as { night: string; ids: string[] } | null;
    if (raw && raw.night === nightKey()) return new Set(raw.ids);
  } catch {
    /* almacenamiento corrupto: empezamos de cero */
  }
  return new Set();
}

function saveMine(ids: Set<string>) {
  store()?.setItem(MINE_KEY, JSON.stringify({ night: nightKey(), ids: [...ids] }));
}

export function cleanName(input: string): string | null {
  const name = input.replace(/[<>{}[\]\\\u0000-\u001f]/g, "").replace(/\s+/g, " ").trim().slice(0, 24);
  return name || null;
}

async function call<T>(fn: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    if (text.includes("limit device")) throw new Error(`Solo puedes marcar ${MAX_GOING_PER_NIGHT} sitios por noche`);
    if (text.includes("limit ip")) throw new Error("Demasiados \"Voy\" desde esta red, prueba más tarde");
    throw new Error("No se ha podido guardar, inténtalo de nuevo");
  }
  return (await res.json()) as T;
}

export async function markGoing(venueId: string, city: string, name: string | null): Promise<number | null> {
  const mine = myGoing();
  if (!mine.has(venueId) && mine.size >= MAX_GOING_PER_NIGHT) {
    throw new Error(`Solo puedes marcar ${MAX_GOING_PER_NIGHT} sitios por noche`);
  }
  let total: number | null = null;
  if (HAS_BACKEND) {
    const r = await call<{ total: number }>("planea_mark_going", { p_venue: venueId, p_city: city, p_device: deviceId(), p_name: name });
    total = r.total;
  }
  mine.add(venueId);
  saveMine(mine);
  return total;
}

export async function unmarkGoing(venueId: string): Promise<number | null> {
  let total: number | null = null;
  if (HAS_BACKEND) {
    const r = await call<{ total: number }>("planea_unmark_going", { p_venue: venueId, p_device: deviceId() });
    total = r.total;
  }
  const mine = myGoing();
  mine.delete(venueId);
  saveMine(mine);
  return total;
}

export async function fetchGoing(path: string): Promise<GoingMap> {
  if (!HAS_BACKEND) return {};
  const res = await fetch(path);
  if (!res.ok) return {};
  return (await res.json()) as GoingMap;
}

export function goingLabel(g: Going | undefined): string {
  const total = g?.total ?? 0;
  if (total === 0) return "Sé el primero en decir que vas";
  const names = g?.names ?? [];
  if (names.length === 0) return total === 1 ? "1 persona va esta noche" : `${total} personas van esta noche`;
  const shown = names.slice(0, 3);
  const rest = total - shown.length;
  return rest > 0 ? `${shown.join(", ")} y ${rest} más van esta noche` : `${shown.join(", ").replace(/, ([^,]*)$/, " y $1")} ${total === 1 ? "va" : "van"} esta noche`;
}
