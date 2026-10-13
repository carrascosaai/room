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

/** "13/10/2026", "13-10-26", "2026-10-13" -> ISO a mediodía (evita saltos de día por zona horaria). */
export function parseDate(value: string): string | null {
  const v = value.trim();
  let y: number;
  let m: number;
  let d: number;
  let match = v.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (match) {
    [y, m, d] = [Number(match[1]), Number(match[2]), Number(match[3])];
  } else {
    match = v.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/);
    if (!match) return null;
    [d, m, y] = [Number(match[1]), Number(match[2]), Number(match[3])];
    if (y < 100) y += 2000;
  }
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  return new Date(Date.UTC(y, m - 1, d, 12)).toISOString();
}

const DATE_HEADERS = ['fecha', 'fecha operacion', 'fecha valor', 'date', 'f operacion', 'f valor'];
const CONCEPT_HEADERS = ['concepto', 'descripcion', 'comercio', 'movimiento', 'detalle', 'description', 'merchant'];
const AMOUNT_HEADERS = ['importe', 'cantidad', 'amount', 'importe total', 'importe eur', 'cargo'];

function norm(h: string): string {
  return h
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export interface CsvImportResult {
  expenses: Omit<Expense, 'id'>[];
  /** Filas que no se pudieron leer (cabeceras sueltas, saldos, ingresos…). */
  skipped: number;
}

/**
 * Importa un extracto bancario en CSV. Busca las columnas de fecha, concepto e
 * importe por su nombre. Los importes negativos son gastos; los positivos
 * (nóminas, devoluciones) se ignoran. Si todos los importes son positivos, se
 * asume que el fichero solo trae gastos.
 */
export function parseBankCsv(text: string, learned: Record<string, CategoryId> = {}): CsvImportResult {
  const lines = text
    .replace(/^﻿/, '')
    .split(/\r?\n/)
    .filter((l) => l.trim().length > 0);
  if (lines.length === 0) return { expenses: [], skipped: 0 };
  const sep = detectSeparator(lines);

  // La cabecera puede no estar en la primera línea (muchos bancos ponen antes el titular o el IBAN).
  let headerIdx = -1;
  let cols = { date: -1, concept: -1, amount: -1 };
  for (let i = 0; i < Math.min(lines.length, 15); i++) {
    const cells = splitLine(lines[i], sep).map(norm);
    const date = cells.findIndex((c) => DATE_HEADERS.includes(c));
    const concept = cells.findIndex((c) => CONCEPT_HEADERS.includes(c));
    const amount = cells.findIndex((c) => AMOUNT_HEADERS.includes(c));
    if (date !== -1 && amount !== -1) {
      headerIdx = i;
      cols = { date, concept, amount };
      break;
    }
  }
  if (headerIdx === -1) return { expenses: [], skipped: lines.length };

  const rows = lines.slice(headerIdx + 1).map((l) => splitLine(l, sep));
  const signed = rows.map((r) => {
    const raw = r[cols.amount] ?? '';
    const cents = parseAmount(raw);
    if (cents === null) return null;
    return /^\s*-/.test(raw) || /-\s*$/.test(raw) ? -cents : cents;
  });
  const anyNegative = signed.some((v) => v !== null && v < 0);

  const expenses: Omit<Expense, 'id'>[] = [];
  let skipped = 0;
  rows.forEach((r, i) => {
    const value = signed[i];
    const date = parseDate(r[cols.date] ?? '');
    if (value === null || value === 0 || !date || (anyNegative && value > 0)) {
      skipped++;
      return;
    }
    const merchant = (cols.concept !== -1 ? r[cols.concept] : '')?.trim() || 'Movimiento importado';
    expenses.push({
      amount: Math.abs(value),
      merchant,
      category: categorize(merchant, learned),
      date,
      source: 'csv',
    });
  });
  return { expenses, skipped };
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
