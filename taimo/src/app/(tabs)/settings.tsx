import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Platform, Text, View } from 'react-native';

import { totalBudget } from '@/domain/budget';
import { CATEGORIES } from '@/domain/categories';
import { formatMoney, parseAmount } from '@/domain/money';
import { useStore } from '@/store/store';
import { Button, Card, CategoryBadge, H2, Input, Muted, Row, Screen, Title } from '@/ui/components';
import { colors, space } from '@/ui/theme';

export default function Settings() {
  const { state, dispatch } = useStore();
  const [name, setName] = useState(state.profile.name);
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(
      CATEGORIES.map((c) => [c.id, state.budgets[c.id] ? String((state.budgets[c.id]! / 100).toFixed(0)) : '']),
    ),
  );

  function reset() {
    const doIt = () => {
      dispatch({ type: 'reset' });
      router.replace('/onboarding');
    };
    const msg = '¿Borrar todos tus datos de este móvil? No se puede deshacer.';
    if (Platform.OS === 'web') {
      if (globalThis.confirm?.(msg)) doIt();
    } else {
      Alert.alert(msg, undefined, [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Borrar todo', style: 'destructive', onPress: doIt },
      ]);
    }
  }

  return (
    <Screen>
      <Title>Ajustes</Title>

      <Card>
        <H2>Tu nombre</H2>
        <Input value={name} onChangeText={setName} onBlur={() => dispatch({ type: 'setProfileName', name: name.trim() })} />
      </Card>

      <Card>
        <H2>Presupuesto mensual</H2>
        <Muted>Total: {formatMoney(totalBudget(state.budgets))}</Muted>
        {CATEGORIES.map((c) => (
          <Row key={c.id}>
            <CategoryBadge id={c.id} size={32} />
            <Text style={{ color: colors.text, flex: 1 }}>{c.label}</Text>
            <View style={{ width: 100 }}>
              <Input
                value={values[c.id]}
                keyboardType="decimal-pad"
                placeholder="—"
                style={{ textAlign: 'right', paddingVertical: 8 }}
                onChangeText={(t) => setValues((v) => ({ ...v, [c.id]: t }))}
                onBlur={() => dispatch({ type: 'setBudget', category: c.id, amount: parseAmount(values[c.id]) ?? 0 })}
              />
            </View>
            <Muted>€</Muted>
          </Row>
        ))}
      </Card>

      <Button label="⚡ Registro automático con Apple Pay" variant="secondary" onPress={() => router.push('/automation')} />

      <Card>
        <H2>Privacidad</H2>
        <Muted>
          Todo se guarda solo en este móvil. Taimo no pide las claves de tu banco, no vende tus datos y no ofrece
          préstamos.
        </Muted>
      </Card>

      <View style={{ gap: space.sm }}>
        <Button label="Borrar todos mis datos" variant="danger" onPress={reset} />
        <Muted style={{ textAlign: 'center' }}>Taimo · versión de prueba</Muted>
      </View>
    </Screen>
  );
}
