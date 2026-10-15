import type { I18n } from '@/i18n';

import { homeOf, myShare } from './budget';
import { CATEGORIES } from './categories';
import { normalizeMerchant } from './categorize';
import { balances } from './groups';
import { detectSubscriptions, matchesSearch, monthForecast } from './insights';
import { findMoney } from './notifications';
import { parseAmount } from './money';
import type { AppState, Cents, CategoryId, Expense } from './types';
import { convert, FALLBACK } from '../fx/fx';

/**
 * Asistente que responde preguntas sobre tus gastos en el propio móvil (sin
 * internet ni datos que salgan del teléfono). Entiende frases en español,
 * inglés, francés, alemán, italiano, portugués, catalán y neerlandés:
 * «¿cuánto gasté en Glovo este año?», «¿puedo permitirme 400 € en diciembre?»,
 * «¿en qué gasto más?», «mayor gasto del mes», «¿cuánto me deben?»…
 */

type Intent = 'left' | 'spend' | 'afford' | 'top' | 'biggest' | 'average' | 'subs' | 'debts' | 'goals' | 'help';

const RX = (words: string[]) => new RegExp(`(^|\\s)(${words.join('|')})(?=\\s|$)`, 'u');

const INTENTS: [Intent, RegExp][] = [
  // «¿Cuánto me queda para el súper?»: lo que queda del presupuesto, no lo gastado.
  ['left', RX(['queda', 'quedan', 'me queda', 'left', 'remaining', 'reste', 'restant', 'ubrig', 'rimane', 'rimasto', 'resta', 'sobra', 'queden', 'queda me', 'over voor'])],
  ['afford', RX(['permitirme', 'permitir', 'afford', 'permettre', 'leisten', 'permettermi', 'permitir me', 'pagar me', 'puc permetre', 'veroorloven', 'puedo gastar', 'can i spend', 'me da para', 'llego'])],
  ['subs', RX(['suscripciones', 'suscripcion', 'subscriptions', 'subscription', 'abonnements', 'abos', 'abonnamenti', 'assinaturas', 'subscripcions', 'abonnementen'])],
  ['debts', RX(['deben', 'debo', 'owe', 'owes', 'owed', 'doit', 'dois', 'schulde', 'schuldet', 'devo', 'deve', 'devem', 'deuen', 'dec', 'schuld', 'deudas', 'debts'])],
  ['goals', RX(['metas', 'meta', 'ahorro', 'goals', 'goal', 'savings', 'objectifs', 'sparziele', 'obiettivi', 'objectius', 'spaardoelen'])],
  ['biggest', RX(['mayor', 'mas caro', 'mas grande', 'biggest', 'largest', 'most expensive', 'plus grosse', 'plus cher', 'grosste', 'teuerste', 'piu grande', 'piu cara', 'maior', 'mais caro', 'mes gran', 'grootste', 'duurste'])],
  ['top', RX(['en que', 'donde mas', 'que mas', 'where', 'what do i spend most', 'most on', 'ou je', 'wofur', 'wo am meisten', 'in cosa', 'onde', 'en que mes', 'waaraan', 'en que gasto'])],
  ['average', RX(['media', 'promedio', 'average', 'moyenne', 'durchschnitt', 'media al dia', 'mitjana', 'gemiddeld'])],
  ['spend', RX(['cuanto', 'gaste', 'gastado', 'gasto', 'how much', 'spent', 'spend', 'combien', 'depense', 'wie viel', 'wieviel', 'ausgegeben', 'quanto', 'speso', 'gastei', 'quant', 'he gastat', 'hoeveel', 'uitgegeven', 'total'])],
];

type PeriodId = 'today' | 'yesterday' | 'thisWeek' | 'lastWeek' | 'thisMonth' | 'lastMonth' | 'thisYear' | 'lastYear' | 'month' | 'all';
interface Period {
  id: PeriodId;
  start: Date;
  end: Date;
  /** Para "month": el mes concreto. */
  month?: Date;
}

const PERIODS: [PeriodId, RegExp][] = [
  ['yesterday', RX(['ayer', 'yesterday', 'hier', 'gestern', 'ieri', 'ontem', 'ahir', 'gisteren'])],
  ['today', RX(['hoy', 'today', 'aujourd hui', 'heute', 'oggi', 'hoje', 'avui', 'vandaag'])],
  ['lastWeek', RX(['semana pasada', 'last week', 'semaine derniere', 'letzte woche', 'settimana scorsa', 'semana passada', 'setmana passada', 'vorige week'])],
  ['thisWeek', RX(['esta semana', 'this week', 'cette semaine', 'diese woche', 'questa settimana', 'aquesta setmana', 'deze week'])],
  ['lastMonth', RX(['mes pasado', 'last month', 'mois dernier', 'letzten monat', 'letzter monat', 'mese scorso', 'mes passado', 'mes passat', 'vorige maand'])],
  ['thisMonth', RX(['este mes', 'this month', 'ce mois', 'diesen monat', 'dieser monat', 'questo mese', 'aquest mes', 'deze maand'])],
  ['lastYear', RX(['ano pasado', 'last year', 'annee derniere', 'letztes jahr', 'anno scorso', 'ano passado', 'any passat', 'vorig jaar'])],
  ['thisYear', RX(['este ano', 'this year', 'cette annee', 'dieses jahr', 'quest anno', 'aquest any', 'dit jaar', 'en el ano', 'del ano'])],
  ['all', RX(['siempre', 'nunca', 'ever', 'all time', 'en total', 'desde el principio', 'jamais', 'insgesamt', 'sempre', 'ooit'])],
];

// Palabras que no dicen qué buscar (para quedarnos con «glovo», «mercadona», «uber»…).
const STOP = new Set(
  'cuanto cuanta cuantos he has ha hemos gaste gastado gasto gastar gastamos en el la los las de del al un una mi mis me yo este esta estos ano mes semana dia hoy ayer pasado pasada que y o con por para total dinero euros euro dolares how much did i spend spent on in at the this last year month week today yesterday my money what where most combien ai j depense dans le les ce cette mois annee semaine wie viel habe ich ausgegeben fur im diesen dieses letzten jahr monat woche quanto ho speso per questo quest anno mese settimana quant ha gastat aquest any hoeveel heb ik uitgegeven aan dit jaar maand deze week ou je'.split(
    ' ',
  ),
);

// Sinónimos de categorías que no son su nombre (el nombre en tu idioma ya se reconoce).
const CAT_WORDS: Partial<Record<CategoryId, string[]>> = {
  comer: ['comida', 'comidas', 'restaurantes', 'restaurante', 'restaurants', 'restaurant', 'food', 'eating', 'delivery', 'bares', 'cafes', 'essen', 'cibo', 'ristoranti', 'repas', 'menjar', 'eten'],
  super: ['super', 'supermercado', 'supermercados', 'compra', 'groceries', 'grocery', 'courses', 'lebensmittel', 'spesa', 'mercado', 'boodschappen'],
  transporte: ['transporte', 'gasolina', 'taxi', 'transport', 'fuel', 'benzin', 'trasporti', 'combustivel', 'vervoer'],
  ocio: ['ocio', 'fiesta', 'fiestas', 'cine', 'fun', 'leisure', 'loisirs', 'freizeit', 'svago', 'lazer', 'oci', 'uitgaan'],
  compras: ['compras', 'ropa', 'shopping', 'clothes', 'vetements', 'kleidung', 'vestiti', 'roupa', 'roba', 'kleding'],
  casa: ['casa', 'alquiler', 'facturas', 'home', 'rent', 'bills', 'logement', 'loyer', 'miete', 'wohnung', 'affitto', 'bollette', 'renda', 'lloguer', 'huur'],
  salud: ['salud', 'farmacia', 'medico', 'health', 'pharmacy', 'sante', 'gesundheit', 'salute', 'saude', 'salut', 'gezondheid'],
  suscripciones: ['suscripciones', 'subscriptions', 'abos'],
  deporte: ['deporte', 'gimnasio', 'gym', 'sport', 'sports', 'esporte', 'esport'],
  estudios: ['estudios', 'universidad', 'libros', 'studies', 'books', 'education', 'etudes', 'studium', 'studio', 'estudos', 'estudis', 'studie'],
};

const DAY = 86_400_000;

// Saludos: «hola» no es una pregunta sobre gastos.
const GREETING = RX(['hola', 'buenas', 'buenos dias', 'buenas tardes', 'hello', 'hi', 'hey', 'good morning', 'bonjour', 'salut', 'hallo', 'guten tag', 'ciao', 'buongiorno', 'ola', 'oi', 'bom dia', 'bon dia', 'hoi', 'goedemorgen', 'hej', 'moi', 'czesc', 'ahoj', 'buna', 'merhaba', 'pryvit']);

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function periodRange(id: PeriodId, today: Date, month?: Date): Period {
  const t0 = startOfDay(today);
  const monday = new Date(t0.getTime() - ((t0.getDay() + 6) % 7) * DAY);
  switch (id) {
    case 'today':
      return { id, start: t0, end: new Date(t0.getTime() + DAY) };
    case 'yesterday':
      return { id, start: new Date(t0.getTime() - DAY), end: t0 };
    case 'thisWeek':
      return { id, start: monday, end: new Date(monday.getTime() + 7 * DAY) };
    case 'lastWeek':
      return { id, start: new Date(monday.getTime() - 7 * DAY), end: monday };
    case 'lastMonth':
      return { id, start: new Date(t0.getFullYear(), t0.getMonth() - 1, 1), end: new Date(t0.getFullYear(), t0.getMonth(), 1) };
    case 'thisYear':
      return { id, start: new Date(t0.getFullYear(), 0, 1), end: new Date(t0.getFullYear() + 1, 0, 1) };
    case 'lastYear':
      return { id, start: new Date(t0.getFullYear() - 1, 0, 1), end: new Date(t0.getFullYear(), 0, 1) };
    case 'month': {
      const m = month!;
      return { id, start: new Date(m.getFullYear(), m.getMonth(), 1), end: new Date(m.getFullYear(), m.getMonth() + 1, 1), month: m };
    }
    case 'all':
      return { id, start: new Date(2000, 0, 1), end: new Date(t0.getFullYear() + 1, 0, 1) };
    default:
      return { id: 'thisMonth', start: new Date(t0.getFullYear(), t0.getMonth(), 1), end: new Date(t0.getFullYear(), t0.getMonth() + 1, 1) };
  }
}

/** Nombres de los meses en el idioma de la app, en inglés y en español (sin tildes). */
function monthNames(locale: string): string[][] {
  const fmt = (loc: string, style: 'long' | 'short') =>
    Array.from({ length: 12 }, (_, m) => normalizeMerchant(new Date(2026, m, 15).toLocaleString(loc, { month: style })));
  return Array.from({ length: 12 }, (_, m) => [
    ...new Set([fmt(locale, 'long')[m], fmt('en', 'long')[m], fmt('es', 'long')[m], fmt(locale, 'short')[m].replace(/\s/g, '')]),
  ]).map((names) => names.filter((n) => n.length >= 3));
}

function detectPeriod(q: string, today: Date, locale: string): Period {
  for (const [id, rx] of PERIODS) if (rx.test(q)) return periodRange(id, today);
  const names = monthNames(locale);
  for (let m = 0; m < 12; m++) {
    if (names[m].some((n) => RX([n]).test(q))) {
      // El último mes con ese nombre que no está en el futuro (salvo para «¿puedo permitirme…?»).
      const year = m > today.getMonth() ? today.getFullYear() - 1 : today.getFullYear();
      return periodRange('month', today, new Date(year, m, 1));
    }
  }
  return periodRange('thisMonth', today);
}

/** Un mes futuro nombrado en la pregunta («en diciembre»), o null. */
function detectFutureMonth(q: string, today: Date, locale: string): Date | null {
  const names = monthNames(locale);
  for (let m = 0; m < 12; m++) {
    if (names[m].some((n) => RX([n]).test(q))) return new Date(m < today.getMonth() ? today.getFullYear() + 1 : today.getFullYear(), m, 1);
  }
  return null;
}

function detectCategory(q: string, i18n: I18n): CategoryId | null {
  for (const c of CATEGORIES) {
    const words = [normalizeMerchant(i18n.t(`cat.${c.id}`)), ...(CAT_WORDS[c.id] ?? [])].filter(Boolean);
    if (words.some((w) => RX([w]).test(q))) return c.id;
  }
  return null;
}

function inRange(e: Expense, p: Period) {
  const t = new Date(e.date).getTime();
  return t >= p.start.getTime() && t < p.end.getTime();
}

export interface AssistantContext {
  state: AppState;
  i18n: I18n;
  today?: Date;
}

/** Responde a una pregunta con una o varias frases cortas. */
export function answer(question: string, { state, i18n, today = new Date() }: AssistantContext): string[] {
  const { t, money } = i18n;
  const q = normalizeMerchant(question);
  if (!q) return [t('asst.help')];
  const found = INTENTS.find(([, rx]) => rx.test(q))?.[0];
  // Solo un saludo («hola», «buenas»): se saluda y se dan ejemplos de preguntas.
  if (!found && GREETING.test(q) && q.split(' ').length <= 3) return [t('asst.hello'), `• ${t('fixa.exLeft')}`, `• ${t('asst.ex1')}`, `• ${t('asst.ex5')}`];
  const intent = found ?? (findMoney(question, state.profile.currency) ? 'afford' : 'spend');
  const home = homeOf(state);
  const share = (e: Expense) => myShare(e, state.groups, home);
  const period = detectPeriod(q, today, i18n.locale);
  const periodLabel =
    period.id === 'month' ? i18n.t('asst.inMonth', { month: i18n.date(period.start, { month: 'long', year: 'numeric' }) }) : t(`asst.p_${period.id}`);
  const mine = state.expenses.filter((e) => share(e) > 0);

  if (intent === 'afford') {
    const money0 = findMoney(question, state.profile.currency);
    const amount = money0?.amount ?? parseAmount(question.match(/\d+(?:[.,]\d{1,2})?/)?.[0] ?? '');
    if (!amount) return [t('asst.help')];
    const target = detectFutureMonth(q, today, i18n.locale);
    const budget = Object.values(state.budgets).reduce<number>((s, v) => s + (v ?? 0), 0);
    let left: Cents;
    let label: string;
    if (!target || (target.getFullYear() === today.getFullYear() && target.getMonth() === today.getMonth())) {
      const f = monthForecast(state, today);
      const spent = mine.filter((e) => inRange(e, periodRange('thisMonth', today))).reduce((s, e) => s + share(e), 0);
      left = budget - (f?.projected ?? spent);
      label = t('asst.p_thisMonth');
    } else {
      // Lo que sueles ahorrar al mes (presupuesto − gasto medio de los últimos 3 meses).
      const months = [1, 2, 3].map((k) => periodRange('month', today, new Date(today.getFullYear(), today.getMonth() - k, 1)));
      const avg = months.reduce((s, p) => s + mine.filter((e) => inRange(e, p)).reduce((a, e) => a + share(e), 0), 0) / 3;
      left = Math.round(budget - avg);
      label = i18n.t('asst.inMonth', { month: i18n.date(target, { month: 'long', year: 'numeric' }) });
    }
    if (budget === 0) return [t('asst.noBudget')];
    return left >= amount
      ? [t('asst.affordYes', { amount: money(amount), left: money(left), period: label })]
      : [t('asst.affordNo', { amount: money(amount), left: money(Math.max(0, left)), missing: money(amount - Math.max(0, left)), period: label })];
  }

  if (intent === 'left') {
    const category = detectCategory(q, i18n);
    const month = periodRange('thisMonth', today);
    const spent = mine.filter((e) => inRange(e, month) && (!category || e.category === category)).reduce((s, e) => s + share(e), 0);
    const budget = category ? state.budgets[category] ?? 0 : Object.values(state.budgets).reduce<number>((s, v) => s + (v ?? 0), 0);
    if (!budget) return category ? [t('fixa.leftNoBudget', { category: t(`cat.${category}`), spent: money(spent) })] : [t('asst.noBudget')];
    const left = budget - spent;
    if (category) {
      return left >= 0
        ? [t('fixa.leftCat', { left: money(left), category: t(`cat.${category}`), spent: money(spent), budget: money(budget) })]
        : [t('fixa.leftCatOver', { over: money(-left), category: t(`cat.${category}`), budget: money(budget) })];
    }
    return left >= 0
      ? [t('fixa.leftTotal', { left: money(left), spent: money(spent), budget: money(budget) })]
      : [t('fixa.leftTotalOver', { over: money(-left), budget: money(budget) })];
  }

  if (intent === 'subs') {
    const subs = detectSubscriptions(state.expenses, today);
    if (!subs.length) return [t('asst.noSubs')];
    const monthly = subs.reduce((s, x) => s + x.monthly, 0);
    return [t('ins.subsTotal', { month: money(monthly), year: money(monthly * 12) }), subs.map((s) => `${s.merchant} ${money(s.monthly)}`).join(' · ')];
  }

  if (intent === 'debts') {
    let owed = 0;
    let owe = 0;
    for (const g of state.groups) {
      const me = g.members.find((m) => m.isMe)?.id;
      if (!me) continue;
      const b = balances(g, state.expenses, state.settlements)[me] ?? 0;
      const amount = g.currency && g.currency !== state.profile.currency ? convert(b, g.currency, state.profile.currency, state.fx ?? FALLBACK) ?? 0 : b;
      if (amount > 0) owed += amount;
      else owe -= amount;
    }
    const lines = [];
    if (owed) lines.push(t('asst.owed', { amount: money(owed) }));
    if (owe) lines.push(t('asst.owe', { amount: money(owe) }));
    return lines.length ? lines : [t('asst.settled')];
  }

  if (intent === 'goals') {
    const goals = state.goals ?? [];
    if (!goals.length) return [t('goal.hint')];
    return goals.map((g) => `${g.emoji} ${g.name}: ${t('goal.progress', { saved: money(g.saved), target: money(g.target) })}`);
  }

  const inPeriod = mine.filter((e) => inRange(e, period));
  if (intent === 'top') {
    const byCat = new Map<CategoryId, Cents>();
    for (const e of inPeriod) byCat.set(e.category, (byCat.get(e.category) ?? 0) + share(e));
    const total = [...byCat.values()].reduce((a, b) => a + b, 0);
    const top = [...byCat.entries()].sort((a, b) => b[1] - a[1])[0];
    if (!top) return [t('asst.none')];
    return [t('asst.top', { period: periodLabel, category: t(`cat.${top[0]}`), amount: money(top[1]), pct: Math.round((top[1] / total) * 100) })];
  }
  if (intent === 'biggest') {
    const big = [...inPeriod].sort((a, b) => share(b) - share(a))[0];
    if (!big) return [t('asst.none')];
    return [t('asst.biggest', { period: periodLabel, merchant: big.merchant, amount: money(share(big)), date: i18n.date(big.date, { day: 'numeric', month: 'short' }) })];
  }

  // Gasto (en total, en una categoría o en un comercio) o media.
  const category = detectCategory(q, i18n);
  const words = q.split(' ').filter((w) => !STOP.has(w) && !/^\d/.test(w) && w.length > 1);
  let filtered = inPeriod;
  let target = '';
  if (category) {
    filtered = inPeriod.filter((e) => e.category === category);
    target = t(`cat.${category}`);
  } else if (words.length) {
    const byText = inPeriod.filter((e) => words.some((w) => matchesSearch(e, w, () => '')));
    // Solo si alguna palabra es un comercio (en todo tu historial), si no, el total.
    if (mine.some((e) => words.some((w) => matchesSearch(e, w, () => '')))) {
      filtered = byText;
      target = words.filter((w) => mine.some((e) => matchesSearch(e, w, () => ''))).join(' ');
      target = target.charAt(0).toUpperCase() + target.slice(1);
    }
  }
  const total = filtered.reduce((s, e) => s + share(e), 0);
  if (intent === 'average') {
    const days = Math.max(1, Math.ceil((Math.min(period.end.getTime(), today.getTime() + 1) - period.start.getTime()) / DAY));
    return [t('asst.average', { period: periodLabel, amount: money(Math.round(total / days)) })];
  }
  if (!filtered.length) return [target ? t('asst.noneFor', { target, period: periodLabel }) : t('asst.none')];
  return [
    target ? t('asst.spentIn', { period: periodLabel, amount: money(total), target }) : t('asst.spentTotal', { period: periodLabel, amount: money(total) }),
    t('asst.count', { count: filtered.length }),
  ];
}
