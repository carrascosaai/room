import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { Level } from "../characters";
import type { Correction } from "../llm/parse";
import type { Expression, ErrorStat } from "../summary";

// Todo se guarda solo en este dispositivo (IndexedDB). Nada sale del navegador.

export interface StoredMessage {
  role: "user" | "assistant";
  text: string;
  corrections?: { errors: Correction[]; tip: string };
}

export interface SessionRecord {
  id: string;
  characterId: string;
  characterName: string;
  level: Level;
  startedAt: number;
  endedAt: number;
  messages: StoredMessage[];
  errorStats: ErrorStat[];
  expressions: Expression[];
}

export interface VocabItem extends Expression {
  id: string;
  sessionId: string;
  addedAt: number;
  /** Repetición espaciada (Leitner) */
  box?: number;
  due?: number;
}

interface CraicDB extends DBSchema {
  sessions: { key: string; value: SessionRecord; indexes: { byEnd: number } };
  vocab: { key: string; value: VocabItem; indexes: { byAdded: number } };
}

let dbPromise: Promise<IDBPDatabase<CraicDB>> | null = null;

function db() {
  dbPromise ??= openDB<CraicDB>("craic", 1, {
    upgrade(d) {
      d.createObjectStore("sessions", { keyPath: "id" }).createIndex("byEnd", "endedAt");
      d.createObjectStore("vocab", { keyPath: "id" }).createIndex("byAdded", "addedAt");
    },
  });
  return dbPromise;
}

export const newId = () =>
  (crypto.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`);

export async function saveSession(s: SessionRecord): Promise<void> {
  await (await db()).put("sessions", s);
}

export async function listSessions(): Promise<SessionRecord[]> {
  const all = await (await db()).getAllFromIndex("sessions", "byEnd");
  return all.reverse();
}

export async function deleteSession(id: string): Promise<void> {
  await (await db()).delete("sessions", id);
}

const vocabKey = (en: string) => en.toLowerCase().replace(/[^\p{L}\p{N}' ]/gu, "").trim();

/** Añade expresiones nuevas (sin duplicar las que ya estaban). Devuelve cuántas se añadieron. */
export async function addVocab(items: Expression[], sessionId: string): Promise<number> {
  const d = await db();
  const existing = new Set((await d.getAll("vocab")).map((v) => vocabKey(v.en)));
  const tx = d.transaction("vocab", "readwrite");
  let added = 0;
  const now = Date.now();
  for (const [i, it] of items.entries()) {
    const k = vocabKey(it.en);
    if (!k || existing.has(k)) continue;
    existing.add(k);
    await tx.store.put({ ...it, id: newId(), sessionId, addedAt: now + i });
    added++;
  }
  await tx.done;
  return added;
}

export async function listVocab(): Promise<VocabItem[]> {
  const all = await (await db()).getAllFromIndex("vocab", "byAdded");
  return all.reverse();
}

export async function updateVocab(item: VocabItem): Promise<void> {
  await (await db()).put("vocab", item);
}

/** Añade una sola expresión (p. ej. una corrección) al vocabulario. */
export async function addOneVocab(it: Expression): Promise<boolean> {
  return (await addVocab([it], "manual")) > 0;
}

export async function deleteVocab(id: string): Promise<void> {
  await (await db()).delete("vocab", id);
}

export async function clearAll(): Promise<void> {
  const d = await db();
  await Promise.all([d.clear("sessions"), d.clear("vocab")]);
}

export async function exportAll(): Promise<Blob> {
  const [sessions, vocab] = await Promise.all([listSessions(), listVocab()]);
  const data = { app: "craic", version: 1, exportedAt: new Date().toISOString(), sessions, vocab };
  return new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
}

/** CSV de dos columnas (inglés; español + ejemplo) que Anki y Quizlet importan directamente. */
export async function exportVocabCSV(): Promise<Blob> {
  const vocab = await listVocab();
  const esc = (s: string) => `"${s.replace(/"/g, '""')}"`;
  const rows = vocab.map((v) => [esc(v.en), esc(v.example ? `${v.es} — ${v.example}` : v.es)].join(","));
  return new Blob(["﻿" + rows.join("\n")], { type: "text/csv;charset=utf-8" });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
