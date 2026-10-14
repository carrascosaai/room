import { router, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useMemo, useRef, useState } from 'react';
import { canRecognizeText, recognizeText } from 'taimo-capture';
import { Alert, Platform, ScrollView, Text, TextInput, View } from 'react-native';

import { categoryStatus } from '@/domain/budget';
import { CATEGORIES } from '@/domain/categories';
import { categorize } from '@/domain/categorize';
import { exactRemainder, POT, splitByItems, splitByWeights, splitEqually } from '@/domain/groups';
import { parseAmount } from '@/domain/money';
import { parseReceipt } from '@/domain/receipt';
import type { CategoryId, Cents, Expense, ReceiptItem, SplitMode } from '@/domain/types';
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
  const params = useLocalSearchParams<{ id?: string; groupId?: string; amount?: string; merchant?: string; currency?: string; daysAgo?: string; scan?: string }>();
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
    editing?.original?.currency ?? params.currency ?? (group?.kind === 'trip' && recentForeign ? recentForeign : base),
  );
  const [amountText, setAmountText] = useState(
    editing ? fmtInput(editing.original?.amount ?? editing.amount) : params.amount ? fmtInput(Number(params.amount)) : '',
  );
  const [merchant, setMerchant] = useState(editing?.merchant ?? params.merchant ?? '');
  const [cat, setCat] = useState<CategoryId>(editing?.category ?? 'otros');
  const [catTouched, setCatTouched] = useState(Boolean(editing));
  const [picking, setPicking] = useState(false);
  const [day, setDay] = useState(() => {
    if (editing) return new Date(editing.date).toDateString();
    const d = new Date();
    d.setDate(d.getDate() - (Number(params.daysAgo) || 0));
    return d.toDateString();
  });
  const dayOptions = useMemo(() => {
    const rel = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
    const now = new Date();
    const list = Array.from({ length: 7 }, (_, n) => {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - n, 12);
      const label = n < 2 ? rel.format(-n, 'day') : i18n.date(d, { weekday: 'short', day: 'numeric' });
      return { key: d.toDateString(), label: label.charAt(0).toUpperCase() + label.slice(1) };
    });
    if (!list.some((o) => o.key === day)) list.push({ key: day, label: i18n.date(new Date(day), { day: 'numeric', month: 'short' }) });
    return list;
  }, [locale, day]);

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

  const [items, setItems] = useState<{ key: string; name: string; amount: string; who: string[] }[]>(() =>
    (editing?.items ?? []).map((it, i) => ({ key: String(i), name: it.name, amount: fmtInput(it.amount), who: it.who })),
  );

  const [scanMessage, setScanMessage] = useState<string | null>(null);

  /** Foto del ticket → importe, comercio, fecha y (en grupos) productos para repartir. */
  async function scan(source: 'camera' | 'library') {
    setScanMessage(null);
    if (!canRecognizeText) {
      setScanMessage(t('scan.unavailable'));
      return;
    }
    const perm = source === 'camera' ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      setScanMessage(t('scan.permission'));
      return;
    }
    const picked =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync({ quality: 0.9, mediaTypes: ['images'] })
        : await ImagePicker.launchImageLibraryAsync({ quality: 0.9, mediaTypes: ['images'] });
    if (picked.canceled || !picked.assets[0]) return;
    setScanMessage(t('scan.reading'));
    const lines = await recognizeText(picked.assets[0].uri).catch(() => []);
    const r = parseReceipt(lines, base);
    if (!r.total) {
      setScanMessage(t('scan.failed'));
      return;
    }
    setAmountText(fmtInput(r.total));
    if (r.merchant) setMerchant(r.merchant.charAt(0) + r.merchant.slice(1).toLowerCase());
    if (r.currency !== cur) setCur(r.currency);
    if (r.date) setDay(new Date(r.date).toDateString());
    if (group && r.items.length > 1) {
      setMode('items');
      setItems(r.items.map((it, i) => ({ key: `scan-${i}`, name: it.name, amount: fmtInput(it.amount), who: me ? [me] : [] })));
    }
    setScanMessage(t('scan.done'));
  }

  function askScan() {
    if (Platform.OS === 'web') return scan('library');
    Alert.alert(t('scan.button'), undefined, [
      { text: t('scan.camera'), onPress: () => scan('camera') },
      { text: t('scan.library'), onPress: () => scan('library') },
      { text: t('common.cancel'), style: 'cancel' },
    ]);
  }

  const scannedOnOpen = useRef(false);
  useEffect(() => {
    if (params.scan && !scannedOnOpen.current) {
      scannedOnOpen.current = true;
      askScan();
    }
  }, [params.scan]);

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
  const parsedItems: ReceiptItem[] = items.map((it) => ({ name: it.name.trim(), amount: parseAmount(it.amount) ?? 0, who: it.who }));
  const itemsSplit = mode === 'items' ? splitByItems(entered, parsedItems) : null;
  const itemsLeft = entered - parsedItems.reduce((a, it) => a + it.amount, 0);

  const shares = useMemo(() => {
    if (!group) return undefined;
    if (mode === 'weights') return splitByWeights(amount, weightNums);
    if (mode === 'exact') return scaleShares(exactNums, rate, amount);
    if (mode === 'items') return itemsSplit ? scaleShares(itemsSplit, rate, amount) : undefined;
    return splitEqually(amount, effectiveParticipants);
  }, [group, mode, amount, JSON.stringify(weightNums), JSON.stringify(exactNums), JSON.stringify(itemsSplit), rate, effectiveParticipants.join()]);

  const suggested = merchant.trim() ? categorize(merchant, state.learnedCategories) : 'otros';
  const shownCat = catTouched ? cat : suggested;
  const valid =
    amount > 0 &&
    (!group || (effectivePaidBy && effectiveParticipants.length > 0 && (mode !== 'exact' || exactLeft === 0) && (mode !== 'items' || !!itemsSplit)));

  function save() {
    if (!valid) return;
    const expense: Expense = {
      id: editing?.id ?? newId(),
      amount,
      merchant: merchant.trim() || t(`cat.${shownCat}`),
      category: shownCat,
      date: dateFor(day, editing?.date),
      source: editing?.source ?? 'manual',
      note: editing?.note,
      groupId: group?.id,
      paidBy: group ? effectivePaidBy : undefined,
      shares: group ? shares : undefined,
      splitMode: group ? mode : undefined,
      weights: group && mode === 'weights' ? weightNums : undefined,
      items: group && mode === 'items' ? parsedItems.filter((it) => it.amount > 0 && it.who.length) : undefined,
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
      {!editing ? <Button label={t('scan.button')} variant="secondary" onPress={askScan} /> : null}
      {scanMessage ? <Muted style={{ textAlign: 'center' }}>{scanMessage}</Muted> : null}

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

      <View style={{ gap: space.xs }}>
        <Muted>{t('ins.when')}</Muted>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }}>
          {dayOptions.map((o) => (
            <Chip key={o.key} label={o.label} selected={day === o.key} onPress={() => setDay(o.key)} />
          ))}
        </ScrollView>
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
            {group.pot ? <Chip label={`🫙 ${t('pot.name')}`} selected={effectivePaidBy === POT} onPress={() => setPaidBy(POT)} /> : null}
          </Row>

          <Row style={{ flexWrap: 'wrap' }}>
            {(['equal', 'weights', 'exact', 'items'] as SplitMode[]).map((m) => (
              <Chip key={m} label={t(`split.${m}`)} selected={mode === m} onPress={() => setMode(m)} />
            ))}
          </Row>

          {mode === 'items' ? (
            <View style={{ gap: space.md }}>
              {items.map((it, idx) => (
                <View key={it.key} style={{ gap: space.sm, borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: space.md }}>
                  <Row>
                    <View style={{ flex: 1 }}>
                      <Input
                        value={it.name}
                        placeholder={t('ticket.itemName')}
                        onChangeText={(v) => setItems((list) => list.map((x, i) => (i === idx ? { ...x, name: v } : x)))}
                        style={{ paddingVertical: 8 }}
                      />
                    </View>
                    <View style={{ width: 96 }}>
                      <Input
                        value={it.amount}
                        keyboardType="decimal-pad"
                        placeholder={`0${decimalSep}00`}
                        onChangeText={(v) => setItems((list) => list.map((x, i) => (i === idx ? { ...x, amount: v } : x)))}
                        style={{ textAlign: 'right', paddingVertical: 8 }}
                      />
                    </View>
                    <Text
                      accessibilityRole="button"
                      accessibilityLabel={t('common.delete')}
                      onPress={() => setItems((list) => list.filter((_, i) => i !== idx))}
                      style={{ color: colors.textMuted, fontSize: 20, paddingHorizontal: 4 }}
                    >
                      ✕
                    </Text>
                  </Row>
                  <Row style={{ flexWrap: 'wrap' }}>
                    {group.members.map((m) => {
                      const on = it.who.includes(m.id);
                      return (
                        <Chip
                          key={m.id}
                          label={`${on ? '✓ ' : ''}${name(m.id)}`}
                          selected={on}
                          onPress={() =>
                            setItems((list) =>
                              list.map((x, i) => (i === idx ? { ...x, who: on ? x.who.filter((w) => w !== m.id) : [...x.who, m.id] } : x)),
                            )
                          }
                        />
                      );
                    })}
                  </Row>
                </View>
              ))}
              <Button
                label={t('ticket.addItem')}
                variant="secondary"
                onPress={() => setItems((list) => [...list, { key: `${Date.now()}-${list.length}`, name: '', amount: '', who: me ? [me] : [] }])}
              />
              {itemsLeft < 0 ? (
                <Text style={{ color: colors.warning }}>{t('ticket.over', { amount: moneyIn(-itemsLeft, cur) })}</Text>
              ) : items.length > 0 && itemsLeft > 0 ? (
                <Muted>{t('ticket.rest', { amount: moneyIn(itemsLeft, cur) })}</Muted>
              ) : null}
              {shares ? (
                <Row style={{ flexWrap: 'wrap' }}>
                  {group.members.map((m) => (
                    <Muted key={m.id}>
                      {name(m.id)}: {moneyIn(shares[m.id] ?? 0, base)}
                    </Muted>
                  ))}
                </Row>
              ) : null}
            </View>
          ) : mode === 'equal' ? (
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

/** Fecha del gasto: hoy a la hora de ahora; otro día, a la hora original o a mediodía. */
function dateFor(dayKey: string, original?: string): string {
  if (original && new Date(original).toDateString() === dayKey) return original;
  const now = new Date();
  if (now.toDateString() === dayKey) return now.toISOString();
  const d = new Date(dayKey);
  const t = original ? new Date(original) : null;
  d.setHours(t ? t.getHours() : 12, t ? t.getMinutes() : 0);
  return d.toISOString();
}
