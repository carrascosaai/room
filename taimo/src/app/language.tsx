import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { LANGUAGES, useI18n } from '@/i18n';
import { useStore } from '@/store/store';
import { Button, Card, Screen, Title } from '@/ui/components';
import { colors, space } from '@/ui/theme';

/** Selector de idioma: "Automático" + todos los idiomas, cada uno escrito en su propio idioma. */
export default function LanguagePicker() {
  const { state, dispatch } = useStore();
  const { t } = useI18n();
  const current = state.profile.language ?? 'auto';

  const options: { code: NonNullable<typeof current>; label: string; flag: string }[] = [
    { code: 'auto', label: t('settings.languageAuto'), flag: '📱' },
    ...LANGUAGES.map((l) => ({ code: l.code, label: l.name, flag: l.flag })),
  ];

  return (
    <Screen>
      <Title>{t('settings.language')}</Title>
      <Card style={{ paddingVertical: space.sm, gap: 0 }}>
        {options.map((o, i) => (
          <Pressable
            key={o.code}
            accessibilityRole="radio"
            accessibilityState={{ selected: current === o.code }}
            onPress={() => {
              dispatch({ type: 'setLanguage', language: o.code });
              router.back();
            }}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              gap: space.md,
              paddingVertical: 14,
              borderTopWidth: i === 0 ? 0 : 1,
              borderTopColor: colors.border,
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <Text style={{ fontSize: 22, width: 30 }}>{o.flag || '🌐'}</Text>
            <Text style={{ color: colors.text, fontSize: 17, flex: 1 }}>{o.label}</Text>
            {current === o.code ? <Text style={{ color: colors.primary, fontSize: 18, fontWeight: '700' }}>✓</Text> : null}
          </Pressable>
        ))}
      </Card>
      <View>
        <Button label={t('common.back')} variant="ghost" onPress={() => router.back()} />
      </View>
    </Screen>
  );
}
