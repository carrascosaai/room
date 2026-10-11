# Fase 2: investigación de mercado — informe ejecutivo

Fecha: 2026-10-11 · Ámbito: España y Europa · Público: estudiantes y recién graduados de ingeniería mecánica, industrial, eléctrica, electrónica, aeroespacial y afines.

## Decisión: **PIVOT**, y NO-GO como plataforma

| Propuesta | Decisión | Motivo principal |
|---|---|---|
| Plataforma global de candidatura automática (idea original) | **NO-GO** (se confirma la fase 1) | Autofill commodity; envío automático inviable |
| "Radar curado de prácticas en industriales europeas" (hipótesis de la fase 1) | **NO-GO como startup** | Alemania y Francia ya tienen agregadores o redes gratuitas y densas (workingstudentjobs.de, JobTeaser en 400 escuelas francesas, Wizbii…). JobTeaser es gratis para universidades. El techo de ingresos B2C en toda la UE es de unos 21 k€/año (escenario base). |
| **Pivot:** servicio de nicho de **elegibilidad + calendario de convocatorias** para estudiantes de ingeniería **residentes en España** que quieren prácticas o graduate programs en DE/FR/NL/IT, apoyado en los canales existentes | **Experimento barato (≤50 €, 4 semanas) con criterios de abandono** | Es la única combinación de problemas que no se observó resuelta en ningún competidor. **No hay evidencia de demanda ni de pago.** |

Si el experimento no supera sus umbrales (abajo), la recomendación pasa a **NO-GO completo**.

## Qué se hizo

1. **Auditoría de la fase 1** ([01_auditoria_fase1.md](01_auditoria_fase1.md)):
   - 5 afirmaciones confirmadas con fuentes primarias.
   - **Se corrigieron 2 errores:**
     - "Hardware" de Simplify no es ingeniería industrial: solo 19 títulos industriales activos en Europa.
     - La vía B2B con universidades era optimista: JobTeaser es gratis para centros.
   - **Se detectó 1 omisión grave:** no se habían buscado agregadores nacionales como workingstudentjobs.de.
2. **Mercado objetivo y comportamiento** ([02](02_mercado_objetivo_y_comportamiento.md)): 4 segmentos, canales de acceso por país y los pocos datos existentes sobre cómo se buscan prácticas.
3. **Competidores** ([03](03_competidores.md), [data/competitors.csv](data/competitors.csv)): 18 entradas (algunas agrupan varias plataformas) y 7 actores nuevos frente a la fase 1.
4. **Mapa de funcionalidades** ([04](04_mapa_funcionalidades.md), [data/feature_map.csv](data/feature_map.csv)).
5. **57 empresas industriales** (16 ES, 15 DE, 8 FR, 6 IT, 5 NL, 7 otras) y **125 ofertas únicas** procedentes de 159 URLs (21 % redundantes), 93 relevantes ([05](05_empresas_y_ofertas.md), [data/companies.csv](data/companies.csv), [data/offers.csv](data/offers.csv)).
6. **TAM/SAM/SOM** reproducible ([06](06_tam_sam_som.md), `scripts/tam_sam_som.py`).
7. **10 problemas** con evidencia ([07](07_top10_problemas.md)) e **incertidumbres** ([08](08_incertidumbres.md)).
8. **Registro de fuentes** con URL, fecha, método y limitación: [data/sources.csv](data/sources.csv) (53 fuentes) y las URL de cada oferta en `offers.csv`.

## Qué se pudo verificar y qué no

**Verificado** (fuente primaria o dato descargado):
- Datos de Eurostat y del Eurobarómetro 2023 (78 % de jóvenes con prácticas; 21 % de ellos en otro país UE).
- Estudiantes en España (más de 1,8 M).
- Ámbito declarado de Simplify (EE. UU./Canadá/UK) y re-análisis de sus datos.
- Modelo de JobTeaser (gratis para centros).
- Fuentes y volumen declarados por workingstudentjobs.de.
- Precios para empresas de iAgora, EUInternships y Talentoteca.
- 22 ofertas con URL de portal oficial.

**No verificado:**
- **Ninguna web se pudo abrir.** El entorno bloquea el acceso HTTP salvo a GitHub. Las 125 ofertas son "URL indexada por buscador" y el estado de 62 de 93 es desconocido.
- Los filtros reales de los competidores (40 % de celdas NV en el mapa).
- El tiempo que dedican los estudiantes a buscar (no existe dato europeo).
- La disposición a pagar.

## Resultados clave

1. **Cubierto por país, no entre países.**
   - Alemania: workingstudentjobs.de dice agregar 26.884 Praktika y Werkstudent desde webs corporativas, ATS y LinkedIn, con alertas, y es gratis. 22 de las 125 ofertas de la muestra se vieron allí.
   - Francia: JobTeaser, Wizbii, engagement-jeunes. Italia: AlmaLaurea. Países Bajos: Magnet.me. España: bolsas universitarias, InfoJobs, Talentoteca.
2. **Nadie de lo observado estructura la elegibilidad para un residente UE.** En 93 ofertas relevantes aparecen, como mínimo:
   - 11 solo para prácticas obligatorias.
   - 11 con idioma exigido (C1 en algún caso).
   - 4 con matrícula exigida durante toda la práctica.
   - 2 con control de exportaciones o ciudadanía.
3. **Casi nunca hay fecha límite:** 7 de 93. Los graduate programs tienen ventanas cortas (Iberdrola: 2-29 de marzo de 2026).
4. **España es distinta:** 5 de las 12 ofertas relevantes de empresas españolas se encontraron como PDF o en bolsas universitarias y sectoriales. Las prácticas curriculares pasan por el convenio de la universidad.
5. **El dinero no está en el estudiante.**
   - Todos los competidores son gratis para él. Pagan empresas (23–39 € por oferta; Talentoteca 400 €/año + 12 %) o universidades (Interstride).
   - SOM España a 24 meses, escenario base: unos 5.900 usuarios y unos **2.100 €/año** B2C (supuestos sin fuente, editables).

## ¿Qué oportunidad concreta existe que no esté suficientemente cubierta, para qué usuario y con qué evidencia?

**Oportunidad:** un servicio en español que, para cada práctica o graduate program de ingeniería en grandes industriales de Alemania, Francia, Países Bajos e Italia, responda tres preguntas:
1. **¿Puedo optar?** Obligatoria o voluntaria, encaje con el convenio de mi universidad, matrícula durante toda la práctica, idioma, control de exportaciones o ciudadanía.
2. **¿Cuándo abre y cuándo cierra?** Calendario de convocatorias con aviso previo.
3. **¿Dónde está la oferta oficial?** Enlace a la fuente (portal, workingstudentjobs.de, JobTeaser…), deduplicada.

**Usuario:** estudiante de 3.º/4.º de grado o de máster en Ing. Mecánica, Industrial, Eléctrica, Electrónica o Aeroespacial de una universidad española, residente UE, que quiere prácticas curriculares o extracurriculares, o un graduate program, en otro país europeo. Tamaño estimado:
- 21–32 mil estudiantes en España (stock).
- 49–69 mil al año en la UE (flujo).

Son estimaciones con supuestos explícitos.

**Evidencia a favor:**
- La elegibilidad aparece en las ofertas (ejemplos de Continental, Bosch, Mercedes, ASML, Airbus, Hitachi y Schaeffler) y ningún competidor observado la filtra. Interstride solo filtra visado, que no aplica a ciudadanos UE.
- 7 de 93 ofertas con fecha límite publicada.
- Fragmentación en 59 dominios y canales nacionales distintos.
- La movilidad en prácticas pasó del 9 % al 21 % entre 2013 y 2023.

**Evidencia en contra o ausente:**
- Ninguna medición de cuánto le duele esto al usuario ni de si pagaría.
- El segmento es pequeño.
- Es un producto de información fácil de copiar, y los agregadores nacionales podrían añadir estos filtros.
- Los filtros de workingstudentjobs.de, JobTeaser e iAgora no se pudieron comprobar.

**Conclusión honesta:** existe un **hueco de producto pequeño y demostrable en la oferta**, pero **no una oportunidad comercial defendible demostrada**. Solo se justifica un experimento de coste casi nulo.

## Experimento de pivot (4 semanas, ≤50 €)

1. **Semana 1 — cerrar las incertidumbres 3–5** de [08](08_incertidumbres.md):
   - Abrir workingstudentjobs.de, JobTeaser, iAgora, EUInternships, Stag-io y HiringCafe, y rellenar el mapa de funcionalidades.
   - Ejecutar `research/scripts/ats_probe.py`.
   - Abrir las 93 URL relevantes y marcar su estado.
2. **Semana 2:**
   - Una página (sin código propio: Notion o Google Sheets) con 30 convocatorias reales verificadas de DE/FR/NL/IT, cada una con elegibilidad, plazo y enlace oficial.
   - Una guía de una página: "Pflichtpraktikum y prácticas curriculares desde una universidad española".
   - Pedir a 2 ORI o COIE que confirmen el encaje con el convenio.
3. **Semanas 2–4:**
   - Difundir en 5 comunidades de escuelas de ingeniería.
   - 15 entrevistas y diario de búsqueda.
   - Fake door con preventa de 9–12 €.
   - 5 conversaciones con ORI/COIE.
4. **Umbrales para seguir** (cualquier incumplimiento supone NO-GO):
   - ≥150 registros cualificados.
   - ≥40 % de entrevistados que dicen haber perdido o descartado una oferta por elegibilidad o plazo.
   - ≥5 preventas **o** 1 acuerdo escrito con una ORI/COIE.
   - Los competidores no ofrecen ya estos filtros.

## Reproducir

```bash
python3 research/phase2_market/scripts/build_offers.py      # offers_raw.tsv -> offers.csv (dedup + clasificación)
python3 research/phase2_market/scripts/build_companies.py   # companies.csv
python3 research/phase2_market/scripts/tam_sam_som.py > research/phase2_market/data/tam_results.csv
```

Leyenda usada en todos los documentos: **[H]** verificado · **[S]** fuente secundaria · **[C]** declaración comercial · **[T]** terceros · **[E]** estimación · **[Hip]** hipótesis · **NV** no verificado.
