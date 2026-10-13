import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { balances } from '@/domain/groups';
import { groupBudgetPlan } from '@/domain/groupInsights';
import { useI18n } from '@/i18n';
import { useStore } from '@/store/store';
import { syncConfigured } from '@/sync/api';
import { Button, Card, Empty, Muted, ProgressBar, Row, Screen, Title } from '@/ui/components';
import { colors, space } from '@/ui/theme';

export default function Groups() {
  const { state } = useStore();
  const { t, moneyIn, currency } = useI18n();

  return (
    <Screen>
      <Title>{t('groups.title')}</Title>
      <Muted>{t('groups.intro')}</Muted>

      {state.groups.map((g) => {
        const me = g.members.find((m) => m.isMe)?.id;
        const cur = g.currency ?? currency;
        const myBalance = me ? balances(g, state.expenses, state.settlements)[me] ?? 0 : 0;
        const plan = groupBudgetPlan(g, state.expenses);
        return (
          <Pressable key={g.id} onPress={() => router.push({ pathname: '/group/[id]', params: { id: g.id } })}>
            <Card>
              <Row>
                <Text style={{ fontSize: 30 }}>{g.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, fontSize: 17, fontWeight: '700' }}>
                    {g.name}
                    {g.remote ? ' ☁️' : ''}
                  </Text>
                  <Muted>
                    {g.kind ? `${t(`kind.${g.kind}`)} · ` : ''}
                    {g.members.map((m) => (m.isMe ? t('common.you') : m.name)).join(', ')}
                  </Muted>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  {myBalance === 0 ? (
                    <Muted>{t('groups.settled')}</Muted>
                  ) : (
                    <>
                      <Muted>{myBalance > 0 ? t('groups.owedToYou') : t('groups.youOwe')}</Muted>
                      <Text style={{ color: myBalance > 0 ? colors.success : colors.warning, fontWeight: '700' }}>
                        {moneyIn(Math.abs(myBalance), cur)}
                      </Text>
                    </>
                  )}
                </View>
              </Row>
              {plan ? (
                <View style={{ gap: space.xs }}>
                  <ProgressBar progress={plan.spent / plan.budget} />
                  <Muted>{t('gx.budgetLeft', { amount: moneyIn(Math.max(0, plan.remaining), cur), budget: moneyIn(plan.budget, cur) })}</Muted>
                </View>
              ) : null}
            </Card>
          </Pressable>
        );
      })}

      {state.groups.length === 0 ? <Empty emoji="👥" text={t('groups.empty')} /> : null}

      <View style={{ gap: space.sm }}>
        <Button label={t('groups.createButton')} onPress={() => router.push('/group/new')} />
        {syncConfigured ? <Button label={t('groups.joinButton')} variant="secondary" onPress={() => router.push('/join')} /> : null}
      </View>
    </Screen>
  );
}
