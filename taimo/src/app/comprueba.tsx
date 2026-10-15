import * as Clipboard from 'expo-clipboard';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { checklistResult, scamRisk, scamSigns, type ScamSign } from '@/domain/scam';
import { useI18n, type TKey } from '@/i18n';
import { useStore } from '@/store/store';
import { Button, Card, H2, Input, Muted, Row, Screen, useFontScale } from '@/ui/components';
import { CallTrusted, TrustedForm } from '@/ui/Trusted';
import { colors, radius, space } from '@/ui/theme';

/** Las cuatro preguntas: con un solo «sí», para. */
const QUESTIONS: TKey[] = ['scam.q1', 'scam.q2', 'scam.q3', 'scam.q4'];

const SIGN_TEXT: Record<ScamSign, TKey> = {
  newNumber: 'scam.signNewNumber',
  family: 'scam.signFamily',
  urgent: 'scam.signUrgent',
  code: 'scam.signCode',
  money: 'scam.signMoney',
  bank: 'scam.signBank',
  link: 'scam.signLink',
  delivery: 'scam.signDelivery',
  prize: 'scam.signPrize',
  investment: 'scam.signInvestment',
};

/**
 * «Antes de pagar, comprueba»: cuatro preguntas de sí o no contra las estafas
 * más comunes (el «hijo en apuros», el falso banco, la tasa del paquete, la
 * inversión milagro). Si algo huele raro, un botón para llamar a quien confías.
 */
export default function Comprueba() {
  const { state } = useStore();
  const { t } = useI18n();
  const fs = useFontScale();
  const [answers, setAnswers] = useState<(boolean | undefined)[]>(QUESTIONS.map(() => undefined));
  const [text, setText] = useState('');
  const [checked, setChecked] = useState<ScamSign[] | null>(null);
  const result = checklistResult(answers, QUESTIONS.length);
  // Lo que se ve en el mensaje pegado también cuenta para decir «para».
  const pastedRisk = checked ? scamRisk(checked) : 'none';
  const stop = result === 'stop' || pastedRisk === 'high';

  const answer = (i: number, value: boolean) => setAnswers((prev) => prev.map((a, j) => (j === i ? value : a)));

  async function pasteNow() {
    const copied = await Clipboard.getStringAsync().catch(() => '');
    if (copied) {
      setText(copied);
      setChecked(scamSigns(copied));
    }
  }

  return (
    <Screen>
      <Text style={{ color: colors.text, fontSize: fs(19), lineHeight: fs(26) }}>{t('scam.intro')}</Text>

      {QUESTIONS.map((q, i) => (
        <Card key={q}>
          <Text style={{ color: colors.text, fontSize: fs(21), fontWeight: '700', lineHeight: fs(28) }}>{t(q)}</Text>
          <Row>
            <Answer label={t('scam.yes')} selected={answers[i] === true} danger onPress={() => answer(i, true)} />
            <Answer label={t('scam.no')} selected={answers[i] === false} onPress={() => answer(i, false)} />
          </Row>
        </Card>
      ))}

      {stop ? (
        <View
          accessibilityRole="alert"
          accessibilityLiveRegion="assertive"
          style={{ backgroundColor: `${colors.danger}1F`, borderColor: colors.danger, borderWidth: 2, borderRadius: radius.lg, padding: space.lg, gap: space.md }}
        >
          <Text accessibilityRole="header" style={{ color: colors.danger, fontSize: fs(28), fontWeight: '800' }}>
            ✋ {t('scam.stopTitle')}
          </Text>
          <Text style={{ color: colors.text, fontSize: fs(19), fontWeight: '700', lineHeight: fs(26) }}>{t('scam.stopText')}</Text>
          {(['scam.adviceCall', 'scam.adviceBank', 'scam.adviceTaimo'] as TKey[]).map((k) => (
            <Text key={k} style={{ color: colors.text, fontSize: fs(18), lineHeight: fs(25) }}>
              • {t(k)}
            </Text>
          ))}
          <CallTrusted />
          <Text style={{ color: colors.text, fontSize: fs(17), lineHeight: fs(24) }}>🏦 {t('scam.bankHint')}</Text>
        </View>
      ) : result === 'ok' ? (
        <Card style={{ backgroundColor: colors.primarySoft, borderColor: colors.primaryDark }}>
          <Text accessibilityRole="header" style={{ color: colors.text, fontSize: fs(24), fontWeight: '800' }}>
            👍 {t('scam.okTitle')}
          </Text>
          <Text style={{ color: colors.text, fontSize: fs(18), lineHeight: fs(25) }}>{t('scam.okText')}</Text>
          <CallTrusted variant="secondary" />
        </Card>
      ) : null}

      {/* Pegar el mensaje: buscamos las señales de alarma típicas. */}
      <Card>
        <H2>{t('scam.pasteTitle')}</H2>
        <Input
          value={text}
          onChangeText={(v) => {
            setText(v);
            setChecked(null);
          }}
          placeholder={t('scam.pastePlaceholder')}
          multiline
          style={{ minHeight: 120, textAlignVertical: 'top' }}
        />
        <Button label={t('scam.pasteNow')} variant="secondary" onPress={() => pasteNow().catch(() => {})} />
        <Button label={t('scam.pasteButton')} disabled={!text.trim()} onPress={() => setChecked(scamSigns(text))} />
        {checked ? (
          checked.length ? (
            <View style={{ gap: space.sm }} accessibilityLiveRegion="polite">
              <Text style={{ color: colors.danger, fontSize: fs(19), fontWeight: '800' }}>⚠️ {t('scam.signsFound')}</Text>
              {checked.map((s) => (
                <Text key={s} style={{ color: colors.text, fontSize: fs(18), lineHeight: fs(25) }}>
                  • {t(SIGN_TEXT[s])}
                </Text>
              ))}
            </View>
          ) : (
            <Muted>{t('scam.noSigns')}</Muted>
          )
        ) : null}
      </Card>

      {/* Sin persona de confianza, se puede elegir aquí mismo. */}
      <Card>{state.profile.trusted ? <CallTrusted variant="secondary" /> : null}<TrustedForm /></Card>

      {answers.some((a) => a !== undefined) || checked ? (
        <Button
          label={t('scam.again')}
          variant="ghost"
          onPress={() => {
            setAnswers(QUESTIONS.map(() => undefined));
            setText('');
            setChecked(null);
          }}
        />
      ) : null}
    </Screen>
  );
}

/** Botón enorme de «Sí» o «No». */
function Answer({ label, selected, danger, onPress }: { label: string; selected: boolean; danger?: boolean; onPress: () => void }) {
  const fs = useFontScale();
  const color = danger ? colors.danger : colors.primary;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => ({
        flex: 1,
        minHeight: fs(60),
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: radius.lg,
        borderWidth: 2,
        borderColor: selected ? color : colors.border,
        backgroundColor: selected ? color : colors.surfaceAlt,
        opacity: pressed ? 0.8 : 1,
      })}
    >
      <Text style={{ fontSize: fs(22), fontWeight: '800', color: selected ? (danger ? colors.white : colors.onPrimary) : colors.text }}>{label}</Text>
    </Pressable>
  );
}
