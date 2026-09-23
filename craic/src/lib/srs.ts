// Repetición espaciada tipo Leitner para el vocabulario.

const DAY = 24 * 60 * 60 * 1000;
/** Días hasta el siguiente repaso según la caja (0 = nueva) */
export const INTERVAL_DAYS = [0, 1, 3, 7, 16, 35];
export const MAX_BOX = INTERVAL_DAYS.length - 1;

export interface SrsState {
  box?: number;
  due?: number;
}

export function isDue(item: SrsState, now = Date.now()): boolean {
  return (item.due ?? 0) <= now;
}

export function review(item: SrsState, knew: boolean, now = Date.now()): Required<SrsState> {
  const box = item.box ?? 0;
  if (knew) {
    const next = Math.min(box + 1, MAX_BOX);
    return { box: next, due: now + INTERVAL_DAYS[next] * DAY };
  }
  // Si fallas vuelve al principio y sale otra vez en 10 minutos
  return { box: 0, due: now + 10 * 60 * 1000 };
}

/** Orden de repaso: primero las más atrasadas y las de caja más baja. */
export function dueQueue<T extends SrsState>(items: T[], now = Date.now(), limit = 20): T[] {
  return items
    .filter((i) => isDue(i, now))
    .sort((a, b) => (a.box ?? 0) - (b.box ?? 0) || (a.due ?? 0) - (b.due ?? 0))
    .slice(0, limit);
}

export function masteryLabel(box = 0): string {
  return ["Nueva", "Aprendiendo", "Aprendiendo", "Casi", "Sabida", "Dominada"][Math.min(box, MAX_BOX)];
}
