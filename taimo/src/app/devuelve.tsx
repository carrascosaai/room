import * as Clipboard from 'expo-clipboard';
import * as Linking from 'expo-linking';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { parseAmount } from '@/domain/money';
import { findMoneyBack, recoveredTotal, type MoneyBack } from '@/domain/moneyback';
import { useI18n, type TKey } from '@/i18n';
import { useStore } from '@/store/store';
import { Button, Card, Empty, Input, Muted, Row, Screen } from '@/ui/components';
import { confirm } from '@/ui/confirm';
import { HomeButton } from '@/ui/HomeButton';
import { colors, space } from '@/ui/theme';

const EMOJI: Record<MoneyBack['kind'], string> = { double: '⚠️', priceUp: '📈', newSub: '🔔', returnWindow: '↩️', flight: '✈️', warranty: '🛡️' };

/**
 * «Dinero que es tuyo»: cobros repetidos, suscripciones que suben o que acaban
 * de empezar a cobrar, plazos para devolver, vuelos que se pueden reclamar y
 * garantías. Arriba, lo que Taimo te ha ayudado a recuperar.
 */
export default function Devuelve() {
  const { state, dispatch } = useStore();
  const i18n = useI18n();
  const { t, money, date } = i18n;
  const [note, setNote] = useState<string | null>(null);
  // Vuelo: cuánto te han pagado de verdad (lo escribe la persona; no nos lo inventamos).
  const [paidFor, setPaidFor] = useState<string | null>(null);
  const [paidText, setPaidText] = useState('');
  const items = findMoneyBack(state);
  const saved = recoveredTotal(state);
  const day = (iso?: string) => (iso ? date(`${iso}T12:00:00`, { day: 'numeric', month: 'long', year: 'numeric' }) : '');
  const search = (q: string) => Linking.openURL(`https://www.google.com/search?q=${encodeURIComponent(q)}`).catch(() => {});

  function text(m: MoneyBack): { title: string; body: string } {
    const v = { merchant: m.merchant, amount: money(m.amount), date: day(m.until), before: money(m.before ?? 0), now: money(m.now ?? 0), monthly: money(m.now ?? Math.round(m.amount / 12)) };
    // Un primer cobro grande (anual): sin «al mes» ni «al año» inventados.
    if (m.kind === 'newSub' && m.yearly) return { title: t('back.newSubTitle', v), body: t('misc.newSubYearText', v) };
    return { title: t(`back.${m.kind}Title` as TKey, v), body: t(`back.${m.kind}Text` as TKey, v) };
  }

  async function copyClaim(m: MoneyBack) {
    const e = state.expenses.find((x) => x.id === m.expenseId);
    const message = t('back.claimMessage', { merchant: m.merchant, amount: money(m.amount), date: e ? date(e.date, { day: 'numeric', month: 'long' }) : '' });
    await Clipboard.setStringAsync(message).catch(() => {});
    setNote(t('back.claimCopied'));
  }

  const recovered = (m: MoneyBack, amount = m.amount) => dispatch({ type: 'moneyBackRecovered', id: m.id, amount });
  const dismiss = (m: MoneyBack) => dispatch({ type: 'moneyBackDismiss', id: m.id });

  /** Cobro repetido devuelto: se quita el cobro de más para que el presupuesto cuadre. */
  function doubleRefunded(m: MoneyBack) {
    const e = m.expenseId ? state.expenses.find((x) => x.id === m.expenseId) : undefined;
    if (!e) return recovered(m);
    confirm(t('fixa.refundConfirm', { merchant: m.merchant, amount: money(m.amount) }), t('common.cancel'), t('fixa.refundOk'), () => {
      recovered(m);
      dispatch({ type: 'deleteExpense', id: e.id });
      setNote(t('fixa.refundDone', { amount: money(m.amount) }));
    });
  }

  return (
    <Screen>
      <HomeButton />
      {/* «Te ha ayudado a recuperar 0,00 €» no dice nada: solo cuando ya hay algo. */}
      {saved.total > 0 ? (
        <Card style={{ backgroundColor: colors.primarySoft, borderColor: colors.primaryDark, alignItems: 'center' }}>
          <Text style={{ color: colors.textMuted, fontSize: 17, textAlign: 'center' }}>{t('back.recovered')}</Text>
          <Text style={{ color: colors.text, fontSize: 46, fontWeight: '800' }} adjustsFontSizeToFit numberOfLines={1} accessibilityRole="header">
            {money(saved.total)}
          </Text>
          {saved.thisYear !== saved.total ? <Muted>{t('back.recoveredYear', { amount: money(saved.thisYear) })}</Muted> : null}
        </Card>
      ) : null}

      {note ? (
        <Card>
          <Text style={{ color: colors.success, fontSize: 17 }}>{note}</Text>
        </Card>
      ) : null}

      {items.length === 0 ? <Empty emoji="🕵️" text={t('back.empty')} /> : null}

      {items.map((m) => {
        const { title, body } = text(m);
        return (
          <Card key={m.id} style={m.kind === 'double' ? { borderColor: colors.warning, borderWidth: 1.5 } : undefined}>
            <Row style={{ alignItems: 'flex-start' }}>
              <Text style={{ fontSize: 28 }}>{EMOJI[m.kind]}</Text>
              <View style={{ flex: 1, gap: space.xs }}>
                <Text style={{ color: colors.text, fontSize: 19, fontWeight: '800' }}>{title}</Text>
                <Text style={{ color: colors.text, fontSize: 17, lineHeight: 24 }}>{body}</Text>
              </View>
            </Row>
            {m.kind === 'double' ? (
              <>
                <Button label={t('back.copyClaim')} onPress={() => copyClaim(m)} />
                <Button label={t('back.gotIt')} variant="secondary" onPress={() => doubleRefunded(m)} />
              </>
            ) : null}
            {m.kind === 'priceUp' || m.kind === 'newSub' ? (
              <>
                <Button label={t('back.howCancel')} onPress={() => search(t('back.searchCancel', { merchant: m.merchant }))} />
                <Button label={t('back.cancelled')} variant="secondary" onPress={() => recovered(m)} />
              </>
            ) : null}
            {m.kind === 'returnWindow' ? <Button label={t('back.returned')} variant="secondary" onPress={() => recovered(m)} /> : null}
            {m.kind === 'flight' ? (
              <>
                <Button label={t('back.howClaim')} onPress={() => search(t('back.searchFlight', { merchant: m.merchant }))} />
                {paidFor === m.id ? (
                  <>
                    <Input label={t('misc.flightHowMuch')} keyboardType="decimal-pad" placeholder={money(0)} value={paidText} onChangeText={setPaidText} />
                    <Button
                      label={t('common.save')}
                      onPress={() => {
                        recovered(m, parseAmount(paidText) ?? 0);
                        setPaidFor(null);
                        setPaidText('');
                      }}
                    />
                  </>
                ) : (
                  <Button label={t('back.flightPaid')} variant="secondary" onPress={() => setPaidFor(m.id)} />
                )}
              </>
            ) : null}
            <Button label={m.kind === 'warranty' ? t('back.hide') : t('back.notIssue')} variant="ghost" onPress={() => dismiss(m)} />
          </Card>
        );
      })}
      <Muted style={{ textAlign: 'center' }}>{t('back.privacy')}</Muted>
    </Screen>
  );
}
