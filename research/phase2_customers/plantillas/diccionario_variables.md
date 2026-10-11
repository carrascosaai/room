# Diccionario de variables

## entrevistas.csv (una fila por entrevista; rellenar en las 2 h siguientes)
| Columna | Valores |
|---|---|
| consentimiento, grabada, amigo_o_familiar | si / no |
| perfil_principal | P1 / P2 / P3 / P4 / P5 (ver 01_segmentacion.md) |
| segmento_principal_P1P3 | si si necesita prácticas curriculares y ha buscado fuera de España |
| canales_usados | lista separada por `;` (linkedin;bolsa_uni;jobteaser;infojobs;web_empresa;contactos;profesor;otro) |
| horas_semana_busqueda, semanas_busqueda, n_* | número (punto medio si dio un rango); vacío si no lo sabe (no poner 0) |
| caso_inelegible, caso_cerrada_o_tarde | si (con caso concreto) / no / no_recuerda |
| motivo_inelegible | convenio / solo_obligatorias / idioma / permiso_nacionalidad / fechas / experiencia / otro |
| mayor_dolor_codigo | descubrimiento / elegibilidad / plazos / candidatura / respuesta_empresa / papeles / cv_entrevistas / otro |
| pago_previo, herramienta_propia, compromiso_tiempo | si / no |
| entiende_A, entiende_B | si / parcial / no |
| interpreta_desconocido_como_si | si / no (solo concepto B) |
| eleccion | A / B / ninguno |
| referidos | número |

**Regla:** si un dato no se preguntó o no se sabe, dejarlo vacío. Vacío significa "desconocido" y no cuenta como "no".

## precios.csv (una fila por persona de la lista de espera que entra en el experimento)
| Columna | Valores |
|---|---|
| precio_asignado_eur | 0 / 3 / 5 / 9 |
| E1_acepta, E1_perfil_completo, E2_visita, E2_reserva, E3_compromiso, pago_real_entrega | si / no / vacío |
| E1_respuestas_utiles_de_3 | 0–3 |
| E3_compromiso_tipo | tarjeta_sin_cargo / confirmacion_escrita |
