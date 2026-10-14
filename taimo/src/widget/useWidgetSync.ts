import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { setWidgetData } from 'taimo-capture';

import type { AppState } from '@/domain/types';
import type { I18n } from '@/i18n';

import { widgetData } from './data';

/** Mantiene al día los widgets (iPhone y Android) cada vez que cambian tus gastos. */
export function useWidgetSync(state: AppState, i18n: I18n) {
  const key = `${state.expenses.length}:${state.expenses[0]?.updatedAt ?? ''}:${JSON.stringify(state.budgets)}:${i18n.lang}:${i18n.currency}`;
  useEffect(() => {
    if (Platform.OS === 'web' || !state.onboarded) return;
    const data = widgetData(state, i18n);
    const json = JSON.stringify(data);
    if (Platform.OS === 'ios') {
      setWidgetData(json);
      return;
    }
    // Android: se guarda para cuando el sistema pida dibujarlo y se redibuja ya.
    AsyncStorage.setItem('taimo:widget', json).catch(() => {});
    const { requestWidgetUpdate } = require('react-native-android-widget') as typeof import('react-native-android-widget');
    const { TaimoAndroidWidget, WIDGET_NAME } = require('./android') as typeof import('./android');
    requestWidgetUpdate({ widgetName: WIDGET_NAME, renderWidget: () => TaimoAndroidWidget({ data }) }).catch(() => {});
  }, [key, state.onboarded]);
}
