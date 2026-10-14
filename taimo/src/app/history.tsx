import { useMemo, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { homeOf, myShare } from '@/domain/budget';
import { CATEGORIES } from '@/domain/categories';
import { matchesSearch } from '@/domain/insights';
import type { CategoryId, Expense } from '@/domain/types';
import { useI18n } from '@/i18n';
import { useStore } from '@/store/store';
import { Button, Card, Chip, Empty, Input, Muted, Row, Screen } from '@/ui/components';
import { ExpenseRow } from '@/ui/ExpenseRow';
import { colors, space } from '@/ui/theme';

const PAGE = 150;

/** Todos tus gastos, por días, con buscador y filtro por categoría o grupo. */
export default function History() {
  const { state } = useStore();
  const i18n = useI18n();
  const { t, money, date } = i18n;
  const [query, setQuery] = useState('');
  const [cat, setCat] = useState<CategoryId | null>(null);
  const [groupId, setGroupId] = useState<string | null>(null);
  const [limit, setLimit] = useState(PAGE);
  const home = homeOf(state);

  const filtered = useMemo(
    () =>
      state.expenses
        .filter((e) => (cat ? e.category === cat : true))
        .filter((e) => (groupId ? e.groupId === groupId : true))
        .filter((e) => matchesSearch(e, query, (id) => t(`cat.${id}`)))
        .sort((a, b) => b.date.localeCompare(a.date)),
    [state.expenses, cat, groupId, query, t],
  );
  const total = filtered.reduce((s, e) => s + myShare(e, state.groups, home), 0);

  // Agrupados por día con el total de ese día.
  const days: { key: string; items: Expense[]; total: number }[] = [];
  for (const e of filtered.slice(0, limit)) {
    const key = new Date(e.date).toDateString();
    const last = days[days.length - 1];
    if (last?.key === key) {
      last.items.push(e);
      last.total += myShare(e, state.groups, home);
    } else days.push({ key, items: [e], total: myShare(e, state.groups, home) });
  }
  const usedCats = CATEGORIES.filter((c) => state.expenses.some((e) => e.category === c.id));

  return (
    <Screen>
      <Input value={query} onChangeText={(v) => { setQuery(v); setLimit(PAGE); }} placeholder={t('history.search')} autoCorrect={false} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }}>
        <Chip label={t('history.all')} selected={!cat && !groupId} onPress={() => { setCat(null); setGroupId(null); }} />
        {state.groups.map((g) => (
          <Chip key={g.id} label={`${g.emoji} ${g.name}`} selected={groupId === g.id} onPress={() => setGroupId(groupId === g.id ? null : g.id)} />
        ))}
        {usedCats.map((c) => (
          <Chip key={c.id} label={`${c.emoji} ${t(`cat.${c.id}`)}`} selected={cat === c.id} onPress={() => setCat(cat === c.id ? null : c.id)} />
        ))}
      </ScrollView>

      {filtered.length === 0 ? (
        <Empty emoji="🔍" text={t('history.empty')} />
      ) : (
        <Muted>{t('history.total', { amount: money(total) })}</Muted>
      )}

      {days.map((d) => (
        <View key={d.key} style={{ gap: space.sm }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Text style={{ color: colors.textMuted, fontWeight: '600' }}>{capitalize(date(d.items[0].date, { weekday: 'long', day: 'numeric', month: 'long' }))}</Text>
            <Muted>{money(d.total)}</Muted>
          </Row>
          <Card>
            {d.items.map((e) => (
              <ExpenseRow key={e.id} expense={e} groups={state.groups} timeOnly />
            ))}
          </Card>
        </View>
      ))}

      {filtered.length > limit ? <Button label={t('history.more')} variant="secondary" onPress={() => setLimit((l) => l + PAGE)} /> : null}
    </Screen>
  );
}

const capitalize = (s: string) => s.charAt(0).toLocaleUpperCase() + s.slice(1);
