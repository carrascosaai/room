// Paleta de Taimo: verde menta (el color del dinero que te queda) sobre fondo casi negro
// o, en modo claro, verde más oscuro sobre blanco para que se lea bien.
const dark = {
  bg: '#0A0F0D',
  surface: '#121A17',
  surfaceAlt: '#1A2420',
  border: '#24312C',
  primary: '#2EE59D',
  primaryDark: '#14B87A',
  primarySoft: '#0F2A20',
  /** Texto encima del color principal (el verde es claro: el texto va oscuro). */
  onPrimary: '#04140D',
  text: '#F2FBF7',
  textMuted: '#9BB0A8',
  textFaint: '#7F928B',
  success: '#2EE59D',
  warning: '#F59E0B',
  danger: '#EF4444',
  white: '#FFFFFF',
  /** Botón de Apple: blanco sobre oscuro, negro sobre claro (como pide Apple). */
  appleBg: '#FFFFFF',
  appleText: '#000000',
};

export type Palette = typeof dark;
export type Scheme = 'dark' | 'light';

const light: Palette = {
  bg: '#F5F8F6',
  surface: '#FFFFFF',
  surfaceAlt: '#EDF3F0',
  border: '#DCE5E0',
  primary: '#077A51',
  primaryDark: '#056541',
  primarySoft: '#E2F5EC',
  onPrimary: '#FFFFFF',
  text: '#0B1A14',
  textMuted: '#52665E',
  textFaint: '#66776F',
  success: '#077A51',
  warning: '#B45309',
  danger: '#DC2626',
  white: '#FFFFFF',
  appleBg: '#000000',
  appleText: '#FFFFFF',
};

/** Colores actuales. Se cambian en sitio con applyTheme y la app se vuelve a montar. */
export const colors: Palette = { ...dark };
let current: Scheme = 'dark';

export const scheme = () => current;

export const radius = { sm: 10, md: 16, lg: 22, pill: 999 } as const;
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

// Letra cómoda para cualquier edad (y crece con el tamaño de letra del móvil).
export const font = {
  title: { fontSize: 30, fontWeight: '800' as const, color: colors.text },
  h2: { fontSize: 21, fontWeight: '700' as const, color: colors.text },
  body: { fontSize: 17, color: colors.text },
  small: { fontSize: 15, lineHeight: 21, color: colors.textMuted },
};

/**
 * Modo sencillo: toda la letra un 18 % más grande. Escala a nivel de módulo
 * (como los colores); los componentes la aplican al pintarse con useFontScale.
 */
const SIMPLE_SCALE = 1.18;
const BASE_SIZE = { title: 30, h2: 21, body: 17, small: 15, smallLine: 21 };
let fontScale = 1;

/** Tamaño de letra con la escala actual: fs(17) → 17, o 20 en modo sencillo. */
export const fs = (size: number) => Math.round(size * fontScale);

export function applyFontScale(simple: boolean) {
  const next = simple ? SIMPLE_SCALE : 1;
  if (next === fontScale) return;
  fontScale = next;
  font.title.fontSize = fs(BASE_SIZE.title);
  font.h2.fontSize = fs(BASE_SIZE.h2);
  font.body.fontSize = fs(BASE_SIZE.body);
  font.small.fontSize = fs(BASE_SIZE.small);
  font.small.lineHeight = fs(BASE_SIZE.smallLine);
}

export function applyTheme(next: Scheme) {
  if (next === current) return;
  current = next;
  Object.assign(colors, next === 'light' ? light : dark);
  font.title.color = colors.text;
  font.h2.color = colors.text;
  font.body.color = colors.text;
  font.small.color = colors.textMuted;
}
