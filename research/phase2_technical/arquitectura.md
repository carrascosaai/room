# Arquitectura técnica mínima viable (solo diseño)

Objetivo: mantener 30–50 empresas con **≤30 h/mes** del fundador y **≤30 €/mes** de infraestructura. No se construye nada en esta fase.

```
FUENTES (por categoría)
  A  Lever/Greenhouse/SmartRecruiters API ─┐
  B  Feeds XML (SuccessFactors, Personio) ─┤
  C  JSON/HTML público con términos OK ────┼─> CONECTORES (Python, 1 por tipo de ATS, no por empresa)
  M  Hoja de revisión manual (PDF, bolsas) ┘        │  1 petición/2 s · se detiene ante 401/403/429 · User-Agent identificable
                                                    ▼
                         CRON (GitHub Actions: diario A/B, 2-3/semana C, semanal M)
                                                    ▼
NORMALIZACIÓN  título→tipo (intern/Praktikum/stage…) · familia · país (ISO) · idioma del anuncio
               requisitos→reglas multi-idioma (estado ✅/❌/❔ + cita) · marca "inferido/revisado"
DEDUPLICACIÓN  empresa + título normalizado + ubicación + ID de requisición
VIGENCIA       first_seen / last_seen · activa / no_confirmada / cerrada_con_evidencia / desconocido
PROCEDENCIA    fuente, categoría, términos_revisados_en, http_status de cada ejecución
                                                    ▼
ALMACÉN        Postgres (Supabase, región UE) — ofertas sin datos personales; perfiles con RLS
                                                    ▼
SALIDAS        Newsletter semanal (MVP) → web estática filtrable (después)
REVISIÓN       Cola de revisión humana: ofertas nuevas, conectores rotos, "este requisito está mal"
```

## Decisiones

- **Un conector por ATS, no por empresa.** Workday cubre 6 de las 30 empresas con el mismo código. Los portales propios (C) y los manuales (M) son los que escalan mal.
- **Empezar por la newsletter** (salida manual a partir de la base de datos). La web llega solo si `../phase2_customers` y `../phase2_growth` validan el uso.
- **Fallos visibles:** si un conector da 403 en 2 ejecuciones, la empresa pasa a `desconocido – acceso_fallido` y a la cola manual. Sus ofertas **no** se cierran.
- **Sin envío de candidaturas, sin autofill y sin cuentas en ATS.**

## Componentes y coste

| Componente | Opción | Coste (estimado, verificar) |
|---|---|---|
| Ejecución periódica | GitHub Actions (minutos gratuitos) | 0 € |
| Base de datos y autenticación | Supabase Free (pausa por inactividad) → Pro 25 $/mes si se usa a diario | 0–25 $ |
| Correo | Resend Free (3.000/mes, 100/día) → Pro 20 $ | 0–20 $ |
| Web estática | Cloudflare Pages / GitHub Pages (el plan Hobby de Vercel no permite uso comercial) | 0 € |
| Dominio | — | ~1–2 €/mes |
