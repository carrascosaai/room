@AGENTS.md

# Taimo — ficha del proyecto

Léela entera antes de tocar nada. Resume las decisiones tomadas con Fernando (fundador) y su socio.
Responde siempre en **español**, claro y sin jerga: los dos no son programadores.

## Qué es

App **gratis** de finanzas personales para España (luego el mundo), Android + iPhone + web.
Objetivo final: **cualquier pago, con cualquier tarjeta o forma de pago, se apunta solo, al instante,
sin conectar el banco** (la gente desconfía de dar sus claves). Además, gastos compartidos fáciles
para pareja, piso, viajes y cenas, pensada para cualquier edad.

## Lo que la hace distinta (no perderlo)

- **Detección de pagos sin banco**
  - Android: lee los avisos del banco y de las carteras (`modules/taimo-capture`, reglas en
    `android/src/main/assets/taimo_payment_rules.json`).
  - iPhone: automatización de Atajos «Transacción» para Apple Pay. Con **iOS 27** se suma
    «Cuando recibo una notificación de [app del banco]» → acción «Registrar aviso del banco
    en Taimo», que cubre también la tarjeta física, online y apps.
  - Falta probar en un iPhone real.
- **«Paga tu parte»**
  - Quien paga enseña un QR; los demás lo abren en el navegador **sin instalar nada**, marcan lo suyo
    y le pagan con Bizum, IBAN, PayPal o Revolut.
  - «Ya he pagado» se apunta solo en la app de quien pagó.
  - Incluye pagado en efectivo, recordatorio a los que faltan y Bizum en dos toques (número + importe).
  - Competencia: Splitwise «Itemize» (solo EE. UU. y Reino Unido desde el 14-10-2026) y Byll
    (iPhone, España, sin confirmar si los amigos necesitan la app).
  - Ventaja actual: Bizum + sin instalar + cualquier bar. Hay que llegar antes.
- **Otras funciones propias**
  - Enlace de pago sin app.
  - Modo pareja «tuyo/mío/nuestro».
  - «Dinero que es tuyo».
  - Monedero de efectivo.
  - Modo sencillo para mayores.
  - Comprobar estafas.

## Estado (19-10-2026)

- **Código y web**
  - El código está en la rama `claude/taimo-design-68o8w0` del repo `carrascosaai/room`, carpeta `taimo/`.
    **No está en `main`** (pendiente de decidir: juntarlo o pasarlo a un repo propio `taimo`).
  - La web de pruebas es https://room-git-claude-taimo-design-68o8w0-fernandos-projects-70f7d346.vercel.app/taimo
    (se exporta con `scripts/publish-to-room.sh` a `../public/taimo`).
- **Android**
  - GitHub Actions `.github/workflows/taimo-android.yml` compila el APK (solo arm64) en cada push a la rama.
  - Además lo prueba en un emulador Android 14 con `scripts/android-e2e.sh`, con APK x86_64 aparte;
    todo en verde.
  - El APK está en Actions → Artifacts → `taimo-android-apk`, y se reparte por WhatsApp.
- **Probadores**
  - El socio prueba en un Samsung.
  - Problema conocido: en Android 13+ las apps instaladas fuera de Google Play tienen el acceso a
    notificaciones bloqueado («ajuste restringido»). La app explica cómo desbloquearlo:
    Ajustes → Apps → Taimo → ⋮ → «Permitir ajustes restringidos».
  - La solución buena es la prueba interna de Google Play.
- **Pruebas:** `npx vitest run` (unos 355 tests) y `npx tsc --noEmit`, siempre antes de subir.
- **Textos:** 20 idiomas en `src/i18n/locales/*.ts` (`en.ts` es la base de tipos). Cualquier texto nuevo va en los 20.

## Pendiente (de Fernando y su socio)

- Cuenta de **Google Play** (25 $ una vez) y luego **Apple Developer** (99 €/año), mejor a nombre de
  la empresa o de un correo compartido; el otro entra como administrador.
- Datos de la empresa para los textos legales (`launch/privacy-policy-*.md`, `terms-es.md`).
- Proyecto de Supabase (las migraciones están en `supabase/migrations`, probadas en local, sin aplicar).
- Probar con bancos reales (beta con 20–30 personas: `launch/beta-testers.md`).
- Probar en un iPhone con iOS 27 si la automatización de notificaciones pasa el texto del aviso del banco.
- Registrar la marca «Taimo» y «Paga tu parte» (OEPM/EUIPO).
- Más adelante:
  - Acuerdo con Visa/Mastercard (o Fidel API) para avisos de cada pago con tarjeta: completaría el iPhone.
  - Solicitud a Apple por la DMA europea.

## Informes (en la raíz del repo, carpeta `reports/`)

- `Competencia Taimo y gancho innovador.md`: competidores y por qué Taimo.
- `Pagos al instante en Taimo.md`: cómo detectar pagos en iPhone y Android, y caminos con Apple, Visa y Mastercard.
- `Funciones que faltan en Taimo.md`: estudio de funciones.
- `Competencia de Paga tu parte.md`: quién más hace «Paga tu parte» (España, Europa, EE. UU.).
- `Estudio de mercado Taimo.md`: el estudio que hizo ChatGPT, analizado.

## Cómo trabajar

- Una rama por persona (p. ej. `claude/taimo-socio`), y juntar cuando esté listo. No subir a `main` sin que Fernando lo diga.
- Nada de claves ni contraseñas en el código.
- Explicar los cambios en una frase que entienda cualquiera.
