import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Platform, Text, View } from 'react-native';

import { balances, memberName, suggestTransfers } from '@/domain/groups';
import { formatMoney } from '@/domain/money';
import { newId, useStore } from '@/store/store';
import { Button, Card, Empty, H2, Input, Muted, Row, Screen } from '@/ui/components';
import { ExpenseRow } from '@/ui/ExpenseRow';
import { colors, space } from '@/ui/theme';

export default function GroupDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state, dispatch } = useStore();
  const [newMember, setNewMember] = useState('');
  const group = state.groups.find((g) => g.id === id);

  if (!group) {
    return (
      <Screen>
        <Empty emoji="🤷" text="Este grupo ya no existe." />
      </Screen>
    );
  }

  const expenses = state.expenses.filter((e) => e.groupId === group.id);
  const balance = balances(group, state.expenses, state.settlements);
  const transfers = suggestTransfers(balance);
  const total = expenses.reduce((s, e) => s + e.amount, 0);

  function settle(from: string, to: string, amount: number) {
    dispatch({
      type: 'addSettlement',
      settlement: { id: newId(), groupId: group!.id, from, to, amount, date: new Date().toISOString() },
    });
  }

  function remove() {
    const doIt = () => {
      dispatch({ type: 'deleteGroup', id: group!.id });
      router.back();
    };
    const msg = '¿Borrar el grupo? Sus gastos se quedarán como gastos tuyos.';
    if (Platform.OS === 'web') {
      if (globalThis.confirm?.(msg)) doIt();
    } else {
      Alert.alert(msg, undefined, [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Borrar', style: 'destructive', onPress: doIt },
      ]);
    }
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: `${group.emoji} ${group.name}` }} />

      <Card>
        <Muted>Gastado en total en el grupo</Muted>
        <Text style={{ color: colors.text, fontSize: 32, fontWeight: '800' }}>{formatMoney(total)}</Text>
        {group.members.map((m) => {
          const b = balance[m.id] ?? 0;
          return (
            <Row key={m.id} style={{ justifyContent: 'space-between' }}>
              <Text style={{ color: colors.text, fontSize: 15 }}>{m.isMe ? 'Tú' : m.name}</Text>
              <Text style={{ color: b > 0 ? colors.success : b < 0 ? colors.warning : colors.textMuted }}>
                {b === 0 ? 'al día' : b > 0 ? `le deben ${formatMoney(b)}` : `debe ${formatMoney(-b)}`}
              </Text>
            </Row>
          );
        })}
      </Card>

      {transfers.length > 0 ? (
        <Card>
          <H2>Para quedar en paz</H2>
          {transfers.map((t) => (
            <View key={`${t.from}-${t.to}`} style={{ gap: space.sm }}>
              <Text style={{ color: colors.text, fontSize: 15 }}>
                {memberName(group, t.from)} → {memberName(group, t.to)}: <Text style={{ fontWeight: '700' }}>{formatMoney(t.amount)}</Text>
              </Text>
              <Button label="Marcar como pagado (Bizum, efectivo…)" variant="secondary" onPress={() => settle(t.from, t.to, t.amount)} />
            </View>
          ))}
        </Card>
      ) : null}

      <Button label="+ Añadir gasto compartido" onPress={() => router.push({ pathname: '/add', params: { groupId: group.id } })} />

      <Card>
        <H2>Gastos</H2>
        {expenses.length === 0 ? (
          <Empty emoji="🧾" text="Sin gastos todavía." />
        ) : (
          expenses.map((e) => <ExpenseRow key={e.id} expense={e} groups={state.groups} />)
        )}
      </Card>

      <Card>
        <H2>Miembros</H2>
        <Row>
          <View style={{ flex: 1 }}>
            <Input placeholder="Añadir a alguien" value={newMember} onChangeText={setNewMember} />
          </View>
          <Button
            label="Añadir"
            variant="secondary"
            disabled={!newMember.trim()}
            onPress={() => {
              dispatch({ type: 'addMember', groupId: group.id, member: { id: newId(), name: newMember.trim() } });
              setNewMember('');
            }}
          />
        </Row>
      </Card>

      <Button label="Borrar grupo" variant="danger" onPress={remove} />
    </Screen>
  );
}
