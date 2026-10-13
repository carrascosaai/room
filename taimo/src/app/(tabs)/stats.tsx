import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { dailySpending, monthKey, monthlyTotals, spentByCategory } from '@/domain/budget';
import { CATEGORIES } from '@/domain/categories';
import { formatMoney, formatMoneyShort } from '@/domain/money';
import { useStore } from '@/store/store';
import { Card, CategoryBadge, Empty, H2, Muted, ProgressBar, Row, Screen, Title } from '@/ui/components';
import { colors, space } from '@/ui/theme';

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

function Bars({ values, labels, highlight }: { values: number[]; labels: string[]; highlight?: number }) {
  const max = Math.max(1, ...values);
  return (
    <View style={{ gap: space.xs }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 120, gap: 2 }}>
        {values.map((v, i) => (
          <View
            key={i}
            style={{
              flex: 1,
              height: `${Math.max(2, (v / max) * 100)}%`,
              backgroundColor: i === highlight ? colors.primary : v > 0 ? colors.primaryDark : colors.surfaceAlt,
              borderRadius: 3,
            }}
          />
        ))}
      </View>
      <View style={{ flexDirection: 'row' }}>
        {labels.map((l, i) => (
          <Text key={i} style={{ flex: 1, color: colors.textFaint, fontSize: 10, textAlign: 'center' }}>
            {l}
          </Text>
        ))}
      </View>
    </View>
  );
}

export default function Stats() {
  const { state } = useStore();
  const [offset, setOffset] = useState(0);
  const today = new Date();
  const month = new Date(today.getFullYear(), today.getMonth() - offset, 1);
  const isCurrent = offset === 0;

  const byCat = spentByCategory(state, monthKey(month));
  const total = Object.values(byCat).reduce((a, b) => a + b, 0);
  const ranked = CATEGORIES.map((c) => ({ ...c, spent: byCat[c.id] })).filter((c) => c.spent > 0).sort((a, b) => b.spent - a.spent);
  const days = dailySpending(state, month);
  const daysElapsed = isCurrent ? today.getDate() : days.length;
  const avg = daysElapsed > 0 ? Math.round(total / daysElapsed) : 0;
  const history = monthlyTotals(state, today, 6);

  const rawLabel = month.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
  const monthLabel = rawLabel.charAt(0).toUpperCase() + rawLabel.slice(1);

  return (
    <Screen>
      <Title>Estadísticas</Title>

      <Row style={{ justifyContent: 'space-between' }}>
        <Pressable onPress={() => setOffset((o) => o + 1)} hitSlop={12}>
          <Text style={{ color: colors.primary, fontSize: 26 }}>‹</Text>
        </Pressable>
        <Text style={{ color: colors.text, fontSize: 17, fontWeight: '600' }}>{monthLabel}</Text>
        <Pressable onPress={() => setOffset((o) => Math.max(0, o - 1))} hitSlop={12} disabled={isCurrent}>
          <Text style={{ color: isCurrent ? colors.textFaint : colors.primary, fontSize: 26 }}>›</Text>
        </Pressable>
      </Row>

      <Card>
        <Muted>Total gastado (tu parte)</Muted>
        <Text style={{ color: colors.text, fontSize: 34, fontWeight: '800' }}>{formatMoney(total)}</Text>
        <Muted>Media: {formatMoney(avg)} al día</Muted>
        <Bars
          values={days}
          labels={days.map((_, i) => ((i + 1) % 5 === 0 || i === 0 ? String(i + 1) : ''))}
          highlight={isCurrent ? today.getDate() - 1 : undefined}
        />
      </Card>

      <Card>
        <H2>Por categoría</H2>
        {ranked.length === 0 ? (
          <Empty emoji="📭" text="No hay gastos este mes." />
        ) : (
          ranked.map((c) => (
            <View key={c.id} style={{ gap: space.xs }}>
              <Row>
                <CategoryBadge id={c.id} size={32} />
                <Text style={{ color: colors.text, flex: 1 }}>{c.label}</Text>
                <Text style={{ color: colors.text, fontWeight: '600' }}>{formatMoney(c.spent)}</Text>
                <Muted style={{ width: 40, textAlign: 'right' }}>{Math.round((c.spent / total) * 100)}%</Muted>
              </Row>
              <ProgressBar progress={c.spent / ranked[0].spent} color={c.color} alerts={false} />
            </View>
          ))
        )}
      </Card>

      <Card>
        <H2>Últimos 6 meses</H2>
        <Bars
          values={history.map((h) => h.total)}
          labels={history.map((h) => MONTHS[Number(h.month.slice(5)) - 1])}
          highlight={history.length - 1 - offset}
        />
        <Row style={{ justifyContent: 'space-between' }}>
          {history.map((h) => (
            <Muted key={h.month} style={{ flex: 1, textAlign: 'center', fontSize: 10 }}>
              {formatMoneyShort(h.total)}
            </Muted>
          ))}
        </Row>
      </Card>
    </Screen>
  );
}
