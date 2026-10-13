import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View, type TextInputProps, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { category } from '@/domain/categories';
import type { CategoryId } from '@/domain/types';

import { colors, font, radius, space } from './theme';

export function Screen({ children, scroll = true, padded = true }: { children: ReactNode; scroll?: boolean; padded?: boolean }) {
  const content = <View style={[padded && styles.padded, { gap: space.lg }]}>{children}</View>;
  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      {scroll ? (
        <ScrollView contentContainerStyle={{ paddingBottom: 120 }} keyboardShouldPersistTaps="handled">
          {content}
        </ScrollView>
      ) : (
        content
      )}
    </SafeAreaView>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Title({ children }: { children: ReactNode }) {
  return <Text style={font.title}>{children}</Text>;
}

export function H2({ children }: { children: ReactNode }) {
  return <Text style={font.h2}>{children}</Text>;
}

export function Muted({ children, style }: { children: ReactNode; style?: object }) {
  return <Text style={[font.small, style]}>{children}</Text>;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled,
}: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        variant === 'primary' && { backgroundColor: colors.primary },
        variant === 'secondary' && { backgroundColor: colors.surfaceAlt, borderColor: colors.border, borderWidth: 1 },
        variant === 'ghost' && { backgroundColor: 'transparent' },
        variant === 'danger' && { backgroundColor: 'transparent', borderColor: colors.danger, borderWidth: 1 },
        (pressed || disabled) && { opacity: disabled ? 0.4 : 0.8 },
      ]}
    >
      <Text
        style={[
          styles.buttonText,
          variant === 'ghost' && { color: colors.primary },
          variant === 'danger' && { color: colors.danger },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function Input(props: TextInputProps & { label?: string }) {
  const { label, style, ...rest } = props;
  return (
    <View style={{ gap: space.xs }}>
      {label ? <Muted>{label}</Muted> : null}
      <TextInput placeholderTextColor={colors.textFaint} style={[styles.input, style]} {...rest} />
    </View>
  );
}

/** `alerts` colorea en ámbar/rojo al acercarse o pasar del límite; desactívalo para barras comparativas. */
export function ProgressBar({ progress, color = colors.primary, alerts = true }: { progress: number; color?: string; alerts?: boolean }) {
  const pct = Math.max(0, Math.min(1, progress)) * 100;
  const barColor = !alerts ? color : progress > 1 ? colors.danger : progress >= 0.8 ? colors.warning : color;
  return (
    <View style={styles.track}>
      <View style={[styles.fill, { width: `${pct}%`, backgroundColor: barColor }]} />
    </View>
  );
}

export function CategoryBadge({ id, size = 40 }: { id: CategoryId; size?: number }) {
  const c = category(id);
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: `${c.color}26`,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ fontSize: size * 0.45 }}>{c.emoji}</Text>
    </View>
  );
}

export function Chip({ label, selected, onPress }: { label: string; selected?: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, selected && { backgroundColor: colors.primary, borderColor: colors.primary }]}
    >
      <Text style={{ color: selected ? colors.white : colors.text, fontSize: 14 }}>{label}</Text>
    </Pressable>
  );
}

export function Row({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center', gap: space.md }, style]}>{children}</View>;
}

export function Empty({ emoji, text }: { emoji: string; text: string }) {
  return (
    <View style={{ alignItems: 'center', paddingVertical: space.xl, gap: space.sm }}>
      <Text style={{ fontSize: 36 }}>{emoji}</Text>
      <Muted style={{ textAlign: 'center' }}>{text}</Muted>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  padded: { padding: space.lg },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: space.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: space.md,
  },
  button: {
    borderRadius: radius.pill,
    paddingVertical: 15,
    paddingHorizontal: space.xl,
    alignItems: 'center',
  },
  buttonText: { color: colors.white, fontSize: 16, fontWeight: '600' },
  input: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    paddingHorizontal: space.lg,
    paddingVertical: 14,
    color: colors.text,
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  track: { height: 8, borderRadius: 4, backgroundColor: colors.surfaceAlt, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 4 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
  },
});
