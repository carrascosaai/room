import { router } from 'expo-router';
import { useState } from 'react';
import { Image, Pressable, Text, View } from 'react-native';

import { downloadBackup, type SignedIn } from '@/auth/auth';
import { CATEGORIES } from '@/domain/categories';
import { parseAmount } from '@/domain/money';
import type { AppState, CategoryId } from '@/domain/types';
import { rateBetween } from '@/fx/fx';
import { deviceCurrency, LANGUAGES, useI18n, type CurrencyCode } from '@/i18n';
import { useStore } from '@/store/store';
import { AuthButtons } from '@/ui/AuthButtons';
import { Button, Card, CategoryBadge, Input, Muted, Row, Screen, Title } from '@/ui/components';
import { CurrencyButton, CurrencyPicker } from '@/ui/CurrencyPicker';
import { colors, radius, space } from '@/ui/theme';

// Valores de partida en euros; se pasan a la moneda elegida y se pueden cambiar.
const SUGGESTED: Partial<Record<CategoryId, number>> = {
  super: 200,
  comer: 100,
  ocio: 80,
  transporte: 50,
  deporte: 30,
  suscripciones: 25,
  compras: 60,
};

/**
 * Sugerencia en la moneda elegida: el importe en euros convertido con los tipos
 * de cambio guardados y redondeado a 2 cifras (200 € -> 32 000 ¥, 220 $…).
 * Si no hay tipo de cambio para esa moneda, se deja en blanco.
 */
function suggestedFor(category: CategoryId, currency: string): string {
  const eur = SUGGESTED[category];
  if (!eur) return '';
  const rate = rateBetween('EUR', currency);
  if (!rate) return '';
  return String(Number((eur * rate).toPrecision(2)));
}

function LanguageChip() {
  const { lang } = useI18n();
  const l = LANGUAGES.find((x) => x.code === lang)!;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push('/language')}
      style={{
        alignSelf: 'flex-end',
        flexDirection: 'row',
        gap: 6,
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: radius.pill,
        backgroundColor: colors.surfaceAlt,
        borderWidth: 1,
        borderColor: colors.border,
      }}
    >
      <Text style={{ fontSize: 16 }}>{l.flag || '🌐'}</Text>
      <Text style={{ color: colors.text, fontSize: 15 }}>{l.name}</Text>
      <Text style={{ color: colors.textMuted }}>▾</Text>
    </Pressable>
  );
}

export default function Onboarding() {
  const { dispatch } = useStore();
  const { t, locale, currencyName } = useI18n();
  const [step, setStep] = useState<'welcome' | 'account' | 'name' | 'budget'>('welcome');
  const [name, setName] = useState('');
  const [currency, setCurrency] = useState<CurrencyCode>(deviceCurrency());
  const [picking, setPicking] = useState(false);
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(CATEGORIES.map((c) => [c.id, suggestedFor(c.id, currency)])),
  );
  // Los importes que la persona ya ha cambiado no se tocan al cambiar de moneda.
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  function changeCurrency(code: CurrencyCode) {
    setCurrency(code);
    setValues((prev) => Object.fromEntries(CATEGORIES.map((c) => [c.id, touched[c.id] ? prev[c.id] : suggestedFor(c.id, code)])));
  }

  const budgets: AppState['budgets'] = {};
  for (const c of CATEGORIES) {
    const cents = parseAmount(values[c.id]);
    if (cents) budgets[c.id] = cents;
  }
  const total = Object.values(budgets).reduce<number>((a, b) => a + (b ?? 0), 0);
  const totalLabel = new Intl.NumberFormat(locale, { style: 'currency', currency, maximumFractionDigits: 0 }).format(total / 100);

  async function afterSignIn(result: SignedIn) {
    // Si ya tenía una copia (otro móvil), la recuperamos y listo.
    const backup = await downloadBackup().catch(() => null);
    if (backup) {
      dispatch({ type: 'restoreBackup', state: backup.data });
      router.replace('/');
      return;
    }
    if (result.name) setName(result.name);
    setStep('name');
  }

  if (step === 'welcome') {
    return (
      <Screen>
        <LanguageChip />
        {/* Con scroll: con letra grande el botón nunca queda fuera de la pantalla. */}
        <View style={{ justifyContent: 'center', gap: space.xl, paddingTop: space.xl }}>
          <Image source={require('../../assets/splash-icon.png')} style={{ width: 96, height: 96, alignSelf: 'center' }} accessibilityLabel="Taimo" />
          <Title>{t('onboarding.welcomeTitle')}</Title>
          <Text style={{ color: colors.textMuted, fontSize: 17, lineHeight: 24 }}>{t('onboarding.welcomeText')}</Text>
          <Card>
            <Row>
              <Text style={{ fontSize: 22 }}>🔒</Text>
              <Muted style={{ flex: 1 }}>{t('onboarding.privacy')}</Muted>
            </Row>
          </Card>
          <Button label={t('onboarding.start')} onPress={() => setStep('account')} />
        </View>
      </Screen>
    );
  }

  if (step === 'account') {
    return (
      <Screen>
        <View style={{ minHeight: 560, justifyContent: 'center', gap: space.xl }}>
          <Title>{t('auth.title')}</Title>
          <Muted style={{ fontSize: 16, lineHeight: 22 }}>{t('auth.text')}</Muted>
          <AuthButtons onSignedIn={afterSignIn} />
          <Button label={t('auth.skip')} variant="ghost" onPress={() => setStep('name')} />
          <Button label={t('common.back')} variant="ghost" onPress={() => setStep('welcome')} />
        </View>
      </Screen>
    );
  }

  if (step === 'name') {
    return (
      <Screen>
        <Title>{t('onboarding.nameTitle')}</Title>
        <Input placeholder={t('onboarding.namePlaceholder')} value={name} onChangeText={setName} autoFocus autoCapitalize="words" />
        <Button label={t('common.continue')} disabled={!name.trim()} onPress={() => setStep('budget')} />
        <Button label={t('common.back')} variant="ghost" onPress={() => setStep('account')} />
      </Screen>
    );
  }

  return (
    <Screen>
      <Title>{t('onboarding.budgetTitle')}</Title>
      <Muted>{t('onboarding.budgetText')}</Muted>
      <View style={{ gap: space.sm }}>
        <Muted>{t('onboarding.currency')}</Muted>
        <Row>
          <CurrencyButton value={currency} onPress={() => setPicking(true)} />
          <Muted style={{ flex: 1 }}>{currencyName(currency)}</Muted>
        </Row>
      </View>
      <Card>
        {CATEGORIES.map((c) => (
          <Row key={c.id}>
            <CategoryBadge id={c.id} size={36} />
            <Text style={{ color: colors.text, flex: 1, fontSize: 16 }}>{t(`cat.${c.id}`)}</Text>
            <View style={{ width: 110 }}>
              <Input
                value={values[c.id]}
                onChangeText={(v) => {
                  setValues((prev) => ({ ...prev, [c.id]: v }));
                  setTouched((prev) => ({ ...prev, [c.id]: true }));
                }}
                accessibilityLabel={`${t(`cat.${c.id}`)} (${currency})`}
                keyboardType="decimal-pad"
                placeholder="—"
                style={{ textAlign: 'right', paddingVertical: 10 }}
              />
            </View>
            <Muted style={{ width: 40 }}>{currency}</Muted>
          </Row>
        ))}
      </Card>
      <Muted>{t('onboarding.total', { amount: totalLabel })}</Muted>
      <Button
        label={t('onboarding.finish')}
        onPress={() => {
          dispatch({ type: 'completeOnboarding', name: name.trim(), budgets, currency });
          router.replace('/');
        }}
      />
      <Button label={t('common.back')} variant="ghost" onPress={() => setStep('name')} />
      <CurrencyPicker visible={picking} value={currency} onClose={() => setPicking(false)} onSelect={changeCurrency} />
    </Screen>
  );
}
