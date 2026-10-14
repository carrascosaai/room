import { router } from 'expo-router';
import { Platform, Pressable, Text, View } from 'react-native';
import { canRecognizeText } from 'taimo-capture';

import { categoryStatus, monthKey, monthSummary } from '@/domain/budget';
import { CATEGORIES, category } from '@/domain/categories';
import { categoryTrend, expectedLeftover, monthForecast } from '@/domain/insights';
import { tripCandidates } from '@/domain/smart';
import { useI18n } from '@/i18n';
import { useStore } from '@/store/store';
import { BigButton, Card, CategoryBadge, Empty, H2, ProgressBar, Row, Screen } from '@/ui/components';
import { ExpenseRow } from '@/ui/ExpenseRow';
import { TripSuggestion } from '@/ui/TripSuggestion';
import { colors, radius, space } from '@/ui/theme';

/**
 * Inicio pensado para cualquiera: cuánto te queda, un botón grande para
 * apuntar, como mucho un aviso (el más importante) y tus últimos gastos.
 * Todo lo demás está en la pestaña «Más».
 */
export default function Home() {
  const { state, dispatch } = useStore();
  const { t, money, date } = useI18n();
  const today = new Date();
  const summary = monthSummary(state, today);
  const monthName = date(today, { month: 'long' });
  const budgets = CATEGORIES.map((c) => categoryStatus(state, c.id, today)).filter((s) => s.budget > 0);
  const recent = state.expenses.slice(0, 5);

  return (
    <Screen>
      <Text style={{ color: colors.text, fontSize: 26, fontWeight: '800' }}>
        {state.profile.name ? t('home.hello', { name: state.profile.name }) : t('home.helloAnon')}
      </Text>

      {/* Lo único que hay que mirar: cuánto te queda */}
      <Card style={{ backgroundColor: colors.primarySoft, borderColor: colors.primaryDark }}>
        <Text style={{ color: colors.textMuted, fontSize: 17 }}>{t('home.leftThisMonth', { month: monthName })}</Text>
        <Text
          style={{ color: summary.remaining < 0 ? colors.danger : colors.text, fontSize: 46, fontWeight: '800' }}
          accessibilityRole="header"
          adjustsFontSizeToFit
          numberOfLines={1}
        >
          {money(summary.remaining)}
        </Text>
        <ProgressBar progress={summary.progress} />
        <Text style={{ color: colors.text, fontSize: 18, lineHeight: 25 }}>
          {summary.budget === 0
            ? t('home.spentOf', { spent: money(summary.spent), budget: money(0) })
            : summary.remaining > 0
              ? t('home.perDay', { amount: money(summary.dailyAllowance), days: summary.daysLeft })
              : t('home.overLimit')}
        </Text>
      </Card>

      <BigButton emoji="＋" label={t('home.add')} onPress={() => router.push('/add')} />
      {canRecognizeText ? <BigButton emoji="📷" label={t('scan.button').replace(/^📷\s*/, '')} variant="secondary" onPress={() => router.push({ pathname: '/add', params: { scan: '1' } })} /> : null}

      {oneTip()}

      {budgets.length > 0 ? (
        <Card>
          <H2>{t('home.budgets')}</H2>
          {budgets.map((s) => (
            <View key={s.category} style={{ gap: space.xs }}>
              <Row>
                <CategoryBadge id={s.category} size={36} />
                <Text style={{ color: colors.text, flex: 1, fontSize: 17 }}>{t(`cat.${s.category}`)}</Text>
                <Text style={{ color: s.remaining < 0 ? colors.danger : colors.textMuted, fontSize: 16 }}>
                  {s.remaining >= 0 ? t('home.left', { amount: money(s.remaining) }) : t('home.over', { amount: money(-s.remaining) })}
                </Text>
              </Row>
              <ProgressBar progress={s.progress} color={category(s.category).color} />
            </View>
          ))}
        </Card>
      ) : null}

      <Card>
        <H2>{t('easy.recent')}</H2>
        {recent.length === 0 ? <Empty emoji="🧾" text={t('home.empty')} /> : recent.map((e) => <ExpenseRow key={e.id} expense={e} groups={state.groups} />)}
        {state.expenses.length > recent.length ? (
          <Pressable onPress={() => router.push('/history')} accessibilityRole="button" style={{ paddingVertical: space.sm }}>
            <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 17, textAlign: 'center' }}>{t('ins.seeAll')} ›</Text>
          </Pressable>
        ) : null}
      </Card>
    </Screen>
  );

  /** Como mucho un aviso: el más útil ahora mismo. */
  function oneTip() {
    if (tripCandidates(state).length) return <TripSuggestion />;

    const forecast = monthForecast(state, today);
    if (forecast && forecast.budget > 0 && forecast.projected > forecast.budget) {
      return (
        <Tip emoji="⚠️" color={colors.warning}>
          {t('ins.forecastOver', { amount: money(forecast.projected), over: money(forecast.projected - forecast.budget) })}
        </Tip>
      );
    }
    const trend = categoryTrend(state, today);
    if (trend) {
      return (
        <Tip emoji={category(trend.category).emoji} color={colors.warning}>
          {t('ins.trend', { category: t(`cat.${trend.category}`), pct: trend.pct, spent: money(trend.spent), usual: money(trend.usual) })}
        </Tip>
      );
    }
    const openGoal = (state.goals ?? []).find((g) => g.saved < g.target);
    const leftover = state.leftoverMonth === monthKey(today) ? 0 : expectedLeftover(forecast);
    if (openGoal && leftover > 0) {
      return (
        <Tip emoji="🎯" color={colors.primary}>
          {t('goal.leftover', { amount: money(leftover), goal: openGoal.name })}
          <BigButton
            label={t('goal.moveLeftover', { amount: money(leftover) })}
            variant="secondary"
            onPress={() => dispatch({ type: 'saveToGoal', id: openGoal.id, amount: leftover, leftoverMonth: monthKey(today) })}
          />
        </Tip>
      );
    }
    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    if (today.getDate() <= 7 && state.expenses.some((e) => monthKey(e.date) === monthKey(lastMonth))) {
      return (
        <Tip emoji="✨" color={colors.primary} onPress={() => router.push({ pathname: '/recap', params: { month: monthKey(lastMonth) } })}>
          {t('recap.open', { month: date(lastMonth, { month: 'long' }) }).replace(/^✨\s*/, '')}
        </Tip>
      );
    }
    const hasAuto = state.expenses.some((e) => e.source === 'applepay' || e.source === 'notificacion');
    if (!hasAuto && Platform.OS !== 'web') {
      return (
        <Tip emoji="⚡" color={colors.primary} onPress={() => router.push('/automation')}>
          {`${t('home.autoTitle')}. ${Platform.OS === 'android' ? t('home.autoTextAndroid') : t('home.autoText')}`}
        </Tip>
      );
    }
    return null;
  }
}

function Tip({ emoji, color, children, onPress }: { emoji: string; color: string; children: React.ReactNode; onPress?: () => void }) {
  const [text, ...rest] = Array.isArray(children) ? children : [children];
  const body = (
    <View style={{ backgroundColor: colors.surface, borderColor: color, borderWidth: 1.5, borderRadius: radius.lg, padding: space.lg, gap: space.md }}>
      <Row style={{ alignItems: 'flex-start' }}>
        <Text style={{ fontSize: 26 }}>{emoji}</Text>
        <Text style={{ color: colors.text, flex: 1, fontSize: 17, lineHeight: 24 }}>{text}</Text>
        {onPress ? <Text style={{ color: colors.primary, fontSize: 26 }}>›</Text> : null}
      </Row>
      {rest}
    </View>
  );
  return onPress ? (
    <Pressable onPress={onPress} accessibilityRole="button">
      {body}
    </Pressable>
  ) : (
    body
  );
}
