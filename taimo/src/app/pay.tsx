import * as Clipboard from 'expo-clipboard';
import * as Linking from 'expo-linking';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Platform, Share, Text, View } from 'react-native';

import { plainAmount } from '@/domain/money';
import { decodePayRequest } from '@/domain/paylink';
import { useI18n } from '@/i18n';
import { webBase } from '@/sync/api';
import { BigButton, Button, Card, Empty, H2, Muted, Row, Screen } from '@/ui/components';
import { handle } from '@/ui/messages';
import { colors, radius, space } from '@/ui/theme';

/**
 * Página que abre quien te debe dinero, normalmente en el navegador y sin
 * tener Taimo. Todo viene en el enlace (después de #): cuánto, por qué y cómo
 * pagar. Pensada para cualquiera: un importe enorme y botones grandes.
 */
export default function Pay() {
  const params = useLocalSearchParams<{ d?: string }>();
  const { t, moneyIn, date } = useI18n();
  const [copied, setCopied] = useState<string | null>(null);
  const req = useMemo(() => {
    const hash = Platform.OS === 'web' && typeof window !== 'undefined' ? window.location.hash : '';
    return decodePayRequest(hash.length > 1 ? hash : params.d ?? '');
  }, [params.d]);

  if (!req) {
    return (
      <Screen>
        <Stack.Screen options={{ headerShown: false }} />
        <Empty emoji="🔗" text={t('plink.broken')} />
        {/* Sin callejones sin salida: en la web lleva a Taimo; en la app, al inicio. */}
        {Platform.OS === 'web' ? (
          <Button label={t('plink.getApp')} onPress={() => Linking.openURL(webBase() || '/')} />
        ) : (
          <Button label={t('common.backHome')} onPress={() => router.replace('/')} />
        )}
      </Screen>
    );
  }

  const amount = moneyIn(req.a, req.c);
  const plain = plainAmount(req.a, req.c).replace('.', req.c === 'EUR' ? ',' : '.');
  const paypal = req.p.paypal ? handle(req.p.paypal) : '';
  const revolut = req.p.revolut ? handle(req.p.revolut) : '';

  async function copy(value: string) {
    await Clipboard.setStringAsync(value).catch(() => {});
    setCopied(value);
  }

  async function paid() {
    const message = t('plink.paidMessage', { amount, group: req!.g });
    if (Platform.OS !== 'web') {
      await Share.share({ message });
      return;
    }
    const nav = typeof navigator !== 'undefined' ? (navigator as Navigator & { share?: (d: { text: string }) => Promise<void> }) : null;
    if (nav?.share) await nav.share({ text: message }).catch(() => {});
    else await Linking.openURL(`https://wa.me/?text=${encodeURIComponent(message)}`);
  }

  return (
    <Screen>
      <Stack.Screen options={{ headerShown: false }} />
      <Text style={{ fontSize: 52, textAlign: 'center' }}>{req.e || '💸'}</Text>

      <Card style={{ backgroundColor: colors.primarySoft, borderColor: colors.primaryDark, alignItems: 'center' }}>
        <Text style={{ color: colors.textMuted, fontSize: 18 }}>{t('plink.owe', { name: req.t })}</Text>
        <Text style={{ color: colors.text, fontSize: 52, fontWeight: '800' }} accessibilityRole="header" adjustsFontSizeToFit numberOfLines={1}>
          {amount}
        </Text>
        {req.g ? <Text style={{ color: colors.text, fontSize: 17 }}>{t('plink.group', { group: req.g })}</Text> : null}
      </Card>

      {req.x?.length ? (
        <Card>
          <H2>{t('plink.why')}</H2>
          {req.x.map(([merchant, share, day], i) => (
            <Row key={i} style={{ justifyContent: 'space-between' }}>
              <Text style={{ color: colors.text, fontSize: 17, flex: 1 }} numberOfLines={1}>
                {merchant}
                {day ? <Text style={{ color: colors.textMuted }}>{` · ${date(day, { day: 'numeric', month: 'short' })}`}</Text> : null}
              </Text>
              <Text style={{ color: colors.text, fontSize: 17 }}>{moneyIn(share, req.c)}</Text>
            </Row>
          ))}
        </Card>
      ) : null}

      <H2>{t('plink.how')}</H2>
      {/* Aviso contra estafas: el enlace lo puede haber hecho cualquiera. */}
      <View
        accessibilityRole="alert"
        style={{ flexDirection: 'row', gap: space.sm, alignItems: 'flex-start', backgroundColor: colors.surface, borderColor: colors.warning, borderWidth: 1.5, borderRadius: radius.md, padding: space.md }}
      >
        <Text style={{ fontSize: 20 }}>🛡️</Text>
        <Text style={{ color: colors.text, fontSize: 17, lineHeight: 24, flex: 1 }}>{t('plink.verify', { name: req.t })}</Text>
      </View>

      {req.p.bizum ? (
        <Card>
          <Text style={{ color: colors.text, fontSize: 22, fontWeight: '800' }}>Bizum · {req.p.bizum}</Text>
          <Text style={{ color: colors.text, fontSize: 17, lineHeight: 24 }}>{t('plink.bizum', { amount })}</Text>
          <Button label={`📋 ${t('plink.copyNumber')}`} onPress={() => copy(req.p.bizum!.replace(/\s+/g, ''))} />
          <Button label={`📋 ${t('plink.copyAmount')} (${plain})`} variant="secondary" onPress={() => copy(plain)} />
        </Card>
      ) : null}

      {paypal ? (
        <BigButton emoji="🅿️" label={t('payx.with', { method: 'PayPal' })} onPress={() => Linking.openURL(`https://paypal.me/${paypal}/${plainAmount(req.a, req.c)}${req.c}`)} />
      ) : null}
      {revolut ? (
        <BigButton emoji="💳" label={t('payx.with', { method: 'Revolut' })} variant="secondary" onPress={() => Linking.openURL(`https://revolut.me/${revolut}`)} />
      ) : null}
      {req.p.iban ? (
        <Card>
          <Text style={{ color: colors.text, fontSize: 17, fontWeight: '700' }}>IBAN</Text>
          <Text selectable style={{ color: colors.text, fontSize: 18, fontVariant: ['tabular-nums'] }}>
            {req.p.iban.toUpperCase().replace(/\s+/g, '').replace(/(.{4})/g, '$1 ').trim()}
          </Text>
          <Muted>{req.t}</Muted>
          <Button label={t('payx.copy', { what: 'IBAN' })} variant="secondary" onPress={() => copy(req.p.iban!.replace(/\s+/g, ''))} />
        </Card>
      ) : null}

      {copied ? (
        <View style={{ backgroundColor: colors.surface, borderRadius: radius.md, padding: space.md }}>
          <Text style={{ color: colors.success, fontSize: 17, textAlign: 'center' }}>
            {t('plink.copied')} {copied}
          </Text>
        </View>
      ) : null}

      <BigButton label={t('plink.paid')} variant="secondary" onPress={paid} />
      <Muted style={{ textAlign: 'center' }}>{t('plink.noApp')}</Muted>

      {Platform.OS === 'web' ? (
        <Card>
          <Text style={{ color: colors.text, fontSize: 16, lineHeight: 22 }}>💚 {t('plink.footer')}</Text>
          <Button label={t('plink.getApp')} variant="ghost" onPress={() => Linking.openURL(webBase() || '/')} />
        </Card>
      ) : null}
    </Screen>
  );
}
