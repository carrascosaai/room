import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Platform, ScrollView, Text, TextInput, View } from 'react-native';

import { afterPurchaseMessage, categoryStatus } from '@/domain/budget';
import { CATEGORIES, category as categoryInfo } from '@/domain/categories';
import { categorize } from '@/domain/categorize';
import { splitEqually } from '@/domain/groups';
import { formatMoney, parseAmount } from '@/domain/money';
import type { CategoryId, Expense } from '@/domain/types';
import { newId, reducer, useStore } from '@/store/store';
import { Button, Chip, Input, Muted, Row, Screen } from '@/ui/components';
import { colors, radius, space } from '@/ui/theme';

function confirm(message: string, onYes: () => void) {
  if (Platform.OS === 'web') {
    if (globalThis.confirm?.(message)) onYes();
    return;
  }
  Alert.alert(message, undefined, [
    { text: 'Cancelar', style: 'cancel' },
    { text: 'Borrar', style: 'destructive', onPress: onYes },
  ]);
}

/**
 * Añadir o editar un gasto. Con `?id=` edita; con `?groupId=` empieza como gasto compartido.
 */
export default function AddExpense() {
  const params = useLocalSearchParams<{ id?: string; groupId?: string }>();
  const { state, dispatch } = useStore();
  const editing = params.id ? state.expenses.find((e) => e.id === params.id) : undefined;

  const [amountText, setAmountText] = useState(editing ? (editing.amount / 100).toFixed(2).replace('.', ',') : '');
  const [merchant, setMerchant] = useState(editing?.merchant ?? '');
  const [cat, setCat] = useState<CategoryId>(editing?.category ?? 'otros');
  const [catTouched, setCatTouched] = useState(Boolean(editing));
  const [groupId, setGroupId] = useState<string | undefined>(editing?.groupId ?? params.groupId);
  const group = state.groups.find((g) => g.id === groupId);
  const me = group?.members.find((m) => m.isMe)?.id;
  const [paidBy, setPaidBy] = useState<string | undefined>(editing?.paidBy);
  const [participants, setParticipants] = useState<string[] | undefined>(
    editing?.shares ? Object.keys(editing.shares) : undefined,
  );

  const effectivePaidBy = paidBy ?? me;
  const effectiveParticipants = participants ?? group?.members.map((m) => m.id) ?? [];
  const amount = parseAmount(amountText) ?? 0;
  const shares = useMemo(
    () => (group ? splitEqually(amount, effectiveParticipants) : undefined),
    [group, amount, effectiveParticipants],
  );

  const suggested = merchant.trim() ? categorize(merchant, state.learnedCategories) : 'otros';
  const shownCat = catTouched ? cat : suggested;

  const valid = amount > 0 && (!group || (effectivePaidBy && effectiveParticipants.length > 0));

  function save() {
    if (!valid) return;
    const expense: Expense = {
      id: editing?.id ?? newId(),
      amount,
      merchant: merchant.trim() || categoryInfo(shownCat).label,
      category: shownCat,
      date: editing?.date ?? new Date().toISOString(),
      source: editing?.source ?? 'manual',
      note: editing?.note,
      groupId: group?.id,
      paidBy: group ? effectivePaidBy : undefined,
      shares: group ? shares : undefined,
    };
    const action = editing ? ({ type: 'updateExpense', expense } as const) : ({ type: 'addExpense', expense } as const);
    dispatch(action);
    if (!editing) {
      const next = reducer(state, action);
      const status = categoryStatus(next, expense.category);
      const msg = afterPurchaseMessage(status, categoryInfo(expense.category).label);
      if (Platform.OS !== 'web') Alert.alert(`${formatMoney(amount)} apuntados`, msg);
    }
    router.back();
  }

  return (
    <Screen>
      <Row style={{ justifyContent: 'space-between' }}>
        <Button label="Cancelar" variant="ghost" onPress={() => router.back()} />
        <Text style={{ color: colors.text, fontSize: 17, fontWeight: '600' }}>
          {editing ? 'Editar gasto' : 'Nuevo gasto'}
        </Text>
        <View style={{ width: 90 }} />
      </Row>

      <View style={{ alignItems: 'center', gap: space.xs }}>
        <Muted>Importe</Muted>
        <Row>
          <TextInput
            value={amountText}
            onChangeText={setAmountText}
            placeholder="0,00"
            placeholderTextColor={colors.textFaint}
            keyboardType="decimal-pad"
            autoFocus={!editing}
            style={{ color: colors.text, fontSize: 48, fontWeight: '800', minWidth: 120, textAlign: 'center' }}
          />
          <Text style={{ color: colors.textMuted, fontSize: 32 }}>€</Text>
        </Row>
      </View>

      <Input label="¿Dónde o en qué?" placeholder="Mercadona, cine, gasolina…" value={merchant} onChangeText={setMerchant} />

      <View style={{ gap: space.sm }}>
        <Muted>Categoría{!catTouched && merchant.trim() ? ' (sugerida)' : ''}</Muted>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }}>
          {CATEGORIES.map((c) => (
            <Chip
              key={c.id}
              label={`${c.emoji} ${c.label}`}
              selected={shownCat === c.id}
              onPress={() => {
                setCat(c.id);
                setCatTouched(true);
              }}
            />
          ))}
        </ScrollView>
      </View>

      {state.groups.length > 0 ? (
        <View style={{ gap: space.sm }}>
          <Muted>¿Es un gasto compartido?</Muted>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }}>
            <Chip label="👤 Solo mío" selected={!group} onPress={() => setGroupId(undefined)} />
            {state.groups.map((g) => (
              <Chip
                key={g.id}
                label={`${g.emoji} ${g.name}`}
                selected={groupId === g.id}
                onPress={() => {
                  setGroupId(g.id);
                  setPaidBy(undefined);
                  setParticipants(undefined);
                }}
              />
            ))}
          </ScrollView>
        </View>
      ) : null}

      {group ? (
        <View style={{ gap: space.md, backgroundColor: colors.surface, padding: space.lg, borderRadius: radius.lg }}>
          <Muted>¿Quién pagó?</Muted>
          <Row style={{ flexWrap: 'wrap' }}>
            {group.members.map((m) => (
              <Chip
                key={m.id}
                label={m.isMe ? 'Yo' : m.name}
                selected={effectivePaidBy === m.id}
                onPress={() => setPaidBy(m.id)}
              />
            ))}
          </Row>
          <Muted>¿Entre quién se reparte? (a partes iguales)</Muted>
          <Row style={{ flexWrap: 'wrap' }}>
            {group.members.map((m) => {
              const on = effectiveParticipants.includes(m.id);
              return (
                <Chip
                  key={m.id}
                  label={`${on ? '✓ ' : ''}${m.isMe ? 'Yo' : m.name}${shares?.[m.id] ? ` · ${formatMoney(shares[m.id])}` : ''}`}
                  selected={on}
                  onPress={() =>
                    setParticipants(on ? effectiveParticipants.filter((x) => x !== m.id) : [...effectiveParticipants, m.id])
                  }
                />
              );
            })}
          </Row>
          {me && shares ? (
            <Text style={{ color: colors.text }}>
              A tu presupuesto solo cuenta tu parte: {formatMoney(shares[me] ?? 0)}
            </Text>
          ) : null}
        </View>
      ) : null}

      <Button label={editing ? 'Guardar' : 'Añadir gasto'} disabled={!valid} onPress={save} />
      {editing ? (
        <Button
          label="Borrar gasto"
          variant="danger"
          onPress={() =>
            confirm('¿Borrar este gasto?', () => {
              dispatch({ type: 'deleteExpense', id: editing.id });
              router.back();
            })
          }
        />
      ) : null}
      {editing?.note ? <Muted>{editing.note}</Muted> : null}
    </Screen>
  );
}
