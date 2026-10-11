# Fuentes y evidencias

Todas las consultas se hicieron el **2026-10-11** (UTC) salvo que se indique otra fecha.

## Cómo se obtuvo cada evidencia

| Canal | Qué permitió | Limitación |
|---|---|---|
| `WebSearch` (buscador con resumen) | Ver títulos, URLs y fragmentos indexados de páginas oficiales, reseñas y documentación | No es una visita a la página: el resumen lo genera un modelo y puede omitir o simplificar. Se citan solo afirmaciones que aparecen en el fragmento atribuido a la URL. |
| `curl` a `raw.githubusercontent.com` y `git ls-remote` | Descargar datasets y README públicos de GitHub y fijar el commit | Solo GitHub y registros de paquetes eran accesibles. |
| Acceso HTTP directo a webs de competidores y portales de empleo | **Bloqueado**: `curl` devuelve `CONNECT tunnel failed, response 403`; `WebFetch` devuelve `getaddrinfo ENOTFOUND` para todos los dominios probados (job-search.app, jobsfinder.aievdy.com, nxt-role.com, stag-io.com, simplify.jobs, boards-api.greenhouse.io, api.lever.co, api.smartrecruiters.com, *.myworkdayjobs.com). | Es una restricción del entorno de investigación (política de red), **no** prueba de que esos sitios estén caídos. |

## Datasets descargados (verificables)

| Dataset | URL | Commit | Tamaño | Registros |
|---|---|---|---|---|
| Simplify Summer 2026 Internships | https://raw.githubusercontent.com/SimplifyJobs/Summer2026-Internships/dev/.github/scripts/listings.json | `1b0b176d1d5b7c1c84d0e8c02b9332b6b35e32e1` | 12 825 853 B (md5 `fbe768c8…`) | 17 060 (4 651 activas) |
| Simplify New Grad Positions | https://raw.githubusercontent.com/SimplifyJobs/New-Grad-Positions/dev/.github/scripts/listings.json | `edad37e4c36e807d45bd82f2e563cfcfdaca4291` | 13 366 860 B (md5 `3fe26d2d…`) | 19 565 (3 119 activas) |
| Simplify Summer 2027 Internships | https://raw.githubusercontent.com/SimplifyJobs/Summer2027-Internships/dev/.github/scripts/listings.json | `1b0b176…` (mismo commit que 2026: es el mismo repositorio) | idéntico | — |
| european-tech-internships-2026 (README) | https://raw.githubusercontent.com/LorenzoLaCorte/european-tech-internships-2026/main/README.md | rama `main` | 10 347 B | 60 enlaces, todos a linkedin.com/jobs; sección de internships vacía |
| bundesAPI/jobsuche-api (doc. comunitaria) | https://raw.githubusercontent.com/bundesAPI/jobsuche-api/main/README.md y `openapi.yaml` | rama `main` | — | — |
| GoFillr (repositorio público) | https://raw.githubusercontent.com/Jamalfox85/application-autofiller/main/README.md | rama `main` | — | — |

Los JSON no se incluyen en el repositorio por tamaño; `research/scripts/simplify_coverage.py` reproduce todas las cifras a partir de ellos.

## Competidores

| Producto | URL(s) | Tipo de fuente | Qué respalda |
|---|---|---|---|
| Job Finder | https://www.job-search.app/ | Intento directo (ENOTFOUND) + 2 búsquedas sin resultados del dominio | No se pudo confirmar existencia ni funciones |
| JobsFinder | https://jobsfinder.aievdy.com/ | Intento directo (ENOTFOUND) + búsqueda de "aievdy" sin resultados | Ídem |
| NxtRole | https://www.nxt-role.com/ | Intento directo + búsqueda exacta sin resultados. Productos con nombre parecido: https://www.nxtroleus.com/ , https://nxtrole.org/ | Ídem; posibles homónimos |
| Stag-io | https://stag-io.com/ ; https://stag-io.vercel.app/ | Fragmento del buscador de la home | Declaraciones comerciales: agregador de prácticas, 6 idiomas, prioriza páginas corporativas, sin registro ni CV |
| Glever | https://glever.co/ ; https://glever.co/jobs ; https://glever.co/blog/best-ai-job-application-tools ; https://glever.co/blog/apply-for-me ; https://apps.apple.com/ng/app/glever-job-autofill/id6795268915 | Fragmentos de web oficial y App Store | Autofill en Greenhouse, Lever, Ashby, Workable, Rippling; "500,000+ jobs"; Premium 10 $/mes; "Apply For Me" hasta 200/mes |
| GoFillr | https://github.com/Jamalfox85/application-autofiller (README y PR #112) | Código público | Extensión Chrome Vue+Supabase; planes ExtensionPay `pro-monthly` 5,99 $/mes y `pro-yearly` 49 $/año |
| Simplify | Reseñas: https://www.wobo.ai/blog/simplify-review/ , https://jobhire.ai/blog/simplify-jobs-review , https://resumeoptimizerpro.com/blog/simplify-alternative ; datasets arriba | Terceros + datos propios publicados | Copilot gratis; Simplify+ 19,99 $/sem, 39,99 $/mes, 89,99 $/trim. (según reseña que cita su centro de ayuda); ATS declarados |
| HiringCafe | https://hiringcafe.com/ ; https://www.dreamworkhq.com/blog/hiring-cafe-review ; https://apify.com/manojachari/hiring-cafe-scraper | Fragmento de home (antiguo) + reseñas | "4,199,352 jobs · 144,341 companies" (contador de la home en un snapshot antiguo); indexa páginas de empleo de empresas |
| Jobright | https://jobright.ai/intern-jobs ; https://atsverification.com/blog/jobright-ai-review-2026/ ; https://scoutify.com/blog/jobright-review | Web oficial + reseñas | Hub de prácticas (~79 687 ofertas mostradas); precios 29–59 $/mes no confirmados (la página /pricing devolvía 404 el 2026-10-09 según un tercero) |
| JobTeaser | https://www.jobteaser.com/en/corporate/about-us ; https://www.getapp.com/all-software/a/jobteaser/ ; https://www.jobteaser.com/de/companies/bmw-group/job-offers | Web oficial + GetApp | 800 centros y +5 M estudiantes (2023, oficial); 750 centros, 4 M jóvenes, 80 000 empresas (GetApp 2026); 487 ofertas BMW |
| Handshake | https://joinhandshake.co.uk/employers ; https://joinhandshake.co.uk/network-trends ; https://www.pin.com/blog/handshake-pricing/ | Oficial + terceros | +1 M estudiantes verificados en UK/Europa, 13+ mercados; plan empleador Basic gratis; TES mediana ~29 835 $/año (estimación de terceros) |
| Welcome to the Jungle (ex-Otta) | https://employers.welcometothejungle.com/companies/welcome-to-the-jungle ; https://press.welcometothejungle.com/news/a-message-from-our-cofounder-jeremy | Oficial | Adquirió Otta en enero de 2024 y unificó marca; ERE en Francia en mayo de 2025 |
| Wellfound | https://www.betterteam.com/wellfound ; https://www.hireinsouth.com/post/wellfound-pricing | Terceros | Gratis para candidatos; precios empleador contradictorios |
| LinkedIn | https://www.linkedin.com/help/linkedin/answer/90586 | Oficial | Prohíbe software de terceros y extensiones que automaticen actividad |
| Indeed | https://jobspipe.dev/blog/indeed-publisher-api | Tercero (con interés comercial) | Publisher API retirada (2023/2024 según fuente); APIs actuales solo para partners y en sentido empleador→Indeed |
| EURES | https://eures.europa.eu/eures-services/help-and-support_en | Oficial | Base de vacantes alimentada a diario por los servicios públicos de empleo; no se halló API oficial |
| ErasmusIntern | https://ecamaastricht.org/blueandyellow-knowyourunion/erasmusintern ; https://digital-skills-jobs.europa.eu/en/opportunities/training/erasmus-intern-traineeships-database | Terceros (ESN) | "más de 1300" oportunidades (sin fecha); gestionado por ESN con cofinanciación UE |
| Gradcracker | https://www.gradcracker.com/hub/441/perenco/search/engineering-work-placements-internships (y otros hubs) | Oficial | Portal UK especializado en ingeniería con hubs por empleador |
| Bright Network | https://brightnetwork.co.uk/community-guidelines ; https://www.timeshighereducation.com/student/student-services/bright-network | Oficial + tercero | Orientado a UK; 800 000+ miembros (anuncio 2023) |
| Teal / Huntr | https://jobshinobi.com/compare/teal-job-tracker-vs-huntr ; https://toolradar.com/tools/teal-hq/pricing | Terceros | Teal+ 29 $/mes; Huntr Pro 40 $/mes; trackers con extensión |
| LazyApply | https://uk.trustpilot.com/review/lazyapply.com (y dominios regionales) | Opiniones de usuarios | Quejas sobre reembolsos, fallos de formularios, menos envíos de los anunciados |
| JobFill.ai / Jobfillr / JobWizard | https://jobfill.ai/ ; https://www.jobfillr.com/ ; https://chromewebstore.google.com/detail/jobwizard-ai-autofill-for/kbhgdbfkbgkokgkkdhnnlmkhnokjmfib | Oficial | Autofill 3,99 $/mes (JobFill), gratis (Jobfillr), "Workday, Greenhouse & 500+ job sites" (JobWizard) |
| Adzuna API | https://jobspipe.dev/blog/adzuna-api ; https://glama.ai/mcp/servers/@folathecoder/adzuna-job-search-mcp | Terceros | ~1 000 llamadas/mes gratis; ~16 países; descripciones truncadas |
| Bundesagentur für Arbeit | https://github.com/bundesAPI/jobsuche-api | Documentación comunitaria | Sin API oficial; endpoint con `X-API-Key: jobboerse-jobsuche`; `angebotsart=34` = Praktikum/Trainee |

## ATS

| ATS | URL | Qué respalda |
|---|---|---|
| Greenhouse | https://developers.greenhouse.io/job-board ; https://support.greenhouse.io/hc/en-us/articles/10568627186203 | GET públicos; POST de candidatura con API key del cliente |
| Lever | https://hire.sandbox.lever.co/developer/documentation ; https://rubydoc.info/gems/lever_postings ; https://100hires.com/lever-api.html | Postings API pública; apply requiere clave configurada por Lever; límite 2 POST/s (tercero) |
| SmartRecruiters | https://developers.smartrecruiters.com/docs/posting-api ; https://developers.smartrecruiters.com/docs/get-job-postings | Posting API documentada (la doc. menciona API key; terceros dicen que el feed público no requiere clave para clientes que lo activan) |
| Workday | https://apify.com/khadinakbar/workday-jobs-scraper ; https://dev.to/devil_scrapes/workday-jobs-scraper-how-to-pull-every-posting-from-any-workday-career-site-5gm9 ; https://jobwizard.ai/blog/why-workday-creates-a-new-account-for-every-company | Endpoint `/wday/cxs/...` usado por scrapers; sin documentación oficial; un tenant y una cuenta por empleador |
| SAP SuccessFactors | https://learning.sap.com/courses/sap-successfactors-recruiting-candidate-experience-administration/posting-jobs ; https://userapps.support.sap.com/sap/support/knowledge/en/2361686 | Distribución por feeds XML de Career Site Builder |
| Oracle Recruiting Cloud | https://docs.oracle.com/en/cloud/saas/human-resources/24d/farws/api-recruiting-job-applications.html ; https://docs.oracle.com/en/cloud/saas/human-resources/24c/farws/api-job-site-posted-jobs.html | Endpoints CE "only for Oracle internal use"; posted jobs solo para partners de Marketplace |
| Ashby | https://jobspipe.dev/sources/ashby.md ; https://providers.apievangelist.com/providers/ashby-hq/ | Posting API pública por organización (terceros) |
| Taleo | https://redresscompliance.com/oracle-taleo-licensing-guide.html ; https://www.bankofengland.co.uk/careers/new-recruitment-and-onboarding-system | Sin fecha oficial de fin; clientes migrando a ORC |

## Empresas (portales observados en resultados de búsqueda)

| Empresa | URL | Qué respalda |
|---|---|---|
| Siemens | https://jobs.siemens.com/en_US/externaljobs/JobDetail/508667 ; https://jobs.siemens.com/es_ES/externaljobs/JobDetail/498819 ; https://www.siemens.com/en-gb/company/jobs/early-careers/ | Portal y fichas de prácticas |
| Safran | https://www.safran-group.com/jobs/france/colombes/stage-monteur-hf-180092 (y otras fichas 'stage') | Portal propio con prácticas |
| Volvo Group | https://www.volvogroup.com/en/careers/students-and-graduates.html ; https://www.volvogroup.com/en/careers/graduate-programs.html | Programas, thesis en portal, 100+ graduates/año |
| Volkswagen | https://www.volkswagen-groupservices.com/en/career/beginners ; https://www.workingstudentjobs.de/jobs/volkswagen-group-praktikum-konzernstrategie-strategische-w-m-724f6471 | Prácticas, requisitos |
| BMW | https://www.iec.lmu.de/en/latest-news/news-overview/news/exciting-opportunity-internship-in-business-model-innovation-at-bmw.html ; https://www.jobteaser.com/de/companies/bmw-group/job-offers | Enlace a jobs.bmwgroup.com; 487 ofertas en JobTeaser |
| Mercedes-Benz | https://www.stepstone.de/work/praktikumsstellen/in-sindelfingen ; https://www.iagora.com/work/en/internships/in-automotive?offset=500 | Pflichtpraktikum y documentos |
| Schneider Electric | https://www.se.com/us/en/about-us/careers/students.jsp ; https://www.se.com/ca/careers | Programas de estudiantes |
| Iberdrola | https://industriales.usal.es/wp-content/uploads/sites/82/2025/12/IBERDROLA-1.pdf ; https://www.iberdrola.com/sala-comunicacion/noticias/detalle/su-majestad-rey-entrega-becas-iberdrola-impulsan-talento-empleabilidad | Prácticas 900 €/mes, B2/C1; becas |
| Repsol | https://www.fundacionuniversia.net/content/dam/fundacionuniversia/pdf/Sumando%20Energía%20VI_ACCESIBLE.pdf | Becas Sumando Energía |
| Indra | https://www.indragroup.com/cms-content/2026/03/260303-NP-Indra-Group-Talento-Mobile-World-Congress.pdf ; https://indracompany.com/sites/default/files/np_programa_de_jovenes_profesionales_smart_start.pdf | Programas jóvenes |
| Gestamp | https://www.studentjob.es/ofertas/5449259-students-for-internships-en-madrid ; https://www.infojobs.net/ofertas-trabajo/ingenieros-tecnicos/gestamp | Ofertas en terceros |
| SEAT | https://www.infojobs.net/ofertas-trabajo/empresa:seat-(programa-de-pr%C3%A1cticas) | 0 ofertas en ese momento |
| CAF / Técnicas Reunidas | https://satbayev.university/en/news/satbayev-university-and-tcnicas-reunidas-provide-new-internship-opportunities-in-spain-for-future-engineers | Programas puntuales |

## Mercado, demanda y regulación

| Tema | URL | Qué respalda |
|---|---|---|
| Fricción Workday (opiniones) | https://www.teamblind.com/post/hate-making-new-workday-accounts-whkn2zaw ; https://www.teamblind.com/post/hate-applying-jobs-on-workday-tsu2ucer ; https://www.fishbowlapp.com/post/why-do-we-still-have-to-create-a-workday-account-for-each-employer-every-time-we-applyworkday ; https://nelson.cloud/i-hate-workday | Quejas repetidas: cuenta por empresa, re-entrada de datos tras subir CV |
| Erasmus+ 2024 | https://erasmus-plus.ec.europa.eu/nl/news/almost-15-million-people-went-on-an-erasmus-mobility-in-2024-according-to-latest-report | ~1,5 M participantes en movilidad en 2024 (todas las modalidades; sin desglose de traineeships) |
| Prácticas en España | https://www.laboral-social.com/node/1402 ; reglamentos universitarios (UCO, UAM) | RD 592/2014: curriculares vs extracurriculares; requieren convenio universidad-empresa |
| Estipendios UE | https://www.internshipabroad.eu/blog/eu-internship-stipends-by-country | 500–700 €/mes habituales en prácticas extracurriculares (estimación de tercero) |
| Uso de IA en búsqueda de empleo | https://vendordirectory.shrm.org/company/851023/news/3648331/ihire-survey-finds-younger-job-seekers-lean-on-ai-but-fear-it-more-than-boomers-gen-xers | 52,3 % de Gen Z usó herramientas de IA (EE. UU., sin datos de pago) |
| AI Act, Anexo III | https://artificialintelligenceact.eu/what-the-act-means-for-staffing-businesses/ ; https://minthcm.org/ai-act-deadline-extension-confirmed-new-timeline-for-hr-recruitment-systems/ | Reclutamiento (incl. anuncios dirigidos) = alto riesgo; aplazamiento a 2-12-2027 según fuentes secundarias, pendiente de confirmar en el DOUE |
