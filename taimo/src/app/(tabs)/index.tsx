import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import { canRecognizeText } from 'taimo-capture';

import { categoryStatus, monthKey, monthSummary } from '@/domain/budget';
import { chargesWithin, upcomingCharges } from '@/domain/calendar';
import { CATEGORIES, category } from '@/domain/categories';
import { categoryTrend, expectedLeftover, monthForecast } from '@/domain/insights';
import { findMoneyBack, urgentMoneyBack } from '@/domain/moneyback';
import { reviewQueue } from '@/domain/review';
import { tripCandidates } from '@/domain/smart';
import { safeToSpendToday } from '@/domain/today';
import { useI18n } from '@/i18n';
import { useStore } from '@/store/store';
import { BigButton, Button, Card, CategoryBadge, Empty, H2, ProgressBar, Row, Screen, useFontScale } from '@/ui/components';
import { ExpenseRow } from '@/ui/ExpenseRow';
import { TripSuggestion } from '@/ui/TripSuggestion';
import { colors, radius, space } from '@/ui/theme';
import { toast } from '@/ui/Toast';
import { CallTrusted } from '@/ui/Trusted';

/** Avisos de una sola vez (se guardan en el móvil al cerrarlos). */
const SIMPLE_TIP_KEY = 'taimo:simple-tip';
const SCAM_TIP_KEY = 'taimo:scam-tip';

/** Lee si un aviso de una vez ya se cerró. Mientras carga, no se enseña (null). */
function useDismissed(key: string): [boolean | null, () => void] {
  const [dismissed, setDismissed] = useState<boolean | null>(null);
  useEffect(() => {
    AsyncStorage.getItem(key)
      .then((v) => setDismissed(v === '1'))
      .catch(() => setDismissed(false));
  }, [key]);
  const dismiss = () => {
    setDismissed(true);
    AsyncStorage.setItem(key, '1').catch(() => {});
  };
  return [dismissed, dismiss];
}

/**
 * Inicio pensado para cualquiera: cuánto puedes gastar hoy, un botón grande para
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
  const safe = safeToSpendToday(state, today);
  const fs = useFontScale();
  const simple = !!state.profile.simple;
  const [simpleTipDone, dismissSimpleTip] = useDismissed(SIMPLE_TIP_KEY);
  const [scamTipDone, dismissScamTip] = useDismissed(SCAM_TIP_KEY);

  return (
    <Screen>
      {simple ? null : (
        <Text style={{ color: colors.text, fontSize: fs(26), fontWeight: '800' }}>
          {state.profile.name ? t('home.hello', { name: state.profile.name }) : t('home.helloAnon')}
        </Text>
      )}

      {/* Lo único que hay que mirar: cuánto puedes gastar hoy (o, sin presupuesto, cuánto llevas) */}
      {!safe ? (
        <Card style={{ backgroundColor: colors.primarySoft, borderColor: colors.primaryDark }}>
          <Text style={{ color: colors.textMuted, fontSize: fs(17) }}>{t('home.spentThisMonth')}</Text>
          <Text style={{ color: colors.text, fontSize: fs(46), fontWeight: '800' }} accessibilityRole="header" adjustsFontSizeToFit numberOfLines={1}>
            {money(summary.spent)}
          </Text>
          <BigButton emoji="🎯" label={t('home.setBudget')} variant="secondary" onPress={() => router.push('/settings')} />
        </Card>
      ) : (
        <Card style={{ backgroundColor: colors.primarySoft, borderColor: colors.primaryDark }}>
          <Text style={{ color: colors.textMuted, fontSize: fs(18) }}>{t('today.label')}</Text>
          <Text
            style={{ color: safe.over ? colors.danger : colors.text, fontSize: fs(52), fontWeight: '800' }}
            accessibilityRole="header"
            accessibilityLabel={`${t('today.label')}: ${money(safe.amount)}`}
            adjustsFontSizeToFit
            numberOfLines={1}
          >
            {money(safe.amount)}
          </Text>
          {safe.spentToday > 0 ? <Text style={{ color: colors.textMuted, fontSize: fs(17) }}>{t('today.spentToday', { amount: money(safe.spentToday) })}</Text> : null}
          {safe.over || safe.amount === 0 ? (
            <Text style={{ color: colors.text, fontSize: fs(18), lineHeight: fs(25) }}>
              {safe.over
                ? t('today.over', { amount: money(-safe.remaining) })
                : safe.daysLeft > 1
                  ? t('today.doneToday', { amount: money(safe.tomorrow) })
                  : t('today.doneLastDay')}
            </Text>
          ) : null}
          <View style={{ gap: space.xs, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: space.md }}>
            {safe.over ? null : (
              <Text style={{ color: colors.text, fontSize: fs(17) }}>{t('today.leftMonth', { month: monthName, amount: money(summary.remaining) })}</Text>
            )}
            <ProgressBar progress={summary.progress} />
          </View>
        </Card>
      )}

      <BigButton emoji="＋" label={t('home.add')} onPress={() => router.push('/add')} />
      <BigButton emoji="💶" label={t('cash.pay')} variant="secondary" onPress={() => router.push('/monedero')} />
      {/* Modo sencillo: solo lo esencial (lo demás sigue en «Más»). */}
      {simple ? (
        <CallTrusted variant="secondary" />
      ) : (
        <>
          <BigButton label={t('mesa.start')} variant="secondary" onPress={() => router.push('/mesa-nueva')} />
          {canRecognizeText ? <BigButton emoji="📷" label={t('scan.button').replace(/^📷\s*/, '')} variant="secondary" onPress={() => router.push({ pathname: '/add', params: { scan: '1' } })} /> : null}
        </>
      )}

      {simple ? onceTip() : (onceTip() ?? oneTip())}

      {!simple && budgets.length > 0 ? (
        <Card>
          <H2>{t('home.budgets')}</H2>
          {budgets.map((s) => (
            <Pressable
              key={s.category}
              onPress={() => router.push('/settings')}
              accessibilityRole="button"
              accessibilityHint={t('today.editBudget')}
              style={({ pressed }) => ({ gap: space.xs, paddingVertical: space.xs, opacity: pressed ? 0.7 : 1 })}
            >
              <Row>
                <CategoryBadge id={s.category} size={36} />
                <Text style={{ color: colors.text, flex: 1, fontSize: fs(17) }}>{t(`cat.${s.category}`)}</Text>
                <Text style={{ color: s.remaining < 0 ? colors.danger : colors.textMuted, fontSize: fs(16) }}>
                  {s.remaining >= 0 ? t('home.left', { amount: money(s.remaining) }) : t('today.overBy', { amount: money(-s.remaining) })}
                </Text>
                <Text style={{ color: colors.primary, fontSize: fs(22) }}>›</Text>
              </Row>
              <ProgressBar progress={s.progress} color={category(s.category).color} />
            </Pressable>
          ))}
        </Card>
      ) : null}

      <Card>
        <H2>{t('easy.recent')}</H2>
        {recent.length === 0 ? <Empty emoji="🧾" text={t('home.empty')} /> : recent.map((e) => <ExpenseRow key={e.id} expense={e} groups={state.groups} />)}
        {state.expenses.length > recent.length ? (
          <Pressable onPress={() => router.push('/history')} accessibilityRole="button" style={{ paddingVertical: space.sm }}>
            <Text style={{ color: colors.primary, fontWeight: '700', fontSize: fs(17), textAlign: 'center' }}>{t('ins.seeAll')} ›</Text>
          </Pressable>
        ) : null}
      </Card>
    </Screen>
  );

  /**
   * Avisos de una sola vez: en modo normal, ofrecer el modo sencillo; en modo
   * sencillo, recordar «Antes de pagar, comprueba». Se cierran para siempre.
   */
  function onceTip() {
    if (!simple && simpleTipDone === false) {
      return (
        <Tip emoji="🔎" color={colors.primary}>
          {`${t('simple.tipTitle')} ${t('simple.tipText')}`}
          <Row key="b" style={{ flexWrap: 'wrap' }}>
            <Button
              label={t('simple.tipYes')}
              onPress={() => {
                dispatch({ type: 'setSimple', on: true });
                dismissSimpleTip();
                toast(t('simple.on'));
              }}
            />
            <Button label={t('simple.tipNo')} variant="ghost" onPress={dismissSimpleTip} />
          </Row>
        </Tip>
      );
    }
    if (simple && scamTipDone === false) {
      return (
        <Tip emoji="🛡️" color={colors.warning} onPress={() => router.push('/comprueba')}>
          {t('scam.homeTip')}
          <Button key="b" label={t('scam.dismiss')} variant="ghost" onPress={dismissScamTip} />
        </Tip>
      );
    }
    return null;
  }

  /** Como mucho un aviso: el más útil ahora mismo. */
  function oneTip() {
    if (tripCandidates(state).length) return <TripSuggestion />;

    // Dinero que es tuyo: solo si corre prisa (un cobro repetido, o un plazo para devolver que acaba en 3 días).
    // Lo demás (subidas, suscripciones…) se ve en «Dinero que es tuyo» y no tapa los avisos del presupuesto.
    const urgent = urgentMoneyBack(findMoneyBack(state, today));
    const doubles = urgent.filter((m) => m.kind === 'double');
    const soon = urgent.filter((m) => m.kind === 'returnWindow' && m.until && daysUntil(m.until, today) <= 3);
    if (doubles.length || soon.length) {
      return (
        <Tip emoji="💸" color={colors.warning} onPress={() => router.push('/devuelve')}>
          {doubles.length
            ? t('back.homeTip', { amount: money(doubles.reduce((s, m) => s + m.amount, 0)) })
            : t('misc.homeCheck', { count: soon.length })}
        </Tip>
      );
    }

    // Gastos que Taimo apuntó solo y aún no has mirado.
    const toReview = reviewQueue(state.expenses, today).length;
    if (toReview > 0) {
      return (
        <Tip emoji="👀" color={colors.primary} onPress={() => router.push('/revisar')}>
          {t('today.reviewTip', { count: toReview })}
        </Tip>
      );
    }

    // Recibos que llegan en los próximos 7 días.
    const week = chargesWithin(upcomingCharges(state, today, 7), today, 7);
    if (week.count > 0) {
      return (
        <Tip emoji="📅" color={colors.primary} onPress={() => router.push('/calendario')}>
          {t('cal.weekTip', { amount: money(week.total) })}
        </Tip>
      );
    }

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

/** Días que faltan hasta una fecha YYYY-MM-DD (0 = hoy). */
function daysUntil(iso: string, today: Date): number {
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  return Math.round((new Date(`${iso}T00:00:00`).getTime() - start) / 86_400_000);
}

function Tip({ emoji, color, children, onPress }: { emoji: string; color: string; children: React.ReactNode; onPress?: () => void }) {
  const fs = useFontScale();
  const [text, ...rest] = Array.isArray(children) ? children : [children];
  const body = (
    <View style={{ backgroundColor: colors.surface, borderColor: color, borderWidth: 1.5, borderRadius: radius.lg, padding: space.lg, gap: space.md }}>
      <Row style={{ alignItems: 'flex-start' }}>
        <Text style={{ fontSize: fs(26) }}>{emoji}</Text>
        <Text style={{ color: colors.text, flex: 1, fontSize: fs(17), lineHeight: fs(24) }}>{text}</Text>
        {onPress ? <Text style={{ color: colors.primary, fontSize: fs(26) }}>›</Text> : null}
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
