// Paleta de Taimo: fondo casi negro y verde menta (el color del dinero que te queda).
export const colors = {
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
  textFaint: '#62756E',
  success: '#2EE59D',
  warning: '#F59E0B',
  danger: '#EF4444',
  white: '#FFFFFF',
} as const;

export const radius = { sm: 10, md: 16, lg: 22, pill: 999 } as const;
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

export const font = {
  title: { fontSize: 28, fontWeight: '700' as const, color: colors.text },
  h2: { fontSize: 20, fontWeight: '700' as const, color: colors.text },
  body: { fontSize: 16, color: colors.text },
  small: { fontSize: 13, color: colors.textMuted },
};
