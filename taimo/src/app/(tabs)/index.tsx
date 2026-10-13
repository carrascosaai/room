import { router } from 'expo-router';
import { Platform, Pressable, Text, View } from 'react-native';

import { categoryStatus, monthSummary } from '@/domain/budget';
import { CATEGORIES, category } from '@/domain/categories';
import { useI18n } from '@/i18n';
import { useStore } from '@/store/store';
import { Card, CategoryBadge, Empty, H2, Muted, ProgressBar, Row, Screen } from '@/ui/components';
import { ExpenseRow } from '@/ui/ExpenseRow';
import { colors, radius, space } from '@/ui/theme';

export default function Home() {
  const { state } = useStore();
  const { t, money, date } = useI18n();
  const today = new Date();
  const summary = monthSummary(state, today);
  const monthName = date(today, { month: 'long' });
  const statuses = CATEGORIES.map((c) => categoryStatus(state, c.id, today)).filter(
    (s) => s.budget > 0 || s.spent > 0,
  );
  const recent = state.expenses.slice(0, 8);
  const hasAuto = state.expenses.some((e) => e.source === 'applepay' || e.source === 'notificacion');

  return (
    <View style={{ flex: 1 }}>
      <Screen>
        <View>
          <Muted>{state.profile.name ? t('home.hello', { name: state.profile.name }) : t('home.helloAnon')}</Muted>
          <Text style={{ color: colors.text, fontSize: 22, fontWeight: '700' }}>Taimo</Text>
        </View>

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
        </Card>

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

        <Pressable onPress={() => router.push('/converter')} accessibilityRole="button">
          <Card>
            <Row>
              <Text style={{ fontSize: 24 }}>💱</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text, fontWeight: '700', fontSize: 16 }}>{t('fx.title')}</Text>
                <Muted>{t('fx.openText')}</Muted>
              </View>
              <Text style={{ color: colors.primary, fontSize: 22 }}>›</Text>
            </Row>
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
          <H2>{t('home.recent')}</H2>
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
