import { router, type Href } from 'expo-router';
import { Platform, Pressable, Text, View } from 'react-native';

import { isRecapSeason } from '@/domain/yearRecap';
import { useI18n, type TKey } from '@/i18n';
import { useStore } from '@/store/store';
import { Screen, Title, useFontScale } from '@/ui/components';
import { colors, radius, space } from '@/ui/theme';

type Item = { emoji: string; title: TKey; desc: TKey; href: Href };

/** En modo sencillo no hay pestañas de Grupos ni Resumen: están aquí arriba. */
const SIMPLE_ITEMS: Item[] = [
  { emoji: '👥', title: 'tabs.groups', desc: 'simple.groupsDesc', href: '/groups' },
  { emoji: '📊', title: 'tabs.stats', desc: 'simple.statsDesc', href: '/stats' },
];

/** «Tu año en Taimo»: siempre en la lista; en diciembre y enero, arriba del todo. */
const YEAR_ITEM: Item = { emoji: '✨', title: 'year.moreTitle', desc: 'year.moreDesc', href: '/tu-ano' };

const ITEMS: Item[] = [
  { emoji: '🛡️', title: 'scam.title', desc: 'scam.moreDesc', href: '/comprueba' },
  { emoji: '💸', title: 'back.title', desc: 'back.desc', href: '/devuelve' },
  { emoji: '📅', title: 'cal.title', desc: 'cal.moreDesc', href: '/calendario' },
  { emoji: '💶', title: 'cash.title', desc: 'cash.moreDesc', href: '/monedero' },
  { emoji: '👀', title: 'rev.title', desc: 'rev.moreDesc', href: '/revisar' },
  { emoji: '💬', title: 'asst.title', desc: 'more.askDesc', href: '/assistant' },
  { emoji: '🎯', title: 'goal.title', desc: 'more.goalsDesc', href: '/goals' },
  { emoji: '🐷', title: 'roll.title', desc: 'roll.moreDesc', href: { pathname: '/goals', params: { roll: '1' } } },
  { emoji: '🏆', title: 'ch.title', desc: 'more.chDesc', href: '/challenges' },
  { emoji: '🧒', title: 'kids.title', desc: 'kids.moreDesc', href: '/paga' },
  YEAR_ITEM,
  { emoji: '🛍️', title: 'wish.title', desc: 'more.wishDesc', href: '/wishlist' },
  { emoji: '🧾', title: 'history.title', desc: 'more.historyDesc', href: '/history' },
  { emoji: '💱', title: 'fx.title', desc: 'more.fxDesc', href: '/converter' },
  { emoji: '⚡', title: 'automation.screenTitle', desc: 'more.autoDesc', href: '/automation' },
  { emoji: '⚙️', title: 'settings.title', desc: 'more.settingsDesc', href: '/settings' },
];

/** Todo lo que no es imprescindible, en una lista clara: un toque y una línea que lo explica. */
export default function More() {
  const { t } = useI18n();
  const { state } = useStore();
  const fs = useFontScale();
  const base = isRecapSeason() ? [YEAR_ITEM, ...ITEMS.filter((i) => i !== YEAR_ITEM)] : ITEMS;
  const items = state.profile.simple ? [...SIMPLE_ITEMS, ...base] : base;
  return (
    <Screen>
      <Title>{t('tabs.more')}</Title>
      <View style={{ gap: space.sm }}>
        {items.filter((i) => Platform.OS !== 'web' || i.href !== '/automation').map((item) => (
          <Pressable
            key={item.title}
            onPress={() => router.push(item.href)}
            accessibilityRole="button"
            accessibilityLabel={`${t(item.title)}. ${t(item.desc)}`}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              gap: space.md,
              minHeight: 72,
              paddingHorizontal: space.lg,
              paddingVertical: space.md,
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderWidth: 1,
              borderRadius: radius.lg,
              opacity: pressed ? 0.75 : 1,
            })}
          >
            <Text style={{ fontSize: 28 }}>{item.emoji}</Text>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={{ color: colors.text, fontSize: fs(18), fontWeight: '700' }}>{t(item.title)}</Text>
              <Text style={{ color: colors.textMuted, fontSize: fs(15) }}>{t(item.desc)}</Text>
            </View>
            <Text style={{ color: colors.primary, fontSize: 26 }}>›</Text>
          </Pressable>
        ))}
      </View>
    </Screen>
  );
}
