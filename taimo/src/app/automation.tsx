import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { AppState as RNAppState, Platform, Switch, Text, View } from 'react-native';

import { hasNotificationAccess, nativeCaptureAvailable, openNotificationAccessSettings } from 'taimo-capture';

import { PAYMENT_APPS } from '@/domain/notifications';
import { useI18n, type TKey } from '@/i18n';
import { ensureNotificationPermission } from '@/notifications/local';
import { useStore } from '@/store/store';
import { Button, Card, H2, Muted, Row, Screen } from '@/ui/components';
import { colors, radius, space } from '@/ui/theme';

const EXAMPLES = 'Google Wallet, Samsung Wallet, PayPal, Revolut, BBVA, Santander, Nubank, Mercado Pago, Chase, Monzo, Paytm, PhonePe, Alipay, M-PESA, SMS';

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
        <Muted>{t('automation.androidText', { apps: EXAMPLES })}</Muted>
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
      <CaptureApps />
    </>
  );
}

/** Apps de las que ya se han apuntado pagos, con opción de ignorarlas. */
function CaptureApps() {
  const { state, dispatch } = useStore();
  const { t } = useI18n();
  const ignored = state.ignoredApps ?? [];
  const seen = new Map<string, { name: string; count: number }>();
  for (const e of state.expenses) {
    if (!e.app) continue;
    const prev = seen.get(e.app);
    seen.set(e.app, { name: PAYMENT_APPS[e.app] ?? e.note?.replace(/^💳 /, '') ?? e.app, count: (prev?.count ?? 0) + 1 });
  }
  for (const app of ignored) if (!seen.has(app)) seen.set(app, { name: PAYMENT_APPS[app] ?? app, count: 0 });
  if (seen.size === 0) return null;
  return (
    <Card>
      <H2>{t('cap.title')}</H2>
      <Muted>{t('cap.hint')}</Muted>
      {[...seen.entries()].map(([app, info]) => {
        const off = ignored.includes(app);
        return (
          <Row key={app} style={{ justifyContent: 'space-between' }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: off ? colors.textMuted : colors.text, fontWeight: '600' }}>{info.name}</Text>
              <Muted>{info.count > 0 ? `⚡ ${info.count}` : ''}</Muted>
            </View>
            <Button label={off ? t('cap.resume') : t('cap.ignore')} variant={off ? 'secondary' : 'ghost'} onPress={() => dispatch({ type: 'toggleIgnoredApp', app })} />
          </Row>
        );
      })}
    </Card>
  );
}

/** iPhone: lo que pasa con la tarjeta de plástico y cómo no perder esos pagos. */
function PlasticCard() {
  const { state, dispatch } = useStore();
  const { t } = useI18n();
  const on = !!state.profile.nightly;
  return (
    <Card style={{ borderColor: colors.warning }}>
      <Row style={{ alignItems: 'flex-start' }}>
        <Text style={{ fontSize: 22 }}>💳</Text>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={{ color: colors.text, fontWeight: '700', fontSize: 17 }}>{t('nightly.cardTitle')}</Text>
          <Text style={{ color: colors.text, fontSize: 16, lineHeight: 22 }}>{t('nightly.cardText')}</Text>
        </View>
      </Row>
      <Row>
        <Text style={{ color: colors.text, flex: 1, fontSize: 16 }}>{t('nightly.toggle')}</Text>
        <Switch
          accessibilityLabel={t('nightly.toggle')}
          value={on}
          onValueChange={async (v) => {
            if (v) await ensureNotificationPermission().catch(() => false);
            dispatch({ type: 'setNightly', on: v });
          }}
          trackColor={{ true: colors.primary, false: colors.border }}
        />
      </Row>
    </Card>
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
          <Card style={{ borderColor: colors.primary }}>
            <Row style={{ alignItems: 'flex-start' }}>
              <Text style={{ fontSize: 22 }}>🎙️</Text>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={{ color: colors.text, fontWeight: '700', fontSize: 16 }}>{t('siri.title')}</Text>
                <Text style={{ color: colors.textMuted, fontSize: 15, lineHeight: 21 }}>{t('siri.text')}</Text>
              </View>
            </Row>
          </Card>
          <Muted>{t('automation.introIos')}</Muted>
          <Card>
            <Row style={{ alignItems: 'flex-start' }}>
              <Text style={{ fontSize: 22 }}>🌍</Text>
              <Text style={{ color: colors.text, flex: 1, fontSize: 15, lineHeight: 21 }}>{t('cap.iosWorld')}</Text>
            </Row>
          </Card>
          <PlasticCard />
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
