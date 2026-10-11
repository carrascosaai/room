# Fase 3: guion de entrevista (10–15 minutos)

**Objetivo:** reconstruir **la última vez** que la persona buscó prácticas o un primer empleo. No se pregunta qué haría en el futuro ni si le gustaría una aplicación.

## Cuotas (15 entrevistas) {#cuotas}

| Perfil (ver [01](01_segmentacion.md)) | Nº | Requisito de selección |
|---|---|---|
| P1 ∩ P3: curriculares + extranjero | 6 | Ha buscado prácticas fuera de España en los últimos 12 meses |
| P1: curriculares en España | 3 | Ha buscado prácticas curriculares en los últimos 12 meses |
| P4: recién graduado | 3 | Titulado en los últimos 24 meses; ha buscado empleo o un graduate program |
| P2/P5: extracurriculares o empresa concreta | 3 | Ha buscado en los últimos 12 meses |

**Criterio de inclusión común:** estudiante o titulado de Ing. Mecánica, Industrial, Eléctrica, Electrónica, Aeroespacial o afines, que **haya buscado de verdad** (no que "piense buscar").

**Exclusiones:**
- Amigos o familiares del fundador. Si no hay más remedio, no más de 3 y marcados en la plantilla.
- Personas que trabajan en reclutamiento o en plataformas competidoras.

## Antes de empezar (30 s, leer textualmente)

> "Gracias por tu tiempo. Estoy investigando cómo buscan prácticas y primer empleo los estudiantes de ingeniería. No te voy a vender nada. Me interesa lo que hiciste de verdad, aunque te parezca poco interesante. No hay respuestas correctas. ¿Te importa que tome notas? [Si se graba: ¿y que lo grabe solo para mis notas? Se borrará en 30 días.] Puedes parar cuando quieras."

Registra en la plantilla el consentimiento (sí/no) y si se graba.

## Bloque A — Contexto (1 min)

1. ¿Qué estudias, en qué curso estás y en qué universidad?
2. ¿Tu plan de estudios exige prácticas? ¿Ya las has hecho?

## Bloque B — La última búsqueda (5–6 min) — **el núcleo**

3. Cuéntame **la última vez** que buscaste prácticas o trabajo. ¿Cuándo fue y qué buscabas exactamente?
4. ¿Por dónde empezaste? ¿Y después?
   - Pide la **secuencia de pasos**. Repregunta "¿y luego?" hasta que termine.
5. ¿Qué webs, apps o personas usaste?
   - Anota **todas**: LinkedIn, bolsa de la universidad, JobTeaser, InfoJobs, webs de empresas, profesores, amigos…
6. ¿Cuántas ofertas llegaste a mirar y cuántas te parecieron adecuadas? ¿Cuántas solicitudes enviaste?
   - Si no recuerda la cifra, pide un orden de magnitud (1-10, 10-50, 50+).
7. ¿Cuánto tiempo te llevó, desde que empezaste hasta que encontraste algo o lo dejaste? ¿Cuántas horas a la semana, más o menos?
8. ¿Hubo alguna oferta que te interesara y descubrieras que **no podías** optar a ella? ¿Por qué? ¿Cuándo te diste cuenta, antes o después de solicitar?
   - Si dice que sí, pide el caso concreto: empresa, requisito (convenio, obligatoria, idioma, nacionalidad, fechas, experiencia) y cuánto tiempo perdió.
9. ¿Te pasó encontrar una oferta que ya estaba cerrada, o enterarte tarde de una convocatoria? Cuéntame ese caso.
10. ¿Qué fue lo más difícil o lo que más tiempo te hizo perder?
    - No sugieras opciones. Anota sus palabras textuales.

## Bloque C — Cómo lo resolvió (2–3 min)

11. ¿Cómo encontraste finalmente las prácticas o el empleo que tienes o tuviste? ¿Por qué canal concreto?
12. Para el convenio, los papeles o las dudas sobre si podías optar, ¿a quién acudiste? ¿Cuánto tardó?
13. ¿Pagaste alguna vez por algo relacionado con buscar prácticas o empleo (curso, revisión de CV, LinkedIn Premium, plataforma, agencia)? ¿Qué y cuánto?
    - Hecho pasado, no intención.
14. ¿Usas ahora alguna herramienta, hoja de cálculo o alerta para seguir ofertas o candidaturas? ¿Me la enseñas o me la describes?

## Bloque D — Cierre (1 min)

15. Si pudieras cambiar **una** cosa de cómo buscaste, ¿cuál sería?
16. ¿Conoces a alguien que esté buscando ahora y con quien debería hablar? (Referidos: mide si el tema les importa.)

Después de esta pregunta, y solo si queda tiempo, enseña los conceptos con [06_guion_presentacion.md](06_guion_presentacion.md) (3–4 min adicionales).

## Reglas para el entrevistador

- **Nunca** preguntes "¿usarías…?", "¿te gustaría…?", "¿pagarías…?" ni "¿no crees que sería útil…?".
- Pide **ejemplos concretos** ("la última vez", "cuéntame ese caso").
- Si responde en general ("normalmente…"), vuelve a la última vez.
- No expliques tu idea antes del bloque D.
- No corrijas ni valides ("ah, claro, eso es un problema"). Di "entiendo, ¿y luego?".
- El silencio es útil: espera 3 segundos antes de repreguntar.
- **Rellena la plantilla en las 2 h siguientes** a la entrevista, con 3–5 citas literales.

## Qué medir en cada entrevista (se codifica en `plantillas/entrevistas.csv`)

| Variable | Cómo se codifica |
|---|---|
| `horas_semana_busqueda` | Número declarado (o punto medio del rango) |
| `semanas_busqueda` | Número |
| `n_canales` | Número de canales distintos usados |
| `n_webs_corporativas` | Número declarado (rango si no recuerda) |
| `caso_inelegible` | sí / no (pregunta 8, con caso concreto) |
| `motivo_inelegible` | convenio / solo_obligatorias / idioma / permiso_nacionalidad / fechas / experiencia / otro |
| `caso_cerrada_o_tarde` | sí / no (pregunta 9, con caso concreto) |
| `mayor_dolor` | Cita literal + código (descubrimiento / elegibilidad / plazos / candidatura / respuesta_empresa / papeles / otro) |
| `pago_previo` | sí / no + importe y concepto |
| `herramienta_propia` | sí / no (hoja, alertas, Notion…) |
| `referidos` | Número de contactos ofrecidos |
