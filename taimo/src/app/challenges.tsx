import { useState } from 'react';
import { Text, View } from 'react-native';

import { category } from '@/domain/categories';
import { activityStreak, dailyStreak, evaluateChallenge, type ChallengeKind } from '@/domain/challenges';
import { ACHIEVEMENTS, achievements } from '@/domain/habits';
import type { CategoryId } from '@/domain/types';
import { useI18n } from '@/i18n';
import { newId, useStore } from '@/store/store';
import { challengeTitle } from '@/ui/challengeTitle';
import { Button, Card, Chip, H2, Muted, ProgressBar, Row, Screen } from '@/ui/components';
import { colors, space } from '@/ui/theme';

const CATS: CategoryId[] = ['comer', 'compras', 'ocio', 'transporte', 'suscripciones'];

/** Retos de ahorro de una semana y la racha de días dentro del límite. */
export default function Challenges() {
  const { state, dispatch } = useStore();
  const { t, money, date } = useI18n();
  const [cat, setCat] = useState<CategoryId>('comer');
  const streak = dailyStreak(state);
  const activity = activityStreak(state);
  const now = new Date();
  const todayIso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const lastSaved = activity.saved[activity.saved.length - 1];
  const got = achievements(state);
  const list = (state.challenges ?? []).map((c) => ({ c, s: evaluateChallenge(c, state) }));

  // Un reto igual que ya está en marcha no se empieza dos veces.
  const running = (kind: ChallengeKind, category?: CategoryId) =>
    list.some(({ c, s }) => s.status === 'active' && c.kind === kind && (kind !== 'noCategory' || c.category === category));

  const start = (kind: ChallengeKind) => {
    if (running(kind, kind === 'noCategory' ? cat : undefined)) return;
    const today = new Date();
    const iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    dispatch({ type: 'startChallenge', challenge: { id: newId(), kind, category: kind === 'noCategory' ? cat : undefined, start: iso, days: 7 } });
  };

  return (
    <Screen>
      {/* Racha de días apuntando, con 1 comodín por semana que salva un día olvidado. */}
      <Card style={{ backgroundColor: colors.primarySoft, borderColor: colors.primaryDark }}>
        <Row style={{ flexWrap: 'wrap', justifyContent: 'space-between' }}>
          <Text style={{ color: colors.text, fontSize: 34, fontWeight: '800' }} accessibilityRole="header">
            {t('streak.days', { count: activity.days })}
          </Text>
          <Text style={{ color: activity.freezes > 0 ? colors.text : colors.textMuted, fontSize: 22, fontWeight: '700' }}>
            {t('streak.freezes', { count: activity.freezes })}
          </Text>
        </Row>
        <Muted>{t('streak.hint')}</Muted>
        {lastSaved ? <Text style={{ color: colors.text, fontSize: 16 }}>{t('streak.saved', { date: date(`${lastSaved}T12:00:00`, { weekday: 'long', day: 'numeric' }) })}</Text> : null}
        {activity.freezes === 0 ? <Muted>{t('streak.noFreeze')}</Muted> : null}
        {activity.best > activity.days ? <Muted>{t('streak.best', { count: activity.best })}</Muted> : null}
        {activity.today ? (
          <Text style={{ color: colors.primary, fontSize: 17, fontWeight: '700' }}>{t('streak.checkedIn')}</Text>
        ) : (
          <Button label={`✅ ${t('streak.checkIn')}`} variant="secondary" onPress={() => dispatch({ type: 'checkIn', day: todayIso })} />
        )}
      </Card>
      <Card>
        <Text style={{ color: colors.text, fontSize: 20, fontWeight: '800' }}>{t('ch.streak', { count: streak })}</Text>
        <Muted>{t('ch.streakHint')}</Muted>
      </Card>

      {list.map(({ c, s }) => (
        <Card key={c.id} style={s.status === 'won' ? { borderColor: colors.primary } : s.status === 'failed' ? { borderColor: colors.border } : undefined}>
          <Row>
            <Text style={{ fontSize: 26 }}>{c.kind === 'noCategory' ? category(c.category!).emoji : c.kind === 'noSpendDays' ? '🚫' : '📉'}</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.text, fontSize: 16, fontWeight: '700' }}>{challengeTitle(c, t)}</Text>
              <Muted>
                {s.status === 'won' ? t('ch.won') : s.status === 'failed' ? t('ch.failed') : t('ch.day', { day: s.day, days: c.days })}
              </Muted>
            </View>
          </Row>
          {s.status === 'active' ? <ProgressBar progress={s.progress} alerts={c.kind === 'lessThanLastWeek'} /> : null}
          {c.kind === 'lessThanLastWeek' ? <Muted>{t('ch.lessWeekHint', { amount: money(s.target), spent: money(s.spent) })}</Muted> : null}
          {c.kind === 'noSpendDays' ? <Muted>{t('ch.noSpendProgress', { count: s.count })}</Muted> : null}
          <Button label={t('ch.remove')} variant="ghost" onPress={() => dispatch({ type: 'removeChallenge', id: c.id })} />
        </Card>
      ))}

      <H2>{t('ch.new')}</H2>
      <Card>
        <Text style={{ color: colors.text, fontWeight: '700' }}>{t('ch.noCategory', { category: t(`cat.${cat}`).toLowerCase() })}</Text>
        <Row style={{ flexWrap: 'wrap' }}>
          {CATS.map((c) => (
            <Chip key={c} label={`${category(c).emoji} ${t(`cat.${c}`)}`} selected={cat === c} onPress={() => setCat(c)} />
          ))}
        </Row>
        {running('noCategory', cat) ? <Muted>✓ {t('fixa.challengeRunning')}</Muted> : <Button label={t('ch.start')} onPress={() => start('noCategory')} />}
      </Card>
      <Card>
        <Text style={{ color: colors.text, fontWeight: '700' }}>📉 {t('ch.lessWeek')}</Text>
        {running('lessThanLastWeek') ? <Muted>✓ {t('fixa.challengeRunning')}</Muted> : <Button label={t('ch.start')} variant="secondary" onPress={() => start('lessThanLastWeek')} />}
      </Card>
      <Card>
        <Text style={{ color: colors.text, fontWeight: '700' }}>🚫 {t('ch.noSpend')}</Text>
        <Muted>{t('ch.noSpendHint')}</Muted>
        {running('noSpendDays') ? <Muted>✓ {t('fixa.challengeRunning')}</Muted> : <Button label={t('ch.start')} variant="secondary" onPress={() => start('noSpendDays')} />}
      </Card>
      <H2>{t('ach.title')}</H2>
      <Muted>{t('ach.count', { count: got.size, total: ACHIEVEMENTS.length })}</Muted>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
        {ACHIEVEMENTS.map((a) => {
          const on = got.has(a.id);
          return (
            <View
              key={a.id}
              accessibilityLabel={t(`ach.${a.id}`)}
              style={{
                width: '31%',
                alignItems: 'center',
                gap: 4,
                padding: space.sm,
                borderRadius: 16,
                backgroundColor: on ? colors.primarySoft : colors.surface,
                borderWidth: 1,
                borderColor: on ? colors.primary : colors.border,
                opacity: on ? 1 : 0.45,
              }}
            >
              <Text style={{ fontSize: 28 }}>{on ? a.emoji : '🔒'}</Text>
              <Text style={{ color: colors.text, fontSize: 15, textAlign: 'center' }} numberOfLines={3}>
                {t(`ach.${a.id}`)}
              </Text>
            </View>
          );
        })}
      </View>
      <View style={{ height: space.lg }} />
    </Screen>
  );
}
