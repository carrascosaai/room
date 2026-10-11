# Fases 8 y 9: diseño del MVP, arquitectura, seguridad y cumplimiento

> **Estado: solo diseño.** Según [go-no-go.md](go-no-go.md), el MVP **solo se implementa** si se cumplen las condiciones de validación. Nada de esto está construido.

## 1. Alcance del MVP (si se cumple el GO)

**Incluye:**
- Perfil mínimo: titulación, especialidad, curso o año de graduación, idiomas con nivel, países, tipos de práctica y sectores.
- Radar de ofertas de ~50–150 empresas industriales europeas, filtrable por país, ciudad, tipo (curricular / voluntaria / Pflichtpraktikum / thesis / graduate / junior), titulación, idioma, experiencia y elegibilidad.
- Ficha de oferta:
  - Fuente original (URL oficial y ATS).
  - "Vista activa por última vez: fecha".
  - Estado: activa / no confirmada desde hace >7 días / cerrada.
  - Requisitos extraídos, cada uno con su procedencia ("publicado en la oferta" o "inferido, compruébalo").
- Detección de duplicados entre fuentes y entre ubicaciones.
- Favoritos y estado de candidatura (pendiente → enviada → entrevista → oferta/rechazo), registrado por el usuario.
- Calendario de convocatorias.
- Alertas por correo (semanal en el plan gratis; diaria en el pase).
- Botón "Abrir en la web oficial".
- Exportar y eliminar mis datos.

**Excluye, con su motivo:**
- Envío de candidaturas y creación de cuentas por el usuario (categoría E).
- Autofill propio: es un commodity y aumenta el riesgo. La web recomienda las extensiones existentes y deja claro que son de terceros.
- Almacenar el CV (minimización de datos).
- Apps nativas.
- Cobertura mundial.
- IA que puntúe al usuario frente a ofertas (riesgo del AI Act y del RGPD).

## 2. Arquitectura de bajo coste

```
[Fuentes permitidas]
  Greenhouse / Lever / Ashby / SmartRecruiters (API pública)
  Workday (JSON del sitio de carreras: categoría C, empresa a empresa tras revisar sus términos)
  Curación manual (portales propios, PDFs de universidades con permiso)
        │
        ▼
[Ingesta]  GitHub Actions (cron diario) → Python (adaptado de scripts/ats_probe.py)
        │  - 1 petición cada ≥2 s, User-Agent identificable, se detiene ante 401/403/429
        │  - guarda solo metadatos: título, ubicación, fechas, URL, ID externo y un extracto corto de requisitos
        ▼
[Normalización]  título → tipo de práctica + disciplina (reglas multi-idioma, revisables)
                 ubicación → país/ciudad (ISO), idioma de la oferta
                 elegibilidad → flags con procedencia y confianza
                 dedupe: hash(empresa, título normalizado, país) + ID de requisición
                 vigencia: first_seen / last_seen; cerrada si falta en 2 ejecuciones o la URL da 404
        ▼
[Supabase (región UE)]  Postgres + Auth (magic link) + RLS
        ▼
[Web]  React + TypeScript (Next.js estático o Vite), responsive, hosting gratuito
       La clave anon en el cliente; la service-role solo en los secretos de GitHub Actions
        ▼
[Correo]  Proveedor transaccional con capa gratuita para las alertas
```

**Por qué esta forma:**
- Un único cliente web y ningún backend propio que operar.
- La ingesta va en batch, con lo que el coste es cero mientras quepa en los minutos gratuitos.
- RLS sustituye a la capa de API.

**React Native + Expo:** no se justifica al inicio. Una web responsive basta para validar y se puede convertir en PWA para las notificaciones.

## 3. Modelo de datos (borrador)

| Tabla | Campos clave | Notas |
|---|---|---|
| `companies` | id, nombre, entidad legal, país sede, sector, web | Resolución de entidades (Rolls-Royce plc ≠ Rolls-Royce Motor Cars) |
| `sources` | id, company_id, ats, identifier, categoría A–E, tos_revisados_en, robots_ok, activa | Registro de la base de acceso por fuente |
| `jobs` | id, source_id, external_id, título, url_oficial, ubicaciones[], país, idioma, tipo, disciplinas[], posted_at, first_seen, last_seen, estado | Sin descripción completa; sin nombres de reclutadores |
| `job_requirements` | job_id, tipo (idioma, obligatoria, convenio, residencia, titulación, fecha_límite), valor, procedencia (publicado/inferido), extracto | Cada requisito con su fuente |
| `ingest_runs` | id, source_id, inicio, fin, estado, http_status, n_ofertas, error | Errores y procedencia |
| `profiles` | user_id, titulación, especialidad, curso, idiomas{idioma: nivel}, países[], tipos[], sectores[] | Sin fecha de nacimiento, nacionalidad ni CV |
| `saved_jobs` / `applications` | user_id, job_id, estado, notas, fechas | El usuario registra; no se envía nada |
| `alerts` | user_id, filtros, frecuencia | — |
| `deletion_requests` | user_id, solicitada_en, completada_en | Borrado en cascada y registro mínimo |

**RLS:**
- `profiles`, `saved_jobs`, `applications` y `alerts`: solo `auth.uid() = user_id`.
- `jobs`, `companies` y `job_requirements`: lectura pública y escritura solo con la service role.

## 4. Seguridad y privacidad (RGPD)

- **Minimización:**
  - No se pide CV, DNI, fecha de nacimiento, foto, dirección ni nacionalidad.
  - La elegibilidad se calcula con "¿tienes derecho a trabajar en la UE?" (sí/no/no sé) y solo si el usuario lo marca.
- **Base legal:** la ejecución del servicio para el perfil y las alertas; el consentimiento explícito y separado para comunicaciones comerciales.
- **Documentación:** política de privacidad, registro de actividades de tratamiento, contrato de encargo con Supabase y con el proveedor de correo (DPA), y región UE.
- **Derechos:** acceso, rectificación, supresión y portabilidad desde la propia cuenta (exportar JSON y borrar cuenta). Correo de contacto para el resto.
- **Conservación:** cuentas inactivas más de 18 meses se avisan y se borran [definir]; logs de ingesta sin datos personales.
- **Datos de ofertas:** se descartan nombres, correos y teléfonos de reclutadores que aparezcan en las ofertas.
- **Secretos:**
  - Ninguna clave privada en el cliente.
  - La service role vive en los secretos de CI.
  - `.env.example` sin valores.
  - Rotación si hay fuga.
- **IA:** si se usa para extraer requisitos de una oferta, (a) solo sobre el texto de la oferta, nunca sobre datos del usuario; (b) cada campo se marca "inferido"; (c) el usuario ve el texto original. No se generan respuestas de candidatura en el MVP. Si se añaden más adelante, el usuario las revisa siempre y el sistema nunca inventa titulaciones, experiencia, idiomas ni permisos.
- **AI Act:**
  - No se puntúa ni se selecciona a personas.
  - Las recomendaciones son filtros explícitos elegidos por el usuario.
  - Antes de añadir ranking personalizado, hay que revisar si encaja en el Anexo III, punto 4 ("anuncios de empleo dirigidos").
- **Fuentes de ofertas:**
  - Revisar los términos y el `robots.txt` de cada empleador antes de activarlo (campo `tos_revisados_en`).
  - Frecuencia mínima.
  - Atribución y enlace a la oferta original.
  - Retirada inmediata a petición de la empresa.
  - **No** extraer de bolsas de terceros (InfoJobs, StepStone, LinkedIn, Indeed, JobTeaser): sus términos y el derecho *sui generis* sobre bases de datos lo desaconsejan.

## 5. Datos reales, de demostración y simulados

- Una columna `jobs.origen` ∈ {`real`, `demo`}. Las ofertas `demo` llevan una etiqueta visible "Ejemplo, no es una oferta real" y no se envían en alertas.
- Las pruebas usan fixtures en `tests/fixtures/` y nunca escriben en la base de producción.

## 6. Pruebas mínimas del MVP

- Unitarias:
  - Clasificador de títulos multi-idioma (el autotest de `ats_probe.py` es el punto de partida).
  - Deduplicación.
  - Transición de estado activa → no confirmada → cerrada.
- Integración: un adaptador por ATS contra fixtures grabados (respuestas JSON guardadas), sin red en CI.
- E2E (Playwright): registro con magic link, crear perfil, filtrar, guardar, cambiar estado, exportar y borrar la cuenta.
- RLS: un usuario no puede leer los datos de otro.

## 7. Despliegue y costes operativos

Ver [budget.md](budget.md). Coste mensual previsto en la fase MVP: **0–10 €** más el dominio, mientras se respeten los límites de las capas gratuitas. Antes de usar un plan gratuito, comprueba si permite uso comercial (por ejemplo, el plan Hobby de Vercel está pensado para uso personal y no comercial; Cloudflare Pages es una alternativa).

## 8. Plan de implementación (solo si GO)

1. Semana 1: esquema Supabase con RLS y migraciones; adaptadores Greenhouse, Lever, SmartRecruiters y Workday con fixtures; cron en Actions.
2. Semana 2: normalización (tipo, disciplina, país, idioma, requisitos) y deduplicación; panel interno de revisión.
3. Semana 3: web (radar, ficha, favoritos, estados, perfil, exportar y borrar) y alertas semanales.
4. Semana 4: pruebas, política de privacidad, lanzamiento cerrado a la lista de espera.

**Ubicación:** este repositorio (`room`) contiene otro producto, un juego de fiesta en Next.js. El MVP debería ir en un **repositorio nuevo** para no mezclar dependencias, despliegues ni historiales.
