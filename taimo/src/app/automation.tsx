import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { AppState as RNAppState, Platform, Text, View } from 'react-native';

import { hasNotificationAccess, nativeCaptureAvailable, openNotificationAccessSettings } from 'taimo-capture';

import { PAYMENT_APPS } from '@/domain/notifications';
import { ensureNotificationPermission } from '@/notifications/local';
import { Button, Card, H2, Muted, Row, Screen } from '@/ui/components';
import { colors, radius, space } from '@/ui/theme';

const CAPTURE_URL = 'taimo://capture?amount=[Importe]&merchant=[Comercio]&card=[Tarjeta]';

// Con la app instalada (no Expo Go): la acción propia de Taimo apunta el pago sin abrir la app.
const STEPS_INTENT = [
  'Abre la app Atajos y ve a «Automatización».',
  'Pulsa «+» y elige «Transacción» (Wallet).',
  'Elige tus tarjetas y marca «Ejecutar inmediatamente».',
  'Añade la acción «Registrar pago en Taimo» (búscala escribiendo «Taimo»).',
  'Toca «Importe» y elige la variable Importe. Haz lo mismo con Comercio y Tarjeta.',
  'Guarda. Cuando pagues con Apple Pay verás un aviso: «⚡ Apuntado en Taimo».',
];

// Alternativa que funciona en cualquier versión: abre Taimo un segundo con los datos.
const STEPS_URL = [
  'Abre Atajos → «Automatización» → «+» → «Transacción».',
  'Elige tus tarjetas y marca «Ejecutar inmediatamente».',
  'Añade la acción «URL» y escribe el enlace de abajo, poniendo las variables Importe, Comercio y Tarjeta donde van los corchetes.',
  'Añade la acción «Abrir URL». Guarda.',
];

function Steps({ steps }: { steps: string[] }) {
  return (
    <Card>
      {steps.map((s, i) => (
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
            <Text style={{ color: colors.onPrimary, fontWeight: '700' }}>{i + 1}</Text>
          </View>
          <Text style={{ color: colors.text, flex: 1, fontSize: 15, lineHeight: 21 }}>{s}</Text>
        </Row>
      ))}
    </Card>
  );
}

function AndroidSetup() {
  const [enabled, setEnabled] = useState(hasNotificationAccess());
  useEffect(() => {
    const sub = RNAppState.addEventListener('change', (s) => {
      if (s === 'active') setEnabled(hasNotificationAccess());
    });
    return () => sub.remove();
  }, []);

  if (!nativeCaptureAvailable) {
    return (
      <Card>
        <Muted>
          El registro automático necesita la app de Taimo instalada (no funciona dentro de Expo Go). Mientras tanto, añade
          los gastos con el botón «+».
        </Muted>
      </Card>
    );
  }

  return (
    <>
      <Card style={{ borderColor: enabled ? colors.success : colors.border }}>
        <H2>{enabled ? 'Activado ✓' : 'Qué vamos a leer'}</H2>
        <Muted>
          Para apuntar tus pagos solos, Taimo necesita permiso para leer las notificaciones. Solo usa las de Google Wallet y
          las de tu banco ({Object.values(PAYMENT_APPS).join(', ')}) que avisan de un pago con importe. El resto de
          notificaciones se ignoran. Nada sale de tu móvil.
        </Muted>
      </Card>
      {!enabled ? (
        <Button
          label="Dar permiso"
          onPress={async () => {
            await ensureNotificationPermission();
            openNotificationAccessSettings();
          }}
        />
      ) : null}
      <Muted>En la pantalla de Ajustes que se abre, busca «Taimo» y actívalo.</Muted>
    </>
  );
}

export default function Automation() {
  const isAndroid = Platform.OS === 'android';
  return (
    <Screen>
      <Text style={{ color: colors.text, fontSize: 24, fontWeight: '700' }}>
        {isAndroid ? 'Pagos apuntados solos' : 'Paga con Apple Pay y olvídate'}
      </Text>

      {isAndroid ? (
        <AndroidSetup />
      ) : (
        <>
          <Muted>
            iPhone tiene una automatización que se ejecuta cada vez que pagas con Apple Pay. Taimo la usa para apuntar el
            importe y el comercio al momento, sin conectar tu banco. Se configura una vez.
          </Muted>
          {nativeCaptureAvailable ? <Steps steps={STEPS_INTENT} /> : null}
          {nativeCaptureAvailable ? <H2>Si no te aparece la acción de Taimo</H2> : null}
          <Steps steps={STEPS_URL} />
          <View style={{ backgroundColor: colors.surfaceAlt, borderRadius: radius.md, padding: space.md }}>
            <Text selectable style={{ color: colors.primary, fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }) }}>
              {CAPTURE_URL}
            </Text>
          </View>
          <Button label="Abrir Atajos" onPress={() => Linking.openURL('shortcuts://').catch(() => {})} />
          <Button
            label="Permitir avisos de Taimo"
            variant="secondary"
            onPress={() => ensureNotificationPermission().catch(() => {})}
          />
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
        Solo se apuntan solos los pagos con el móvil o el reloj. Los pagos en efectivo, Bizum o con la tarjeta física se
        añaden con «+» o importando el extracto del banco en Ajustes.
      </Muted>
    </Screen>
  );
}
