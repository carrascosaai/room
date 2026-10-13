# Taimo

Pagas con el móvil y Taimo lo apunta solo. Te dice cuánto te queda en cada categoría y reparte los gastos con tu
pareja o tu piso. Sin conectar el banco: tus gastos personales no salen de tu móvil.

App para iPhone y Android hecha con [Expo](https://expo.dev) (React Native + TypeScript, Expo Router).

## Qué hace

- **Presupuestos por categoría** y en Inicio: lo que te queda este mes y **cuánto puedes gastar al día**.
- **Registro automático de pagos**
  - **iPhone**: automatización de Atajos con el disparador «Transacción» de Wallet. Dos formas:
    - Acción **«Registrar pago en Taimo»** (App Intent nativo): apunta el pago **sin abrir la app** y muestra un aviso
      «⚡ Apuntado en Taimo». Necesita la app instalada (no Expo Go).
    - Enlace `taimo://capture?amount=…&merchant=…&card=…`: abre Taimo un segundo. Funciona también en Expo Go.
  - **Android**: lector de notificaciones de Google Wallet y de los bancos (BBVA, Santander, CaixaBank, Revolut,
    N26…). Solo lee las de esas apps que llevan un importe y no envía nada fuera del móvil. Avisa con
    «⚡ 12,40 € apuntados en Taimo».
  - Taimo adivina la categoría por el comercio, aprende de tus correcciones y evita duplicados.
- **Gastos a mano** en dos toques e **importación del extracto del banco (CSV)** para tarjeta física, Bizum o recibos.
- **Grupos compartidos** (pareja, piso, viaje): quién pagó y entre quién se reparte. **A tu presupuesto solo cuenta tu
  parte.** Calcula quién debe a quién y cómo quedar en paz. **Invita por WhatsApp** con un enlace o un código: cada
  miembro ve el grupo en su móvil y todo se sincroniza.
- **Estadísticas**: mes, día, categoría y últimos 6 meses. **Exportar a CSV** (Excel).
- **Resumen semanal** cada domingo a las 20:00.

## Probarla

```bash
npm install
npm start          # escanea el QR con Expo Go (sin captura nativa)
npm run web        # en el navegador
npm test           # 47 pruebas de la lógica
npm run typecheck
```

Simular un pago con Apple Pay en el navegador: `http://localhost:8081/capture?amount=12,50&merchant=Mercadona`.

### Con la captura nativa (App Intent en iPhone, notificaciones en Android)

Expo Go no incluye código nativo propio, así que hace falta una *development build*:

```bash
npx eas-cli@latest build --profile development --platform ios      # o android
```

(o `npx expo run:ios` / `npx expo run:android` con Xcode / Android Studio instalados).

## Grupos compartidos (Supabase)

1. Crea un proyecto gratuito en [supabase.com](https://supabase.com) (región `eu-west-1` o similar).
2. Ejecuta `supabase/migrations/20261013000000_taimo_groups.sql` en el editor SQL del proyecto.
3. Copia `.env.example` a `.env` y pon la URL y la clave pública (anon) del proyecto.

Modelo de seguridad: sin cuentas de usuario. Cada grupo tiene un código de 16 caracteres imposible de adivinar; quien
lo tiene puede ver y editar ese grupo (como Splitwise o Tricount). Las tablas están cerradas (RLS sin políticas) y
todo pasa por funciones SQL que exigen el código. Solo se guardan los gastos de grupos, nunca los personales ni las
notas privadas. Gana el cambio más reciente; los borrados viajan como marcas.

Pruebas del servidor (con un Postgres local y la migración aplicada):

```bash
PGHOST=/tmp PGPORT=5499 PGUSER=postgres npm run test:db
TAIMO_PG="-h /tmp -p 5499 -U postgres" npx vitest run tests/sync.integration.test.ts   # dos móviles sincronizando
```

## Estructura

```
src/
  app/              pantallas (Expo Router)
    (tabs)/         Inicio, Grupos, Estadísticas, Ajustes
    add.tsx         añadir / editar gasto
    capture.tsx     destino del enlace del Atajo
    join.tsx        unirse a un grupo
    automation.tsx  guía del registro automático
    group/[id].tsx  detalle de un grupo e invitar
  domain/           lógica pura y probada: dinero, categorías, presupuestos, grupos,
                    capturas, notificaciones, CSV, sincronización
  capture/          vacía la cola de pagos que deja el código nativo
  sync/             cliente de Supabase y sincronización automática
  notifications/    resumen semanal
  store/            estado y guardado en el móvil
  ui/               tema (colores del Figma) y componentes
modules/taimo-capture/   módulo nativo (Swift + Kotlin): cola de pagos y lector de notificaciones
native/ios/              App Intent «Registrar pago en Taimo» (lo añade plugins/withTaimoAppIntent.js)
supabase/                migración SQL y pruebas
tests/                   pruebas con Vitest
```

## Pendiente de probar en un móvil real

El código nativo no se ha podido compilar en el entorno donde se escribió (no hay Xcode ni Android SDK):

- iPhone: que la acción «Registrar pago en Taimo» aparezca en Atajos y reciba Importe/Comercio/Tarjeta del
  disparador «Transacción» con tarjetas españolas.
- Android: que compile el módulo, que el permiso de notificaciones funcione y **los identificadores de las apps de
  los bancos** en `PAYMENT_APPS` (algunos hay que confirmarlos) y el formato real de sus avisos.
- Google Play pedirá justificar el permiso de notificaciones (la app ya muestra el aviso previo que exige).
