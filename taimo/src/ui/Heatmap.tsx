import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { heatLevel, monthHeatmap } from '@/domain/habits';
import { useI18n } from '@/i18n';
import { useStore } from '@/store/store';

import { Card, H2, Muted, Row } from './components';
import { colors, radius, space } from './theme';

// Escala de un solo tono (el verde de Taimo), de claro a intenso.
const OPACITY = [0, 0.22, 0.45, 0.7, 1];

/** Calendario del mes coloreado por lo que gastaste cada día. */
export function Heatmap({ month }: { month: Date }) {
  const { state } = useStore();
  const { t, money, date, locale } = useI18n();
  const { days, max, firstWeekday } = monthHeatmap(state, month);
  const [picked, setPicked] = useState<number | null>(null);
  const weekdays = Array.from({ length: 7 }, (_, i) => new Date(2026, 0, 5 + i).toLocaleDateString(locale, { weekday: 'narrow' }));
  const cells: (number | null)[] = [...Array.from({ length: firstWeekday }, () => null), ...days.map((_, i) => i)];
  while (cells.length % 7) cells.push(null);
  const today = new Date();
  const isThisMonth = today.getFullYear() === month.getFullYear() && today.getMonth() === month.getMonth();

  return (
    <Card>
      <H2>{t('heat.title')}</H2>
      <Muted>
        {picked !== null
          ? `${date(new Date(month.getFullYear(), month.getMonth(), picked + 1), { weekday: 'long', day: 'numeric' })}: ${money(days[picked])}`
          : t('heat.tap')}
      </Muted>
      <View style={{ gap: 4 }}>
        <View style={{ flexDirection: 'row', gap: 4 }}>
          {weekdays.map((w, i) => (
            <Text key={i} style={{ flex: 1, textAlign: 'center', color: colors.textMuted, fontSize: 13 }}>
              {w}
            </Text>
          ))}
        </View>
        {Array.from({ length: cells.length / 7 }, (_, row) => (
          <View key={row} style={{ flexDirection: 'row', gap: 4 }}>
            {cells.slice(row * 7, row * 7 + 7).map((d, i) => {
              if (d === null) return <View key={i} style={{ flex: 1, aspectRatio: 1 }} />;
              const level = heatLevel(days[d], max);
              const future = isThisMonth && d + 1 > today.getDate();
              return (
                <Pressable
                  key={i}
                  onPress={() => setPicked(d)}
                  accessibilityRole="button"
                  accessibilityLabel={`${d + 1}: ${money(days[d])}`}
                  style={{
                    flex: 1,
                    aspectRatio: 1,
                    borderRadius: radius.sm,
                    // El color lleva la intensidad; el número del día se lee siempre.
                    backgroundColor: level ? withAlpha(colors.primary, OPACITY[level]) : colors.surfaceAlt,
                    opacity: future ? 0.35 : 1,
                    borderWidth: picked === d ? 2 : 0,
                    borderColor: colors.text,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ fontSize: 13, fontWeight: level ? '600' : '400', color: level >= 3 ? colors.onPrimary : colors.text }}>{d + 1}</Text>
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>
      <Row style={{ justifyContent: 'flex-end', gap: space.xs }}>
        <Muted>{t('heat.less')}</Muted>
        {OPACITY.map((o, i) => (
          <View key={i} style={{ width: 14, height: 14, borderRadius: 4, backgroundColor: i ? withAlpha(colors.primary, o) : colors.surfaceAlt }} />
        ))}
        <Muted>{t('heat.more')}</Muted>
      </Row>
    </Card>
  );
}

/** "#2EE59D" + 0.45 -> "rgba(46,229,157,0.45)" */
function withAlpha(hex: string, alpha: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}
