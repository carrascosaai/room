# PLANEA — ¿Qué hacemos hoy?

Plataforma social mobile‑first para descubrir qué está pasando **ahora** cerca de ti en España: discotecas, bares de copas, pubs, conciertos, fiestas universitarias, festivales, sitios para cenar y planes espontáneos creados por la gente.

> **Privacidad por diseño:** nadie ve la ubicación de nadie. "Estoy aquí" y "Me apunto" solo suman a un contador.

La app funciona **sin configurar nada** (modo demo: datos ficticios y cuentas guardadas en el navegador). Con dos variables de entorno pasa a usar **Supabase** (Auth + Postgres con RLS + Storage).

---

## Stack

| Capa | Elección |
| --- | --- |
| Framework | Next.js 16 (App Router, Turbopack, `proxy.ts`), React 19, TypeScript estricto |
| Estilos | Tailwind CSS 4 (tokens en `src/app/globals.css`), Inter + Bricolage Grotesque autoalojadas |
| Backend | Supabase: Auth (email/contraseña + Google), Postgres con RLS, Storage |
| Mapas | Leaflet + teselas CARTO/OpenStreetMap (gratis); Mapbox con `NEXT_PUBLIC_MAPBOX_TOKEN` |
| Validación | Zod + filtro de contenido propio (cliente) + triggers en base de datos |
| Iconos | lucide-react |
| Tests | Vitest (lógica) + prueba SQL de RLS (`supabase/tests`) |

## Estructura

```
planea/
├─ src/
│  ├─ app/
│  │  ├─ page.tsx                 Landing pública
│  │  ├─ normas/                  Normas de la comunidad y privacidad
│  │  ├─ auth/callback/           Vuelta de OAuth y emails de Supabase
│  │  ├─ api/venues/              Lista compacta de locales (formulario de planes)
│  │  ├─ sitemap.ts robots.ts manifest.ts icon.svg
│  │  └─ (app)/                   Todo lo que lleva barra de navegación
│  │     ├─ ciudades/             Selector de ciudad + "Usar mi ubicación"
│  │     ├─ [city]/               Home: Ahora / Esta noche / Mañana / Finde
│  │     │  ├─ [slug]/            Ficha de local  ó  listado SEO por categoría (/sevilla/discotecas)
│  │     │  ├─ eventos/[slug]/    Ficha de evento (y /madrid/eventos)
│  │     │  ├─ planes/[id]/       Ficha de plan (y /cordoba/planes)
│  │     │  ├─ mapa/ tendencias/ descubre/
│  │     ├─ crear/ perfil/ login/ registro/ moderacion/
│  ├─ components/                 UI (cards, salseo, detail, map, profile, shell, ui…)
│  ├─ lib/
│  │  ├─ types.ts                 Modelo de dominio
│  │  ├─ data/catalog.ts          Lecturas de servidor (demo ↔ Supabase)
│  │  ├─ backend/                 Acciones del usuario: demo.ts (localStorage) ↔ supabase.ts (RLS)
│  │  ├─ seed/                    DATOS DEMO ficticios (catalog.ts) + generador
│  │  ├─ feed.ts trending.ts      Lógica de "qué hay ahora" y ranking
│  │  ├─ time.ts                  Zona horaria Europe/Madrid ("la noche acaba a las 07:00")
│  │  ├─ moderation.ts gamification.ts validation.ts geo.ts map.ts
│  └─ proxy.ts                    Refresco de sesión de Supabase
├─ supabase/
│  ├─ migrations/0001_schema.sql  Tablas, RLS, vistas públicas, triggers (XP, moderación)
│  ├─ migrations/0002_storage.sql Bucket de imágenes de planes
│  ├─ seed.sql                    Datos demo (generado: npm run db:seed-sql)
│  └─ tests/                      Prueba de humo de RLS en Postgres local
├─ scripts/generate-seed-sql.ts
└─ tests/                         Vitest
```

### Modelo de datos

`City`, `Category`, `User` (`profiles`), `Venue`, `Event`, `Plan`, `Attendance` (me interesa / me apunto / estoy aquí), `Vote` (¿merece la pena esta noche?), `Review`, salseo en `posts` (`kind`: **poll**, question, **confession**, opinion, prediction) con `poll_options`, `poll_votes` y `post_replies`, `Report`, `blocks`, `page_views`, `xp_events` y `promotions` (monetización futura).

Claves de privacidad en la base de datos:
- `attendances` y `votes` solo las lee su dueño; el resto ve agregados vía `get_target_stats()`.
- Las vistas `posts_public` / `replies_public` devuelven `author_id = null` en lo anónimo.
- Los perfiles completos (edad, ciudad) solo los ve su dueño; lo público va por `profiles_public`.
- El XP y el rol no se pueden modificar desde el cliente (privilegios por columna + triggers).

## Variables de entorno

Copia `.env.example` a `.env.local`. **Todas son opcionales.**

| Variable | Para qué |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` | URL pública (sitemap, canonical, Open Graph) |
| `NEXT_PUBLIC_SUPABASE_URL` | Activa el modo producción |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clave pública (anon). Segura en el cliente: todo pasa por RLS |
| `NEXT_PUBLIC_AUTH_GOOGLE` | `1` para mostrar "Continuar con Google" |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | Usa estilos de Mapbox en vez de CARTO/OSM |

No se usa ninguna clave privada (`service_role`) en la app.

## Ejecutar en local

```bash
cd planea
npm install
npm run dev          # http://localhost:3000
```

Otros comandos: `npm run build`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run db:seed-sql`.

En modo demo hay una cuenta de moderación para probar el panel: botón **"Entrar como moderador demo"** en el login (`demo@planea.app` / `planea123`).

## Conectar Supabase

1. Crea un proyecto en [supabase.com](https://supabase.com) (región UE recomendada).
2. **SQL Editor** → ejecuta en orden `supabase/migrations/0001_schema.sql`, `0002_storage.sql` y, si quieres la demo, `supabase/seed.sql`.
   Con la CLI: `supabase link --project-ref <ref>` y `supabase db push` (+ `psql … -f supabase/seed.sql`).
3. **Project Settings → API**: copia URL y `anon key` a `.env.local`.
4. **Authentication → URL Configuration**: añade `https://tu-dominio/auth/callback` (y `http://localhost:3000/auth/callback`) a *Redirect URLs*.
5. Google (opcional): **Authentication → Providers → Google** con tu Client ID/Secret de Google Cloud y `NEXT_PUBLIC_AUTH_GOOGLE=1`.
6. Hazte moderador: `update profiles set role = 'moderator' where username = 'tu_usuario';`
7. (Demo viva) programa `select public.roll_demo_dates()` a diario con `pg_cron` para que los eventos demo no caduquen.

### Probar el esquema en local (sin Supabase)

```bash
createdb planea_test
psql -d planea_test -f supabase/tests/auth_stub.sql -f supabase/migrations/0001_schema.sql -f supabase/seed.sql
psql -d planea_test -f supabase/tests/rls_smoke.sql
```

## Desplegar en Vercel

1. Importa el repositorio en Vercel y en **Root Directory** elige `planea`.
2. Framework: Next.js (autodetectado). Build: `npm run build`.
3. Añade las variables de entorno (al menos `NEXT_PUBLIC_SITE_URL`; las de Supabase para producción).
4. Deploy. Sin variables de Supabase se despliega en modo demo, útil para enseñar el producto.

## Qué está listo para producción

- Esquema Postgres completo con **RLS en todas las tablas**, vistas públicas sin datos personales, triggers de XP (una vez por acción, sin farmeo), auto‑ocultación con 3 denuncias, anti‑spam (6 publicaciones / 5 min), filtro de teléfonos, emails y enlaces en base de datos, bloqueo de autores anónimos sin revelar identidad, cola y acciones de moderación.
- Autenticación Supabase (registro, login, logout, Google, confirmación por email) y refresco de sesión en `proxy.ts`.
- Todas las pantallas: landing, selector de ciudad, home por franjas, fichas de local/evento/plan, salseo, reseñas, crear plan con imagen (Storage), mapa, tendencias, descubre, perfil con niveles y badges, moderación.
- SEO: URLs por ciudad, categoría, local y evento, metadata dinámica, JSON‑LD (`NightClub`, `MusicEvent`…), `sitemap.xml`, `robots.txt`, manifest PWA. ISR de 60 s.
- Validación con Zod, filtro de contenido, estados de carga (skeletons), estados vacíos, errores amigables, cabeceras de seguridad, respeto a `prefers-reduced-motion`.

> Nota honesta: el modo demo está probado de punta a punta en navegador (registro, interés, votos, salseo, denuncias, moderación, crear plan, filtros). El esquema SQL, el seed y las políticas RLS están probados en Postgres 16. El adaptador `backend/supabase.ts` compila y sigue el esquema, pero **no se ha ejecutado contra un proyecto Supabase real**: haz una pasada de QA al conectarlo.

## Qué usa datos demo

- **Todos** los locales, eventos, planes, artistas, autores, publicaciones de salseo, reseñas, contadores de interés, votos y visitas son **ficticios** (`src/lib/seed/catalog.ts`, marcados `is_demo = true`). Se ven con la etiqueta **DEMO** y un aviso global.
- Las portadas son ilustraciones generadas por categoría (no hay fotos de stock). En cuanto un local tenga `image_url`, se muestra la foto real optimizada.
- En modo demo las cuentas, planes y votos del usuario viven en `localStorage` (solo ese navegador).

Para cargar datos reales: inserta filas en `venues` / `events` con `is_demo = false` (o importa CSV desde el panel de Supabase) y borra la demo con `delete from … where is_demo`.

## Siguientes 5 mejoras (post‑MVP)

1. **Panel para locales** (`venues.owner_id` ya existe): que cada local gestione su horario, programa y fotos, y verificación de locales → datos reales y frescos.
2. **Importación de eventos** (Ticketmaster, Fever, Resident Advisor, agendas municipales) con deduplicado y revisión → cobertura sin trabajo manual.
3. **Amigos y grupos**: "Solo amigos" real, invitar por enlace, ver qué planes tienen tus amigos (siempre sin ubicación).
4. **Notificaciones push (PWA)**: "Tu plan empieza en 30 min", "El sitio que guardaste está petando ahora".
5. **Monetización ligera**: destacados y promociones con la tabla `promotions` (claramente etiquetados y fuera del ranking de tendencias) y venta de entradas con `ticket_url`.
