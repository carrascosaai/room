import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';

import { colors, radius, space } from './theme';

// Aviso corto encima de cualquier pantalla («Guardado ✓»). Sobrevive al cambio de
// pantalla (p. ej. al guardar un gasto y volver al inicio).
type Listener = (text: string | null) => void;
const listeners = new Set<Listener>();
let timer: ReturnType<typeof setTimeout> | null = null;

export function toast(text: string, ms = 3500) {
  if (timer) clearTimeout(timer);
  listeners.forEach((l) => l(text));
  timer = setTimeout(() => listeners.forEach((l) => l(null)), ms);
}

/** Se pone una vez en la raíz de la app. */
export function ToastHost() {
  const [text, setText] = useState<string | null>(null);
  useEffect(() => {
    listeners.add(setText);
    return () => {
      listeners.delete(setText);
    };
  }, []);
  if (!text) return null;
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: space.lg, right: space.lg, bottom: 40, alignItems: 'center' }}>
      <View
        accessibilityLiveRegion="polite"
        accessibilityRole="alert"
        style={{ backgroundColor: colors.text, borderRadius: radius.pill, paddingHorizontal: space.xl, paddingVertical: space.md, maxWidth: 520 }}
      >
        <Text style={{ color: colors.bg, fontSize: 18, fontWeight: '700', textAlign: 'center' }}>{text}</Text>
      </View>
    </View>
  );
}
