# Fase 4: análisis de sistemas ATS

Fecha: 2026-10-11. Las fuentes por ATS están en [sources.md](sources.md#ats) y la matriz en [data/ats-coverage-matrix.csv](data/ats-coverage-matrix.csv).

## Clasificación usada

- **A.** API pública documentada (lectura).
- **B.** Integración oficial o autorizada con condiciones (partner, feed configurado por el cliente).
- **C.** Datos públicos accesibles sin API oficial confirmada.
- **D.** Requiere autorización específica (del cliente o del proveedor).
- **E.** No debe implementarse (restricción legal, contractual o técnica).

La lectura de ofertas y el envío de candidaturas se clasifican por separado porque tienen riesgos muy distintos.

## Peso de cada ATS en los datos medidos

Proporción de ofertas activas del dataset de Simplify por host de la URL [H]:

| ATS | Prácticas (4 651) | New grad (3 119) | Empresas de la muestra (30) |
|---|---|---|---|
| Workday | 36,6 % | 28,3 % | 13 |
| Greenhouse | 11,3 % | 12,1 % | 0 |
| iCIMS | 8,5 % | 8,6 % | 1 (filial EE. UU.) |
| Oracle Recruiting Cloud | 6,7 % | 5,0 % | 1 |
| Ashby | 6,3 % | 6,7 % | 1 (JV) |
| SAP SuccessFactors | 3,5 % | 1,7 % | 0 identificadas |
| Lever | 2,6 % | 6,1 % | 1 (filial EE. UU.) |
| SmartRecruiters | 2,2 % | 5,4 % | 1 |
| Workable | 0,7 % | 2,4 % | 1 (filial UK) |
| Portales propios (Tesla, TikTok, ByteDance…) | ~10 % | ~12 % | 3 |

**Lectura.** Las fuentes con API pública y cómoda (Greenhouse, Lever, Ashby) pesan mucho entre startups y empresas tech de EE. UU., pero **casi nada en la muestra de grandes industriales europeas**. Esas se concentran en Workday, portales propios y SuccessFactors/Avature/Oracle. [H para la muestra; [Hip] que el patrón se mantenga en un universo mayor de industriales europeas]

## Ficha por ATS

### Workday (Recruiting)
- **Publicación:** cada empleador tiene un tenant `<tenant>.wdN.myworkdayjobs.com/<site>`. El sitio de carreras se alimenta de un endpoint JSON (`POST /wday/cxs/<tenant>/<site>/jobs` y ficha por `externalPath`) [T: scrapers públicos].
- **API pública documentada para leer ofertas:** no se encontró. Workday ofrece APIs (REST/SOAP) **al cliente**, con credenciales del tenant [T]. Clasificación de lectura: **C**. Si se quiere una base sólida, **D**: un acuerdo con cada empresa o el uso de su feed a bolsas.
- **Autenticación y límites:** el endpoint del sitio es anónimo. Algunos empleadores bloquean el tráfico desde centros de datos (403) y hay 429/503 ocasionales [T].
- **Detección de cierre:** posible comparando listados (la oferta desaparece) o consultando la ficha. No hay webhook público.
- **Datos que pide al candidato:** contacto, dirección, CV (con parseo), experiencia, educación, idiomas, autorización de trabajo, preguntas propias y declaraciones voluntarias (patrón general; varía por tenant).
- **Autocompletable:** contacto, educación, experiencia, enlaces y respuestas repetidas. **Requiere persona:** crear cuenta y verificar el correo (por tenant), revisar el parseo del CV, preguntas abiertas, declaraciones legales, posibles CAPTCHA y el envío.
- **Fricción documentada:** una cuenta por empleador; tras subir el CV hay que reintroducir datos [U, patrón repetido en varios hilos de Blind, Fishbowl y Trustpilot].
- **Envío por terceros:** **E**. No hay vía autorizada para que un tercero cree cuentas o envíe en nombre del usuario. Además lo impiden la verificación de correo y las condiciones del tenant.

### Greenhouse
- **Publicación:** Job Board por `board_token`.
- **API:** **A**. Job Board API pública: `GET boards-api.greenhouse.io/v1/boards/{token}/jobs` sin autenticación [H: developers.greenhouse.io].
- **Envío:** `POST …/jobs/{id}` requiere la **Job Board API key del cliente** (Basic Auth) [H]. Para un tercero es **D**: solo con autorización de la empresa.
- **Detección de cierre:** la oferta desaparece del listado.
- **Autocompletable:** formulario de una página. Lo soportan casi todas las extensiones [C].

### Lever
- **API:** **A**. Postings API pública `api.lever.co/v0/postings/{site}?mode=json`, con base UE `api.eu.lever.co` [T, consistente entre fuentes].
- **Envío:** apply por API con clave que configura Lever [T]: **D**.
- **Límites:** 2 POST/s en apply y 10 req/s en la Data API [T].

### SmartRecruiters
- **API:** **A/B**. Posting API documentada [H: developers.smartrecruiters.com]. La documentación oficial menciona autenticación con API key. Terceros dicen que el feed público `api.smartrecruiters.com/v1/companies/{id}/postings` funciona sin clave cuando el cliente lo tiene activado y que depende del plan. **Contradicción no resuelta.**
- **Candidatura:** el formulario suele ser de una página y no siempre exige cuenta [T].

### Ashby
- **API:** **A** (según terceros). `api.ashbyhq.com/posting-api/job-board/{org}`, pública y sin paginación. No se localizó la documentación oficial.
- **Envío:** API del cliente con clave: **D**.

### SAP SuccessFactors (Recruiting + Career Site Builder)
- **Publicación:** Career Site Builder y **feeds XML** que el cliente genera para bolsas concretas, con una URL única por proveedor [H: SAP Learning y KB].
- **Clasificación:** **B**. El feed existe, pero lo crea y autoriza la empresa para un destinatario. Un agregador nuevo tendría que pedirlo empresa a empresa.
- **Envío:** solo integraciones del cliente.

### Oracle Recruiting Cloud (y Taleo)
- **Lectura:** los recursos REST de Candidate Experience están marcados "only for Oracle internal use". `recruitingJobSitePostedJobs` es **solo para partners de Oracle Cloud Marketplace** [H: docs.oracle.com]. Clasificación: **D**.
- **Taleo:** sin API de lectura pública conocida. Clientes migrando a ORC (p. ej. Bank of England, 2024) [T]. Sin fecha oficial de fin. **C/E**: no merece inversión.

### iCIMS
- No se encontró API pública de lectura. Las integraciones van por su programa de partners: **D**.

### Avature
- Siemens (inferido) y Deloitte. Fichas públicas `/<locale>/externaljobs/JobDetail/<id>`. No se encontró API: **C**.

### Workable, Personio, Teamtailor, Recruitee
- Frecuentes en pymes europeas. Workable aparece en la muestra (Indra UK). Personio, Teamtailor y Recruitee **no se investigaron** por falta de acceso. Conviene revisarlos porque pueden pesar en pymes industriales de España y Alemania. [Hip]

### Portales propios (BMW, Safran, Tesla y probablemente varias españolas)
- **Sin API.** La lectura sería scraping del HTML y depende de los términos de uso y del `robots.txt` de cada empresa: **C** como mucho, **E** si los términos lo prohíben o hay controles anti-bot.
- **Coste de mantenimiento:** el más alto (un parser por portal que se rompe con cada rediseño).

### Fuentes públicas no-ATS
| Fuente | Clasificación | Notas |
|---|---|---|
| Bundesagentur für Arbeit (Jobsuche) | **C** | Sin API oficial; endpoint usado por la propia web con `X-API-Key: jobboerse-jobsuche`; `angebotsart=34` = Praktikum/Trainee [H: doc. comunitaria] |
| Adzuna API | **A** (con registro) | ~1 000 llamadas/mes gratis, ~16 países, descripciones truncadas [T] |
| EURES | **D** | Sin API oficial encontrada; el portal se alimenta de los servicios públicos de empleo |
| LinkedIn | **E** | Prohíbe extensiones que automaticen actividad [H]; API de empleo solo para partners [T] |
| Indeed | **E/D** | Publisher API retirada; APIs para partners en sentido empleador→Indeed [T] |

## Qué se puede construir de forma sostenible

| Capacidad | Viable con 100–500 € | Clasificación | Comentario |
|---|---|---|---|
| Leer ofertas de empresas en Greenhouse, Lever, Ashby y SmartRecruiters (feed público) | Sí | A | Coste casi nulo; poca presencia en industriales europeas |
| Leer ofertas de empresas en Workday desde el JSON de su sitio | Técnicamente sí, con **riesgo** | C | Sin API documentada. Hay que revisar los términos de cada empresa, limitar la frecuencia y atribuir la fuente. Puede romperse o bloquearse. |
| Leer portales propios por scraping | Caso a caso | C/E | Mantenimiento alto; descartar si los términos lo prohíben |
| Recibir feeds XML (SuccessFactors) o acuerdos con empresas | No a corto plazo | B/D | Exige relación comercial con cada empresa |
| Detectar ofertas cerradas | Sí | — | Por desaparición en el listado y comprobación de la URL |
| Autocompletar campos en el navegador del usuario (extensión) | Sí, pero **no diferencia** | — | Commodity, y el usuario debe revisar y enviar |
| Crear cuentas o enviar candidaturas en nombre del usuario | **No** | E | Verificación de correo, CAPTCHA, términos de LinkedIn/Workday, riesgo para el usuario |
| Enviar por API oficial de apply (Greenhouse/Lever) | No | D | Requiere la clave de cada empresa cliente |

**Conclusión técnica.** Con presupuesto mínimo se puede **leer y normalizar** ofertas de unas decenas o centenares de empresas elegidas y detectar cierres. **No** se puede prometer candidatura con un clic. El autocompletado ya lo resuelven gratis otras extensiones, así que la propuesta debería apoyarse en ellas en lugar de competir.
