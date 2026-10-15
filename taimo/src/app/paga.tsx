import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import {
  canSpend,
  goalProgress,
  isoDay,
  JAR_EMOJI,
  jarBalances,
  JARS,
  nextPayday,
  splitAmount,
  SPLITS,
  type Jar,
  type Kid,
  type Split,
} from '@/domain/allowance';
import { parseAmount } from '@/domain/money';
import { useI18n } from '@/i18n';
import { newId, useStore } from '@/store/store';
import { Button, Card, Chip, Empty, H2, Input, Muted, ProgressBar, Row, Screen } from '@/ui/components';
import { confirm } from '@/ui/confirm';
import { colors, radius, space } from '@/ui/theme';

const EMOJIS = ['🧒', '👧', '👦', '🦄', '🦖', '🐱', '⚽', '🌟'];
/** Lunes a domingo (Date.getDay: 1..6, 0). */
const WEEKDAYS = [1, 2, 3, 4, 5, 6, 0];
const splitLabel = (s: Split) => `${s.spend}/${s.save}/${s.give}`;

/** Paga para niños: tres huchas (Gastar, Ahorrar, Dar) sin dinero real. */
export default function Allowance() {
  const { state } = useStore();
  const { t } = useI18n();
  const kids = state.kids ?? [];
  const [adding, setAdding] = useState(kids.length === 0);

  return (
    <Screen>
      <Muted>{t('kids.hint')}</Muted>
      {kids.length === 0 && !adding ? <Empty emoji="🐷" text={t('kids.empty')} /> : null}
      {kids.map((k) => (
        <KidCard key={k.id} kid={k} />
      ))}
      {adding ? (
        <KidForm onDone={() => setAdding(false)} />
      ) : (
        <Button label={`➕ ${t('kids.new')}`} variant="secondary" onPress={() => setAdding(true)} />
      )}
    </Screen>
  );
}

/** Para crear un niño o cambiar su paga. */
function KidForm({ kid, onDone }: { kid?: Kid; onDone: () => void }) {
  const { dispatch } = useStore();
  const { t, money, date } = useI18n();
  const [name, setName] = useState(kid?.name ?? '');
  const [emoji, setEmoji] = useState(kid?.emoji ?? EMOJIS[0]);
  const [amount, setAmount] = useState(kid ? String(kid.amount / 100) : '');
  const [weekday, setWeekday] = useState(kid?.weekday ?? 6);
  const [split, setSplit] = useState<Split>(kid?.split ?? SPLITS[0]);
  const value = parseAmount(amount);
  // Nombre del día en el idioma del móvil (2026-10-05 fue lunes).
  const dayName = (d: number) => date(new Date(2026, 9, 4 + (d === 0 ? 7 : d), 12), { weekday: 'long' });
  const per = value ? splitAmount(value, split) : null;

  function save() {
    if (!name.trim() || !value) return;
    if (kid) {
      dispatch({ type: 'updateKid', id: kid.id, changes: { name: name.trim(), emoji, amount: value, weekday, split } });
    } else {
      dispatch({
        type: 'addKid',
        kid: { id: newId(), name: name.trim(), emoji, amount: value, weekday, split, start: isoDay(new Date()), moves: [] },
      });
    }
    onDone();
  }

  return (
    <Card>
      <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700' }}>{kid ? t('kids.edit') : t('kids.new')}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }}>
        {EMOJIS.map((e) => (
          <Chip key={e} label={e} selected={emoji === e} onPress={() => setEmoji(e)} />
        ))}
      </ScrollView>
      <Input label={t('kids.name')} value={name} onChangeText={setName} />
      <Input label={t('kids.amount')} value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder={money(500)} />
      <Muted>{t('kids.day')}</Muted>
      <Row style={{ flexWrap: 'wrap' }}>
        {WEEKDAYS.map((d) => (
          <Chip key={d} label={dayName(d)} selected={weekday === d} onPress={() => setWeekday(d)} />
        ))}
      </Row>
      <Muted>{t('kids.split')}</Muted>
      <Row style={{ flexWrap: 'wrap' }}>
        {SPLITS.map((s) => (
          <Chip key={splitLabel(s)} label={splitLabel(s)} selected={splitLabel(s) === splitLabel(split)} onPress={() => setSplit(s)} />
        ))}
      </Row>
      {per ? (
        <Text style={{ color: colors.text, fontSize: 16 }}>
          {JARS.map((j) => `${JAR_EMOJI[j]} ${t(`kids.${j}`)} ${money(per[j])}`).join(' · ')}
        </Text>
      ) : null}
      {kid ? <Muted>{t('kids.changeHint')}</Muted> : null}
      <Button label={kid ? t('common.save') : t('kids.create')} onPress={save} disabled={!name.trim() || !value} />
      <Button label={t('common.cancel')} variant="ghost" onPress={onDone} />
    </Card>
  );
}

function KidCard({ kid }: { kid: Kid }) {
  const { dispatch } = useStore();
  const { t, money, date } = useI18n();
  const [mode, setMode] = useState<'none' | 'spend' | 'add' | 'goal' | 'edit'>('none');
  const [jar, setJar] = useState<Jar>('spend');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [goalName, setGoalName] = useState(kid.goal?.name ?? '');
  const [goalTarget, setGoalTarget] = useState(kid.goal ? String(kid.goal.target / 100) : '');
  const [warning, setWarning] = useState<string | null>(null);
  const balances = jarBalances(kid);
  const goal = goalProgress(kid);
  const next = nextPayday(kid);
  const value = parseAmount(amount);

  const close = () => {
    setMode('none');
    setAmount('');
    setNote('');
    setWarning(null);
  };

  function move() {
    if (!value) return;
    if (mode === 'spend' && !canSpend(kid, jar, value)) {
      setWarning(t('kids.notEnough', { jar: t(`kids.${jar}`), amount: money(Math.max(0, balances[jar])) }));
      return;
    }
    dispatch({
      type: 'kidMove',
      kidId: kid.id,
      move: { id: newId(), jar, amount: mode === 'spend' ? -value : value, date: new Date().toISOString(), note: note.trim() || undefined },
    });
    close();
  }

  function saveGoal() {
    const target = parseAmount(goalTarget);
    dispatch({ type: 'updateKid', id: kid.id, changes: { goal: goalName.trim() && target ? { name: goalName.trim(), target } : undefined } });
    setMode('none');
  }

  const recent = [...kid.moves].filter((m) => !m.carry).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);

  if (mode === 'edit') return <KidForm kid={kid} onDone={() => setMode('none')} />;

  return (
    <Card>
      <Row>
        <Text style={{ fontSize: 40 }}>{kid.emoji}</Text>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.text, fontSize: 24, fontWeight: '800' }}>{kid.name}</Text>
          <Muted>{t('kids.next', { date: date(next, { weekday: 'long', day: 'numeric' }), amount: money(kid.amount) })}</Muted>
        </View>
      </Row>

      {/* Las tres huchas, grandes */}
      <View style={{ flexDirection: 'row', gap: space.sm }}>
        {JARS.map((j) => (
          <View
            key={j}
            accessibilityLabel={`${t(`kids.${j}`)}: ${money(balances[j])}`}
            style={{
              flex: 1,
              alignItems: 'center',
              gap: 2,
              paddingVertical: space.md,
              paddingHorizontal: space.xs,
              borderRadius: radius.md,
              backgroundColor: j === 'save' ? colors.primarySoft : colors.surface,
              borderWidth: 1,
              borderColor: j === 'save' ? colors.primary : colors.border,
            }}
          >
            <Text style={{ fontSize: 30 }}>{JAR_EMOJI[j]}</Text>
            <Text style={{ color: colors.textMuted, fontSize: 16, fontWeight: '600' }}>{t(`kids.${j}`)}</Text>
            <Text style={{ color: colors.text, fontSize: 22, fontWeight: '800' }} adjustsFontSizeToFit numberOfLines={1}>
              {money(balances[j])}
            </Text>
          </View>
        ))}
      </View>

      {goal ? (
        <View style={{ gap: space.xs }}>
          <Text style={{ color: colors.text, fontSize: 17, fontWeight: '700' }}>
            🎯 {kid.goal!.name}: {t('kids.goalProgress', { saved: money(goal.saved), target: money(goal.target) })}
          </Text>
          <ProgressBar progress={goal.progress} color={colors.primary} alerts={false} />
          <Muted>{goal.weeks === 0 ? t('kids.goalDone') : goal.weeks ? t('kids.goalWeeks', { count: goal.weeks }) : ''}</Muted>
        </View>
      ) : null}

      {mode === 'spend' || mode === 'add' ? (
        <View style={{ gap: space.sm }}>
          <Muted>{mode === 'spend' ? t('kids.fromJar') : t('kids.toJar')}</Muted>
          <Row style={{ flexWrap: 'wrap' }}>
            {JARS.map((j) => (
              <Chip key={j} label={`${JAR_EMOJI[j]} ${t(`kids.${j}`)}`} selected={jar === j} onPress={() => setJar(j)} />
            ))}
          </Row>
          <Input label={t('goal.amount')} value={amount} onChangeText={setAmount} keyboardType="decimal-pad" />
          <Input label={t('kids.note')} value={note} onChangeText={setNote} />
          {warning ? <Text style={{ color: colors.warning, fontSize: 16 }}>{warning}</Text> : null}
          <Button label={mode === 'spend' ? t('kids.logSpend') : t('kids.addMoney')} onPress={move} disabled={!value} />
          <Button label={t('common.cancel')} variant="ghost" onPress={close} />
        </View>
      ) : mode === 'goal' ? (
        <View style={{ gap: space.sm }}>
          <Input label={t('kids.goalName')} value={goalName} onChangeText={setGoalName} />
          <Input label={t('kids.goalTarget')} value={goalTarget} onChangeText={setGoalTarget} keyboardType="decimal-pad" />
          <Button label={t('kids.goalSave')} onPress={saveGoal} />
          <Button label={t('common.cancel')} variant="ghost" onPress={() => setMode('none')} />
        </View>
      ) : (
        <View style={{ gap: space.sm }}>
          <Button label={`🛍️ ${t('kids.logSpend')}`} onPress={() => { setJar('spend'); setMode('spend'); }} />
          <Button label={`🎁 ${t('kids.addMoney')}`} variant="secondary" onPress={() => { setJar('save'); setMode('add'); }} />
          <Row style={{ flexWrap: 'wrap' }}>
            <Chip label={`🎯 ${t('kids.goal')}`} onPress={() => setMode('goal')} />
            <Chip label={`✏️ ${t('kids.edit')}`} onPress={() => setMode('edit')} />
          </Row>
        </View>
      )}

      {recent.length > 0 && mode === 'none' ? (
        <View style={{ gap: space.xs }}>
          <H2>{t('kids.history')}</H2>
          {recent.map((m) => (
            <Row key={m.id}>
              <Text style={{ fontSize: 20 }}>{JAR_EMOJI[m.jar]}</Text>
              <Text style={{ color: colors.text, fontSize: 16, flex: 1 }} numberOfLines={1}>
                {date(m.date, { day: 'numeric', month: 'short' })}
                {m.note ? ` · ${m.note}` : ''}
              </Text>
              <Text style={{ color: m.amount < 0 ? colors.text : colors.primary, fontSize: 16, fontWeight: '700' }}>
                {m.amount > 0 ? '+' : '−'}
                {money(Math.abs(m.amount))}
              </Text>
              <Button label="✕" variant="ghost" onPress={() => dispatch({ type: 'removeKidMove', kidId: kid.id, moveId: m.id })} />
            </Row>
          ))}
        </View>
      ) : null}

      {mode === 'none' ? (
        <Button
          label={t('common.delete')}
          variant="ghost"
          onPress={() => confirm(t('kids.deleteConfirm', { name: kid.name }), t('common.cancel'), t('common.delete'), () => dispatch({ type: 'deleteKid', id: kid.id }))}
        />
      ) : null}
    </Card>
  );
}
