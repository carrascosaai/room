# Investigación: plataforma de prácticas, internships y primer empleo

Investigación de mercado previa a construir una plataforma que centralice prácticas, graduate programs y puestos junior de empresas de todo el mundo. **No contiene código del producto.** La decisión de este informe es no construirlo todavía (ver [go-no-go.md](go-no-go.md)).

> Este directorio está dentro del repositorio `room`, que contiene otro proyecto (un juego de fiesta). El README raíz pertenece a ese proyecto y no se ha modificado. Este archivo hace de README de la investigación.

## Resumen ejecutivo

**Qué se ha investigado**
- 4 plataformas de partida y unos 20 competidores (agregadores, autofill, trackers, redes universitarias, portales públicos).
- 30 empresas industriales: 8 españolas, 14 europeas, 7 estadounidenses y 1 suizo-japonesa.
- 10 ATS y 5 fuentes públicas de ofertas.
- Modelos de precio y cobro.
- Riesgos legales: términos de uso, RGPD, derecho sobre bases de datos y AI Act.

**Qué se ha podido verificar** (hechos con dato descargado o documentación oficial)
- Listas públicas de Simplify (36 625 ofertas, commits fijados):
  - 93,9 % de las prácticas activas están solo en EE. UU./Canadá; 5,9 % en Europa; **2 en España**.
  - El campo de patrocinio vale "Other" en el 99,6 % de las ofertas.
  - Workday es el host del 36,6 % de las prácticas activas.
- En la muestra de 30 empresas, Simplify cubre 16 con al menos una oferta activa:
  - 247 ofertas activas, **31 en Europa (casi todas UK) y 0 en España**.
  - 8 empresas sin ninguna oferta.
  - 15 duplicados.
- Se identificó el ATS de 19 de las 30 empresas: 13 Workday, 1 SmartRecruiters, 1 Oracle, 1 Avature (inferido) y 3 portales propios. Los grandes grupos usan ATS distintos según filial o país.
- APIs y restricciones:
  - Greenhouse y Lever tienen API pública de lectura; para enviar candidaturas hace falta la clave de cada empresa.
  - Las APIs de candidatura de Oracle son internas o solo para partners.
  - LinkedIn prohíbe la automatización.
  - La lista open source europea (EarlyCareersEU) tiene 60 enlaces, todos a LinkedIn.

**Qué no se ha podido verificar**
- El entorno bloqueaba el acceso HTTP directo a webs y APIs (proxy 403 / DNS). No se pudo abrir ningún portal corporativo ni web de competidor.
- Por tanto, faltan:
  - El número de ofertas en los portales oficiales: es el denominador de la cobertura.
  - Los pasos reales de cada formulario.
  - Si cada portal exige cuenta.
  - La cobertura de Stag-io, Glever, HiringCafe, JobTeaser, Handshake, LinkedIn, Indeed, EURES y ErasmusIntern.
  - Los precios en las páginas oficiales.
- Job Finder, JobsFinder y NxtRole no tienen huella pública verificable con esos dominios.
- **No hay ninguna evidencia de disposición a pagar:** no se han hecho ni simulado entrevistas.

**Qué hacen los competidores**
- Simplify, Jobright y HiringCafe agregan ofertas desde ATS (sobre todo en EE. UU.).
- El autofill es gratis o cuesta 3,99–10 $/mes (Simplify, Glever, JobFill, GoFillr).
- El tracking cuesta 29–40 $/mes (Teal, Huntr).
- JobTeaser y Handshake se venden a universidades y empleadores europeos.
- Los auto-apply masivos acumulan quejas de usuarios.
- Detalle en [competitor-matrix.md](competitor-matrix.md).

**Empresas comprobadas realmente**
- 30 en la muestra, con evidencia indirecta (URLs de ofertas reales y fragmentos indexados).
- **0 portales abiertos directamente.**
- El script para completar la medición está listo: `scripts/ats_probe.py`.

**Cobertura medida**
- Solo la de Simplify (listas públicas), en tres métricas separadas:
  - Empresas: 16/30.
  - Ofertas: 247 activas; no se calcula porcentaje porque falta el denominador.
  - Candidatura desde la plataforma: 0, porque redirige al ATS.

**Hueco encontrado (hipótesis)**
- Prácticas y graduate programs de **ingeniería industrial en Europa continental** para residentes UE, con **elegibilidad estructurada** (obligatoria/voluntaria, convenio, idioma, residencia) y **calendario de convocatorias**.
- Demostrado frente a Simplify. **No** demostrado frente a JobTeaser, LinkedIn ni las bolsas universitarias.

**Recomendación**
- **NO-GO** para la idea original: global, móvil, solicitar con un clic.
- **GO CONDICIONADO** para un radar curado europeo de prácticas y graduate de ingeniería, sujeto a los umbrales de [validation-plan.md](validation-plan.md).

**Coste**
- Validación: 10–230 €.
- MVP web durante 3 meses, si se valida: 0–60 €.
- Total recomendado: ~150–250 €.
- Recurrente: ~1–10 €/mes más el dominio.
- Ver [budget.md](budget.md).

**Próximos 7 días**
1. Día 1: habilitar el acceso a red o usar tu equipo, y ejecutar `python3 research/scripts/ats_probe.py research/data/ats_endpoints.csv`. Si decides incluir Workday, que no tiene API pública documentada, añade `--allow-unofficial`.
2. Días 1–2: revisar a mano las 11 empresas sin ATS identificado y las 4 plataformas iniciales (¿existen? ¿qué cubren?). Buscar las 30 empresas en Stag-io, HiringCafe, JobTeaser (si tu universidad lo tiene) y Glever/jobs, y rellenar `job-coverage-matrix.csv`.
3. Días 2–3: crear la hoja pública con ofertas **reales** de 50 empresas y el calendario de convocatorias.
4. Día 3: publicar la landing (`validation/landing.html`) con formulario y política de privacidad.
5. Días 4–7: 10 entrevistas con el guion de [validation-plan.md](validation-plan.md), difusión en 3 comunidades y primera newsletter.
6. Día 7: revisar las métricas frente a los umbrales y anotar el resultado en `go-no-go.md`.

## Índice

| Archivo | Contenido |
|---|---|
| [market-study.md](market-study.md) | Método, entorno, fases 1–3, definiciones de oferta válida, duplicada y caducada, y limitaciones |
| [competitor-matrix.md](competitor-matrix.md) | Tabla comparativa y conclusiones |
| [company-sample.csv](company-sample.csv) | 30 empresas × 26 campos (portal, ATS, programas, requisitos, ejemplos reales, fecha) |
| [job-coverage-matrix.csv](job-coverage-matrix.csv) | Matriz empresas × plataformas con estado, evidencia y fecha |
| [data/ats-coverage-matrix.csv](data/ats-coverage-matrix.csv) | Matriz por ATS |
| [data/simplify_sample_matches.csv](data/simplify_sample_matches.csv) | Salida reproducible del cruce con Simplify |
| [data/ats_endpoints.csv](data/ats_endpoints.csv) | Endpoints de la muestra para `ats_probe.py` |
| [ats-analysis.md](ats-analysis.md) | ATS: API, autenticación, cierre, datos y clasificación A–E |
| [market-gap.md](market-gap.md) | Problemas, 5 oportunidades comparadas y recomendación |
| [business-model.md](business-model.md) | Precios de competidores, clientes y modelos |
| [validation-plan.md](validation-plan.md) | Hipótesis, umbrales, guion de entrevistas y materiales |
| [go-no-go.md](go-no-go.md) | Decisión y respuestas a las 12 preguntas |
| [technical-architecture.md](technical-architecture.md) | Diseño del MVP, arquitectura, RGPD y seguridad (solo diseño) |
| [budget.md](budget.md) | Presupuesto desglosado |
| [launch-plan.md](launch-plan.md) | Captación de los primeros 10 y 100 usuarios, métricas y anuncios |
| [sources.md](sources.md) | Todas las URLs y fechas de consulta |
| `scripts/simplify_coverage.py` | Reproduce las cifras de Simplify (offline) |
| `scripts/ats_probe.py` | Mide ofertas en portales oficiales (`--selftest` incluido) |
| `validation/landing.html` | Plantilla estática de landing para validar |

## Leyenda de evidencia

**[H]** hecho verificado · **[C]** declaración comercial del competidor · **[T]** afirmación de terceros · **[U]** opinión de usuarios · **[E]** estimación · **[Hip]** hipótesis pendiente de validar.

## Reproducir

```bash
# Cifras de Simplify (descarga ~26 MB de GitHub)
mkdir -p /tmp/simplify && cd /tmp/simplify
curl -sO https://raw.githubusercontent.com/SimplifyJobs/Summer2026-Internships/1b0b176d1d5b7c1c84d0e8c02b9332b6b35e32e1/.github/scripts/listings.json && mv listings.json simplify_Summer2026-Internships.json
curl -sO https://raw.githubusercontent.com/SimplifyJobs/New-Grad-Positions/edad37e4c36e807d45bd82f2e563cfcfdaca4291/.github/scripts/listings.json && mv listings.json simplify_New-Grad-Positions.json
cd - && python3 research/scripts/simplify_coverage.py /tmp/simplify > research/data/simplify_sample_matches.csv

# Medición en portales oficiales (requiere internet sin restricciones)
python3 research/scripts/ats_probe.py --selftest
python3 research/scripts/ats_probe.py research/data/ats_endpoints.csv > research/data/portal_counts.csv
```

Nota: las URLs fijan los commits usados en este informe (ver [sources.md](sources.md)). Para datos actuales, sustituye el hash por `dev`.
