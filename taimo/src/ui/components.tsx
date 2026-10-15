import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View, type TextInputProps, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { category } from '@/domain/categories';
import type { CategoryId } from '@/domain/types';
import { useStore } from '@/store/store';

import { applyFontScale, colors, font, fs, radius, scheme, space } from './theme';

/**
 * Letra del modo sencillo: aplica la escala (más grande si está activado) y
 * devuelve `fs` para calcular tamaños. Úsalo en cualquier pantalla con textos propios.
 */
export function useFontScale() {
  const { state } = useStore();
  applyFontScale(!!state.profile.simple);
  return fs;
}

export function Screen({ children, scroll = true, padded = true }: { children: ReactNode; scroll?: boolean; padded?: boolean }) {
  const content = <View style={[padded && st().padded, { gap: space.lg }]}>{children}</View>;
  return (
    <SafeAreaView style={st().screen} edges={['top', 'left', 'right']}>
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
  return <View style={[st().card, style]}>{children}</View>;
}

export function Title({ children }: { children: ReactNode }) {
  useFontScale();
  return <Text style={font.title}>{children}</Text>;
}

export function H2({ children }: { children: ReactNode }) {
  useFontScale();
  return <Text style={font.h2}>{children}</Text>;
}

export function Muted({ children, style }: { children: ReactNode; style?: object }) {
  useFontScale();
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
  const fs = useFontScale();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        st().button,
        variant === 'primary' && { backgroundColor: colors.primary },
        variant === 'secondary' && { backgroundColor: colors.surfaceAlt, borderColor: colors.border, borderWidth: 1 },
        variant === 'ghost' && { backgroundColor: 'transparent' },
        variant === 'danger' && { backgroundColor: 'transparent', borderColor: colors.danger, borderWidth: 1 },
        pressed && !disabled && { opacity: 0.8 },
        // Desactivado: gris y sin color, para que se note también en modo oscuro.
        disabled && { backgroundColor: variant === 'ghost' ? 'transparent' : colors.surfaceAlt, borderColor: colors.border, borderWidth: variant === 'ghost' ? 0 : 1, opacity: 0.7 },
      ]}
    >
      <Text
        style={[
          st().buttonText,
          { fontSize: fs(17) },
          variant === 'primary' && { color: colors.onPrimary },
          variant === 'ghost' && { color: colors.primary },
          variant === 'danger' && { color: colors.danger },
          disabled && { color: colors.textFaint },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

/** Botón grande y claro para las acciones principales (Inicio). */
export function BigButton({ label, emoji, onPress, variant = 'primary' }: { label: string; emoji?: string; onPress: () => void; variant?: 'primary' | 'secondary' }) {
  const primary = variant === 'primary';
  const fs = useFontScale();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: space.sm,
        minHeight: fs(primary ? 64 : 56),
        borderRadius: radius.lg,
        paddingHorizontal: space.lg,
        backgroundColor: primary ? colors.primary : colors.surfaceAlt,
        borderWidth: primary ? 0 : 1,
        borderColor: colors.border,
        opacity: pressed ? 0.8 : 1,
      })}
    >
      {emoji ? <Text style={{ fontSize: fs(primary ? 26 : 22), color: primary ? colors.onPrimary : colors.text, fontWeight: '800' }}>{emoji}</Text> : null}
      <Text style={{ flexShrink: 1, textAlign: 'center', fontSize: fs(primary ? 20 : 18), fontWeight: '800', color: primary ? colors.onPrimary : colors.text }}>{label}</Text>
    </Pressable>
  );
}

export function Input(props: TextInputProps & { label?: string }) {
  const { label, style, ...rest } = props;
  const fs = useFontScale();
  return (
    <View style={{ gap: space.xs }}>
      {label ? <Muted>{label}</Muted> : null}
      {/* Sin etiqueta propia, el lector de pantalla lee la etiqueta visible o el ejemplo. */}
      <TextInput
        placeholderTextColor={colors.textFaint}
        style={[st().input, { fontSize: fs(17) }, style]}
        {...rest}
        accessibilityLabel={rest.accessibilityLabel ?? label ?? rest.placeholder}
      />
    </View>
  );
}

/** `alerts` colorea en ámbar/rojo al acercarse o pasar del límite; desactívalo para barras comparativas. */
export function ProgressBar({ progress, color = colors.primary, alerts = true }: { progress: number; color?: string; alerts?: boolean }) {
  const pct = Math.max(0, Math.min(1, progress)) * 100;
  const barColor = !alerts ? color : progress > 1 ? colors.danger : progress >= 0.8 ? colors.warning : color;
  return (
    <View style={st().track}>
      <View style={[st().fill, { width: `${pct}%`, backgroundColor: barColor }]} />
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
  const fs = useFontScale();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      onPress={onPress}
      style={[st().chip, selected && { backgroundColor: colors.primary, borderColor: colors.primary }]}
    >
      <Text style={{ color: selected ? colors.onPrimary : colors.text, fontSize: fs(16), fontWeight: selected ? '700' : '400' }}>{label}</Text>
    </Pressable>
  );
}

export function Row({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center', gap: space.md }, style]}>{children}</View>;
}

export function Empty({ emoji, text }: { emoji: string; text: string }) {
  const fs = useFontScale();
  return (
    <View style={{ alignItems: 'center', paddingVertical: space.xl, gap: space.sm }}>
      <Text style={{ fontSize: fs(36) }}>{emoji}</Text>
      <Muted style={{ textAlign: 'center' }}>{text}</Muted>
    </View>
  );
}

/**
 * Aviso corto que aparece unos segundos (p. ej. «Hecho · Deshacer» o «Mensaje copiado»).
 * Se lee en voz alta con el lector de pantalla.
 */
export function Notice({ text, actionLabel, onAction, tone = 'success' }: { text: string; actionLabel?: string; onAction?: () => void; tone?: 'success' | 'warning' }) {
  const color = tone === 'warning' ? colors.warning : colors.primary;
  const fs = useFontScale();
  return (
    <View
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
      style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, backgroundColor: colors.primarySoft, borderColor: color, borderWidth: 1, borderRadius: radius.md, padding: space.md }}
    >
      <Text style={{ flex: 1, color: colors.text, fontSize: fs(16), fontWeight: '600' }}>{text}</Text>
      {actionLabel && onAction ? (
        <Pressable accessibilityRole="button" onPress={onAction} style={{ minHeight: 44, minWidth: 44, justifyContent: 'center', paddingHorizontal: space.sm }}>
          <Text style={{ color, fontSize: fs(17), fontWeight: '800', textDecorationLine: 'underline' }}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/** Estilos rehechos cuando cambia el tema (claro/oscuro). */
let cached: { scheme: string; styles: ReturnType<typeof makeStyles> } | null = null;
function st() {
  if (!cached || cached.scheme !== scheme()) cached = { scheme: scheme(), styles: makeStyles() };
  return cached.styles;
}

const makeStyles = () => StyleSheet.create({
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
    paddingVertical: 16,
    paddingHorizontal: space.xl,
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: { color: colors.text, fontSize: 17, fontWeight: '700', textAlign: 'center' },
  input: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    paddingHorizontal: space.lg,
    paddingVertical: 15,
    minHeight: 52,
    color: colors.text,
    fontSize: 17,
    borderWidth: 1,
    borderColor: colors.border,
  },
  track: { height: 8, borderRadius: 4, backgroundColor: colors.surfaceAlt, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 4 },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    minHeight: 44,
    justifyContent: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
  },
});
