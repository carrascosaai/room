/**
 * Utilidades de fecha en hora de España peninsular (Europe/Madrid).
 * El servidor corre en UTC; toda la lógica de "esta noche" se calcula aquí.
 */
import type { OpeningHours } from "./types";

export const TZ = "Europe/Madrid";
/** La "noche" de un día termina a las 07:00 del día siguiente. */
export const NIGHT_ROLLOVER_HOUR = 7;

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

const partsFmt = new Intl.DateTimeFormat("en-GB", {
  timeZone: TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

export interface WallParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

export function madridParts(d: Date): WallParts {
  const out: Record<string, number> = {};
  for (const p of partsFmt.formatToParts(d)) {
    if (p.type !== "literal") out[p.type] = Number(p.value);
  }
  return {
    year: out.year!,
    month: out.month!,
    day: out.day!,
    hour: out.hour! % 24,
    minute: out.minute!,
    second: out.second!,
  };
}

function offsetMs(d: Date): number {
  const p = madridParts(d);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - Math.floor(d.getTime() / 1000) * 1000;
}

/** Fecha civil (sin hora) representada como {year, month, day}. */
export interface CivilDate {
  year: number;
  month: number;
  day: number;
}

export function addDays(date: CivilDate, n: number): CivilDate {
  const t = new Date(Date.UTC(date.year, date.month - 1, date.day + n));
  return { year: t.getUTCFullYear(), month: t.getUTCMonth() + 1, day: t.getUTCDate() };
}

/** 0 = domingo … 6 = sábado */
export function weekdayOf(date: CivilDate): 0 | 1 | 2 | 3 | 4 | 5 | 6 {
  return new Date(Date.UTC(date.year, date.month - 1, date.day)).getUTCDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6;
}

/** Hora de pared en Madrid → instante absoluto. */
export function wallToDate(date: CivilDate, hhmm: string): Date {
  const [hh, mm] = hhmm.split(":").map(Number) as [number, number];
  const guess = Date.UTC(date.year, date.month - 1, date.day, hh, mm);
  const first = offsetMs(new Date(guess));
  let t = guess - first;
  const second = offsetMs(new Date(t));
  if (second !== first) t = guess - second;
  return new Date(t);
}

/** Día civil de la noche en curso (antes de las 07:00 cuenta como la noche anterior). */
export function nightDate(now: Date): CivilDate {
  const p = madridParts(now);
  const today = { year: p.year, month: p.month, day: p.day };
  return p.hour < NIGHT_ROLLOVER_HOUR ? addDays(today, -1) : today;
}

export function civilKey(d: CivilDate): string {
  return `${d.year}-${String(d.month).padStart(2, "0")}-${String(d.day).padStart(2, "0")}`;
}

export function nightKey(now: Date): string {
  return civilKey(nightDate(now));
}

export type TimeTab = "ahora" | "noche" | "manana" | "finde";

export const TIME_TABS: { id: TimeTab; label: string }[] = [
  { id: "ahora", label: "Ahora" },
  { id: "noche", label: "Esta noche" },
  { id: "manana", label: "Mañana" },
  { id: "finde", label: "Finde" },
];

export interface Window {
  from: Date;
  to: Date;
}

/** Ventana temporal de cada pestaña de la home. */
export function windowFor(tab: TimeTab, now: Date): Window {
  const night = nightDate(now);
  switch (tab) {
    case "ahora":
      return { from: now, to: new Date(now.getTime() + 2 * HOUR) };
    case "noche":
      return { from: now, to: wallToDate(addDays(night, 1), "07:00") };
    case "manana": {
      const tomorrow = addDays(night, 1);
      return { from: wallToDate(tomorrow, "12:00"), to: wallToDate(addDays(tomorrow, 1), "07:00") };
    }
    case "finde": {
      const wd = weekdayOf(night);
      // Viernes (5), sábado (6) y domingo (0) ya son finde.
      const untilSunday = wd === 0 ? 0 : 7 - wd;
      const sunday = addDays(night, untilSunday);
      const to = wallToDate(addDays(sunday, 1), "07:00");
      if (wd === 5 || wd === 6 || wd === 0) return { from: now, to };
      const friday = addDays(night, 5 - wd);
      return { from: wallToDate(friday, "18:00"), to };
    }
  }
}

export function overlaps(aFrom: Date, aTo: Date, w: Window): boolean {
  return aFrom < w.to && aTo > w.from;
}

/** Intervalos de apertura de un local entre dos fechas. */
export function openIntervals(hours: OpeningHours, from: Date, to: Date): Window[] {
  const out: Window[] = [];
  const start = addDays(nightDate(from), -1);
  const days = Math.ceil((to.getTime() - from.getTime()) / DAY) + 2;
  for (let k = 0; k <= days; k++) {
    const day = addDays(start, k);
    const h = hours[weekdayOf(day)];
    if (!h) continue;
    const [open, close] = h;
    // Convención: las horas anteriores a las 07:00 pertenecen al día siguiente
    // ("sábado 00:30" = madrugada del domingo).
    const openAt = wallToDate(addDays(day, open < "07:00" ? 1 : 0), open);
    let closeAt = wallToDate(addDays(day, close < "07:00" ? 1 : 0), close);
    if (closeAt <= openAt) closeAt = new Date(closeAt.getTime() + DAY);
    if (overlaps(openAt, closeAt, { from, to })) out.push({ from: openAt, to: closeAt });
  }
  return out;
}

const timeFmt = new Intl.DateTimeFormat("es-ES", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
const dayFmt = new Intl.DateTimeFormat("es-ES", { timeZone: TZ, weekday: "short", day: "numeric", month: "short" });
const longDayFmt = new Intl.DateTimeFormat("es-ES", { timeZone: TZ, weekday: "long", day: "numeric", month: "long" });

export function formatTime(d: Date | string): string {
  return timeFmt.format(typeof d === "string" ? new Date(d) : d);
}

function sameCivil(a: CivilDate, b: CivilDate) {
  return a.year === b.year && a.month === b.month && a.day === b.day;
}

/** "Hoy", "Mañana" o "vie, 12 oct" — según la noche (no el día natural). */
export function formatDay(d: Date | string, now: Date): string {
  const date = typeof d === "string" ? new Date(d) : d;
  const n = nightDate(now);
  const target = nightDate(date);
  if (sameCivil(target, n)) return "Hoy";
  if (sameCivil(target, addDays(n, 1))) return "Mañana";
  return capitalize(dayFmt.format(date).replace(".", ""));
}

export function formatLongDay(d: Date | string): string {
  return capitalize(longDayFmt.format(typeof d === "string" ? new Date(d) : d));
}

export function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** "En marcha", "Empieza en 40 min", "Hoy · 23:30" */
export function startLabel(start: Date, end: Date | null, now: Date): string {
  if (start <= now && (!end || end > now)) return "En marcha";
  const diff = start.getTime() - now.getTime();
  if (diff > 0 && diff < HOUR) return `Empieza en ${Math.max(1, Math.round(diff / 60000))} min`;
  if (diff > 0 && diff < 3 * HOUR) {
    const h = Math.floor(diff / HOUR);
    const m = Math.round((diff % HOUR) / 60000);
    return m ? `Empieza en ${h} h ${m} min` : `Empieza en ${h} h`;
  }
  return `${formatDay(start, now)} · ${formatTime(start)}`;
}

/** "hace 5 min", "hace 2 h", "hace 3 días" */
export function timeAgo(iso: string, now: Date = new Date()): string {
  const diff = Math.max(0, now.getTime() - new Date(iso).getTime());
  const min = Math.floor(diff / 60000);
  if (min < 1) return "ahora";
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.floor(h / 24);
  return d === 1 ? "ayer" : `hace ${d} días`;
}

export { HOUR, DAY };
