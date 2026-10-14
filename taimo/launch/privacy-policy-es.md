# Política de privacidad de Taimo

**Última actualización:** [FECHA DE PUBLICACIÓN]

> Borrador redactado a partir de lo que hace el código de la versión 1.0.0 (carpetas `src/`, `modules/taimo-capture`, `native/ios` y `supabase/migrations`). Antes de publicarlo, revísalo con un asesor legal y rellena todo lo que está entre [CORCHETES].

Taimo es una app gratuita para llevar tus gastos. La hemos diseñado para que tus datos se queden en tu móvil. **Taimo nunca te pide las claves de tu banco y no se conecta a tu banco.** Esta política explica, con palabras sencillas, qué datos se usan, dónde se guardan y qué derechos tienes.

## 1. Quién es el responsable

- **Responsable del tratamiento:** [NOMBRE LEGAL DE LA EMPRESA O DEL TITULAR]
- **NIF/CIF:** [NIF/CIF]
- **Domicilio:** [DIRECCIÓN POSTAL COMPLETA]
- **Correo de contacto para privacidad:** [CORREO DE PRIVACIDAD, p. ej. privacidad@dominio]
- **Delegado de Protección de Datos (DPD):** [NOMBRE Y CORREO DEL DPD, o «No hemos designado DPD porque no estamos obligados (art. 37 RGPD); escríbenos al correo de privacidad»]

## 2. Resumen rápido

| ¿Dónde están tus datos? | ¿Cuándo? |
|---|---|
| **Solo en tu móvil** | Siempre, por defecto. Si no inicias sesión ni compartes grupos, ningún gasto sale de tu móvil. |
| **En tu copia privada en la nube** | Solo si inicias sesión con Apple o Google. |
| **En el servidor de grupos** | Solo los gastos de los grupos que tú decides compartir con otras personas. |

- No hay anuncios.
- No vendemos ni alquilamos tus datos.
- No usamos herramientas de analítica ni de seguimiento, ni creamos perfiles publicitarios.
- No damos préstamos ni compartimos tus datos con entidades financieras.

## 3. Qué datos se guardan en tu móvil

Todo esto se guarda en el almacenamiento privado de la app en tu móvil. Nosotros no tenemos acceso:

- **Tus gastos:** importe, comercio, categoría, fecha, notas, origen (manual, Apple Pay, aviso del banco, ticket, extracto…), moneda original y tipo de cambio si pagaste en otra moneda, y productos del ticket si los hay.
- **Tu perfil:** nombre (el que tú escribas), moneda, idioma, apariencia, si tienes activado el bloqueo y los recordatorios.
- **Cómo te pagan** (opcional): tu Bizum (teléfono), IBAN, usuario de PayPal.me o de Revolut, si los escribes.
- **Ingresos** (opcional): sueldo mensual y horas a la semana, solo para mostrar los gastos en horas de trabajo. **Nunca salen del móvil** (no van ni a la copia en la nube).
- Presupuestos, grupos y sus miembros (los nombres que tú pongas), liquidaciones, metas de ahorro, retos, lista de deseos, categorías que has corregido, apps que has decidido ignorar, avisos de «Dinero que es tuyo» que has descartado o recuperado, y los últimos tipos de cambio descargados.

Los cálculos (presupuestos, previsiones, suscripciones, «Dinero que es tuyo», las respuestas de «Pregunta a Taimo») se hacen **en tu móvil**.

Si borras la app o pulsas **Ajustes → Borrar todos mis datos**, estos datos desaparecen del móvil.

## 4. Cómo se apuntan los pagos solos

### 4.1 Android: lectura de notificaciones (solo si tú lo activas)

Si das a Taimo el permiso de **acceso a notificaciones** (lo activas tú a mano en los ajustes de Android), la app:

- Revisa en tu móvil los avisos que llegan para detectar **avisos de pago** de bancos, carteras (como Google Wallet) o SMS del banco.
- **Nunca** procesa avisos de WhatsApp, Telegram, Signal, Messenger, Instagram, Facebook, correo (Gmail, Outlook), Slack, Teams, Discord y otras apps de mensajería o redes sociales.
- Solo guarda los avisos que parecen un pago (importe más una palabra de compra). De esos guarda el nombre de la app, el título y el texto del aviso y la hora, para convertirlos en un gasto al abrir Taimo. **El resto de avisos se ignora y no se guarda en ningún sitio.**
- Todo ocurre en tu móvil. Los avisos **no se envían** a nosotros ni a nadie.
- Puedes ignorar cualquier app desde «Registro automático» y retirar el permiso cuando quieras en los ajustes de Android.

Base legal: tu **consentimiento** (art. 6.1.a RGPD), que puedes retirar en cualquier momento.

### 4.2 iPhone: Atajos de Apple y Siri

En iPhone, Taimo no puede leer notificaciones. Si tú creas una **automatización de Atajos** con el disparador «Transacción» de Wallet, Apple le pasa a Taimo el **importe, el comercio y el nombre de la tarjeta** de cada pago con Apple Pay. Con **Siri** («Oye Siri, apunta un gasto en Taimo») le pasas el importe y en qué lo gastaste. Taimo guarda esos datos en tu móvil y los convierte en un gasto. No recibimos ni los datos de tu tarjeta ni nada de Wallet aparte de lo que tu automatización le pase.

### 4.3 «Pegar aviso del banco»

Si pulsas **«Pegar aviso del banco»** al añadir un gasto, Taimo lee el texto que hayas copiado (el aviso o el SMS de tu banco) para rellenar el importe, el comercio y la categoría. **Solo lee el portapapeles cuando pulsas ese botón**, lo procesa en el móvil y no lo envía a ningún sitio.

### 4.4 Recordatorio de cada noche (iPhone, opcional)

Si lo activas, Taimo programa en tu móvil un aviso diario a las 21:30 para recordarte apuntar los pagos hechos con la tarjeta de plástico. Es un aviso local: no pasa por ningún servidor. Lo mismo ocurre con el resumen semanal, los avisos de presupuesto y el aviso antes de cada cobro de suscripción.

### 4.5 Cámara y fotos (tickets)

Si nos das permiso, usamos la **cámara** o tus **fotos** solo para leer el ticket que eliges. El texto se reconoce **en tu móvil** (Vision de Apple en iPhone; ML Kit de Google en Android, que funciona sin conexión). No subimos la foto a ningún servidor. Google indica que ML Kit puede enviar a Google métricas técnicas anónimas de uso y rendimiento; nunca el contenido de la imagen. [VERIFICAR con la documentación vigente de ML Kit antes de publicar.]

### 4.6 Extractos del banco

Si importas un archivo de extracto (CSV, OFX/QFX, QIF, CAMT.053 o MT940), se lee y procesa en tu móvil. No se envía a ningún sitio.

### 4.7 Face ID, huella o código

Si activas el bloqueo, el sistema operativo comprueba tu identidad. Taimo solo recibe un «sí» o un «no»; **nunca** recibe ni guarda tu cara ni tu huella.

## 5. Datos que salen de tu móvil (solo si tú lo eliges)

### 5.1 Inicio de sesión con Apple o Google y copia de seguridad en la nube

Iniciar sesión es **opcional**. Si lo haces:

- **Datos de la cuenta:** identificador de usuario, correo electrónico (con Apple puede ser una dirección de reenvío privada), proveedor (Apple o Google) y los datos básicos de perfil que el proveedor comparta (por ejemplo, nombre). Los gestiona nuestro proveedor de autenticación (Supabase Auth).
- **Copia privada:** Taimo sube automáticamente, poco después de cada cambio, una copia de tus datos de la app: gastos (también los personales y sus notas), presupuestos, grupos, metas, retos, lista de deseos, ajustes y «cómo te pagan». **No incluye tus ingresos.**
- Solo tú puedes leer tu copia: el acceso está limitado a tu usuario en la base de datos (control de acceso por fila).
- Finalidad: que no pierdas tus datos y puedas recuperarlos en otro móvil.
- Base legal: **ejecución del servicio que solicitas** (art. 6.1.b RGPD).

Si cierras sesión, se deja de subir la copia. Para borrar tu cuenta y tu copia, consulta el apartado 9.

Puedes borrar tu cuenta cuando quieras desde la app: **Ajustes → Cuenta → Borrar mi cuenta**. Se borran al momento tu usuario y tu copia en la nube; lo que hay en tu móvil se queda en tu móvil.

### 5.2 Grupos compartidos

Un grupo (pareja, piso, viaje…) se queda en tu móvil hasta que pulsas **«Invitar»**. Entonces se guarda en nuestro servidor para que los miembros lo vean en sus móviles:

- Nombre, emoji, tipo y moneda del grupo, y sus ajustes (presupuesto, fechas, gastos fijos, bote, reparto por defecto).
- Nombres de los miembros (los que ponga cada uno) y, si un miembro lo ha añadido, **cómo le pagan** (Bizum, IBAN, PayPal.me, Revolut). Si has rellenado «Cómo te pagan» en Ajustes, esos datos se comparten con los miembros de tus grupos compartidos para que puedan pagarte.
- Los gastos del grupo: importe, comercio, categoría, fecha, quién pagó, la parte de cada uno, forma de repartir, moneda original y productos del ticket. **Las notas privadas no se comparten.**
- Las liquidaciones (quién pagó a quién).

**Tus gastos personales no se suben a los grupos.** Los grupos no van ligados a una cuenta: **cualquiera que tenga el código o el enlace de invitación puede ver y editar el grupo**, así que compártelo solo con quien quieras. Base legal: **ejecución del servicio** (art. 6.1.b RGPD). Al añadir el nombre o los datos de cobro de otra persona, asegúrate de que está de acuerdo.

### 5.3 «Paga tu parte» y enlaces para pedir dinero

Cuando enseñas el QR de «Paga tu parte» o mandas un enlace de «Pedir el dinero», los datos necesarios (comercio, importes, productos, tu nombre y cómo te pagan) **van dentro del propio enlace**, en la parte que va detrás de «#». Esa parte la lee el navegador de quien lo abre y **no se envía a nuestro servidor**. La página web se sirve desde [DOMINIO WEB, p. ej. https://dominio/taimo]; nuestro proveedor de alojamiento ([PROVEEDOR DE ALOJAMIENTO, p. ej. Vercel Inc.]) puede registrar datos técnicos de la visita (dirección IP, navegador, fecha) por seguridad.

Quien abre el enlace escribe su nombre y lo que ha tomado; esa información viaja de vuelta a ti en el mensaje que **esa persona decide mandar** (por ejemplo, por WhatsApp). Los pagos se hacen fuera de Taimo (Bizum, PayPal, Revolut o transferencia): Taimo no procesa pagos ni ve tus cuentas.

### 5.4 Tipos de cambio

Para convertir monedas, la app descarga tipos de cambio públicos de [cdn.jsdelivr.net, latest.currency-api.pages.dev y open.er-api.com]. La petición no lleva datos tuyos, pero esos servicios reciben, como cualquier web, tu dirección IP.

### 5.5 Enlaces externos

Algunos botones abren otras webs o apps a petición tuya: PayPal.me, Revolut.me, WhatsApp o una búsqueda en Google («Cómo cancelarla», «Cómo reclamar»). Lo que hagas allí se rige por la privacidad de esos servicios.

## 6. Encargados del tratamiento y transferencias internacionales

| Proveedor | Para qué | Ubicación |
|---|---|---|
| Supabase Inc. | Base de datos de copias y grupos; autenticación | Región [REGIÓN DE SUPABASE, p. ej. eu-west-1 (Irlanda) / eu-central-1 (Fráncfort)] |
| [PROVEEDOR DE ALOJAMIENTO WEB, p. ej. Vercel Inc.] | Web de «Paga tu parte» y de pago | [UBICACIÓN] |
| Apple / Google | Inicio de sesión, si lo eliges | Según sus políticas |

Los datos se guardan en servidores dentro del Espacio Económico Europeo [CONFIRMAR región]. Algunos proveedores son empresas de EE. UU. y podrían acceder a datos desde fuera del EEE (por ejemplo, para soporte). En ese caso las transferencias se amparan en el **Marco de Privacidad de Datos UE-EE. UU.** cuando el proveedor esté adherido y/o en las **Cláusulas Contractuales Tipo** de la Comisión Europea. Puedes pedirnos una copia de las garantías escribiendo al correo de privacidad.

## 7. Cuánto tiempo guardamos los datos

- **En tu móvil:** hasta que los borres o desinstales la app.
- **Cuenta y copia en la nube:** mientras tengas la cuenta. Si nos pides borrarla, la borramos en un plazo máximo de [30] días (al borrar la cuenta, la copia se borra con ella).
- **Grupos compartidos:** mientras el grupo exista. Salir de un grupo en tu móvil no lo borra del servidor, porque los demás miembros lo siguen usando. [PLAZO: p. ej. «Borramos los grupos sin actividad durante 24 meses»] y puedes pedirnos que borremos un grupo escribiendo al correo de privacidad con su código.
- **Registros técnicos del servidor y del alojamiento:** [PLAZO, p. ej. hasta 30 días], salvo que haga falta más por seguridad o por obligación legal.

## 8. Menores

Taimo no está dirigida a menores de **14 años** (edad mínima para consentir en España, art. 7 LOPDGDD). Si eres menor de 14, no inicies sesión ni compartas grupos sin el permiso de tu madre, padre o tutor. Si sabemos que hemos recibido datos de un menor de 14 sin ese permiso, los borraremos.

## 9. Tus derechos

Puedes ejercer en cualquier momento tus derechos de **acceso, rectificación, supresión, oposición, limitación del tratamiento y portabilidad**, y **retirar tu consentimiento** (sin que afecte a lo hecho antes), escribiendo a [CORREO DE PRIVACIDAD] desde el correo de tu cuenta o indicando el código del grupo. Responderemos en un plazo máximo de un mes.

Muchas cosas las puedes hacer tú mismo en la app:

- **Acceso y portabilidad:** Ajustes → exportar a CSV o hacer una copia en un archivo.
- **Rectificación:** edita cualquier gasto o dato.
- **Supresión en el móvil:** Ajustes → Borrar todos mis datos.
- **Retirar permisos:** desde los ajustes del móvil (notificaciones, cámara, fotos).

Si crees que no hemos tratado bien tus datos, puedes reclamar ante la **Agencia Española de Protección de Datos** (www.aepd.es).

## 10. Seguridad

- Conexiones cifradas (HTTPS) con el servidor.
- Copia en la nube accesible solo por su dueño (control de acceso por fila).
- Las tablas de grupos no son accesibles directamente: todo pasa por funciones que exigen el código del grupo (16 caracteres aleatorios).
- Bloqueo opcional de la app con Face ID, huella o código.

Ningún sistema es 100 % seguro. Si hubiera una brecha que afecte a tus datos, lo notificaremos según exige la ley.

## 11. Cambios en esta política

Si cambiamos algo importante, te avisaremos en la app o en la ficha de la tienda antes de que entre en vigor. La versión vigente estará siempre en [URL DE LA POLÍTICA, p. ej. https://dominio/taimo/privacidad].

## 12. Contacto

[NOMBRE LEGAL] · [DIRECCIÓN] · [CORREO DE PRIVACIDAD]
