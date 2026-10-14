# Taimo

Pagas con el móvil y Taimo lo apunta solo. Te dice cuánto te queda en cada categoría y reparte los gastos con tu
pareja o tu piso. Sin conectar el banco: tus gastos personales no salen de tu móvil.

App para iPhone y Android hecha con [Expo](https://expo.dev) (React Native + TypeScript, Expo Router).

## Qué hace

- **20 idiomas**: español, inglés, francés, alemán, italiano, portugués, catalán, euskera, gallego, neerlandés,
  sueco, noruego, danés, finés, polaco, checo, rumano, griego, turco y ucraniano. Se elige solo según el idioma del
  móvil y se cambia en un toque (en la bienvenida y en Ajustes). **Las 155 monedas del mundo** con formato local.
- **Inicio de sesión con Apple y Google** (opcional) con **copia de seguridad privada**: al entrar en otro móvil se
  recuperan los datos.
- **Gráficas por día (horas), semana, mes, año y todo**, con comparación frente al periodo anterior, media,
  reparto por categoría y gastos más grandes. Toca una barra para ver su importe.

- **Presupuestos por categoría** y en Inicio: lo que te queda este mes y **cuánto puedes gastar al día**.
- **Cada gasto en horas de trabajo** (opcional): «esta cena ≈ 4 h 55 min de tu trabajo», al apuntar, en la lista de
  deseos, en los gastos hormiga y en Inicio («este mes llevas 17 h 55 min de trabajo gastadas»).
- **Lista de deseos con la regla de las 48 horas**: apuntas el capricho, Taimo te avisa a las 48 h y, si ya no lo
  quieres, cuenta como ahorro («te has ahorrado 60 € en caprichos»).
- **Gastos hormiga**: pequeños gastos repetidos (cafés, snacks…) con lo que cuestan al mes y al año.
- **Mapa del mes**: calendario coloreado por lo que gastaste cada día.
- **Logros**: primer pago automático, rachas de 7 y 30 días, mes dentro del presupuesto, reto superado, meta cumplida…
- **Siri** (iPhone): «Oye Siri, apunta un gasto en Taimo» → «50 euros en comida». Se apunta sin abrir la app, ideal
  para el efectivo. Frases en los 12 idiomas de la app que tiene Siri.
- **Escanear el ticket**: foto → importe, comercio, fecha y productos, leídos en el propio móvil (Vision en iPhone,
  ML Kit en Android). En grupos, los productos quedan listos para repartir.
- **Pregunta a Taimo**: «¿cuánto gasté en Glovo este año?», «¿puedo permitirme 400 € en diciembre?», «¿en qué gasto
  más?», «¿cuánto me deben?». Las respuestas se calculan en el móvil, sin internet.
- **Retos de ahorro** (una semana sin comer fuera, gastar menos que la semana pasada, 3 días sin gastar) y **racha** de
  días sin pasarte de tu límite diario.
- **Widget** en la pantalla de inicio (iPhone y Android) con lo que te queda y botones para apuntar o escanear, y
  **accesos rápidos** al mantener pulsado el icono.
- **Aviso el día antes de cada cobro de suscripción**: «Mañana te cobran Netflix (12,99 €). ¿Lo sigues usando?».
- **Apuntar rápido escribiendo como hablas**: «café 2,50», «ramen ¥1200», «cena 45 con Ana y yo ayer» (importe,
  moneda, comercio, categoría, grupo y «ayer» en los 20 idiomas). Con grupo abre el formulario ya relleno.
- **Modo viaje inteligente**: los pagos con tu tarjeta en otra moneda durante un viaje se proponen para el grupo del
  viaje y, con un toque, pasan a la moneda del viaje repartidos como reparte el grupo.
- **Categorías en todo el mundo**: cadenas y palabras de muchos países e idiomas (Tesco, Walmart, Rewe, Магнит,
  セブンイレブン, «dinner», «Miete»…).
- **Tu mes en Taimo**: resumen mensual para compartir (gasto, comparación, categoría y día más caro, presupuesto,
  gastos compartidos y apuntados solos). Aparece en Inicio los primeros días del mes y en Estadísticas.
- **Presupuesto automático**: «✨ Proponer según lo que gasto» pone en cada categoría la media de tus últimos meses
  (o extrapola este mes si aún no hay historial), redondeada hacia arriba.
- **Avisos al 80 % y al 100 %** de cada categoría también con los pagos que se apuntan solos.
- **Modo claro, oscuro o como el móvil.**
- **Copia en un archivo** (sin cuenta) para pasar todo a otro móvil, y **bloqueo con Face ID, huella o código**.
- **Previsión de fin de mes**: «a este ritmo acabarás el mes en 1105 €: te pasarás 465 €» (los gastos fijos se
  cuentan una vez, el resto al ritmo que llevas) y aviso cuando una categoría va disparada frente a lo que sueles
  llevar a esas alturas del mes.
- **Suscripciones detectadas solas**: cobros que se repiten cada mes (Netflix, Spotify, gimnasio…) con lo que
  cuestan al mes y al año.
- **Metas de ahorro** (un viaje, el carné, un portátil): cuánto llevas, cuánto apartar al mes para llegar a tiempo
  y, cuando vas a terminar el mes con dinero de sobra, Inicio te propone apartarlo en un toque.
- **Historial completo** agrupado por días con buscador (sin tildes) y filtros por categoría o grupo.
- **Fecha del gasto**: hoy, ayer o cualquier día de la última semana.
- **Registro automático de pagos**
  - **iPhone**: automatización de Atajos con el disparador «Transacción» de Wallet: cualquier tarjeta de Wallet, de
    cualquier banco y país, en cualquier moneda. Dos formas:
    - Acción **«Registrar pago en Taimo»** (App Intent nativo): apunta el pago **sin abrir la app** y muestra un aviso
      «⚡ Apuntado en Taimo». Necesita la app instalada (no Expo Go).
    - Enlace `taimo://capture?amount=…&merchant=…&card=…`: abre Taimo un segundo. Funciona también en Expo Go.
  - **Android**: lector de notificaciones **universal**: cualquier banco, cartera (Google Wallet, Samsung Wallet,
    PayPal, Revolut, Nubank, Mercado Pago, Paytm, Alipay, M-PESA…) o **SMS del banco**, en cualquier país, idioma
    (~25) y moneda (155, con símbolo o código: «¥3,000», «R$ 45,90», «Rs.500 debited», «1 234,56 zł»). Descarta
    ingresos, devoluciones, códigos de verificación, pagos rechazados, saldos y ofertas; nunca lee WhatsApp, correo
    ni redes sociales. Si el mismo pago llega por Wallet y por el banco, cuenta una vez. Desde «Registro automático»
    puedes ignorar cualquier app. Las reglas viven en un JSON que comparten el lector nativo (Kotlin) y la app
    (`modules/taimo-capture/android/src/main/assets/taimo_payment_rules.json`). Nada sale del móvil.
  - Los pagos en otra moneda (viajes, compras online) se guardan convertidos a la tuya, con el importe original.
  - Taimo adivina la categoría por el comercio, aprende de tus correcciones y evita duplicados.
- **Extractos de cualquier banco del mundo**: CSV en cualquier idioma (columnas de importe o de cargo/abono, fechas
  día/mes o mes/día), **OFX/QFX, QIF, CAMT.053 (ISO 20022) y MT940**, convertidos a tu moneda si vienen en otra.
- **Gastos a mano** en dos toques, con fecha (hoy, ayer o la última semana).
- **Grupos compartidos, más allá de Tricount.** Cada tipo de grupo trae lo que necesita:
  - **Pareja**: reparto por defecto aunque no vayáis al 50 % (60/40, 70/30…), presupuesto mensual común y
    **«Le toca pagar a…»**: quién debería pagar lo siguiente para equilibraros sin hacer transferencias.
  - **Piso**: **gastos fijos** (alquiler, luz, Netflix) que se apuntan solos el día que toca cada mes, sin
    duplicarse aunque los tengan varios móviles.
  - **Viaje**: moneda del grupo, fechas y presupuesto: **cuánto podéis gastar al día entre todos y por persona**,
    coste por persona y en qué monedas se ha pagado.
  - **Bote común**: cada uno pone dinero, los gastos comunes se pagan con el bote y lo que sobra se devuelve, con
    saldos justos aunque cada uno ponga cantidades distintas.
  - **Pagar la deuda en un toque**: cada miembro comparte cómo cobra (Bizum, IBAN, PayPal, Revolut) y quien debe paga
    con el importe puesto.
  - Cuatro formas de repartir cada gasto: **a partes iguales, por proporción, importes exactos o por productos del
    ticket** (cada uno paga lo suyo y la propina e impuestos van en proporción).
  - Quién ha pagado qué, gasto por categoría, **🔔 Recordar** (manda por WhatsApp lo que debe cada uno) y cómo
    quedar en paz con las mínimas transferencias. **Invita por WhatsApp** con un enlace o un código: todo se
    sincroniza, también los ajustes del grupo. **A tu presupuesto solo cuenta tu parte**, convertida a tu moneda.
- **Cobrar sin perseguir a nadie**: pon tu Bizum, IBAN, PayPal.me o Revolut en Ajustes y cada recordatorio lleva
  cómo pagarte (con enlace de PayPal con el importe ya puesto). **Compartir resumen** del grupo o del viaje por
  WhatsApp: total, por categoría, quién debe a quién y cómo pagarte.
- **Monedas de todo el mundo** (viajes, Erasmus): cada gasto se apunta en la moneda en la que pagaste (yenes, pesos,
  coronas…) y Taimo lo convierte a la moneda del grupo o a la tuya, guardando el cambio de ese día. **Conversor**
  con 155 monedas, buscador por país y las que más usas. El cambio se actualiza solo (fuentes gratuitas, sin
  clave) y sin conexión usa el último guardado.
- **Estadísticas**: día, semana, mes, año y todo; la comparación es justa (del 1 al 14 contra del 1 al 14). **Exportar a CSV** (Excel).
- **Resumen semanal** cada domingo a las 20:00.

## Probarla

```bash
npm install
npm start          # escanea el QR con Expo Go (sin captura nativa)
npm run web        # en el navegador
npm test           # 76 pruebas (lógica, idiomas, gráficas)
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
2. Ejecuta en el editor SQL, en orden, los archivos de `supabase/migrations/` (grupos, copias de seguridad, grupos v2
   con tipo, moneda, presupuesto, gastos fijos y repartos, y v3 con cómo cobra cada miembro).
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
  ui/               tema (negro y verde menta) y componentes
modules/taimo-capture/   módulo nativo (Swift + Kotlin): cola de pagos y lector de notificaciones
native/ios/              App Intent «Registrar pago en Taimo» (lo añade plugins/withTaimoAppIntent.js)
supabase/                migración SQL y pruebas
tests/                   pruebas con Vitest
```

## Idiomas

Los textos están en `src/i18n/locales/` (un archivo por idioma; `en.ts` define las claves). La prueba
`tests/i18n.test.ts` comprueba que ningún idioma se deja una clave ni un `{hueco}`. Para añadir uno: copia `en.ts`,
tradúcelo, añádelo a `src/i18n/languages.ts` y a `src/i18n/index.tsx`.

## Inicio de sesión (Apple y Google)

Usa Supabase Auth (las mismas variables que los grupos). Para activarlo en el proyecto de Supabase:

1. Ejecuta `supabase/migrations/20261014000000_taimo_backups.sql` (tabla de copias, solo visible para su dueño).
2. **Google**: crea un cliente OAuth en Google Cloud Console y pon su Client ID y secreto en Supabase →
   Authentication → Providers → Google.
3. **Apple** (requiere la cuenta de Apple Developer): crea un Services ID y una clave de Sign in with Apple, y ponlos
   en Supabase → Authentication → Providers → Apple. Añade el bundle id `app.taimo` como Client ID para el botón
   nativo del iPhone.
4. En Supabase → Authentication → URL Configuration, añade `taimo://auth-callback` a las Redirect URLs.

Sin esto, los botones aparecen pero avisan de que el inicio de sesión aún no está disponible.

## Pendiente de probar en un móvil real

El código nativo no se ha podido compilar en el entorno donde se escribió (no hay Xcode ni Android SDK):

- iPhone: que la acción «Registrar pago en Taimo» aparezca en Atajos y reciba Importe/Comercio/Tarjeta del
  disparador «Transacción» con tarjetas españolas.
- Android: que compile el módulo, que el permiso de notificaciones funcione y **los identificadores de las apps de
  los bancos** en `PAYMENT_APPS` (algunos hay que confirmarlos) y el formato real de sus avisos.
- Google Play pedirá justificar el permiso de notificaciones (la app ya muestra el aviso previo que exige).
