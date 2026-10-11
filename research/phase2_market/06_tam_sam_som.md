# TAM, SAM y SOM

Fecha: 2026-10-11. Cálculo reproducible:

```bash
python3 research/phase2_market/scripts/tam_sam_som.py > research/phase2_market/data/tam_results.csv
```

Entradas con fuente, tipo y escenario bajo/base/alto en [data/tam_inputs.csv](data/tam_inputs.csv). Resultados en [data/tam_results.csv](data/tam_results.csv).

## Principios

- Se mide **en personas** primero y en euros después. Las cifras en euros dependen de supuestos de conversión y precio **sin fuente**, que se marcan como tales.
- No se usan "cuotas de mercado" arbitrarias del tipo "si capturamos el 1 % de un mercado de X M€". El SOM sale de un alcance acotado y explícito.
- Cada factor es un dato oficial, un dato secundario o un supuesto, y se puede cambiar en el CSV.

## Entradas

| ID | Entrada | Valor | Tipo |
|---|---|---|---|
| I1 | Estudiantes terciarios UE (2023) | 18,8 M | Dato (Eurostat) |
| I2 | Cuota de Ingeniería/Fabricación/Construcción (F07) | 14,7 % | Dato (Eurostat 2023) |
| I3 | Titulados terciarios UE por año (2022) | ~4,3 M | Dato secundario |
| I4 | Cuota F07 de titulados (2024) | 13,9 % | Dato (Eurostat) |
| I5 | Jóvenes 18-34 con ≥1 prácticas | 78 % | Dato (Eurobarómetro 2023) |
| I6 | De ellos, en otro país UE | 21 % | Dato (Eurobarómetro 2023, todas las ramas) |
| I7 | Estudiantes universitarios en España (2024-25) | 1,8 M | Dato oficial (avance EEU) |
| I8 | Cuota F07 en España | 11–12 % | Dato secundario (titulados 2022) usado como aproximación de la cuota de matriculados |
| A1 | Parte de F07 que corresponde a las familias objetivo | 50 / 60 / 70 % | **Supuesto sin fuente** (F07 incluye construcción, arquitectura y procesos) |
| A2 | Alcance en 24 meses del SAM España | 2 / 5 / 10 % | **Supuesto sin fuente** |
| A3 | Conversión a pago B2C | 1 / 3 / 5 % | **Supuesto sin fuente** |
| A4 | Precio de un pase de 3 meses | 9 / 12 / 19 € | Hipótesis de la fase 1 |
| A5–A7 | Pymes que publican × publicaciones × precio | 20–150 × 1–4 × 20–39 € | Supuestos; precio de referencia de EUInternships e iAgora |

## Resultados

| Métrica | Fórmula | Bajo | Base | Alto |
|---|---|---|---|---|
| **TAM** stock UE (estudiantes F07) | I1·I2 | 2.763.600 | 2.763.600 | 2.763.600 |
| **TAM** flujo UE (titulados F07/año) | I3·I4 | 597.700 | 597.700 | 597.700 |
| **SAM** UE transfronterizo (familias objetivo que hacen prácticas en otro país UE, por año) | I3·I4·I5·I6·A1 | 48.952 | 58.742 | 68.532 |
| **SAM** España (estudiantes de las familias objetivo, stock) | I7·I8·A1 | 99.000 | 118.800 | 151.200 |
| **SAM** España transfronterizo | I7·I8·A1·I6 | 20.790 | 24.948 | 31.752 |
| **SOM** España: usuarios en 24 meses | I7·I8·A1·A2 | 1.980 | 5.940 | 15.120 |
| **SOM** España: ingresos B2C/año | ·A3·A4 | 178 € | 2.138 € | 14.364 € |
| Techo B2C si se alcanzara **todo** el SAM UE transfronterizo | I3·I4·I5·I6·A1·A3·A4 | 4.406 € | 21.147 € | 65.106 € |
| SOM empleadores (publicaciones de pymes) | A5·A6·A7 | 400 € | 3.000 € | 23.400 € |

## Interpretación

1. **El mercado de personas es real, pero el de pago B2C es diminuto.** Incluso alcanzando a *todos* los estudiantes de las familias objetivo que hacen prácticas en otro país UE cada año, con un 3 % de conversión y 12 €, los ingresos serían de unos **21.000 €/año**. El SOM realista en España en 2 años es de **unos 2.000 € al año** en el escenario base.
2. **No hay precedente de pago del estudiante en este segmento.** JobTeaser, workingstudentjobs.de, iAgora, EUInternships, Talentoteca y las bolsas universitarias son gratis para el estudiante. Quienes pagan son **empresas** (iAgora 23 €/oferta; EUInternships 20–39 €; Talentoteca 400 €/año + 12 %) o, en algún caso, universidades (Interstride, módulos premium de JobTeaser).
3. **El ingreso B2B por publicaciones de pymes** también es pequeño en 24 meses (400–23.400 €) y exige una audiencia previa que no existe.
4. **Para que el negocio tuviera tamaño** haría falta escalar a toda la UE y a todas las familias de ingeniería, y monetizar a empleadores o universidades en competencia con JobTeaser (gratis para centros) e iAgora. Eso no encaja con un presupuesto de 100–500 €.

## Sensibilidad y límites

- **I6** (21 %) es una media de todas las ramas y edades de 18 a 34. En ingeniería puede ser distinta. No hay dato específico.
- **I8** usa la cuota de titulados como aproximación de la de matriculados. La rama oficial española "Ingeniería y Arquitectura" incluye informática y arquitectura. Un tercero estima un 23 % de los matriculados, sin fuente oficial verificada.
- Los supuestos A1–A7 no tienen fuente. **Sustituirlos por datos de la validación** (conversión real de la lista de espera, preventas) es la forma de mejorar este cálculo.
