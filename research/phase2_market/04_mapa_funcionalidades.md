# Mapa de funcionalidades que ya existen en el mercado

Fecha: 2026-10-11. Datos en [data/feature_map.csv](data/feature_map.csv). Valores: **sí** · **parcial** · **no** · **NV** (no verificado: la web no se pudo abrir). [C] = declarado por el propio competidor; [H] = observado en datos; [T] = afirmado por terceros.

| Funcionalidad | workingstudentjobs.de | JobTeaser | iAgora | EUInternships | Stag-io | Simplify | HiringCafe | Graduateland | LinkedIn | Bolsas univ. | Talentoteca | Interstride | Extensiones autofill |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Agrega desde webs corporativas/ATS | sí [C] | no | NV | NV | sí [C] | sí [H] | sí [T] | sí [C] | parcial | no | no | NV | parcial |
| Foco en prácticas/inicio de carrera | sí | sí | sí | sí | sí | sí | no | sí | filtro | sí | sí | no | parcial |
| Cobertura España | no | parcial | sí | NV | NV | no [H] | NV | NV | sí | sí (local) | sí | NV | no |
| Cobertura DE/FR/IT/NL | DE | sí | sí | sí | NV | casi no [H] | NV | sí [C] | sí | por país | no | sí | no |
| Filtro prácticas obligatorias vs voluntarias | NV | NV | NV | NV | NV | no | no | NV | no | implícito | NV | no | no |
| Filtro de idioma | NV | NV | parcial | NV | NV | no | sí [T] | NV | no | NV | NV | NV | no |
| Filtro de permiso o visado | NV | NV | NV | NV | NV | campo vacío [H] | sí [T] | NV | no | no | no | **sí** | no |
| Alertas | sí [C] | sí | NV | NV | no | sí | NV | NV | sí | correo | NV | NV | sí |
| Seguimiento de candidaturas | NV | NV | NV | NV | no | sí | NV | NV | parcial | parcial | NV | NV | sí |
| Autocompletado | no | no | no | no | no | sí | no | no | Easy Apply | no | no | no | sí |
| Calendario de convocatorias | no | eventos | no | no | no | no | no | no | no | no | no | no | no |
| Gratis para el estudiante | sí | sí | sí | sí | sí | sí (núcleo) | sí | sí | sí | sí | sí | vía universidad | freemium |

## Lectura

- **Commodity** (varios actores, gratis): agregación desde ATS, alertas, seguimiento, autocompletado y gratuidad para el estudiante.
- **Cubierto por país, no entre países**: el foco en prácticas existe en cada mercado (workingstudentjobs.de, JobTeaser, AlmaLaurea, Magnet.me, Talentoteca), pero no se vio ninguno que una DE+FR+IT+NL+ES con orientación para un estudiante español.
- **No observado en ningún competidor** (con la limitación de las NV):
  - Filtro de prácticas obligatorias vs voluntarias y de compatibilidad con el convenio de la universidad de origen.
  - Calendario de convocatorias de graduate programs.
- **Riesgo:** muchas celdas son NV. Basta abrir 3 webs (workingstudentjobs.de, JobTeaser, iAgora) para que el mapa cambie. Es la primera tarea de [08_incertidumbres.md](08_incertidumbres.md).
