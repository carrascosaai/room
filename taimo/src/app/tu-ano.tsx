import * as Clipboard from 'expo-clipboard';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Platform, ScrollView, Share, Switch, Text, useWindowDimensions, View } from 'react-native';

import { category } from '@/domain/categories';
import { defaultRecapYear, yearRecap } from '@/domain/yearRecap';
import { useI18n } from '@/i18n';
import { useStore } from '@/store/store';
import { Button, Card, Chip, Muted, Notice, Row, Screen } from '@/ui/components';
import { colors, radius, space } from '@/ui/theme';

interface YearCard {
  key: string;
  emoji: string;
  label: string;
  big: string;
  /** Línea con importes (solo se enseña si quieres). */
  detail?: string;
  /** Lo que se comparte: sin importes… */
  share: string;
  /** …y con importes. */
  shareAmounts: string;
  fun: string;
}

/**
 * «Tu año en Taimo»: el resumen del año en tarjetas grandes que se pasan con el
 * dedo, cada una con su botón de compartir. Por defecto lo compartido no lleva
 * cifras (solo si tú lo eliges).
 */
export default function YourYear() {
  const { year: param } = useLocalSearchParams<{ year?: string }>();
  const { state } = useStore();
  const { t, money, date } = useI18n();
  const { width } = useWindowDimensions();
  const [year, setYear] = useState(() => Number(param) || defaultRecapYear());
  const [amounts, setAmounts] = useState(false);
  const [funny, setFunny] = useState(false);
  const [page, setPage] = useState(0);
  const [copied, setCopied] = useState(false);
  const r = yearRecap(state, year);
  // Un poco más estrecha que la pantalla para que se vea que hay otra al lado.
  const cardWidth = Math.min(520, width - space.lg * 2 - space.xl);

  // Años con gastos (para poder ver el anterior).
  const years = [...new Set(state.expenses.map((e) => new Date(e.date).getFullYear()))].filter((y) => y <= new Date().getFullYear()).sort((a, b) => b - a).slice(0, 4);

  const cards: YearCard[] = [];
  cards.push({
    key: 'spent',
    emoji: '💸',
    label: t('year.spentLabel'),
    big: money(r.spent),
    detail: t('year.expenses', { count: r.count }),
    share: t('year.shareCount', { count: r.count }),
    shareAmounts: t('year.shareSpent', { amount: money(r.spent) }),
    fun: t('year.funSpent'),
  });
  if (r.top) {
    const name = t(`cat.${r.top.category}`);
    cards.push({
      key: 'top',
      emoji: category(r.top.category).emoji,
      label: t('year.topLabel'),
      big: name,
      detail: money(r.top.total),
      share: t('year.shareTop', { category: name }),
      shareAmounts: t('year.shareTopAmount', { category: name, amount: money(r.top.total) }),
      fun: t('year.funTop', { category: name.toLowerCase() }),
    });
  }
  if (r.merchant) {
    cards.push({
      key: 'merchant',
      emoji: '📍',
      label: t('year.merchantLabel'),
      big: r.merchant.name,
      detail: t('year.visits', { count: r.merchant.count }),
      share: t('year.shareMerchant', { merchant: r.merchant.name, count: r.merchant.count }),
      shareAmounts: t('year.shareMerchantAmount', { merchant: r.merchant.name, amount: money(r.merchant.total) }),
      fun: t('year.funMerchant', { merchant: r.merchant.name }),
    });
  }
  if (r.bestMonth) {
    const month = date(r.bestMonth.month, { month: 'long' });
    const under = r.bestMonth.under !== null && r.bestMonth.under > 0 ? r.bestMonth.under : null;
    cards.push({
      key: 'month',
      emoji: '🏆',
      label: t('year.monthLabel'),
      big: month,
      detail: under ? t('year.monthUnder', { amount: money(under) }) : t('year.monthSpent', { amount: money(r.bestMonth.spent) }),
      share: t('year.shareMonth', { month }),
      shareAmounts: under ? t('year.shareMonthUnder', { month, amount: money(under) }) : t('year.shareMonth', { month }),
      fun: t('year.funMonth', { month }),
    });
  }
  if (r.recovered > 0) {
    cards.push({
      key: 'back',
      emoji: '💰',
      label: t('year.backLabel'),
      big: money(r.recovered),
      share: t('year.shareBack'),
      shareAmounts: t('year.shareBackAmount', { amount: money(r.recovered) }),
      fun: t('year.funBack'),
    });
  }
  if (r.days > 0) {
    cards.push({
      key: 'streak',
      emoji: '🔥',
      label: t('year.daysLabel'),
      big: t('year.days', { count: r.days }),
      detail: t('year.bestStreak', { count: r.bestStreak }),
      share: t('year.shareDays', { count: r.days }),
      shareAmounts: t('year.shareDays', { count: r.days }),
      fun: t('year.funDays'),
    });
  }
  if (r.tables > 0) {
    cards.push({
      key: 'tables',
      emoji: '🍽️',
      label: t('year.tablesLabel'),
      big: t('year.tables', { count: r.tables }),
      share: t('year.shareTables', { count: r.tables }),
      shareAmounts: t('year.shareTables', { count: r.tables }),
      fun: t('year.funTables'),
    });
  }

  const title = t('year.title', { year });
  const lineOf = (c: YearCard) => `${c.emoji} ${amounts ? c.shareAmounts : c.share}`;

  async function share(lines: string[]) {
    const message = [title, '', ...lines, '', t('pay.madeWith')].join('\n');
    if (Platform.OS === 'web') {
      await Clipboard.setStringAsync(message).catch(() => {});
      setCopied(true);
    } else await Share.share({ message });
  }

  if (r.count === 0) {
    return (
      <Screen>
        <Text style={{ color: colors.text, fontSize: 26, fontWeight: '800' }}>{title}</Text>
        <Card>
          <Muted>{t('year.empty')}</Muted>
        </Card>
        {years.length > 0 ? <YearChips years={years} year={year} onPick={setYear} /> : null}
      </Screen>
    );
  }

  return (
    <Screen>
      <Text style={{ color: colors.text, fontSize: 26, fontWeight: '800' }} accessibilityRole="header">
        {title}
      </Text>
      {r.partial ? <Muted>{t('year.soFar')}</Muted> : null}
      {years.length > 1 ? <YearChips years={years} year={year} onPick={setYear} /> : null}

      {/* Tarjetas grandes: se pasan con el dedo (o con los puntos de abajo). */}
      <ScrollView
        horizontal
        snapToInterval={cardWidth + space.md}
        decelerationRate="fast"
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: space.md }}
        onScroll={(ev) => setPage(Math.round(ev.nativeEvent.contentOffset.x / (cardWidth + space.md)))}
        scrollEventThrottle={32}
      >
        {cards.map((c, i) => (
          <View
            key={c.key}
            accessibilityLabel={`${i + 1}/${cards.length}. ${c.label}: ${c.big}`}
            style={{
              width: cardWidth,
              minHeight: 340,
              backgroundColor: i % 2 ? colors.surface : colors.primarySoft,
              borderColor: colors.primaryDark,
              borderWidth: 1,
              borderRadius: radius.lg,
              padding: space.xl,
              gap: space.md,
              justifyContent: 'center',
            }}
          >
            <Text style={{ fontSize: 56 }}>{c.emoji}</Text>
            <Text style={{ color: colors.textMuted, fontSize: 19, fontWeight: '600' }}>{c.label}</Text>
            <Text style={{ color: colors.text, fontSize: 38, fontWeight: '800' }} adjustsFontSizeToFit numberOfLines={2}>
              {c.big}
            </Text>
            {c.detail ? <Text style={{ color: colors.text, fontSize: 18 }}>{c.detail}</Text> : null}
            {funny ? <Text style={{ color: colors.primary, fontSize: 18, fontStyle: 'italic' }}>{c.fun}</Text> : null}
            <Button label={`📤 ${t('year.share')}`} variant="secondary" onPress={() => share([lineOf(c)]).catch(() => {})} />
          </View>
        ))}
      </ScrollView>
      <Row style={{ justifyContent: 'center' }}>
        {cards.map((c, i) => (
          <View
            key={c.key}
            style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: i === page ? colors.primary : colors.border }}
          />
        ))}
      </Row>

      <Card>
        <Row>
          <Text style={{ color: colors.text, fontSize: 17, flex: 1 }}>{t('year.includeAmounts')}</Text>
          <Switch accessibilityLabel={t('year.includeAmounts')} value={amounts} onValueChange={setAmounts} trackColor={{ true: colors.primary, false: colors.border }} />
        </Row>
        <Muted>{amounts ? t('year.amountsOn') : t('year.amountsOff')}</Muted>
        <Row>
          <Text style={{ color: colors.text, fontSize: 17, flex: 1 }}>😄 {t('year.funny')}</Text>
          <Switch accessibilityLabel={t('year.funny')} value={funny} onValueChange={setFunny} trackColor={{ true: colors.primary, false: colors.border }} />
        </Row>
      </Card>
      <Button label={`📤 ${t('year.shareAll')}`} onPress={() => share(cards.map(lineOf)).catch(() => {})} />
      {copied ? <Notice text={t('fixa.messageCopied')} /> : null}
      <Muted>{t('year.thanks')}</Muted>
    </Screen>
  );
}

function YearChips({ years, year, onPick }: { years: number[]; year: number; onPick: (y: number) => void }) {
  return (
    <Row style={{ flexWrap: 'wrap' }}>
      {years.map((y) => (
        <Chip key={y} label={String(y)} selected={y === year} onPress={() => onPick(y)} />
      ))}
    </Row>
  );
}
