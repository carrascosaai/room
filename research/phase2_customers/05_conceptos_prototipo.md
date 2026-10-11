# Fase 4: prototipo conceptual y dos conceptos alternativos

Se enseña **sin programar**: 3 pantallas estáticas por concepto, hechas a mano en Figma, Canva o diapositivas, más una hoja de cálculo con ofertas **reales** de `../phase2_market/data/offers.csv` (relevantes, con URL). No hay ofertas inventadas; si una se usa como ejemplo y está cerrada, se dice.

## Concepto A — Radar de ofertas industriales verificadas

| Aspecto | Descripción |
|---|---|
| Problema | "Las prácticas de ingeniería en empresas industriales están repartidas en decenas de webs y no sé cuáles siguen abiertas." |
| Información | Lista de prácticas, graduate programs y puestos junior de ~50–150 empresas industriales (ES, DE, FR, NL, IT). Cada ficha muestra empresa, título, ciudad/país, tipo, idioma de la oferta, **"vista activa por última vez: fecha"**, enlace a la web oficial y la plataforma de origen. |
| Cómo decide si encaja | Solo con **filtros que elige el usuario**: país, titulación, tipo, idioma. No evalúa al candidato. |
| Diferencia frente a un buscador | Solo empresas industriales; fuente oficial y fecha de verificación visibles; duplicados agrupados (la fase 2 encontró un 21 % de URLs redundantes). |
| Pantallas | (1) lista filtrada; (2) ficha con fuente y fecha; (3) alerta semanal por correo. |

## Concepto B — Asistente que encuentra oportunidades y determina la elegibilidad

| Aspecto | Descripción |
|---|---|
| Problema | "Encuentro ofertas, pero no sé si puedo optar ni cuándo cierran, y pierdo tiempo solicitando donde no encajo." |
| Información | Lo mismo que A, más una **comprobación de requisitos** por oferta y un **calendario** de convocatorias. |
| Cómo decide si encaja | El usuario da 6 datos: titulación; curso o fecha prevista de titulación; ¿prácticas obligatorias en tu plan? (sí/no); idiomas y nivel; derecho a trabajar en la UE (sí/no/no sé); fechas disponibles. Cada requisito **explícito** de la oferta se compara con esos datos y se muestra uno de tres estados: ✅ **cumple** (el requisito está escrito y el dato coincide), ❌ **no cumple** (requisito escrito incompatible) o ❔ **no se puede determinar** (requisito ausente, ambiguo o que depende de terceros, como el convenio). Nunca dice "eres elegible". Dice "estos requisitos publicados coinciden con lo que nos dijiste; estos no se pueden comprobar". |
| Ejemplo real (fase 2) | Continental, "Pflichtpraktikum Process Development Tire Assembly" (Hannover) → requisito "solo prácticas obligatorias": ✅ si su plan exige prácticas, ❌ si no. Convenio con su universidad: ❔ ("pregunta a tu oficina de prácticas; la gestión con empresas extranjeras puede tardar más de un mes"). |
| Diferencia frente a un buscador | Explica por qué una oferta **no** es para ti antes de solicitar. Añade calendario y recordatorios. Orientación en español sobre convenio y Pflichtpraktikum. |
| Pantallas | (1) perfil de 6 datos; (2) ficha con la lista ✅/❌/❔ y la cita del requisito original; (3) calendario de convocatorias con aviso. |

## Comparación que deben permitir las entrevistas

| Pregunta | Cómo se observa (no se pregunta "¿te gusta?") |
|---|---|
| ¿Qué concepto conecta con el dolor que contó en el bloque B? | Si el dolor principal fue elegibilidad o plazos, ¿reacciona a B mencionando su propio caso? |
| ¿Qué haría a continuación? | Tras ver ambos, se le pide elegir uno para recibir la primera versión real (prueba de compromiso de [07](07_experimento_precios.md)). |
| ¿Qué falta o sobra? | "¿Qué de esto no te habría servido en tu última búsqueda?" |
| Comprensión de ❔ | ¿Entiende que ❔ no es un "no"? Riesgo de falsa garantía. |

## Límites honestos que hay que comunicar al usuario

- B no garantiza la elegibilidad. Solo compara requisitos **publicados**. La decisión final es de la empresa y de la universidad.
- La cobertura es de un número limitado de empresas, no "todas las ofertas".
- Las candidaturas se completan en la web oficial. No se envían en nombre del usuario.
