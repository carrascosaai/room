# Taimo · Respuestas para App Privacy (Apple) y Data safety (Google Play)

Derivadas del código de la versión 1.0.0. Regla de ambas tiendas: **solo se declara lo que se «recoge», es decir, lo que sale del dispositivo hacia nosotros o nuestros proveedores.** Lo que se procesa y se queda en el móvil (avisos de Android, Atajos, OCR de tickets, extractos, portapapeles de «Pegar aviso del banco», recordatorios locales) **no se declara como recogido**.

Lo que sí sale del móvil, y solo si el usuario lo elige:

1. **Inicio de sesión + copia en la nube** (`src/auth/auth.ts`, tabla `taimo_backups`): id de usuario, correo, proveedor, nombre si lo da el proveedor, y una copia completa del estado de la app (gastos personales y notas, presupuestos, grupos, metas, retos, deseos, ajustes, datos de cobro), **sin ingresos** (`makeCloudBackup` en `src/domain/backup.ts`). Se sube automáticamente unos 30 s después de cada cambio mientras haya sesión.
2. **Grupos compartidos** (`src/sync/api.ts`, `src/domain/sync.ts`, tablas `taimo_groups/members/expenses/settlements`): solo tras pulsar «Invitar» o unirse con un código. Nombre y ajustes del grupo, nombres de miembros, datos de cobro (Bizum/IBAN/PayPal/Revolut), gastos del grupo (importe, comercio, categoría, fecha, quién pagó, partes, productos del ticket), liquidaciones. Sin notas. No ligado a la cuenta.
3. **Tipos de cambio** (`src/fx/fx.ts`): GET a servicios públicos sin datos personales (solo la IP, inevitable). No se declara.

No hay: SDK de anuncios, analítica, crash reporting, IDFA/AAID, push remoto (solo notificaciones locales), ubicación, contactos, micrófono, salud, compras dentro de la app.

> Revisa estas respuestas si añades Sentry, analítica, notificaciones push u otro SDK.

---

## Apple · App Privacy («nutrition labels»)

**¿Recoges datos de esta app?** Sí (solo con cuenta o grupos compartidos, pero Apple pide declararlo igualmente; se puede indicar en la descripción que es opcional).

**¿Seguimiento (tracking)?** **No.** No se combinan datos con los de terceros para publicidad ni se comparten con data brokers. No hace falta App Tracking Transparency.

### Tipos de datos a marcar

| Categoría de Apple | Tipo | ¿Por qué? | Vinculado a la identidad | Tracking | Finalidad (Apple) |
|---|---|---|---|---|---|
| Información de contacto | **Correo electrónico** | Inicio de sesión Apple/Google | Sí | No | Funcionalidad de la app |
| Información de contacto | **Nombre** | Nombre del perfil en la copia; nombre del proveedor; nombres de miembros en grupos | Sí | No | Funcionalidad de la app |
| Información de contacto | **Número de teléfono** | Bizum en «Cómo te pagan» (copia y grupos) | Sí | No | Funcionalidad de la app |
| Información financiera | **Otra información financiera** | Gastos, presupuestos, IBAN y usuarios de PayPal/Revolut (copia y grupos) | Sí | No | Funcionalidad de la app |
| Identificadores | **ID de usuario** | Id de la cuenta de Supabase | Sí | No | Funcionalidad de la app |
| Contenido del usuario | **Otro contenido del usuario** | Notas de los gastos, nombres de grupos, metas, lista de deseos (copia) | Sí | No | Funcionalidad de la app |

No marcar: Información de pago (Taimo no recoge números de tarjeta ni procesa pagos; el nombre de la tarjeta que pasa el Atajo se queda en el móvil), Ubicación, Contactos, Historial de navegación/búsqueda, Datos de uso, Diagnóstico, Datos sensibles, Salud, Compras, Fotos o vídeos (las fotos de tickets no salen del móvil), Audio.

**Nota sobre «Vinculado»:** los datos de grupos compartidos no van ligados a la cuenta en el servidor, pero los mismos tipos ya se declaran como vinculados por la copia de seguridad; basta con declararlos una vez como vinculados.

**URL de la política de privacidad:** [URL, p. ej. https://dominio/taimo/privacidad]

---

## Google Play · Data safety

### Preguntas generales

| Pregunta | Respuesta |
|---|---|
| ¿La app recoge o comparte alguno de los tipos de datos obligatorios? | **Sí** |
| ¿Todos los datos recogidos se cifran en tránsito? | **Sí** (HTTPS a Supabase) |
| ¿Ofreces una forma de que los usuarios soliciten la eliminación de sus datos? | **Sí**: por correo a [CORREO DE PRIVACIDAD] y en un formulario web [URL DE BORRADO, obligatoria en Play]. Ver checklist: falta el botón en la app. |
| ¿Se ha revisado de forma independiente según un estándar de seguridad global? | No |
| ¿Es una app para niños / Familias? | No |

### Datos recogidos (ninguno se «comparte» con terceros: Supabase y el alojamiento son encargados de tratamiento, que Google no cuenta como compartir)

| Categoría Play | Tipo | Recogido | Compartido | ¿Opcional? | Finalidad |
|---|---|---|---|---|---|
| Información personal | **Nombre** | Sí | No | Sí (opcional) | Funcionalidad de la app, Gestión de la cuenta |
| Información personal | **Dirección de correo** | Sí | No | Sí | Gestión de la cuenta |
| Información personal | **ID de usuario** | Sí | No | Sí | Gestión de la cuenta |
| Información personal | **Número de teléfono** | Sí | No | Sí | Funcionalidad de la app (Bizum para cobrar) |
| Información financiera | **Historial de compras** | Sí | No | Sí | Funcionalidad de la app (gastos en la copia y en grupos) |
| Información financiera | **Otra información financiera** | Sí | No | Sí | Funcionalidad de la app (presupuestos, IBAN, PayPal/Revolut, deudas del grupo) |
| Mensajes | Otros mensajes en la app | **No** | — | — | Las notificaciones leídas se procesan solo en el dispositivo |
| Fotos y vídeos | Fotos | **No** | — | — | OCR en el dispositivo |
| Archivos y documentos | Archivos | **No** | — | — | Extractos procesados en el dispositivo |
| Actividad en apps / Info y rendimiento / IDs de dispositivo / Ubicación | — | **No** | — | — | — |

¿Procesamiento efímero? No (los datos se guardan en la copia o en el grupo).

**Nota sobre ML Kit:** la librería de Google ML Kit (reconocimiento de texto en el dispositivo) puede enviar a Google métricas de uso/diagnóstico anónimas. Google indica que los desarrolladores que usan ML Kit deben valorarlo en su formulario. [VERIFICAR en la documentación vigente de ML Kit si exige declarar «Información y rendimiento de la app → Diagnósticos»; si es así, marcar recogido, no compartido, finalidad «Analítica», no opcional.]

### Declaración de permisos sensibles (Play Console → Contenido de la app)

- **Acceso a notificaciones (`BIND_NOTIFICATION_LISTENER_SERVICE`)**: no es un permiso «de declaración» como SMS o Call Log, pero Google revisa su uso bajo la política de **Datos de usuario** y de **Prominent disclosure**. Requisitos:
  - Divulgación destacada en la app **antes** de llevar al usuario a los ajustes (pantalla «Registro automático», `src/app/automation.tsx`): qué se lee (avisos de pago de bancos y carteras), qué no (mensajería, correo, redes), que se procesa en el móvil y no se envía. Revisar que el texto lo diga explícitamente.
  - Mencionarlo en la ficha de la tienda y en la política de privacidad (hecho).
- **SMS / Call Log:** la app **no** pide `READ_SMS` ni `RECEIVE_SMS` (verificado en el `AndroidManifest.xml` del módulo). Los SMS del banco se detectan a través de la notificación de la app de mensajes. No hace falta el formulario de permisos SMS.
- `POST_NOTIFICATIONS`: avisos locales («⚡ apuntado en Taimo», resumen semanal, presupuestos).
- Cámara y fotos (expo-image-picker): solo para tickets. Usa el selector del sistema; si el build final incluye `READ_MEDIA_IMAGES`, Google puede pedir justificación: preferir el Photo Picker y quitar el permiso si no hace falta.
