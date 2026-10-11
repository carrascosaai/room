# Fase 6: criterios de decisión (fijados antes de entrevistar)

Fecha de fijación: 2026-10-11. **No se modifican después de ver los resultados.** Si hay que cambiarlos, se documenta el motivo y la versión anterior.

Base de cálculo: N = entrevistas válidas (que cumplen la inclusión), objetivo 15. `scripts/analizar.py` calcula cada métrica a partir de `plantillas/entrevistas.csv` y `plantillas/precios.csv`.

## Métricas

| Código | Métrica | Fuente |
|---|---|---|
| M1 | % de entrevistados con un **caso concreto** de oferta a la que no podían optar o que descubrieron tarde | Preguntas 8–9 |
| M2 | % cuyo **mayor dolor** (P10) es descubrimiento, elegibilidad o plazos (lo que resuelven A/B) | P10 codificada |
| M3 | Mediana de horas por semana buscando | P7 |
| M4 | % que ya usa una herramienta propia (hoja, alertas) | P14 (indicio de dolor y de comportamiento) |
| M5 | % que entiende B sin ayuda **y** no interpreta ❔ como "sí" | Presentación |
| M6 | % que acepta el piloto (E1) y completa el perfil | Precios E1 |
| M7 | % de participantes del piloto que responde a ≥2 de 3 correos semanales diciendo que alguna oferta le fue útil | Precios E1 |
| M8 | Reservas con compromiso real (E3) en 3/5/9 €, en recuento | Precios E3 |
| M9 | Pagos reales cuando se entrega el servicio manual | Precios |
| M10 | Referidos ofrecidos por entrevistado (media) | P16 |

## Continuar (GO a construir un piloto manual o semiautomático)

**Todas** estas condiciones en el segmento principal (P1 ∩ P3), o en conjunto si el segmento principal tiene menos de 5 entrevistas:
- M1 ≥ 50 %
- M2 ≥ 50 %
- M5 ≥ 60 % (el concepto se entiende y ❔ no confunde)
- M6 ≥ 50 % de los entrevistados
- M7 ≥ 40 % de quienes empiezan el piloto
- **Y** al menos una de estas:
  - M8 ≥ 5 reservas con compromiso real en precios > 0 €;
  - 1 acuerdo escrito con una ORI/COIE para difundir el piloto (vía B2B de `../phase2_business_model/`).

## Cambiar de público objetivo (PIVOT)

Si en el segmento principal M1 o M2 < 30 % **pero** en otro perfil (P1, P4, P5) con ≥3 entrevistas M1 y M2 ≥ 60 %:
- repetir 10 entrevistas centradas en ese perfil antes de construir nada;
- registrar el cambio y su motivo.

Si el dolor dominante (M2) resulta ser otro distinto de descubrimiento, elegibilidad o plazos (p. ej. "las empresas no responden" o "preparar CV y entrevistas"):
- PIVOT de **problema**, no de público. A y B no lo resuelven.
- Revisar si ya está cubierto (en la fase 1, CV y autofill aparecen como commodity).

## Problema demasiado débil (NO-GO)

Cualquiera de estas condiciones:
- M1 < 30 % **y** M2 < 30 % en el conjunto de 15.
- M3 (mediana) < 1 h/semana **y** M4 < 20 %: buscan poco y no se organizan, señal de baja intensidad.
- M6 < 25 %: ni gratis aceptan dedicar tiempo.
- M7 < 20 % tras 3 envíos: el contenido no aporta valor recurrente.
- Las alternativas actuales (bolsa de la universidad, LinkedIn, workingstudentjobs.de, JobTeaser) resolvieron el caso en ≥70 % de los entrevistados sin fricción relevante.

## Intención de pago significativa

| Nivel | Evidencia | Cuenta para la decisión |
|---|---|---|
| Fuerte | ≥5 reservas E3 (medio de pago o confirmación escrita) en 3/5/9 € **y** ≥50 % de ellas paga de verdad al entregarse el servicio manual | **Sí** |
| Media | ≥15 % de clics "Reservar" en un precio > 0 € con ≥20 personas en ese grupo | Solo como indicio; no basta |
| Nula | Respuestas del tipo "pagaría X €"; selección de precio en una encuesta | **No** |
| B2B | Carta o correo firmado de una ORI, COIE o asociación comprometiéndose a difundir o pagar un piloto | Sí, como vía alternativa al pago del estudiante |

Si hay GO en problema pero **no** hay intención de pago fuerte ni B2B:
- el producto podría tener usuarios, pero no negocio;
- decisión: **PIVOT de modelo de negocio** (ver `../phase2_business_model/`) antes de invertir más.

## Plantilla de decisión (rellenar)

| Métrica | Umbral | Resultado | ¿Cumple? |
|---|---|---|---|
| M1 | ≥50 % | [[RESULTADO]] | |
| M2 | ≥50 % | [[RESULTADO]] | |
| M3 | informativa | [[RESULTADO]] | |
| M4 | informativa | [[RESULTADO]] | |
| M5 | ≥60 % | [[RESULTADO]] | |
| M6 | ≥50 % | [[RESULTADO]] | |
| M7 | ≥40 % | [[RESULTADO]] | |
| M8 | ≥5 | [[RESULTADO]] | |
| M9 | ≥50 % de M8 | [[RESULTADO]] | |
| **Decisión** | GO / PIVOT público / PIVOT problema / PIVOT modelo / NO-GO | [[RESULTADO]] | |
