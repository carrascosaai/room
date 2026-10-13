import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState as RNAppState } from 'react-native';

import { buildPush } from '@/domain/sync';
import { useStore } from '@/store/store';

import { syncConfigured, syncRemoteGroup, SyncError } from './api';

const INTERVAL_MS = 20_000;
const DEBOUNCE_MS = 1_500;

/**
 * Mantiene sincronizados los grupos compartidos: al abrir la app, cada 20 s
 * mientras está abierta y poco después de cada cambio local.
 */
export function useGroupSync() {
  const { state, dispatch } = useStore();
  const stateRef = useRef(state);
  stateRef.current = state;
  const running = useRef(false);
  const [lastError, setLastError] = useState<string | null>(null);

  const syncAll = useCallback(async () => {
    if (!syncConfigured || running.current) return;
    running.current = true;
    try {
      for (const group of stateRef.current.groups) {
        if (!group.remote) continue;
        const startedAt = new Date().toISOString();
        const push = buildPush(stateRef.current, group.id);
        try {
          const snapshot = await syncRemoteGroup(group.remote.code, push);
          dispatch({ type: 'applySnapshot', groupId: group.id, snapshot, syncStartedAt: startedAt });
          setLastError(null);
        } catch (e) {
          setLastError(e instanceof SyncError ? e.message : 'No se pudo sincronizar.');
        }
      }
    } finally {
      running.current = false;
    }
  }, [dispatch]);

  // Al abrir y al volver a primer plano.
  useEffect(() => {
    syncAll();
    const sub = RNAppState.addEventListener('change', (s) => {
      if (s === 'active') syncAll();
    });
    const timer = setInterval(syncAll, INTERVAL_MS);
    return () => {
      sub.remove();
      clearInterval(timer);
    };
  }, [syncAll]);

  // Poco después de un cambio en algún grupo compartido.
  const sharedFingerprint = state.groups
    .filter((g) => g.remote)
    .map((g) => {
      const exp = state.expenses.filter((e) => e.groupId === g.id);
      return `${g.id}:${g.members.length}:${exp.length}:${exp.map((e) => e.updatedAt ?? '').sort().pop() ?? ''}:${
        state.settlements.filter((s) => s.groupId === g.id).length
      }`;
    })
    .join('|') + `|${state.tombstones.length}`;
  useEffect(() => {
    const t = setTimeout(syncAll, DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [sharedFingerprint, syncAll]);

  return { syncNow: syncAll, lastError };
}
