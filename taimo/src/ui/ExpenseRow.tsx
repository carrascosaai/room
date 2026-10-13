import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { myShare } from '@/domain/budget';
import { category } from '@/domain/categories';
import { formatMoney } from '@/domain/money';
import type { Expense, Group } from '@/domain/types';

import { CategoryBadge, Muted } from './components';
import { colors, space } from './theme';

const SOURCE_LABEL: Record<Expense['source'], string> = {
  manual: '',
  applepay: ' · ⚡ Apple Pay',
  notificacion: ' · ⚡ automático',
  csv: ' · importado',
};

export function formatDay(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const time = d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  if (d.toDateString() === today.toDateString()) return `Hoy, ${time}`;
  if (d.toDateString() === yesterday.toDateString()) return `Ayer, ${time}`;
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}

export function ExpenseRow({ expense, groups }: { expense: Expense; groups: Group[] }) {
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
          {category(expense.category).label} · {formatDay(expense.date)}
          {SOURCE_LABEL[expense.source]}
        </Muted>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600' }}>-{formatMoney(mine)}</Text>
        {group ? (
          <Muted>
            {group.emoji} de {formatMoney(expense.amount)}
          </Muted>
        ) : null}
      </View>
    </Pressable>
  );
}
