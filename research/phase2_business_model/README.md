# Modelos de negocio

Fecha: 2026-10-11. **Ningún escenario es una previsión.** Los supuestos sin fuente están marcados en [escenarios.xlsx](escenarios.xlsx) (hoja *Supuestos*, celdas amarillas) y deben sustituirse por datos de validación (`../phase2_customers/`, `../phase2_growth/`).

## Archivos

| Archivo | Contenido |
|---|---|
| [modelos.csv](modelos.csv) | Comparativa de los modelos A–G |
| [precios_competidores.csv](precios_competidores.csv) | 19 referencias de precios con fuente, nivel de evidencia y fecha |
| [escenarios.xlsx](escenarios.xlsx) | Hoja de cálculo editable: *Supuestos* → *B2C_usuarios*, *B2B_clientes*, *PyG*. Fórmulas verificadas recalculando con LibreOffice. |
| [escenarios_resultados.csv](escenarios_resultados.csv) | Los mismos cálculos en texto (lo genera `scripts/build_escenarios.py`) |
| [experimentos_pago.md](experimentos_pago.md) | Experimentos para comprobar si alguien paga |

## 1. Qué hacen los competidores (con fuentes en `precios_competidores.csv`)

- **Quien paga en este mercado es la empresa.**
  - InfoJobs: 49 € la primera oferta.
  - StepStone: 1.449 € por 30 días.
  - LinkedIn: unos 10 $ al día como mínimo.
  - Indeed: pago por clic o por candidatura.
  - iAgora: desde 23 €; EUInternships: 20–39 €.
  - Talentoteca: 400 €/año más el 12 % de la beca.
  - Headhunting: 15–33 % del salario.
- **Los estudiantes europeos no pagan.** JobTeaser, workingstudentjobs.de, iAgora, EUInternships, las bolsas universitarias y Talentoteca son gratis para ellos. Los productos de pago para candidatos (Simplify+ 39,99 $, Teal 29 $, Huntr 40 $, Glever 10 $) son estadounidenses y venden IA o automatización.
- **Las universidades** reciben JobTeaser gratis. Los proveedores de pago (Symplicity, con una licencia de £12.050 en G-Cloud; Interstride) son grandes y venden a universidades anglosajonas.

## 2. Comparativa (resumen de `modelos.csv`)

| Modelo | Cliente que paga | Beneficio que recibe | Evidencia de pago | Para 1.000 €/mes | ¿Sin inversión? | ¿Acuerdos difíciles? |
|---|---|---|---|---|---|---|
| A. Premium estudiante | Estudiante | Tiempo, no perder plazos | Baja (competencia gratuita) | 10.000 usuarios → 600 €/mes en temporada (base) | Sí | No |
| B. Gratis + empresas pagan por publicar | Pyme industrial | Candidatos de ingeniería a bajo coste | Media (precios públicos de 20–49 €) | 23 empresas (base) | Sí (concierge) | No |
| C. Captación B2B | Empresa industrial | Contratación sin esfuerzo de RR. HH. | Media (headhunting) | 8 empresas (base) | Sí, pero absorbe al fundador | Grandes empresas sí |
| D. Patrocinadas | Empresa | Visibilidad en el segmento | Media | 17 empresas (base) | Sí | No |
| E. Universidad | Universidad/COIE | Empleabilidad internacional | Baja (JobTeaser gratis) | 8 centros (base) | No | **Sí** |
| F. Tracker | Estudiante | Organización | Baja (commodity) | No llega con 10.000 usuarios | Sí | No |
| G. Híbrido B/D + E como canal | Empresa | — | Solo si B/D se validan | Ver PyG | Parcial | Parcial |

## 3. Ingresos con 100, 1.000 y 10.000 usuarios (modelos A y F, anual)

| Usuarios | A conservador | A base | A optimista | F base |
|---|---|---|---|---|
| 100 | 1,8 € | 18 € | 135 € | 19 € |
| 1.000 | 18 € | 180 € | 1.350 € | 192 € |
| 10.000 | 180 € | 1.800 € | 13.500 € | 1.920 € |

Supuestos de A en el escenario base:
- 40 % de los registrados activos;
- 3 % de los activos pagan;
- 5 €/mes;
- 3 meses pagados al año.

**Incluso con 10.000 usuarios, el B2C no paga un sueldo.**

## 4. Clientes empresariales necesarios (facturación mensual)

| Modelo | ARPA/mes (base) | 1.000 € | 5.000 € | 10.000 € | Rango conservador–optimista para 1.000 € |
|---|---|---|---|---|---|
| B publicación (30 €/oferta × 1,5/mes) | 45 € | 23 | 112 | 223 | 50 – 7 |
| C colocación (800 € × 2/año) | 133 € | 8 | 38 | 75 | 40 – 3 |
| D patrocinadas (60 €/mes) | 60 € | 17 | 84 | 167 | 34 – 5 |
| E universidad (1.500 €/año) | 125 € | 8 | 40 | 80 | 25 – 4 |

## 5. Coste de captar usuarios y clientes (estimaciones, sin datos propios)

- **Usuario estudiante:**
  - Canales orgánicos (asociaciones, delegaciones, comunidades): 0 € en dinero, pero tiempo del fundador.
  - Anuncios: LinkedIn, 1,5–4,5 $ por clic [T]. TikTok exige un mínimo de 20 $/día por grupo de anuncios [H, ayuda de TikTok].
  - Con una conversión de visita a registro **hipotética** del 5–20 %, el coste por registro de pago saldría entre 8 y 90 €. Es incompatible con un ingreso por usuario de céntimos o pocos euros al año (modelo A).
- **Cliente empresa:** venta directa del fundador.
  - Hipótesis a medir en `experimentos_pago.md`: 20–40 contactos y 3–6 horas de reuniones por cliente.
  - A 15 €/h de coste de oportunidad, el coste de captación sería de unos 45–90 € más el tiempo de preparación.

## 6. Coste de mantener las ofertas actualizadas y comprobar su autenticidad

Lo calcula `../phase2_technical/` (`data/coste_resultados.csv`).

Orden de magnitud con 30 empresas: **27–59 horas al mes del fundador** (optimista–conservador). Con 50 empresas: 45–99 h/mes. Equivale a **unos 440–900 € al mes** valorando la hora a 15 €, es decir, **1,2–15 € por oferta activa y mes**. Es el coste dominante, muy por encima de las herramientas (5–80 €/mes). La causa es que ninguna de las 30 grandes industriales de la muestra tiene API pública documentada a nivel de grupo.

## 7. Cuenta de resultados (hoja *PyG*, autónomo persona física)

| Concepto | Conservador | Base | Optimista |
|---|---|---|---|
| Clientes supuestos | 3 B + 2 D + 1 C + 0 E + 300 usuarios | 10 B + 6 D + 4 C + 1 E + 1.500 usuarios | 20 B + 10 D + 6 C + 2 E + 6.000 usuarios |
| **Facturación anual** | 1.745 € | 17.890 € | 102.380 € |
| Gastos (herramientas, gestoría, cuota de autónomos, publicidad, comisiones) | 1.176 € | 3.760 € | 12.791 € |
| **Beneficio antes de impuestos** | 569 € | 14.130 € | 89.589 € |
| IRPF estimado (10/15/20 % efectivo, simplificado) | 57 € | 2.119 € | 17.918 € |
| **Beneficio neto** | 512 € | 12.010 € | 71.671 € |
| **Sueldo del fundador** (en un autónomo es el beneficio neto) | 512 €/año | 12.010 €/año (~1.000 €/mes) | 71.671 €/año |
| €/hora implícito (horas de mantenimiento + comerciales) | 0,4 €/h | 12 €/h | 89 €/h |

**Lectura:**
- El escenario base ya exige **21 clientes de pago y 1.500 usuarios**, y aun así deja un sueldo de unos 1.000 €/mes.
- El optimista exige 38 clientes y 6.000 usuarios en un nicho cuyo SAM transfronterizo en España es de unos 21–32 mil estudiantes (fase 2).
- Ninguno está validado.
- La fiscalidad es simplificada: la cuota de autónomos se trata como gasto y el IRPF como tipo efectivo. No es asesoramiento fiscal.

## 8. Dificultades por modelo

| Modelo | Legales | Técnicas | Comerciales |
|---|---|---|---|
| A, F | Cobros recurrentes a consumidores (información previa, desistimiento) | Bajas | Competencia gratuita; uso estacional |
| B, D | Las comunicaciones comerciales deben ser identificables (marcar "patrocinado"; LSSI, verificar); no vender datos de estudiantes | Backoffice de publicación y moderación | Sin audiencia previa no hay nada que vender; pymes con poco presupuesto de selección |
| C | Posible régimen de **agencia de colocación** en España (declaración responsable; Ley 3/2023 de Empleo — **verificar con un profesional**); RGPD reforzado (CV de candidatos, cesión a empresas con consentimiento) | Gestión de candidatos | Venta consultiva; cobro condicionado a contratación |
| E | Contratación pública; contrato de encargado del tratamiento | Integración con JobTeaser, ICARO o bolsas propias | Ciclos de 6–12 meses (supuesto); competencia gratuita |

## 9. ¿Hay conflicto entre ser gratis para el estudiante y cobrar a las empresas?

**Sí, potencial, y es gestionable si se hace explícito:**
- **Incentivo a mostrar lo que paga y no lo que encaja.** Mitigación:
  - la ordenación por elegibilidad y relevancia nunca depende del pago;
  - las ofertas patrocinadas se etiquetan;
  - el filtro ✅/❌/❔ se aplica igual a ofertas pagadas y no pagadas.
- **Incentivo a "vender" estudiantes** (datos o CV) a empresas. Mitigación:
  - ningún dato personal se comparte sin una acción explícita del estudiante (solicitar o "compartir perfil con X");
  - consentimiento separado y revocable.
- **Incentivo a inflar el volumen** de ofertas o candidatos. Mitigación: mostrar el número real de empresas cubiertas y la fecha de verificación de cada oferta.
- **El conflicto es mayor en C (colocación):** cobrar por contratación empuja a orientar a los estudiantes hacia las empresas que pagan. Por eso C no se recomienda como modelo inicial.

## 10. Modelo recomendado y razones para descartarlo

**Probar primero: B/D en modo concierge.** Empresas industriales medianas pagan una pequeña cantidad por difundir sus prácticas o puestos junior a una audiencia de estudiantes de ingeniería cualificada. Los estudiantes no pagan.

Por qué:
- Es donde el mercado **ya paga** (precios públicos de 20–49 € por oferta).
- No compite con la gratuidad para el estudiante.
- No depende de acuerdos con universidades ni con grandes empresas.
- Se puede probar sin código: una hoja de ofertas, una newsletter y una factura manual.

En paralelo, y sin coste adicional, se mide A con el experimento de `../phase2_customers/07`.

**Razones para descartarlo si no hay evidencia:**
- Ninguna pyme paga tras 30 contactos cualificados.
- La audiencia no supera unos 200 estudiantes activos (sin audiencia, B/D no tienen valor).
- Las empresas solo quieren grandes volúmenes de candidatos, que ya les dan InfoJobs o LinkedIn.
- El tiempo de mantenimiento de datos supera 40 h/mes para menos de 500 €/mes de facturación.

## 11. Conclusión: con menos de 1.000 € y un solo fundador

**Qué probaría primero:** el modelo **B/D concierge**. Durante 60 días:
1. Construir una audiencia de estudiantes con el plan de `../phase2_growth/` (≤300 € de presupuesto).
2. Contactar a 30 pymes industriales españolas que publican prácticas en InfoJobs o en bolsas universitarias. Ofrecer difundir su oferta a la audiencia por 30–49 € por oferta, y gratis para las 3 primeras como piloto, midiendo candidaturas.
3. Facturar a mano.

**Resultado mínimo para seguir invirtiendo** (todos a los 60 días):
- **≥3 empresas que pagan** (≥30 € cada una) **o** 1 empresa que paga ≥300 €;
- **≥200 estudiantes activos** (abren ≥2 de 3 envíos);
- **≥10 candidaturas** atribuibles a las ofertas difundidas, confirmadas por las empresas;
- tiempo de mantenimiento real ≤30 h/mes, medido según `../phase2_technical/protocolo_prueba.md`.

Si no se cumplen, se descarta el modelo. Y, salvo que `../phase2_customers/` muestre intención de pago fuerte del estudiante, se descarta el proyecto como negocio (NO-GO).
