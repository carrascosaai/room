# Estudio de nichos de mercado (España / UE)

Fecha: 2026-10-11. Este estudio se limita a nichos **detonados por una obligación o un flujo de dinero concreto** (una norma con fecha o un mercado de certificados con precio), porque esa es la forma más fiable de saber que alguien va a pagar. Los datos proceden del buscador; **no se han abierto las páginas** (el entorno solo permite el buscador). Leyenda: [H] verificado en fuente oficial · [S] fuente secundaria · [C] comercial · [E] estimación · [Hip] hipótesis · NV no verificado.

La tabla completa está en [nichos.csv](nichos.csv) y las fuentes en [fuentes.csv](fuentes.csv).

## Cómo se puntuó (0–5 cada criterio, máx. 25)

| Criterio | Qué mide |
|---|---|
| Dinero | ¿Ya hay alguien pagando hoy, con precio público? |
| Certeza | ¿La norma está vigente y la fecha es fija? |
| Competencia | ¿Queda sitio para un recién llegado sin capital? (5 = poco saturado) |
| Encaje | ¿Encaja con un fundador ingeniero, solo, con menos de 1.000 €? |
| Velocidad | ¿Se puede cobrar el primer euro en menos de 90 días? |

Las puntuaciones son un **juicio propio [E]** a partir de las fuentes, no una medición.

## Ranking

| # | Nicho | Detonante | Punt. | Veredicto |
|---|---|---|---|---|
| 1 | **Originación de CAE en pymes industriales** | RD 36/2023; objetivo 2026 ~9.325 GWh | 21 | **Elegido** |
| 2 | Gestor de autoconsumo colectivo | RDL 7/2026 (gestor, 5 km) | 16 | Vigilar |
| 3 | EUDR para pequeños importadores | 30-12-2026 / 30-06-2027 | 14 | Servicio puntual posible |
| 4 | Gestión de prácticas para pymes | RD 592/2014 | 12 | Ya analizado; no prioritario |
| 5 | Accesibilidad digital (EAA) | Desde 28-6-2025 | 11 | No |
| 6 | Relevo generacional de pymes | Jubilaciones | 11 | No para empezar |
| 7 | Transparencia retributiva | Directiva no transpuesta | 10 | No por ahora |
| 8 | Facturación electrónica B2B | RD 238/2026; 2027/2028 | 9 | No (saturado) |
| 9 | NIS2 | Ley no aprobada | 9 | No |
| 10 | Alfabetización en IA | AI Act art. 4 (suavizado) | 8 | No |
| 11 | Verifactu | 2027 | 7 | No (saturado) |
| 12 | Registro horario digital | RD no aprobado | 6 | No (saturado) |

## Lo que dicen los datos, por grupos

### A. Obligaciones grandes con fecha fija → saturadas por software
Facturación electrónica B2B (RD 238/2026: 6-10-2027 para >8 M€ y 6-10-2028 para el resto [S]), Verifactu (sociedades 1-1-2027, resto 1-7-2027 por RDL 15/2025 [S]) y el registro horario digital tienen millones de obligados, pero **ya los atienden** los ERPs, el software de facturación, las gestorías y las herramientas de RR. HH. (Factorial, Sesame, Sage, Cegid…). Un fundador solo no tiene ventaja ahí.

### B. Obligaciones con fecha incierta → apuesta de calendario
NIS2 (sin ley española; la Comisión llevó a España al TJUE el 9-7-2026 [S]), transparencia retributiva (plazo del 7-6-2026 incumplido, ley no aprobada [S]) y registro horario (real decreto anunciado, no publicado a julio de 2026 [S]). Vender antes de que exista la obligación es caro y lento.

### C. Obligaciones vigentes con poca presión
Accesibilidad (EAA desde el 28-6-2025; sanciones y exenciones contradictorias entre fuentes; expedientes no verificados) y alfabetización en IA (el Digital Omnibus la rebajó a "medidas de apoyo" y sin multa específica, según varias fuentes [S]). Hay demanda, pero el cliente no tiene urgencia.

### D. Mercados donde el dinero ya circula y el trabajo es técnico → mejor encaje
- **CAE:** precio observado de 110–140 €/MWh en 2025 [S/C]; objetivo 2026 de 9.325 GWh (Orden TED/133/2026) [S]; liquidación posible hasta el 31-12-2030 [S].
- **Autoconsumo colectivo:** figura nueva del gestor (RDL 7/2026) [S], pero falta el real decreto de desarrollo y algunas comunidades autónomas han recortado ayudas [S].

## Mi elección: originación de CAE para pymes industriales

### Qué es
Las comercializadoras de energía están obligadas a acreditar ahorros. Los compran como **CAE** a quien hace actuaciones de eficiencia: la pyme (propietaria del ahorro) cede su ahorro, mediante un convenio, a un **sujeto delegado** acreditado, que lo vende al obligado. El cuello de botella es **encontrar actuaciones elegibles y documentarlas bien** con las fichas estandarizadas, antes de que pasen los plazos.

**El servicio:** encontrar en pymes industriales actuaciones ya hechas o previstas (compresores, variadores, recuperación de calor, iluminación, aislamiento, motores…), preparar el expediente técnico con la ficha correspondiente y llevarlo a un sujeto delegado a cambio de una comisión de éxito. **No hace falta ser sujeto delegado** para empezar.

### Por qué esta y no otra
1. **El dinero ya existe y tiene precio** [S/C]. No hay que convencer a nadie de pagar: el ahorro se convierte en ingresos para la pyme.
2. **La pyme no pone dinero:** cobra. Venderle algo que le paga es mucho más fácil que venderle un cumplimiento normativo.
3. **Es ingeniería**, no software: fichas, mediciones y justificación técnica. Encaja con un perfil de ingeniería mecánica o industrial y no requiere programar.
4. **Hay una ventana con fecha:** objetivos anuales y liquidación hasta 2030.
5. **Arranque con menos de 1.000 €:** correo, teléfono, hoja de cálculo y desplazamientos.

### Qué puede salir mal (honesto)
- **Competencia:** entre 63 y 79 sujetos delegados según directorios privados (cifra no oficial) [S], además de instaladores y empresas de servicios energéticos que ya originan. Lo más probable es que **las actuaciones grandes ya estén cogidas**; el hueco [Hip] serían las pymes pequeñas y medianas con ahorros de entre 20 y 200 MWh, poco rentables para los grandes.
- **Comisiones no publicadas:** no se encontró ningún porcentaje público [S]. El ejemplo de abajo es una hipótesis.
- **Requisitos técnicos:** algunas actuaciones necesitan verificación por un verificador acreditado y posiblemente la firma de un técnico competente [Hip]; un estudiante o recién titulado puede necesitar un socio colegiado.
- **Regla de adicionalidad y plazos:** si la actuación no cumple los requisitos de fecha o de documentación, no genera CAE.
- **Precio volátil:** el precio lo marca el mercado, con un techo [S].

### Ejemplo de economía (todo [Hip]/[E], para calibrar, no un dato)
Una actuación que ahorra 100 MWh/año, a 120 €/MWh, genera unos 12.000 € para la pyme. Si el originador cobra un 10–20 % (hipótesis a validar con sujetos delegados), serían **1.200–2.400 € por expediente**. Diez expedientes al año darían 12.000–24.000 €, suficiente como trabajo complementario y no como empresa grande. Escalar exigiría un equipo o convertirse en sujeto delegado.

### Validación en 4 semanas con menos de 1.000 €

| Semana | Tarea | Resultado medible |
|---|---|---|
| 1 | Leer el RD 36/2023, las preguntas frecuentes del MITECO y el catálogo de fichas. Elegir 3–5 fichas industriales frecuentes. | Lista de fichas con datos necesarios y ahorro típico |
| 1–2 | Contactar con 10–15 sujetos delegados (directorio público): ¿pagan por originación?, ¿cuánto?, ¿qué tamaño mínimo? | Nº que acepta originadores y comisión ofrecida |
| 2–3 | Contactar con 30 pymes industriales e instaladores (los instaladores ya tienen las obras): ¿actuaciones en los últimos 12 meses o previstas? | Nº de actuaciones elegibles y MWh estimados |
| 3–4 | Preparar 1–2 expedientes reales con autorización de la pyme y entregarlos a un sujeto delegado | Convenio firmado o motivo del rechazo |

**Presupuesto [E]:** desplazamientos 200–400 €; dominio y correo 20 €; consulta puntual con un técnico colegiado o verificador 200–400 €. **Total: 420–820 €.**

**Seguir si**, a las 4 semanas:
- ≥2 sujetos delegados aceptan originadores con una comisión de al menos 8 %;
- ≥3 actuaciones elegibles identificadas con ≥50 MWh/año cada una;
- ≥1 convenio en trámite.

**Abandonar si:**
- ningún sujeto delegado paga por originación;
- las pymes contactadas ya tienen sus actuaciones cedidas;
- el coste en tiempo supera 20 horas por expediente.

### Plan B y C
- **Plan B — gestor de autoconsumo colectivo:** también técnico y con figura legal nueva, pero hay que esperar al real decreto de desarrollo. Se puede preparar en paralelo con los mismos contactos (polígonos industriales).
- **Plan C — EUDR para pequeños importadores:** servicio puntual con fecha (30-12-2026 / 30-06-2027), aunque la norma ya se aplazó dos veces y encaja peor con la ingeniería.

## Qué no se pudo verificar
- El número oficial de sujetos delegados y los CAE emitidos (no se encontraron datos del registro del MITECO).
- Las comisiones reales de originación.
- Si hace falta un técnico colegiado para cada ficha.
- La convalidación del RDL 15/2025 (Verifactu).
- Las sanciones reales de la Ley 11/2023 y los expedientes de 2026.

Todo esto se resuelve en la semana 1 con lectura directa del BOE y del MITECO, y con llamadas a sujetos delegados.
