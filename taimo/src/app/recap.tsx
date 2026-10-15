import * as Clipboard from 'expo-clipboard';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Platform, Share, Text, View } from 'react-native';

import { category } from '@/domain/categories';
import { monthRecap } from '@/domain/insights';
import { changePct } from '@/domain/stats';
import { isRecapSeason } from '@/domain/yearRecap';
import { useI18n } from '@/i18n';
import { useStore } from '@/store/store';
import { Button, Card, Muted, Notice, Screen } from '@/ui/components';
import { colors, radius, space } from '@/ui/theme';

/** «Tu octubre en Taimo»: el resumen del mes para verlo y compartirlo. */
export default function Recap() {
  const { month: param } = useLocalSearchParams<{ month?: string }>();
  const { state } = useStore();
  const i18n = useI18n();
  const { t, money, date } = i18n;
  const [copied, setCopied] = useState(false);
  const [y, m] = (param ?? '').split('-').map(Number);
  const month = y && m ? new Date(y, m - 1, 1) : new Date();
  const r = monthRecap(state, month);
  const monthName = date(r.month, { month: 'long' });
  const change = changePct(r.spent, r.previous || null);
  const dm = (d: Date) => date(d, { day: 'numeric', month: 'short' });

  const lines: { emoji: string; text: string; big?: boolean }[] = [
    { emoji: '💸', text: t('recap.spent', { amount: money(r.spent) }), big: true },
    ...(change !== null
      ? [
          {
            emoji: change > 0 ? '📈' : '📉',
            // Mes sin terminar: contra los mismos días del anterior («frente a 1–14 sept»), como en Resumen.
            text: r.partial
              ? t('ins.vsRange', { change: `${change > 0 ? '+' : ''}${change}%`, range: `${dm(r.previousRange.start)}–${dm(new Date(r.previousRange.end.getTime() - 1))}` })
              : t('recap.vs', { change: `${change > 0 ? '+' : ''}${change}%` }),
          },
        ]
      : []),
    ...(r.top ? [{ emoji: category(r.top.category).emoji, text: t('recap.top', { category: t(`cat.${r.top.category}`), amount: money(r.top.total) }) }] : []),
    ...(r.biggestDay ? [{ emoji: '📅', text: t('recap.day', { date: date(r.biggestDay.date, { weekday: 'long', day: 'numeric' }), amount: money(r.biggestDay.total) }) }] : []),
    // Hasta que no acaba el mes no se celebra: se dice lo que queda.
    ...(r.budget > 0
      ? [r.spent <= r.budget
          ? r.partial
            ? { emoji: '💰', text: t('fixa.budgetLeftSoFar', { amount: money(r.budget - r.spent) }) }
            : { emoji: '🏆', text: t('recap.under', { amount: money(r.budget - r.spent) }) }
          : r.partial
            ? { emoji: '⚠️', text: t('fixa.budgetOverSoFar', { amount: money(r.spent - r.budget) }) }
            : { emoji: '⚠️', text: t('recap.over', { amount: money(r.spent - r.budget) }) }]
      : []),
    ...(r.shared > 0 ? [{ emoji: '👥', text: t('recap.shared', { amount: money(r.shared) }) }] : []),
    { emoji: '🧾', text: t('recap.count', { count: r.count }) },
    ...(r.auto > 0 ? [{ emoji: '📲', text: t('recap.auto', { count: r.auto }) }] : []),
  ];
  const title = t('recap.title', { month: monthName });

  async function share() {
    const message = [title, '', ...lines.map((l) => `${l.emoji} ${l.text}`), '', t('pay.madeWith')].join('\n');
    if (Platform.OS === 'web') {
      await Clipboard.setStringAsync(message).catch(() => {});
      setCopied(true);
    } else await Share.share({ message });
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: '' }} />
      <View style={{ backgroundColor: colors.primarySoft, borderColor: colors.primaryDark, borderWidth: 1, borderRadius: radius.lg, padding: space.xl, gap: space.lg }}>
        <Text style={{ color: colors.text, fontSize: 26, fontWeight: '800' }}>{title}</Text>
        {lines.map((l) => (
          <View key={l.text} style={{ flexDirection: 'row', gap: space.md, alignItems: 'center' }}>
            <Text style={{ fontSize: l.big ? 30 : 22 }}>{l.emoji}</Text>
            <Text style={{ color: colors.text, flex: 1, fontSize: l.big ? 22 : 16, fontWeight: l.big ? '800' : '500' }}>{l.text}</Text>
          </View>
        ))}
      </View>
      <Button label={`📤 ${t('recap.share')}`} onPress={() => share().catch(() => {})} />
      {copied ? <Notice text={t('fixa.messageCopied')} /> : null}
      {/* En diciembre y enero, el resumen del año entero está a un toque. */}
      {isRecapSeason() ? <Button label={`✨ ${t('year.moreTitle')}`} variant="secondary" onPress={() => router.push('/tu-ano')} /> : null}
      {r.count === 0 ? (
        <Card>
          <Muted>{t('home.empty')}</Muted>
        </Card>
      ) : null}
    </Screen>
  );
}
