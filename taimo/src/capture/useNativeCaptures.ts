import { useCallback, useEffect, useRef } from 'react';
import { AppState as RNAppState, Platform } from 'react-native';

import { drainPending } from 'taimo-capture';

import { parseCaptureParams, type CapturePayload } from '@/domain/capture';
import { parsePaymentNotification, type RawNotification } from '@/domain/notifications';
import { expenseFromCapture, reducer, useStore } from '@/store/store';

/**
 * Convierte en gastos los pagos que el móvil ha guardado mientras Taimo estaba
 * cerrado: en iPhone los deja la acción "Registrar pago en Taimo" de Atajos, en
 * Android el lector de notificaciones. Se ejecuta al abrir la app y al volver.
 */
export function useNativeCaptures(onCaptured?: (count: number) => void) {
  const { state, dispatch } = useStore();
  const stateRef = useRef(state);
  stateRef.current = state;

  const drain = useCallback(() => {
    const items = drainPending();
    if (items.length === 0) return;
    let current = stateRef.current;
    let added = 0;
    for (const item of items) {
      let payload: CapturePayload | null;
      if (Platform.OS === 'android') {
        payload = parsePaymentNotification(item as unknown as RawNotification, current.learnedCategories);
      } else {
        const when = item.date ? new Date(item.date) : new Date();
        payload = parseCaptureParams(item, current.learnedCategories, Number.isNaN(when.getTime()) ? new Date() : when);
      }
      if (!payload) continue;
      const { expense, duplicate } = expenseFromCapture(current, payload);
      if (duplicate) continue;
      const action = { type: 'addExpense', expense } as const;
      dispatch(action);
      current = reducer(current, action);
      added++;
    }
    if (added > 0) onCaptured?.(added);
  }, [dispatch, onCaptured]);

  useEffect(() => {
    drain();
    const sub = RNAppState.addEventListener('change', (s) => {
      if (s === 'active') drain();
    });
    return () => sub.remove();
  }, [drain]);
}
