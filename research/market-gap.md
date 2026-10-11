# Fase 5: hueco comercial

Fecha: 2026-10-11. Este documento evalúa qué problemas están **presentes**, con qué **evidencia**, y si alguien **pagaría** por resolverlos. Leyenda: [H] hecho · [C] comercial · [T] tercero · [U] usuario · [E] estimación · [Hip] hipótesis.

## 1. Revisión de los problemas candidatos

| Problema | ¿Presente? | Evidencia | ¿Ya lo resuelve alguien? | ¿Pagarían? |
|---|---|---|---|---|
| Búsqueda mundial en un solo lugar | Parcial | Las fuentes globales existen (LinkedIn, Indeed, HiringCafe), pero mezclan todo y no las pudimos medir para prácticas europeas | Sí, de forma generalista y gratis | Improbable: hay alternativas gratuitas [Hip] |
| Cobertura de páginas corporativas | **Sí, en Europa/España** | Simplify: 0 ofertas activas en España en la muestra y 5,9 % Europa en todo el dataset [H]; 8/30 empresas sin ninguna oferta [H] | EE. UU.: Simplify y Jobright. Europa: no medido (JobTeaser y HiringCafe pueden cubrirlo) | Desconocido |
| Prácticas e internships | Sí | Canal español fragmentado: bolsas universitarias, PDFs, Universia, InfoJobs, StudentJob [H] | JobTeaser (B2B con universidades), ErasmusIntern (~1 300 [T]), bolsas | Bajo: el estudiante espera que sea gratis [Hip] |
| Graduate programs | **Sí** | Convocatorias anuales con plazos (Iberdrola Graduados, Volvo 100+/año, placements de 12 meses de GE) dispersas por webs [H] | Gradcracker y Bright Network en UK. Para Europa continental no se encontró un calendario consolidado | Posible (plazos concretos y valor alto por oferta) [Hip] |
| Búsqueda por titulación/especialidad | Sí | Las fuentes clasifican por "Software/Hardware" o palabra clave; no por "Ing. Mecánica" [H en Simplify: 5 categorías] | No | Bajo por sí solo |
| Idioma y requisitos migratorios / elegibilidad | **Sí** | `sponsorship` = "Other" en el 99,6 % [H]; Pflichtpraktikum, convenio curricular, right-to-work UK, defensa [H, fragmentos] | No se encontró a nadie que lo estructure para residentes UE | **Es el diferenciador más claro** [Hip] |
| Candidaturas internacionales (pasos y documentos) | Sí | Matrícula, expediente, certificado de prácticas obligatorias, carta (Mercedes, VW) [H] | No | Medio [Hip] |
| Formularios repetitivos | **Sí** | Quejas repetidas sobre Workday [U] | **Sí, gratis o muy barato** (Simplify, Glever, JobFill…) | Bajo: commodity |
| Perfiles reutilizables | Sí | Ídem | Sí (extensiones) | Bajo |
| Compatibilidad con distintos ATS | Sí | 13/19 Workday en la muestra [H] | Extensiones (precisión variable [T]) | Bajo |
| Seguimiento centralizado | Sí | — | Teal, Huntr, Simplify (gratis/29–40 $) | Bajo |
| Alertas de nuevas vacantes | Sí | Ofertas con alta rotación (80 % inactivas en el histórico) [H] | Portales corporativos, LinkedIn y Simplify tienen alertas, cada uno por su lado | Medio si las alertas son de la lista de empresas del usuario [Hip] |
| Candidaturas duplicadas | Menor | — | Trackers | Bajo |
| Ofertas caducadas | Sí | 15 duplicados activos en la muestra; alta rotación [H] | Simplify marca inactivas | Bajo como feature aislada |
| Personalizar CV y carta | Sí | — | Saturado de herramientas de IA | Bajo |
| Automatizar sin perder el control | Sí | Quejas de auto-apply [U]; LinkedIn lo prohíbe [H] | Glever "Apply For Me" [C] | Riesgo reputacional |

## 2. Las cinco oportunidades más interesantes

### O1. Radar de prácticas y graduate programs en empresas industriales europeas, con elegibilidad para residentes UE
- **Problema:** un estudiante de ingeniería en España no tiene un sitio donde ver, juntas y vigentes, las prácticas, placements y graduate programs de 150–300 empresas industriales europeas, filtradas por lo que de verdad le excluye.
- **Público:** estudiantes de ingeniería industrial, mecánica, aeroespacial, eléctrica y energía en España (3.º–máster) dispuestos a moverse por Europa.
- **Alternativas:** LinkedIn/Indeed (ruido, sin elegibilidad), JobTeaser (si su universidad lo paga), webs una a una, Stag-io (escala desconocida).
- **Evidencia:** hueco medido en Simplify (§1); requisitos de elegibilidad no estructurados; Workday predominante (lectura posible pero no documentada).
- **Diferenciación:** lista curada de empresas industriales, filtros de elegibilidad, fecha de "vista por última vez", enlace al portal oficial.
- **Complejidad técnica:** media. Conectores Workday/SmartRecruiters/Greenhouse más clasificación por título e idioma.
- **Coste de mantenimiento:** medio (Workday cambia; las empresas con portal propio exigen trabajo manual).
- **Riesgos legales:** uso del JSON de Workday sin API oficial (categoría C) y términos de cada portal. Mitigación: solo metadatos y enlace, frecuencia baja, retirada a petición y sin copiar descripciones completas.
- **Potencial de ingresos:** bajo en B2C [Hip]. Posible B2B con escuelas de ingeniería o asociaciones (ver business-model).
- **Canales:** delegaciones de alumnos, asociaciones (BEST, IAESTE, EESTEC), grupos de LinkedIn, Discord/Telegram de máster, COIE.
- **Por qué podría fracasar:**
  - JobTeaser, LinkedIn y las bolsas universitarias pueden ser "suficientemente buenos".
  - Volumen bajo de ofertas relevantes por usuario y semana.
  - Workday bloquea la lectura.
  - Los estudiantes no pagan.

### O2. Calendario de convocatorias de graduate programs y prácticas de verano (Europa)
- **Problema:** los programas abren y cierran en ventanas concretas. Quien se entera tarde, pierde el año.
- **Público:** último curso y máster.
- **Alternativas:** Gradcracker y Bright Network (UK), webs de empresas, LinkedIn.
- **Evidencia:** programas anuales con plazos (Iberdrola, Volvo, GE placements, Siemens) [H]; no se encontró un calendario continental. [H por ausencia, no concluyente]
- **Diferenciación:** un calendario con fechas pasadas y previstas, más un recordatorio antes de la apertura.
- **Complejidad:** baja. Es contenido curado; se puede empezar a mano.
- **Coste de mantenimiento:** bajo-medio (actualización anual).
- **Riesgos legales:** bajos (datos factuales y enlaces).
- **Ingresos:** newsletter gratis + premium barato o patrocinio de empleadores [Hip].
- **Canales:** newsletter, TikTok/IG ("abre el programa X"), universidades.
- **Por qué podría fracasar:** fácil de copiar, la monetización es débil y depende de la constancia editorial.

### O3. Asistente de elegibilidad y documentación para prácticas en otro país UE
- **Problema:** prácticas obligatorias vs voluntarias, convenio con la universidad, salario mínimo, documentos (matrícula, Learning Agreement Erasmus+), idioma.
- **Público:** estudiantes españoles que miran Alemania, Francia, Países Bajos o Irlanda.
- **Alternativas:** ORI de la universidad, foros, EURES ("living and working conditions").
- **Evidencia:** requisitos Pflichtpraktikum y salario mínimo de prácticas voluntarias de más de 3 meses en Alemania [T]; convenio curricular RD 592/2014 [H].
- **Diferenciación:** guía por país y por tipo de práctica, enlazada a cada oferta.
- **Complejidad:** baja (contenido).
- **Riesgos legales:** dar información legal errónea. Requiere avisos y revisión.
- **Ingresos:** bajos por sí solos; sirve como gancho de O1/O2.
- **Por qué podría fracasar:** la universidad ya lo explica, y es contenido, no producto.

### O4. Servicio B2B para escuelas de ingeniería o COIE: "radar de empresas internacionales"
- **Problema:** los servicios de empleo universitarios publican sobre todo ofertas locales con convenio. Ofrecer oportunidades internacionales de grandes empresas les cuesta trabajo manual. [Hip]
- **Público:** escuelas de ingeniería, COIE, colegios profesionales, asociaciones de estudiantes.
- **Alternativas:** JobTeaser (750–800 centros [C]), Handshake, plataformas propias.
- **Evidencia:** JobTeaser y Handshake demuestran que las universidades pagan por estas plataformas [C/T]. **No hay evidencia** de que una escuela española pague a un proveedor pequeño por un radar complementario.
- **Complejidad:** O1 + panel o export.
- **Ingresos:** potencialmente mayores por cliente (cientos o miles de €/año [E, sin evidencia de precios]).
- **Por qué podría fracasar:** ciclos de compra largos, contratación pública y competencia con JobTeaser.

### O5. Extensión de autocompletado y tracker para portales europeos (Workday multi-idioma, SuccessFactors, Avature)
- **Problema:** la fricción de formularios es real [U].
- **Alternativas:** Simplify, Glever, JobWizard, JobFill (gratis–10 $/mes).
- **Diferenciación posible:** soporte de formularios en alemán/francés y de ATS europeos. **No se ha medido** que las extensiones actuales fallen en ellos.
- **Complejidad:** alta y frágil (DOM de cada ATS, idiomas).
- **Riesgos:** términos de los portales y datos personales en el cliente.
- **Ingresos:** precio de referencia 4–10 $/mes con competencia gratuita.
- **Por qué podría fracasar:** commodity, mantenimiento caro y competidores financiados.

## 3. Comparación resumida

| | O1 Radar UE + elegibilidad | O2 Calendario graduate | O3 Elegibilidad/documentos | O4 B2B universidades | O5 Autofill europeo |
|---|---|---|---|---|---|
| Evidencia del problema | Media (cobertura medida en 1 competidor) | Media | Media | Baja | Media (dolor), baja (hueco) |
| Diferenciación | Media-alta | Media | Baja | Media | Baja |
| Complejidad técnica | Media | Baja | Baja | Media | Alta |
| Coste de mantenimiento | Medio | Bajo | Bajo | Medio | Alto |
| Riesgo legal | Medio (Workday/portales) | Bajo | Bajo-medio | Medio | Medio-alto |
| Potencial de ingresos | Bajo B2C / medio B2B | Bajo | Bajo | Medio | Bajo |
| Validable en 2–4 semanas con 0–100 € | Sí (demo con 30–50 empresas) | Sí | Sí | Difícil | No |

## 4. Recomendación de esta fase

Los datos **no justifican** construir la plataforma global con candidatura automatizada que se planteaba al principio:
- El autofill y el tracker son commodities.
- El envío automático no es viable.
- En EE. UU. ya existe un líder gratuito.

Sí justifican **probar O1 + O2 como una sola propuesta**: radar curado de prácticas y graduate programs en industriales europeas, con elegibilidad para residentes UE y calendario de convocatorias. O3 se usaría como contenido de captación y O4 como vía de monetización a explorar después. Primero hay que superar los umbrales de validación de [validation-plan.md](validation-plan.md). Hasta entonces es una **hipótesis**, no una oportunidad demostrada.
