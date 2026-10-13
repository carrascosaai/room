import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { AppState as RNAppState, Platform, Text, View } from 'react-native';

import { hasNotificationAccess, nativeCaptureAvailable, openNotificationAccessSettings } from 'taimo-capture';

import { PAYMENT_APPS } from '@/domain/notifications';
import { useI18n, type TKey } from '@/i18n';
import { ensureNotificationPermission } from '@/notifications/local';
import { Button, Card, H2, Muted, Row, Screen } from '@/ui/components';
import { colors, radius, space } from '@/ui/theme';

const CAPTURE_URL = 'taimo://capture?amount=[Amount]&merchant=[Merchant]&card=[Card]';

const STEPS_INTENT: TKey[] = [
  'automation.stepIntent1',
  'automation.stepIntent2',
  'automation.stepIntent3',
  'automation.stepIntent4',
  'automation.stepIntent5',
  'automation.stepIntent6',
];
const STEPS_URL: TKey[] = ['automation.stepUrl1', 'automation.stepUrl2', 'automation.stepUrl3', 'automation.stepUrl4'];

function Steps({ steps }: { steps: TKey[] }) {
  const { t } = useI18n();
  return (
    <Card>
      {steps.map((s, i) => (
        <Row key={s} style={{ alignItems: 'flex-start' }}>
          <View
            style={{
              width: 26,
              height: 26,
              borderRadius: 13,
              backgroundColor: colors.primary,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ color: colors.onPrimary, fontWeight: '700' }}>{i + 1}</Text>
          </View>
          <Text style={{ color: colors.text, flex: 1, fontSize: 15, lineHeight: 21 }}>{t(s)}</Text>
        </Row>
      ))}
    </Card>
  );
}

function AndroidSetup() {
  const { t } = useI18n();
  const [enabled, setEnabled] = useState(hasNotificationAccess());
  useEffect(() => {
    const sub = RNAppState.addEventListener('change', (s) => {
      if (s === 'active') setEnabled(hasNotificationAccess());
    });
    return () => sub.remove();
  }, []);

  if (!nativeCaptureAvailable) {
    return (
      <Card>
        <Muted>{t('automation.androidNeedsApp')}</Muted>
      </Card>
    );
  }

  return (
    <>
      <Card style={{ borderColor: enabled ? colors.success : colors.border }}>
        <H2>{enabled ? t('automation.androidEnabled') : t('automation.androidWhat')}</H2>
        <Muted>{t('automation.androidText', { apps: Object.values(PAYMENT_APPS).join(', ') })}</Muted>
      </Card>
      {!enabled ? (
        <Button
          label={t('automation.androidGrant')}
          onPress={async () => {
            await ensureNotificationPermission();
            openNotificationAccessSettings();
          }}
        />
      ) : null}
      <Muted>{t('automation.androidHint')}</Muted>
    </>
  );
}

export default function Automation() {
  const { t } = useI18n();
  const isAndroid = Platform.OS === 'android';
  return (
    <Screen>
      <Text style={{ color: colors.text, fontSize: 24, fontWeight: '700' }}>
        {isAndroid ? t('automation.titleAndroid') : t('automation.titleIos')}
      </Text>

      {isAndroid ? (
        <AndroidSetup />
      ) : (
        <>
          <Muted>{t('automation.introIos')}</Muted>
          {nativeCaptureAvailable ? <Steps steps={STEPS_INTENT} /> : null}
          {nativeCaptureAvailable ? <H2>{t('automation.fallbackTitle')}</H2> : null}
          <Steps steps={STEPS_URL} />
          <View style={{ backgroundColor: colors.surfaceAlt, borderRadius: radius.md, padding: space.md }}>
            <Text selectable style={{ color: colors.primary, fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }) }}>
              {CAPTURE_URL}
            </Text>
          </View>
          <Button label={t('automation.openShortcuts')} onPress={() => Linking.openURL('shortcuts://').catch(() => {})} />
          <Button label={t('automation.allowNotifications')} variant="secondary" onPress={() => ensureNotificationPermission().catch(() => {})} />
        </>
      )}

      <Button
        label={t('automation.tryExample')}
        variant="secondary"
        onPress={() => router.push({ pathname: '/capture', params: { amount: '12.40', merchant: 'Mercadona', card: 'Demo' } })}
      />
      <Muted>{t('automation.footer')}</Muted>
    </Screen>
  );
}
