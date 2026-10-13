import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Platform, ScrollView, Text, TextInput, View } from 'react-native';

import { categoryStatus } from '@/domain/budget';
import { CATEGORIES } from '@/domain/categories';
import { categorize } from '@/domain/categorize';
import { exactRemainder, splitByWeights, splitEqually } from '@/domain/groups';
import { parseAmount } from '@/domain/money';
import type { CategoryId, Cents, Expense, SplitMode } from '@/domain/types';
import { rateBetween } from '@/fx/fx';
import { useRates } from '@/fx/useRates';
import { useI18n } from '@/i18n';
import { newId, reducer, useStore } from '@/store/store';
import { Button, Chip, Input, Muted, Row, Screen } from '@/ui/components';
import { confirm } from '@/ui/confirm';
import { CurrencyButton, CurrencyPicker } from '@/ui/CurrencyPicker';
import { purchaseMessage } from '@/ui/messages';
import { colors, radius, space } from '@/ui/theme';

/** Pasa partes a la moneda base cuadrando céntimos con el total. */
function scaleShares(shares: Record<string, Cents>, rate: number, total: Cents): Record<string, Cents> {
  const out: Record<string, Cents> = {};
  let sum = 0;
  let biggest = '';
  for (const [id, v] of Object.entries(shares)) {
    out[id] = Math.round(v * rate);
    sum += out[id];
    if (!biggest || out[id] > out[biggest]) biggest = id;
  }
  if (biggest) out[biggest] += total - sum;
  return out;
}

/**
 * Añadir o editar un gasto. Con `?id=` edita; con `?groupId=` empieza como gasto compartido.
 * Admite cualquier moneda (se convierte a la tuya o a la del grupo) y repartos
 * a partes iguales, por proporción o con importes exactos.
 */
export default function AddExpense() {
  const params = useLocalSearchParams<{ id?: string; groupId?: string }>();
  const { state, dispatch } = useStore();
  const i18n = useI18n();
  const { t, moneyIn, number, locale } = i18n;
  const { rates } = useRates();
  const editing = params.id ? state.expenses.find((e) => e.id === params.id) : undefined;
  const decimalSep = (1.5).toLocaleString(locale).includes(',') ? ',' : '.';
  const fmtInput = (c: Cents) => (c / 100).toFixed(2).replace('.', decimalSep);

  const [groupId, setGroupId] = useState<string | undefined>(editing?.groupId ?? params.groupId);
  const group = state.groups.find((g) => g.id === groupId);
  const base = group?.currency ?? i18n.currency;
  const recentForeign = (state.recentCurrencies ?? []).find((c) => c !== base);
  const [cur, setCur] = useState<string>(
    editing?.original?.currency ?? (group?.kind === 'trip' && recentForeign ? recentForeign : base),
  );
  const [amountText, setAmountText] = useState(editing ? fmtInput(editing.original?.amount ?? editing.amount) : '');
  const [merchant, setMerchant] = useState(editing?.merchant ?? '');
  const [cat, setCat] = useState<CategoryId>(editing?.category ?? 'otros');
  const [catTouched, setCatTouched] = useState(Boolean(editing));
  const [picking, setPicking] = useState(false);

  const me = group?.members.find((m) => m.isMe)?.id;
  const [paidBy, setPaidBy] = useState<string | undefined>(editing?.paidBy);
  const [participants, setParticipants] = useState<string[] | undefined>(editing?.shares ? Object.keys(editing.shares) : undefined);
  const [mode, setMode] = useState<SplitMode>(editing?.splitMode ?? (group?.weights ? 'weights' : 'equal'));
  const [weights, setWeights] = useState<Record<string, string>>(() =>
    Object.fromEntries(Object.entries(editing?.weights ?? group?.weights ?? {}).map(([k, v]) => [k, String(v)])),
  );
  const [exact, setExact] = useState<Record<string, string>>(() =>
    editing?.splitMode === 'exact' && editing.shares
      ? Object.fromEntries(Object.entries(editing.shares).map(([k, v]) => [k, fmtInput(Math.round(v / (editing.original?.rate ?? 1)))]))
      : {},
  );

  const effectivePaidBy = paidBy ?? me;
  const effectiveParticipants = participants ?? group?.members.map((m) => m.id) ?? [];
  const entered = parseAmount(amountText) ?? 0;
  // Tipo de cambio: el guardado si editamos sin cambiar de moneda; si no, el del día.
  const rate =
    cur === base ? 1 : editing?.original?.currency === cur && editing.original.rate ? editing.original.rate : rateBetween(cur, base, rates) ?? 1;
  const amount = Math.round(entered * rate);

  const weightNums = Object.fromEntries(
    effectiveParticipants.map((id) => [id, Number((weights[id] ?? '1').replace(',', '.')) || 0]),
  );
  const exactNums = Object.fromEntries(effectiveParticipants.map((id) => [id, parseAmount(exact[id] ?? '') ?? 0]));
  const exactLeft = mode === 'exact' ? exactRemainder(entered, exactNums) : 0;

  const shares = useMemo(() => {
    if (!group) return undefined;
    if (mode === 'weights') return splitByWeights(amount, weightNums);
    if (mode === 'exact') return scaleShares(exactNums, rate, amount);
    return splitEqually(amount, effectiveParticipants);
  }, [group, mode, amount, JSON.stringify(weightNums), JSON.stringify(exactNums), rate, effectiveParticipants.join()]);

  const suggested = merchant.trim() ? categorize(merchant, state.learnedCategories) : 'otros';
  const shownCat = catTouched ? cat : suggested;
  const valid =
    amount > 0 &&
    (!group || (effectivePaidBy && effectiveParticipants.length > 0 && (mode !== 'exact' || exactLeft === 0)));

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
      splitMode: group ? mode : undefined,
      weights: group && mode === 'weights' ? weightNums : undefined,
      original: cur !== base ? { amount: entered, currency: cur, rate } : undefined,
    };
    const action = editing ? ({ type: 'updateExpense', expense } as const) : ({ type: 'addExpense', expense } as const);
    dispatch(action);
    dispatch({ type: 'useCurrency', currency: cur });
    if (!editing && Platform.OS !== 'web') {
      const next = reducer(state, action);
      Alert.alert(t('add.savedTitle', { amount: moneyIn(amount, base) }), purchaseMessage(i18n, categoryStatus(next, expense.category)));
    }
    router.back();
  }

  const name = (id: string) => {
    const m = group?.members.find((x) => x.id === id);
    return m?.isMe ? t('common.me') : m?.name ?? '?';
  };

  return (
    <Screen>
      <Row style={{ justifyContent: 'space-between' }}>
        <Button label={t('common.cancel')} variant="ghost" onPress={() => router.back()} />
        <Text style={{ color: colors.text, fontSize: 17, fontWeight: '600' }}>{editing ? t('add.editTitle') : t('add.newTitle')}</Text>
        <View style={{ width: 90 }} />
      </Row>

      <View style={{ alignItems: 'center', gap: space.sm }}>
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
            style={{ color: colors.text, fontSize: 48, fontWeight: '800', width: Math.max(140, Math.min(260, (amountText.length || 4) * 30)), textAlign: 'center' }}
          />
          <CurrencyButton value={cur} onPress={() => setPicking(true)} />
        </Row>
        {cur !== base ? (
          <Muted style={{ textAlign: 'center' }}>
            {t('fx.approx', { amount: moneyIn(amount, base) })} · {t('fx.rate', { from: cur, rate: number(rate, 5), to: base })}
          </Muted>
        ) : null}
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
                  setMode(g.weights ? 'weights' : 'equal');
                  setWeights(Object.fromEntries(Object.entries(g.weights ?? {}).map(([k, v]) => [k, String(v)])));
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
              <Chip key={m.id} label={name(m.id)} selected={effectivePaidBy === m.id} onPress={() => setPaidBy(m.id)} />
            ))}
          </Row>

          <Row style={{ flexWrap: 'wrap' }}>
            {(['equal', 'weights', 'exact'] as SplitMode[]).map((m) => (
              <Chip key={m} label={t(`split.${m}`)} selected={mode === m} onPress={() => setMode(m)} />
            ))}
          </Row>

          {mode === 'equal' ? (
            <Row style={{ flexWrap: 'wrap' }}>
              {group.members.map((m) => {
                const on = effectiveParticipants.includes(m.id);
                return (
                  <Chip
                    key={m.id}
                    label={`${on ? '✓ ' : ''}${name(m.id)}${shares?.[m.id] ? ` · ${moneyIn(shares[m.id], base)}` : ''}`}
                    selected={on}
                    onPress={() =>
                      setParticipants(on ? effectiveParticipants.filter((x) => x !== m.id) : [...effectiveParticipants, m.id])
                    }
                  />
                );
              })}
            </Row>
          ) : (
            <View style={{ gap: space.sm }}>
              {mode === 'weights' ? <Muted>{t('split.weightsHint')}</Muted> : null}
              {group.members.map((m) => (
                <Row key={m.id}>
                  <Text style={{ color: colors.text, flex: 1 }}>{name(m.id)}</Text>
                  <View style={{ width: 100 }}>
                    <Input
                      keyboardType="decimal-pad"
                      value={mode === 'weights' ? weights[m.id] ?? '1' : exact[m.id] ?? ''}
                      placeholder={mode === 'weights' ? '1' : `0${decimalSep}00`}
                      onChangeText={(v) =>
                        mode === 'weights' ? setWeights((w) => ({ ...w, [m.id]: v })) : setExact((e) => ({ ...e, [m.id]: v }))
                      }
                      style={{ textAlign: 'right', paddingVertical: 8 }}
                    />
                  </View>
                  <Muted style={{ width: 90, textAlign: 'right' }}>{shares?.[m.id] !== undefined ? moneyIn(shares[m.id], base) : ''}</Muted>
                </Row>
              ))}
              {mode === 'exact' && exactLeft !== 0 ? (
                <Text style={{ color: colors.warning }}>
                  {exactLeft > 0 ? t('split.remaining', { amount: moneyIn(exactLeft, cur) }) : t('split.over', { amount: moneyIn(-exactLeft, cur) })}
                </Text>
              ) : null}
            </View>
          )}

          {me && shares ? <Text style={{ color: colors.text }}>{t('add.myShareNote', { amount: moneyIn(shares[me] ?? 0, base) })}</Text> : null}
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

      <CurrencyPicker visible={picking} value={cur} onClose={() => setPicking(false)} onSelect={setCur} />
    </Screen>
  );
}
