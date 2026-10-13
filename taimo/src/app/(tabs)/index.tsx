import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { categoryStatus, monthSummary } from '@/domain/budget';
import { CATEGORIES, category } from '@/domain/categories';
import { formatMoney } from '@/domain/money';
import { useStore } from '@/store/store';
import { Card, CategoryBadge, Empty, H2, Muted, ProgressBar, Row, Screen } from '@/ui/components';
import { ExpenseRow } from '@/ui/ExpenseRow';
import { colors, radius, space } from '@/ui/theme';

export default function Home() {
  const { state } = useStore();
  const today = new Date();
  const summary = monthSummary(state, today);
  const monthName = today.toLocaleDateString('es-ES', { month: 'long' });
  const statuses = CATEGORIES.map((c) => categoryStatus(state, c.id, today)).filter(
    (s) => s.budget > 0 || s.spent > 0,
  );
  const recent = state.expenses.slice(0, 8);
  const hasAuto = state.expenses.some((e) => e.source === 'applepay' || e.source === 'notificacion');

  return (
    <View style={{ flex: 1 }}>
      <Screen>
        <Row style={{ justifyContent: 'space-between' }}>
          <View>
            <Muted>Hola, {state.profile.name || 'de nuevo'} 👋</Muted>
            <Text style={{ color: colors.text, fontSize: 22, fontWeight: '700' }}>Taimo</Text>
          </View>
        </Row>

        <Card style={{ backgroundColor: colors.primarySoft, borderColor: colors.primaryDark }}>
          <Muted>Te queda este mes de {monthName}</Muted>
          <Text
            style={{
              color: summary.remaining < 0 ? colors.danger : colors.text,
              fontSize: 40,
              fontWeight: '800',
            }}
          >
            {formatMoney(summary.remaining)}
          </Text>
          <ProgressBar progress={summary.progress} />
          <Row style={{ justifyContent: 'space-between' }}>
            <Muted>
              Gastado {formatMoney(summary.spent)} de {formatMoney(summary.budget)}
            </Muted>
          </Row>
          <View style={{ backgroundColor: colors.bg, borderRadius: radius.md, padding: space.md }}>
            <Text style={{ color: colors.text, fontSize: 15 }}>
              {summary.remaining > 0
                ? `Puedes gastar ${formatMoney(summary.dailyAllowance)} al día durante los ${summary.daysLeft} días que quedan.`
                : 'Has llegado a tu límite del mes. ¡Aguanta, que queda poco! 💪'}
            </Text>
          </View>
        </Card>

        {!hasAuto ? (
          <Pressable onPress={() => router.push('/automation')}>
            <Card style={{ borderColor: colors.primary }}>
              <Row>
                <Text style={{ fontSize: 24 }}>⚡</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.text, fontWeight: '700', fontSize: 16 }}>Activa el registro automático</Text>
                  <Muted>Paga con Apple Pay y Taimo lo apunta solo. Se configura en 1 minuto.</Muted>
                </View>
                <Text style={{ color: colors.primary, fontSize: 22 }}>›</Text>
              </Row>
            </Card>
          </Pressable>
        ) : null}

        {statuses.length > 0 ? (
          <Card>
            <H2>Tus presupuestos</H2>
            {statuses.map((s) => {
              const c = category(s.category);
              return (
                <View key={s.category} style={{ gap: space.xs }}>
                  <Row>
                    <CategoryBadge id={s.category} size={32} />
                    <Text style={{ color: colors.text, flex: 1, fontSize: 15 }}>{c.label}</Text>
                    <Muted>
                      {s.budget > 0
                        ? s.remaining >= 0
                          ? `quedan ${formatMoney(s.remaining)}`
                          : `+${formatMoney(-s.remaining)} pasado`
                        : formatMoney(s.spent)}
                    </Muted>
                  </Row>
                  {s.budget > 0 ? <ProgressBar progress={s.progress} color={c.color} /> : null}
                </View>
              );
            })}
          </Card>
        ) : null}

        <Card>
          <H2>Últimos gastos</H2>
          {recent.length === 0 ? (
            <Empty emoji="🧾" text="Todavía no hay gastos. Paga con Apple Pay o pulsa + para añadir uno." />
          ) : (
            recent.map((e) => <ExpenseRow key={e.id} expense={e} groups={state.groups} />)
          )}
        </Card>
      </Screen>

      <View style={{ position: 'absolute', right: space.lg, bottom: space.lg }}>
        <Pressable
          accessibilityLabel="Añadir gasto"
          onPress={() => router.push('/add')}
          style={({ pressed }) => ({
            width: 60,
            height: 60,
            borderRadius: 30,
            backgroundColor: colors.primary,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: pressed ? 0.8 : 1,
            shadowColor: colors.primary,
            shadowOpacity: 0.5,
            shadowRadius: 12,
            elevation: 6,
          })}
        >
          <Text style={{ color: colors.onPrimary, fontSize: 30, marginTop: -2, fontWeight: '600' }}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}
