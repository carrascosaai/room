# Evaluación de la elegibilidad

Principio: el sistema **compara requisitos publicados con datos que el candidato declara**. Nunca afirma que alguien "es elegible". Cada requisito tiene uno de tres estados: ✅ coincide, ❌ incompatible o ❔ no se puede determinar.

## Qué se puede extraer del anuncio y qué necesita información del candidato

| Requisito | ¿Aparece en el anuncio? (fase 2, 93 ofertas relevantes) | Dato que necesita el candidato | Cómo extraerlo | Ambigüedad típica y tratamiento |
|---|---|---|---|---|
| Tipo de práctica (obligatoria/voluntaria) | A veces en el título ("Pflichtpraktikum"): ≥11 de 93 | ¿Tu plan de estudios exige prácticas? ¿Te las reconocen en esa empresa? | Reglas de texto multi-idioma (Pflichtpraktikum, prácticas curriculares, stage obligatoire, tirocinio curriculare) | Si no se menciona: ❔. Si dice "Pflichtpraktikum" y el plan no exige prácticas: ❌. El reconocimiento por la universidad siempre es ❔ (depende de un tercero). |
| Convenio universitario | Casi nunca | Universidad de origen | No se extrae del anuncio | Siempre ❔ con guía: "consulta a tu oficina de prácticas; con empresas extranjeras la gestión puede tardar más" (guía UCM). |
| País de residencia | Rara vez | País de residencia | Texto ("must be based in…") | Ausente → ❔. Nunca deducirlo de la ubicación de la oferta. |
| Permiso de trabajo / nacionalidad / control de exportaciones | ≥2 de 93 (Airbus: control de exportaciones; trainee Hitachi: ciudadanía UE o permiso permanente) | ¿Tienes derecho a trabajar en la UE? (sí/no/no sé) | Texto ("EU citizenship", "work permit", "export control", "ITAR/EAR") | Control de exportaciones: siempre ❔ (lo decide la empresa). Ciudadanía UE explícita + "sí" → ✅. |
| Fecha prevista de graduación / estar matriculado | ≥4 de 93 ("matriculado durante toda la práctica" en ASML) | Fecha prevista de titulación | Texto ("enrolled for the entire duration", "Immatrikulation") | Si la práctica termina después de la graduación prevista y se exige matrícula: ❌. Si no hay fechas de la práctica: ❔. |
| Idioma | ≥11 de 93; además, el idioma del anuncio (31 en alemán, 17 en francés) | Idiomas y nivel MCER | Texto (B2/C1, "fließend Deutsch") + detección del idioma del anuncio | Requisito explícito y nivel inferior: ❌. Anuncio en alemán sin requisito explícito: ❔ con aviso "el anuncio está en alemán". |
| Disponibilidad y duración | Frecuente (inicio y duración en Praktika alemanes) | Fechas disponibles | Texto (Beginn, Dauer, "6 months") | Solapamiento parcial: ❔. |
| Especialidad | Frecuente ("Maschinenbau, Mechatronik oder Wirtschaftsingenieurwesen") | Titulación | Diccionario de titulaciones equivalentes ES/DE/FR/IT/EN | Lista abierta ("o similar"): ✅ solo si coincide literalmente; si no, ❔. |
| Experiencia | En puestos junior | Experiencia (meses) | Texto ("2+ years") | Se informa y no se usa para ocultar ofertas. |
| Fecha límite | 7 de 93 | — | Texto o `validThrough` | Sin fecha: "sin fecha publicada; vista activa el <fecha>". |

## Reglas contra la falsa garantía

1. La interfaz muestra la **cita literal** del requisito junto a cada estado.
2. Lenguaje obligatorio: "según los requisitos publicados" / "no podemos comprobar". Prohibido: "eres elegible", "cumples todos los requisitos".
3. ❔ nunca se agrupa con ✅ en filtros ni recuentos. Filtro por defecto: ocultar solo las ❌ explícitas.
4. Toda extracción automática se marca como "inferido". La revisión humana (min_revision_oferta en el modelo de costes) cambia la marca a "revisado".
5. Botón "este requisito está mal" en cada ficha, con registro para corregir reglas.
6. Si se usa IA para extraer requisitos: solo sobre el texto del anuncio, nunca sobre datos del usuario. La cita original siempre es visible.
7. Ningún dato del candidato (p. ej. permiso de trabajo) se comparte con empresas.

## Datos mínimos del candidato

Los 6 de [`../phase2_customers/05`](../phase2_customers/05_conceptos_prototipo.md):
- titulación;
- curso o fecha prevista de titulación;
- ¿prácticas obligatorias en tu plan?;
- idiomas y nivel;
- derecho a trabajar en la UE (sí/no/no sé);
- fechas disponibles.

No se pide nacionalidad, DNI, fecha de nacimiento ni CV.
