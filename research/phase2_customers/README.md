# Validación de clientes

Fecha de preparación: 2026-10-11.

**Estado: preparado, no ejecutado.** No se ha entrevistado a nadie. El asistente que preparó estos materiales no puede contactar con personas. Ninguna cifra de este directorio procede de usuarios propios. Donde hay huecos para resultados, se marcan con `[[RESULTADO]]`.

## Objetivo

Determinar si existe un problema lo bastante importante para que estudiantes de ingeniería usen una plataforma especializada en **descubrir ofertas relevantes y comprobar su elegibilidad**.

## Contenido

| Archivo | Qué es |
|---|---|
| [01_segmentacion.md](01_segmentacion.md) | 5 perfiles y cuál parece más urgente (hipótesis con evidencia pública) |
| [02_evidencia_publica.md](02_evidencia_publica.md) · [evidencia_fuentes.csv](evidencia_fuentes.csv) | Lo que dicen las fuentes públicas sobre el problema, separado por nivel de evidencia |
| [03_guion_entrevista.md](03_guion_entrevista.md) | Guion de 10–15 min, centrado en comportamientos pasados, para 15 estudiantes |
| [04_formulario_registro.md](04_formulario_registro.md) | Formulario de captación y cribado de entrevistados, con texto RGPD |
| [05_conceptos_prototipo.md](05_conceptos_prototipo.md) | Prototipo conceptual sin código: concepto A (radar) y B (asistente de elegibilidad) |
| [06_guion_presentacion.md](06_guion_presentacion.md) | Cómo enseñar los conceptos sin sesgar al entrevistado |
| [07_experimento_precios.md](07_experimento_precios.md) | Prueba de 0/3/5/9 € al mes con compromiso real y sin cobrar por algo inexistente |
| [08_criterios_decision.md](08_criterios_decision.md) | Criterios GO/PIVOT/NO-GO fijados **antes** de entrevistar |
| [plantillas/](plantillas/) | Registro de entrevistas (CSV), codificación, resultados de precios y plantilla del informe |
| [scripts/analizar.py](scripts/analizar.py) | Calcula las métricas de decisión cuando existan datos reales |

## Resumen de la preparación

- **Perfil prioritario para entrevistar** (hipótesis): estudiante de 3.º–4.º curso o de máster que **necesita prácticas curriculares y se plantea hacerlas en otro país europeo**.
  - Combina urgencia: la necesita para titularse y tiene plazos.
  - Combina complejidad que nadie resuelve hoy: convenio con empresa extranjera, Pflichtpraktikum, idioma, plazos.
  - Ver [01_segmentacion.md](01_segmentacion.md).
- **Evidencia pública disponible:**
  - Indicios consistentes de **fragmentación, plazos y requisitos difíciles de identificar** (documentación universitaria, guías Erasmus, reglas alemanas de salario mínimo, ofertas reales de la fase 2).
  - **Ninguna medición** del tiempo que pierden los estudiantes españoles ni de su disposición a pagar.
- **Decisión:** pendiente de las 15 entrevistas y del experimento de precios. Los umbrales están fijados en [08_criterios_decision.md](08_criterios_decision.md).

## Cómo ejecutar (para el fundador)

1. Publica el formulario de [04](04_formulario_registro.md) en un formulario gratuito (Tally o Google Forms) y difúndelo según `../phase2_growth/`.
2. Selecciona 15 personas con las cuotas de [03](03_guion_entrevista.md#cuotas).
3. Entrevista con el guion. Rellena `plantillas/entrevistas.csv` el mismo día, con citas literales.
4. Al final de cada entrevista, enseña los conceptos A y B con [06](06_guion_presentacion.md).
5. Ejecuta el experimento de precios de [07](07_experimento_precios.md) con la lista de espera.
6. Ejecuta `python3 research/phase2_customers/scripts/analizar.py` y decide con [08](08_criterios_decision.md).
