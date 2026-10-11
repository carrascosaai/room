# Presupuesto (100–500 €)

Todas las cifras son **estimaciones [E]**. Los precios de proveedores no se pudieron comprobar en sus páginas (red bloqueada), así que hay que verificarlos antes de contratar. **No se ha contratado ni comprado nada.**

## Fase A: validación (semanas 1–4)

| Concepto | Tipo | Coste estimado | Comentario |
|---|---|---|---|
| Dominio (.com o .eu) | Obligatorio, recurrente anual | 10–20 €/año | También puede validarse con un subdominio gratuito |
| Hosting de la landing estática (Cloudflare Pages, GitHub Pages, Netlify) | Obligatorio | 0 € | Revisa las condiciones de uso comercial del plan gratuito |
| Formulario (Tally o Google Forms) | Obligatorio | 0 € | Con casilla de consentimiento RGPD |
| Demo (Google Sheets o Airtable, vista pública) | Obligatorio | 0 € | — |
| Correo de seguimiento (Gmail o capa gratuita de un proveedor de newsletter) | Obligatorio | 0 € | — |
| Analítica sin cookies (Cloudflare Web Analytics u opción gratuita) | Obligatorio | 0 € | Evita banners de cookies innecesarios |
| Cobro de preventas (Stripe Payment Links o transferencia) | Opcional | 0 € fijo + comisión por cobro | Solo si hay preventas |
| Plantilla de política de privacidad revisada | Recomendado | 0–60 € | Generador o revisión puntual |
| Incentivos para entrevistas (p. ej. 10 × 5 € en vales) | Opcional | 0–50 € | Mejora la tasa de respuesta |
| Prueba de anuncios (Instagram/TikTok/LinkedIn), solo si los canales orgánicos funcionan | Opcional | 50–100 € | Ver [launch-plan.md](launch-plan.md) |
| **Subtotal fase A** | | **10–230 €** | |

## Fase B: MVP (solo si GO)

| Concepto | Tipo | Coste estimado | Comentario |
|---|---|---|---|
| Supabase (Postgres, Auth, RLS) en capa gratuita | Obligatorio | 0 €/mes | La capa gratuita pausa proyectos inactivos y tiene límites de BD; plan de pago a partir de ~25 $/mes si hace falta |
| Hosting web (Cloudflare Pages o Vercel según uso comercial) | Obligatorio | 0 €/mes | — |
| GitHub Actions (cron de ingesta) | Obligatorio | 0 € (minutos gratuitos) | Repositorio privado: comprobar la cuota de minutos |
| Correo transaccional de alertas (capa gratuita) | Obligatorio | 0 €/mes hasta el límite gratuito | Revisar límites diarios |
| Monitorización de errores (capa gratuita) | Opcional | 0 € | — |
| IA para extraer requisitos (si se usa) | Opcional, recurrente | 0–10 €/mes | Solo texto de ofertas; empezar con reglas |
| Apps nativas (cuentas de desarrollador) | **No recomendado** | ~99 $/año Apple + 25 $ única Google | Fuera del MVP |
| **Subtotal fase B (primeros 3 meses)** | | **0–60 €** | |

## Resumen

| Escenario | Total |
|---|---|
| Mínimo (validación orgánica, sin incentivos ni anuncios) | ~10–20 € |
| Recomendado (validación + incentivos + revisión de privacidad + MVP 3 meses) | ~150–250 € |
| Máximo dentro del rango (con prueba de anuncios) | ~350 € |
| Recurrente tras el MVP | ~1–10 €/mes + dominio |

El margen hasta 500 € queda como reserva para una segunda ronda de validación si la primera cae en "replantear".
