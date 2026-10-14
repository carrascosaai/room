import { router } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { impulseSavings, wishReadyAt } from '@/domain/habits';
import { parseAmount } from '@/domain/money';
import { useI18n } from '@/i18n';
import { scheduleWishReminder } from '@/notifications/local';
import { newId, useStore } from '@/store/store';
import { Button, Card, Input, Muted, Row, Screen } from '@/ui/components';
import { colors, space } from '@/ui/theme';
import { workCost } from '@/ui/workTime';

/** Lista de deseos: espera 48 h antes de un capricho. Lo que no compras, lo ahorras. */
export default function Wishlist() {
  const { state, dispatch } = useStore();
  const i18n = useI18n();
  const { t, money, date } = i18n;
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const wishes = state.wishes ?? [];
  const saved = impulseSavings(wishes);
  const now = Date.now();

  function add() {
    const value = parseAmount(amount);
    if (!name.trim() || !value) return;
    const wish = { id: newId(), name: name.trim(), amount: value, createdAt: new Date().toISOString() };
    dispatch({ type: 'addWish', wish });
    scheduleWishReminder(wish, i18n).catch(() => {});
    setName('');
    setAmount('');
  }

  return (
    <Screen>
      <Card style={{ backgroundColor: colors.primarySoft, borderColor: colors.primaryDark }}>
        <Text style={{ color: colors.text, fontSize: 22, fontWeight: '800' }}>🧘 {t('wish.saved', { amount: money(saved.total) })}</Text>
        <Muted>{t('wish.hint')}</Muted>
      </Card>

      <Card>
        <Input label={t('wish.name')} value={name} onChangeText={setName} />
        <Input label={t('wish.amount')} value={amount} onChangeText={setAmount} keyboardType="decimal-pad" />
        {parseAmount(amount) && workCost(i18n, state.profile, parseAmount(amount)!) ? (
          <Muted>{t('work.cost', { time: workCost(i18n, state.profile, parseAmount(amount)!)! })}</Muted>
        ) : null}
        <Button label={`⏳ ${t('wish.add')}`} onPress={add} disabled={!name.trim() || !parseAmount(amount)} />
      </Card>

      {wishes.map((w) => {
        const ready = now >= wishReadyAt(w).getTime();
        const time = workCost(i18n, state.profile, w.amount);
        return (
          <Card key={w.id} style={w.outcome === 'skipped' ? { borderColor: colors.primary } : undefined}>
            <Row>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={{ color: colors.text, fontWeight: '700', fontSize: 16 }}>{w.name}</Text>
                <Muted>
                  {money(w.amount)}
                  {time ? ` · ${t('work.cost', { time })}` : ''}
                </Muted>
              </View>
              <Muted>
                {w.outcome === 'bought'
                  ? t('wish.bought')
                  : w.outcome === 'skipped'
                    ? t('wish.skipped')
                    : ready
                      ? ''
                      : `⏳ ${t('wish.waiting', { date: date(wishReadyAt(w), { weekday: 'short', hour: '2-digit', minute: '2-digit' }) })}`}
              </Muted>
            </Row>
            {!w.outcome && ready ? (
              <View style={{ gap: space.sm }}>
                <Text style={{ color: colors.text }}>{t('wish.ready')}</Text>
                <Row>
                  <View style={{ flex: 1 }}>
                    <Button label={t('wish.skip')} onPress={() => dispatch({ type: 'decideWish', id: w.id, outcome: 'skipped' })} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Button
                      label={t('wish.buy')}
                      variant="secondary"
                      onPress={() => {
                        dispatch({ type: 'decideWish', id: w.id, outcome: 'bought' });
                        router.push({ pathname: '/add', params: { amount: String(w.amount), merchant: w.name } });
                      }}
                    />
                  </View>
                </Row>
              </View>
            ) : null}
            {w.outcome ? <Button label={t('ch.remove')} variant="ghost" onPress={() => dispatch({ type: 'removeWish', id: w.id })} /> : null}
          </Card>
        );
      })}
    </Screen>
  );
}
