# Base de datos de PLANEA (Supabase)

PLANEA usa tablas con prefijo `planea_` dentro del proyecto de Supabase
`jyivfciqecqdlqdkikas` (compartido con otra app; no se toca nada ajeno a `planea_*`).
Todo el acceso público pasa por funciones `security definer`: las tablas tienen RLS
activado y ningún permiso directo para `anon`.

## "Voy" (escrituras de la gente)

- `planea_going` — un registro por dispositivo, sitio y noche (`unique(venue_id, night, device_id)`),
  nombre opcional (≤ 24 caracteres) y hash de IP del día (no se guarda la IP).
- `planea_night()` — la noche va de 08:00 a 08:00, hora de Madrid.
- `planea_mark_going(p_venue, p_city, p_device, p_name)` — límites: 8 sitios por dispositivo
  y noche, 300 por IP y noche.
- `planea_unmark_going(p_venue, p_device)`
- `planea_city_going(p_city)` — recuento y últimos 6 nombres por sitio (la app lo cachea 15 s en la CDN).
- `planea_spain_top()` — lo más popular esta noche en España (cacheado 30 s).
- Tarea `pg_cron` `planea-going-cleanup`: limpia las noches de hace más de 7 días.

## Catálogo (lecturas)

- `planea_cities`, `planea_places` — expuestas con `planea_list_cities()` y `planea_list_places(p_city)`.
- Origen de los datos:
  - `data/research.txt` → `data/curated.json`: selección investigada (opiniones, rankings,
    TikTok/redes) de 79 ciudades: discotecas, bares y **zonas de ambiente**.
  - `planea_osm_raw`: todas las discotecas con nombre de OpenStreetMap en España (Overpass).
  - `planea_geo`: cola de geocodificación con Nominatim (1 petición/s, extensión `http`).
- `planea_rebuild()` une todo (vistas `planea_v_*` y vistas materializadas `planea_mv_*`):
  asigna cada discoteca a la ciudad investigada más cercana (< 12 km) o a su municipio,
  fusiona duplicados (similitud de nombre > 0,4 a < 1,5 km) y hace upsert en el catálogo.

Para añadir sitios: añade líneas a `data/research.txt`, ejecuta `node scripts/research-to-sql.mjs`,
inserta las filas nuevas en `planea_curated`/`planea_geo`, deja que se geocodifiquen y ejecuta
`select planea_rebuild();`.
