import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { myShare } from '@/domain/budget';
import type { Expense, Group } from '@/domain/types';
import { useI18n } from '@/i18n';

import { CategoryBadge, Muted } from './components';
import { formatWhen } from './messages';
import { colors, space } from './theme';

const SOURCE_BADGE: Record<Expense['source'], string> = {
  manual: '',
  applepay: ' · ⚡ Apple Pay',
  notificacion: ' · ⚡',
  csv: ' · CSV',
};

export function ExpenseRow({ expense, groups }: { expense: Expense; groups: Group[] }) {
  const i18n = useI18n();
  const group = expense.groupId ? groups.find((g) => g.id === expense.groupId) : undefined;
  const mine = myShare(expense, groups);
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/add', params: { id: expense.id } })}
      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: space.md, opacity: pressed ? 0.7 : 1 })}
    >
      <CategoryBadge id={expense.category} />
      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600' }} numberOfLines={1}>
          {expense.merchant}
        </Text>
        <Muted>
          {i18n.t(`cat.${expense.category}`)} · {formatWhen(i18n, expense.date)}
          {SOURCE_BADGE[expense.source]}
        </Muted>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600' }}>-{i18n.money(mine)}</Text>
        {group ? (
          <Muted>
            {group.emoji} {i18n.money(expense.amount)}
          </Muted>
        ) : null}
      </View>
    </Pressable>
  );
}
