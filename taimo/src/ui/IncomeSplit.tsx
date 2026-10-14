import { useState } from 'react';
import { Text, View } from 'react-native';

import { incomeWeights } from '@/domain/groups';
import { parseAmount } from '@/domain/money';
import { useI18n } from '@/i18n';

import { Button, Input, Muted } from './components';
import { colors, radius, space } from './theme';

/**
 * Pareja: calcula el reparto según lo que gana cada uno (1.800 y 1.200 → 60/40).
 * Los sueldos no se guardan; solo se devuelve el porcentaje.
 */
export function IncomeSplit({ me, myIncome, other, onApply }: { me: string; myIncome?: number; other: string; onApply: (ratio: [number, number]) => void }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [mine, setMine] = useState(myIncome ? String(myIncome / 100) : '');
  const [theirs, setTheirs] = useState('');
  const w = incomeWeights({ a: parseAmount(mine) ?? 0, b: parseAmount(theirs) ?? 0 });

  if (!open) return <Button label={t('couple.byIncome')} variant="ghost" onPress={() => setOpen(true)} />;
  return (
    <View style={{ gap: space.sm, backgroundColor: colors.bg, borderRadius: radius.md, padding: space.md }}>
      <Input label={t('couple.incomeOf', { name: me })} keyboardType="decimal-pad" value={mine} onChangeText={setMine} />
      <Input label={t('couple.incomeOf', { name: other })} keyboardType="decimal-pad" value={theirs} onChangeText={setTheirs} />
      {w ? <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700', textAlign: 'center' }}>{t('couple.result', { a: w.a, b: w.b, name: other })}</Text> : null}
      <Button
        label={t('couple.use')}
        disabled={!w}
        onPress={() => {
          if (!w) return;
          onApply([w.a, w.b]);
          setOpen(false);
        }}
      />
      <Muted>{t('couple.incomeNote')}</Muted>
    </View>
  );
}
