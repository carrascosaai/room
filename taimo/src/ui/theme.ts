// Colores sacados del diseño de Figma de Taimo: fondo casi negro con morado.
export const colors = {
  bg: '#0B0614',
  surface: '#161022',
  surfaceAlt: '#1F1730',
  border: '#2A2140',
  primary: '#A855F7',
  primaryDark: '#7E22CE',
  primarySoft: '#2E1A47',
  text: '#F5F3FF',
  textMuted: '#A59DB8',
  textFaint: '#6E6585',
  success: '#22C55E',
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
