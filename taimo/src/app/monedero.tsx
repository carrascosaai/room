import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { cashBalance, cashMovements } from '@/domain/cash';
import { CATEGORIES } from '@/domain/categories';
import { parseAmount } from '@/domain/money';
import type { CategoryId, Cents } from '@/domain/types';
import { useI18n } from '@/i18n';
import { newId, useStore } from '@/store/store';
import { BigButton, Button, Card, CategoryBadge, Empty, H2, Input, Muted, Row, Screen } from '@/ui/components';
import { confirm } from '@/ui/confirm';
import { colors, radius, space } from '@/ui/theme';

const PAY_AMOUNTS = [100, 200, 500, 1000, 2000, 5000];
const WITHDRAW_AMOUNTS = [2000, 5000, 10000, 20000];
/** Las categorías más típicas del efectivo, primero. */
const CASH_FIRST: CategoryId[] = ['super', 'comer', 'transporte', 'salud', 'compras', 'casa', 'ocio', 'otros'];

type Mode = { kind: 'home' } | { kind: 'pay'; amount?: Cents } | { kind: 'withdraw' } | { kind: 'count' };

/**
 * Monedero de efectivo, para quien paga casi todo con billetes:
 * «Saqué del cajero» (no es gasto) y «Pagué en efectivo» (sí lo es, y baja el monedero).
 * Pocos toques: cantidad → categoría → hecho.
 */
export default function Monedero() {
  const { state, dispatch } = useStore();
  const { t, money, moneyShort, date } = useI18n();
  const [mode, setMode] = useState<Mode>({ kind: 'home' });
  const [other, setOther] = useState('');
  const [note, setNote] = useState<string | null>(null);
  const balance = cashBalance(state);
  const moves = cashMovements(state, 8);
  const cats = [...CASH_FIRST, ...CATEGORIES.map((c) => c.id).filter((id) => !CASH_FIRST.includes(id))];

  const go = (m: Mode) => {
    setOther('');
    setNote(null);
    setMode(m);
  };

  function pay(amount: Cents, cat: CategoryId) {
    dispatch({
      type: 'addExpense',
      expense: { id: newId(), amount, merchant: t(`cat.${cat}`), category: cat, date: new Date().toISOString(), source: 'efectivo', reviewed: true },
    });
    go({ kind: 'home' });
    setNote(t('cash.paidSaved', { amount: money(amount), category: t(`cat.${cat}`) }));
  }

  function withdraw(amount: Cents) {
    dispatch({ type: 'cashWithdraw', id: newId(), amount });
    go({ kind: 'home' });
    setNote(t('cash.withdrawSaved', { amount: money(amount) }));
  }

  function count(amount: Cents) {
    dispatch({ type: 'cashAdjust', balance: amount });
    go({ kind: 'home' });
    setNote(t('cash.adjustSaved', { amount: money(amount) }));
  }

  /** Cuadrícula de cantidades grandes + «Otra cantidad». */
  function amountGrid(amounts: number[], onPick: (a: Cents) => void, allowZero = false) {
    const typed = parseAmount(other);
    const ok = typed !== null && (allowZero ? typed >= 0 : typed > 0);
    return (
      <View style={{ gap: space.md }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
          {amounts.map((a) => (
            <Pressable
              key={a}
              onPress={() => onPick(a)}
              accessibilityRole="button"
              style={({ pressed }) => ({
                flexBasis: '31%',
                flexGrow: 1,
                minHeight: 72,
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: radius.lg,
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: colors.surfaceAlt,
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <Text style={{ color: colors.text, fontSize: 26, fontWeight: '800' }}>{moneyShort(a)}</Text>
            </Pressable>
          ))}
        </View>
        <Input label={t('cash.other')} value={other} onChangeText={setOther} keyboardType="decimal-pad" placeholder={t('cash.amountPlaceholder')} style={{ fontSize: 22 }} />
        {other.trim() ? <Button label={t('common.continue')} disabled={!ok} onPress={() => ok && onPick(typed!)} /> : null}
      </View>
    );
  }

  return (
    <Screen>
      <Card style={{ backgroundColor: colors.primarySoft, borderColor: colors.primaryDark, alignItems: 'center' }}>
        <Text style={{ color: colors.textMuted, fontSize: 18, textAlign: 'center' }}>{t('cash.left')}</Text>
        <Text
          style={{ color: balance < 0 ? colors.danger : colors.text, fontSize: 52, fontWeight: '800' }}
          adjustsFontSizeToFit
          numberOfLines={1}
          accessibilityRole="header"
        >
          {money(Math.max(0, balance))}
        </Text>
        {balance < 0 ? <Text style={{ color: colors.text, fontSize: 17, textAlign: 'center' }}>{t('cash.negative')}</Text> : null}
      </Card>

      {note ? (
        <Card style={{ borderColor: colors.success }}>
          <Text style={{ color: colors.text, fontSize: 18, textAlign: 'center' }}>✅ {note}</Text>
        </Card>
      ) : null}

      {mode.kind === 'home' ? (
        <>
          <BigButton emoji="💶" label={t('cash.pay')} onPress={() => go({ kind: 'pay' })} />
          <BigButton emoji="🏧" label={t('cash.withdraw')} variant="secondary" onPress={() => go({ kind: 'withdraw' })} />
          <BigButton emoji="🤔" label={t('cash.check')} variant="secondary" onPress={() => go({ kind: 'count' })} />
          <Muted style={{ textAlign: 'center' }}>{t('cash.notSpending')}</Muted>
        </>
      ) : null}

      {mode.kind === 'pay' && mode.amount === undefined ? (
        <Card>
          <H2>{t('cash.howMuchPaid')}</H2>
          {amountGrid(PAY_AMOUNTS, (amount) => go({ kind: 'pay', amount }))}
          <Button label={t('common.cancel')} variant="ghost" onPress={() => go({ kind: 'home' })} />
        </Card>
      ) : null}

      {mode.kind === 'pay' && mode.amount !== undefined ? (
        <Card>
          <H2>{t('cash.whatFor', { amount: money(mode.amount) })}</H2>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
            {cats.map((id) => (
              <Pressable
                key={id}
                onPress={() => pay(mode.amount!, id)}
                accessibilityRole="button"
                accessibilityLabel={t(`cat.${id}`)}
                style={({ pressed }) => ({
                  flexBasis: '47%',
                  flexGrow: 1,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: space.sm,
                  minHeight: 60,
                  paddingHorizontal: space.md,
                  borderRadius: radius.lg,
                  borderWidth: 1,
                  borderColor: colors.border,
                  backgroundColor: colors.surfaceAlt,
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <CategoryBadge id={id} size={36} />
                <Text style={{ color: colors.text, fontSize: 17, fontWeight: '700', flexShrink: 1 }}>{t(`cat.${id}`)}</Text>
              </Pressable>
            ))}
          </View>
          <Button label={t('common.back')} variant="ghost" onPress={() => go({ kind: 'pay' })} />
        </Card>
      ) : null}

      {mode.kind === 'withdraw' ? (
        <Card>
          <H2>{t('cash.howMuchOut')}</H2>
          {amountGrid(WITHDRAW_AMOUNTS, withdraw)}
          <Button label={t('common.cancel')} variant="ghost" onPress={() => go({ kind: 'home' })} />
        </Card>
      ) : null}

      {mode.kind === 'count' ? (
        <Card>
          <H2>{t('cash.countTitle')}</H2>
          <Muted>{t('cash.countHint')}</Muted>
          <Input value={other} onChangeText={setOther} keyboardType="decimal-pad" placeholder={money(Math.max(0, balance))} style={{ fontSize: 22 }} autoFocus />
          <Button
            label={t('common.save')}
            disabled={parseAmount(other) === null}
            onPress={() => {
              const a = parseAmount(other);
              if (a !== null && a >= 0) count(a);
            }}
          />
          <Button label={t('common.cancel')} variant="ghost" onPress={() => go({ kind: 'home' })} />
        </Card>
      ) : null}

      {mode.kind === 'home' ? (
        <Card>
          <H2>{t('cash.recent')}</H2>
          {moves.length === 0 ? (
            <Empty emoji="👛" text={t('cash.empty')} />
          ) : (
            moves.map((m) =>
              m.kind === 'in' ? (
                <Row key={`in-${m.withdrawal.id}`}>
                  <Text style={{ fontSize: 26 }}>🏧</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.text, fontSize: 17 }}>{t('cash.atm')}</Text>
                    <Muted>{date(m.date, { day: 'numeric', month: 'long' })}</Muted>
                  </View>
                  <Text style={{ color: colors.success, fontSize: 17, fontWeight: '700' }}>+{money(m.withdrawal.amount)}</Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t('common.delete')}
                    hitSlop={12}
                    onPress={() =>
                      confirm(t('cash.removeConfirm', { amount: money(m.withdrawal.amount) }), t('common.cancel'), t('common.delete'), () =>
                        dispatch({ type: 'cashRemoveWithdrawal', id: m.withdrawal.id }),
                      )
                    }
                  >
                    <Text style={{ color: colors.textMuted, fontSize: 20, paddingHorizontal: space.xs }}>✕</Text>
                  </Pressable>
                </Row>
              ) : (
                <Row key={`out-${m.expense.id}`}>
                  <CategoryBadge id={m.expense.category} size={36} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.text, fontSize: 17 }}>{m.expense.merchant || t(`cat.${m.expense.category}`)}</Text>
                    <Muted>{date(m.date, { day: 'numeric', month: 'long' })}</Muted>
                  </View>
                  <Text style={{ color: colors.text, fontSize: 17, fontWeight: '700' }}>−{money(m.expense.amount)}</Text>
                </Row>
              ),
            )
          )}
        </Card>
      ) : null}
    </Screen>
  );
}
