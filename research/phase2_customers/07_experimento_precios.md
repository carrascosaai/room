# Fase 5: experimento de disposición a pagar (0 €, 3 €, 5 €, 9 € al mes)

## Principios

1. **Elegir un precio en una encuesta no es pagar.** Las respuestas declarativas solo se usan para entender el razonamiento, nunca como prueba.
2. **No se cobra por un producto que no existe.** El compromiso real es transparente:
   - **tiempo**: participar en un piloto con tareas;
   - **reserva sin cargo**: dejar la tarjeta autorizada sin cobro, o un compromiso por escrito;
   - **preventa reembolsable**: solo cuando exista una versión manual que se entregue de verdad, con reembolso inmediato si no se entrega.
3. Cada participante ve **un solo precio** (asignación aleatoria por orden de registro), para no anclarle.
4. Todo se comunica claramente: "es un piloto"; "aún no existe la aplicación"; "no se cobra nada hasta [fecha] y solo si recibes el servicio".

## Diseño en 3 escalones de compromiso

| Escalón | Qué se pide | Señal de valor | Medición |
|---|---|---|---|
| **E1. Tiempo** (todas las personas entrevistadas y la lista de espera) | Unirse a un piloto gratuito de 3 semanas: rellenar el perfil de 6 datos y responder a un correo semanal con "¿te sirvió alguna oferta?" | Débil-media | % que acepta; % que completa el perfil; % que responde a ≥2 de 3 correos |
| **E2. Precio asignado** (quien completa E1 y recibe ≥1 envío útil) | Página de "Plan para la temporada de prácticas" con **un** precio asignado al azar entre 0 €, 3 €, 5 € y 9 €/mes, y un botón "Reservar" | Media | Clics en "Reservar" por grupo de precio. En el grupo de 0 €, "Reservar" = aceptar más correos o recordatorios (control) |
| **E3. Compromiso con medio de pago** (quien pulsa "Reservar" en 3/5/9 €) | Reserva con **tarjeta autorizada sin cargo** (p. ej. Stripe Checkout en modo "setup", que guarda el método de pago sin cobrar) o, si no se quiere tocar pagos, **compromiso firmado por correo** con fecha | Fuerte | Nº de reservas completadas por precio. Solo se cobra si se entrega el servicio manual en la temporada siguiente y la persona lo confirma de nuevo. Si no, se borra el método de pago. |

**Alternativa sin pasarela de pagos:** E3 = "Te enviaré una solicitud de pago de X € por Bizum o transferencia **solo** cuando te entregue la versión del mes 1. ¿Confirmas por escrito que la pagarás si te llega?" Se mide cuántas personas confirman y, después, **cuántas pagan de verdad** al entregarse.

## Asignación y tamaño

- 4 grupos (0/3/5/9 €). Asignación aleatoria por orden de registro (1→0 €, 2→3 €, 3→5 €, 4→9 €, 5→0 €…) para equilibrar.
- Mínimo útil: **20 personas por grupo** en E2 (80 en total). Con menos, solo se informa de recuentos, sin porcentajes ni comparación estadística.
- Con 15 entrevistas no hay potencia estadística: E2 y E3 se ejecutan con la lista de espera del plan de captación (`../phase2_growth/`).

## Texto de la página E2 (ejemplo; ajustar al concepto elegido)

> **Plan temporada de prácticas — piloto**
> Cada semana: ofertas reales de prácticas y graduate programs de ingeniería en empresas industriales de España y Europa, filtradas por tu titulación, con los requisitos publicados (✅/❌/❔) y las fechas de cierre conocidas.
> **Precio del piloto: [X] €/mes.** Aún no se cobra nada: estamos midiendo interés. Si reservas, te avisaremos antes de la fecha de inicio y podrás confirmar o cancelar.
> [Reservar] · [No me interesa por este precio]

## Qué cuenta como intención de pago significativa (ver también [08](08_criterios_decision.md))

- **Fuerte:** reserva E3 con medio de pago o confirmación escrita **y** pago real cuando se entrega el servicio manual.
- **Media:** clic en "Reservar" en 3/5/9 € (E2), sin completar E3.
- **No cuenta:** "pagaría X" en entrevista o encuesta; me gusta, comentarios o seguidores.

## Registro

`plantillas/precios.csv`: `id`, `fecha_registro`, `precio_asignado`, `E1_acepta`, `E1_perfil_completo`, `E1_respuestas_semanales`, `E2_visita`, `E2_reserva`, `E3_metodo_pago_o_confirmacion`, `pago_real_entrega`, `motivo_rechazo`.

## Aspectos legales y éticos

- Avisos claros de "piloto" y "no se cobra hasta…".
- Borrar el método de pago si no se entrega el servicio.
- No crear urgencia falsa ("quedan 3 plazas") salvo que sea verdad.
- Las condiciones de la pasarela de pagos (guardar tarjetas sin cobro) deben revisarse antes de usarla.
