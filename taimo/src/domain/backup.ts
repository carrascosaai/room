import type { AppState, Profile } from './types';

/** Copia de seguridad en un archivo: todo el estado, sin la cuenta (es de este móvil). */
export interface BackupFile {
  app: 'taimo';
  version: 1;
  exportedAt: string;
  state: AppState;
}

/** Quita del perfil lo que es de este móvil (la cuenta) y nunca debe viajar en una copia. */
function exportableProfile(profile: Profile): Profile {
  const { account: _account, ...rest } = profile;
  return rest;
}

export function makeBackup(state: AppState, now: Date = new Date()): BackupFile {
  return { app: 'taimo', version: 1, exportedAt: now.toISOString(), state: { ...state, profile: exportableProfile(state.profile) } };
}

/**
 * Lo que se sube a la nube (copia privada en Supabase): lo mismo que el archivo
 * pero sin la cuenta ni los ingresos, que la app promete que no salen del móvil.
 */
export function makeCloudBackup(state: AppState): AppState {
  const { income: _income, ...profile } = exportableProfile(state.profile);
  return { ...state, profile };
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const optionalArray = (v: unknown) => v === undefined || Array.isArray(v);

/**
 * Comprueba la forma mínima de un estado que viene de fuera (archivo o nube) y
 * quita lo que nunca se importa: la cuenta y el bloqueo (son de este móvil).
 * Devuelve null si no parece un estado de Taimo.
 */
export function sanitizeImportedState(s: unknown): AppState | null {
  if (!isObject(s)) return null;
  if (s.version !== undefined && s.version !== 1) return null;
  if (!Array.isArray(s.expenses) || !Array.isArray(s.groups) || !isObject(s.profile)) return null;
  if (!optionalArray(s.settlements) || !optionalArray(s.tombstones)) return null;
  if (!optionalArray(s.goals) || !optionalArray(s.challenges) || !optionalArray(s.wishes)) return null;
  if (s.budgets !== undefined && !isObject(s.budgets)) return null;
  if (s.learnedCategories !== undefined && !isObject(s.learnedCategories)) return null;
  if (!s.expenses.every(isObject) || !s.groups.every((g) => isObject(g) && optionalArray(g.members))) return null;
  const { account: _account, lock: _lock, ...profile } = s.profile as unknown as Profile;
  return { ...(s as unknown as AppState), version: 1, profile };
}

/** Lee un archivo de copia; null si no es de Taimo o está roto. */
export function readBackup(text: string): BackupFile | null {
  try {
    const data = JSON.parse(text.replace(/^﻿/, '')) as Partial<BackupFile>;
    if (data?.app !== 'taimo') return null;
    if (data.version !== undefined && data.version !== 1) return null;
    const state = sanitizeImportedState(data.state);
    if (!state) return null;
    return { app: 'taimo', version: 1, exportedAt: typeof data.exportedAt === 'string' ? data.exportedAt : new Date().toISOString(), state };
  } catch {
    return null;
  }
}

/**
 * Estado tras restaurar una copia: la copia manda, salvo lo que es de este
 * móvil (la cuenta con la que se ha entrado y el bloqueo) y los ingresos si la
 * copia no los trae (las copias en la nube no los llevan).
 */
export function restoredState(current: AppState, incoming: AppState): AppState {
  const clean = sanitizeImportedState(incoming);
  if (!clean) return current;
  const profile: Profile = {
    ...clean.profile,
    account: current.profile.account,
    lock: current.profile.lock,
    income: clean.profile.income ?? current.profile.income,
  };
  if (profile.account === undefined) delete profile.account;
  if (profile.lock === undefined) delete profile.lock;
  if (profile.income === undefined) delete profile.income;
  return { ...clean, onboarded: true, profile };
}
