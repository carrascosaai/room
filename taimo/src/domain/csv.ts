import { myShare } from './budget';
import { categorize } from './categorize';
import { parseAmount } from './money';
import type { CategoryId, Cents, Expense, Group } from './types';

/** Escapa un campo para CSV separado por `;` (el formato que abre bien Excel en España). */
function field(value: string): string {
  return /[";\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

function euros(cents: Cents): string {
  return (cents / 100).toFixed(2).replace('.', ',');
}

export interface CsvLabels {
  header: [string, string, string, string, string, string, string, string];
  category: (id: CategoryId) => string;
}

/** Exporta los gastos a CSV (`;` y coma decimal, que Excel abre bien en Europa). */
export function expensesToCsv(expenses: Expense[], groups: Group[], labels: CsvLabels): string {
  const header = labels.header;
  const rows = [...expenses]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((e) => {
      const group = groups.find((g) => g.id === e.groupId);
      return [
        e.date.slice(0, 10),
        e.merchant,
        labels.category(e.category),
        euros(e.amount),
        euros(myShare(e, groups)),
        group?.name ?? '',
        e.source,
        e.note ?? '',
      ]
        .map(field)
        .join(';');
    });
  return `﻿${[header.join(';'), ...rows].join('\r\n')}\r\n`;
}

/** Divide una línea CSV respetando comillas. */
function splitLine(line: string, sep: string): string[] {
  const out: string[] = [];
  let cur = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') {
        quoted = false;
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === sep) {
      out.push(cur.trim());
      cur = '';
    } else {
      cur += ch;
    }
  }
  out.push(cur.trim());
  return out;
}

function detectSeparator(lines: string[]): string {
  const sample = lines.slice(0, 5).join('\n');
  const counts = [';', ',', '\t'].map((s) => [s, sample.split(s).length] as const);
  return counts.sort((a, b) => b[1] - a[1])[0][0];
}

export type DateOrder = 'dmy' | 'mdy';

/**
 * "13/10/2026", "13-10-26", "2026-10-13", "20261013", "13.10.2026 10:22" -> ISO a
 * mediodía (evita saltos de día por zona horaria). En EE. UU. el mes va primero:
 * `order: 'mdy'`.
 */
export function parseDate(value: string, order: DateOrder = 'dmy'): string | null {
  const v = value.trim();
  let y: number;
  let m: number;
  let d: number;
  let match = v.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/) ?? v.match(/^(\d{4})(\d{2})(\d{2})(?:\D|$)/);
  if (match) {
    [y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])];
  } else {
    match = v.match(/^(\d{1,2})[-/.'](\d{1,2})[-/.'\s]{1,2}(\d{2,4})/);
    if (!match) return null;
    const [a, b] = [Number(match[1]), Number(match[2])];
    [d, m] = order === 'mdy' ? [b, a] : [a, b];
    y = Number(match[3]);
    if (y < 100) y += 2000;
  }
  if (m < 1 || m > 12 || d < 1 || d > new Date(Date.UTC(y, m, 0)).getUTCDate()) return null;
  return new Date(Date.UTC(y, m - 1, d, 12)).toISOString();
}

/** Si alguna fecha tiene el primer número > 12 es día/mes; si es el segundo, mes/día. */
export function detectDateOrder(values: string[], fallback: DateOrder = 'dmy'): DateOrder {
  for (const v of values) {
    const m = v.trim().match(/^(\d{1,2})[-/.'](\d{1,2})[-/.']/);
    if (!m) continue;
    if (Number(m[1]) > 12) return 'dmy';
    if (Number(m[2]) > 12) return 'mdy';
  }
  return fallback;
}

// Nombres de columna en los extractos de bancos de todo el mundo (ya normalizados: minúsculas y sin tildes).
const DATE_HEADERS = [
  'fecha', 'fecha operacion', 'fecha valor', 'f operacion', 'f valor', 'date', 'transaction date', 'posted date', 'posting date',
  'booking date', 'trans date', 'value date', 'date operation', 'date de operation', 'date valeur', 'datum', 'buchungstag', 'buchungsdatum',
  'valutadatum', 'wertstellung', 'data', 'data operazione', 'data contabile', 'data valuta', 'data movimento', 'data lancamento',
  'transactiedatum', 'boekdatum', 'bokforingsdag', 'transaktionsdag', 'bokforingsdato', 'dato', 'paivamaara', 'kirjauspaiva',
  'data transakcji', 'data ksiegowania', 'datum zauctovani', 'datum transakce', 'tarih', 'islem tarihi', 'дата', 'дата операции',
  'дата транзакции', 'ημερομηνια', '日付', '日期', '交易日期', '거래일', '거래일자',
];
const CONCEPT_HEADERS = [
  'concepto', 'descripcion', 'comercio', 'movimiento', 'detalle', 'description', 'merchant', 'payee', 'details', 'narrative', 'memo',
  'transaction description', 'name', 'libelle', 'libelle operation', 'beneficiaire', 'verwendungszweck', 'beschreibung', 'buchungstext',
  'empfanger', 'auftraggeber empfanger', 'beguenstigter zahlungspflichtiger', 'descrizione', 'causale', 'descricao', 'historico',
  'omschrijving', 'naam omschrijving', 'naam', 'mededelingen', 'text', 'tekst', 'beskrivning', 'mottagare', 'specifikation', 'beskrivelse',
  'kuvaus', 'saaja maksaja', 'opis', 'tytul', 'kontrahent', 'popis', 'protiucet', 'detalii', 'aciklama', 'описание', 'назначение платежа',
  'περιγραφη', '摘要', '内容', '交易描述', '적요', '내용',
];
const AMOUNT_HEADERS = [
  'importe', 'cantidad', 'importe total', 'importe eur', 'amount', 'transaction amount', 'value', 'betrag', 'umsatz', 'montant',
  'importo', 'valor', 'bedrag', 'belopp', 'belob', 'belop', 'summa', 'maara', 'kwota', 'castka', 'suma', 'tutar', 'сумма',
  'сумма операции', 'ποσο', '金額', '金额', '交易金额', '금액', '거래금액',
];
const DEBIT_HEADERS = ['cargo', 'cargos', 'debito', 'debit', 'debits', 'withdrawal', 'withdrawals', 'money out', 'paid out', 'soll', 'ausgang', 'debit eur', 'addebiti', 'uscite', 'saida', 'af', 'uttag', 'nosto', 'obciazenia', 'wydatki', 'расход', 'списание', '支出', '出金', '출금'];
const CREDIT_HEADERS = ['abono', 'abonos', 'credito', 'credit', 'credits', 'deposit', 'deposits', 'money in', 'paid in', 'haben', 'eingang', 'accrediti', 'entrate', 'entrada', 'bij', 'insattning', 'pano', 'uznania', 'wplywy', 'приход', 'зачисление', '收入', '入金', '입금'];
const CURRENCY_HEADERS = ['moneda', 'divisa', 'currency', 'wahrung', 'devise', 'valuta', 'moeda', 'waluta', 'mena', 'para birimi', 'валюта', '通貨', '币种', '통화'];

function norm(h: string): string {
  return h
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^\p{L}\p{N} ]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Un movimiento leído de un extracto: lo gastado (positivo) y su moneda si el fichero la dice. */
export interface BankRow {
  date: string;
  merchant: string;
  amount: Cents;
  currency?: string;
}

export interface BankRowsResult {
  rows: BankRow[];
  skipped: number;
}

/**
 * Importa un extracto bancario en CSV de cualquier banco: busca las columnas
 * por su nombre en muchos idiomas, acepta importe con signo o columnas de
 * cargo/abono separadas y fechas día/mes o mes/día. Solo se quedan los gastos.
 */
export function csvBankRows(text: string): BankRowsResult {
  const lines = text
    .replace(/^﻿/, '')
    .split(/\r?\n/)
    .filter((l) => l.trim().length > 0);
  if (lines.length === 0) return { rows: [], skipped: 0 };
  const sep = detectSeparator(lines);

  // La cabecera puede no estar en la primera línea (muchos bancos ponen antes el titular o el IBAN).
  let headerIdx = -1;
  let cols = { date: -1, concept: -1, amount: -1, debit: -1, credit: -1, currency: -1 };
  for (let i = 0; i < Math.min(lines.length, 20); i++) {
    const cells = splitLine(lines[i], sep).map(norm);
    const find = (names: string[]) => cells.findIndex((c) => names.includes(c));
    const found = {
      date: find(DATE_HEADERS),
      concept: find(CONCEPT_HEADERS),
      amount: find(AMOUNT_HEADERS),
      debit: find(DEBIT_HEADERS),
      credit: find(CREDIT_HEADERS),
      currency: find(CURRENCY_HEADERS),
    };
    if (found.date !== -1 && (found.amount !== -1 || found.debit !== -1)) {
      headerIdx = i;
      cols = found;
      break;
    }
  }
  if (headerIdx === -1) return { rows: [], skipped: lines.length };

  const rows = lines.slice(headerIdx + 1).map((l) => splitLine(l, sep));
  const order = detectDateOrder(rows.map((r) => r[cols.date] ?? ''));
  const signedOf = (raw: string) => {
    const cents = parseAmount(raw);
    if (cents === null) return null;
    return /^\s*\(?-|-\s*$|^\(.*\)$/.test(raw.trim()) ? -cents : cents;
  };
  // Positivo = gasto. Con columnas separadas, lo que hay en "cargo" es gasto.
  const spend = rows.map((r) => {
    if (cols.amount === -1 || (cols.debit !== -1 && (r[cols.debit] ?? '').trim())) {
      const d = parseAmount(r[cols.debit] ?? '');
      return d ? Math.abs(d) : null;
    }
    const v = signedOf(r[cols.amount] ?? '');
    return v === null ? null : -v;
  });
  const anySpendSigned = cols.amount !== -1 && spend.some((v) => v !== null && v > 0);

  const out: BankRow[] = [];
  let skipped = 0;
  rows.forEach((r, i) => {
    let value = spend[i];
    // Si el fichero solo trae importes positivos, son todos gastos.
    if (cols.amount !== -1 && !anySpendSigned && value !== null) value = Math.abs(value);
    const date = parseDate(r[cols.date] ?? '', order);
    if (value === null || value <= 0 || !date) {
      skipped++;
      return;
    }
    const currency = cols.currency !== -1 ? (r[cols.currency] ?? '').trim().toUpperCase() : '';
    out.push({
      date,
      merchant: (cols.concept !== -1 ? r[cols.concept] : '')?.trim() || '',
      amount: value,
      currency: /^[A-Z]{3}$/.test(currency) ? currency : undefined,
    });
  });
  return { rows: out, skipped };
}

export interface CsvImportResult {
  expenses: Omit<Expense, 'id'>[];
  /** Filas que no se pudieron leer (cabeceras sueltas, saldos, ingresos…). */
  skipped: number;
}

/** Movimientos -> gastos (categoría sugerida por el comercio). */
export function rowsToExpenses(rows: BankRow[], learned: Record<string, CategoryId> = {}, fallbackMerchant = 'Movimiento importado'): Omit<Expense, 'id'>[] {
  return rows.map((r) => {
    const merchant = r.merchant || fallbackMerchant;
    return { amount: r.amount, merchant, category: categorize(merchant, learned), date: r.date, source: 'csv' as const };
  });
}

export function parseBankCsv(text: string, learned: Record<string, CategoryId> = {}): CsvImportResult {
  const { rows, skipped } = csvBankRows(text);
  return { expenses: rowsToExpenses(rows, learned), skipped };
}

/** Evita importar dos veces el mismo movimiento (mismo día, importe y comercio). */
export function isAlreadyImported(existing: Expense[], candidate: Omit<Expense, 'id'>): boolean {
  const day = candidate.date.slice(0, 10);
  return existing.some(
    (e) =>
      e.amount === candidate.amount &&
      e.date.slice(0, 10) === day &&
      e.merchant.toLowerCase() === candidate.merchant.toLowerCase(),
  );
}
