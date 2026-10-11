# Experimentos para comprobar si alguien paga

Ninguno cobra por algo que no existe. Todos tienen fecha límite y criterio de abandono fijados antes de empezar.

| # | Modelo | Experimento | Coste | Duración | Éxito | Abandono |
|---|---|---|---|---|---|---|
| X1 | A (estudiante) | Escalones E1–E3 de `../phase2_customers/07_experimento_precios.md` (0/3/5/9 €, compromiso con método de pago sin cargo o confirmación escrita, pago solo al entregar) | 0–20 € | 4–6 semanas | ≥5 compromisos E3 y ≥50 % que pagan al entregar | <2 compromisos E3 con ≥80 personas en E2 |
| X2 | B/D (empresa) | Lista de 30 pymes industriales españolas con prácticas publicadas (InfoJobs, bolsas universitarias, web propia). Correo y llamada: "difundo tu oferta a N estudiantes de ingeniería de [escuelas]; las 3 primeras gratis a cambio de decirme cuántas candidaturas recibiste; después 30–49 €/oferta". Factura manual. | 0 € + ~20 h | 6–8 semanas | ≥3 empresas pagan o 1 paga ≥300 € | 0 pagos tras 30 contactos y 3 pilotos gratuitos con candidaturas medidas |
| X3 | E (universidad/asociación) | 5 conversaciones con COIE, ORI, delegación o AERRAAITI: piloto gratuito de difusión del radar a cambio de una carta de intención y de datos de uso agregados | 0 € + ~10 h | 6–8 semanas | 1 carta firmada (canal) | 0 interés tras 5 conversaciones |
| X4 | C (colocación) | **No probar al inicio.** Antes, verificar el régimen de agencia de colocación. Si una empresa de X2 pide "encuéntrame candidatos", registrar la petición y el precio que propone, sin prestar el servicio. | 0 € | — | ≥3 peticiones espontáneas con precio | — |

## Registro (crear `pagos_registro.csv` al empezar)

`fecha, experimento, contacto_id (anonimizado), tipo (empresa/estudiante/universidad), etapa (contactado/respondió/reunión/piloto/pagó), importe_eur, candidaturas_generadas, horas_dedicadas, notas`

## Métricas derivadas

- Tasa de contacto → reunión → piloto → pago (por experimento).
- Horas del fundador por cliente que paga = estimación real del coste de adquisición. Debe sustituir al supuesto de `escenarios.xlsx`.
- Candidaturas por oferta difundida, que es el valor entregado a la empresa.
