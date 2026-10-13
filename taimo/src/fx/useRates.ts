import { useCallback, useEffect, useRef, useState } from 'react';

import { useStore } from '@/store/store';

import { FALLBACK, fetchRates, isStale, type Rates } from './fx';

/**
 * Tipos de cambio para toda la app: los últimos descargados (guardados en el
 * móvil) o los de respaldo. `refresh` los vuelve a descargar.
 */
export function useRates(): { rates: Rates; refresh: () => Promise<boolean>; loading: boolean } {
  const { state, dispatch } = useStore();
  const [loading, setLoading] = useState(false);
  const rates: Rates = state.fx ?? FALLBACK;
  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const fresh = await fetchRates();
      if (fresh) dispatch({ type: 'setFx', fx: fresh });
      return Boolean(fresh);
    } finally {
      setLoading(false);
    }
  }, [dispatch]);
  return { rates, refresh, loading };
}

/** Al abrir la app, si los tipos tienen más de 12 horas, se actualizan en segundo plano. */
export function useAutoRefreshRates() {
  const { state } = useStore();
  const { refresh } = useRates();
  const tried = useRef(false);
  useEffect(() => {
    if (tried.current || !isStale(state.fx)) return;
    tried.current = true;
    refresh().catch(() => {});
  }, [state.fx, refresh]);
}
