import { router } from 'expo-router';
import { useState } from 'react';
import { Image, Text, View } from 'react-native';

import { CATEGORIES } from '@/domain/categories';
import { formatMoneyShort, parseAmount } from '@/domain/money';
import type { AppState, CategoryId } from '@/domain/types';
import { useStore } from '@/store/store';
import { Button, Card, CategoryBadge, Input, Muted, Row, Screen, Title } from '@/ui/components';
import { colors, space } from '@/ui/theme';

// Valores de partida razonables para alguien joven en España; se pueden cambiar.
const SUGGESTED: Partial<Record<CategoryId, number>> = {
  super: 200,
  comer: 100,
  ocio: 80,
  transporte: 50,
  deporte: 30,
  suscripciones: 25,
  compras: 60,
};

export default function Onboarding() {
  const { dispatch } = useStore();
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [name, setName] = useState('');
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(CATEGORIES.map((c) => [c.id, SUGGESTED[c.id] ? String(SUGGESTED[c.id]) : ''])),
  );

  const budgets: AppState['budgets'] = {};
  for (const c of CATEGORIES) {
    const cents = parseAmount(values[c.id]);
    if (cents) budgets[c.id] = cents;
  }
  const total = Object.values(budgets).reduce<number>((a, b) => a + (b ?? 0), 0);

  if (step === 0) {
    return (
      <Screen scroll={false}>
        <View style={{ minHeight: 640, justifyContent: 'center', gap: space.xl }}>
          <Image
            source={require('../../assets/splash-icon.png')}
            style={{ width: 96, height: 96, alignSelf: 'center' }}
            accessibilityLabel="Taimo"
          />
          <Title>Bienvenido a Taimo</Title>
          <Text style={{ color: colors.textMuted, fontSize: 17, lineHeight: 24 }}>
            Pagas con el móvil y Taimo lo apunta solo. Te dice cuánto te queda en cada cosa y reparte los gastos con tu
            pareja o tu piso.
          </Text>
          <Card>
            <Row>
              <Text style={{ fontSize: 22 }}>🔒</Text>
              <Muted style={{ flex: 1 }}>
                Tus gastos se guardan en tu móvil. No pedimos las claves de tu banco, no vendemos tus datos y no te
                vendemos préstamos.
              </Muted>
            </Row>
          </Card>
          <Button label="Empezar" onPress={() => setStep(1)} />
        </View>
      </Screen>
    );
  }

  if (step === 1) {
    return (
      <Screen>
        <Title>¿Cómo te llamas?</Title>
        <Input placeholder="Tu nombre" value={name} onChangeText={setName} autoFocus autoCapitalize="words" />
        <Button label="Continuar" disabled={!name.trim()} onPress={() => setStep(2)} />
      </Screen>
    );
  }

  return (
    <Screen>
      <Title>¿Cuánto quieres gastar al mes?</Title>
      <Muted>Pon un límite en lo que quieras controlar. Deja en blanco lo que no. Podrás cambiarlo cuando quieras.</Muted>
      <Card>
        {CATEGORIES.map((c) => (
          <Row key={c.id}>
            <CategoryBadge id={c.id} size={36} />
            <Text style={{ color: colors.text, flex: 1, fontSize: 16 }}>{c.label}</Text>
            <View style={{ width: 110 }}>
              <Input
                value={values[c.id]}
                onChangeText={(t) => setValues((v) => ({ ...v, [c.id]: t }))}
                keyboardType="decimal-pad"
                placeholder="—"
                style={{ textAlign: 'right', paddingVertical: 10 }}
              />
            </View>
            <Muted>€</Muted>
          </Row>
        ))}
      </Card>
      <Muted>Total al mes: {formatMoneyShort(total)}</Muted>
      <Button
        label="Listo"
        onPress={() => {
          dispatch({ type: 'completeOnboarding', name: name.trim(), budgets });
          router.replace('/');
        }}
      />
    </Screen>
  );
}
