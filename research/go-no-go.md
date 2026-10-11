# Fase 7: decisión GO / NO-GO

Fecha: 2026-10-11.

## Recomendación

| Propuesta | Decisión |
|---|---|
| Idea original: plataforma **global** web y móvil que centraliza ofertas de todo el mundo y permite **solicitar con la mínima intervención** (autocompletado y envío) | **NO-GO** |
| Hipótesis reducida: **radar curado de prácticas, placements y graduate programs en ~50–300 empresas industriales europeas**, con filtros de elegibilidad para residentes UE y calendario de convocatorias, enlazando siempre a la web oficial | **GO CONDICIONADO**: solo tras superar los umbrales de [validation-plan.md](validation-plan.md) |

Esta decisión no sale de una puntuación. Sale de los hechos de abajo.

## Respuestas directas

**1. ¿Existe un producto idéntico o sustancialmente equivalente?**
- No se encontró uno idéntico.
- Para EE. UU. existe uno **sustancialmente equivalente**: Simplify (listas de prácticas y new grad desde ATS, autofill gratuito y tracker). También Jobright y HiringCafe.
- En Europa, Stag-io declara una propuesta muy parecida (prácticas desde páginas corporativas, 6 idiomas) pero no se pudo medir.
- JobTeaser y Handshake cubren el segmento universitario europeo con un modelo B2B.

**2. ¿Qué hacen ya los competidores?**
- Agregan ofertas desde ATS (Simplify, Jobright, HiringCafe).
- Autocompletan formularios gratis o por 3,99–10 $/mes (Simplify, Glever, JobFill, GoFillr, JobWizard).
- Hacen seguimiento de candidaturas (Teal, Huntr, Simplify).
- Envían candidaturas automáticamente (Glever "Apply For Me", LazyApply).
- Conectan universidades y empleadores (JobTeaser, Handshake).
- Ver [competitor-matrix.md](competitor-matrix.md).

**3. ¿Qué limitaciones se han comprobado?** [H]
- Listas de Simplify: el 93,9 % de las prácticas activas está solo en EE. UU./Canadá; 274 están en Europa y 2 en España.
- En la muestra de 30 empresas: 0 ofertas activas en España, 31 en Europa (sobre todo UK) y 8 empresas sin ninguna oferta. Esas 8 son las 5 españolas Gestamp, SEAT, Sener, Acciona y CAF, más Siemens Energy, Volvo y BMW.
- El campo de patrocinio o permiso vale "Other" en el 99,6 % de las ofertas.
- 15 duplicados activos.
- LinkedIn prohíbe la automatización.
- Workday no tiene API pública de lectura y exige cuenta por empleador.
- Las APIs de Oracle son internas o solo para partners.
- Las APIs de envío de Greenhouse y Lever necesitan la clave del cliente.

**4. ¿Qué hueco comercial específico?**
Prácticas y graduate programs **de ingeniería industrial en Europa continental** para estudiantes residentes en la UE, con **elegibilidad estructurada** (obligatoria/voluntaria, convenio, idioma, residencia) y **calendario de convocatorias**. El hueco está demostrado **frente a Simplify**. **No** está demostrado frente a JobTeaser, LinkedIn o las bolsas universitarias, que no se pudieron medir.

**5. ¿Qué pruebas lo respaldan?**
- Dataset de Simplify (commits `1b0b176`, `edad37e`) y `simplify_sample_matches.csv`.
- Requisitos observados en fichas de Mercedes, VW, Iberdrola y Siemens.
- Quejas repetidas sobre Workday [U].
- Ausencia de un calendario continental en las búsquedas.
- **No hay pruebas de demanda ni de pago.** Por eso la decisión es condicionada.

**6. ¿Qué parte es viable con 100–500 €?**
- Demo manual (hoja pública) y landing: 0–20 €.
- Ingesta de Greenhouse, Lever, Ashby y SmartRecruiters por API pública, y de Workday por el JSON del sitio (con las cautelas de [ats-analysis.md](ats-analysis.md)).
- Normalización, deduplicación, detección de cierre, web responsive con login, favoritos, estados de candidatura y alertas por correo.
- Todo ello en planes gratuitos (Supabase, GitHub Actions, Cloudflare Pages o Vercel según uso) más un dominio. Ver [budget.md](budget.md).

**7. ¿Qué sería demasiado costoso?**
- Cobertura "mundial".
- Scrapers de decenas de portales propios.
- Apps nativas iOS/Android desde el inicio.
- Una extensión de autofill competitiva.
- Envío automático.
- Acuerdos o feeds con cada empresa (SuccessFactors, Oracle, iCIMS).
- IA de adaptación de CV con coste por uso.

**8. ¿Qué riesgos hay?**
- **Acceso a datos:**
  - Workday y los portales propios se usan sin API oficial (categoría C): bloqueos, cambios y términos de uso.
  - Copiar desde **bolsas de terceros** (InfoJobs, StepStone, LinkedIn, Indeed) puede chocar con sus términos y con el derecho *sui generis* sobre bases de datos de la UE. Hay jurisprudencia del TJUE sobre motores que reutilizan anuncios de empleo (C-762/19, *CV-Online Latvia*, 2021; **revisar con un abogado**). Decisión: **solo fuentes del propio empleador y APIs autorizadas**.
- **Automatización:** enviar o crear cuentas por el usuario es inviable y peligroso (categoría E). La herramienta solo debe abrir el portal oficial.
- **Regulación:** RGPD (datos de candidatos). Según fuentes secundarias, el AI Act califica de alto riesgo los sistemas de reclutamiento, incluido "colocar anuncios de empleo dirigidos", con obligaciones aplazadas a 2-12-2027. Hay que evitar puntuar o seleccionar a personas con IA y revisar el encaje legal antes de personalizar con modelos.

**9. ¿Cuál es el MVP mínimo?**
- **Primero (sin código):** una hoja pública con ofertas reales de 50 empresas, el calendario de convocatorias, alertas semanales por correo a mano y una landing.
- **Si se superan los umbrales:** una web responsive con perfil mínimo, radar filtrable, fichas con fuente, fecha de última verificación y estado, favoritos, estados de candidatura, alertas por correo y eliminación de datos. Sin CV en servidor, sin autofill propio y sin apps nativas. Ver [technical-architecture.md](technical-architecture.md).

**10. ¿Cómo conseguir los primeros 100 usuarios?**
- Delegaciones de alumnos y asociaciones de ingeniería (BEST, IAESTE, EESTEC).
- COIE y escuelas.
- Grupos de LinkedIn, Telegram y Discord de máster.
- Contenido corto ("abre el graduate de X", "Pflichtpraktikum explicado").
- Envío semanal de valor real.
- Detalle en [launch-plan.md](launch-plan.md).

**11. ¿Cómo monetizar?**
- Hipótesis: núcleo gratis y un **pase de temporada** de 9–19 € por 3 meses.
- A medio plazo, **B2B** con escuelas o asociaciones y patrocinio de empleadores.
- El B2C por sí solo da ingresos bajos (ejemplo ilustrativo en [business-model.md](business-model.md)).

**12. ¿Qué tendría que ocurrir para abandonar la idea?** Basta con cualquiera de estas condiciones:
- <30 % de entrevistados con dolor fuerte, o <20 % que descubre ofertas nuevas en la demo, porque JobTeaser, LinkedIn o la bolsa ya les bastan.
- 0 pagos o depósitos tras ≥300 visitas cualificadas y ≥15 entrevistas.
- <50 % de las empresas objetivo obtenibles por vías permitidas, o un bloqueo o requerimiento legal de una fuente clave.
- <10 ofertas relevantes nuevas por semana para el perfil de Ing. Mecánica en Europa: no hay suficiente valor recurrente.
- Una medición manual muestra que Stag-io, JobTeaser o HiringCafe ya cubren ≥80 % de las ofertas de referencia de la muestra.

## Condiciones para pasar a GO

1. **H6 (datos):** `ats_probe.py` y la revisión manual confirman ≥70 % de 50 empresas obtenibles por vías permitidas y ≥20 ofertas relevantes por semana.
2. **H1–H3 (dolor):** ≥15 entrevistas con los umbrales de "continuar".
3. **H5 (pago) o H7 (B2B):** ≥5 pagos o depósitos, **o** ≥1 acuerdo escrito con una escuela o asociación.
4. **Competencia:** medición manual de Stag-io, JobTeaser y HiringCafe sobre la muestra con cobertura <80 % de las ofertas de referencia.

Hasta que se cumplan, **no se implementa el producto**. Por eso este repositorio contiene informes, datos, scripts de medición y materiales de validación, pero ningún MVP.
