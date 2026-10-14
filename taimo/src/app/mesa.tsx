import * as Linking from 'expo-linking';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Platform, Pressable, Share, Text, View } from 'react-native';

import { claimAmount, claimLink, decodeBill, sharedPart } from '@/domain/table';
import { useI18n } from '@/i18n';
import { webBase } from '@/sync/api';
import { BigButton, Button, Card, Empty, H2, Input, Muted, Row, Screen } from '@/ui/components';
import { PayButtons } from '@/ui/PayButtons';
import { colors, radius, space } from '@/ui/theme';

/** Teléfono de Bizum → número para abrir el chat de WhatsApp de quien pagó. */
function whatsappNumber(bizum?: string): string | null {
  const d = (bizum ?? '').replace(/[^\d+]/g, '').replace(/^00/, '+');
  if (/^[67]\d{8}$/.test(d)) return `34${d}`;
  if (/^\+\d{8,15}$/.test(d)) return d.slice(1);
  return null;
}

/**
 * «Paga tu parte» para quien está en la mesa: se abre al escanear el QR, en el
 * navegador y sin tener Taimo. Toca lo que has tomado, paga y avisa.
 */
export default function Mesa() {
  const params = useLocalSearchParams<{ d?: string }>();
  const { t, moneyIn } = useI18n();
  const bill = useMemo(() => {
    const hash = Platform.OS === 'web' && typeof window !== 'undefined' ? window.location.hash : '';
    return decodeBill(hash.length > 1 ? hash : params.d ?? '');
  }, [params.d]);
  const [name, setName] = useState('');
  const [picked, setPicked] = useState<number[]>([]);
  const [sent, setSent] = useState(false);

  if (!bill) {
    return (
      <Screen>
        <Stack.Screen options={{ headerShown: false }} />
        <Empty emoji="🔗" text={t('plink.broken')} />
        <Button label={t('mesa.goTaimo')} variant="secondary" onPress={() => router.replace('/')} />
      </Screen>
    );
  }

  const money = (c: number) => moneyIn(c, bill.c);
  const shared = new Set(bill.s ?? []);
  const total = bill.i.reduce((s, [, a]) => s + a, 0) + (bill.x ?? 0);
  const onlyTotal = bill.i.length === 0 || bill.i.every((_, i) => shared.has(i));
  const amount = claimAmount(bill, picked);
  const toggle = (i: number) => setPicked((p) => (p.includes(i) ? p.filter((x) => x !== i) : [...p, i]));
  const ready = name.trim().length > 0 && amount > 0;

  async function notify() {
    const link = claimLink(webBase(), { b: bill!.id, w: name.trim(), i: picked, a: amount });
    const message = t('mesa.sentMessage', { name: bill!.t, amount: money(amount), place: bill!.m || '🍽️', link });
    setSent(true);
    if (Platform.OS !== 'web') {
      await Share.share({ message });
      return;
    }
    const phone = whatsappNumber(bill!.p.bizum);
    await Linking.openURL(`https://wa.me/${phone ?? ''}?text=${encodeURIComponent(message)}`);
  }

  return (
    <Screen>
      <Stack.Screen options={{ headerShown: false }} />
      <Text style={{ fontSize: 48, textAlign: 'center' }}>🍽️</Text>
      <Text style={{ color: colors.text, fontSize: 26, fontWeight: '800', textAlign: 'center' }}>{t('mesa.title')}</Text>
      <Muted style={{ textAlign: 'center', fontSize: 17 }}>{t('mesa.paidBy', { name: bill.t, amount: money(total), place: bill.m || '🍽️' })}</Muted>

      <Input label={t('mesa.who')} placeholder={t('mesa.whoPlaceholder')} value={name} onChangeText={setName} autoCapitalize="words" />

      {onlyTotal ? (
        <Card>
          <Text style={{ color: colors.text, fontSize: 18 }}>{t('mesa.equal', { count: bill.n, amount: money(sharedPart(bill)) })}</Text>
        </Card>
      ) : (
        <Card>
          <H2>{t('mesa.tapYours')}</H2>
          {bill.i.map(([item, price], i) =>
            shared.has(i) ? null : (
              <Pressable
                key={i}
                onPress={() => toggle(i)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: picked.includes(i) }}
                style={{
                  minHeight: 56,
                  borderRadius: radius.md,
                  borderWidth: 2,
                  borderColor: picked.includes(i) ? colors.primary : colors.border,
                  backgroundColor: picked.includes(i) ? colors.primarySoft : colors.surface,
                  paddingHorizontal: space.md,
                  justifyContent: 'center',
                }}
              >
                <Row style={{ justifyContent: 'space-between' }}>
                  <Text style={{ color: colors.text, fontSize: 18, flex: 1 }} numberOfLines={2}>
                    {picked.includes(i) ? '✅ ' : '⬜ '}
                    {item}
                  </Text>
                  <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700' }}>{money(price)}</Text>
                </Row>
              </Pressable>
            ),
          )}
          {sharedPart(bill) > 0 ? (
            <Muted style={{ fontSize: 16 }}>
              🤝 {t('mesa.shared', { count: bill.n, amount: money(sharedPart(bill)) })}
              {bill.s?.length ? `: ${bill.s.map((i) => bill.i[i][0]).join(', ')}` : ''}
            </Muted>
          ) : null}
        </Card>
      )}

      <Card style={{ backgroundColor: colors.primarySoft, borderColor: colors.primaryDark, alignItems: 'center' }}>
        <Text style={{ color: colors.textMuted, fontSize: 18 }}>{t('mesa.yourPart')}</Text>
        <Text style={{ color: colors.text, fontSize: 48, fontWeight: '800' }} adjustsFontSizeToFit numberOfLines={1} accessibilityRole="header">
          {money(amount)}
        </Text>
      </Card>

      {amount > 0 ? (
        <View style={{ gap: space.sm }}>
          <H2>{t('mesa.pay', { name: bill.t })}</H2>
          <PayButtons name={bill.t} pay={bill.p} amount={amount} currency={bill.c} />
        </View>
      ) : null}

      {sent ? (
        <Card>
          <Text style={{ color: colors.success, fontSize: 18, textAlign: 'center' }}>{t('mesa.done', { name: bill.t })}</Text>
        </Card>
      ) : null}
      <BigButton emoji="✅" label={t('mesa.notify', { name: bill.t })} onPress={() => (ready ? notify() : undefined)} variant={ready ? 'primary' : 'secondary'} />
      {!ready ? <Muted style={{ textAlign: 'center' }}>{name.trim() ? t('mesa.pickSomething') : t('mesa.needName')}</Muted> : null}

      {Platform.OS === 'web' ? (
        <Card>
          <Text style={{ color: colors.text, fontSize: 16, lineHeight: 22 }}>💚 {t('plink.footer')}</Text>
          <Button label={t('plink.getApp')} variant="ghost" onPress={() => router.replace('/')} />
        </Card>
      ) : null}
    </Screen>
  );
}
