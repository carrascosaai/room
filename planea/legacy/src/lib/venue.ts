import { addDays, formatTime, nightDate, openIntervals, wallToDate, weekdayOf, type Window } from "./time";
import type { OpeningHours } from "./types";

const DAYS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

export function venueStatus(hours: OpeningHours, now: Date): { open: boolean; label: string; tonight: Window | null } {
  const night = nightDate(now);
  const until = wallToDate(addDays(night, 1), "07:00");
  const current = openIntervals(hours, now, new Date(now.getTime() + 1)).find((w) => w.from <= now && w.to > now);
  if (current) return { open: true, label: `Abierto · hasta las ${formatTime(current.to)}`, tonight: current };
  const later = openIntervals(hours, now, until).find((w) => w.from > now);
  if (later) return { open: false, label: `Abre hoy a las ${formatTime(later.from)}`, tonight: later };
  const next = openIntervals(hours, until, new Date(until.getTime() + 7 * 86_400_000))[0];
  if (next) return { open: false, label: `Cerrado hoy · abre el ${DAYS[weekdayOf(nightDate(next.from))]!.toLowerCase()}`, tonight: null };
  return { open: false, label: "Horario no disponible", tonight: null };
}

/** Horario semanal legible, empezando por el lunes. */
export function weeklyHours(hours: OpeningHours): { day: string; value: string }[] {
  return [1, 2, 3, 4, 5, 6, 0].map((d) => {
    const h = hours[d as 0];
    return { day: DAYS[d]!, value: h ? `${h[0]} – ${h[1]}` : "Cerrado" };
  });
}
