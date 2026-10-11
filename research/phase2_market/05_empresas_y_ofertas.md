# 57 empresas industriales y 125 ofertas comprobadas

Fecha de consulta: 2026-10-11. Datos: [data/companies.csv](data/companies.csv) y [data/offers.csv](data/offers.csv). Los registros brutos están en [data/offers_raw.tsv](data/offers_raw.tsv). Ambos ficheros se regeneran con `scripts/build_offers.py` y `scripts/build_companies.py`.

## Método

1. **Muestra (57 empresas):**
   - España 16, Alemania 15 (incluida Liebherr DE/CH), Francia 8 (incluida Airbus), Italia 6, Países Bajos 5 (incluida Stellantis), Dinamarca 2, Suecia 2, Suiza 2 y Reino Unido 1.
   - Grandes grupos y medianas o industriales familiares: Ingeteam, Talgo, Fagor Arrasate, Irizar, CIE Automotive, TRUMPF, Festo, Voith, VDL, DAF, Brembo.
   - El tamaño solo se registra cuando hay fuente (ITP Aero ≈6.600 personas). El resto queda "no verificado".
2. **Búsqueda:** 1 o 2 consultas por empresa en su idioma local ("Praktikum Maschinenbau 2026", "stage ingénieur 2026", "prácticas ingeniería 2026", "tirocinio ingegneria 2026"…), con unas 60 consultas solo para esta parte.
3. **Registro:** solo ofertas con URL concreta y título visible en el resultado. Por cada oferta se anotan empresa, país, familia profesional, tipo de puesto, ubicación, idioma, requisitos, fecha límite, URL, tipo de fuente y estado conocido.
4. **Verificación:** **ninguna URL se abrió**, porque el acceso HTTP está bloqueado en el entorno. El nivel es "URL indexada por buscador". 22 de las 93 ofertas relevantes tienen URL del portal oficial; el resto son copias en agregadores.
5. **Deduplicación:** clave = empresa + título normalizado (sin marcas de género, referencia ni año) + ubicación. Además, al registrar se anotó cuando la misma oferta aparecía en varias URLs (otro idioma, otro agregador u otro ID).
6. **Relevancia:**
   - **Sí:** inicio de carrera para universitarios (prácticas, Praktikum, stage, internship, beca, thesis/TFM, graduate, trainee, afstudeerstage) en familias objetivo (mecánica, industrial, eléctrica, electrónica, aeroespacial y afines).
   - **No:** FP, estudios duales, apprenticeships, puestos no técnicos, informática pura, y registros que no son una oferta concreta.
   - **Parcial:** Werkstudent o empleo con primera experiencia.

## Resultados

| Métrica | Valor |
|---|---|
| Empresas analizadas | 57 |
| Empresas con ≥1 oferta relevante encontrada | 39 |
| Empresas solo con registros no relevantes | 9 |
| Empresas **sin ofertas concretas encontradas** (Sener, CIE Automotive, Irizar, Fagor Arrasate, ITP Aero, Talgo, KUKA, Liebherr, SKF) | 9. **No significa que no tengan ofertas.** ITP Aero declara más de 450 estudiantes en prácticas en 2025. |
| URLs observadas | 159 |
| **Ofertas únicas tras deduplicar** | **125** (34 URLs redundantes en 20 ofertas: 21 %) |
| Ofertas relevantes / parciales / no relevantes | 93 / 5 / 27 |
| Relevantes por país de la empresa | DE 39 · FR 22 · ES 12 · DK 6 · NL 5 · IT 4 · CH 2 · UK 2 · SE 1 |
| Relevantes ubicadas fuera de Europa | 11 (Alstom EE. UU./Canadá/Panamá, Siemens Energy KSA/Turquía, Gestamp China, Acciona Australia, Pirelli Brasil, ASML EE. UU.) |
| Relevantes ubicadas en España | 10 |
| Idioma de la ficha (relevantes) | alemán 31 · inglés 27 · francés 17 · español 12 · otros 6 |
| **Con fecha límite publicada** | **7 de 93** (7,5 %). El resto: "mientras esté online" o sin dato. |
| Estado conocido | 62 desconocido · 21 cerradas o probablemente cerradas · 2 abiertas según plazo publicado o agregador · 8 otros (fecha desconocida, intake no verificado, programa continuo) |
| Con URL de portal oficial | 22 de 93; las 71 restantes solo se vieron en terceros |
| Requisitos de elegibilidad visibles en el fragmento | solo obligatorias: 11 · idioma: 11 · matrícula: 4 · permiso/ciudadanía/control de exportaciones: 2. **Son mínimos:** el fragmento rara vez muestra todos los requisitos. |

### Ejemplos de duplicación (por qué hace falta deduplicar)
- ASML "ASML is looking for interns within engineering": **6 URLs** en el JobTeaser de la TU/e (en, de, sv, da, fi, fr).
- Hitachi Energy JID3-218982: **5 URLs** regionales del portal oficial.
- MTU "Praktikum im technischen Bereich": 3 versiones de idioma en JobTeaser.
- BMW: 3 IDs de JobTeaser con el mismo título "Praktikant Fahrwerksentwicklung". **Se trató como duplicado, pero podrían ser 3 ofertas distintas de distintos departamentos.** No se puede resolver sin abrir las fichas.
- Dassault: la misma referencia 2026-15069 publicada en febrero y de nuevo en abril en CIDJ.
- Mercedes-Benz: el mismo título en 3 URLs de jobjump con slugs distintos.

### Ejemplos de requisitos de elegibilidad encontrados
| Empresa | Requisito | Fuente |
|---|---|---|
| Continental, Bosch, Mercedes-Benz, Siemens, Voith | Solo **Pflichtpraktikum** (prácticas obligatorias del plan de estudios) | Títulos de las ofertas |
| ASML | Matriculado durante **toda** la práctica; plazo 31-12-2026 | JobTeaser TU/e |
| Airbus | Elegible para **autorización de control de exportaciones** | flexa.careers |
| Hitachi Energy (trainee Suecia) | Permiso de trabajo permanente o **ciudadanía UE**; no vale visado de estudiante | The Muse |
| Schaeffler | Alemán **o** inglés C1 | workingstudentjobs.de |
| Iberdrola (USAL) | Inglés B2/C1; 900 €/mes | PDF universidad |
| Repsol Talent Energy | Inscripción del 18-05 al 31-12-2026 | becas.com |
| Navantia (Cátedra) | Solo máster ETSIN; 600 €/mes; puede computar como curricular | PDF ETSIN-UPM |

### Volúmenes declarados por empresas (contexto, no ofertas)
- Thales: unos 3.300 *stages* y alternancias en Francia en 2026, con alrededor del 40 % contratados después (nota oficial).
- ITP Aero: más de 450 estudiantes en prácticas en 2025 (documento oficial).
- Acciona: más de 250 prácticas de FP en España (nota oficial; fuera del objetivo).
- Navantia: 131 vacantes para titulados (prensa; plazo 15-09-2026).

## Limitaciones

- **No es un censo.** El buscador muestra una fracción no conocida de las ofertas de cada empresa. No se calculan porcentajes de cobertura por plataforma porque no existe un denominador (el número real de ofertas de cada portal).
- El estado (abierta/cerrada) es desconocido en dos tercios de las ofertas. Muchas son de la campaña de verano de 2026, ya pasada.
- La clasificación de relevancia y de familia es automática y está documentada en el script. Algunos casos límite son discutibles: SEAT KickStart (sistemas/telecomunicaciones) y Schneider Industria 4.0.
- La muestra favorece a grandes empresas con presencia en buscadores. Las medianas españolas casi no aparecieron.
