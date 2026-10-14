# Taimo · Ficha de tienda (español, España)

Textos listos para copiar en App Store Connect y Google Play Console. Los recuentos son de caracteres (puntos de código Unicode, que es como cuentan las dos tiendas) y se han calculado con un script sobre el texto exacto de cada bloque.

Notas antes de pegar:

- No se usan marcas de terceros (Bizum, PayPal, Revolut, Apple Pay, Google Wallet) en el nombre, el subtítulo ni las palabras clave: Apple lo rechaza (guía 2.3.7) y Google lo penaliza. En la descripción sí se pueden nombrar porque describen una función real.
- Tampoco se nombran apps de la competencia.
- Todo lo que se promete está comprobado en el código (`src/`, `modules/taimo-capture`, `native/ios`). Ver «Comprobado en el código» al final.

---

## App Store

### Nombre (máx. 30) — 27 caracteres

```text
Taimo: gastos y presupuesto
```

### Subtítulo (máx. 30) — 26 caracteres

```text
Tus pagos se apuntan solos
```

### Texto promocional (máx. 170) — 167 caracteres

```text
Paga con el móvil y Taimo lo apunta solo, sin claves del banco. Divide la cuenta del restaurante con un QR y descubre dinero que es tuyo: cobros dobles y devoluciones.
```

### Palabras clave (máx. 100, separadas por comas, sin espacios) — 94 caracteres

```text
gastos,presupuesto,ahorro,dividir,cuenta,pareja,piso,viaje,ticket,deudas,finanzas,dinero,grupo
```

(No repetir palabras del nombre o subtítulo no suma: Apple ya las indexa. Por eso «gastos» y «presupuesto» podrían cambiarse por otras, p. ej. «control,suscripciones», si hace falta sitio.)

### Descripción (máx. 4000) — 3487 caracteres

```text
Pagas con el móvil y Taimo lo apunta solo. Sin conectar tu banco y sin pedirte nunca sus claves.

Taimo es una app gratuita para llevar tus gastos sin esfuerzo: te dice cuánto te queda este mes, reparte los gastos con tu pareja, tu piso o tus amigos y te avisa cuando hay dinero que puedes recuperar. Letra grande, pocos botones y en 20 idiomas.

⚡ TUS PAGOS SE APUNTAN SOLOS
• En iPhone: preparas una vez una automatización de Atajos con Wallet y cada pago con Apple Pay se apunta solo, sin abrir la app.
• Con Siri: «Oye Siri, apunta un gasto en Taimo» y dices «50 euros en comida». Perfecto para el efectivo.
• ¿Pagas con la tarjeta de plástico? Copia el aviso o el SMS de tu banco y pulsa «Pegar aviso del banco»: el gasto se rellena solo. Y si quieres, Taimo te lo recuerda cada noche.
• Haz una foto al ticket: Taimo lee el importe, el comercio, la fecha y los productos en tu propio móvil.
• Importa el extracto de tu banco (CSV, OFX, QIF, CAMT.053 o MT940) para traer todo lo demás.
• Taimo adivina la categoría, aprende de tus correcciones y evita duplicados.

🍽️ PAGA TU PARTE
¿Cena con amigos? Haz una foto del ticket y enseña un QR. Cada uno lo escanea con la cámara, toca lo que ha tomado y te paga su parte con Bizum, PayPal, Revolut o transferencia. Ellos no tienen que instalar nada. Te avisan por WhatsApp y Taimo apunta quién ha pagado.

💸 DINERO QUE ES TUYO
Taimo revisa tus pagos y te avisa de:
• Cobros repetidos el mismo día.
• Suscripciones que suben de precio o que empiezan a cobrarte.
• Compras que aún puedes devolver, con la fecha límite.
• Vuelos por los que podrías reclamar hasta 600 € si llegaron tarde o se cancelaron.
• Aparatos que siguen en garantía.
Te prepara el mensaje para reclamar. Todo se calcula en tu móvil.

👫 PAREJA, PISO Y VIAJES
• Pareja: repartid aunque no vayáis al 50 % (60/40, 70/30 o según lo que gana cada uno) y mirad quién debería pagar lo siguiente.
• Piso: gastos fijos como el alquiler o la luz que se apuntan solos cada mes.
• Viaje: moneda del grupo, presupuesto por día y por persona.
• Bote común para poner dinero entre todos.
• Reparte a partes iguales, por porcentaje, por importes o por productos del ticket.
• Quedad en paz con las mínimas transferencias. Cada uno pone cómo cobra (Bizum, IBAN, PayPal o Revolut) y quien debe paga en un toque desde un enlace, sin instalar nada.
• Invita por WhatsApp con un enlace o un código y el grupo se sincroniza en todos los móviles. A tu presupuesto solo cuenta tu parte.

📊 TU DINERO, CLARO
• Presupuesto por categoría y cuánto puedes gastar al día.
• Avisos al 80 % y al 100 % de cada categoría.
• Previsión de cómo acabarás el mes.
• Gráficas por día, semana, mes y año.
• Suscripciones detectadas y aviso el día antes de cada cobro.
• Metas de ahorro, retos (una semana sin comer fuera…) y lista de deseos con la regla de las 48 horas.
• Cada gasto en horas de trabajo, si quieres.
• Pregunta a Taimo: «¿cuánto gasté en comida este año?».
• Widget, modo claro y oscuro.

🌍 PARA VIAJAR
155 monedas, conversor y cambio del día. Cada gasto se guarda en la moneda en la que pagaste y se convierte a la tuya.

🔒 TU PRIVACIDAD, PRIMERO
• Taimo nunca te pide las claves de tu banco y no se conecta a él.
• Tus gastos se guardan en tu móvil. Solo salen si tú quieres: copia de seguridad al iniciar sesión con Apple o Google, o un grupo que compartes.
• Bloqueo con Face ID o código.
• Sin anuncios. No vendemos tus datos.
• Puedes usarla sin crear cuenta.

Gratis. Hecha en España.
```

---

## Google Play

### Título de la app (máx. 30) — 27 caracteres

```text
Taimo: gastos y presupuesto
```

### Descripción breve (máx. 80) — 74 caracteres

```text
Tus pagos se apuntan solos, sin claves del banco. Divide cuentas y ahorra.
```

### Descripción completa (máx. 4000) — 3485 caracteres

```text
Pagas con el móvil y Taimo lo apunta solo. Sin conectar tu banco y sin pedirte nunca sus claves.

Taimo es una app gratuita para llevar tus gastos sin esfuerzo: te dice cuánto te queda este mes, reparte los gastos con tu pareja, tu piso o tus amigos y te avisa cuando hay dinero que puedes recuperar. Letra grande, pocos botones y en 20 idiomas.

⚡ TUS PAGOS SE APUNTAN SOLOS
• Si nos das permiso, Taimo lee en tu móvil los avisos de pago de tu banco, de Google Wallet y de otras carteras, y apunta el gasto al momento. Nunca lee WhatsApp, el correo ni las redes sociales, y puedes desactivar cualquier app.
• ¿Tienes el aviso o el SMS del banco? Cópialo y pulsa «Pegar aviso del banco»: el gasto se rellena solo.
• Haz una foto al ticket: Taimo lee el importe, el comercio, la fecha y los productos en tu propio móvil.
• Importa el extracto de tu banco (CSV, OFX, QIF, CAMT.053 o MT940) para traer todo lo demás.
• Taimo adivina la categoría, aprende de tus correcciones y evita duplicados: si el mismo pago llega por la cartera y por el banco, cuenta una vez.

🍽️ PAGA TU PARTE
¿Cena con amigos? Haz una foto del ticket y enseña un QR. Cada uno lo escanea con la cámara, toca lo que ha tomado y te paga su parte con Bizum, PayPal, Revolut o transferencia. Ellos no tienen que instalar nada. Te avisan por WhatsApp y Taimo apunta quién ha pagado.

💸 DINERO QUE ES TUYO
Taimo revisa tus pagos y te avisa de:
• Cobros repetidos el mismo día.
• Suscripciones que suben de precio o que empiezan a cobrarte.
• Compras que aún puedes devolver, con la fecha límite.
• Vuelos por los que podrías reclamar hasta 600 € si llegaron tarde o se cancelaron.
• Aparatos que siguen en garantía.
Te prepara el mensaje para reclamar. Todo se calcula en tu móvil.

👫 PAREJA, PISO Y VIAJES
• Pareja: repartid aunque no vayáis al 50 % (60/40, 70/30 o según lo que gana cada uno) y mirad quién debería pagar lo siguiente.
• Piso: gastos fijos como el alquiler o la luz que se apuntan solos cada mes.
• Viaje: moneda del grupo, presupuesto por día y por persona.
• Bote común para poner dinero entre todos.
• Reparte a partes iguales, por porcentaje, por importes o por productos del ticket.
• Quedad en paz con las mínimas transferencias. Cada uno pone cómo cobra (Bizum, IBAN, PayPal o Revolut) y quien debe paga en un toque desde un enlace, sin instalar nada.
• Invita por WhatsApp con un enlace o un código y el grupo se sincroniza en todos los móviles. A tu presupuesto solo cuenta tu parte.

📊 TU DINERO, CLARO
• Presupuesto por categoría y cuánto puedes gastar al día.
• Avisos al 80 % y al 100 % de cada categoría.
• Previsión de cómo acabarás el mes.
• Gráficas por día, semana, mes y año.
• Suscripciones detectadas y aviso el día antes de cada cobro.
• Metas de ahorro, retos (una semana sin comer fuera…) y lista de deseos con la regla de las 48 horas.
• Cada gasto en horas de trabajo, si quieres.
• Pregunta a Taimo: «¿cuánto gasté en comida este año?».
• Widget, modo claro y oscuro.

🌍 PARA VIAJAR
155 monedas, conversor y cambio del día. Cada gasto se guarda en la moneda en la que pagaste y se convierte a la tuya.

🔒 TU PRIVACIDAD, PRIMERO
• Taimo nunca te pide las claves de tu banco y no se conecta a él.
• Tus gastos se guardan en tu móvil. Solo salen si tú quieres: copia de seguridad al iniciar sesión con Google o Apple, o un grupo que compartes.
• Bloqueo con huella, cara o código.
• Sin anuncios. No vendemos tus datos.
• Puedes usarla sin crear cuenta.

Gratis. Hecha en España.
```

---

## Comprobado en el código

| Afirmación | Dónde |
|---|---|
| Atajos + Wallet, sin abrir la app | `native/ios/TaimoCaptureIntent.swift` (`openAppWhenRun = false`), `src/app/automation.tsx` |
| Siri «apunta un gasto en Taimo» | `native/ios/TaimoCaptureIntent.swift` (`TaimoAppShortcuts`) |
| Android: avisos de bancos/carteras, nunca WhatsApp/correo/redes, ignorar apps | `modules/taimo-capture/android/.../TaimoNotificationListener.kt`, `taimo_payment_rules.json` (`deny`), `src/app/automation.tsx` |
| Un pago por cartera y banco cuenta una vez | `src/domain/capture.ts` / `notifications.ts` (deduplicado) |
| OCR en el móvil (Vision / ML Kit) | `modules/taimo-capture` (`recognizeText`), `src/domain/receipt.ts` |
| Extractos CSV, OFX/QFX, QIF, CAMT.053, MT940 | `src/domain/bankfiles.ts`. **No hay importación de .xlsx**: por eso se dice «CSV» y no «Excel». La exportación sí es CSV que abre Excel. |
| Paga tu parte (QR, web sin instalar, aviso por WhatsApp) | `src/domain/table.ts`, `src/app/mesa*.tsx` |
| Dinero que es tuyo (6 tipos) | `src/domain/moneyback.ts`, `src/app/devuelve.tsx` |
| Pareja (reparto por pesos/ingresos), piso (fijos), viaje, bote | `src/domain/groups.ts`, `src/app/group/*`, `src/ui/IncomeSplit.tsx` |
| Enlaces de pago Bizum/IBAN/PayPal/Revolut | `src/domain/paylink.ts`, `src/app/pay.tsx`, `src/ui/PayButtons.tsx` |
| Metas, retos, lista de deseos, horas de trabajo, asistente | `src/app/goals.tsx`, `challenges.tsx`, `wishlist.tsx`, `src/ui/workTime.ts`, `src/domain/assistant.ts` |
| 155 monedas, 20 idiomas | `src/fx/currencies.ts`, `src/i18n/languages.ts` |
| Inicio de sesión Apple/Google + copia en la nube | `src/auth/auth.ts`, `supabase/migrations/20261014000000_taimo_backups.sql` |
| Bloqueo Face ID / huella / código | `src/auth/lock.ts` |
| «Pegar aviso del banco» (lee el portapapeles solo al pulsar el botón) | `src/app/add.tsx` (`pasteNotice`), `src/domain/notifications.ts` (`parsePastedPayment`) |
| Recordatorio cada noche (21:30, opcional, iPhone) | `src/notifications/local.ts` (`scheduleNightlyReminder`), `src/app/automation.tsx` (`PlasticCard`) |
| Sin anuncios ni analítica | No hay SDK de anuncios ni de analítica en `package.json` ni en `src/` |
