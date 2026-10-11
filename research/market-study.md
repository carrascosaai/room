# Estudio de mercado: fases 1, 2 y 3

Fecha de trabajo: 2026-10-11. Leyenda: **[H]** hecho verificado · **[C]** declaración comercial · **[T]** tercero · **[U]** opinión de usuario · **[E]** estimación · **[Hip]** hipótesis.

## 0. Entorno y herramientas: qué se pudo y qué no

- **Acceso HTTP directo bloqueado.** Desde el contenedor de investigación, `curl` a cualquier web de competidor, portal corporativo o API de ATS devolvió `CONNECT tunnel failed, response 403`. `WebFetch` devolvió `ENOTFOUND` incluso para simplify.jobs. Solo eran accesibles GitHub (raw y git) y los registros de paquetes.
- **Herramientas que sí funcionaron:**
  - Buscador web con fragmentos (≈60 consultas).
  - Descarga de datasets públicos en GitHub (Simplify, una lista europea y documentación comunitaria de APIs).
- **Consecuencia:** la parte del experimento que exigía abrir cada portal oficial (contar vacantes, recorrer el formulario, ver si exige cuenta) **no se ha podido ejecutar**. No se ha sustituido por datos inventados. Se ha preparado `scripts/ats_probe.py` para repetirlo desde un equipo con acceso normal (ver §4).
- Para levantar la restricción, cambia el acceso a red del entorno: menú del entorno cloud → *Edit* → *Network access*, ampliando el nivel o añadiendo los dominios (`*.myworkdayjobs.com`, `api.smartrecruiters.com`, `boards-api.greenhouse.io`, `api.lever.co`, `api.ashbyhq.com`, los competidores…). Pasos: https://code.claude.com/docs/en/cloud-environments#network-access

## 1. Fase 1: resultado del estudio de competidores

El detalle por competidor está en [competitor-matrix.md](competitor-matrix.md). Conclusiones:

1. **No se ha encontrado un producto idéntico** (global, centrado en prácticas y graduate de ingeniería, con ofertas desde páginas corporativas, filtros de elegibilidad europeos y candidatura asistida). [H por ausencia en búsquedas, no concluyente]
2. **Las piezas existen por separado y son baratas o gratuitas:**
   - Agregación desde ATS para estudiantes de EE. UU.: Simplify, Jobright, HiringCafe.
   - Autocompletado: Simplify Copilot, Glever, JobFill, GoFillr, JobWizard.
   - Seguimiento de candidaturas: Teal, Huntr, Simplify.
   - Redes universitarias europeas: JobTeaser, Handshake.
   - Prácticas paneuropeas: ErasmusIntern, EURES.
   - Prácticas desde páginas corporativas: Stag-io [C].
3. **Las cuatro plataformas de partida:**
   - Stag-io: indexada y cercana a la idea, sin evidencia de escala.
   - Job Finder, JobsFinder y NxtRole: sin huella pública verificable con esos dominios.
4. **El tracking y el autofill no diferencian.** Varios competidores los ofrecen gratis.

## 2. Fase 2: experimento con 30 empresas

### 2.1 Diseño (definido antes de medir)

- **Muestra:** 30 empresas, todas con presencia internacional:
  - 8 españolas: Iberdrola, Repsol, Indra, Gestamp, SEAT/CUPRA, Sener, Acciona, CAF.
  - 14 europeas: Airbus, Siemens, Siemens Energy, Bosch, ABB, Schneider Electric, Rolls-Royce plc, Safran, Volvo Group, Volkswagen Group, BMW Group, Mercedes-Benz, ASML, Thales.
  - 7 estadounidenses: GE Aerospace, GE Vernova, Carrier, Boeing, Caterpillar, Honeywell, Tesla.
  - 1 suizo-japonesa: Hitachi Energy.
  - Sectores: aeroespacial y defensa (7), automoción (8), energía (7), maquinaria y HVAC (3), ingeniería/tecnología industrial (5).
- **Exclusiones justificadas:**
  - "Deloitte Engineering": no se pudo verificar una entidad con ese nombre. Deloitte publica en `apply.deloitte.com` (Avature), pero son puestos de consultoría.
  - Vestas y Lockheed Martin: sustituidas por Thales y GE Vernova, que tenían más evidencia disponible.
- **Oferta válida:** está publicada en el portal oficial del empleador o en su ATS, sigue activa en la fecha de comprobación y es de prácticas, internship, co-op, placement, apprenticeship de grado, graduate program, working student/thesis o un puesto junior/entry level relacionado con ingeniería.
- **Oferta duplicada:** mismo empleador, mismo título normalizado y mismo conjunto de ubicaciones, o mismo ID de requisición en la URL, que aparece más de una vez.
- **Oferta caducada:** la fuente la marca como cerrada o inactiva, la URL devuelve 404 o redirige al buscador, o la fecha límite publicada ya ha pasado.
- **Objetivo:** hasta 5 ofertas relevantes por empresa, sin forzar la cifra.

### 2.2 Qué se midió realmente

| Dato | Estado | Fuente |
|---|---|---|
| URL de careers y buscador | 22/30 empresas con URL de careers o buscador observada (19 con buscador/ATS concreto) | URLs de ofertas reales del dataset de Simplify y fragmentos del buscador |
| ATS identificado | **19/30** con evidencia: 13 Workday, 1 SmartRecruiters, 1 Oracle, 1 Avature (inferido), 3 portales propios (Safran, BMW, Tesla). Además, filiales en Lever (Mercedes EE. UU.), Ashby (JV VW-Rivian), Workable (Indra UK), iCIMS (Schneider EE. UU.) y BambooHR (Safran EE. UU.) | Host de las URLs de ofertas |
| Programas para estudiantes | Evidencia en 28/30 (sin evidencia: Sener y Acciona) | Fragmentos de webs oficiales, universidades y bolsas |
| Nº de ofertas relevantes en el **portal oficial** | **0/30 medidas** | Bloqueo de red: no se inventa ninguna cifra |
| Ofertas relevantes vía Simplify (intern + new grad, activas) | 247 en 16 empresas; 83 de categoría Hardware; 31 en Europa; **0 en España** | Dataset de Simplify (ver §3) |
| Ejemplos reales (título, ubicación, fecha, URL) | Hasta 5 por empresa en 16 empresas; el resto con fichas de fragmentos (Siemens, Safran, BMW, Mercedes, VW, Iberdrola) | `company-sample.csv` |
| Requisitos publicados | Parciales en 8 empresas: Iberdrola B2/C1 y 900 €/mes; Mercedes Pflichtpraktikum; VW matrícula y permiso de trabajo para no-UE; Siemens prácticas curriculares | Fragmentos |
| Pasos, datos, cuenta, autofill | Solo el **patrón por ATS** (Workday, SmartRecruiters), marcado "no verificado en este tenant" | Documentación y terceros |

Los datos por empresa, con 26 campos, fecha y método, están en [company-sample.csv](company-sample.csv).

### 2.3 Hallazgos de la fase 2 (con su nivel de evidencia)

1. **Los grandes grupos no tienen "un ATS".** Mercedes, VW, Indra, Safran y Schneider aparecen con ATS distintos según filial o país. Hitachi comparte un tenant de Workday entre varias empresas. "Rolls-Royce Motorcars" publica en el portal de BMW. Integrar "una empresa" significa resolver entidades y varias fuentes. [H]
2. **Workday domina la muestra:** 13 de 19 identificados [H]. Workday es también el 36,6 % de las prácticas activas de Simplify [H]. No tiene API pública documentada para leer ofertas y exige una cuenta por empleador (patrón general [T], [U]).
3. **En España las prácticas se canalizan en parte fuera del portal corporativo:** bolsas universitarias con convenio (RD 592/2014), PDFs en webs de facultades (Iberdrola–USAL), fundaciones (Repsol–Universia), InfoJobs y StudentJob. [H, fragmentos indexados] Un agregador que solo lea ATS corporativos **no verá** una parte del mercado español de prácticas curriculares. [Hip: no se ha cuantificado qué parte]
4. **Hay requisitos de elegibilidad críticos sin estructurar:**
   - Pflichtpraktikum en Mercedes y VW.
   - Prácticas curriculares que exigen convenio.
   - Derecho a trabajar en UK para apprenticeships y placements.
   - Ciudadanía o control de exportaciones en defensa.
   - Idioma (B2/C1).
   - Un estudiante español no puede filtrar por ninguno de ellos en las fuentes observadas. [H en Simplify: el campo `sponsorship` vale "Other" en el 99,6 % de las ofertas activas]

## 3. Fase 3: comparación de plataformas con la muestra

### 3.1 Método

- **Simplify**, medido con sus **listas públicas de GitHub** (no con la web completa, que puede tener más ofertas). Para cada empresa se buscó su nombre en `company_name` con una expresión regular revisada a mano (`scripts/simplify_coverage.py`) y se clasificaron ubicaciones y duplicados. La URL de cada oferta apunta al ATS oficial; **la comprobación de que cada URL siga viva no fue posible** (red bloqueada).
- **Resto de plataformas:** sin acceso, así que se marcan como **no verificables** salvo que un fragmento indexado muestre la empresa en la plataforma (JobTeaser→BMW, StepStone→Mercedes, InfoJobs→Gestamp/SEAT, workingstudentjobs.de→VW).
- **No se calculan porcentajes de "ofertas de referencia encontradas"** porque no existe denominador fiable: no se pudo contar las ofertas en los portales oficiales.

### 3.2 Resultados para Simplify (listas públicas, 2026-10-11)

| Métrica | Valor |
|---|---|
| Empresas de la muestra con ≥1 oferta activa | **16 / 30** (15 completas y 1 parcial: solo la JV Rivian-VW) |
| Empresas con solo ofertas históricas o de filiales | 6 (Iberdrola, Indra, Siemens, Schneider, Safran, Mercedes) |
| Empresas sin ninguna oferta en el dataset | 8 (Gestamp, SEAT, Sener, Acciona, CAF, Siemens Energy, Volvo, BMW) |
| Empresas españolas con oferta activa en España | **0 / 8** |
| Ofertas activas relevantes (intern + new grad) | 247 (83 en categoría Hardware) |
| …en Europa / en España | 31 (18 de Thales UK, 5 de Airbus UK…) / **0** |
| Ofertas históricas o inactivas de esas empresas | 985 de 1 232 (80 %): alta rotación; el dataset las marca `active=false` |
| Duplicados activos | 15 (11 en GE Vernova, 2 en Boeing, 2 en Honeywell) |
| Enlaces rotos | **No medido** (sin acceso HTTP) |
| Ofertas que exigen ir al portal corporativo | 247/247: todas las URLs apuntan al ATS del empleador |
| Ofertas que permiten solicitar desde la plataforma | 0 (Simplify redirige y autocompleta; no envía) |
| Ofertas con autocompletado posible | No medible; Simplify declara soporte de Workday, SmartRecruiters y Oracle [T] |
| Datos de elegibilidad laboral | `sponsorship` = "Other" en el 99,6 % de las activas del dataset completo |

A escala del dataset completo [H]:

| Dataset | Ofertas activas | Solo EE. UU./Canadá | Europa | España |
|---|---|---|---|---|
| Prácticas | 4 651 | 93,9 % | 274 (5,9 %) | 2 |
| New grad | 3 119 | 91,8 % | 240 (7,7 %) | 1 |

### 3.3 Otras plataformas

| Plataforma | Cobertura de empresas comprobada | Comentario |
|---|---|---|
| Stag-io, Glever, HiringCafe, Jobright, Handshake, WTTJ, Wellfound, EURES, ErasmusIntern | **No verificable** (0 comprobaciones posibles) | Requiere acceso web. El script y la matriz están preparados para rellenarlo. |
| LinkedIn, Indeed | No verificable y **no se intentó**: exigen sesión y sus términos prohíben la automatización | — |
| JobTeaser | BMW: parcial (fragmento con 487 ofertas BMW) | No es una prueba dentro de la plataforma |
| EarlyCareersEU | 0/30 (README actual con 60 enlaces de LinkedIn, ninguno de la muestra) | [H] |
| Job Finder, JobsFinder, NxtRole | No localizadas | — |

La matriz celda a celda, con URL de evidencia y fecha, está en [job-coverage-matrix.csv](job-coverage-matrix.csv). La matriz por ATS está en [data/ats-coverage-matrix.csv](data/ats-coverage-matrix.csv).

### 3.4 Lo que significa (y lo que no)

- **Sí demuestra** que el líder en EE. UU. en agregación para estudiantes, con sus datos públicos, **no sirve a un estudiante de ingeniería que busca prácticas en España o Europa continental**. En la muestra, 0 ofertas en España y 31 en Europa (casi todas en UK).
- **No demuestra** que el problema esté sin resolver en Europa. JobTeaser, Handshake Europe, las bolsas universitarias, LinkedIn, StepStone e InfoJobs pueden cubrirlo, y **no se ha podido medir su cobertura**. Esta es la principal incertidumbre del estudio.
- **No demuestra** disposición a pagar.

## 4. Cómo completar la medición (siguiente paso reproducible)

1. Desde un equipo con internet: `python3 research/scripts/ats_probe.py research/data/ats_endpoints.csv > research/data/portal_counts.csv`. Solo usa APIs públicas documentadas. Añade `--allow-unofficial` para Workday, que no tiene API pública documentada; la decisión es tuya (ver [ats-analysis.md](ats-analysis.md)).
2. Para las 11 empresas sin ATS identificado, abrir el portal a mano, anotar ATS, cuenta y pasos, y añadir la fila a `ats_endpoints.csv`.
3. En la misma semana, buscar manualmente las 30 empresas en JobTeaser (si tu universidad lo tiene), HiringCafe, Stag-io, Glever/jobs, LinkedIn (manual, sin automatización) y EURES. Registrar en `job-coverage-matrix.csv`: comprobada, parcial o no encontrada, con URL y fecha.
4. Con `portal_counts.csv` como denominador, calcular el % de ofertas de referencia que encuentra cada plataforma.

## 5. Limitaciones de la muestra

- 30 empresas grandes no representan a las pymes, que son una parte relevante de las prácticas en España, ni a otros sectores.
- La selección favorece empresas con presencia en EE. UU. y, por tanto, con datos en Simplify. Esto sesga al alza la cobertura de Simplify.
- La identificación de ATS se basa en el host de las URLs, que es fiable para el ATS de esa oferta pero no para todo el grupo.
- Las cifras de Simplify proceden de sus listas públicas de GitHub, que pueden diferir de lo que muestra simplify.jobs.
- Los fragmentos del buscador pueden estar desactualizados (las fechas se indican cuando se conocen).
