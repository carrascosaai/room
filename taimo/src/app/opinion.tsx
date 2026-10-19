import Constants from 'expo-constants';
import * as Linking from 'expo-linking';
import { useState } from 'react';
import { Platform, Pressable, Share, Switch, Text, View } from 'react-native';

import { captureStatus, hasNotificationAccess, nativeCaptureAvailable } from 'taimo-capture';

import { useI18n } from '@/i18n';
import { useStore } from '@/store/store';
import { BigButton, Card, H2, Input, Muted, Row, Screen } from '@/ui/components';
import { colors, radius, space } from '@/ui/theme';

/** A dónde llegan las opiniones (se pone al compilar). Sin número, se elige con quién compartir. */
const FEEDBACK_WHATSAPP = (process.env.EXPO_PUBLIC_FEEDBACK_WHATSAPP ?? '').replace(/[^\d]/g, '');

/** Número de compilación del APK de pruebas («7-ab12cd3»), si lo hay. */
const BUILD = (process.env.EXPO_PUBLIC_BUILD ?? '').slice(0, 12);

const FACES = ['😞', '😐', '🙂', '😍'] as const;

/**
 * «Danos tu opinión»: una cara, qué mejorarías y, si quieres, datos del móvil
 * (nunca importes ni gastos). Se manda por WhatsApp o lo que elijas.
 */
export default function Opinion() {
  const { state } = useStore();
  const { t, locale } = useI18n();
  const [face, setFace] = useState<number | null>(null);
  const [text, setText] = useState('');
  const [withInfo, setWithInfo] = useState(true);
  const [sent, setSent] = useState(false);

  function deviceInfo(): string {
    const status = captureStatus();
    const lines = [
      `Taimo ${Constants.expoConfig?.version ?? '?'}${BUILD ? ` (${BUILD})` : ''} · ${Platform.OS} ${String(Platform.Version)}`,
      `${t('opinion.infoLanguage')}: ${locale} · ${state.profile.currency}`,
      `${t('opinion.infoExpenses')}: ${state.expenses.length} · ${t('opinion.infoGroups')}: ${state.groups.length}`,
    ];
    if (Platform.OS === 'android' && nativeCaptureAvailable) {
      const seen = status?.seenAt ? new Date(status.seenAt).toISOString().slice(0, 16).replace('T', ' ') : '—';
      lines.push(`${t('opinion.infoCapture')}: ${hasNotificationAccess() ? '✓' : '✗'} · ${seen}`);
    }
    return lines.join('\n');
  }

  async function send() {
    const parts = [`${t('opinion.title')} ${face !== null ? FACES[face] : ''}`.trim(), text.trim()];
    if (withInfo) parts.push(`—\n${deviceInfo()}`);
    const message = parts.filter(Boolean).join('\n\n');
    setSent(true);
    if (FEEDBACK_WHATSAPP) {
      const url = `https://wa.me/${FEEDBACK_WHATSAPP}?text=${encodeURIComponent(message)}`;
      if (await Linking.openURL(url).then(() => true, () => false)) return;
    }
    await Share.share({ message }).catch(() => {});
  }

  const ready = face !== null || text.trim().length > 0;

  return (
    <Screen>
      <Text style={{ color: colors.text, fontSize: 24, fontWeight: '800' }}>{t('opinion.title')}</Text>
      <Muted>{t('opinion.intro')}</Muted>

      <Card>
        <H2>{t('opinion.how')}</H2>
        <Row style={{ justifyContent: 'space-between' }}>
          {FACES.map((f, i) => (
            <Pressable
              key={f}
              onPress={() => setFace(i)}
              accessibilityRole="radio"
              accessibilityState={{ selected: face === i }}
              accessibilityLabel={t(`opinion.face${i}` as 'opinion.face0')}
              style={{
                flex: 1,
                minHeight: 64,
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: radius.md,
                borderWidth: 2,
                borderColor: face === i ? colors.primary : 'transparent',
                backgroundColor: face === i ? colors.primarySoft : 'transparent',
              }}
            >
              <Text style={{ fontSize: 36 }}>{f}</Text>
            </Pressable>
          ))}
        </Row>
      </Card>

      <Input label={t('opinion.what')} placeholder={t('opinion.whatPlaceholder')} value={text} onChangeText={setText} multiline />

      <Card>
        <Row style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600' }}>{t('opinion.withInfo')}</Text>
            <Muted>{t('opinion.withInfoHint')}</Muted>
          </View>
          <Switch value={withInfo} onValueChange={setWithInfo} accessibilityLabel={t('opinion.withInfo')} />
        </Row>
        {withInfo ? (
          <View style={{ backgroundColor: colors.surfaceAlt, borderRadius: radius.md, padding: space.sm }}>
            <Text style={{ color: colors.textMuted, fontSize: 13 }}>{deviceInfo()}</Text>
          </View>
        ) : null}
      </Card>

      <BigButton emoji="💬" label={t('opinion.send')} onPress={() => (ready ? send() : undefined)} variant={ready ? 'primary' : 'secondary'} />
      {sent ? <Text style={{ color: colors.success, fontSize: 17, textAlign: 'center' }}>{t('opinion.thanks')}</Text> : null}
    </Screen>
  );
}
