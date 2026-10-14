import { useState } from 'react';
import { ScrollView, Text, TextInput, View } from 'react-native';

import { answer } from '@/domain/assistant';
import { useI18n, type TKey } from '@/i18n';
import { useStore } from '@/store/store';
import { Chip, Muted, Screen } from '@/ui/components';
import { colors, radius, space } from '@/ui/theme';

const EXAMPLES: TKey[] = ['asst.ex1', 'asst.ex2', 'asst.ex3', 'asst.ex4', 'asst.ex5'];

/** Pregunta a tus gastos. Todo se calcula en el móvil: nada sale de él. */
export default function Assistant() {
  const { state } = useStore();
  const i18n = useI18n();
  const { t } = i18n;
  const [text, setText] = useState('');
  const [chat, setChat] = useState<{ me: boolean; lines: string[] }[]>([{ me: false, lines: [t('asst.hello')] }]);

  function ask(q: string) {
    const question = q.trim();
    if (!question) return;
    setChat((c) => [...c, { me: true, lines: [question] }, { me: false, lines: answer(question, { state, i18n }) }]);
    setText('');
  }

  return (
    <Screen>
      {chat.map((m, i) => (
        <View
          key={i}
          style={{
            alignSelf: m.me ? 'flex-end' : 'flex-start',
            maxWidth: '88%',
            backgroundColor: m.me ? colors.primary : colors.surface,
            borderColor: colors.border,
            borderWidth: m.me ? 0 : 1,
            borderRadius: radius.lg,
            paddingHorizontal: space.lg,
            paddingVertical: space.md,
            gap: space.xs,
          }}
        >
          {m.lines.map((l, j) => (
            <Text key={j} style={{ color: m.me ? colors.onPrimary : colors.text, fontSize: 16, lineHeight: 22 }}>
              {l}
            </Text>
          ))}
        </View>
      ))}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm }}>
        {EXAMPLES.map((k) => (
          <Chip key={k} label={t(k)} onPress={() => ask(t(k))} />
        ))}
      </ScrollView>
      <TextInput
        value={text}
        onChangeText={setText}
        onSubmitEditing={() => ask(text)}
        returnKeyType="send"
        placeholder={t('asst.placeholder')}
        placeholderTextColor={colors.textFaint}
        style={{
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderWidth: 1,
          borderRadius: radius.pill,
          paddingHorizontal: space.lg,
          paddingVertical: 12,
          color: colors.text,
          fontSize: 16,
        }}
      />
      <Muted style={{ textAlign: 'center' }}>🔒 {t('asst.private')}</Muted>
    </Screen>
  );
}
