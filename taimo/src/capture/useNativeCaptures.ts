import { useCallback, useEffect, useRef } from 'react';
import { AppState as RNAppState, Platform } from 'react-native';

import { drainPending } from 'taimo-capture';

import { categoryStatus } from '@/domain/budget';
import { parseCaptureParams, pendingKind, type CapturePayload } from '@/domain/capture';
import { budgetCrossings } from '@/domain/insights';
import { parseQuickAdd, quickExpense } from '@/domain/smart';
import { FALLBACK } from '@/fx/fx';
import { parsePaymentNotification, type RawNotification } from '@/domain/notifications';
import type { I18n } from '@/i18n';
import { notifyNow } from '@/notifications/local';
import { expenseFromCapture, newId, reducer, useStore } from '@/store/store';
import { purchaseMessage } from '@/ui/messages';

/**
 * Convierte en gastos los pagos que el móvil ha guardado mientras Taimo estaba
 * cerrado: en iPhone los deja la acción "Log payment in Taimo" de Atajos, en
 * Android el lector de notificaciones. Se ejecuta al abrir la app y al volver.
 */
export function useNativeCaptures(i18n: I18n, onCaptured?: (count: number) => void) {
  const defaultMerchant = i18n.t('capture.defaultMerchant');
  const { state, dispatch } = useStore();
  const stateRef = useRef(state);
  stateRef.current = state;

  const drain = useCallback(() => {
    const items = drainPending();
    if (items.length === 0) return;
    const before = stateRef.current;
    let current = before;
    let added = 0;
    for (const item of items) {
      const kind = pendingKind(item, Platform.OS);
      // Siri: «50 euros en comida» (sobre todo pagos en efectivo).
      if (kind === 'siri') {
        const q = parseQuickAdd(item.text, current);
        if (!q) continue;
        const when = item.date ? new Date(item.date) : new Date();
        const expense = quickExpense(q, current, current.fx ?? FALLBACK, {
          id: newId(),
          now: Number.isNaN(when.getTime()) ? new Date() : when,
          fallbackMerchant: i18n.t(`cat.${q.category}`),
          note: '🎙️ Siri',
        });
        const action = { type: 'addExpense', expense } as const;
        dispatch(action);
        current = reducer(current, action);
        added++;
        continue;
      }
      let payload: CapturePayload | null;
      if (kind === 'notification') {
        payload = parsePaymentNotification(item as unknown as RawNotification, {
          learned: current.learnedCategories,
          home: current.profile.currency,
          defaultMerchant,
          ignored: current.ignoredApps,
        });
      } else {
        const when = item.date ? new Date(item.date) : new Date();
        payload = parseCaptureParams(item, current.learnedCategories, Number.isNaN(when.getTime()) ? new Date() : when, defaultMerchant, current.profile.currency);
      }
      if (!payload) continue;
      const { expense, duplicate } = expenseFromCapture(current, payload);
      if (duplicate) continue;
      const action = { type: 'addExpense', expense } as const;
      dispatch(action);
      current = reducer(current, action);
      added++;
    }
    if (added === 0) return;
    onCaptured?.(added);
    // Si estos pagos te han hecho llegar al 80 % o pasarte en alguna categoría, avisa.
    for (const alert of budgetCrossings(before, current)) {
      notifyNow('Taimo', purchaseMessage(i18n, categoryStatus(current, alert.category))).catch(() => {});
    }
  }, [dispatch, onCaptured, defaultMerchant, i18n]);

  useEffect(() => {
    drain();
    const sub = RNAppState.addEventListener('change', (s) => {
      if (s === 'active') drain();
    });
    return () => sub.remove();
  }, [drain]);
}
