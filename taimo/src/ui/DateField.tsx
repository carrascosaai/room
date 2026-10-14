import { Pressable, Text, View } from 'react-native';

import { useI18n } from '@/i18n';

import { Button, Muted } from './components';
import { colors, radius, space } from './theme';

const pad = (n: number) => String(n).padStart(2, '0');
const daysIn = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate();
const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

/**
 * Fecha con botones grandes − / + para día, mes y año (sin tener que escribir
 * «AAAA-MM-DD»). `value` es 'YYYY-MM-DD' o '' (sin fecha).
 */
export function DateField({ label, value, onChange, min }: { label: string; value: string; onChange: (v: string) => void; min?: string }) {
  const { t, date } = useI18n();
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) {
    return (
      <View style={{ gap: space.xs }}>
        <Muted>{label}</Muted>
        <Button label={`📅 ${t('fixa.pickDate')}`} variant="secondary" onPress={() => onChange(min && /^\d{4}-\d{2}-\d{2}$/.test(min) ? min : todayIso())} />
      </View>
    );
  }
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const set = (ny: number, nm: number, nd: number) => {
    // Mes que da la vuelta (diciembre + 1 = enero del año siguiente).
    if (nm > 12) {
      nm = 1;
      ny += 1;
    } else if (nm < 1) {
      nm = 12;
      ny -= 1;
    }
    const max = daysIn(ny, nm);
    if (nd > max) nd = 1;
    else if (nd < 1) nd = max;
    onChange(`${ny}-${pad(nm)}-${pad(Math.min(nd, daysIn(ny, nm)))}`);
  };
  const monthName = date(new Date(Date.UTC(y, mo - 1, 15)), { month: 'short', timeZone: 'UTC' });
  const full = date(new Date(Date.UTC(y, mo - 1, d)), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
  return (
    <View style={{ gap: space.sm }}>
      <Muted>{label}</Muted>
      <View style={{ flexDirection: 'row', gap: space.sm }}>
        <Stepper text={String(d)} label={t('fixa.day')} onMinus={() => set(y, mo, d - 1)} onPlus={() => set(y, mo, d + 1)} />
        <Stepper text={monthName} label={t('fixa.month')} onMinus={() => set(y, mo - 1, d)} onPlus={() => set(y, mo + 1, d)} />
        <Stepper text={String(y)} label={t('fixa.year')} onMinus={() => set(y - 1, mo, d)} onPlus={() => set(y + 1, mo, d)} />
      </View>
      <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600' }}>{full}</Text>
      <Pressable accessibilityRole="button" onPress={() => onChange('')} style={{ minHeight: 44, justifyContent: 'center' }}>
        <Text style={{ color: colors.primary, fontSize: 16, fontWeight: '600' }}>{t('fixa.clearDate')}</Text>
      </Pressable>
    </View>
  );
}

function Stepper({ text, label, onMinus, onPlus }: { text: string; label: string; onMinus: () => void; onPlus: () => void }) {
  const btn = (sign: '−' | '+', onPress: () => void) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label} ${sign === '+' ? '+1' : '−1'}`}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 48,
        alignSelf: 'stretch',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: radius.md,
        backgroundColor: colors.surfaceAlt,
        borderWidth: 1,
        borderColor: colors.border,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Text style={{ color: colors.text, fontSize: 24, fontWeight: '800' }}>{sign}</Text>
    </Pressable>
  );
  return (
    <View style={{ flex: 1, alignItems: 'center', gap: space.xs }}>
      <Muted style={{ fontSize: 14 }}>{label}</Muted>
      {btn('+', onPlus)}
      <Text accessibilityLabel={`${label}: ${text}`} style={{ color: colors.text, fontSize: 22, fontWeight: '800', paddingVertical: space.xs }} numberOfLines={1} adjustsFontSizeToFit>
        {text}
      </Text>
      {btn('−', onMinus)}
    </View>
  );
}
