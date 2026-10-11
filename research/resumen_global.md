# Resumen global de la investigación

Fecha: 2026-10-11. Este documento resume las tres rondas de trabajo. El detalle, las fuentes y los datos están en los capítulos siguientes y en los anexos.

## Qué se ha hecho

| Ronda | Contenido | Estado |
|---|---|---|
| Fase 1 | Estudio de competidores, muestra de 30 empresas, análisis de sistemas de contratación (ATS), hueco de mercado, modelo de negocio, decisión GO/NO-GO | Terminada |
| Fase 2 – Mercado | Auditoría de la fase 1, 57 empresas y 125 ofertas deduplicadas, 18 competidores, TAM/SAM/SOM, 10 problemas, incertidumbres | Terminada |
| Fase 2 – Clientes | Segmentación, evidencia pública, guion de entrevistas, formulario, conceptos A/B, experimento de precios, criterios de decisión | **Preparada, no ejecutada** (no se ha entrevistado a nadie) |
| Fase 2 – Modelo de negocio | Modelos A–G, precios de competidores, hoja de cálculo con escenarios | Terminada (escenarios sin validar) |
| Fase 2 – Técnica | Fuentes de ofertas, APIs, 30 empresas, costes, elegibilidad, legal, arquitectura | **Medición en vivo pendiente** |
| Fase 2 – Captación | Canales, plan de 30 días, presupuesto, mensajes, métricas | Preparada, no ejecutada |

**Limitación de todo el trabajo:** el entorno de investigación no permitía abrir páginas web (solo el buscador y GitHub). Las ofertas y los competidores se vieron a través de resultados de búsqueda, sin abrir las páginas.

## Decisiones

| Propuesta | Decisión |
|---|---|
| Plataforma global para solicitar con un clic | **NO-GO**. El autocompletado ya existe gratis o muy barato; el envío automático no es viable (LinkedIn lo prohíbe, Workday exige una cuenta por empresa). |
| Radar de prácticas en empresas industriales europeas | **NO-GO como startup.** Alemania y Francia ya tienen agregadores o redes gratuitas (workingstudentjobs.de, JobTeaser) y el techo de ingresos de los estudiantes es muy bajo. |
| Servicio de nicho: elegibilidad y calendario de convocatorias para estudiantes de ingeniería en España que buscan prácticas en Europa | **PIVOT a un experimento barato** (≤50 €, 4 semanas) con criterios de abandono |

## Hallazgos principales

1. **El agregador líder para estudiantes (Simplify) no sirve en Europa continental.** En sus listas públicas, el 93,9 % de las prácticas activas son de EE. UU./Canadá y hay 2 en España. Solo 19 títulos de ingeniería industrial activos en Europa.
2. **Cada país tiene su propio canal:** workingstudentjobs.de (DE, declara 26.884 ofertas), JobTeaser y Wizbii (FR), AlmaLaurea (IT), Magnet.me (NL), bolsas universitarias e InfoJobs (ES). Nadie los une en español.
3. **Requisitos que excluyen al candidato** aparecen en las ofertas y nadie los filtra: solo prácticas obligatorias (11 de 93), idioma (11), matrícula durante toda la práctica (4), control de exportaciones o ciudadanía (2).
4. **Fechas límite:** solo 7 de 93 ofertas relevantes las publican.
5. **Duplicados:** el 21 % de las URLs observadas repetían la misma oferta en otro idioma o plataforma.
6. **En España**, 5 de las 12 ofertas relevantes de empresas españolas estaban en PDFs o bolsas universitarias, no en webs corporativas.
7. **Quien paga en este mercado son las empresas** (20–49 € por oferta en iAgora, EUInternships e InfoJobs; 1.449 € en StepStone). Los estudiantes europeos no pagan por estas plataformas.
8. **Mantener los datos es caro en tiempo:** ninguna de las 30 grandes industriales tiene a nivel de grupo un sistema de contratación con API pública documentada. Mantener 30 empresas costaría unas 27–59 horas al mes del fundador (estimación).

## Tamaño de mercado (estimación con supuestos explícitos)

| Métrica | Valor base |
|---|---|
| Estudiantes de ingeniería, fabricación y construcción en la UE | ~2,76 millones |
| Estudiantes de las familias objetivo que hacen prácticas en otro país de la UE | ~59.000 al año |
| Usuarios alcanzables en España en 24 meses | ~5.900 |
| Ingresos de estudiantes en España a 24 meses | ~2.100 €/año |
| Techo de ingresos de estudiantes en toda la UE | ~21.000 €/año |

## Qué probar primero (menos de 1.000 € y un fundador)

**Modelo:** empresas industriales medianas pagan 30–49 € por difundir sus prácticas a una audiencia de estudiantes de ingeniería; el estudiante no paga. Todo a mano, sin código.

**Resultado mínimo a los 60 días para seguir:**
- al menos 3 empresas que pagan, o una que paga 300 € o más;
- al menos 200 estudiantes activos;
- al menos 10 candidaturas confirmadas por las empresas;
- no más de 30 horas al mes manteniendo las ofertas.

## Qué falta para decidir

1. **15 entrevistas** con el guion preparado y el experimento de precios.
2. **Medición en vivo de las 30 empresas** desde un equipo con internet normal.
3. **Contacto con 30 pymes** para el modelo de pago por empresas.
4. **Comprobar los filtros reales** de workingstudentjobs.de, JobTeaser e iAgora.

Las cuatro tareas caben en el plan de captación de 30 días.
