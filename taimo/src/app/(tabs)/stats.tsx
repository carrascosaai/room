import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { monthKey } from '@/domain/budget';
import { category } from '@/domain/categories';
import { detectSubscriptions, nextCharge } from '@/domain/insights';
import { changePct, periodStats, shiftAnchor, type Bucket, type Period, type Range } from '@/domain/stats';
import { useI18n, type I18n, type TKey } from '@/i18n';
import { useStore } from '@/store/store';
import { Button, Card, CategoryBadge, Empty, H2, Muted, ProgressBar, Row, Screen, Title } from '@/ui/components';
import { ExpenseRow } from '@/ui/ExpenseRow';
import { colors, radius, space } from '@/ui/theme';

const PERIODS: { id: Period; label: TKey }[] = [
  { id: 'day', label: 'stats.day' },
  { id: 'week', label: 'stats.week' },
  { id: 'month', label: 'stats.month' },
  { id: 'year', label: 'stats.year' },
  { id: 'all', label: 'stats.all' },
];

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Etiqueta corta bajo cada barra (solo algunas, para que no se amontonen). */
function axisLabel(i18n: I18n, b: Bucket, i: number, n: number): string {
  switch (b.kind) {
    case 'hour':
      return i % 6 === 0 ? String(i) : '';
    case 'weekday':
      return cap(i18n.date(b.start, { weekday: 'narrow' }));
    case 'monthday':
      return i === 0 || (i + 1) % 5 === 0 ? String(i + 1) : '';
    case 'month':
      return cap(i18n.date(b.start, { month: 'narrow' }));
    case 'year':
      return n > 8 && i % 2 === 1 ? '' : String(b.start.getFullYear());
  }
}

/** Texto completo del tramo seleccionado ("14:00", "lunes 13", "octubre"…). */
function bucketTitle(i18n: I18n, b: Bucket): string {
  switch (b.kind) {
    case 'hour':
      return i18n.date(b.start, { hour: '2-digit', minute: '2-digit' });
    case 'weekday':
      return cap(i18n.date(b.start, { weekday: 'long', day: 'numeric' }));
    case 'monthday':
      return i18n.date(b.start, { day: 'numeric', month: 'long' });
    case 'month':
      return cap(i18n.date(b.start, { month: 'long', year: 'numeric' }));
    case 'year':
      return String(b.start.getFullYear());
  }
}

function periodTitle(i18n: I18n, period: Period, start: Date): string {
  switch (period) {
    case 'day':
      return cap(i18n.date(start, { weekday: 'long', day: 'numeric', month: 'long' }));
    case 'week':
      return i18n.t('stats.weekOf', { date: i18n.date(start, { day: 'numeric', month: 'short' }) });
    case 'month':
      return cap(i18n.date(start, { month: 'long', year: 'numeric' }));
    case 'year':
      return String(start.getFullYear());
    case 'all':
      return i18n.t('stats.allTime');
  }
}

/** Tramo a resaltar al entrar: el actual si tiene gasto; si no, el último con gasto hasta ahora. */
function currentIndex(buckets: Bucket[], now: Date): number {
  let current = buckets.length - 1;
  for (let i = buckets.length - 1; i >= 0; i--) {
    if (buckets[i].start <= now) {
      current = i;
      break;
    }
  }
  for (let i = current; i >= 0; i--) if (buckets[i].total > 0) return i;
  return current;
}

function BarChart({ buckets, selected, onSelect }: { buckets: Bucket[]; selected: number; onSelect: (i: number) => void }) {
  const i18n = useI18n();
  const max = Math.max(1, ...buckets.map((b) => b.total));
  const thin = buckets.length > 14;
  return (
    <View style={{ gap: space.xs }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 150, gap: thin ? 2 : 6 }}>
        {buckets.map((b, i) => {
          const h = b.total > 0 ? Math.max(4, (b.total / max) * 150) : 2;
          const active = i === selected;
          return (
            // La zona táctil ocupa toda la columna, no solo la barra.
            <Pressable
              key={i}
              accessibilityRole="button"
              accessibilityLabel={`${bucketTitle(i18n, b)}: ${i18n.money(b.total)}`}
              onPress={() => onSelect(i)}
              style={{ flex: 1, height: '100%', justifyContent: 'flex-end' }}
            >
              <View
                style={{
                  height: h,
                  borderTopLeftRadius: 4,
                  borderTopRightRadius: 4,
                  backgroundColor: b.total === 0 ? colors.surfaceAlt : active ? colors.primary : colors.primaryDark,
                  opacity: b.total === 0 || active ? 1 : 0.55,
                }}
              />
            </Pressable>
          );
        })}
      </View>
      <View style={{ height: 1, backgroundColor: colors.border }} />
      {/* Etiquetas colocadas en su columna pero sin recortarse aunque las barras sean finas. */}
      <View style={{ height: 14 }}>
        {buckets.map((b, i) => {
          const label = axisLabel(i18n, b, i, buckets.length);
          if (!label) return null;
          return (
            <Text
              key={i}
              style={{
                position: 'absolute',
                left: `${((i + 0.5) / buckets.length) * 100}%`,
                width: 40,
                marginLeft: -20,
                color: i === selected ? colors.text : colors.textFaint,
                fontSize: 10,
                textAlign: 'center',
                fontWeight: i === selected ? '700' : '400',
              }}
            >
              {label}
            </Text>
          );
        })}
      </View>
    </View>
  );
}

export default function Stats() {
  const { state } = useStore();
  const i18n = useI18n();
  const { t, money } = i18n;
  const now = new Date();
  const [period, setPeriod] = useState<Period>('month');
  const [anchor, setAnchor] = useState<Date>(now);
  const [picked, setPicked] = useState<number | null>(null);

  const stats = useMemo(() => periodStats(state, period, anchor, now), [state, period, anchor]);
  const isCurrent = period === 'all' || stats.range.end > now;
  const selected = picked ?? (isCurrent ? currentIndex(stats.buckets, now) : stats.buckets.reduce((m, b, i, a) => (b.total > a[m].total ? i : m), 0));
  const sel = stats.buckets[selected];
  const change = changePct(stats.total, stats.previousTotal);
  const avg =
    period === 'year' || period === 'all'
      ? t('stats.avgPerMonth', { amount: money(Math.round(stats.total / stats.months)) })
      : period === 'day'
        ? null
        : t('stats.avgPerDay', { amount: money(Math.round(stats.total / stats.days)) });

  function go(steps: number) {
    setAnchor((a) => shiftAnchor(period, a, steps));
    setPicked(null);
  }

  return (
    <Screen>
      <Title>{t('stats.title')}</Title>

      {/* Selector de periodo */}
      <View style={{ flexDirection: 'row', backgroundColor: colors.surface, borderRadius: radius.pill, padding: 4, borderWidth: 1, borderColor: colors.border }}>
        {PERIODS.map((p) => {
          const on = p.id === period;
          return (
            <Pressable
              key={p.id}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              onPress={() => {
                setPeriod(p.id);
                setAnchor(new Date());
                setPicked(null);
              }}
              style={{ flex: 1, paddingVertical: 8, borderRadius: radius.pill, backgroundColor: on ? colors.primary : 'transparent' }}
            >
              <Text numberOfLines={1} style={{ textAlign: 'center', fontSize: 13, fontWeight: '600', color: on ? colors.onPrimary : colors.textMuted }}>
                {t(p.label)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {period !== 'all' ? (
        <Row style={{ justifyContent: 'space-between' }}>
          <Pressable onPress={() => go(-1)} hitSlop={14} accessibilityLabel="‹">
            <Text style={{ color: colors.primary, fontSize: 28 }}>‹</Text>
          </Pressable>
          <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600' }}>{periodTitle(i18n, period, stats.range.start)}</Text>
          <Pressable onPress={() => !isCurrent && go(1)} hitSlop={14} disabled={isCurrent} accessibilityLabel="›">
            <Text style={{ color: isCurrent ? colors.textFaint : colors.primary, fontSize: 28 }}>›</Text>
          </Pressable>
        </Row>
      ) : null}

      <Card>
        <Muted>{t('stats.total')}</Muted>
        <Text style={{ color: colors.text, fontSize: 36, fontWeight: '800' }}>{money(stats.total)}</Text>
        {period !== 'all' ? (
          <Text style={{ color: change === null ? colors.textMuted : change > 0 ? colors.warning : colors.success, fontSize: 14 }}>
            {change === null
              ? t('stats.noPrevious')
              : t('ins.vsRange', { change: `${change > 0 ? '▲ +' : '▼ '}${change}%`, range: rangeLabel(i18n, period, stats.previousRange!, stats.partial) })}
          </Text>
        ) : null}
        {avg ? <Muted>{avg}</Muted> : null}
        {period === 'month' && stats.total > 0 ? (
          <Button
            label={t('recap.open', { month: i18n.date(stats.range.start, { month: 'long' }) })}
            variant="secondary"
            onPress={() => router.push({ pathname: '/recap', params: { month: monthKey(stats.range.start) } })}
          />
        ) : null}

        {stats.total > 0 ? (
          <>
            {/* Valor del tramo seleccionado, encima del gráfico */}
            <View style={{ backgroundColor: colors.surfaceAlt, borderRadius: radius.md, paddingVertical: 8, paddingHorizontal: space.md, flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ color: colors.textMuted }}>{sel ? bucketTitle(i18n, sel) : ''}</Text>
              <Text style={{ color: colors.text, fontWeight: '700' }}>{sel ? money(sel.total) : ''}</Text>
            </View>
            <BarChart buckets={stats.buckets} selected={selected} onSelect={setPicked} />
            <Muted style={{ fontSize: 11, textAlign: 'center' }}>{t('stats.tapBar')}</Muted>
          </>
        ) : (
          <Empty emoji="📭" text={t('stats.empty')} />
        )}
      </Card>

      {stats.byCategory.length > 0 ? (
        <Card>
          <H2>{t('stats.byCategory')}</H2>
          {stats.byCategory.map((c) => (
            <View key={c.category} style={{ gap: space.xs }}>
              <Row>
                <Text style={{ fontSize: 18 }}>{category(c.category).emoji}</Text>
                <Text style={{ color: colors.text, flex: 1 }}>{t(`cat.${c.category}`)}</Text>
                <Text style={{ color: colors.text, fontWeight: '600' }}>{money(c.total)}</Text>
                <Muted style={{ width: 40, textAlign: 'right' }}>{Math.round((c.total / stats.total) * 100)}%</Muted>
              </Row>
              {/* Un solo color: la categoría la dicen el emoji y el nombre, no el color. */}
              <ProgressBar progress={c.total / stats.byCategory[0].total} alerts={false} />
            </View>
          ))}
        </Card>
      ) : null}

      <SubscriptionsCard />

      {stats.biggest.length > 0 ? (
        <Card>
          <H2>{t('stats.biggest')}</H2>
          {stats.biggest.map((e) => (
            <ExpenseRow key={e.id} expense={e} groups={state.groups} />
          ))}
        </Card>
      ) : null}
    </Screen>
  );
}

/** "1–14 sept", "septiembre", "lun 12" … para decir con qué se compara. */
function rangeLabel(i18n: I18n, period: Period, r: Range, partial: boolean): string {
  const last = new Date(r.end.getTime() - 1);
  const dm = (d: Date) => i18n.date(d, { day: 'numeric', month: 'short' });
  if (period === 'day') {
    const day = i18n.date(r.start, { weekday: 'short', day: 'numeric' });
    return partial ? `${day} 00:00–${i18n.date(r.end, { hour: '2-digit', minute: '2-digit' })}` : day;
  }
  if (!partial && period === 'month') return i18n.date(r.start, { month: 'long' });
  if (!partial && period === 'year') return String(r.start.getFullYear());
  return `${dm(r.start)}–${dm(last)}`;
}

/** Cobros que se repiten cada mes: lo que cuestan al mes y al año. */
function SubscriptionsCard() {
  const { state } = useStore();
  const { t, money, date } = useI18n();
  const subs = useMemo(() => detectSubscriptions(state.expenses), [state.expenses]);
  if (subs.length === 0) return null;
  const monthly = subs.reduce((s, x) => s + x.monthly, 0);
  return (
    <Card>
      <H2>{t('ins.subsTitle')}</H2>
      <Muted>{t('ins.subsHint')}</Muted>
      <Text style={{ color: colors.text, fontSize: 17, fontWeight: '700' }}>
        {t('ins.subsTotal', { month: money(monthly), year: money(monthly * 12) })}
      </Text>
      {subs.map((s) => (
        <Row key={s.merchant}>
          <CategoryBadge id={s.category} size={32} />
          <Text style={{ color: colors.text, flex: 1, fontSize: 15 }} numberOfLines={1}>
            {s.merchant}
          </Text>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ color: colors.text, fontWeight: '600' }}>{t('ins.subsMonthly', { amount: money(s.monthly) })}</Text>
            <Muted>{t('subx.next', { date: date(nextCharge(s), { day: 'numeric', month: 'short' }) })}</Muted>
          </View>
        </Row>
      ))}
    </Card>
  );
}
