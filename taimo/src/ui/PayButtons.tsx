import * as Clipboard from 'expo-clipboard';
import * as Linking from 'expo-linking';
import { useState } from 'react';
import { View } from 'react-native';

import { plainAmount } from '@/domain/money';
import type { Cents, PaymentInfo } from '@/domain/types';
import { useI18n } from '@/i18n';

import { Button, Muted } from './components';
import { handle } from './messages';
import { space } from './theme';

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
      {pay?.bizum ? <Button label={t('payx.copy', { what: `Bizum ${pay.bizum}` })} variant="secondary" onPress={() => copy('Bizum', pay.bizum!)} /> : null}
      {pay?.iban ? <Button label={t('payx.copy', { what: 'IBAN' })} variant="secondary" onPress={() => copy('IBAN', pay.iban!.replace(/\s+/g, ''))} /> : null}
      {copied ? <Muted>{copied}</Muted> : null}
    </View>
  );
}
