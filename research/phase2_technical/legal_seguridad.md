# Seguridad y cumplimiento

Separación obligatoria:
- **[COMPROBADO]**: texto o resumen de una fuente oficial o jurídica consultada (vía buscador).
- **[CONOCIMIENTO GENERAL]**: marco jurídico conocido, no reverificado en esta sesión.
- **[ASESORAMIENTO]**: requiere a un profesional antes de actuar.

Nada de esto es asesoramiento jurídico.

## 1. Reutilización de ofertas

| Tema | Estado | Detalle |
|---|---|---|
| Derecho *sui generis* sobre bases de datos (arts. 133–137 TRLPI; Directiva 96/9/CE) | [COMPROBADO] | El fabricante puede prohibir la extracción o reutilización de la totalidad o de una **parte sustancial** de la base. El usuario legítimo puede extraer partes **no sustanciales** (art. 134). |
| Metabuscadores de ofertas de empleo | [COMPROBADO] | TJUE C-202/12 *Innoweb* (2013) y C-762/19 *CV-Online Latvia* (2021): reutilizar bases de anuncios mediante metabuscadores puede infringir el derecho *sui generis* si perjudica la inversión del fabricante. **Implicación:** no extraer de bolsas o agregadores de terceros (InfoJobs, StepStone, JobTeaser, workingstudentjobs.de) sin acuerdo. |
| Ofertas en el sitio del propio empleador | [ASESORAMIENTO] | El riesgo *sui generis* parece menor (la "base" es la del propio empleador y el uso enlaza y le envía candidatos), pero no está resuelto por la jurisprudencia citada. Hay que revisar los términos de cada sitio. |
| Lever | [COMPROBADO] | Su documentación oficial dice que las ofertas publicadas son públicas y "may be scraped by third parties". |
| workingstudentjobs.de | [COMPROBADO] | Sus AGB prohíben el scraping automatizado. |
| LinkedIn | [COMPROBADO] | Prohíbe software o extensiones que automaticen o extraigan datos. |
| Propiedad intelectual de las descripciones | [CONOCIMIENTO GENERAL] / [ASESORAMIENTO] | Los textos de las ofertas pueden tener protección por derechos de autor. Mitigación: almacenar metadatos y un extracto breve de requisitos citado, enlazar al original y no republicar la descripción completa. |
| Términos de uso de cada sitio | [ASESORAMIENTO] | Un incumplimiento contractual puede existir aunque no haya infracción de derechos de propiedad. Revisar caso a caso (campo `terminos_revisados`). |

## 2. Protección de datos (RGPD / LOPDGDD)

| Tema | Estado | Detalle |
|---|---|---|
| Datos personales dentro de las ofertas (nombre o correo del reclutador) | [CONOCIMIENTO GENERAL] | Son datos personales. Se descartan al ingerir (minimización). |
| Recogida de datos públicos en internet | [COMPROBADO] | La CNIL (fichas de junio de 2025, actualizadas en enero de 2026) considera el interés legítimo como base habitual para el moissonnage, con medidas adicionales y un test de ponderación. Son recomendaciones no vinculantes y referidas a IA. No se encontró guía específica de la AEPD. |
| Datos de usuarios (perfil de 6 datos, correo) | [CONOCIMIENTO GENERAL] | Base: ejecución del servicio; comunicaciones comerciales con consentimiento separado. Información (arts. 13–14), derechos ARSOPL, registro de actividades y encargados con DPA y región UE. |
| "Derecho a trabajar en la UE" | [ASESORAMIENTO] | No es una categoría especial del art. 9, pero puede revelar nacionalidad o estatus migratorio. Pedirlo como sí/no/no sé, de forma opcional, con su finalidad explicada, y no compartirlo nunca. |
| CV y documentos | Decisión de diseño | No se almacenan en el MVP. |
| Decisiones automatizadas (art. 22) | [ASESORAMIENTO] | Mostrar ✅/❌/❔ es información, no una decisión con efectos jurídicos. Aun así: transparencia sobre la lógica y posibilidad de corregir. |
| AI Act, Anexo III, punto 4 | [ASESORAMIENTO] | El reclutamiento (incluidos los anuncios dirigidos) es de alto riesgo. La fecha de aplicación sigue pendiente de verificar en el DOUE. Evitar puntuar a candidatos y no ofrecer a empresas rankings de estudiantes. |

## 3. Seguridad del almacenamiento

- Base de datos en la región UE, con RLS por usuario.
- Claves de servicio solo en los secretos de CI, nunca en el cliente.
- Copias de seguridad cifradas por el proveedor.
- Registros de ingesta sin datos personales.
- Exportación y borrado de cuenta desde la propia interfaz.
- Retención: cuentas inactivas más de 18 meses, aviso y borrado.
- Ofertas cerradas: conservar metadatos 12 meses para estadística y luego agregar o anonimizar.

## 4. Cuestiones que requieren asesoramiento profesional antes de lanzar

1. Uso del JSON público de Workday y de portales propios sin permiso explícito (términos de cada empresa).
2. Si la agregación de ofertas de empleadores para estudiantes requiere algún régimen (p. ej. agencia de colocación) cuando solo se enlaza.
3. Textos legales (aviso legal, privacidad, condiciones) y comunicaciones comerciales identificables si hay ofertas patrocinadas (LSSI).
4. Encaje en el AI Act si se añade personalización.
5. Cobros recurrentes a consumidores (si se valida el modelo A).
