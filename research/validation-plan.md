# Plan de validación (sin construir la aplicación)

Objetivo: decidir en **3–4 semanas y con ≤100 €** si la hipótesis O1+O2 de [market-gap.md](market-gap.md) merece un MVP. **No se han realizado entrevistas ni encuestas.** Este documento prepara los materiales para que las hagas tú.

## Hipótesis que se ponen a prueba

| ID | Hipótesis | Cómo se mide | Umbral para seguir |
|---|---|---|---|
| H1 | Los estudiantes de ingeniería en España que buscan prácticas o graduate en Europa dedican tiempo significativo a revisar webs corporativas una a una | Entrevistas (pregunta 4–6) | ≥50 % de entrevistados revisa ≥10 webs corporativas por temporada |
| H2 | Las alternativas actuales (LinkedIn, JobTeaser, bolsa de la universidad) no les muestran bien estas ofertas | Entrevistas + tarea práctica (pregunta 8) | ≥40 % encuentra en la demo al menos 1 oferta relevante que no conocía |
| H3 | La elegibilidad (obligatoria/voluntaria, convenio, idioma, residencia) es un dolor real | Entrevistas (pregunta 7) | ≥40 % cuenta haber descartado o perdido una oferta por esto |
| H4 | Lo usarían cada semana en temporada | Lista de espera + uso de la demo (clics, regreso) | ≥25 % de la lista abre ≥2 de los 3 primeros envíos semanales |
| H5 | Pagarían algo | Fake door y preventa | ≥5 pagos (o depósitos reembolsables) **o** ≥3 % de la lista |
| H6 | Hay datos suficientes y obtenibles por vías permitidas | `ats_probe.py` + revisión manual de 50 empresas | ≥70 % de las empresas objetivo con ofertas obtenibles por API pública o feed sin violar términos, y ≥20 ofertas relevantes nuevas por semana para un perfil de Ing. Mecánica |
| H7 (B2B) | Una escuela o asociación lo difundiría o pagaría | 5 conversaciones | ≥1 acuerdo de difusión por escrito; ideal 1 piloto |

## Semana 1: datos y demo manual ("concierge")

1. Ejecuta `research/scripts/ats_probe.py` (ver [market-study.md](market-study.md#4-cómo-completar-la-medición-siguiente-paso-reproducible)) y completa a mano las 11 empresas sin ATS identificado. **Resultado:** el denominador real de ofertas.
2. Amplía la lista a **50 empresas industriales** con sede u operaciones en ES, DE, FR, NL, IE, IT, SE y CH.
3. Construye la **demo navegable sin programar**: una hoja (Google Sheets o Airtable) con una vista pública filtrable. Columnas: empresa, título, país/ciudad, tipo (curricular / voluntaria / Pflichtpraktikum / graduate / thesis / junior), titulación, idioma requerido, residencia/permiso, plazo, fecha "vista por última vez", URL oficial. **Solo ofertas reales con su URL oficial; nada de datos simulados.**
4. Añade una pestaña de **calendario de convocatorias** (graduate programs y prácticas de verano) con fuente y fecha.

## Semana 2: landing y captación

- Landing de una página. Hay una plantilla estática en `research/validation/landing.html` (formulario externo a configurar).
- Propuesta concreta, sin promesas que no se puedan cumplir:
  - **Titular:** "Prácticas y graduate programs de ingeniería en Europa, en un solo sitio y con lo que de verdad te pide cada empresa."
  - **Subtítulo:** "Revisamos cada semana los portales oficiales de 50+ empresas industriales (energía, automoción, aeroespacial, maquinaria). Te decimos si encajas (prácticas obligatorias o voluntarias, idioma, residencia) y cuándo abren las convocatorias. Tú solicitas en la web oficial."
  - **No decir:** "aplica a todas con un clic", "miles de ofertas", ni ninguna cifra que no hayas medido.
- **Fake door:** botón "Pase de temporada – 12 € / 3 meses (próximamente)". Al hacer clic, se registra el clic y se ofrece reservar plaza con depósito reembolsable o dejar el correo. Avisa claramente de que el producto aún no existe.
- Formulario (Tally o Google Forms): correo, universidad, titulación y curso, países de interés, tipo de práctica, consentimiento RGPD explícito y enlace a la política de privacidad.

## Semanas 2–3: entrevistas (15–20)

**Reclutamiento:** estudiantes de 3.º, 4.º o máster de Ing. Industrial, Mecánica, Aeroespacial, Eléctrica y Energía que **estén buscando o hayan buscado en los últimos 12 meses** prácticas fuera de España. Excluye a amigos que no buscan.

**Guion (30 min, sin enseñar la solución hasta el final):**
1. ¿Qué estudias, qué curso, y qué buscas (curricular, extracurricular, verano, graduate, junior)?
2. Cuéntame la última vez que buscaste prácticas en el extranjero. ¿Qué hiciste, paso a paso?
3. ¿Qué herramientas o webs usaste? (LinkedIn, JobTeaser, bolsa de la uni, InfoJobs, webs de empresas, Simplify, otras)
4. ¿Cuántas webs corporativas revisaste aproximadamente? ¿Cuánto tiempo te llevó?
5. ¿Cuántas solicitudes enviaste? ¿Cuántas cuentas creaste en portales?
6. ¿Qué fue lo más frustrante? (Deja que lo diga sin sugerir opciones.)
7. ¿Te pasó encontrar una oferta y descubrir que no podías optar a ella (prácticas obligatorias, convenio, idioma, nacionalidad, fechas)? Cuéntamelo.
8. *(Tarea)* Abre la demo y busca algo que te interese. Observa sin ayudar. ¿Encontraste algo que no conocías?
9. Si mañana desapareciera esta hoja, ¿qué harías en su lugar?
10. ¿Has pagado alguna vez por algo relacionado con buscar empleo o prácticas? ¿Qué y cuánto?
11. *(Al final)* Hay un pase de temporada de 12 € para 3 meses con alertas y recordatorios. ¿Lo comprarías hoy? Si es que sí, ofrece la reserva real. Si es que no, pregunta qué tendría que incluir.

**Registro:** una fila por entrevista con citas literales. No resumas en "le gustó".

## Semana 3: B2B (5 conversaciones)

- Destinatarios: COIE o servicios de empleo de 2–3 escuelas de ingeniería, delegación de alumnos, BEST, IAESTE o EESTEC local, y un colegio profesional.
- Preguntas:
  - ¿Cómo ofrecen hoy las oportunidades internacionales?
  - ¿Usan JobTeaser u otra plataforma?
  - ¿Qué les falta?
  - ¿Difundirían un radar gratuito?
  - ¿Quién decide y cómo se compra?

## Métricas y umbrales de decisión

| Métrica | Fuente | Continuar si | Replantear si | Abandonar si |
|---|---|---|---|---|
| Visitas cualificadas a la landing | Analítica | ≥300 | 100–300 | <100 tras 3 canales probados |
| Conversión visita → correo | Formulario | ≥15 % | 5–15 % | <5 % |
| Entrevistas con dolor fuerte (H1 + H3) | Entrevistas | ≥50 % | 30–50 % | <30 % |
| Ofertas nuevas que no conocían (H2) | Tarea | ≥40 % | 20–40 % | <20 % |
| Apertura de ≥2 de 3 envíos semanales (H4) | Email | ≥25 % | 15–25 % | <15 % |
| Pagos o depósitos (H5) | Stripe/transferencia | ≥5 | 1–4 | 0 |
| Viabilidad de datos (H6) | Script + revisión | ≥70 % de empresas y ≥20 ofertas/semana | 50–70 % | <50 % o bloqueo legal |
| B2B (H7) | Conversaciones | ≥1 acuerdo escrito | Interés verbal | Ninguno |

Estos umbrales son **criterios de decisión fijados de antemano**, no referencias de la industria. Si un resultado cae en "replantear", se cambia una sola variable (segmento, país o propuesta) y se repite la semana.

## Materiales incluidos

- `research/validation/landing.html`: plantilla estática sin dependencias; tienes que poner la URL de tu formulario y tu política de privacidad.
- Este guion de entrevista y la tabla de umbrales.
- `research/data/ats_endpoints.csv` y `research/scripts/ats_probe.py` para H6.
