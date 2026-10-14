import { Text, View } from 'react-native';

import { moveToGroup, tripCandidates } from '@/domain/smart';
import { FALLBACK } from '@/fx/fx';
import { useI18n } from '@/i18n';
import { useStore } from '@/store/store';

import { Button, Card, Row } from './components';
import { ExpenseRow } from './ExpenseRow';
import { colors, space } from './theme';

/** Modo viaje: pagos tuyos en otra moneda durante un viaje → al grupo del viaje en un toque. */
export function TripSuggestion() {
  const { state, dispatch } = useStore();
  const { t } = useI18n();
  const candidates = tripCandidates(state);
  if (candidates.length === 0) return null;
  const { group, expenses } = candidates[0];
  const move = (ids: string[]) => {
    for (const e of expenses.filter((x) => ids.includes(x.id))) {
      dispatch({ type: 'updateExpense', expense: moveToGroup(e, group, state.profile.currency, state.fx ?? FALLBACK) });
    }
  };

  return (
    <Card style={{ borderColor: colors.primary }}>
      <Row>
        <Text style={{ fontSize: 24 }}>{group.emoji}</Text>
        <Text style={{ color: colors.text, fontWeight: '700', fontSize: 16, flex: 1 }}>{t('tripx.title')}</Text>
      </Row>
      <Text style={{ color: colors.textMuted }}>{t('tripx.text', { group: group.name })}</Text>
      {expenses.slice(0, 4).map((e) => (
        <View key={e.id} style={{ gap: space.xs }}>
          <ExpenseRow expense={e} groups={state.groups} />
          <Row style={{ justifyContent: 'flex-end' }}>
            <Button label={t('tripx.dismiss')} variant="ghost" onPress={() => dispatch({ type: 'dismissTrip', ids: [e.id] })} />
            <Button label={t('tripx.one')} variant="secondary" onPress={() => move([e.id])} />
          </Row>
        </View>
      ))}
      {expenses.length > 1 ? <Button label={t('tripx.add')} onPress={() => move(expenses.map((e) => e.id))} /> : null}
    </Card>
  );
}
