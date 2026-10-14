import { router } from 'expo-router';
import { Platform, Pressable, Text, View } from 'react-native';

import { categoryStatus, monthKey, monthSummary } from '@/domain/budget';
import { CATEGORIES, category } from '@/domain/categories';
import { dailyStreak } from '@/domain/challenges';
import { categoryTrend, expectedLeftover, monthForecast } from '@/domain/insights';
import { useI18n } from '@/i18n';
import { useStore } from '@/store/store';
import { Button, Card, CategoryBadge, Empty, H2, Muted, ProgressBar, Row, Screen } from '@/ui/components';
import { ExpenseRow } from '@/ui/ExpenseRow';
import { QuickAdd } from '@/ui/QuickAdd';
import { Tile } from '@/ui/Tile';
import { TripSuggestion } from '@/ui/TripSuggestion';
import { colors, radius, space } from '@/ui/theme';
import { workCost } from '@/ui/workTime';

export default function Home() {
  const { state, dispatch } = useStore();
  const i18n = useI18n();
  const { t, money, date } = i18n;
  const today = new Date();
  const summary = monthSummary(state, today);
  const monthName = date(today, { month: 'long' });
  const statuses = CATEGORIES.map((c) => categoryStatus(state, c.id, today)).filter(
    (s) => s.budget > 0 || s.spent > 0,
  );
  const recent = state.expenses.slice(0, 8);
  const forecast = monthForecast(state, today);
  const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const trend = categoryTrend(state, today);
  const goals = state.goals ?? [];
  const streak = dailyStreak(state, today);
  const openGoal = goals.find((g) => g.saved < g.target);
  const leftover = state.leftoverMonth === monthKey(today) ? 0 : expectedLeftover(forecast);
  const hasAuto = state.expenses.some((e) => e.source === 'applepay' || e.source === 'notificacion');

  return (
    <View style={{ flex: 1 }}>
      <Screen>
        <View>
          <Muted>{state.profile.name ? t('home.hello', { name: state.profile.name }) : t('home.helloAnon')}</Muted>
          <Text style={{ color: colors.text, fontSize: 22, fontWeight: '700' }}>Taimo</Text>
        </View>

        <QuickAdd />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
          <Tile emoji="💬" label={t('asst.title')} onPress={() => router.push('/assistant')} />
          <Tile emoji="🏆" label={t('ch.title')} hint={t('ch.streak', { count: streak })} onPress={() => router.push('/challenges')} />
          <Tile emoji="🛍️" label={t('wish.title')} onPress={() => router.push('/wishlist')} />
          <Tile emoji="💱" label={t('fx.title')} onPress={() => router.push('/converter')} />
        </View>
        {today.getDate() <= 7 && state.expenses.some((e) => monthKey(e.date) === monthKey(lastMonth)) ? (
          <Button
            label={t('recap.open', { month: date(lastMonth, { month: 'long' }) })}
            variant="secondary"
            onPress={() => router.push({ pathname: '/recap', params: { month: monthKey(lastMonth) } })}
          />
        ) : null}
        <TripSuggestion />

        <Card style={{ backgroundColor: colors.primarySoft, borderColor: colors.primaryDark }}>
          <Muted>{t('home.leftThisMonth', { month: monthName })}</Muted>
          <Text style={{ color: summary.remaining < 0 ? colors.danger : colors.text, fontSize: 40, fontWeight: '800' }}>
            {money(summary.remaining)}
          </Text>
          <ProgressBar progress={summary.progress} />
          <Muted>{t('home.spentOf', { spent: money(summary.spent), budget: money(summary.budget) })}</Muted>
          <View style={{ backgroundColor: colors.bg, borderRadius: radius.md, padding: space.md }}>
            <Text style={{ color: colors.text, fontSize: 15 }}>
              {summary.remaining > 0
                ? t('home.perDay', { amount: money(summary.dailyAllowance), days: summary.daysLeft })
                : t('home.overLimit')}
            </Text>
          </View>
          {workCost(i18n, state.profile, summary.spent) ? <Muted>⏱️ {t('work.month', { time: workCost(i18n, state.profile, summary.spent)! })}</Muted> : null}
          {forecast ? (
            <Muted>
              {forecast.budget === 0
                ? t('ins.forecastNoBudget', { amount: money(forecast.projected) })
                : forecast.projected > forecast.budget
                  ? t('ins.forecastOver', { amount: money(forecast.projected), over: money(forecast.projected - forecast.budget) })
                  : t('ins.forecastUnder', { amount: money(forecast.projected), left: money(forecast.budget - forecast.projected) })}
            </Muted>
          ) : null}
        </Card>

        {trend ? (
          <Card style={{ borderColor: colors.warning }}>
            <Row>
              <Text style={{ fontSize: 24 }}>{category(trend.category).emoji}</Text>
              <Text style={{ color: colors.text, flex: 1, fontSize: 15 }}>
                {t('ins.trend', { category: t(`cat.${trend.category}`), pct: trend.pct, spent: money(trend.spent), usual: money(trend.usual) })}
              </Text>
            </Row>
          </Card>
        ) : null}

        {!hasAuto ? (
          <Pressable onPress={() => router.push('/automation')}>
            <Card style={{ borderColor: colors.primary }}>
              <Row>
                <Text style={{ fontSize: 24 }}>⚡</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, fontWeight: '700', fontSize: 16 }}>{t('home.autoTitle')}</Text>
                  <Muted>{Platform.OS === 'android' ? t('home.autoTextAndroid') : t('home.autoText')}</Muted>
                </View>
                <Text style={{ color: colors.primary, fontSize: 22 }}>›</Text>
              </Row>
            </Card>
          </Pressable>
        ) : null}


        <Pressable onPress={() => router.push('/goals')} accessibilityRole="button">
          <Card>
            <Row>
              <Text style={{ fontSize: 24 }}>🎯</Text>
              <Text style={{ color: colors.text, fontWeight: '700', fontSize: 16, flex: 1 }}>{t('goal.title')}</Text>
              <Text style={{ color: colors.primary, fontSize: 22 }}>›</Text>
            </Row>
            {goals.length === 0 ? <Muted>{t('goal.hint')}</Muted> : null}
            {goals.slice(0, 3).map((g) => (
              <View key={g.id} style={{ gap: space.xs }}>
                <Row style={{ justifyContent: 'space-between' }}>
                  <Text style={{ color: colors.text }}>
                    {g.emoji} {g.name}
                  </Text>
                  <Muted>{t('goal.progress', { saved: money(g.saved), target: money(g.target) })}</Muted>
                </Row>
                <ProgressBar progress={Math.min(1, g.saved / g.target)} color={colors.primary} alerts={false} />
              </View>
            ))}
            {openGoal && leftover > 0 ? (
              <View style={{ backgroundColor: colors.bg, borderRadius: radius.md, padding: space.md, gap: space.sm }}>
                <Text style={{ color: colors.text }}>{t('goal.leftover', { amount: money(leftover), goal: openGoal.name })}</Text>
                <Button
                  label={t('goal.moveLeftover', { amount: money(leftover) })}
                  variant="secondary"
                  onPress={() => dispatch({ type: 'saveToGoal', id: openGoal.id, amount: leftover, leftoverMonth: monthKey(today) })}
                />
              </View>
            ) : null}
          </Card>
        </Pressable>


        {statuses.length > 0 ? (
          <Card>
            <H2>{t('home.budgets')}</H2>
            {statuses.map((s) => {
              const c = category(s.category);
              return (
                <View key={s.category} style={{ gap: space.xs }}>
                  <Row>
                    <CategoryBadge id={s.category} size={32} />
                    <Text style={{ color: colors.text, flex: 1, fontSize: 15 }}>{t(`cat.${s.category}`)}</Text>
                    <Muted>
                      {s.budget > 0
                        ? s.remaining >= 0
                          ? t('home.left', { amount: money(s.remaining) })
                          : t('home.over', { amount: money(-s.remaining) })
                        : money(s.spent)}
                    </Muted>
                  </Row>
                  {s.budget > 0 ? <ProgressBar progress={s.progress} color={c.color} /> : null}
                </View>
              );
            })}
          </Card>
        ) : null}

        <Card>
          <Row style={{ justifyContent: 'space-between' }}>
            <H2>{t('home.recent')}</H2>
            {state.expenses.length > 0 ? (
              <Pressable onPress={() => router.push('/history')} hitSlop={10} accessibilityRole="button">
                <Text style={{ color: colors.primary, fontWeight: '600' }}>{t('ins.seeAll')} ›</Text>
              </Pressable>
            ) : null}
          </Row>
          {recent.length === 0 ? (
            <Empty emoji="🧾" text={t('home.empty')} />
          ) : (
            recent.map((e) => <ExpenseRow key={e.id} expense={e} groups={state.groups} />)
          )}
        </Card>
      </Screen>

      <View style={{ position: 'absolute', right: space.lg, bottom: space.lg }}>
        <Pressable
          accessibilityLabel={t('home.add')}
          onPress={() => router.push('/add')}
          style={({ pressed }) => ({
            width: 60,
            height: 60,
            borderRadius: 30,
            backgroundColor: colors.primary,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: pressed ? 0.8 : 1,
            shadowColor: colors.primary,
            shadowOpacity: 0.5,
            shadowRadius: 12,
            elevation: 6,
          })}
        >
          <Text style={{ color: colors.onPrimary, fontSize: 30, marginTop: -2, fontWeight: '600' }}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}
