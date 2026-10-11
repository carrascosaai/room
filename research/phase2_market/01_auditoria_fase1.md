# Auditoría de la fase 1

Fecha: 2026-10-11. He revisado todos los archivos de `research/` y he vuelto a comprobar sus afirmaciones principales con los datos descargados y nuevas búsquedas.

## Afirmaciones confirmadas

| Afirmación de la fase 1 | Comprobación | Resultado |
|---|---|---|
| Otta fue adquirida por Welcome to the Jungle en enero de 2024 | FAQ oficial de WTTJ y Clipperton | Confirmada |
| El plan Hobby de Vercel es solo para uso personal no comercial | Documentación de Vercel (`/docs/plans/hobby`) | Confirmada |
| TJUE C-762/19 *CV-Online Latvia*, sentencia del 3-6-2021 sobre metabuscadores de ofertas y derecho *sui generis* | ICLR, Clifford Chance, Cuatrecasas | Confirmada. El matiz exacto de la doctrina sigue sin revisar por un abogado. |
| El ámbito de Simplify es sobre todo EE. UU. | La propia página de Simplify dice que sus prácticas son "in United States, Canada, or UK" | Confirmada por fuente primaria |
| Cifras del dataset de Simplify (36.625 ofertas; 5,9 % Europa; 2 en España) | Se reproducen con los commits fijados | Confirmada |

## Errores y debilidades encontrados

1. **Hice equivaler "Hardware" de Simplify a ingeniería relevante, y es falso.**
   - Fase 1 contó 83 ofertas "Hardware" en la muestra y las presentó como relevantes para ingeniería.
   - Al revisar los títulos, solo **31 de 1.650** ofertas Hardware activas parecen de ingeniería mecánica o industrial. La categoría es sobre todo electrónica y semiconductores.
   - Con una regla de títulos industriales (mecánica, fabricación, aeroespacial, procesos, eléctrica de potencia, energía, automoción…) sobre **todas** las categorías: 583 de 7.770 activas (7,5 %), y solo **19 en Europa**. Casi todas están en UK y varias son de software con la palabra "industrial placement".
   - **Corrección:** Simplify es aún menos relevante para ingeniería industrial europea de lo que dijo la fase 1.
2. **Atribución de entidades en Simplify.**
   - Ofertas de Bosch en SmartRecruiters (p. ej. "Engineering Intern – Airbag ECU") aparecen como "Robert Bosch Venture Capital" o "Bosch Home Comfort".
   - La fase 1 las contó como Bosch porque usó una expresión regular amplia. El recuento de empresa es correcto, pero un producto que confíe en el campo `company_name` de un agregador heredará errores.
3. **GE Vernova.** 12 de sus 24 ofertas activas vienen de un sitio Workday llamado `only_confidential_executive_recruiting`. Es un sitio extraño para prácticas y puede reflejar un error de clasificación del dataset. No cambia las conclusiones, pero las 24 ofertas no son fiables al 100 %.
4. **Supuesto B2B demasiado optimista.**
   - La fase 1 planteó vender a universidades como vía de monetización.
   - JobTeaser declara que su **plataforma es gratuita para centros y estudiantes** y cobra a las empresas (centro de ayuda, 2026). La UAM la usa gratis.
   - Un proveedor pequeño que quiera cobrar a universidades compite con una alternativa gratuita ya implantada en 750–800 centros. **Se rebaja la expectativa B2B.**
5. **No se buscaron agregadores nacionales de prácticas.**
   - La fase 1 se centró en Simplify, Stag-io y similares, y pasó por alto agregadores por país que hacen casi exactamente el "radar".
   - El más claro es **workingstudentjobs.de** (Alemania): declara agregar Praktika y Werkstudent desde webs corporativas, ATS y LinkedIn, con IA más revisión humana y alertas, y 26.884 ofertas.
   - En Francia: JobTeaser (400 escuelas), Wizbii, engagement-jeunes, CIDJ. En Italia: AlmaLaurea, que en algunas universidades es el canal obligatorio. En Países Bajos: Magnet.me.
   - **Esto debilita la hipótesis de la fase 1** ("radar curado de industriales europeas").
6. **"Ausencia de calendario continental" se basaba solo en no encontrarlo.** Sigo sin encontrarlo, pero sigue siendo una prueba por ausencia, no concluyente.
7. **Precios de proveedores (Supabase, dominio):** siguen sin verificar en sus páginas, por el mismo bloqueo de red.
8. **AI Act (aplazamiento del Anexo III a 2-12-2027):** solo hay fuentes secundarias. Sigue pendiente de verificar en el DOUE.

## Qué conclusiones de la fase 1 se mantienen y cuáles cambian

| Conclusión de la fase 1 | Estado tras la fase 2 |
|---|---|
| NO-GO a la plataforma global de candidatura automática | **Se mantiene** |
| El autofill es un commodity | **Se mantiene** |
| GO condicionado a un "radar curado de prácticas en industriales europeas" | **Se debilita.** En Alemania y Francia ya existen agregadores o redes gratuitas y densas. Ver la decisión en [README.md](README.md). |
| El hueco de elegibilidad estructurada existe | **Se refuerza en la oferta** (requisitos observados en la muestra), pero **sigue sin evidencia de demanda ni de pago** |
| B2B universidades como vía de ingresos | **Se rebaja** (JobTeaser es gratis para centros) |
