import { csvBankRows, detectDateOrder, parseDate, type BankRow, type BankRowsResult } from './csv';
import { parseAmount } from './money';

/**
 * Extractos de cualquier banco del mundo. Además de CSV (en cualquier idioma),
 * los formatos estándar que exportan casi todos los bancos:
 *  - OFX / QFX: EE. UU., Canadá, Reino Unido, Francia, Australia… (Money, Quicken)
 *  - QIF: el formato clásico de Quicken
 *  - CAMT.053 (ISO 20022, XML): bancos europeos (SEPA), Suiza, nórdicos
 *  - MT940 (SWIFT): Alemania, Países Bajos, Polonia, banca de empresa
 * Solo se quedan los gastos (cargos); ingresos y devoluciones se saltan.
 */
export type BankFormat = 'csv' | 'ofx' | 'qif' | 'camt' | 'mt940';

export interface BankFileResult extends BankRowsResult {
  format: BankFormat;
}

export function detectFormat(text: string): BankFormat {
  const head = text.slice(0, 4000);
  if (/<OFX>|OFXHEADER/i.test(head)) return 'ofx';
  if (/^\s*!Type:/im.test(head)) return 'qif';
  if (/<BkToCstmrStmt|camt\.05[234]/i.test(head)) return 'camt';
  if (/^:20:/m.test(head) && /^:61:/m.test(text)) return 'mt940';
  return 'csv';
}

export function parseBankFile(text: string): BankFileResult {
  const clean = text.replace(/^﻿/, '');
  const format = detectFormat(clean);
  const parsers = { csv: csvBankRows, ofx: parseOfx, qif: parseQif, camt: parseCamt, mt940: parseMt940 };
  return { format, ...parsers[format](clean) };
}

const tag = (block: string, name: string) => block.match(new RegExp(`<${name}>\\s*([^<\\r\\n]*)`, 'i'))?.[1]?.trim() ?? '';
const decode = (s: string) => s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'");

/** Importe con signo de un texto "−12.40", "12,40", "(12.40)". */
function signed(raw: string): number | null {
  const v = parseAmount(raw);
  if (v === null) return null;
  return /^\s*[-−(]/.test(raw) ? -v : v;
}

function parseOfx(text: string): BankRowsResult {
  const currency = tag(text, 'CURDEF').toUpperCase() || undefined;
  const rows: BankRow[] = [];
  let skipped = 0;
  for (const block of text.split(/<STMTTRN>/i).slice(1)) {
    const amount = signed(tag(block, 'TRNAMT'));
    const date = parseDate(tag(block, 'DTPOSTED').slice(0, 8));
    if (amount === null || amount >= 0 || !date) {
      skipped++;
      continue;
    }
    const merchant = decode(tag(block, 'NAME') || tag(block, 'PAYEE') || tag(block, 'MEMO'));
    const cur = tag(block, 'CURSYM') || tag(block, 'CURRENCY');
    rows.push({ date, merchant, amount: -amount, currency: /^[A-Z]{3}$/.test(cur) ? cur : currency });
  }
  return { rows, skipped };
}

function parseQif(text: string): BankRowsResult {
  const records = text
    .split(/^\^\s*$/m)
    .map((r) => Object.fromEntries(r.split(/\r?\n/).filter((l) => l.length > 1 && !l.startsWith('!')).map((l) => [l[0], l.slice(1).trim()])) as Record<string, string>);
  // QIF nació en EE. UU.: si no hay pistas, mes/día.
  const order = detectDateOrder(records.map((r) => r.D ?? ''), 'mdy');
  const rows: BankRow[] = [];
  let skipped = 0;
  for (const r of records) {
    if (!r.D && !r.T) continue;
    const amount = signed(r.T ?? r.U ?? '');
    const date = parseDate(r.D ?? '', order);
    if (amount === null || amount >= 0 || !date) {
      skipped++;
      continue;
    }
    rows.push({ date, merchant: r.P || r.M || '', amount: -amount });
  }
  return { rows, skipped };
}

function parseCamt(text: string): BankRowsResult {
  const rows: BankRow[] = [];
  let skipped = 0;
  for (const [, entry] of text.matchAll(/<(?:\w+:)?Ntry>([\s\S]*?)<\/(?:\w+:)?Ntry>/g)) {
    const amt = entry.match(/<(?:\w+:)?Amt[^>]*Ccy="([A-Z]{3})"[^>]*>([^<]+)</);
    const debit = /<(?:\w+:)?CdtDbtInd>\s*DBIT/.test(entry);
    const reversal = /<(?:\w+:)?RvslInd>\s*true/.test(entry);
    const day = entry.match(/<(?:\w+:)?BookgDt>\s*<(?:\w+:)?Dt(?:Tm)?>([^<]+)</)?.[1] ?? entry.match(/<(?:\w+:)?ValDt>\s*<(?:\w+:)?Dt(?:Tm)?>([^<]+)</)?.[1];
    const amount = amt ? parseAmount(amt[2]) : null;
    const date = day ? parseDate(day) : null;
    if (!amt || !amount || !debit || reversal || !date) {
      skipped++;
      continue;
    }
    // Comercio: el acreedor; si no, el concepto libre.
    const creditor = entry.match(/<(?:\w+:)?Cdtr>[\s\S]*?<(?:\w+:)?Nm>([^<]+)</)?.[1];
    const info = entry.match(/<(?:\w+:)?Ustrd>([^<]+)</)?.[1] ?? entry.match(/<(?:\w+:)?AddtlNtryInf>([^<]+)</)?.[1];
    rows.push({ date, merchant: decode((creditor ?? info ?? '').trim()), amount, currency: amt[1] });
  }
  return { rows, skipped };
}

function parseMt940(text: string): BankRowsResult {
  const currency = text.match(/^:60[FM]:[CD]\d{6}([A-Z]{3})/m)?.[1];
  const rows: BankRow[] = [];
  let skipped = 0;
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    // :61:2610131013D12,40NMSCNONREF  ->  fecha AAMMDD, [MMDD], D/C (o RD/RC), [letra], importe
    const m = lines[i].match(/^:61:(\d{2})(\d{2})(\d{2})(?:\d{4})?(R?[DC])[A-Z]?(\d+,\d{0,2})/);
    if (!m) continue;
    let desc = '';
    for (let j = i + 1; j < lines.length && !/^:(61|62[FM]|64|65):/.test(lines[j]); j++) {
      if (/^:86:/.test(lines[j]) || (desc && !lines[j].startsWith(':'))) desc += ` ${lines[j].replace(/^:86:/, '')}`;
    }
    const isDebit = m[4] === 'D' || m[4] === 'RC';
    const amount = parseAmount(m[5]);
    if (!isDebit || !amount) {
      skipped++;
      continue;
    }
    rows.push({
      date: new Date(Date.UTC(2000 + Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12)).toISOString(),
      merchant: mt940Name(desc),
      amount,
      currency,
    });
  }
  return { rows, skipped };
}

/** Las descripciones de MT940 vienen con subcampos ("?20…?32NOMBRE" alemán o "/NAME/…/" neerlandés). */
function mt940Name(desc: string): string {
  const name = desc.match(/\?3[23]([^?]+)/g)?.map((s) => s.slice(3)).join('') ?? desc.match(/\/NAME\/([^/]+)/)?.[1];
  if (name) return name.trim();
  const free = desc.match(/\?2\d([^?]+)/g)?.map((s) => s.slice(3)).join(' ');
  return (free ?? desc).replace(/\s+/g, ' ').trim().slice(0, 60);
}
