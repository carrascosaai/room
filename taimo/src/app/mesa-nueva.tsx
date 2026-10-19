import * as Clipboard from 'expo-clipboard';
import * as ImagePicker from 'expo-image-picker';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Platform, Pressable, Share, Text, View } from 'react-native';
import { canRecognizeText, recognizeText } from 'taimo-capture';

import { parseAmount, plainAmount } from '@/domain/money';
import { parseReceipt } from '@/domain/receipt';
import { billLink, billTotal, cashClaim, compactBill, findClaimInText, MAX_ITEMS, MAX_PEOPLE, previewTableClaim, sharedPart, suggestedShare, tableUnpaid, type TableBill } from '@/domain/table';
import type { Expense } from '@/domain/types';
import { useI18n } from '@/i18n';
import { newId, useStore } from '@/store/store';
import { webBase } from '@/sync/api';
import { BigButton, Button, Card, H2, Input, Muted, Notice, Row, Screen } from '@/ui/components';
import { tableClaimMessage } from '@/ui/messages';
import { QrCode } from '@/ui/QrCode';
import { colors, radius, space } from '@/ui/theme';

type Item = { name: string; price: string; shared: boolean };

/**
 * «Paga tu parte» para quien pagó: apunta la cuenta (foto del ticket, platos o
 * solo el total), enseña el QR y ve quién le ha pagado ya.
 */
export default function MesaNueva() {
  const params = useLocalSearchParams<{ groupId?: string; expenseId?: string }>();
  const { state, dispatch } = useStore();
  const i18n = useI18n();
  const { t } = i18n;
  const group = state.groups.find((g) => g.id === params.groupId && g.table);
  if (group?.table) return <TableQr groupId={group.id} />;

  const source = state.expenses.find((e) => e.id === params.expenseId && !e.groupId);
  return <Setup source={source} onCreate={(bill, expense) => {
    dispatch({ type: 'createTable', bill, expense, meId: newId() });
    router.replace({ pathname: '/mesa-nueva', params: { groupId: `mesa-${bill.id}` } });
  }} currency={source?.original?.currency ?? state.profile.currency} t={t} i18n={i18n} />;
}

function Setup({ source, onCreate, currency, t, i18n }: {
  source?: Expense;
  onCreate: (bill: TableBill, expense: Expense) => void;
  currency: string;
  t: ReturnType<typeof useI18n>['t'];
  i18n: ReturnType<typeof useI18n>;
}) {
  const { state, dispatch } = useStore();
  const [payer, setPayer] = useState(state.profile.name ?? '');
  const [place, setPlace] = useState(source?.merchant ?? '');
  const [items, setItems] = useState<Item[]>([]);
  const [totalText, setTotalText] = useState(source ? String((source.original?.amount ?? source.amount) / 100) : '');
  const [people, setPeople] = useState(4);
  const [scanning, setScanning] = useState(false);
  const money = (c: number) => i18n.moneyIn(c, currency);
  const pay = state.profile.payment ?? {};
  const canBePaid = !!(pay.bizum || pay.iban || pay.paypal || pay.revolut);

  const parsed = items
    .map((it) => ({ name: it.name.trim(), price: parseAmount(it.price) ?? 0, shared: it.shared }))
    .filter((it) => it.price > 0)
    .slice(0, MAX_ITEMS);
  const itemsSum = parsed.reduce((s, it) => s + it.price, 0);
  const typedTotal = parseAmount(totalText) ?? 0;
  const total = typedTotal || itemsSum;
  const payerName = (state.profile.name || payer).trim().slice(0, 40);
  const draft: TableBill = {
    id: newId().slice(-10),
    m: place.trim().slice(0, 48),
    c: currency,
    t: payerName,
    p: pay,
    i: parsed.map((it) => [it.name || '·', it.price]),
    s: parsed.flatMap((it, i) => (it.shared ? [i] : [])),
    n: people,
    x: total - itemsSum,
    d: new Date().toISOString().slice(0, 10),
  };
  // Nombres cortos para que el QR se lea bien; si ni así cabe, hay que quitar platos.
  const { bill, fits } = compactBill(webBase(), draft);
  const valid = total > 0 && billTotal(bill) === total && itemsSum <= total;
  const ready = valid && fits && canBePaid && !!payerName;

  async function scan() {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return;
    const picked = await ImagePicker.launchCameraAsync({ quality: 0.9, mediaTypes: ['images'] });
    if (picked.canceled || !picked.assets[0]) return;
    setScanning(true);
    const lines = await recognizeText(picked.assets[0].uri).catch(() => []);
    setScanning(false);
    const r = parseReceipt(lines, currency);
    if (r.merchant && !place) setPlace(r.merchant);
    if (r.items.length) setItems(r.items.map((it) => ({ name: it.name, price: String(it.amount / 100), shared: false })));
    if (r.total) setTotalText(String(r.total / 100));
  }

  function create() {
    if (!state.profile.name && payerName) dispatch({ type: 'setProfileName', name: payerName });
    const expense: Expense = source ?? {
      id: newId(),
      amount: total,
      merchant: bill.m || t('mesa.title'),
      category: 'comer',
      date: new Date().toISOString(),
      source: 'manual',
    };
    onCreate({ ...bill, s: bill.s?.length ? bill.s : undefined, x: bill.x || undefined }, expense);
  }

  const update = (i: number, change: Partial<Item>) => setItems((list) => list.map((it, j) => (j === i ? { ...it, ...change } : it)));

  return (
    <Screen>
      <Stack.Screen options={{ headerShown: true, title: t('mesa.title') }} />
      <Muted style={{ fontSize: 17 }}>{t('mesa.startHint')}</Muted>

      {canRecognizeText && Platform.OS !== 'web' ? <BigButton emoji="📷" label={scanning ? '…' : t('mesa.scan')} onPress={scan} /> : null}

      {!state.profile.name ? <Input label={t('misc.payerName')} placeholder={t('mesa.whoPlaceholder')} value={payer} onChangeText={setPayer} autoCapitalize="words" /> : null}
      <Input label={t('mesa.place')} placeholder="La Tagliatella" value={place} onChangeText={setPlace} />
      <Input label={t('mesa.totalLabel')} keyboardType="decimal-pad" placeholder={money(0)} value={totalText} onChangeText={setTotalText} />

      <Card>
        <H2>{t('mesa.people')}</H2>
        <Row style={{ justifyContent: 'center', gap: space.lg }}>
          <Stepper label="−" onPress={() => setPeople((n) => Math.max(2, n - 1))} a11y={t('mesa.fewer')} />
          <Text style={{ color: colors.text, fontSize: 40, fontWeight: '800', minWidth: 60, textAlign: 'center' }}>{people}</Text>
          <Stepper label="+" onPress={() => setPeople((n) => Math.min(MAX_PEOPLE, n + 1))} a11y={t('mesa.more')} />
        </Row>
      </Card>

      <Card>
        <H2>{t('mesa.items')}</H2>
        <Muted>{t('mesa.itemsHint')}</Muted>
        {items.map((it, i) => (
          <View key={i} style={{ gap: space.xs, borderBottomWidth: 1, borderColor: colors.border, paddingBottom: space.sm }}>
            <Row>
              <View style={{ flex: 1 }}>
                <Input placeholder={t('mesa.item')} value={it.name} onChangeText={(v) => update(i, { name: v })} accessibilityLabel={t('mesa.item')} />
              </View>
              <View style={{ width: 110 }}>
                <Input placeholder="0,00" keyboardType="decimal-pad" value={it.price} onChangeText={(v) => update(i, { price: v })} accessibilityLabel={t('mesa.price')} style={{ textAlign: 'right' }} />
              </View>
            </Row>
            <Row style={{ justifyContent: 'space-between' }}>
              <Pressable
                onPress={() => update(i, { shared: !it.shared })}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: it.shared }}
                // El lector ya dice si está marcado: sin leer los emojis.
                accessibilityLabel={t('mesa.sharedToggle')}
                style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: space.sm, borderRadius: radius.md, backgroundColor: it.shared ? colors.primarySoft : 'transparent' }}
              >
                <Text style={{ color: colors.text, fontSize: 16 }}>{it.shared ? '✅' : '⬜'} 🤝 {t('mesa.sharedToggle')}</Text>
              </Pressable>
              <Pressable onPress={() => setItems((l) => l.filter((_, j) => j !== i))} accessibilityRole="button" accessibilityLabel={t('common.delete')} style={{ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: colors.danger, fontSize: 20 }}>✕</Text>
              </Pressable>
            </Row>
          </View>
        ))}
        {items.length < MAX_ITEMS ? <Button label={`+ ${t('mesa.addItem')}`} variant="ghost" onPress={() => setItems((l) => [...l, { name: '', price: '', shared: false }])} /> : null}
      </Card>

      {total > 0 ? (
        <Card style={{ backgroundColor: colors.primarySoft, borderColor: colors.primaryDark }}>
          <Text style={{ color: colors.text, fontSize: 20, fontWeight: '800' }}>{t('mesa.total', { amount: money(total) })}</Text>
          {parsed.length === 0 ? (
            <Text style={{ color: colors.text, fontSize: 17 }}>{t('mesa.equal', { count: people, amount: money(Math.round(total / people)) })}</Text>
          ) : sharedPart(bill) > 0 ? (
            <Text style={{ color: colors.text, fontSize: 17 }}>🤝 {t('mesa.shared', { count: people, amount: money(sharedPart(bill)) })}</Text>
          ) : null}
          {parsed.length > 0 && total > itemsSum ? (
            <Text style={{ color: colors.text, fontSize: 17 }}>🧾 {t('fixa.extraLine', { amount: money(total - itemsSum), each: money(Math.round((total - itemsSum) / people)) })}</Text>
          ) : null}
          {itemsSum > total ? <Text style={{ color: colors.danger, fontSize: 16 }}>{t('mesa.itemsOver', { amount: money(itemsSum - total) })}</Text> : null}
        </Card>
      ) : null}

      {!canBePaid ? (
        <Card style={{ borderColor: colors.warning }}>
          <Text style={{ color: colors.text, fontSize: 17 }}>⚠️ {t('mesa.needPay')}</Text>
          <Button label={t('pay.title')} variant="secondary" onPress={() => router.push('/settings')} />
        </Card>
      ) : null}

      {!fits ? (
        <Card style={{ borderColor: colors.warning }}>
          <Text style={{ color: colors.text, fontSize: 17 }}>⚠️ {t('misc.tooManyItems')}</Text>
        </Card>
      ) : null}

      <BigButton emoji="🍽️" label={t('mesa.create')} onPress={() => (ready ? create() : undefined)} variant={ready ? 'primary' : 'secondary'} />
      {!valid && itemsSum <= total ? <Muted style={{ textAlign: 'center' }}>{t('mesa.needTotal')}</Muted> : null}
      {valid && !payerName ? <Muted style={{ textAlign: 'center' }}>{t('misc.payerNeeded')}</Muted> : null}
    </Screen>
  );
}

function Stepper({ label, onPress, a11y }: { label: string; onPress: () => void; a11y: string }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={a11y}
      style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }}
    >
      <Text style={{ color: colors.text, fontSize: 32, fontWeight: '700' }}>{label}</Text>
    </Pressable>
  );
}

/** El QR de la mesa y quién ha pagado ya. */
function TableQr({ groupId }: { groupId: string }) {
  const { state, dispatch } = useStore();
  const i18n = useI18n();
  const { t, moneyIn } = i18n;
  const [note, setNote] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const group = state.groups.find((g) => g.id === groupId)!;
  const bill = group.table!;
  const money = (c: number) => moneyIn(c, group.currency ?? bill.c);
  const link = billLink(webBase(), bill);
  const me = group.members.find((m) => m.isMe);
  const expense = state.expenses.find((e) => e.groupId === group.id);
  const paid = state.settlements.filter((s) => s.groupId === group.id);
  const paidSum = paid.reduce((s, x) => s + x.amount, 0);
  const total = expense?.amount ?? billTotal(bill);
  const unpaid = tableUnpaid(group, state.settlements);
  const nameOf = (id: string) => group.members.find((m) => m.id === id)?.name ?? '?';
  const [cashOpen, setCashOpen] = useState(false);
  const [cashName, setCashName] = useState('');
  const [cashAmount, setCashAmount] = useState('');
  const suggested = suggestedShare(group, expense, state.settlements);

  function openCash() {
    setCashOpen(true);
    setCashName('');
    setCashAmount(suggested > 0 ? plainAmount(suggested, group.currency ?? bill.c).replace('.', ',') : '');
  }

  /** Alguien le ha dado su parte en mano (o pagó sin mandar el aviso). */
  function saveCash() {
    const amount = parseAmount(cashAmount) ?? 0;
    if (!cashName.trim() || amount <= 0) return;
    const claim = cashClaim(bill, cashName, amount);
    const msg = tableClaimMessage(i18n, claim, previewTableClaim(state, claim), group.currency ?? bill.c);
    dispatch({ type: 'tableClaim', claim });
    setNote(msg.text);
    setWarning(msg.warning);
    setCashOpen(false);
  }

  /** Recordatorio amable al grupo para los que aún no han pagado. */
  async function remind() {
    const message = bill.m ? t('mesa2.reminder', { place: bill.m, link }) : t('mesa2.reminderNoPlace', { link });
    if (Platform.OS === 'web') {
      await Clipboard.setStringAsync(message).catch(() => {});
      setCopied(true);
      setTimeout(() => setCopied(false), 6000);
    } else await Share.share({ message });
  }

  async function share() {
    const message = bill.m ? t('mesa.shareMessage', { place: bill.m, link }) : t('fixa.shareMessageNoPlace', { link });
    if (Platform.OS === 'web') {
      await Clipboard.setStringAsync(message).catch(() => {});
      setCopied(true);
      setTimeout(() => setCopied(false), 6000);
    } else await Share.share({ message });
  }

  async function paste() {
    const text = await Clipboard.getStringAsync().catch(() => '');
    const claim = findClaimInText(text ?? '');
    setWarning(null);
    if (!claim) {
      setNote(t('mesa.pasteNone'));
      return;
    }
    if (claim.b !== bill.id) {
      setNote(t('mesa.claimUnknown'));
      return;
    }
    // Se mira antes qué se va a apuntar de verdad, para decirlo bien.
    const msg = tableClaimMessage(i18n, claim, previewTableClaim(state, claim), group.currency ?? bill.c);
    dispatch({ type: 'tableClaim', claim });
    setNote(msg.text);
    setWarning(msg.warning);
  }

  return (
    <Screen>
      <Stack.Screen options={{ headerShown: true, title: bill.m || t('mesa.title') }} />
      <Text style={{ color: colors.text, fontSize: 22, fontWeight: '800', textAlign: 'center' }}>{t('mesa.showQr')}</Text>
      <QrCode value={link} size={360} />
      <Muted style={{ textAlign: 'center', fontSize: 16 }}>{t('mesa.total', { amount: money(total) })} · {t('mesa.peopleCount', { count: bill.n })}</Muted>
      <BigButton emoji="📤" label={t('mesa.sendLink')} variant="secondary" onPress={share} />
      {copied ? <Notice text={t('fixa.messageCopied')} /> : null}

      <Card>
        <H2>{t('mesa.whoPaid')}</H2>
        {paid.length === 0 ? <Muted>{t('mesa.nobodyYet')}</Muted> : null}
        {unpaid > 0 ? <Text style={{ color: colors.warning, fontSize: 17, fontWeight: '700' }}>{t('fixa.tableUnpaid', { count: unpaid })}</Text> : null}
        {paid.map((s) => (
          <Row key={s.id} style={{ justifyContent: 'space-between' }}>
            <Text style={{ color: colors.text, fontSize: 18, flex: 1 }} numberOfLines={1}>
              {s.method === 'cash' ? '💵' : '✅'} {nameOf(s.from)}
            </Text>
            <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700' }}>{money(s.amount)}</Text>
          </Row>
        ))}
        <Row style={{ justifyContent: 'space-between', borderTopWidth: 1, borderColor: colors.border, paddingTop: space.sm }}>
          <Text style={{ color: colors.textMuted, fontSize: 17 }}>{t('mesa.yours')}</Text>
          <Text style={{ color: colors.text, fontSize: 18, fontWeight: '800' }}>{money(me && expense?.shares ? expense.shares[me.id] ?? 0 : total - paidSum)}</Text>
        </Row>
        {unpaid > 0 ? <Button label={`🔔 ${t('mesa2.remind')}`} onPress={remind} /> : null}
        <Button label={t('mesa.paste')} variant="secondary" onPress={paste} />
        {cashOpen ? (
          <View style={{ gap: space.sm, borderTopWidth: 1, borderColor: colors.border, paddingTop: space.sm }}>
            <H2>💵 {t('mesa2.cashTitle')}</H2>
            <Input label={t('mesa2.cashName')} placeholder={t('mesa.whoPlaceholder')} value={cashName} onChangeText={setCashName} autoCapitalize="words" />
            <Input label={t('mesa2.cashAmount')} keyboardType="decimal-pad" placeholder={money(0)} value={cashAmount} onChangeText={setCashAmount} />
            <Button label={t('mesa2.cashSave')} onPress={saveCash} disabled={!cashName.trim() || !(parseAmount(cashAmount) ?? 0)} />
            <Button label={t('common.cancel')} variant="ghost" onPress={() => setCashOpen(false)} />
          </View>
        ) : (
          <Button label={`💵 ${t('mesa2.cashTitle')}`} variant="ghost" onPress={openCash} />
        )}
        {note ? <Text style={{ color: colors.text, fontSize: 16, textAlign: 'center' }}>{note}</Text> : null}
        {warning ? <Text style={{ color: colors.danger, fontSize: 16, textAlign: 'center' }}>⚠️ {warning}</Text> : null}
      </Card>
      <Button label={t('common.back')} variant="ghost" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
    </Screen>
  );
}
