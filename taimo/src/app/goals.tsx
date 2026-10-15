import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, Switch, Text, View } from 'react-native';

import { monthKey } from '@/domain/budget';
import { category } from '@/domain/categories';
import { goalPerMonth } from '@/domain/insights';
import { rolloverRows } from '@/domain/rollover';
import { parseAmount } from '@/domain/money';
import type { Goal } from '@/domain/types';
import { useI18n } from '@/i18n';
import { newId, useStore } from '@/store/store';
import { Button, Card, Chip, H2, Input, Muted, ProgressBar, Row, Screen } from '@/ui/components';
import { confirm } from '@/ui/confirm';
import { colors, space } from '@/ui/theme';

const EMOJIS = ['✈️', '🚗', '📱', '🎓', '🏠', '🎁', '💻', '🛟'];
const DEADLINES = [3, 6, 12] as const;

/** Metas de ahorro: dinero apartado para algo concreto, con cuánto apartar al mes. */
export default function Goals() {
  const { roll } = useLocalSearchParams<{ roll?: string }>();
  const { state, dispatch } = useStore();
  const i18n = useI18n();
  const { t, money, locale } = i18n;
  const goals = state.goals ?? [];
  const [emoji, setEmoji] = useState(EMOJIS[0]);
  const [name, setName] = useState('');
  const [target, setTarget] = useState('');
  const [months, setMonths] = useState<number | null>(6);
  const rel = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });

  function create() {
    const amount = parseAmount(target);
    if (!name.trim() || !amount) return;
    const d = new Date();
    d.setMonth(d.getMonth() + (months ?? 0));
    dispatch({
      type: 'addGoal',
      goal: {
        id: newId(),
        name: name.trim(),
        emoji,
        target: amount,
        saved: 0,
        deadline: months ? d.toISOString().slice(0, 10) : undefined,
        createdAt: new Date().toISOString(),
      },
    });
    setName('');
    setTarget('');
  }

  return (
    <Screen>
      {/* Desde «Más › Sobrante y huchas» se abre con el sobrante arriba. */}
      {roll ? <Rollover /> : null}
      <Muted>{t('goal.hint')}</Muted>

      {goals.map((g) => (
        <GoalCard key={g.id} goal={g} />
      ))}

      <Card>
        <Text style={{ color: colors.text, fontSize: 17, fontWeight: '700' }}>{t('goal.new')}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }}>
          {EMOJIS.map((e) => (
            <Chip key={e} label={e} selected={emoji === e} onPress={() => setEmoji(e)} />
          ))}
        </ScrollView>
        <Input label={t('goal.name')} value={name} onChangeText={setName} />
        <Input label={t('goal.target')} value={target} onChangeText={setTarget} keyboardType="decimal-pad" placeholder={money(150000)} />
        <Muted>{t('goal.deadline')}</Muted>
        <Row style={{ flexWrap: 'wrap' }}>
          {DEADLINES.map((m) => (
            <Chip key={m} label={rel.format(m, 'month')} selected={months === m} onPress={() => setMonths(m)} />
          ))}
          <Chip label={t('goal.noDate')} selected={months === null} onPress={() => setMonths(null)} />
        </Row>
        <Button label={t('goal.create')} onPress={create} disabled={!name.trim() || !parseAmount(target)} />
      </Card>
      {roll ? null : <Rollover />}
    </Screen>
  );
}

/**
 * Sobrante y huchas: en las categorías que elijas, lo que te sobra a final de mes
 * pasa al siguiente (y lo que te pasas se resta). Inicio lo tiene en cuenta solo.
 */
function Rollover() {
  const { state, dispatch } = useStore();
  const { t, money } = useI18n();
  const rows = rolloverRows(state);
  return (
    <View style={{ gap: space.md }}>
      <H2>🐷 {t('roll.title')}</H2>
      <Muted>{t('roll.hint')}</Muted>
      {rows.length === 0 ? (
        <Card>
          <Muted>{t('roll.noBudgets')}</Muted>
          <Button label={t('settings.title')} variant="secondary" onPress={() => router.push('/settings')} />
        </Card>
      ) : (
        rows.map((r) => {
          const label = t('roll.toggle', { category: t(`cat.${r.category}`) });
          return (
            <Card key={r.category} style={r.on ? { borderColor: colors.primary } : undefined}>
              <Row>
                <Text style={{ fontSize: 26 }}>{category(r.category).emoji}</Text>
                <Text style={{ color: colors.text, fontSize: 17, fontWeight: '600', flex: 1 }}>{label}</Text>
                <Switch
                  accessibilityLabel={label}
                  value={r.on}
                  onValueChange={(on) => dispatch({ type: 'setRollover', category: r.category, on })}
                  trackColor={{ true: colors.primary, false: colors.border }}
                />
              </Row>
              {r.on ? (
                <Text style={{ color: r.carry < 0 ? colors.warning : colors.primary, fontSize: 17, fontWeight: '700' }}>
                  {r.carry > 0
                    ? t('roll.carryUp', { amount: money(r.carry) })
                    : r.carry < 0
                      ? t('roll.carryDown', { amount: money(-r.carry) })
                      : state.rollover?.[r.category] === monthKey(new Date())
                        ? t('roll.startsNext')
                        : t('roll.carryZero')}
                </Text>
              ) : null}
            </Card>
          );
        })
      )}
      {rows.some((r) => r.on) ? <Muted>{t('roll.huchaHint')}</Muted> : null}
    </View>
  );
}

function GoalCard({ goal }: { goal: Goal }) {
  const { dispatch } = useStore();
  const { t, money, date } = useI18n();
  const [amount, setAmount] = useState('');
  const perMonth = goalPerMonth(goal);
  const done = goal.saved >= goal.target;
  const [warning, setWarning] = useState<string | null>(null);
  const move = (sign: 1 | -1) => {
    const value = parseAmount(amount);
    if (!value) return;
    // No se puede sacar más de lo que hay apartado: se dice y no se toca nada.
    if (sign < 0 && value > goal.saved) {
      setWarning(goal.saved > 0 ? t('fixa.withdrawTooMuch', { amount: money(goal.saved) }) : t('fixa.withdrawNothing'));
      return;
    }
    setWarning(null);
    dispatch({ type: 'saveToGoal', id: goal.id, amount: sign * value });
    setAmount('');
  };

  return (
    <Card style={done ? { borderColor: colors.primary } : undefined}>
      <Row>
        <Text style={{ fontSize: 28 }}>{goal.emoji}</Text>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.text, fontSize: 17, fontWeight: '700' }}>{goal.name}</Text>
          <Muted>
            {t('goal.progress', { saved: money(goal.saved), target: money(goal.target) })}
            {goal.deadline ? ` · ${date(goal.deadline, { month: 'short', year: 'numeric' })}` : ''}
          </Muted>
        </View>
        <Text style={{ color: colors.primary, fontWeight: '800', fontSize: 17 }}>{Math.min(100, Math.floor((goal.saved / goal.target) * 100))}%</Text>
      </Row>
      <ProgressBar progress={Math.min(1, goal.saved / goal.target)} color={colors.primary} alerts={false} />
      {done ? (
        <Text style={{ color: colors.primary, fontWeight: '700' }}>{t('goal.done')}</Text>
      ) : perMonth ? (
        <Muted>{t('goal.perMonth', { amount: money(perMonth) })}</Muted>
      ) : null}
      <Row>
        <View style={{ flex: 1 }}>
          <Input value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder={t('goal.amount')} />
        </View>
        <Button label={t('goal.add')} onPress={() => move(1)} disabled={!parseAmount(amount)} />
      </Row>
      {warning ? <Text style={{ color: colors.warning, fontSize: 16 }}>{warning}</Text> : null}
      <Row style={{ justifyContent: 'space-between' }}>
        <Button label={t('goal.withdraw')} variant="ghost" onPress={() => move(-1)} disabled={!parseAmount(amount)} />
        <Button
          label={t('common.delete')}
          variant="ghost"
          onPress={() => confirm(t('goal.deleteConfirm'), t('common.cancel'), t('common.delete'), () => dispatch({ type: 'deleteGoal', id: goal.id }))}
        />
      </Row>
    </Card>
  );
}
