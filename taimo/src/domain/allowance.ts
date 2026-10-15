import type { Cents } from './types';

/**
 * Paga para niños: huchas de mentira para aprender a manejar dinero. No hay
 * dinero real ni cuentas: la paga semanal se suma sola (se calcula desde el día
 * en que empezó) y tú apuntas lo que gastan o les regalan.
 */
export type Jar = 'spend' | 'save' | 'give';

export const JARS: Jar[] = ['spend', 'save', 'give'];

export const JAR_EMOJI: Record<Jar, string> = { spend: '🛍️', save: '🐷', give: '💝' };

/** Reparto de la paga entre las tres huchas, en %. Suma 100. */
export type Split = Record<Jar, number>;

export const SPLITS: Split[] = [
  { spend: 70, save: 20, give: 10 },
  { spend: 50, save: 40, give: 10 },
  { spend: 60, save: 30, give: 10 },
  { spend: 80, save: 20, give: 0 },
];

export interface KidMove {
  id: string;
  jar: Jar;
  /** Negativo: lo que se gastó o se dio. Positivo: un regalo o dinero extra. */
  amount: Cents;
  /** ISO */
  date: string;
  note?: string;
  /** Saldo que se arrastra al cambiar la paga (no es un gasto ni un regalo). */
  carry?: boolean;
}

export interface Kid {
  id: string;
  name: string;
  emoji: string;
  /** Paga semanal. */
  amount: Cents;
  /** Día de la semana en que cobra (0 = domingo … 6 = sábado, como Date.getDay). */
  weekday: number;
  split: Split;
  /** Desde qué día cuenta la paga (YYYY-MM-DD). */
  start: string;
  moves: KidMove[];
  /** Para qué ahorra (sale de la hucha «Ahorrar»). */
  goal?: { name: string; target: Cents };
}

const DAY = 86_400_000;
const dayStart = (iso: string) => new Date(`${iso}T00:00:00`);

export function isoDay(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Cuántas pagas ha cobrado ya: los días de cobro desde `start` hasta hoy (incluidos). */
export function paydays(kid: Pick<Kid, 'weekday' | 'start'>, today: Date = new Date()): number {
  const from = dayStart(kid.start);
  const to = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  if (to < from) return 0;
  // Primer día de cobro a partir del inicio.
  const first = new Date(from.getFullYear(), from.getMonth(), from.getDate() + ((kid.weekday - from.getDay() + 7) % 7));
  if (first > to) return 0;
  return Math.floor(Math.round((to.getTime() - first.getTime()) / DAY) / 7) + 1;
}

/** El próximo día de cobro (hoy no cuenta: si cobra hoy, ya lo tiene). */
export function nextPayday(kid: Pick<Kid, 'weekday' | 'start'>, today: Date = new Date()): Date {
  const base = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const startDay = dayStart(kid.start);
  const from = startDay > base ? new Date(startDay.getTime() - DAY) : base;
  const diff = (kid.weekday - from.getDay() + 7) % 7 || 7;
  return new Date(from.getFullYear(), from.getMonth(), from.getDate() + diff);
}

/** Cómo se reparte una paga: «Gastar» y «Dar» se redondean a la baja y el resto va a «Ahorrar». */
export function splitAmount(amount: Cents, split: Split): Record<Jar, Cents> {
  const spend = Math.floor((amount * split.spend) / 100);
  const give = Math.floor((amount * split.give) / 100);
  return { spend, save: amount - spend - give, give };
}

/** Lo que hay en cada hucha ahora mismo. */
export function jarBalances(kid: Kid, today: Date = new Date()): Record<Jar, Cents> {
  const n = paydays(kid, today);
  const per = splitAmount(kid.amount, kid.split);
  const out: Record<Jar, Cents> = { spend: per.spend * n, save: per.save * n, give: per.give * n };
  const end = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).getTime();
  for (const m of kid.moves) {
    if (new Date(m.date).getTime() >= end) continue;
    out[m.jar] += m.amount;
  }
  return out;
}

/** Cuánto le falta para su meta (con lo que hay en «Ahorrar») y cuántas semanas más o menos. */
export function goalProgress(kid: Kid, today: Date = new Date()): { saved: Cents; target: Cents; progress: number; weeks: number | null } | null {
  if (!kid.goal || kid.goal.target <= 0) return null;
  const saved = Math.max(0, jarBalances(kid, today).save);
  const left = kid.goal.target - saved;
  const perWeek = splitAmount(kid.amount, kid.split).save;
  return {
    saved,
    target: kid.goal.target,
    progress: Math.min(1, saved / kid.goal.target),
    weeks: left <= 0 ? 0 : perWeek > 0 ? Math.ceil(left / perWeek) : null,
  };
}

/** ¿Se puede sacar esto de esa hucha? (no se gasta lo que no hay). */
export function canSpend(kid: Kid, jar: Jar, amount: Cents, today: Date = new Date()): boolean {
  return amount > 0 && jarBalances(kid, today)[jar] >= amount;
}

/**
 * Cambiar la paga (importe, día o reparto) no cambia lo ya cobrado: se guarda lo
 * que hay en cada hucha como saldo y la nueva paga cuenta desde mañana.
 */
export function rebaseKid(kid: Kid, input: Partial<Pick<Kid, 'amount' | 'weekday' | 'split'>>, today: Date = new Date(), makeId: () => string = () => Math.random().toString(36).slice(2)): Kid {
  // Solo lo que de verdad cambia (un campo sin valor no borra el que había).
  const changes = Object.fromEntries(Object.entries(input).filter(([, v]) => v !== undefined)) as Partial<Pick<Kid, 'amount' | 'weekday' | 'split'>>;
  const changesPay =
    (changes.amount !== undefined && changes.amount !== kid.amount) ||
    (changes.weekday !== undefined && changes.weekday !== kid.weekday) ||
    (changes.split !== undefined && JARS.some((j) => changes.split![j] !== kid.split[j]));
  if (!changesPay) return { ...kid, ...changes };
  const n = paydays(kid, today);
  const per = splitAmount(kid.amount, kid.split);
  const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
  const date = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12).toISOString();
  const carry: KidMove[] = JARS.filter((j) => per[j] * n !== 0).map((j) => ({ id: makeId(), jar: j, amount: per[j] * n, date, carry: true }));
  return { ...kid, ...changes, start: isoDay(tomorrow), moves: [...kid.moves, ...carry] };
}

/** Un reparto válido: tres enteros de 0 a 100 que suman 100. */
export function validSplit(s: unknown): s is Split {
  if (!s || typeof s !== 'object') return false;
  const v = s as Record<string, unknown>;
  const ok = JARS.every((j) => Number.isInteger(v[j]) && (v[j] as number) >= 0 && (v[j] as number) <= 100);
  return ok && JARS.reduce((sum, j) => sum + (v[j] as number), 0) === 100;
}

/** Limpia los niños guardados por una versión anterior o una copia rota. */
export function sanitizeKids(list: unknown): Kid[] | undefined {
  if (!Array.isArray(list)) return undefined;
  const kids: Kid[] = [];
  for (const k of list) {
    if (!k || typeof k !== 'object') continue;
    const o = k as Partial<Kid>;
    if (typeof o.id !== 'string' || typeof o.name !== 'string' || typeof o.start !== 'string') continue;
    kids.push({
      id: o.id,
      name: o.name,
      emoji: typeof o.emoji === 'string' ? o.emoji : '🧒',
      amount: Number.isFinite(o.amount) && (o.amount as number) >= 0 ? Math.round(o.amount as number) : 0,
      weekday: Number.isInteger(o.weekday) && (o.weekday as number) >= 0 && (o.weekday as number) <= 6 ? (o.weekday as number) : 6,
      split: validSplit(o.split) ? o.split : { ...SPLITS[0] },
      start: o.start,
      moves: Array.isArray(o.moves)
        ? o.moves.filter((m) => m && JARS.includes(m.jar) && Number.isFinite(m.amount) && typeof m.date === 'string')
        : [],
      goal: o.goal && typeof o.goal.name === 'string' && Number.isFinite(o.goal.target) ? o.goal : undefined,
    });
  }
  return kids;
}
