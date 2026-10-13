import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { Platform, Text, View } from 'react-native';

import { Button, Card, Muted, Row, Screen } from '@/ui/components';
import { colors, radius, space } from '@/ui/theme';

const CAPTURE_URL = 'taimo://capture?amount=[Importe]&merchant=[Comercio]&card=[Tarjeta]';

const STEPS = [
  'Abre la app Atajos y ve a la pestaña «Automatización».',
  'Pulsa «+» y elige «Transacción» (Wallet).',
  'Selecciona tus tarjetas y marca «Ejecutar inmediatamente».',
  'Añade la acción «Abrir URL».',
  'Escribe taimo://capture?amount= y toca «Importe» en las variables. Después escribe &merchant= y toca «Comercio». Termina con &card= y toca «Tarjeta».',
  'Guarda. ¡Listo! La próxima vez que pagues con Apple Pay, Taimo lo apuntará solo.',
];

export default function Automation() {
  const isAndroid = Platform.OS === 'android';
  return (
    <Screen>
      <Text style={{ color: colors.text, fontSize: 24, fontWeight: '700' }}>
        {isAndroid ? 'Registro automático en Android' : 'Paga con Apple Pay y olvídate'}
      </Text>

      {isAndroid ? (
        <Card>
          <Muted>
            Muy pronto Taimo leerá los avisos de Google Wallet y de tu banco para apuntar los pagos solo. Mientras tanto,
            añade los gastos con el botón «+»: son dos toques.
          </Muted>
        </Card>
      ) : (
        <>
          <Muted>
            iPhone tiene una automatización que se ejecuta cada vez que pagas con Apple Pay. Taimo la usa para apuntar el
            importe y el comercio al momento, sin conectar tu banco.
          </Muted>
          <Card>
            {STEPS.map((s, i) => (
              <Row key={i} style={{ alignItems: 'flex-start' }}>
                <View
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: 13,
                    backgroundColor: colors.primary,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ color: colors.white, fontWeight: '700' }}>{i + 1}</Text>
                </View>
                <Text style={{ color: colors.text, flex: 1, fontSize: 15, lineHeight: 21 }}>{s}</Text>
              </Row>
            ))}
          </Card>
          <Muted>El enlace debe quedar así:</Muted>
          <View style={{ backgroundColor: colors.surfaceAlt, borderRadius: radius.md, padding: space.md }}>
            <Text selectable style={{ color: colors.primary, fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }) }}>
              {CAPTURE_URL}
            </Text>
          </View>
          <Button label="Abrir Atajos" onPress={() => Linking.openURL('shortcuts://').catch(() => {})} />
        </>
      )}

      <Button
        label="Probar con un pago de ejemplo"
        variant="secondary"
        onPress={() =>
          router.push({ pathname: '/capture', params: { amount: '12,40 €', merchant: 'Mercadona', card: 'Prueba' } })
        }
      />
      <Muted>
        Solo se apuntan los pagos con el móvil o el reloj. Los pagos en efectivo, Bizum o con la tarjeta física se añaden
        con «+».
      </Muted>
    </Screen>
  );
}
