# Fase 6: disposición a pagar y modelo de negocio

Fecha: 2026-10-11. **No se ha entrevistado a ningún usuario ni simulado ninguna encuesta.** Todo lo que sigue sobre disposición a pagar es [Hip] hasta que se ejecute [validation-plan.md](validation-plan.md).

## 1. Precios reales de competidores

| Producto | Qué cobra | Precio | Tipo de dato |
|---|---|---|---|
| Simplify Copilot | Autofill + tracker | Gratis | [T] varias reseñas coinciden |
| Simplify+ | IA, extras | 19,99 $/semana · 39,99 $/mes · 89,99 $/trimestre | [T] reseña que cita su centro de ayuda |
| Glever Premium | Autofill + "Apply For Me" hasta 200/mes | 10 $/mes | [C] blog de Glever |
| GoFillr Pro | Autofill + CV | 5,99 $/mes · 49 $/año | [H] código público (README) |
| JobFill.ai Pro | Autofill | 3,99 $/mes (2,99 $ anual) | [C] |
| Jobfillr | Autofill | Sin suscripción | [C] |
| Teal+ | CV + tracker | 29 $/mes (semanal 9–13 $, datos contradictorios) | [T] |
| Huntr Pro | Tracker + autofill | 40 $/mes (26,66 $ semestral) | [T] |
| Jobright | Copiloto IA | 29–59 $/mes (no confirmado; /pricing con 404) | [T] |
| thejobfinderai.com Pro | Auto-apply | 49 $/mes | [C] |
| HiringCafe | Buscador | Gratis | [T] |
| Handshake | Empleadores | Basic gratis; Plus ~100 $+/semana; TES ~29 835 $/año (mediana de 3 transacciones) | [T] Vendr/Sacra vía Pin |
| JobTeaser | Empresas pagan; estudiantes gratis | Sin precios publicados | [C] |
| Wellfound | Empleadores | 149–499 $/mes (contradictorio) | [T] |

**Patrón:**
- Los estudiantes reciben lo esencial gratis.
- La monetización B2C se concentra en IA y automatización (10–40 $/mes) y en pagos de corta duración ("semana", "trimestre"), que encajan con una búsqueda intensa y finita.
- Los ingresos grandes del segmento universitario los pagan **empleadores y universidades**, no los estudiantes.

## 2. ¿Quién podría pagar?

| Cliente | Dolor | Capacidad de pago | Evidencia | Valoración |
|---|---|---|---|---|
| Estudiantes universitarios (España) | Medio-alto en temporada | Baja; prácticas pagadas a 500–900 €/mes [T, PDF Iberdrola-USAL 900 €] | Ninguna directa | Pago bajo y estacional como mucho [Hip] |
| Recién graduados | Alto (primer empleo) | Baja-media | Ninguna directa | Algo mejor que los estudiantes [Hip] |
| Profesionales que cambian de país | Alto | Media-alta | Productos de 29–40 $/mes existen [T] | Segmento distinto (no junior); fuera de foco |
| Universidades / escuelas / COIE | Empleabilidad internacional como indicador | Media, con compras lentas | JobTeaser (750–800 centros) y Handshake prueban que pagan por plataformas [C] | Posible a medio plazo; difícil para un fundador solo [Hip] |
| Asociaciones de estudiantes / colegios profesionales | Servicio a socios | Baja-media | Ninguna | Canal de distribución más que de ingresos |
| Empresas y reclutadores | Atraer talento junior internacional | Alta | Handshake, JobTeaser, Wellfound cobran a empleadores [C/T] | Requiere audiencia previa; conflicto con la neutralidad |

## 3. Modelos evaluados

| Modelo | Encaje | Riesgo |
|---|---|---|
| **Freemium** (radar y filtros gratis; premium = alertas instantáneas, calendario con recordatorios, más países o sectores, export) | Bueno para crecer | Conversión típicamente baja; sin datos propios |
| **Pase de temporada** (p. ej. 3 meses en la época de búsqueda de prácticas) | Encaja con la estacionalidad (Simplify vende semana/trimestre [T]) | Hay que validar el precio |
| Suscripción mensual continua | Malo | El uso es estacional; abandono alto [Hip] |
| Pago por funcionalidades IA (CV o carta) | Malo | Saturado y caro de servir |
| **B2B escuelas/asociaciones** (licencia anual del radar, informe de empresas que contratan) | Mejor ticket | Ventas lentas; necesita producto probado |
| Empleadores (destacados, patrocinio del calendario) | Posible con audiencia | Hace falta tráfico; riesgo de perder neutralidad |
| Afiliación (cursos de idiomas, alojamiento, seguros para prácticas) | Complementario | Ingresos bajos |

## 4. Propuesta de precios a **probar** (no recomendada todavía)

- Gratis: radar con filtros básicos, fichas con enlace al portal oficial, 1 alerta semanal y el calendario público.
- "Temporada" (precio a testar entre 9 y 19 € por 3 meses): alertas diarias, recordatorios de apertura y cierre de convocatorias, filtros de elegibilidad avanzados y seguimiento de candidaturas.
- B2B piloto: gratuito para 1–2 escuelas a cambio de difusión y datos de uso. Precio a descubrir en entrevistas (no hay referencias públicas de JobTeaser).

## 5. Ejemplo numérico (solo ilustrativo, todas las cifras son [E])

Con 1 000 usuarios activos en temporada y una conversión del 2–4 % a un pase de 12 €, los ingresos serían de **240–480 € por temporada**. Eso no paga el tiempo del fundador. El B2C solo tiene sentido como canal hacia B2B o patrocinio, o con escala mucho mayor. Esta conclusión se mantiene aunque la conversión se duplique.

## 6. Qué tiene que demostrar la validación sobre pago

1. Que ≥5 estudiantes del público objetivo **paguen** (preventa o depósito reembolsable). Decir que pagarían no cuenta.
2. Que al menos una escuela, COIE o asociación acepte un piloto con compromiso por escrito (carta de intención o acuerdo de difusión).
3. Que el precio aceptado sea coherente con los competidores (3–15 €/mes equivalentes).
