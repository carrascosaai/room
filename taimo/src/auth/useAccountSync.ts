import { useEffect, useRef } from 'react';

import { useStore } from '@/store/store';

import { authConfigured, supabase, uploadBackup } from './auth';

const BACKUP_DEBOUNCE_MS = 30_000;

/**
 * Mantiene la cuenta del perfil al día con la sesión de Supabase y, si hay
 * sesión, sube una copia de seguridad poco después de cada cambio.
 */
export function useAccountSync() {
  const { state, dispatch } = useStore();
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    const sb = supabase();
    if (!sb) return;
    const { data } = sb.auth.onAuthStateChange((_event, session) => {
      const user = session?.user;
      const current = stateRef.current.profile.account;
      if (!user && current) dispatch({ type: 'setAccount', account: undefined });
      if (user && current?.id !== user.id) {
        const provider = (user.app_metadata?.provider === 'apple' ? 'apple' : 'google') as 'apple' | 'google';
        dispatch({ type: 'setAccount', account: { id: user.id, email: user.email ?? undefined, provider } });
      }
    });
    return () => data.subscription.unsubscribe();
  }, [dispatch]);

  const signedIn = Boolean(state.profile.account);
  useEffect(() => {
    if (!authConfigured || !signedIn || !state.onboarded) return;
    const timer = setTimeout(() => {
      uploadBackup(stateRef.current).catch(() => {});
    }, BACKUP_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [state, signedIn]);
}
