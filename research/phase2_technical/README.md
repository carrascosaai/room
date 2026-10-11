# Auditoría técnica y legal del sistema de datos de ofertas

Fecha: 2026-10-11. Pregunta: **¿es técnica y económicamente sostenible recopilar, verificar y mantener ofertas de prácticas de ingeniería con un solo fundador?**

**Limitación principal:** el entorno bloquea el acceso HTTP salvo a GitHub. La documentación oficial de Lever se **leyó** (está en GitHub). El resto se verificó con fragmentos indexados por el buscador. **La medición en vivo de las 30 empresas no se pudo ejecutar.** Está preparada en [protocolo_prueba.md](protocolo_prueba.md) y las columnas de resultado figuran como DESCONOCIDO, no como cero.

## Entregables

| Archivo | Contenido |
|---|---|
| [data/matriz_fuentes.csv](data/matriz_fuentes.csv) | 10 tipos de fuente: acceso permitido, limitaciones, información obtenible, detección de cierres, coste |
| [data/inventario_apis.csv](data/inventario_apis.csv) | 21 APIs o fuentes, con documentación oficial y nivel de verificación |
| [data/empresas_30.csv](data/empresas_30.csv) | 30 empresas: ATS, método recomendado, categoría, cierre, ofertas indexadas en la fase 2 y estado de la medición |
| [data/endpoints_30.csv](data/endpoints_30.csv) | Entrada para `research/scripts/ats_probe.py` (7 empresas con conector automatizable) |
| [data/coste_inputs.csv](data/coste_inputs.csv) · [scripts/coste_operativo.py](scripts/coste_operativo.py) · [data/coste_resultados.csv](data/coste_resultados.csv) | Coste operativo reproducible |
| [protocolo_prueba.md](protocolo_prueba.md) | Cómo medir; desconocido frente a negativo; reglas de cierre |
| [elegibilidad.md](elegibilidad.md) | Qué requisitos se extraen del anuncio y cuáles necesitan datos del candidato; reglas contra la falsa garantía |
| [legal_seguridad.md](legal_seguridad.md) | RGPD, *sui generis*, propiedad intelectual y términos de uso; comprobado frente a asesoramiento |
| [arquitectura.md](arquitectura.md) | Arquitectura mínima viable |
| [riesgos.md](riesgos.md) | Riesgos y alternativas |

## Hallazgos

1. **APIs oficiales verificadas:**
   - Lever: GET público. Su doc. dice que las ofertas publicadas "may be scraped by third parties". Filtro `commitment=Intern`. El POST exige la clave del cliente.
   - Greenhouse: GET público; POST con la clave del cliente.
   - SuccessFactors: feeds XML por proveedor, que habilita el cliente.
   - Personio: feed XML que activa la empresa.
   - Teamtailor: clave Public read creada por la empresa.
   - Workday: API SOAP `Get_Job_Postings` solo con credenciales del tenant.
   - Oracle: endpoints internos o solo para partners.
   - France Travail: API oficial con registro.
   - **Sin API oficial encontrada:** Ashby y Recruitee (solo terceros), Avature, iCIMS, EURES y la Bundesagentur (endpoint comunitario).
2. **En la muestra de 30 industriales, ninguna tiene a nivel de grupo un ATS con API pública documentada** (Lever, Greenhouse o Ashby):

   | Categoría | Empresas |
   |---|---|
   | A/B (Bosch, SmartRecruiters, por verificar) | 1 |
   | B/C (patrón SuccessFactors) | 3 |
   | C (Workday ×6, Avature ×2, portales propios ×3) | 11 |
   | C/D (Teamtailor) | 1 |
   | M (manual) | 4 |
   | Sin identificar | 10 |

3. **Ofertas ya observadas** (fase 2, vía buscador, no verificadas en vivo) de estas 30 empresas:
   - 89 ofertas, 74 de ellas relevantes.
   - 24 URLs redundantes: **21 % de duplicación**.
   - Solo **6 de 74 relevantes (8 %) con fecha límite publicada**.
4. **Ofertas activas verificadas:** 0, porque **no se midió**. No es un resultado negativo.
5. **Coste operativo** (`data/coste_resultados.csv`; estimaciones de tiempo sin medir):

   | Escenario | Horas/mes (30 empresas) | Horas/mes (50 empresas) | €/mes (hora a 15 €) | € por empresa y mes | € por oferta activa y mes |
   |---|---|---|---|---|---|
   | Conservador | 59 | 99 | 897 | 30 | 15 |
   | Base | 42 | 69 | 653 | 22 | 3,6 |
   | Optimista | 27 | 45 | 437 | 15 | 1,2 |

   Las horas vienen sobre todo del **mantenimiento de fuentes C y manuales**. La infraestructura es de 5–30 €/mes.
6. **Elegibilidad:** se puede extraer de los anuncios el tipo de práctica, el idioma, la matrícula, la disponibilidad y, a veces, el permiso de trabajo. El convenio con la universidad y el control de exportaciones **siempre** quedan como ❔. Ver [elegibilidad.md](elegibilidad.md).

## Criterios objetivos de sostenibilidad para un solo fundador

Se evalúan **después** de ejecutar [protocolo_prueba.md](protocolo_prueba.md) con tiempos reales.

| Criterio | Umbral para "sostenible" | Estado |
|---|---|---|
| S1. Horas/mes de mantenimiento para 30 empresas (medidas) | ≤ 30 h | Estimación 27–59 h: **probablemente no se cumple** sin reducir el alcance |
| S2. % de empresas accesibles por una vía permitida (A/B/C con términos compatibles o M) | ≥ 70 % | Pendiente |
| S3. % de empresas con conector automatizable (A/B/C con términos OK) | ≥ 50 % | Hasta 16/30 (53 %) si todas las C resultan compatibles; pendiente de revisar términos |
| S4. Cierres detectados con evidencia sobre cierres totales | ≥ 80 % | Pendiente |
| S5. Falsos cierres | 0 en la prueba | Pendiente |
| S6. Ofertas con frescura ≤ 7 días | ≥ 90 % | Pendiente |
| S7. Conectores rotos al mes | ≤ 2 | Pendiente |
| S8. Ofertas relevantes activas en las 30 empresas | ≥ 60 (para que la newsletter tenga valor semanal) | Pendiente (74 relevantes indexadas, no verificadas) |
| S9. Infraestructura | ≤ 30 €/mes | Se cumple según precios publicados [T] |

**Decisión:**
- Sostenible si se cumplen S1, S2, S4, S5 y S8.
- Si falla S1 pero S2–S8 se cumplen: reducir a las empresas automatizables y dejar el resto como "enlace + alerta de la empresa".
- Si fallan S2 o S8: el sistema de datos no sostiene el producto, y se plantea PIVOT a acuerdos con empresas o universidades (fuentes B/D).

## Conclusión provisional

Técnicamente es **viable para un número pequeño de empresas** (≈15–30), con conectores por ATS (Workday público, SuccessFactors y feeds) y revisión manual del resto. **Económicamente es frágil:** el mantenimiento estimado (27–59 h/mes) consume la mayor parte del tiempo de un fundador que además debe captar usuarios y clientes. La fuente más sostenible a largo plazo son los **feeds que las propias empresas habilitan** (B), lo que convierte la captación de datos en un asunto comercial.
