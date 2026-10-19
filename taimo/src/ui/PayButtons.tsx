import * as Clipboard from 'expo-clipboard';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { plainAmount } from '@/domain/money';
import type { Cents, PaymentInfo } from '@/domain/types';
import { useI18n } from '@/i18n';

import { Button, Muted, useFontScale } from './components';
import { handle } from './messages';
import { colors, space } from './theme';

/** Enlace pequeño justo antes de mandar dinero: «¿Dudas? Comprueba antes de pagar». */
export function CheckFirstLink() {
  const { t } = useI18n();
  const fs = useFontScale();
  return (
    <Pressable accessibilityRole="link" onPress={() => router.push('/comprueba')} style={{ minHeight: 44, justifyContent: 'center', paddingVertical: space.xs }}>
      <Text style={{ color: colors.primary, fontSize: fs(16), fontWeight: '700', textAlign: 'center', textDecorationLine: 'underline' }}>🛡️ {t('scam.doubts')}</Text>
    </Pressable>
  );
}

/**
 * Pagar una deuda en un toque con lo que la otra persona ha compartido:
 * PayPal y Revolut se abren con el importe; Bizum e IBAN se copian.
 */
export function PayButtons({ name, pay, amount, currency }: { name: string; pay?: PaymentInfo; amount: Cents; currency: string }) {
  const { t } = useI18n();
  const [copied, setCopied] = useState<string | null>(null);
  const copy = async (label: string, value: string) => {
    await Clipboard.setStringAsync(value).catch(() => {});
    setCopied(t('payx.copied', { what: label }));
  };
  const paypal = pay?.paypal ? handle(pay.paypal) : '';
  const revolut = pay?.revolut ? handle(pay.revolut) : '';
  if (!paypal && !revolut && !pay?.bizum && !pay?.iban) return <Muted>{t('payx.noInfo', { name })}</Muted>;
  return (
    <View style={{ gap: space.sm }}>
      {paypal ? (
        <Button label={t('payx.with', { method: 'PayPal' })} onPress={() => Linking.openURL(`https://paypal.me/${paypal}/${plainAmount(amount, currency)}${currency}`)} />
      ) : null}
      {revolut ? <Button label={t('payx.with', { method: 'Revolut' })} onPress={() => Linking.openURL(`https://revolut.me/${revolut}`)} /> : null}
      {/* Bizum no tiene enlaces de pago entre personas: número e importe listos para pegar en la app del banco. */}
      {pay?.bizum ? (
        <View style={{ gap: space.xs, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: space.sm }}>
          <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800' }}>Bizum · {pay.bizum}</Text>
          <Button label={`📋 ${t('plink.copyNumber')}`} variant="secondary" onPress={() => copy('Bizum', pay.bizum!.replace(/\s+/g, ''))} />
          {amount > 0 ? (
            <Button
              label={`📋 ${t('plink.copyAmount')} (${plainAmount(amount, currency).replace('.', currency === 'EUR' ? ',' : '.')})`}
              variant="secondary"
              onPress={() => copy(t('plink.copyAmount'), plainAmount(amount, currency).replace('.', currency === 'EUR' ? ',' : '.'))}
            />
          ) : null}
        </View>
      ) : null}
      {pay?.iban ? <Button label={t('payx.copy', { what: 'IBAN' })} variant="secondary" onPress={() => copy('IBAN', pay.iban!.replace(/\s+/g, ''))} /> : null}
      {copied ? <Muted>{copied}</Muted> : null}
      <CheckFirstLink />
    </View>
  );
}
