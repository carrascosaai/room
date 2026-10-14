import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { parseQuickAdd } from '@/domain/smart';
import { FALLBACK, rateBetween } from '@/fx/fx';
import { useI18n } from '@/i18n';
import { newId, useStore } from '@/store/store';

import { Muted, Row } from './components';
import { colors, radius, space } from './theme';

/**
 * Apuntar escribiendo como hablas: «café 2,50», «cena 45 con Ana y yo ayer».
 * Si nombra un grupo abre el formulario ya relleno para elegir el reparto.
 */
export function QuickAdd() {
  const { state, dispatch } = useStore();
  const { t, money } = useI18n();
  const [text, setText] = useState('');
  const [done, setDone] = useState<{ id: string; label: string } | null>(null);

  function submit() {
    const q = parseQuickAdd(text, state);
    if (!q) return;
    setText('');
    if (q.groupId) {
      router.push({
        pathname: '/add',
        params: { groupId: q.groupId, amount: String(q.amount), merchant: q.merchant, currency: q.currency, daysAgo: String(q.daysAgo) },
      });
      return;
    }
    const home = state.profile.currency;
    const rate = q.currency !== home ? rateBetween(q.currency, home, state.fx ?? FALLBACK) : null;
    const when = new Date();
    if (q.daysAgo) {
      when.setDate(when.getDate() - q.daysAgo);
      when.setHours(12, 0, 0, 0);
    }
    const id = newId();
    const merchant = q.merchant || t(`cat.${q.category}`);
    const amount = rate ? Math.round(q.amount * rate) : q.amount;
    dispatch({
      type: 'addExpense',
      expense: {
        id,
        amount,
        merchant,
        category: q.category,
        date: when.toISOString(),
        source: 'manual',
        original: rate ? { amount: q.amount, currency: q.currency, rate } : undefined,
      },
    });
    setDone({ id, label: t('quick.added', { merchant, amount: money(amount) }) });
  }

  return (
    <View style={{ gap: space.xs }}>
      <TextInput
        value={text}
        onChangeText={(v) => {
          setText(v);
          if (done) setDone(null);
        }}
        onSubmitEditing={submit}
        returnKeyType="done"
        placeholder={t('quick.placeholder')}
        placeholderTextColor={colors.textFaint}
        accessibilityLabel={t('quick.hint')}
        style={{
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderWidth: 1,
          borderRadius: radius.pill,
          paddingHorizontal: space.lg,
          paddingVertical: 12,
          color: colors.text,
          fontSize: 16,
        }}
      />
      {done ? (
        <Row style={{ justifyContent: 'space-between', paddingHorizontal: space.sm }}>
          <Text style={{ color: colors.primary, flex: 1 }}>{done.label}</Text>
          <Pressable
            hitSlop={10}
            accessibilityRole="button"
            onPress={() => {
              dispatch({ type: 'deleteExpense', id: done.id });
              setDone(null);
            }}
          >
            <Text style={{ color: colors.textMuted, fontWeight: '600' }}>{t('quick.undo')}</Text>
          </Pressable>
        </Row>
      ) : text ? (
        <Muted style={{ paddingHorizontal: space.sm }}>{t('quick.hint')}</Muted>
      ) : null}
    </View>
  );
}
