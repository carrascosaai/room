import { Text, View } from 'react-native';

import { chargesWithin, leftAfterCharges, upcomingCharges } from '@/domain/calendar';
import { useI18n } from '@/i18n';
import { useStore } from '@/store/store';
import { Card, CategoryBadge, Empty, Muted, Row, Screen } from '@/ui/components';
import { colors, space } from '@/ui/theme';

const DAY = 86_400_000;

/**
 * Calendario de recibos: lo que te van a cobrar en los próximos 30 días
 * (suscripciones que Taimo ha visto repetirse y tu parte de los gastos fijos
 * de tus grupos) y cuánto te quedará del mes después de pagarlo.
 */
export default function Calendario() {
  const { state } = useStore();
  const { t, money, date } = useI18n();
  const today = new Date();
  const charges = upcomingCharges(state, today, 30);
  const total = chargesWithin(charges, today, 30).total;
  const after = leftAfterCharges(state, charges, today);
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();

  function when(iso: string): string {
    const d = new Date(iso);
    const days = Math.round((new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() - start) / DAY);
    if (days === 0) return t('cal.today');
    if (days === 1) return t('cal.tomorrow');
    return t('cal.inDays', { count: days });
  }

  return (
    <Screen>
      <Card style={{ backgroundColor: colors.primarySoft, borderColor: colors.primaryDark }}>
        <Text style={{ color: colors.textMuted, fontSize: 18 }}>{t('cal.intro')}</Text>
        <Text style={{ color: colors.text, fontSize: 46, fontWeight: '800' }} adjustsFontSizeToFit numberOfLines={1} accessibilityRole="header">
          {money(total)}
        </Text>
        {after !== null && charges.length > 0 ? (
          <Text style={{ color: after < 0 ? colors.danger : colors.text, fontSize: 18, lineHeight: 25 }}>
            {after >= 0 ? t('cal.leftAfter', { amount: money(after) }) : t('cal.leftAfterOver', { amount: money(-after) })}
          </Text>
        ) : null}
      </Card>

      {charges.length === 0 ? (
        <Card>
          <Empty emoji="📅" text={t('cal.empty')} />
        </Card>
      ) : (
        <Card>
          {charges.map((c) => (
            <Row key={c.id} style={{ paddingVertical: space.xs }}>
              <View style={{ width: 56, alignItems: 'center' }}>
                <Text style={{ color: colors.text, fontSize: 26, fontWeight: '800' }}>{new Date(c.date).getDate()}</Text>
                <Text style={{ color: colors.textMuted, fontSize: 14 }}>{date(c.date, { month: 'short' })}</Text>
              </View>
              <CategoryBadge id={c.category} size={36} />
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700' }} numberOfLines={1}>
                  {c.name}
                </Text>
                <Muted>{`${when(c.date)} · ${c.kind === 'group' ? t('cal.group', { group: c.group ?? '' }) : t('cal.monthly')}`}</Muted>
              </View>
              <Text style={{ color: colors.text, fontSize: 18, fontWeight: '700' }}>{money(c.amount)}</Text>
            </Row>
          ))}
        </Card>
      )}
      <Muted style={{ textAlign: 'center' }}>{t('cal.note')}</Muted>
    </Screen>
  );
}
