import { categorize, normalizeMerchant } from './categorize';
import { splitByWeights, splitEqually } from './groups';
import { parseAmount } from './money';
import { findMoney } from './notifications';
import type { AppState, CategoryId, Cents, Expense, Group } from './types';
import { convert, type Rates } from '../fx/fx';

/* ───────────── Modo viaje: tus pagos en el extranjero, al grupo del viaje ───────────── */

/** Grupos de viaje que están ocurriendo en esa fecha (con un día de margen a cada lado). */
export function activeTrip(groups: Group[], when: Date): Group | undefined {
  const day = 86_400_000;
  return groups.find((g) => {
    if (g.kind !== 'trip' || !g.trip?.start) return false;
    const start = new Date(`${g.trip.start}T00:00:00`).getTime() - day;
    const end = new Date(`${g.trip.end ?? g.trip.start}T23:59:59`).getTime() + day;
    return when.getTime() >= start && when.getTime() <= end;
  });
}

/**
 * Pagos tuyos (solo tuyos todavía) hechos durante un viaje en otra moneda que
 * la tuya, o en la moneda del viaje: casi seguro son del viaje.
 */
export function tripCandidates(state: Pick<AppState, 'expenses' | 'groups' | 'profile' | 'tripDismissed'>): { group: Group; expenses: Expense[] }[] {
  const home = state.profile.currency;
  const dismissed = new Set(state.tripDismissed ?? []);
  const byGroup = new Map<string, Expense[]>();
  for (const e of state.expenses) {
    if (e.groupId || dismissed.has(e.id)) continue;
    const trip = activeTrip(state.groups, new Date(e.date));
    if (!trip) continue;
    const foreign = e.original && e.original.currency !== home;
    const inTripCurrency = !!trip.currency && trip.currency !== home && e.original?.currency === trip.currency;
    if (!foreign && !inTripCurrency) continue;
    byGroup.set(trip.id, [...(byGroup.get(trip.id) ?? []), e]);
  }
  return [...byGroup.entries()].map(([id, expenses]) => ({ group: state.groups.find((g) => g.id === id)!, expenses }));
}

/**
 * Convierte un gasto tuyo en gasto del grupo: lo pagaste tú y se reparte como
 * reparte el grupo por defecto, en la moneda del grupo.
 */
export function moveToGroup(e: Expense, group: Group, home: string, rates: Rates): Expense {
  const me = group.members.find((m) => m.isMe)?.id ?? group.members[0].id;
  const base = group.currency ?? home;
  let amount = e.amount;
  let original = e.original;
  if (e.original && e.original.currency === base) {
    amount = e.original.amount;
    original = undefined;
  } else if (base !== home) {
    amount = convert(e.amount, home, base, rates) ?? e.amount;
    if (original) original = { ...original, rate: amount / original.amount };
  }
  const ids = group.members.map((m) => m.id);
  const shares = group.weights ? splitByWeights(amount, Object.fromEntries(ids.map((id) => [id, group.weights![id] ?? 1]))) : splitEqually(amount, ids);
  return {
    ...e,
    amount,
    original,
    groupId: group.id,
    paidBy: me,
    shares,
    splitMode: group.weights ? 'weights' : 'equal',
    weights: group.weights,
  };
}

/* ───────────── Apuntar rápido: «café 2,50», «cena 45 con Ana y yo ayer» ───────────── */

export interface QuickAdd {
  amount: Cents;
  currency: string;
  merchant: string;
  category: CategoryId;
  groupId?: string;
  /** 0 = hoy, 1 = ayer. */
  daysAgo: number;
}

// "ayer" en los 20 idiomas de la app (y "anteayer" en algunos).
const YESTERDAY = /(^|\s)(ayer|yesterday|hier|gestern|ieri|ontem|ahir|atzo|onte|gisteren|igår|i går|i gar|eilen|wczoraj|včera|vcera|χθες|dün|вчора|вчера)(?=\s|$|[.,])/iu;
const BEFORE_YESTERDAY = /(^|\s)(anteayer|antes de ayer|day before yesterday|vorgestern|avant-hier|l'altro ieri|anteontem|abans-d'ahir|herenegun|eergisteren|i förrgår|i forgårs|i forgårs|toissapäivänä|przedwczoraj|předevčírem|alaltăieri|προχθές|evvelsi gün|позавчора|позавчера)(?=\s|$|[.,])/iu;
const LINKERS = /(^|\s)(con|with|avec|mit|con|com|amb|met|med|kanssa|z|se|cu|με|ile|з|с|en|in|at|para|for|pour|für|per|para|voor|för|for|dla|pro|pentru|για|için|для)(?=\s|$)/giu;

/**
 * Entiende una frase corta: importe (con o sin moneda), comercio, grupo si se
 * nombra y «ayer» en cualquiera de los 20 idiomas. Null si no hay importe.
 */
export function parseQuickAdd(text: string, state: Pick<AppState, 'groups' | 'learnedCategories' | 'profile'>): QuickAdd | null {
  const home = state.profile.currency;
  let rest = ` ${text.trim()} `;
  let amount: Cents | null = null;
  let currency = home;
  const money = findMoney(rest, home);
  if (money) {
    amount = money.amount;
    currency = money.currency;
    rest = rest.replace(money.raw, ' ');
  } else {
    const bare = rest.match(/(^|\s)(\d+(?:[.,]\d{1,2})?)(?=\s|$)/);
    if (bare) {
      amount = parseAmount(bare[2]);
      rest = rest.replace(bare[2], ' ');
    }
  }
  if (!amount) return null;

  let daysAgo = 0;
  if (BEFORE_YESTERDAY.test(rest)) {
    daysAgo = 2;
    rest = rest.replace(BEFORE_YESTERDAY, ' ');
  } else if (YESTERDAY.test(rest)) {
    daysAgo = 1;
    rest = rest.replace(YESTERDAY, ' ');
  }

  // El grupo cuyo nombre aparece (el más largo, por si uno contiene a otro).
  const norm = normalizeMerchant(rest);
  const group = [...state.groups]
    .sort((a, b) => b.name.length - a.name.length)
    .find((g) => {
      const n = normalizeMerchant(g.name);
      return n.length >= 2 && ` ${norm} `.includes(` ${n} `);
    });
  if (group) {
    const words = normalizeMerchant(group.name).split(' ');
    // Quita las palabras del nombre del grupo (sin tildes) de la frase.
    rest = rest
      .split(/\s+/)
      .filter((w) => !words.includes(normalizeMerchant(w)))
      .join(' ');
  }
  rest = rest.replace(LINKERS, ' ').replace(/\s+/g, ' ').trim();
  const merchant = rest ? rest.charAt(0).toLocaleUpperCase() + rest.slice(1) : '';
  return {
    amount,
    currency,
    merchant,
    category: merchant ? categorize(merchant, state.learnedCategories) : 'otros',
    groupId: group?.id,
    daysAgo,
  };
}
