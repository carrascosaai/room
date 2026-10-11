# Competidores directos e indirectos

Fecha: 2026-10-11. La tabla completa (16 campos por competidor, URL y nivel de evidencia) está en [data/competitors.csv](data/competitors.csv). Ninguna web se pudo abrir directamente: todo procede de fragmentos indexados por el buscador y de datasets públicos de GitHub.

## Tabla comparativa (resumen)

| Competidor | Tipo | Países | Nº de ofertas (solo si hay fuente) | Elegibilidad | Precio / modelo | Qué deja sin resolver |
|---|---|---|---|---|---|---|
| **workingstudentjobs.de** | Agregador de prácticas y Werkstudent | Alemania | 26.884 / 6.631 empresas [autodeclarado]; 22 de las 125 ofertas de la muestra vistas allí | "Pflichtpraktikum" en títulos; filtro NV | Gratis estudiante; ingresos NV | Solo Alemania; sin orientación para extranjeros |
| **JobTeaser** | Red universitaria + empleadores | Europa (fuerte en FR; UAM en ES; TU/e en NL) | 750–800 centros [C]; 4.190 ofertas de prácticas de máster en FR en el 1.er semestre de 2026 [S] | NV | Gratis para centros y estudiantes; pagan empresas; módulos premium para servicios de empleo | Depende de la universidad; ofertas duplicadas por idioma (ASML ×6) [H] |
| **iAgora** | Marketplace internacional | 82 países | "83.544 jobs and internships in the EU" [título de página] | NV | Empresas desde 23 €/oferta | Vigencia y calidad variables |
| **EUInternships** | Bolsa paneuropea (startup) | +30 países | NV | NV | Empresas 20–39 € por 30 días | Escala NV |
| **Stag-io** | Agregador de prácticas | "Worldwide", 6 idiomas | NV | NV | Sin registro | Sin métricas ni operador conocido |
| **Simplify** | Agregador + autofill + tracker | EE. UU., Canadá, UK (declarado) | 36.625 históricas; España 3 activas [H] | Campo de patrocinio vacío en 99,6 % [H] | Copilot gratis; Simplify+ 39,99 $/mes [T] | Irrelevante para ingeniería industrial en Europa continental [H] |
| **HiringCafe** | Buscador global desde páginas corporativas | Global | "Millones", >100.000 empresas [T] | Visado/idiomas según reseñas (contradictorio) | Gratis | No centrado en prácticas |
| **Graduateland** | Crawler + portales universitarios | Europa | "150.000 jobs and internships" [C, fecha desconocida] | NV | Gratis estudiante | Escala actual NV |
| **LinkedIn Jobs** | Generalista | Global | NV | No | Freemium | Prohíbe automatizar; ruido |
| **Bolsas universitarias** (ICARO, UPC, COIE, AlmaLaurea, Praktikantenamt) | Institucional | Por universidad | NV | Gestionan el convenio | Gratis | Silos; poca oferta internacional; PDFs |
| **Talentoteca (FUE)** | Prácticas remuneradas en España | España | NV | Límite de edad (guía) | Empresa: 400 €/año + 12 % de la ayuda | Internacional |
| **Generalistas** (InfoJobs, Indeed, StepStone, Jooble) | Bolsas | ES/DE/global | InfoJobs: "305 ofertas de programa de prácticas" [H, indexado] | No | Pagan empresas | No específicas |
| **Plataformas nacionales de estudiantes** (Wizbii, engagement-jeunes, CIDJ, Magnet.me, StudentJob, flexa, fluidjobs, studyflix, jobjump) | Agregadores/bolsas por país | FR, NL, ES, SE, DE | NV | NV | Gratis estudiante | Una por país |
| **Públicos** (EURES, Bundesagentur, France Travail) | Oficiales | UE/país | Bundesagentur: filtro Praktikum/Trainee | No | Gratis | No pensados para estudiantes extranjeros |
| **Movilidad** (IAESTE, Erasmus+, ErasmusIntern, Eurodesk) | Programas | UE / 80+ países | IAESTE ES: ~60 estudiantes/año [C] | Del programa | Gratis/financiado | Volumen bajo |
| **Interstride** | Licencia universitaria | 11 países con filtro de patrocinio, incl. ES, DE, FR, IT | NV | **Visado** (para no-UE) | Paga la universidad | No cubre la elegibilidad UE (obligatoria/convenio) |
| **Handshake / Bright Network / Gradcracker** | Redes de estudiantes | EE. UU./UK | +1 M estudiantes UK/EU (Handshake) [C] | NV | Gratis estudiante | Europa continental |
| **Glever / Jobright / Teal / extensiones** | Herramientas IA/autofill | Global | Glever "500.000+" [C] | No | Gratis–40 $/mes | Descubrimiento europeo |

Nuevos actores encontrados en la fase 2: **workingstudentjobs.de**, **EUInternships**, **Interstride** (filtro de patrocinio desde nov-2025), **Graduateland**, **Talentoteca**, **jobrise.io** (herramientas de IA gratuitas con anuncios; no es un agregador de prácticas) y **nextEUjob** (newsletter de empleo en instituciones UE, adyacente). No se encontró ninguna startup lanzada en 2026 específica de prácticas de ingeniería en Europa (prueba por ausencia).

## Análisis

### Lo que ya está cubierto
- **Alemania**: un agregador gratuito y especializado (workingstudentjobs.de), además de StepStone, studyflix, jobjump y la Bundesagentur. En la muestra, 39 de 93 ofertas relevantes son de empresas alemanas y la mayoría se encontró en agregadores.
- **Francia**: JobTeaser integrado en 400 escuelas, Wizbii, engagement-jeunes, Welcome to the Jungle (páginas de *stage*), CIDJ y France Travail.
- **Italia**: AlmaLaurea como infraestructura nacional de prácticas.
- **Países Bajos**: Magnet.me y JobTeaser en universidades técnicas.
- **Autofill y tracking**: commodity (fase 1).

### Lo que no está bien cubierto (con evidencia)
1. **Vista transfronteriza en español** para un estudiante en España que busca prácticas en DE/FR/NL/IT. Cada ecosistema es nacional y en su idioma. [H: fragmentación observada]
2. **Elegibilidad estructurada para residentes UE**: obligatoria o voluntaria, convenio con su universidad, matrícula durante toda la práctica (ASML), control de exportaciones (Airbus), idioma C1 (Schaeffler). Solo Interstride filtra el visado, y eso no aplica a ciudadanos UE. [H en ofertas; filtros de competidores NV]
3. **Fechas límite**: solo 7 de 93 ofertas relevantes publicaban plazo; el resto "mientras esté online". [H en la muestra]
4. **Oferta española en PDFs y bolsas universitarias**: no aparece en agregadores. [H en la muestra]

### Lo que NO se ha demostrado
- Que los estudiantes españoles consideren estos huecos lo bastante graves como para cambiar de herramienta o pagar.
- Que workingstudentjobs.de, JobTeaser o iAgora no tengan ya filtros de elegibilidad o idioma: no se pudieron abrir.
