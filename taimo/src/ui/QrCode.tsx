import qrcode from 'qrcode-generator';
import { useMemo } from 'react';
import { View } from 'react-native';

/**
 * Código QR dibujado con vistas (sin librerías nativas, funciona en móvil y web).
 * Cada fila se dibuja por tramos para no crear miles de vistas.
 */
export function QrCode({ value, size = 280 }: { value: string; size?: number }) {
  const rows = useMemo(() => {
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
  }, [value]);

  // Margen blanco de 4 módulos alrededor, como pide el estándar.
  const cell = Math.floor(size / (rows.n + 8)) || 1;
  const side = cell * (rows.n + 8);
  return (
    <View
      accessibilityRole="image"
      accessibilityLabel="QR"
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
