import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { parseAmount } from '@/domain/money';
import type { Group, GroupKind } from '@/domain/types';
import { useI18n, type TKey } from '@/i18n';
import { newId, useStore } from '@/store/store';
import { Button, Card, Chip, H2, Input, Muted, Row, Screen, Title } from '@/ui/components';
import { CurrencyButton, CurrencyPicker } from '@/ui/CurrencyPicker';
import { IncomeSplit } from '@/ui/IncomeSplit';
import { colors, space } from '@/ui/theme';

const KINDS: { id: GroupKind; emoji: string; hint: TKey }[] = [
  { id: 'couple', emoji: '❤️', hint: 'kind.coupleHint' },
  { id: 'flat', emoji: '🏠', hint: 'kind.flatHint' },
  { id: 'trip', emoji: '✈️', hint: 'kind.tripHint' },
  { id: 'other', emoji: '👥', hint: 'kind.otherHint' },
];

const EMOJIS: Record<GroupKind, string[]> = {
  couple: ['❤️', '💑', '🏡', '🐶'],
  flat: ['🏠', '🛋️', '🔑', '🎓'],
  trip: ['✈️', '🏖️', '🏔️', '🚗', '🎒'],
  other: ['👥', '🍻', '⚽', '🎁', '🎉'],
};

const RATIOS: [number, number][] = [
  [50, 50],
  [60, 40],
  [70, 30],
];

/** Nuevo grupo: primero el tipo, después lo que ese tipo necesita. */
export default function NewGroup() {
  const { state, dispatch } = useStore();
  const i18n = useI18n();
  const { t } = i18n;
  const [kind, setKind] = useState<GroupKind | null>(null);
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('');
  const [others, setOthers] = useState('');
  const [currency, setCurrency] = useState(i18n.currency);
  const [picking, setPicking] = useState(false);
  const [budget, setBudget] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [ratio, setRatio] = useState<[number, number]>([50, 50]);

  if (!kind) {
    return (
      <Screen>
        <Muted>{t('gx.type')}</Muted>
        {KINDS.map((k) => (
          <Pressable key={k.id} accessibilityRole="button" onPress={() => { setKind(k.id); setEmoji(EMOJIS[k.id][0]); }}>
            <Card>
              <Row>
                <Text style={{ fontSize: 32 }}>{k.emoji}</Text>
                <View style={{ flex: 1, gap: 2 }}>
                  <H2>{t(`kind.${k.id}`)}</H2>
                  <Muted>{t(k.hint)}</Muted>
                </View>
                <Text style={{ color: colors.primary, fontSize: 22 }}>›</Text>
              </Row>
            </Card>
          </Pressable>
        ))}
        <Button label={t('common.cancel')} variant="ghost" onPress={() => router.back()} />
      </Screen>
    );
  }

  const names = others.split(',').map((n) => n.trim()).filter(Boolean);
  const valid = name.trim() && names.length > 0;

  function create() {
    const meId = newId();
    const members = [{ id: meId, name: state.profile.name || t('common.me'), isMe: true }, ...names.map((n) => ({ id: newId(), name: n }))];
    const budgetCents = parseAmount(budget) ?? undefined;
    const group: Group = {
      id: newId(),
      name: name.trim(),
      emoji,
      kind: kind!,
      currency,
      createdAt: new Date().toISOString(),
      members,
      budget: budgetCents || undefined,
      trip: kind === 'trip' && (start || end) ? { start: start || undefined, end: end || undefined } : undefined,
      // Pareja con reparto distinto de 50/50: se guarda como pesos por defecto.
      weights: kind === 'couple' && members.length === 2 && ratio[0] !== ratio[1] ? { [members[0].id]: ratio[0], [members[1].id]: ratio[1] } : undefined,
    };
    dispatch({ type: 'addGroup', group });
    router.replace({ pathname: '/group/[id]', params: { id: group.id } });
  }

  return (
    <Screen>
      <Title>
        {EMOJIS[kind][0]} {t(`kind.${kind}`)}
      </Title>
      <Row style={{ flexWrap: 'wrap' }}>
        {EMOJIS[kind].map((e) => (
          <Chip key={e} label={e} selected={emoji === e} onPress={() => setEmoji(e)} />
        ))}
      </Row>
      <Input label={t('groups.name')} placeholder={t('groups.namePlaceholder')} value={name} onChangeText={setName} />
      <Input label={t('groups.withWho')} placeholder={t('groups.withWhoPlaceholder')} value={others} onChangeText={setOthers} />

      <View style={{ gap: space.sm }}>
        <Muted>{t('gx.currency')}</Muted>
        <Row>
          <CurrencyButton value={currency} onPress={() => setPicking(true)} />
          <Muted style={{ flex: 1 }}>{i18n.currencyName(currency)}</Muted>
        </Row>
      </View>

      {kind === 'couple' && names.length === 1 ? (
        <View style={{ gap: space.sm }}>
          <Muted>{t('split.defaultSplit')}</Muted>
          <Row style={{ flexWrap: 'wrap' }}>
            {RATIOS.map((r) => (
              <Chip key={r.join()} label={`${t('common.me')} ${r[0]} / ${names[0]} ${r[1]}`} selected={ratio[0] === r[0]} onPress={() => setRatio(r)} />
            ))}
            {RATIOS.slice(1).map((r) => (
              <Chip key={`i${r.join()}`} label={`${t('common.me')} ${r[1]} / ${names[0]} ${r[0]}`} selected={ratio[0] === r[1] && ratio[1] === r[0]} onPress={() => setRatio([r[1], r[0]])} />
            ))}
          </Row>
          {RATIOS.some((r) => (r[0] === ratio[0] && r[1] === ratio[1]) || (r[1] === ratio[0] && r[0] === ratio[1])) ? null : (
            <Text style={{ color: colors.text, fontSize: 17, fontWeight: '700' }}>{t('couple.result', { a: ratio[0], b: ratio[1], name: names[0] })}</Text>
          )}
          <IncomeSplit me={state.profile.name || t('common.me')} myIncome={state.profile.income?.monthly} other={names[0]} onApply={setRatio} />
          <Muted>{t('split.weightsHint')}</Muted>
        </View>
      ) : null}

      {kind === 'trip' ? (
        <Row>
          <View style={{ flex: 1 }}>
            <Input label={t('gx.startDate')} placeholder="2026-11-01" value={start} onChangeText={setStart} autoCapitalize="none" />
          </View>
          <View style={{ flex: 1 }}>
            <Input label={t('gx.endDate')} placeholder="2026-11-10" value={end} onChangeText={setEnd} autoCapitalize="none" />
          </View>
        </Row>
      ) : null}

      {kind !== 'other' ? (
        <Input
          label={`${kind === 'trip' ? t('gx.budgetTrip') : t('gx.budgetMonth')} (${currency})`}
          placeholder="—"
          keyboardType="decimal-pad"
          value={budget}
          onChangeText={setBudget}
        />
      ) : null}

      <Button label={t('groups.create')} disabled={!valid} onPress={create} />
      <Button label={t('common.back')} variant="ghost" onPress={() => setKind(null)} />
      <CurrencyPicker visible={picking} value={currency} onClose={() => setPicking(false)} onSelect={setCurrency} />
    </Screen>
  );
}
