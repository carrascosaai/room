import type { GroupPush, GroupSnapshot } from '@/domain/sync';

/**
 * Cliente mínimo de las funciones de Supabase (ver supabase/migrations).
 * Se configura con EXPO_PUBLIC_SUPABASE_URL y EXPO_PUBLIC_SUPABASE_ANON_KEY en `.env`.
 * Si no están, la app funciona igual pero los grupos no se comparten.
 */
const URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const syncConfigured = Boolean(URL && KEY);

export class SyncError extends Error {
  constructor(
    message: string,
    readonly kind: 'not_found' | 'network' | 'server' | 'not_configured',
  ) {
    super(message);
  }
}

async function rpc<T>(fn: string, body: Record<string, unknown>): Promise<T> {
  if (!syncConfigured) throw new SyncError('Los grupos compartidos no están configurados.', 'not_configured');
  let res: Response;
  try {
    res = await fetch(`${URL}/rest/v1/rpc/${fn}`, {
      method: 'POST',
      headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    throw new SyncError('Sin conexión. Lo intentaremos más tarde.', 'network');
  }
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { code?: string; message?: string };
    if (err.code === 'P0002') throw new SyncError('No existe ningún grupo con ese código.', 'not_found');
    throw new SyncError(err.message || `Error del servidor (${res.status})`, 'server');
  }
  return (await res.json()) as T;
}

export function createRemoteGroup(group: { id: string; name: string; emoji: string }, push: GroupPush) {
  return rpc<GroupSnapshot>('taimo_create_group', {
    p_id: group.id,
    p_name: group.name,
    p_emoji: group.emoji,
    p_members: push.members,
    p_expenses: push.expenses,
    p_settlements: push.settlements,
    p_group: push.group ?? null,
  });
}

export function joinRemoteGroup(code: string) {
  return rpc<GroupSnapshot>('taimo_join', { p_code: code.trim().toUpperCase() });
}

export function syncRemoteGroup(code: string, push: GroupPush) {
  return rpc<GroupSnapshot>('taimo_sync', {
    p_code: code,
    p_members: push.members,
    p_expenses: push.expenses,
    p_settlements: push.settlements,
    p_group: push.group ?? null,
  });
}

/** Enlace para invitar. Abre la app si está instalada. */
export function inviteLink(code: string): string {
  return `taimo://join?code=${code}`;
}

/** Acepta tanto el código suelto como un enlace o un mensaje entero pegado. */
export function extractCode(input: string): string | null {
  const fromLink = input.match(/code=([A-Za-z0-9]{8,32})/);
  if (fromLink) return fromLink[1].toUpperCase();
  const bare = input.match(/\b([A-HJ-NP-Za-hj-np-z2-9]{16})\b/);
  return bare ? bare[1].toUpperCase() : null;
}
