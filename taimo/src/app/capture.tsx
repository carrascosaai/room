import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';

import { afterPurchaseMessage, categoryStatus } from '@/domain/budget';
import { category } from '@/domain/categories';
import { parseCaptureParams } from '@/domain/capture';
import { formatMoney } from '@/domain/money';
import type { Expense } from '@/domain/types';
import { expenseFromCapture, reducer, useStore } from '@/store/store';
import { Button, Card, CategoryBadge, Muted, Row, Screen, Title } from '@/ui/components';
import { colors, space } from '@/ui/theme';

/**
 * Destino del enlace `taimo://capture?amount=…&merchant=…&card=…` que abre el
 * Atajo de iOS (disparador "Transacción" de Wallet) justo después de pagar.
 * Registra el gasto y enseña cuánto te queda en esa categoría.
 */
export default function Capture() {
  const params = useLocalSearchParams<Record<string, string>>();
  const { state, dispatch } = useStore();
  const [result, setResult] = useState<{ expense: Expense; duplicate: boolean; message: string } | null>(null);
  const [error, setError] = useState(false);
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    done.current = true;
    const payload = parseCaptureParams(params, state.learnedCategories);
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
    const status = categoryStatus(next, expense.category);
    setResult({ expense, duplicate, message: afterPurchaseMessage(status, category(expense.category).label) });
  }, [params, state, dispatch]);

  if (error) {
    return (
      <Screen>
        <Title>No he entendido el pago</Title>
        <Muted>
          El Atajo no ha enviado el importe. Revisa que la automatización pase "Importe" en el enlace. Puedes apuntarlo a
          mano.
        </Muted>
        <Button label="Añadir a mano" onPress={() => router.replace('/add')} />
        <Button label="Ver cómo configurarlo" variant="secondary" onPress={() => router.replace('/automation')} />
      </Screen>
    );
  }

  if (!result) return <Screen>{null}</Screen>;
  const { expense } = result;
  const c = category(expense.category);

  return (
    <Screen>
      <View style={{ alignItems: 'center', gap: space.md, paddingTop: space.xl }}>
        <Text style={{ fontSize: 48 }}>⚡</Text>
        <Muted>{result.duplicate ? 'Este pago ya estaba apuntado' : 'Apuntado automáticamente'}</Muted>
        <Text style={{ color: colors.text, fontSize: 44, fontWeight: '800' }}>{formatMoney(expense.amount)}</Text>
        <Text style={{ color: colors.textMuted, fontSize: 17 }}>{expense.merchant}</Text>
      </View>
      <Card>
        <Row>
          <CategoryBadge id={expense.category} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600' }}>{c.label}</Text>
            <Muted>{result.message}</Muted>
          </View>
        </Row>
      </Card>
      <Button label="Perfecto" onPress={() => router.replace('/')} />
      <Button
        label="Cambiar categoría o compartir"
        variant="secondary"
        onPress={() => router.replace({ pathname: '/add', params: { id: expense.id } })}
      />
    </Screen>
  );
}
