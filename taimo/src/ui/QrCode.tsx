import qrcode from 'qrcode-generator';
import { useMemo } from 'react';
import { Text, useWindowDimensions, View } from 'react-native';

import { useI18n } from '@/i18n';
import { colors, radius, space } from '@/ui/theme';

/** Cada cuadradito del QR mide al menos esto (más pequeño, las cámaras no lo leen bien). */
const MIN_CELL = 2;

/**
 * Código QR dibujado con vistas (sin librerías nativas, funciona en móvil y web).
 * Cada fila se dibuja por tramos para no crear miles de vistas.
 * Si el texto no cabe en un QR, no se rompe: enseña un aviso y queda el botón
 * de mandar el enlace.
 */
export function QrCode({ value, size = 280 }: { value: string; size?: number }) {
  const { t } = useI18n();
  const { width } = useWindowDimensions();
  const rows = useMemo(() => {
    try {
      const qr = qrcode(0, 'M');
      qr.addData(value, 'Byte');
      qr.make();
      const n = qr.getModuleCount();
      const out: { start: number; len: number }[][] = [];
      for (let r = 0; r < n; r++) {
        const runs: { start: number; len: number }[] = [];
        let c = 0;
        while (c < n) {
          if (!qr.isDark(r, c)) {
            c++;
            continue;
          }
          const start = c;
          while (c < n && qr.isDark(r, c)) c++;
          runs.push({ start, len: c - start });
        }
        out.push(runs);
      }
      return { n, rows: out };
    } catch {
      // «code length overflow»: demasiado largo para un QR.
      return null;
    }
  }, [value]);

  // Lo más grande que quepa en la pantalla (con márgenes), sin pasarse de `size`.
  const room = Math.max(160, Math.min(size, width - 2 * space.lg - 16));
  const cell = rows ? Math.max(MIN_CELL, Math.floor(room / (rows.n + 8))) : 0;

  if (!rows || (rows.n + 8) * MIN_CELL > width) {
    return (
      <View
        accessibilityRole="alert"
        style={{ backgroundColor: colors.surface, borderColor: colors.warning, borderWidth: 1.5, borderRadius: radius.md, padding: space.md }}
      >
        <Text style={{ color: colors.text, fontSize: 17, lineHeight: 24, textAlign: 'center' }}>⚠️ {t('misc.qrTooLong')}</Text>
      </View>
    );
  }

  // Margen blanco de 4 módulos alrededor, como pide el estándar.
  const side = cell * (rows.n + 8);
  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={t('misc.qrLabel')}
      style={{ width: side, height: side, backgroundColor: '#FFFFFF', padding: cell * 4, borderRadius: 12, alignSelf: 'center' }}
    >
      {rows.rows.map((runs, r) => (
        <View key={r} style={{ height: cell, width: cell * rows.n }}>
          {runs.map((run) => (
            <View key={run.start} style={{ position: 'absolute', left: run.start * cell, width: run.len * cell, height: cell, backgroundColor: '#000000' }} />
          ))}
        </View>
      ))}
    </View>
  );
}
