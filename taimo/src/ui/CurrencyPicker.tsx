import { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { countryIndex, searchCurrencies } from '@/fx/countries';
import { WORLD_CURRENCIES } from '@/fx/currencies';
import { CURRENCIES, useI18n } from '@/i18n';
import { useStore } from '@/store/store';

import { colors, radius, space } from './theme';

const FLAGS = new Map(WORLD_CURRENCIES.map(([code, , flag]) => [code, flag]));

export function currencyFlag(code: string): string {
  return FLAGS.get(code) ?? '🏳️';
}


/** Botón compacto "🇯🇵 JPY ▾" que abre el selector. */
export function CurrencyButton({ value, onPress }: { value: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${value} ▾`}
      onPress={onPress}
      style={{
        minHeight: 44,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: radius.pill,
        backgroundColor: colors.surfaceAlt,
        borderWidth: 1,
        borderColor: colors.border,
      }}
    >
      <Text style={{ fontSize: 16 }}>{currencyFlag(value)}</Text>
      <Text style={{ color: colors.text, fontWeight: '700' }}>{value}</Text>
      <Text style={{ color: colors.textMuted }}>▾</Text>
    </Pressable>
  );
}

type Row = { type: 'header'; title: string } | { type: 'currency'; code: string };

/**
 * Selector de moneda a pantalla completa: buscador (por código, nombre en tu
 * idioma o en inglés), recientes, populares y las 155 monedas del mundo.
 */
export function CurrencyPicker({
  visible,
  value,
  onSelect,
  onClose,
}: {
  visible: boolean;
  value?: string;
  onSelect: (code: string) => void;
  onClose: () => void;
}) {
  const { t, currencyName, locale } = useI18n();
  const { state, dispatch } = useStore();
  const [query, setQuery] = useState('');
  const countries = useMemo(() => countryIndex(locale), [locale]);

  const rows = useMemo<Row[]>(() => {
    // Se busca por código, por nombre de la moneda y por país («Japón», «Alemania»).
    if (query.trim()) return searchCurrencies(query, currencyName, countries).map((code) => ({ type: 'currency', code }));
    const recent = state.recentCurrencies ?? [];
    const out: Row[] = [];
    if (recent.length) {
      out.push({ type: 'header', title: t('fx.recent') });
      recent.forEach((code) => out.push({ type: 'currency', code }));
    }
    out.push({ type: 'header', title: t('fx.popular') });
    CURRENCIES.filter((c) => !recent.includes(c)).forEach((code) => out.push({ type: 'currency', code }));
    out.push({ type: 'header', title: t('fx.all') });
    WORLD_CURRENCIES.forEach(([code]) => out.push({ type: 'currency', code }));
    return out;
  }, [query, state.recentCurrencies, t, currencyName, countries]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} presentationStyle="pageSheet">
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top', 'bottom']}>
        <View style={{ padding: space.lg, gap: space.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ color: colors.text, fontSize: 22, fontWeight: '700' }}>{t('fx.choose')}</Text>
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel={t('common.cancel')}
              style={{ minHeight: 44, minWidth: 44, justifyContent: 'center', paddingHorizontal: space.sm }}
            >
              <Text style={{ color: colors.primary, fontSize: 17 }}>{t('common.cancel')}</Text>
            </Pressable>
          </View>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={t('fx.search')}
            accessibilityLabel={t('fx.search')}
            placeholderTextColor={colors.textFaint}
            autoCorrect={false}
            style={{
              backgroundColor: colors.surfaceAlt,
              borderRadius: radius.md,
              paddingHorizontal: space.lg,
              paddingVertical: 12,
              color: colors.text,
              fontSize: 16,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          />
        </View>
        <FlatList
          data={rows}
          keyExtractor={(r, i) => (r.type === 'header' ? `h-${r.title}` : `${r.code}-${i}`)}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingHorizontal: space.lg, paddingBottom: 40 }}
          renderItem={({ item }) =>
            item.type === 'header' ? (
              <Text style={{ color: colors.textMuted, fontSize: 15, marginTop: space.md, marginBottom: space.xs, textTransform: 'uppercase' }}>
                {item.title}
              </Text>
            ) : (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${item.code}, ${currencyName(item.code)}`}
                accessibilityState={{ selected: value === item.code }}
                onPress={() => {
                  dispatch({ type: 'useCurrency', currency: item.code });
                  onSelect(item.code);
                  setQuery('');
                  onClose();
                }}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: space.md,
                  paddingVertical: 12,
                  borderBottomWidth: 1,
                  borderBottomColor: colors.border,
                  opacity: pressed ? 0.6 : 1,
                })}
              >
                <Text style={{ fontSize: 22, width: 30 }}>{currencyFlag(item.code)}</Text>
                <Text style={{ color: colors.text, fontWeight: '700', width: 48 }}>{item.code}</Text>
                <Text style={{ color: colors.textMuted, flex: 1 }} numberOfLines={1}>
                  {currencyName(item.code)}
                </Text>
                {value === item.code ? <Text style={{ color: colors.primary, fontWeight: '700' }}>✓</Text> : null}
              </Pressable>
            )
          }
        />
      </SafeAreaView>
    </Modal>
  );
}
