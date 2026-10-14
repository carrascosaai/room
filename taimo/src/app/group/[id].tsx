import * as Clipboard from 'expo-clipboard';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Platform, Pressable, Share, Switch, Text, View } from 'react-native';

import { category as categoryInfo } from '@/domain/categories';
import { groupBudgetPlan, groupInsights, tripDays } from '@/domain/groupInsights';
import { balances, nextPayer, POT, potContributions, potLeft, suggestTransfers, withoutPot } from '@/domain/groups';
import { parseAmount } from '@/domain/money';
import { buildPush } from '@/domain/sync';
import type { Group, Recurring } from '@/domain/types';
import { useI18n } from '@/i18n';
import { newId, useStore } from '@/store/store';
import { createRemoteGroup, inviteLink, SyncError, syncConfigured } from '@/sync/api';
import { Button, Card, Chip, Empty, H2, Input, Muted, ProgressBar, Row, Screen } from '@/ui/components';
import { confirm } from '@/ui/confirm';
import { CurrencyButton, CurrencyPicker, currencyFlag } from '@/ui/CurrencyPicker';
import { ExpenseRow } from '@/ui/ExpenseRow';
import { PayButtons } from '@/ui/PayButtons';
import { paymentLines } from '@/ui/messages';
import { colors, radius, space } from '@/ui/theme';

export default function GroupDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state, dispatch } = useStore();
  const i18n = useI18n();
  const { t, moneyIn } = i18n;
  const [newMember, setNewMember] = useState('');
  const [sharing, setSharing] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const group = state.groups.find((g) => g.id === id);

  if (!group) {
    return (
      <Screen>
        <Empty emoji="🤷" text={t('group.missing')} />
      </Screen>
    );
  }

  const cur = group.currency ?? i18n.currency;
  const money = (c: number) => moneyIn(c, cur);
  const name = (memberId: string) => {
    if (memberId === POT) return `🫙 ${t('pot.name')}`;
    const m = group.members.find((x) => x.id === memberId);
    return !m ? t('common.unknown') : m.isMe ? t('common.you') : m.name;
  };
  // En los mensajes que se mandan a otros, cada uno con su nombre (nunca "Tú").
  const realName = (memberId: string) => {
    if (memberId === POT) return `🫙 ${t('pot.name')}`;
    const m = group.members.find((x) => x.id === memberId);
    return !m ? t('common.unknown') : m.isMe ? state.profile.name || m.name : m.name;
  };
  const expenses = state.expenses.filter((e) => e.groupId === group.id);
  const balance = balances(group, state.expenses, state.settlements);
  const transfers = suggestTransfers(balance);
  const insights = groupInsights(group, state.expenses);
  const plan = groupBudgetPlan(group, state.expenses);
  const days = tripDays(group);
  const payer = group.kind === 'couple' || group.kind === 'flat' ? nextPayer(withoutPot(balance)) : null;
  const currencies = Object.entries(insights.byCurrency).filter(([c]) => c && c !== cur);

  function settle(from: string, to: string, amount: number) {
    dispatch({ type: 'addSettlement', settlement: { id: newId(), groupId: group!.id, from, to, amount, date: new Date().toISOString() } });
  }

  async function remind(from: string, to: string, amount: number) {
    const toMe = group!.members.find((m) => m.id === to)?.isMe;
    const pay = toMe ? paymentLines(state.profile.payment, amount, cur) : [];
    const message = [t('gx.remindMessage', { name: realName(from), amount: money(amount), to: realName(to), group: group!.name }), ...(pay.length ? ['', t('pay.payMe'), ...pay] : [])].join('\n');
    await shareText(message);
  }

  async function shareText(message: string) {
    if (Platform.OS === 'web') {
      await Clipboard.setStringAsync(message).catch(() => {});
      setShareError(t('group.inviteCopied'));
    } else await Share.share({ message });
  }

  /** Resumen para mandar al grupo: total, por persona, quién debe a quién y cómo pagarte. */
  function summaryText(): string {
    const lines = [
      `${group!.emoji} ${group!.name}`,
      group!.weights
        ? t('settings.total', { amount: money(insights.total) })
        : t('pay.summaryTotal', { total: money(insights.total), perPerson: money(Math.round(insights.total / Math.max(1, group!.members.length))) }),
    ];
    if (group!.weights) lines.push(group!.members.map((m) => `${realName(m.id)}: ${money(insights.shareOf[m.id] ?? 0)}`).join(' · '));
    for (const c of insights.byCategory.slice(0, 5)) lines.push(`${categoryInfo(c.category).emoji} ${t(`cat.${c.category}`)}: ${money(c.total)}`);
    if (transfers.length) {
      lines.push('', `${t('group.settleTitle')}:`);
      for (const tr of transfers) lines.push(`• ${realName(tr.from)} → ${realName(tr.to)}: ${money(tr.amount)}`);
      const owedToMe = transfers.filter((tr) => group!.members.find((m) => m.id === tr.to)?.isMe).reduce((a, tr) => a + tr.amount, 0);
      const pay = owedToMe ? paymentLines(state.profile.payment, owedToMe, cur) : [];
      if (pay.length) lines.push('', t('pay.payMe'), ...pay);
    }
    lines.push('', t('pay.madeWith'));
    return lines.join('\n');
  }

  async function invite() {
    if (!group) return;
    setShareError(null);
    let code = group.remote?.code;
    if (!code) {
      setSharing(true);
      try {
        const startedAt = new Date().toISOString();
        const snapshot = await createRemoteGroup(group, buildPush(state, group.id));
        dispatch({ type: 'applySnapshot', groupId: group.id, snapshot, syncStartedAt: startedAt });
        code = snapshot.group.code;
      } catch (e) {
        setShareError(e instanceof SyncError && e.kind === 'network' ? t('join.offline') : t('group.shareError'));
        return;
      } finally {
        setSharing(false);
      }
    }
    const message = t('group.inviteMessage', { name: group.name, link: inviteLink(code), code });
    if (Platform.OS === 'web') {
      await Clipboard.setStringAsync(message).catch(() => {});
      setShareError(t('group.inviteCopied'));
    } else {
      await Share.share({ message });
    }
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: `${group.emoji} ${group.name}` }} />

      {/* Cabecera según el tipo de grupo */}
      <Card style={{ backgroundColor: colors.primarySoft, borderColor: colors.primaryDark }}>
        <Muted>
          {group.kind ? t(`kind.${group.kind}`) : t('group.total')}
          {days ? ` · ${t('gx.tripDays', { count: days })}` : ''}
          {group.trip?.start ? ` · ${i18n.date(group.trip.start, { day: 'numeric', month: 'short' })}${group.trip.end ? ` – ${i18n.date(group.trip.end, { day: 'numeric', month: 'short' })}` : ''}` : ''}
        </Muted>
        <Text style={{ color: colors.text, fontSize: 34, fontWeight: '800' }}>{money(insights.total)}</Text>
        {group.members.length > 1 && !group.weights ? (
          <Muted>{t('gx.costPerPerson', { amount: money(Math.round(insights.total / group.members.length)) })}</Muted>
        ) : null}
        {plan ? (
          <View style={{ gap: space.xs }}>
            <ProgressBar progress={plan.spent / plan.budget} />
            <Text style={{ color: plan.remaining < 0 ? colors.danger : colors.text }}>
              {plan.remaining < 0
                ? t('pay.budgetOver', { amount: money(-plan.remaining), budget: money(plan.budget) })
                : t('gx.budgetLeft', { amount: money(plan.remaining), budget: money(plan.budget) })}
            </Text>
            {plan.remaining > 0 ? (
              <View style={{ backgroundColor: colors.bg, borderRadius: radius.md, padding: space.md, gap: 2 }}>
                <Text style={{ color: colors.text }}>{t('gx.perDayAll', { amount: money(plan.perDay) })}</Text>
                <Muted>{t('gx.perPerson', { amount: money(plan.perPersonPerDay) })}</Muted>
              </View>
            ) : null}
          </View>
        ) : null}
      </Card>

      {payer ? (
        <Card>
          <Row>
            <Text style={{ fontSize: 24 }}>👉</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.text, fontWeight: '700', fontSize: 16 }}>{t('gx.nextPayer', { name: name(payer) })}</Text>
              <Muted>{t('gx.nextPayerHint')}</Muted>
            </View>
          </Row>
        </Card>
      ) : null}

      <Button label={t('group.addShared')} onPress={() => router.push({ pathname: '/add', params: { groupId: group.id } })} />
      {expenses.length > 0 ? <Button label={`📤 ${t('pay.share')}`} variant="secondary" onPress={() => shareText(summaryText())} /> : null}

      {/* Saldos y cómo quedar en paz */}
      <Card>
        {group.members.map((m) => {
          const b = balance[m.id] ?? 0;
          return (
            <Row key={m.id} style={{ justifyContent: 'space-between' }}>
              <Text style={{ color: colors.text, fontSize: 15 }}>{name(m.id)}</Text>
              <Text style={{ color: b > 0 ? colors.success : b < 0 ? colors.warning : colors.textMuted }}>
                {b === 0 ? t('group.settled') : b > 0 ? t('group.isOwed', { amount: money(b) }) : t('group.owes', { amount: money(-b) })}
              </Text>
            </Row>
          );
        })}
        {transfers.length > 0 ? <H2>{t('group.settleTitle')}</H2> : null}
        {transfers.map((tr) => (
          <View key={`${tr.from}-${tr.to}`} style={{ gap: space.sm }}>
            <Text style={{ color: colors.text, fontSize: 15 }}>
              {name(tr.from)} → {name(tr.to)}: <Text style={{ fontWeight: '700' }}>{money(tr.amount)}</Text>
            </Text>
            {group.members.find((m) => m.id === tr.from)?.isMe ? (
              <PayButtons name={realName(tr.to)} pay={group.members.find((m) => m.id === tr.to)?.pay} amount={tr.amount} currency={cur} />
            ) : null}
            <Button label={t('group.markPaid')} variant="secondary" onPress={() => settle(tr.from, tr.to, tr.amount)} />
            {group.members.find((m) => m.id === tr.from)?.isMe ? null : (
              <Button label={`🔔 ${t('gx.remind')}`} variant="ghost" onPress={() => remind(tr.from, tr.to, tr.amount)} />
            )}
          </View>
        ))}
      </Card>

      {/* Resumen: quién ha pagado qué, categorías y monedas */}
      {insights.total > 0 ? (
        <Card>
          <H2>{t('gx.whoPaid')}</H2>
          {group.members.map((m) => {
            const paid = insights.paidBy[m.id] ?? 0;
            return (
              <View key={m.id} style={{ gap: 4 }}>
                <Row style={{ justifyContent: 'space-between' }}>
                  <Text style={{ color: colors.text }}>{name(m.id)}</Text>
                  <Muted>{t('gx.paidLine', { paid: money(paid), share: money(insights.shareOf[m.id] ?? 0) })}</Muted>
                </Row>
                <ProgressBar progress={paid / Math.max(1, insights.total)} alerts={false} />
              </View>
            );
          })}
          <H2>{t('stats.byCategory')}</H2>
          {insights.byCategory.slice(0, 6).map((c) => (
            <Row key={c.category} style={{ justifyContent: 'space-between' }}>
              <Text style={{ color: colors.text }}>
                {categoryInfo(c.category).emoji} {t(`cat.${c.category}`)}
              </Text>
              <Text style={{ color: colors.text, fontWeight: '600' }}>{money(c.total)}</Text>
            </Row>
          ))}
          {currencies.length > 0 ? (
            <>
              <H2>{t('gx.paidIn')}</H2>
              <Row style={{ flexWrap: 'wrap' }}>
                {currencies.map(([c, v]) => (
                  <Chip key={c} label={`${currencyFlag(c)} ${moneyIn(v, c)}`} onPress={() => router.push('/converter')} />
                ))}
              </Row>
            </>
          ) : null}
        </Card>
      ) : null}

      {group.pot ? <PotCard group={group} left={potLeft(balance)} name={name} money={money} /> : null}

      {group.kind === 'flat' || group.kind === 'couple' ? <RecurringCard group={group} /> : null}

      {syncConfigured ? (
        <Card>
          <H2>{group.remote ? t('group.sharedTitle') : t('group.shareTitle')}</H2>
          <Muted>{group.remote ? t('group.sharedText', { code: group.remote.code }) : t('group.shareText')}</Muted>
          {sharing ? <ActivityIndicator color={colors.primary} /> : <Button label={t('group.invite')} variant="secondary" onPress={invite} />}
          {shareError ? <Muted>{shareError}</Muted> : null}
        </Card>
      ) : null}

      <Card>
        <H2>{t('group.expenses')}</H2>
        {expenses.length === 0 ? (
          <Empty emoji="🧾" text={t('group.noExpenses')} />
        ) : (
          expenses.map((e) => <ExpenseRow key={e.id} expense={e} groups={state.groups} perspective="group" />)
        )}
      </Card>

      <Card>
        <H2>{t('group.members')}</H2>
        <Row>
          <View style={{ flex: 1 }}>
            <Input placeholder={t('group.addMemberPlaceholder')} value={newMember} onChangeText={setNewMember} />
          </View>
          <Button
            label={t('group.addMember')}
            variant="secondary"
            disabled={!newMember.trim()}
            onPress={() => {
              dispatch({ type: 'addMember', groupId: group.id, member: { id: newId(), name: newMember.trim() } });
              setNewMember('');
            }}
          />
        </Row>
      </Card>

      {editing ? (
        <GroupSettings group={group} onDone={() => setEditing(false)} />
      ) : (
        <Button label={`⚙️ ${t('gx.settings')}`} variant="secondary" onPress={() => setEditing(true)} />
      )}

      <Button
        label={group.remote ? t('group.leave') : t('group.delete')}
        variant="danger"
        onPress={() =>
          confirm(group.remote ? t('group.leaveConfirm') : t('group.deleteConfirm'), t('common.cancel'), t('common.delete'), () => {
            dispatch({ type: 'deleteGroup', id: group.id });
            router.back();
          })
        }
      />
    </Screen>
  );
}

/** Gastos fijos de cada mes (alquiler, luz…), que se apuntan solos. */
function RecurringCard({ group }: { group: Group }) {
  const { dispatch } = useStore();
  const { t, moneyIn, currency } = useI18n();
  const cur = group.currency ?? currency;
  const me = group.members.find((m) => m.isMe)?.id ?? group.members[0].id;
  const [adding, setAdding] = useState(false);
  const [rName, setRName] = useState('');
  const [rAmount, setRAmount] = useState('');
  const [rDay, setRDay] = useState('1');
  const [rPaidBy, setRPaidBy] = useState(me);
  const list = group.recurring ?? [];
  const name = (mid: string) => {
    const m = group.members.find((x) => x.id === mid);
    return m?.isMe ? t('common.you') : m?.name ?? '?';
  };

  function add() {
    const amount = parseAmount(rAmount);
    if (!rName.trim() || !amount) return;
    const day = Math.min(28, Math.max(1, Number(rDay) || 1));
    const item: Recurring = { id: newId(), name: rName.trim(), amount, category: 'casa', paidBy: rPaidBy, day };
    dispatch({ type: 'updateGroup', groupId: group.id, changes: { recurring: [...list, item] } });
    setAdding(false);
    setRName('');
    setRAmount('');
  }

  return (
    <Card>
      <H2>{t('gx.recurring')}</H2>
      <Muted>{t('gx.recurringHint')}</Muted>
      {list.map((r) => (
        <Row key={r.id} style={{ justifyContent: 'space-between' }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.text, fontWeight: '600' }}>🔁 {r.name}</Text>
            <Muted>{t('gx.recurringLine', { day: r.day, name: name(r.paidBy) })}</Muted>
          </View>
          <Text style={{ color: colors.text, fontWeight: '600' }}>{moneyIn(r.amount, cur)}</Text>
          <Pressable
            hitSlop={10}
            accessibilityLabel={t('common.delete')}
            onPress={() => dispatch({ type: 'updateGroup', groupId: group.id, changes: { recurring: list.filter((x) => x.id !== r.id) } })}
          >
            <Text style={{ color: colors.danger, fontSize: 18, marginLeft: space.sm }}>✕</Text>
          </Pressable>
        </Row>
      ))}
      {adding ? (
        <View style={{ gap: space.sm }}>
          <Input placeholder={t('gx.recurringName')} value={rName} onChangeText={setRName} />
          <Row>
            <View style={{ flex: 1 }}>
              <Input placeholder={`${t('add.amount')} (${cur})`} keyboardType="decimal-pad" value={rAmount} onChangeText={setRAmount} />
            </View>
            <View style={{ width: 120 }}>
              <Input placeholder={t('gx.recurringDay')} keyboardType="number-pad" value={rDay} onChangeText={setRDay} />
            </View>
          </Row>
          <Muted>{t('add.paidBy')}</Muted>
          <Row style={{ flexWrap: 'wrap' }}>
            {group.members.map((m) => (
              <Chip key={m.id} label={name(m.id)} selected={rPaidBy === m.id} onPress={() => setRPaidBy(m.id)} />
            ))}
          </Row>
          <Button label={t('common.save')} onPress={add} disabled={!rName.trim() || !parseAmount(rAmount)} />
        </View>
      ) : (
        <Button label={t('gx.recurringAdd')} variant="ghost" onPress={() => setAdding(true)} />
      )}
    </Card>
  );
}

/** Ajustes del grupo: nombre, moneda, presupuesto, fechas y reparto por defecto. */
function GroupSettings({ group, onDone }: { group: Group; onDone: () => void }) {
  const { dispatch } = useStore();
  const i18n = useI18n();
  const { t } = i18n;
  const [name, setName] = useState(group.name);
  const [currency, setCurrency] = useState(group.currency ?? i18n.currency);
  const [picking, setPicking] = useState(false);
  const [budget, setBudget] = useState(group.budget ? String(group.budget / 100) : '');
  const [start, setStart] = useState(group.trip?.start ?? '');
  const [end, setEnd] = useState(group.trip?.end ?? '');
  const [weights, setWeights] = useState<Record<string, string>>(
    Object.fromEntries(group.members.map((m) => [m.id, String(group.weights?.[m.id] ?? 1)])),
  );
  const [pot, setPot] = useState(!!group.pot);

  function save() {
    const w = Object.fromEntries(Object.entries(weights).map(([k, v]) => [k, Number(v.replace(',', '.')) || 0]));
    const allEqual = new Set(Object.values(w)).size <= 1;
    dispatch({
      type: 'updateGroup',
      groupId: group.id,
      changes: {
        name: name.trim() || group.name,
        currency,
        budget: parseAmount(budget) || undefined,
        trip: group.kind === 'trip' ? { start: start || undefined, end: end || undefined } : group.trip,
        weights: allEqual ? undefined : w,
        pot: pot || undefined,
      },
    });
    onDone();
  }

  return (
    <Card>
      <H2>{t('gx.settings')}</H2>
      <Input label={t('groups.name')} value={name} onChangeText={setName} />
      <Muted>{t('gx.currency')}</Muted>
      <Row>
        <CurrencyButton value={currency} onPress={() => setPicking(true)} />
        <Muted style={{ flex: 1 }}>{i18n.currencyName(currency)}</Muted>
      </Row>
      {group.kind !== 'other' ? (
        <Input
          label={`${group.kind === 'trip' ? t('gx.budgetTrip') : t('gx.budgetMonth')} (${currency})`}
          keyboardType="decimal-pad"
          placeholder="—"
          value={budget}
          onChangeText={setBudget}
        />
      ) : null}
      {group.kind === 'trip' ? (
        <Row>
          <View style={{ flex: 1 }}>
            <Input label={t('gx.startDate')} placeholder="2026-11-01" value={start} onChangeText={setStart} autoCapitalize="none" />
          </View>
          <View style={{ flex: 1 }}>
            <Input label={t('gx.endDate')} placeholder="2026-11-10" value={end} onChangeText={setEnd} autoCapitalize="none" />
          </View>
        </Row>
      ) : null}
      <Muted>{t('split.defaultSplit')}</Muted>
      <Muted style={{ fontSize: 12 }}>{t('split.defaultHint')}</Muted>
      {group.members.map((m) => (
        <Row key={m.id}>
          <Text style={{ color: colors.text, flex: 1 }}>{m.isMe ? t('common.you') : m.name}</Text>
          <View style={{ width: 90 }}>
            <Input keyboardType="decimal-pad" value={weights[m.id]} onChangeText={(v) => setWeights((w) => ({ ...w, [m.id]: v }))} style={{ textAlign: 'right', paddingVertical: 8 }} />
          </View>
        </Row>
      ))}
      <Row>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ color: colors.text, fontWeight: '600' }}>🫙 {t('pot.enable')}</Text>
          <Muted>{t('pot.hint')}</Muted>
        </View>
        <Switch value={pot} onValueChange={setPot} trackColor={{ true: colors.primary, false: colors.border }} />
      </Row>
      <Button label={t('gx.saveSettings')} onPress={save} />
      <Button label={t('common.cancel')} variant="ghost" onPress={onDone} />
      <CurrencyPicker visible={picking} value={currency} onClose={() => setPicking(false)} onSelect={setCurrency} />
    </Card>
  );
}

/** Bote común: cuánto queda, lo que ha puesto cada uno y poner dinero. */
function PotCard({ group, left, name, money }: { group: Group; left: number; name: (id: string) => string; money: (c: number) => string }) {
  const { state, dispatch } = useStore();
  const { t } = useI18n();
  const me = group.members.find((m) => m.isMe)?.id ?? group.members[0].id;
  const [who, setWho] = useState(me);
  const [amount, setAmount] = useState('');
  const put = potContributions(group, state.settlements);

  function add() {
    const value = parseAmount(amount);
    if (!value) return;
    dispatch({ type: 'addSettlement', settlement: { id: newId(), groupId: group.id, from: who, to: POT, amount: value, date: new Date().toISOString() } });
    setAmount('');
  }

  return (
    <Card>
      <H2>🫙 {t('pot.title')}</H2>
      <Text style={{ color: left < 0 ? colors.danger : colors.primary, fontSize: 28, fontWeight: '800' }}>{t('pot.left', { amount: money(left) })}</Text>
      {group.members
        .filter((m) => put[m.id])
        .map((m) => (
          <Row key={m.id} style={{ justifyContent: 'space-between' }}>
            <Text style={{ color: colors.text }}>{name(m.id)}</Text>
            <Muted>{money(put[m.id])}</Muted>
          </Row>
        ))}
      <Muted>{t('pot.who')}</Muted>
      <Row style={{ flexWrap: 'wrap' }}>
        {group.members.map((m) => (
          <Chip key={m.id} label={name(m.id)} selected={who === m.id} onPress={() => setWho(m.id)} />
        ))}
      </Row>
      <Row>
        <View style={{ flex: 1 }}>
          <Input value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder={money(5000)} />
        </View>
        <Button label={t('pot.add')} onPress={add} disabled={!parseAmount(amount)} />
      </Row>
    </Card>
  );
}
