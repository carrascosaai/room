# Taimo · Checklist de lanzamiento (España primero)

Estado comprobado en el repo a 14/10/2026. Marca cada casilla al terminar.

## 1. Cuentas y datos legales

- [ ] **Apple Developer Program** (99 €/año). Si publicas como empresa: cuenta de organización con **número D-U-N-S** (tarda días). El nombre del vendedor que se ve en la App Store es el de la cuenta.
- [ ] **Google Play Console** (25 $ una vez). Verificación de identidad. **Cuentas personales nuevas: prueba cerrada con al menos 12 testers durante 14 días seguidos** antes de poder pedir producción; una cuenta de organización no lo exige.
- [ ] Datos de la empresa para los textos legales: nombre legal, NIF/CIF, domicilio, correo de privacidad, DPD (o justificación de no tenerlo). Rellenar los `[CORCHETES]` de `privacy-policy-es.md`, `privacy-policy-en.md` y `terms-es.md`.
- [ ] **Team ID** de Apple (Membership → Team ID, 10 caracteres). Añadirlo en `app.json` → `expo.ios.appleTeamId`. **Ahora no está**, y `@bacons/apple-targets` (widget de iPhone) lo necesita para firmar.
- [ ] Correo de soporte y URL de soporte para las fichas (obligatorios en las dos tiendas).

## 2. Identificadores (ya en `app.json`)

- iOS bundle id: **`app.taimo`** · Android package: **`app.taimo`** · App Group: **`group.app.taimo`** · esquema de enlaces: **`taimo://`**.
- [ ] En developer.apple.com → Identifiers: crear `app.taimo` con las capacidades **App Groups** (`group.app.taimo`) y **Sign in with Apple**. Crear también el id del widget (`app.taimo.<nombre del target>`, el que genere `@bacons/apple-targets` en el prebuild; comprobarlo en Xcode) con el mismo App Group.
- [ ] `expo-notifications` añade la capacidad Push Notifications (`aps-environment`). La app solo usa avisos **locales**; se puede dejar (no molesta) o quitar en el plugin para no tener que explicarla.
- [ ] Crear la app en App Store Connect (nombre «Taimo: gastos y presupuesto», idioma principal español, SKU) y en Play Console (paquete `app.taimo`).
- [ ] Reservar el nombre: si «Taimo» está cogido en alguna tienda, la ficha usa «Taimo: …», que ya es distinto.

## 3. Build con EAS

- [ ] **No existe `eas.json`**: `npx eas-cli@latest build:configure` y definir perfiles `development`, `preview` (APK/TestFlight interno) y `production`.
- [ ] Variables de entorno en EAS (`eas env:create`, entorno production): `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `EXPO_PUBLIC_WEB_URL` (dominio definitivo de las páginas de pago/«Paga tu parte»; si no, se usa `https://room-seven-steel.vercel.app/taimo`, ver `src/sync/api.ts`).
- [ ] Subir `version` / `buildNumber` / `versionCode` en cada envío (`"autoIncrement": true` en el perfil production).
- [ ] `npm test` y `npm run typecheck` en verde antes de cada build.
- [ ] `eas build --platform ios --profile production` → `eas submit` a TestFlight.
- [ ] `eas build --platform android --profile production` (AAB) → pista de prueba interna/cerrada.
- [ ] Firma Android gestionada por EAS + **Play App Signing**; guardar la clave de subida.
- [ ] **Manifiesto de privacidad de iOS** (`PrivacyInfo.xcprivacy`): la app usa `UserDefaults` (cola de pagos del App Intent y App Group) y AsyncStorage. Declarar en `app.json` → `expo.ios.privacyManifests` las *required reason APIs* (UserDefaults: `CA92.1` y `1C8F.1` para el App Group; FileTimestamp/SystemBootTime/DiskSpace si los usan las librerías). Revisar el aviso de App Store Connect tras la primera subida.
- [ ] `ITSAppUsesNonExemptEncryption: false` ya está (solo HTTPS): responder «No» a cifrado propio.

## 4. Supabase

- [ ] Crear proyecto en región UE (**`eu-west-1` Irlanda o `eu-central-1` Fráncfort**) y anotar la región en las políticas de privacidad.
- [ ] Aplicar las migraciones **en orden** (`supabase/migrations/`):
  1. `20261013000000_taimo_groups.sql`
  2. `20261014000000_taimo_backups.sql`
  3. `20261015000000_taimo_groups_v2.sql`
  4. `20261016000000_taimo_groups_v3_pay.sql`
  5. `20261017000000_taimo_groups_v4_hardening.sql`
- [ ] Pasar las pruebas SQL (`supabase/tests/groups_test.sql`, `backups_test.sql`) contra una base local o una rama de Supabase.
- [ ] Ejecutar los *advisors* de seguridad y rendimiento de Supabase y confirmar que las tablas de grupos no tienen políticas (RLS sin políticas, acceso solo por funciones) y que `taimo_backups` solo es accesible por su dueño.
- [ ] Plan: el gratuito **pausa el proyecto tras 1 semana sin actividad** y no tiene copias diarias: usar plan Pro para producción.
- [ ] Firmar el **DPA** de Supabase (encargado de tratamiento) y el del alojamiento web.
- [ ] Decidir y, si se puede, automatizar la retención de grupos inactivos (p. ej. `pg_cron` que borre grupos sin cambios en 24 meses) y reflejar el plazo en la política.

## 5. Inicio de sesión (OAuth)

- [ ] **Google**: Google Cloud Console → pantalla de consentimiento (nombre Taimo, logo, enlaces a privacidad y condiciones, dominio verificado) → cliente OAuth tipo *Web* → Client ID y secreto en Supabase → Authentication → Providers → Google. Publicar la pantalla de consentimiento (salir de «Testing»).
- [ ] **Apple**: Services ID + clave de Sign in with Apple (.p8) → Supabase → Providers → Apple. Añadir **`app.taimo`** como Client ID para el botón nativo. Configurar el *Private Email Relay* con el dominio del correo que envíe (si se envían correos).
- [ ] Supabase → Authentication → URL Configuration: añadir **`taimo://auth-callback`** (y la URL web si se usa login en la web).
- [ ] Probar login, copia, «Recuperar copia» y cierre de sesión en los dos sistemas.
- [x] **Borrar la cuenta desde la app (guía 5.1.1(v))**: hecho en Ajustes → Cuenta → «Borrar mi cuenta» (RPC `taimo_delete_account`, migración 20261018). Falta: aplicar la migración en Supabase, revocar el token de Sign in with Apple y la URL web de borrado para Google Play. Nota original:: si una app permite crear cuenta, debe permitir borrarla dentro de la app. Hoy solo hay «Cerrar sesión» y «Borrar todos mis datos» (local). Hace falta un botón «Borrar mi cuenta» que borre la fila de `taimo_backups` y el usuario de `auth.users` (necesita una Edge Function o RPC `security definer` con la service role; `on delete cascade` ya borra la copia), y revocar el token de Sign in with Apple. Google Play además exige una **URL web para pedir el borrado**.

## 6. Páginas legales y web pública (Room, `/taimo`)

La web de Taimo se publica dentro de Room con `scripts/publish-to-room.sh` (deja la exportación en `public/taimo`) y Next.js reescribe `/taimo/*` a `public/taimo/index.html` (`next.config.mjs`).

- [ ] Convertir `privacy-policy-es.md`, `privacy-policy-en.md` y `terms-es.md` a HTML sencillo y servirlos en, por ejemplo:
  - `https://<dominio>/taimo/legal/privacidad.html` · `/taimo/legal/privacy.html` · `/taimo/legal/terminos.html` (los genera `scripts/publish-to-room.sh` cuando ya no tienen huecos [ ]) · `/taimo/borrar-cuenta` (formulario o instrucciones de borrado para Google Play)
- [ ] ⚠️ **Ojo**: `publish-to-room.sh` hace `rm -rf ../public/taimo`, así que cualquier archivo legal puesto a mano en `public/taimo/` desaparece en la siguiente publicación. Opciones: rutas de Next.js (`src/app/taimo/privacidad/page.tsx`, que tienen prioridad sobre la reescritura), o añadir al script un paso que copie los HTML legales después de exportar.
- [ ] Comprobar que esas URLs responden 200 sin iniciar sesión y que las pantallas `/taimo/pay`, `/taimo/mesa` y `/taimo/mesa-pagado` funcionan en Safari y Chrome móviles.
- [ ] Usar un dominio propio estable (las URLs de privacidad no deberían cambiar) y ponerlo en `EXPO_PUBLIC_WEB_URL` antes del build final: los QR y enlaces que se generen quedarán apuntando ahí.
- [ ] Enlazar privacidad y condiciones desde Ajustes de la app [la app aún no tiene enlace; recomendable] y desde las fichas de las tiendas.

## 7. Fichas de las tiendas

- [ ] Pegar textos de `store-listing-es.md` (es-ES, idioma principal) y `store-listing-en.md` (en-GB/en-US). Las otras 18 lenguas pueden ir después.
- [ ] Categoría: **Finanzas** (secundaria: Productividad/Estilo de vida). Precio: gratis. Sin compras dentro de la app.
- [ ] Clasificación por edades: cuestionario sin contenido sensible → 4+ (Apple) / PEGI 3 (Play). Indicar que no está dirigida a menores de 14 (Play: público objetivo 18+ o 16+ para evitar requisitos de Familias).
- [ ] App Privacy y Data safety: copiar `app-privacy-labels.md`.
- [ ] Icono 1024×1024 sin transparencia (iOS) y 512×512 + gráfico destacado 1024×500 (Play).

### Capturas de pantalla

Tamaños: iPhone 6,9" (1320×2868) obligatorio [6,5" opcional]; Android teléfono ≥ 1080 px de lado corto (2–8 capturas). Sin iPad (`supportsTablet: false`). Usar datos de ejemplo realistas en euros, móvil en español, sin datos reales de nadie.

1. **Inicio**: «Te queda este mes…», cuánto puedes gastar al día y el aviso «⚡ Apuntado en Taimo». Texto: «Pagas y se apunta solo. Sin claves del banco».
2. **Registro automático**: iPhone, la automatización de Atajos/Wallet; Android, la pantalla de permiso de notificaciones con los bancos. Texto: «Tu banco no se conecta. Tus datos no salen del móvil».
3. **Paga tu parte**: QR en la mesa + la página web que ve el amigo con «Toca lo que has tomado». Texto: «Cada uno paga lo suyo. Sin instalar nada».
4. **Dinero que es tuyo**: cobro repetido + vuelo + devolución. Texto: «Taimo encuentra dinero que es tuyo».
5. **Grupo de pareja o piso**: saldos, «Le toca pagar a…» y botones Bizum/PayPal. Texto: «Pareja, piso y viajes, sin cuentas raras».
6. **Escanear ticket / Pegar aviso del banco**. Texto: «Foto al ticket o pega el aviso del banco».
7. **Estadísticas y presupuestos** por categoría.
8. **Metas, retos y lista de deseos** o **viaje con varias monedas**.

## 8. Google Play: acceso a notificaciones

- [ ] La pantalla «Registro automático» (`src/app/automation.tsx`) es la **divulgación destacada**: antes de abrir los ajustes debe decir con claridad qué lee (avisos de pago de bancos y carteras), qué no lee (mensajería, correo, redes sociales; lista `deny` en `taimo_payment_rules.json`), que todo se procesa en el móvil y que no se envía a nadie, y pedir una acción afirmativa («Activar»). Revisar el texto en `es.ts`/`en.ts`.
- [ ] En Play Console → Contenido de la app → **Política de datos de usuario**: explicar el uso del `NotificationListenerService` en las notas para revisión (texto en el apartado 9, versión Android).
- [ ] Vídeo corto (YouTube, no listado) mostrando: activar el permiso → llega un aviso de pago real → aparece el gasto. Google suele pedirlo para funciones con acceso sensible.
- [ ] Confirmar que **no** se pide `READ_SMS`/`RECEIVE_SMS` (hoy no se piden) para no entrar en el formulario de SMS.

## 9. Notas para la revisión

### Apple (App Review Information → Notes)

```text
Taimo is a personal expense tracker. It never connects to banks and never asks for bank credentials. Sign-in is optional ("Continue without account" on the welcome screen); no demo account is needed.

Automatic logging on iPhone uses the user's own Shortcuts personal automation:
1. Shortcuts app > Automation > New > "Transaction" (Wallet) trigger, select the cards.
2. Action: "Log payment in Taimo" (our App Intent), passing Amount, Merchant and Card from the trigger.
3. Set it to run immediately. After each Apple Pay payment the expense is logged without opening the app, and a local notification confirms it.
The app shows these steps in More > Automatic logging. The data stays on the device. Taimo does not use Wallet/PassKit APIs directly.

To test without a real payment: open taimo://capture?amount=12,50&merchant=Mercadona (e.g. from Notes or Safari), or run the "Log payment in Taimo" action from the Shortcuts app with any amount. Siri: "Log an expense in Taimo".

"Pay your part" (split a restaurant bill): Home > "Pay your part" > enter the total or snap the receipt > "Show the QR". The QR opens a web page where friends pick their items and pay the payer via Bizum/PayPal/Revolut/bank transfer outside the app. Taimo does not process payments.

Cloud features (optional): Sign in with Apple/Google enables a private backup; shared groups sync via an invite code. Account deletion: Settings > Account > Delete my account.
```

### Google Play (notas de la revisión / declaración de notificaciones)

```text
Taimo is a personal expense tracker. It does not connect to banks or ask for bank credentials. With the user's explicit opt-in (More > Automatic logging > prominent disclosure > system settings), Taimo uses NotificationListenerService only to detect payment notifications from banking and wallet apps (e.g. Google Wallet) and bank SMS shown as notifications, and turns them into expense entries. Messaging, email and social apps are excluded by a deny list, any app can be ignored by the user, non-payment notifications are discarded without being stored, and all processing happens on the device; notification content is never transmitted. Sign-in is optional; no demo account is needed.
```

## 10. Pruebas en dispositivos reales (antes de enviar)

El código nativo no se ha compilado nunca en un dispositivo (ver README, «Pendiente de probar en un móvil real»).

**iPhone (iOS 17 o superior para el disparador «Transacción»; el App Intent requiere iOS 16)**
- [ ] La acción «Registrar pago en Taimo» aparece en Atajos y recibe Importe/Comercio/Tarjeta del disparador «Transacción» con **tarjetas españolas** (BBVA, Santander, CaixaBank, ING, Revolut…) y con un pago en otra moneda.
- [ ] El aviso «⚡ Apuntado en Taimo» sale sin abrir la app; al abrirla, el gasto está y no se duplica.
- [ ] Siri en español e inglés: «Oye Siri, apunta un gasto en Taimo».
- [ ] Recordatorio de cada noche a las 21:30 (activar, recibir, tocar → abre «Añadir gasto»; desactivar).
- [ ] «Pegar aviso del banco» con avisos y SMS reales copiados de varios bancos.
- [ ] Widget de iPhone (App Group) y accesos rápidos.
- [ ] OCR de tickets reales (Mercadona, restaurante con varios platos, ticket arrugado).
- [ ] Face ID / código al abrir; modo claro/oscuro; letra grande del sistema.

**Android (varios fabricantes: Pixel, Samsung, Xiaomi; Android 10–15)**
- [ ] El módulo compila y el permiso de acceso a notificaciones se activa desde la app.
- [ ] **Avisos reales** de Google Wallet, Samsung Wallet y de las apps de bancos españoles (BBVA, Santander, CaixaBank/imagin, ING, Openbank, Sabadell, Bankinter, Kutxabank, Unicaja, ABANCA, EVO, Revolut, N26) y **SMS del banco**: se apuntan, con importe y comercio correctos. Confirmar los nombres de paquete de `PAYMENT_APPS` / `taimo_payment_rules.json` (algunos están sin verificar).
- [ ] Un pago que llega por Wallet y por el banco cuenta **una vez**.
- [ ] No se apuntan: ingresos, devoluciones, códigos de verificación, pagos rechazados, saldos, ofertas, mensajes de WhatsApp con importes.
- [ ] El listener sigue funcionando tras reiniciar el móvil y con ahorro de batería agresivo (Xiaomi/Samsung).
- [ ] Widget de Android, «Pegar aviso del banco», OCR con ML Kit sin conexión.

**Común**
- [ ] Grupo compartido entre un iPhone y un Android: invitar por WhatsApp, editar a la vez, gastos fijos de piso, datos de cobro.
- [ ] «Paga tu parte» de punta a punta con 3 móviles (uno sin Taimo): QR → web → pagar → aviso por WhatsApp → «Pegar un aviso de pago» lo apunta.
- [ ] Enlace «Pedir el dinero» abre la web y los botones de Bizum (copiar), PayPal y Revolut funcionan.
- [ ] Importar extractos CSV reales de bancos españoles y un CAMT.053.
- [ ] Sin conexión: la app funciona; los tipos de cambio usan los últimos guardados.
- [ ] Iniciar sesión → copia → borrar app → reinstalar → recuperar copia (sin ingresos, como se promete).

## 11. Día del lanzamiento

- [ ] Publicación manual (no automática) tras la aprobación, a la vez en las dos tiendas.
- [ ] Supabase en plan de pago, alertas de uso y copia diaria activas.
- [ ] Correo de privacidad y soporte revisado a diario la primera semana.
- [ ] Responder reseñas; vigilar fallos de captura por banco para ajustar `taimo_payment_rules.json`.
