import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';

import { categoryStatus } from '@/domain/budget';
import { parseCaptureParams } from '@/domain/capture';
import type { Expense } from '@/domain/types';
import { useI18n } from '@/i18n';
import { expenseFromCapture, reducer, useStore } from '@/store/store';
import { Button, Card, CategoryBadge, Muted, Row, Screen, Title } from '@/ui/components';
import { purchaseMessage } from '@/ui/messages';
import { colors, space } from '@/ui/theme';

/**
 * Destino del enlace `taimo://capture?amount=…&merchant=…&card=…` que abre el
 * Atajo de iOS (disparador "Transacción" de Wallet) justo después de pagar.
 * Registra el gasto y enseña cuánto te queda en esa categoría.
 */
export default function Capture() {
  const params = useLocalSearchParams<Record<string, string>>();
  const { state, dispatch } = useStore();
  const i18n = useI18n();
  const { t, money } = i18n;
  const [result, setResult] = useState<{ expense: Expense; duplicate: boolean; message: string } | null>(null);
  const [error, setError] = useState(false);
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    done.current = true;
    const payload = parseCaptureParams(params, state.learnedCategories, new Date(), t('capture.defaultMerchant'), state.profile.currency);
    if (!payload) {
      setError(true);
      return;
    }
    const { expense, duplicate } = expenseFromCapture(state, payload);
    let next = state;
    if (!duplicate) {
      const action = { type: 'addExpense', expense } as const;
      dispatch(action);
      next = reducer(state, action);
    }
    setResult({ expense, duplicate, message: purchaseMessage(i18n, categoryStatus(next, expense.category)) });
  }, [params, state, dispatch, i18n, t]);

  if (error) {
    return (
      <Screen>
        <Title>{t('capture.errorTitle')}</Title>
        <Muted>{t('capture.errorText')}</Muted>
        <Button label={t('capture.addManually')} onPress={() => router.replace('/add')} />
        <Button label={t('capture.howTo')} variant="secondary" onPress={() => router.replace('/automation')} />
      </Screen>
    );
  }

  if (!result) return <Screen>{null}</Screen>;
  const { expense } = result;

  return (
    <Screen>
      <View style={{ alignItems: 'center', gap: space.md, paddingTop: space.xl }}>
        <Text style={{ fontSize: 48 }}>⚡</Text>
        <Muted>{result.duplicate ? t('capture.duplicate') : t('capture.auto')}</Muted>
        <Text style={{ color: colors.text, fontSize: 44, fontWeight: '800' }}>{money(expense.amount)}</Text>
        <Text style={{ color: colors.textMuted, fontSize: 17 }}>{expense.merchant}</Text>
      </View>
      <Card>
        <Row>
          <CategoryBadge id={expense.category} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600' }}>{t(`cat.${expense.category}`)}</Text>
            <Muted>{result.message}</Muted>
          </View>
        </Row>
      </Card>
      <Button label={t('capture.ok')} onPress={() => router.replace('/')} />
      {result.duplicate ? null : (
        // El enlace lo puede abrir cualquier app: si no era tuyo, se quita en un toque.
        <Button
          label={t('quick.undo')}
          variant="secondary"
          onPress={() => {
            dispatch({ type: 'deleteExpense', id: expense.id });
            router.replace('/');
          }}
        />
      )}
      <Button
        label={t('capture.change')}
        variant="secondary"
        onPress={() => router.replace({ pathname: '/add', params: { id: expense.id } })}
      />
    </Screen>
  );
}
