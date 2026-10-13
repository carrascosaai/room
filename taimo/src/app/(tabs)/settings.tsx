import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import { router } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useState } from 'react';
import { Alert, Platform, Text, View } from 'react-native';

import { totalBudget } from '@/domain/budget';
import { CATEGORIES } from '@/domain/categories';
import { expensesToCsv, isAlreadyImported, parseBankCsv } from '@/domain/csv';
import { formatMoney, parseAmount } from '@/domain/money';
import { ensureNotificationPermission } from '@/notifications/local';
import { newId, useStore } from '@/store/store';
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

  const [csvMessage, setCsvMessage] = useState<string | null>(null);

  async function exportCsv() {
    const csv = expensesToCsv(state.expenses, state.groups);
    const name = `taimo-gastos-${new Date().toISOString().slice(0, 10)}.csv`;
    if (Platform.OS === 'web') {
      const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      a.click();
      URL.revokeObjectURL(url);
      return;
    }
    const file = new File(Paths.cache, name);
    if (file.exists) file.delete();
    file.create();
    file.write(csv);
    await Sharing.shareAsync(file.uri, { mimeType: 'text/csv', dialogTitle: 'Exportar gastos' });
  }

  async function importCsv() {
    setCsvMessage(null);
    const picked = await DocumentPicker.getDocumentAsync({
      type: ['text/csv', 'text/comma-separated-values', 'text/plain', 'application/csv', '*/*'],
      copyToCacheDirectory: true,
    });
    if (picked.canceled) return;
    const asset = picked.assets[0];
    const text = Platform.OS === 'web' ? await (await fetch(asset.uri)).text() : await new File(asset.uri).text();
    const { expenses, skipped } = parseBankCsv(text, state.learnedCategories);
    const fresh = expenses.filter((e) => !isAlreadyImported(state.expenses, e));
    if (fresh.length > 0) {
      dispatch({ type: 'importExpenses', expenses: fresh.map((e) => ({ ...e, id: newId() })) });
    }
    if (expenses.length === 0) {
      setCsvMessage('No he encontrado gastos. El archivo debe tener columnas de fecha, concepto e importe.');
    } else {
      const dupes = expenses.length - fresh.length;
      setCsvMessage(
        `Importados ${fresh.length} gastos.${dupes ? ` ${dupes} ya estaban.` : ''}${skipped ? ` ${skipped} filas ignoradas (ingresos, saldos…).` : ''}`,
      );
    }
  }

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

      <Button
        label={Platform.OS === 'android' ? '⚡ Registro automático de pagos' : '⚡ Registro automático con Apple Pay'}
        variant="secondary"
        onPress={() => router.push('/automation')}
      />

      <Card>
        <H2>Avisos</H2>
        <Muted>Un resumen cada domingo a las 20:00 con lo que llevas gastado y lo que te queda.</Muted>
        <Button
          label="Activar avisos"
          variant="secondary"
          onPress={() => ensureNotificationPermission().catch(() => {})}
        />
      </Card>

      <Card>
        <H2>Tus datos</H2>
        <Muted>
          Importa el extracto de tu banco (CSV) para traer los pagos con tarjeta física, Bizum o recibos. Exporta todo
          cuando quieras para abrirlo en Excel.
        </Muted>
        <Button label="📥 Importar extracto (CSV)" variant="secondary" onPress={() => importCsv().catch(() => setCsvMessage('No se pudo leer el archivo.'))} />
        <Button label="📤 Exportar gastos (CSV)" variant="secondary" onPress={() => exportCsv().catch(() => {})} />
        {csvMessage ? <Muted>{csvMessage}</Muted> : null}
      </Card>

      <Card>
        <H2>Privacidad</H2>
        <Muted>
          Tus gastos personales se guardan solo en este móvil. Los gastos de un grupo compartido se guardan en nuestro
          servidor para que los vean los miembros del grupo. Taimo no pide las claves de tu banco, no vende tus datos y
          no ofrece préstamos.
        </Muted>
      </Card>

      <View style={{ gap: space.sm }}>
        <Button label="Borrar todos mis datos" variant="danger" onPress={reset} />
        <Muted style={{ textAlign: 'center' }}>Taimo · versión de prueba</Muted>
      </View>
    </Screen>
  );
}
