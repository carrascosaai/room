import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Platform, ScrollView, Text, TextInput, View } from 'react-native';

import { categoryStatus } from '@/domain/budget';
import { CATEGORIES } from '@/domain/categories';
import { categorize } from '@/domain/categorize';
import { splitEqually } from '@/domain/groups';
import { parseAmount } from '@/domain/money';
import type { CategoryId, Expense } from '@/domain/types';
import { useI18n } from '@/i18n';
import { newId, reducer, useStore } from '@/store/store';
import { Button, Chip, Input, Muted, Row, Screen } from '@/ui/components';
import { confirm } from '@/ui/confirm';
import { purchaseMessage } from '@/ui/messages';
import { colors, radius, space } from '@/ui/theme';

/**
 * Añadir o editar un gasto. Con `?id=` edita; con `?groupId=` empieza como gasto compartido.
 */
export default function AddExpense() {
  const params = useLocalSearchParams<{ id?: string; groupId?: string }>();
  const { state, dispatch } = useStore();
  const i18n = useI18n();
  const { t, money, locale } = i18n;
  const editing = params.id ? state.expenses.find((e) => e.id === params.id) : undefined;

  const decimalSep = (1.5).toLocaleString(locale).includes(',') ? ',' : '.';
  const [amountText, setAmountText] = useState(editing ? (editing.amount / 100).toFixed(2).replace('.', decimalSep) : '');
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
      merchant: merchant.trim() || t(`cat.${shownCat}`),
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
    if (!editing && Platform.OS !== 'web') {
      const next = reducer(state, action);
      Alert.alert(t('add.savedTitle', { amount: money(amount) }), purchaseMessage(i18n, categoryStatus(next, expense.category)));
    }
    router.back();
  }

  return (
    <Screen>
      <Row style={{ justifyContent: 'space-between' }}>
        <Button label={t('common.cancel')} variant="ghost" onPress={() => router.back()} />
        <Text style={{ color: colors.text, fontSize: 17, fontWeight: '600' }}>
          {editing ? t('add.editTitle') : t('add.newTitle')}
        </Text>
        <View style={{ width: 90 }} />
      </Row>

      <View style={{ alignItems: 'center', gap: space.xs }}>
        <Muted>{t('add.amount')}</Muted>
        <Row>
          <TextInput
            value={amountText}
            onChangeText={setAmountText}
            placeholder={`0${decimalSep}00`}
            placeholderTextColor={colors.textFaint}
            keyboardType="decimal-pad"
            autoFocus={!editing}
            accessibilityLabel={t('add.amount')}
            style={{ color: colors.text, fontSize: 48, fontWeight: '800', minWidth: 120, textAlign: 'center' }}
          />
          <Text style={{ color: colors.textMuted, fontSize: 28 }}>{i18n.currency}</Text>
        </Row>
      </View>

      <Input label={t('add.where')} placeholder={t('add.wherePlaceholder')} value={merchant} onChangeText={setMerchant} />

      <View style={{ gap: space.sm }}>
        <Muted>{!catTouched && merchant.trim() ? t('add.suggested') : t('add.category')}</Muted>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }}>
          {CATEGORIES.map((c) => (
            <Chip
              key={c.id}
              label={`${c.emoji} ${t(`cat.${c.id}`)}`}
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
          <Muted>{t('add.shared')}</Muted>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }}>
            <Chip label={t('add.onlyMine')} selected={!group} onPress={() => setGroupId(undefined)} />
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
          <Muted>{t('add.paidBy')}</Muted>
          <Row style={{ flexWrap: 'wrap' }}>
            {group.members.map((m) => (
              <Chip key={m.id} label={m.isMe ? t('common.me') : m.name} selected={effectivePaidBy === m.id} onPress={() => setPaidBy(m.id)} />
            ))}
          </Row>
          <Muted>{t('add.splitBetween')}</Muted>
          <Row style={{ flexWrap: 'wrap' }}>
            {group.members.map((m) => {
              const on = effectiveParticipants.includes(m.id);
              return (
                <Chip
                  key={m.id}
                  label={`${on ? '✓ ' : ''}${m.isMe ? t('common.me') : m.name}${shares?.[m.id] ? ` · ${money(shares[m.id])}` : ''}`}
                  selected={on}
                  onPress={() =>
                    setParticipants(on ? effectiveParticipants.filter((x) => x !== m.id) : [...effectiveParticipants, m.id])
                  }
                />
              );
            })}
          </Row>
          {me && shares ? <Text style={{ color: colors.text }}>{t('add.myShareNote', { amount: money(shares[me] ?? 0) })}</Text> : null}
        </View>
      ) : null}

      <Button label={editing ? t('common.save') : t('add.addButton')} disabled={!valid} onPress={save} />
      {editing ? (
        <Button
          label={t('add.deleteButton')}
          variant="danger"
          onPress={() =>
            confirm(t('add.deleteConfirm'), t('common.cancel'), t('common.delete'), () => {
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
