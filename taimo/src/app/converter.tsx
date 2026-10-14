import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';

import { parseAmount } from '@/domain/money';
import { convert, rateBetween } from '@/fx/fx';
import { useRates } from '@/fx/useRates';
import { CURRENCIES, useI18n } from '@/i18n';
import { useStore } from '@/store/store';
import { Button, Card, H2, Muted, Row, Screen } from '@/ui/components';
import { CurrencyButton, CurrencyPicker, currencyFlag } from '@/ui/CurrencyPicker';
import { colors, radius, space } from '@/ui/theme';

/**
 * Conversor con las 155 monedas del mundo. Pensado para viajes y Erasmus:
 * por defecto convierte la última moneda usada a la tuya.
 */
export default function Converter() {
  const { state } = useStore();
  const i18n = useI18n();
  const { t, moneyIn, number, date } = i18n;
  const { rates, refresh, loading } = useRates();
  const home = i18n.currency;
  const lastForeign = (state.recentCurrencies ?? []).find((c) => c !== home);
  const [from, setFrom] = useState(lastForeign ?? (home === 'USD' ? 'EUR' : 'USD'));
  const [to, setTo] = useState(home);
  const [text, setText] = useState('100');
  const [picking, setPicking] = useState<'from' | 'to' | null>(null);

  const amount = parseAmount(text) ?? 0;
  const result = convert(amount, from, to, rates);
  const rate = rateBetween(from, to, rates);
  const others = [home, ...(state.recentCurrencies ?? []), ...CURRENCIES]
    .filter((c, i, a) => a.indexOf(c) === i && c !== from && c !== to)
    .slice(0, 8);

  return (
    <Screen>
      <Muted>
        {rates.source === 'online'
          ? t('fx.subtitle', { date: date(rates.date, { dateStyle: 'medium' }) })
          : t('fx.offline', { date: date(rates.date, { dateStyle: 'medium' }) })}
      </Muted>

      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <CurrencyButton value={from} onPress={() => setPicking('from')} />
          <TextInput
            value={text}
            onChangeText={setText}
            keyboardType="decimal-pad"
            accessibilityLabel={t('fx.amount')}
            style={{ color: colors.text, fontSize: 34, fontWeight: '800', flex: 1, minWidth: 0, width: '100%', textAlign: 'right', marginLeft: space.md }}
          />
        </Row>

        <Pressable
          accessibilityRole="button"
          onPress={() => {
            setFrom(to);
            setTo(from);
          }}
          style={{ alignSelf: 'center', paddingHorizontal: 16, paddingVertical: 6, minHeight: 44, justifyContent: 'center', borderRadius: radius.pill, backgroundColor: colors.primarySoft }}
        >
          <Text style={{ color: colors.primary, fontWeight: '700' }}>{t('fx.swap')}</Text>
        </Pressable>

        <Row style={{ justifyContent: 'space-between' }}>
          <CurrencyButton value={to} onPress={() => setPicking('to')} />
          <Text style={{ color: colors.primary, fontSize: 34, fontWeight: '800', flexShrink: 1 }} numberOfLines={1} adjustsFontSizeToFit>
            {result === null ? '—' : moneyIn(result, to)}
          </Text>
        </Row>
        {rate !== null ? (
          <Muted style={{ textAlign: 'center' }}>{t('fx.rate', { from, rate: number(rate, 5), to })}</Muted>
        ) : null}
      </Card>

      <Card>
        <H2>{t('fx.inOthers')}</H2>
        {others.map((c) => {
          const v = convert(amount, from, c, rates);
          return (
            <Pressable
              key={c}
              accessibilityRole="button"
              accessibilityLabel={`${i18n.currencyName(c)}: ${v === null ? '—' : moneyIn(v, c)}`}
              onPress={() => setTo(c)}
            >
              <Row style={{ justifyContent: 'space-between', paddingVertical: 4 }}>
                <Row>
                  <Text style={{ fontSize: 20 }}>{currencyFlag(c)}</Text>
                  <Text style={{ color: colors.text, flexShrink: 1 }} numberOfLines={2}>
                    {i18n.currencyName(c)}
                  </Text>
                </Row>
                <Text style={{ color: colors.text, fontWeight: '600' }}>{v === null ? '—' : moneyIn(v, c)}</Text>
              </Row>
            </Pressable>
          );
        })}
      </Card>

      {loading ? (
        <ActivityIndicator color={colors.primary} />
      ) : (
        <Button label={t('fx.refresh')} variant="secondary" onPress={() => refresh().catch(() => {})} />
      )}

      <View style={{ height: space.xl }} />
      <CurrencyPicker
        visible={picking !== null}
        value={picking === 'from' ? from : to}
        onClose={() => setPicking(null)}
        onSelect={(c) => (picking === 'from' ? setFrom(c) : setTo(c))}
      />
    </Screen>
  );
}
