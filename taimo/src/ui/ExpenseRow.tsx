import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { homeOf, myShare } from '@/domain/budget';
import type { Expense, Group } from '@/domain/types';
import { useI18n } from '@/i18n';
import { useStore } from '@/store/store';

import { CategoryBadge, Muted } from './components';
import { formatWhen } from './messages';
import { colors, space } from './theme';

const SOURCE_BADGE: Record<Expense['source'], string> = {
  manual: '',
  applepay: ' · ⚡ Apple Pay',
  notificacion: ' · ⚡',
  csv: ' · CSV',
  fijo: ' · 🔁',
  efectivo: ' · 💶',
};

/**
 * Un gasto en una lista. `perspective="group"` enseña el total del grupo y
 * quién pagó; por defecto enseña lo que te cuesta a ti, en tu moneda.
 */
export function ExpenseRow({
  expense,
  groups,
  perspective = 'me',
  timeOnly = false,
}: {
  expense: Expense;
  groups: Group[];
  perspective?: 'me' | 'group';
  /** En listas ya agrupadas por día solo hace falta la hora. */
  timeOnly?: boolean;
}) {
  const i18n = useI18n();
  const { state } = useStore();
  const group = expense.groupId ? groups.find((g) => g.id === expense.groupId) : undefined;
  const groupCurrency = group?.currency ?? i18n.currency;
  const payer = group?.members.find((m) => m.id === expense.paidBy);
  const main =
    perspective === 'group'
      ? i18n.moneyIn(expense.amount, groupCurrency)
      : `-${i18n.money(myShare(expense, groups, homeOf(state)))}`;
  const secondary = [
    expense.original ? i18n.moneyIn(expense.original.amount, expense.original.currency) : null,
    perspective === 'group' && payer ? `${payer.isMe ? i18n.t('common.you') : payer.name}` : null,
    perspective === 'me' && group ? `${group.emoji} ${i18n.moneyIn(expense.amount, groupCurrency)}` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${expense.merchant}, ${main}, ${i18n.t(`cat.${expense.category}`)}`}
      onPress={() => router.push({ pathname: '/add', params: { id: expense.id } })}
      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: space.md, opacity: pressed ? 0.7 : 1 })}
    >
      <CategoryBadge id={expense.category} />
      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600' }} numberOfLines={1}>
          {expense.merchant}
        </Text>
        <Muted>
          {i18n.t(`cat.${expense.category}`)} · {timeOnly ? i18n.date(expense.date, { hour: '2-digit', minute: '2-digit' }) : formatWhen(i18n, expense.date)}
          {SOURCE_BADGE[expense.source]}
        </Muted>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600' }}>{main}</Text>
        {secondary ? <Muted>{secondary}</Muted> : null}
      </View>
    </Pressable>
  );
}
