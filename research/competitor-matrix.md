# Matriz comparativa de competidores

Fecha de consulta: 2026-10-11. Leyenda de evidencia: **[H]** hecho verificado (dato descargado o documentación oficial), **[C]** declaración comercial del propio competidor, **[T]** afirmación de terceros (reseñas, blogs), **[U]** opinión de usuarios, **NV** no verificado. Las URLs están en [sources.md](sources.md).

> Ninguna web de competidor pudo abrirse directamente (bloqueo de red del entorno). Todo lo que no proviene de un dataset descargado procede de fragmentos indexados por el buscador. Por eso casi todas las celdas son [C] o [T].

## 1. Las cuatro plataformas iniciales

| Plataforma | ¿Operativa? | Qué se pudo establecer | Conclusión |
|---|---|---|---|
| **Job Finder** (job-search.app) | **NV**. El dominio no resolvió desde el entorno y dos búsquedas (`"job-search.app"`) no devolvieron ninguna página del dominio. | Nada. Los resultados eran apps homónimas (Indeed, ZipRecruiter, "Job Search – Job Finder App" en Google Play). | No se puede afirmar ni que exista ni que no. Hay que comprobarlo manualmente. |
| **JobsFinder** (jobsfinder.aievdy.com) | **NV**. Mismo resultado. La búsqueda de "aievdy" no devolvió ninguna página. | Homónimos sin relación demostrada: JobsFinder.gr (Grecia), JobsFinder.co.uk, jobfinder-ai.com (autofill y emails a hiring managers), thejobfinderai.com (auto-apply, Pro 49 $/mes [C]). | Ídem. Posible subdominio de una app pequeña sin indexar. |
| **NxtRole** (nxt-role.com) | **NV**. Búsqueda exacta sin resultados del dominio. | Homónimos: nxtroleus.com ("5,000+ verified companies", tech jobs e internships, EE. UU. [C]) y nxtrole.org ("AI career command center", adaptación de CV [C]). | Ídem. |
| **Stag-io** (stag-io.com) | **Indexada** (el buscador devuelve la home). Hay un espejo en stag-io.vercel.app descrito como "Internship Management Platform". | [C] Agregador de prácticas "from all sectors worldwide", 6 idiomas, prioriza "company career pages" y "verified platforms", agregadores como último recurso; "No sign-up. No CV upload. Apply directly at the source." | **Es el competidor conceptualmente más cercano** a la idea (prácticas + páginas corporativas + global). No se pudo medir cobertura, número de ofertas, frescura ni operador. Sin reseñas ni prensa. |

**Lectura crítica.** Tres de las cuatro referencias iniciales no tienen huella pública comprobable. Eso no demuestra que no existan, pero sí que no son competidores con tracción visible. Stag-io muestra que la idea de un "agregador de prácticas desde páginas corporativas" ya se ha intentado, aunque sin señales de escala.

## 2. Competidores ampliados

| Producto | Propuesta y público | Cobertura (países/sectores) | Fuente de ofertas | Prácticas/graduate | Autofill / ATS | ¿Envía o redirige? | Seguimiento | Precio | Plataformas | Quejas / debilidades | Evidencia |
|---|---|---|---|---|---|---|---|---|---|---|---|
| **Simplify** (simplify.jobs) | Buscador, autofill y tracker para estudiantes y recién graduados | Listas públicas: **93,9 % (prácticas) y 91,8 % (new grad) de las ofertas activas solo en EE. UU./Canadá**; Europa 5,9 % de las prácticas activas y 7,7 % de new grad; **España: 2 + 1 ofertas** de 7 770 activas | ATS de las empresas (las URLs apuntan a Workday 36,6 %, Greenhouse 11,3 %, iCIMS 8,5 %…) | Núcleo del producto (listas Summer/New Grad) | Copilot gratis; ATS declarados: Workday, Greenhouse, Lever, iCIMS, Taleo, SmartRecruiters, Avature [T] | Redirige al ATS y autocompleta; el usuario envía | Sí | Copilot gratis; Simplify+ 19,99 $/sem, 39,99 $/mes, 89,99 $/trim. [T] | Web + extensión Chrome | Precisión irregular en Workday (≈70 % de campos según un tercero) [T]; campo de sponsorship "Other" en el 99,6 % de las ofertas activas [H] | [H] dataset; resto [T] |
| **Glever** (glever.co) | "Job applications, done for you" | "500,000+ jobs" [C]; países NV | NV | NV | Autofill en Greenhouse, Lever, Ashby, Workable y Rippling [C]. **Workday no figura** | Autofill (el usuario revisa); "One-Click Apply" en cola; "Apply For Me" envía hasta 200/mes [C] | NV | Autofill básico gratis; Premium 10 $/mes [C] | Extensión Chrome + iOS | Sin reseñas independientes | [C] |
| **GoFillr** | Extensión que autocompleta formularios y guarda respuestas | No agrega ofertas | — | — | Autofill genérico; análisis ATS de CV y generación de CV (endpoints del README) | Solo rellena | NV | Pro 5,99 $/mes o 49 $/año (README del repositorio; el dashboard mostraba 4,99 $ por error) | Extensión Chrome | Producto de un desarrollador individual | [H] código público |
| **HiringCafe** | Buscador gratuito de ofertas sacadas de webs corporativas | "4,199,352 jobs · 144,341 companies" (contador antiguo de la home) [C] | Páginas de empleo y ATS (Greenhouse, Lever, Workday según un scraper de terceros) [T] | Filtros NV | No | Redirige | NV | Gratis [T] | Web | Sin reseñas de cobertura en Europa | [C]/[T] |
| **Jobright** | Copiloto de búsqueda con IA; hub de prácticas | Hub de prácticas con ~79 687 ofertas mostradas [C]; foco en EE. UU. | NV | Hub específico, filtros de sponsorship y new grad [C] | Extensión autofill; funciona en Greenhouse y Lever, falla en formularios propios [T] | Autofill; auto-apply en beta [T] | Sí | 29–59 $/mes [T]; /pricing con 404 (2026-10-09) [T] | Web + extensión | Auto-apply inconsistente [T] | [C]/[T] |
| **JobTeaser** | Plataforma de carreras para estudiantes, vendida a universidades y empresas | Europa: 750–800 centros, 4–5 M estudiantes [C]; 487 ofertas BMW [C] | Empresas publican (modelo B2B) | Núcleo | No | Redirige o candidatura en plataforma (NV) | NV | Gratis para estudiantes; pagan empresas (sin precios publicados) | Web | Depende de que la universidad tenga contrato | [C] |
| **Handshake** | Red de empleo universitaria | +1 M estudiantes verificados UK/Europa, 13+ mercados; 1 500 universidades Europa+EE. UU. [C] | Empleadores publican | Núcleo | No | Candidatura en plataforma o redirección | Sí | Gratis estudiante; empleador Basic gratis; Plus ~100 $+/semana; TES ~29 835 $/año (mediana, [T]) | Web + iOS + Android | Acceso ligado a la universidad | [C]/[T] |
| **Welcome to the Jungle** (ex-Otta) | Empleo con contenido de marca empleadora | Francia, UK, EE. UU. y otros | Empresas clientes | Parcial | No | Redirige / plataforma | Sí | Gratis candidato | Web + apps | ERE en Francia (mayo 2025) | [C] |
| **Wellfound** | Empleo en startups | Global, startups tech | Startups publican | Poco relevante para ingeniería industrial | No | Candidatura en plataforma | Sí | Gratis candidato | Web | Precios de empleador contradictorios | [T] |
| **LinkedIn Jobs** | Red profesional y bolsa generalista | Global | Empresas (pago) y feeds | Filtro "prácticas" | Easy Apply propio | Mixto | Sí | Premium de pago | Web + apps | **Prohíbe** extensiones que automaticen actividad [H, ayuda oficial]; API de empleo solo para partners [T] | [H]/[T] |
| **Indeed** | Metabuscador y bolsa | Global | Empresas, feeds de ATS, scraping propio | Filtro por tipo | Indeed Apply | Mixto | Sí | Gratis candidato | Web + apps | Publisher API retirada; sin acceso de lectura para terceros [T] | [T] |
| **EURES** | Portal público europeo de movilidad | 31 países EEE, base actualizada a diario por servicios públicos de empleo [H] | Servicios públicos de empleo | Prácticas en otra sección, no como filtro claro [T] | No | Redirige | Cuenta | Gratis | Web | Sin API oficial encontrada | [H]/[T] |
| **ErasmusIntern** | Marketplace de prácticas Erasmus+ (ESN) | Europa, "más de 1300" oportunidades (sin fecha) [T] | Empresas publican | Núcleo | No | En plataforma | Cuenta | Gratis | Web | Volumen bajo; mezcla de pymes | [T] |
| **Gradcracker** | Ingeniería y ciencia, UK | UK | Empleadores (hubs) | Núcleo (placements, graduate) | No | Redirige | Alertas | Gratis estudiante | Web | Solo UK | [C] |
| **Bright Network** | Graduados UK (expansión a Alemania) | UK | Empleadores | Núcleo | No | Mixto | Sí | Gratis | Web + app | Solo UK en la práctica [T] | [C]/[T] |
| **EarlyCareersEU** / european-tech-internships | Lista open source de prácticas tech en Europa | 60 enlaces, sección de internships **vacía** en el README actual [H] | Enlaces de LinkedIn [H] | Núcleo | No | Redirige | No | Gratis | GitHub + web | Escala mínima; depende de LinkedIn | [H] |
| **Teal / Huntr** | Tracker + CV | — | — (guardan ofertas desde extensión) | — | Autofill parcial (Huntr) | — | **Núcleo** | Teal+ 29 $/mes; Huntr Pro 40 $/mes [T] | Web + extensión | — | [T] |
| **LazyApply** y otros auto-apply | Envío masivo automático | LinkedIn/Indeed sobre todo | — | — | Bots | **Envía** | — | Suscripción | Extensión | Reseñas Trustpilot: reembolsos, formularios atascados, menos envíos de los prometidos [U, varios usuarios] | [U] |
| **JobFill.ai, Jobfillr, JobWizard** | Extensiones de autofill | — | — | — | JobWizard: "Workday, Greenhouse & 500+ job sites" [C] | Rellenan | — | JobFill Pro 3,99 $/mes [C]; Jobfillr sin suscripción [C] | Extensión | — | [C] |
| **Bolsas españolas** (InfoJobs, StudentJob, iAgora, bolsas universitarias/COIE, Fundación Universia) | Canal real de muchas prácticas en España | España (iAgora: internacional) | Empresas publican | Sí (convenios) | No | En plataforma | Parcial | Gratis | Web/apps | Fragmentación; PDFs en webs de facultades | [H] fragmentos indexados |

## 3. Qué hacen bien y qué no (conclusiones de la matriz)

1. **El autocompletado es un commodity.** Hay al menos seis extensiones que lo ofrecen gratis o por 3,99–10 $/mes (Simplify, Glever, JobFill, Jobfillr, GoFillr, JobWizard). Competir aquí con 100–500 € no tiene sentido.
2. **La agregación desde ATS para estudiantes está resuelta en EE. UU.** Simplify publica más de 36 000 ofertas históricas con enlaces al ATS original, y Jobright y HiringCafe hacen algo parecido.
3. **Europa continental y España están mal cubiertas en los datos que se pudieron medir.** En el dataset de Simplify, España aparece en 3 de 7 770 ofertas activas, y ninguna de las 8 empresas españolas de la muestra tiene una oferta activa ([job-coverage-matrix.csv](job-coverage-matrix.csv)).
4. **En Europa el estudiante ya tiene canales B2B** (JobTeaser con 750–800 universidades, Handshake en expansión, bolsas universitarias por convenio). Un nuevo actor B2C compite con herramientas gratuitas que la universidad ya paga.
5. **Nadie de los observados ofrece de forma verificable** filtros de elegibilidad europeos útiles: si la práctica es obligatoria (Pflichtpraktikum o curricular con convenio), si basta la residencia UE, idioma de trabajo real o fechas de convocatoria de los graduate programs.
6. **"Solicitar con un clic a todas" no es viable de forma sostenible.** Workday exige una cuenta por empleador, LinkedIn prohíbe la automatización y las herramientas de auto-apply acumulan quejas.

## 4. Funcionalidades anunciadas que no se pudieron comprobar

- Stag-io: cobertura "worldwide", 6 idiomas y la prioridad de fuentes.
- Glever: "500,000+ jobs" y los envíos de "Apply For Me".
- HiringCafe: número actual de ofertas y empresas, y calidad en Europa.
- Jobright: precios, autofill en "thousands of ATS" y auto-apply.
- Simplify: lista oficial de ATS soportados y precisión en Workday.
- JobTeaser y Handshake: número de ofertas de ingeniería en España.
