import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { CATEGORIES } from '@/domain/categories';
import { reviewQueue } from '@/domain/review';
import type { CategoryId } from '@/domain/types';
import { useI18n } from '@/i18n';
import { useStore } from '@/store/store';
import { BigButton, Button, Card, CategoryBadge, Empty, H2, Muted, Screen } from '@/ui/components';
import { confirm } from '@/ui/confirm';
import { colors, radius, space } from '@/ui/theme';

type Step = 'ask' | 'category' | 'group';

/**
 * Revisión rápida: los gastos que Taimo apuntó solo, de uno en uno, con una
 * sola pregunta («¿Está bien?») y botones grandes. Si cambias la categoría,
 * Taimo la recuerda para ese comercio.
 */
export default function Revisar() {
  const { state, dispatch } = useStore();
  const { t, money, date } = useI18n();
  const [step, setStep] = useState<Step>('ask');
  const [note, setNote] = useState<string | null>(null);
  // Cuántos había al abrir (para el «2 de 5»); no baja al ir revisando.
  const queue = reviewQueue(state.expenses);
  const [total] = useState(() => queue.length);
  const current = queue[0];

  if (!current) {
    return (
      <Screen>
        <Card style={{ backgroundColor: colors.primarySoft, borderColor: colors.primaryDark }}>
          <Empty emoji="🎉" text={`${t('rev.done')}\n${t('rev.doneText')}`} />
        </Card>
        {note ? <Muted style={{ textAlign: 'center' }}>{note}</Muted> : null}
        <BigButton label={t('common.backHome')} onPress={() => router.back()} />
      </Screen>
    );
  }

  const e = current;
  const next = (message: string | null = null) => {
    setNote(message);
    setStep('ask');
  };

  function changeCategory(cat: CategoryId) {
    // updateExpense recuerda la categoría para este comercio (learnedCategories).
    dispatch({ type: 'updateExpense', expense: { ...e, category: cat, reviewed: true } });
    next(t('rev.learned', { merchant: e.merchant, category: t(`cat.${cat}`) }));
  }

  function shareWith(groupId: string) {
    dispatch({ type: 'markReviewed', ids: [e.id] });
    setStep('ask');
    router.push({ pathname: '/add', params: { id: e.id, groupId } });
  }

  return (
    <Screen>
      <Muted style={{ textAlign: 'center' }}>{t('rev.progress', { current: Math.max(1, total - queue.length + 1), total: Math.max(total, queue.length) })}</Muted>

      <Card style={{ alignItems: 'center', gap: space.sm }}>
        <CategoryBadge id={e.category} size={64} />
        <Text style={{ color: colors.text, fontSize: 44, fontWeight: '800' }} adjustsFontSizeToFit numberOfLines={1} accessibilityRole="header">
          {money(e.amount)}
        </Text>
        <Text style={{ color: colors.text, fontSize: 22, fontWeight: '700', textAlign: 'center' }}>{e.merchant}</Text>
        <Text style={{ color: colors.textMuted, fontSize: 17 }}>
          {`${t(`cat.${e.category}`)} · ${date(e.date, { weekday: 'long', day: 'numeric', month: 'long' })}`}
        </Text>
      </Card>

      {note ? <Muted style={{ textAlign: 'center' }}>✅ {note}</Muted> : null}

      {step === 'ask' ? (
        <>
          <H2>{t('rev.question')}</H2>
          <BigButton emoji="✓" label={t('rev.ok')} onPress={() => {
            dispatch({ type: 'markReviewed', ids: [e.id] });
            next();
          }} />
          <BigButton emoji="🏷️" label={t('rev.change')} variant="secondary" onPress={() => setStep('category')} />
          {state.groups.length > 0 ? (
            <BigButton
              emoji="👥"
              label={t('rev.shared')}
              variant="secondary"
              onPress={() => (state.groups.length === 1 ? shareWith(state.groups[0].id) : setStep('group'))}
            />
          ) : null}
          <BigButton
            emoji="🚫"
            label={t('rev.notMine')}
            variant="secondary"
            onPress={() =>
              confirm(t('rev.deleteConfirm'), t('common.cancel'), t('common.delete'), () => {
                dispatch({ type: 'deleteExpense', id: e.id });
                next();
              })
            }
          />
        </>
      ) : null}

      {step === 'category' ? (
        <Card>
          <H2>{t('rev.pickCategory')}</H2>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
            {CATEGORIES.map((c) => (
              <Pressable
                key={c.id}
                onPress={() => changeCategory(c.id)}
                accessibilityRole="button"
                accessibilityState={{ selected: c.id === e.category }}
                style={({ pressed }) => ({
                  flexBasis: '47%',
                  flexGrow: 1,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: space.sm,
                  minHeight: 60,
                  paddingHorizontal: space.md,
                  borderRadius: radius.lg,
                  borderWidth: c.id === e.category ? 2 : 1,
                  borderColor: c.id === e.category ? colors.primary : colors.border,
                  backgroundColor: colors.surfaceAlt,
                  opacity: pressed ? 0.7 : 1,
                })}
              >
                <CategoryBadge id={c.id} size={36} />
                <Text style={{ color: colors.text, fontSize: 17, fontWeight: '700', flexShrink: 1 }}>{t(`cat.${c.id}`)}</Text>
              </Pressable>
            ))}
          </View>
          <Button label={t('common.back')} variant="ghost" onPress={() => setStep('ask')} />
        </Card>
      ) : null}

      {step === 'group' ? (
        <Card>
          <H2>{t('rev.pickGroup')}</H2>
          {state.groups.map((g) => (
            <BigButton key={g.id} emoji={g.emoji} label={g.name} variant="secondary" onPress={() => shareWith(g.id)} />
          ))}
          <Button label={t('common.back')} variant="ghost" onPress={() => setStep('ask')} />
        </Card>
      ) : null}
    </Screen>
  );
}
