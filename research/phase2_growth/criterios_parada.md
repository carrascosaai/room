# Criterios para detener canales ineficientes

Se evalúan cada viernes con [panel_metricas.csv](panel_metricas.csv). Cada canal tiene **una** segunda oportunidad con un solo cambio (mensaje, momento o público) antes de abandonarlo.

| Regla | Detener el canal si… |
|---|---|
| P1. Sin tracción | <10 registros cualificados tras 2 intentos con mensajes distintos |
| P2. Visitas sin registro | ≥200 visitas y conversión <3 % |
| P3. Registro sin valor | ≥20 registros y <20 % llega a "valor real" en los dos primeros envíos |
| P4. Coste | Coste por usuario con valor > 5 € (canales de pago) |
| P5. Tiempo | >5 horas del fundador por cada usuario con valor (canales gratuitos) |
| P6. Normas | Cualquier aviso de moderador o administrador, o una queja de spam: parar ese espacio de inmediato |
| P7. Dependencia | Un canal aporta >70 % de los usuarios con valor: no detenerlo, pero exigir un segundo canal que funcione antes de escalar |

## Criterios globales a los 30 días

| Resultado | Lectura |
|---|---|
| ≥100 registros, ≥40 usuarios con valor real, retorno ≥40 % en las semanas 3–4 y ≥1 canal repetible (2 semanas seguidas con ≥15 usuarios con valor) | Seguir: escalar el canal repetible |
| Registros, pero valor real <20 % | El problema es el **producto o los datos**, no la captación: volver a `../phase2_customers` y `../phase2_technical` |
| <30 registros en total | Revisar la propuesta de valor y el público (PIVOT de segmento según `../phase2_customers/08`) |
