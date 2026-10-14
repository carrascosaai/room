import { router, type Href } from 'expo-router';
import { Platform, Pressable, Text, View } from 'react-native';

import { useI18n, type TKey } from '@/i18n';
import { Screen, Title } from '@/ui/components';
import { colors, radius, space } from '@/ui/theme';

const ITEMS: { emoji: string; title: TKey; desc: TKey; href: Href }[] = [
  { emoji: '💬', title: 'asst.title', desc: 'more.askDesc', href: '/assistant' },
  { emoji: '🎯', title: 'goal.title', desc: 'more.goalsDesc', href: '/goals' },
  { emoji: '🏆', title: 'ch.title', desc: 'more.chDesc', href: '/challenges' },
  { emoji: '🛍️', title: 'wish.title', desc: 'more.wishDesc', href: '/wishlist' },
  { emoji: '🧾', title: 'history.title', desc: 'more.historyDesc', href: '/history' },
  { emoji: '💱', title: 'fx.title', desc: 'more.fxDesc', href: '/converter' },
  { emoji: '⚡', title: 'automation.screenTitle', desc: 'more.autoDesc', href: '/automation' },
  { emoji: '⚙️', title: 'settings.title', desc: 'more.settingsDesc', href: '/settings' },
];

/** Todo lo que no es imprescindible, en una lista clara: un toque y una línea que lo explica. */
export default function More() {
  const { t } = useI18n();
  return (
    <Screen>
      <Title>{t('tabs.more')}</Title>
      <View style={{ gap: space.sm }}>
        {ITEMS.filter((i) => Platform.OS !== 'web' || i.href !== '/automation').map((item) => (
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
              <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700' }}>{t(item.title)}</Text>
              <Text style={{ color: colors.textMuted, fontSize: 15 }}>{t(item.desc)}</Text>
            </View>
            <Text style={{ color: colors.primary, fontSize: 26 }}>›</Text>
          </Pressable>
        ))}
      </View>
    </Screen>
  );
}
