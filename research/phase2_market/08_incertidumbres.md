# Incertidumbres que todavía impiden decidir

Fecha: 2026-10-11. Ordenadas por impacto en la decisión.

| # | Incertidumbre | Por qué importa | Cómo resolverla | Coste |
|---|---|---|---|---|
| 1 | **¿Pagaría alguien?** No hay ninguna evidencia de disposición a pagar de estudiantes, universidades ni empleadores por esta propuesta. | Determina si existe negocio (techo B2C UE ≈ 21 k€/año en el escenario base) | Preventa o depósito reembolsable de un pase de temporada; 5 conversaciones con ORI/COIE y 5 con pymes industriales | 0–50 € |
| 2 | **¿Cuánto tiempo pierden hoy** los estudiantes españoles buscando prácticas en el extranjero? | Es el dolor que justificaría el producto; no hay ningún dato europeo | Diario de búsqueda de 2 semanas con 15–20 estudiantes de ingeniería | 0–100 € en incentivos |
| 3 | **¿Qué filtros tienen ya** workingstudentjobs.de, JobTeaser, iAgora, EUInternships, Stag-io y HiringCafe? (obligatoria/voluntaria, idioma, fechas) | 40 % del mapa de funcionalidades es NV; si ya filtran elegibilidad, el hueco 2 desaparece | Abrir esas webs desde un navegador normal y rellenar `data/feature_map.csv` | 1–2 h |
| 4 | **¿Cuántas ofertas reales hay** en los portales oficiales de las 57 empresas? | Sin ese denominador no se puede medir la cobertura de ningún competidor | `research/scripts/ats_probe.py` (fase 1) desde un equipo con internet, más revisión manual de portales propios | 2–4 h |
| 5 | **¿Las ofertas encontradas siguen abiertas?** 62 de 93 tienen estado desconocido | Afecta a la calidad percibida de cualquier radar | Abrir las URLs de `data/offers.csv` | 1–2 h |
| 6 | **¿Qué parte de la oferta española de prácticas está solo en bolsas universitarias con acceso restringido?** | Si es grande, un agregador externo no puede verla sin acuerdos con universidades | Entrevistar a 3 COIE; contar ofertas de ingeniería en 2 bolsas públicas (UPC) en una semana | 0 € |
| 7 | **¿Puede un estudiante español hacer un Pflichtpraktikum en Alemania** con sus prácticas curriculares y convenio? | Define si el filtro "obligatoria" abre o cierra puertas al usuario objetivo | Preguntar a 2 ORI españolas y a 2 empresas alemanas | 0 € |
| 8 | **Tamaño real del segmento F07 en España** (matriculados por familia) | El SAM España usa la cuota de titulados como aproximación y un supuesto del 60 % | Descargar la tabla oficial de matriculados por ámbito ISCED (SIIU) | 1 h |
| 9 | **Términos de uso** de agregadores (workingstudentjobs.de prohíbe el scraping) y portales | Limita qué fuentes se pueden reutilizar legalmente | Revisión legal y uso solo de fuentes del empleador o acuerdos | Variable |
| 10 | **AI Act, Anexo III** (fecha de aplicación tras el ómnibus) | Afecta a recomendaciones personalizadas | Verificar en el DOUE | 1 h |

Las incertidumbres 1–3 son **bloqueantes**. Ninguna decisión de construir es defendible sin resolverlas.
