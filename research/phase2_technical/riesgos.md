# Riesgos y soluciones alternativas

| # | Riesgo | Probabilidad (juicio) | Impacto | Mitigación | Alternativa si se materializa |
|---|---|---|---|---|---|
| R1 | Ninguna gran industrial usa un ATS con API pública documentada (0 de 30 confirmadas a nivel de grupo) | **Observado** | Alto: todo depende de C o de trabajo manual | Priorizar pymes con Personio, Teamtailor o Recruitee (feeds o claves que la empresa puede dar) | Pedir a las empresas el feed (B) o la clave Public read (Teamtailor) a cambio de difusión gratuita |
| R2 | Bloqueos 403/429 o cambios en el JSON de Workday y portales propios | Media | Medio | Frecuencia baja; detección de roturas; no cerrar ofertas ante fallo | Revisión manual semanal de esas empresas |
| R3 | Términos de uso que prohíben el acceso automatizado | Media | Alto (legal) | Revisar los términos antes de activar; categoría E | Solo enlace a la página de empleo de la empresa + alerta propia de la empresa |
| R4 | Reclamación *sui generis* si se usan agregadores | Alta si se hace | Alto | No extraer de agregadores ni bolsas de terceros | Acuerdos de difusión (D) |
| R5 | Falsos cierres o falsas aperturas | Media | Medio (confianza) | Regla de 2 ejecuciones + evidencia; mostrar "vista activa el <fecha>" | — |
| R6 | Extracción de requisitos errónea → falsa garantía | Media | Alto (reputación) | Tres estados, cita literal, "inferido/revisado", botón de corrección | Mostrar solo la cita sin evaluar |
| R7 | Coste de mantenimiento > tiempo disponible (27–59 h/mes estimadas para 30 empresas) | **Alta** | Alto | Limitar a 30 empresas; medir los minutos reales | Reducir a las empresas con A/B/Workday; el resto, solo "enlace + alerta de la empresa" |
| R8 | Dependencia de un único conector (Workday) | Media | Medio | Abstracción por ATS | — |
| R9 | Datos personales en ofertas o perfiles | Baja-media | Alto | Minimización y descarte en la ingesta | — |
| R10 | Las ofertas españolas están en PDF o bolsas restringidas (fase 2) | **Observado** | Alto para el segmento español | Revisión manual de un número limitado de fuentes públicas | Acuerdo con 1–2 COIE/ORI (B2B, phase2_business_model X3) |
