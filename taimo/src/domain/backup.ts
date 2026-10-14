import type { AppState } from './types';

/** Copia de seguridad en un archivo: todo el estado, sin la cuenta (es de este móvil). */
export interface BackupFile {
  app: 'taimo';
  version: 1;
  exportedAt: string;
  state: AppState;
}

export function makeBackup(state: AppState, now: Date = new Date()): BackupFile {
  const { account: _account, ...profile } = state.profile;
  return { app: 'taimo', version: 1, exportedAt: now.toISOString(), state: { ...state, profile } };
}

/** Lee un archivo de copia; null si no es de Taimo o está roto. */
export function readBackup(text: string): BackupFile | null {
  try {
    const data = JSON.parse(text.replace(/^﻿/, '')) as Partial<BackupFile>;
    const s = data?.state;
    if (data?.app !== 'taimo' || !s || !Array.isArray(s.expenses) || !Array.isArray(s.groups) || typeof s.profile !== 'object') return null;
    return { app: 'taimo', version: 1, exportedAt: typeof data.exportedAt === 'string' ? data.exportedAt : new Date().toISOString(), state: s as AppState };
  } catch {
    return null;
  }
}
