import { Pressable, Text } from 'react-native';

import { colors, radius, space } from './theme';

/** Acceso en cuadrícula de dos columnas (Inicio). */
export function Tile({ emoji, label, hint, onPress }: { emoji: string; label: string; hint?: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => ({
        width: '48.5%',
        backgroundColor: colors.surface,
        borderColor: colors.border,
        borderWidth: 1,
        borderRadius: radius.lg,
        padding: space.md,
        gap: 4,
        opacity: pressed ? 0.75 : 1,
      })}
    >
      <Text style={{ fontSize: 22 }}>{emoji}</Text>
      <Text style={{ color: colors.text, fontWeight: '700', fontSize: 14 }} numberOfLines={2}>
        {label}
      </Text>
      {hint ? (
        <Text style={{ color: colors.textMuted, fontSize: 12 }} numberOfLines={1}>
          {hint}
        </Text>
      ) : null}
    </Pressable>
  );
}
