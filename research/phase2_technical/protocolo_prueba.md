# Protocolo de la prueba con 30 empresas

**Estado: diseñado; no se ha podido ejecutar.** El entorno bloquea el acceso HTTP salvo a GitHub. Las columnas de medición de `data/empresas_30.csv` están marcadas como **DESCONOCIDO** (no medido). Esto **no** equivale a "sin ofertas".

## Muestra

30 empresas de `data/empresas_30.csv`:
- España 8, Alemania 9, Francia 6, Italia 2, Países Bajos 2, Suiza 1, Dinamarca 2.
- Mezcla de ATS: Workday 6, Avature 2, SuccessFactors inferido 3, SmartRecruiters 1, Teamtailor 1, portales propios 3, manuales 4 y 10 desconocidos.

## Paso 1 — Identificar la fuente (1 vez por empresa)

1. Abrir la web de empleo oficial. Anotar URL, ATS (por el host o el código fuente) y la presencia de JSON-LD `JobPosting`.
2. Buscar una API o feed **documentado oficialmente** (inventario en `data/inventario_apis.csv`). No suponer que existe porque el proveedor tenga APIs para otros productos.
3. Leer los términos de uso y el `robots.txt` del sitio. Anotar si permiten, prohíben o no dicen nada sobre el acceso automatizado. Si prohíben: categoría E para esa empresa (solo revisión manual o acuerdo).
4. Asignar categoría A/B/C/D/E/M y registrar los minutos dedicados (sustituyen a `setup_*` de `data/coste_inputs.csv`).

## Paso 2 — Medición (dos rondas, separadas 7 días)

- **Fuentes A/B y Workday público:**
  ```bash
  python3 research/scripts/ats_probe.py research/phase2_technical/data/endpoints_30.csv [--allow-unofficial]
  ```
  `--allow-unofficial` solo si los términos de cada sitio lo permiten. 1 petición cada 2 s; se detiene ante 401/403/429.
- **Resto:** revisión manual de la página de empleo con los filtros "prácticas/intern/Praktikum/stage/tirocinio/graduate".
- Para cada oferta relevante, registrar `oferta_id, empresa, url, titulo, tipo, ubicacion, idioma, fecha_publicacion, fecha_limite, requisitos_texto, fuente, ronda, visto_en (lista de URLs)`.

## Métricas y definiciones

| Métrica | Definición | Nota |
|---|---|---|
| % empresas con ofertas accesibles | Empresas en las que se pudo **leer** la lista de ofertas por una vía permitida (A/B/C con términos compatibles o M) ÷ 30 | Separar "accesible y con 0 ofertas relevantes" de "no accesible" |
| Ofertas activas verificadas | Ofertas vistas en la fuente oficial en la ronda 2 | Una oferta vista solo en un agregador **no** cuenta como verificada |
| % duplicadas | (URLs observadas − ofertas únicas) ÷ URLs observadas | Clave: empresa + título normalizado + ubicación + ID de requisición si existe (`../phase2_market/scripts/build_offers.py`) |
| Frecuencia de actualización necesaria | % de ofertas nuevas o cerradas entre ronda 1 y ronda 2 | Si cambian >10 % por semana: frecuencia diaria; si no, 2–3 veces por semana |
| Capacidad de detectar cierres | % de cierres detectados con evidencia (ver abajo) frente a los marcados "desconocido" | — |
| Datos que faltan | % de ofertas sin fecha límite, sin salario, sin requisitos de idioma, sin tipo (obligatoria/voluntaria), sin fecha de inicio | En la fase 2 faltaba la fecha límite en el 92 % de las relevantes |
| Coste por empresa y por oferta | Minutos reales registrados → `scripts/coste_operativo.py` | Sustituye a las estimaciones |

## Desconocido frente a negativo (regla obligatoria)

| Situación | Estado que se registra | No registrar |
|---|---|---|
| La página no carga, devuelve 403/429 o hay CAPTCHA | `desconocido – acceso_fallido` | ~~"sin ofertas"~~ ni ~~"cerrada"~~ |
| La página carga, el filtro funciona y no hay prácticas relevantes | `accesible – 0 relevantes` (con fecha y captura) | — |
| La oferta ya no aparece en 1 ejecución | `no_confirmada` | ~~"cerrada"~~ |
| No aparece en **2 ejecuciones consecutivas** con la fuente accesible, **o** su ficha devuelve 404/410, **o** muestra "no longer accepting applications", **o** `validThrough` ya pasó | `cerrada – evidencia: <tipo>` | — |
| La ficha existe pero sin fecha y sin cambios | `activa – vista <fecha>` | ~~"abierta hasta…"~~ |

## Plantilla de resultados (crear al ejecutar)

`data/prueba_30_resultados.csv`: `id, empresa, categoria_final, terminos_revisados (si/no/prohibe), accesible (si/no/desconocido), motivo_no_accesible, n_ofertas_total_r1, n_relevantes_r1, n_relevantes_r2, nuevas_r2, cerradas_con_evidencia_r2, no_confirmadas_r2, duplicados, minutos_alta, minutos_ronda, fecha_r1, fecha_r2`.
