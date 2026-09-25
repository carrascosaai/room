// Genera "Memoria_Hormigon_Armado.docx" (proyecto de Ingeniería de Materiales).
// Uso: node generar_memoria.js   (requiere el paquete npm "docx")
const fs = require("fs");
const path = require("path");
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableRow, TableCell,
  WidthType, ShadingType, BorderStyle, ImageRun, PageBreak, TableOfContents, Footer, Header,
  PageNumber, LevelFormat,
} = require("docx");

const AZUL = "1F4E79";

// ---------- utilidades ----------
function runs(text) {
  // **negrita** dentro del texto
  return text.split(/(\*\*[^*]+\*\*)/).filter(Boolean).map((t) =>
    t.startsWith("**") ? new TextRun({ text: t.slice(2, -2), bold: true }) : new TextRun(t));
}
const p = (text, opts = {}) => new Paragraph({ children: runs(text), spacing: { after: 120, line: 300 }, alignment: AlignmentType.JUSTIFIED, ...opts });
const h1 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(t)], pageBreakBefore: true });
const h2 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(t)] });
const h3 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun(t)] });
const li = (t, level = 0) => new Paragraph({ numbering: { reference: "vinetas", level }, children: runs(t), spacing: { after: 60, line: 280 } });
// Cada grupo de pasos numerados reinicia en 1: llamar a nuevaLista() antes de cada grupo.
let listaActual = 0;
const nuevaLista = () => { listaActual += 1; };
const num = (t) => new Paragraph({ numbering: { reference: "numeros", level: 0, instance: listaActual }, children: runs(t), spacing: { after: 60, line: 280 } });
const formula = (t) => new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 60, after: 120 }, children: [new TextRun({ text: t, font: "Cambria Math", size: 22 })] });
const pie = (t) => new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 240 }, children: [new TextRun({ text: t, italics: true, size: 18, color: "555555" })] });

function figura(archivo, anchoPx, altoPx, texto) {
  return [
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 120 }, children: [
      new ImageRun({ type: "png", data: fs.readFileSync(path.join(__dirname, "figuras", archivo)), transformation: { width: anchoPx, height: altoPx } }),
    ] }),
    pie(texto),
  ];
}

const borde = { style: BorderStyle.SINGLE, size: 4, color: "A6A6A6" };
const bordes = { top: borde, bottom: borde, left: borde, right: borde };
function tabla(cabecera, filas, anchos) {
  const total = anchos.reduce((a, b) => a + b, 0);
  const celda = (t, i, esCab) => new TableCell({
    width: { size: anchos[i], type: WidthType.DXA }, borders: bordes,
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
    shading: esCab ? { type: ShadingType.CLEAR, fill: AZUL, color: "auto" } : undefined,
    children: [new Paragraph({ children: [new TextRun({ text: t, bold: esCab, color: esCab ? "FFFFFF" : undefined, size: 19 })] })],
  });
  return new Table({
    width: { size: total, type: WidthType.DXA }, columnWidths: anchos,
    rows: [
      new TableRow({ tableHeader: true, children: cabecera.map((t, i) => celda(t, i, true)) }),
      ...filas.map((f) => new TableRow({ children: f.map((t, i) => celda(t, i, false)) })),
    ],
  });
}

// ---------- portada ----------
const portada = [
  new Paragraph({ spacing: { before: 2400 }, alignment: AlignmentType.CENTER, children: [new TextRun({ text: "INGENIERÍA DE MATERIALES", size: 28, color: "555555" })] }),
  new Paragraph({ spacing: { before: 600 }, alignment: AlignmentType.CENTER, children: [new TextRun({ text: "EL HORMIGÓN ARMADO", bold: true, size: 56, color: AZUL })] }),
  new Paragraph({ spacing: { before: 200 }, alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Composición, comportamiento, fabricación, ensayos, durabilidad y cálculo de un elemento estructural", size: 26 })] }),
  new Paragraph({ spacing: { before: 200 }, alignment: AlignmentType.CENTER, border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: AZUL, space: 1 } }, children: [] }),
  new Paragraph({ spacing: { before: 2000 }, alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Proyecto de la asignatura", size: 24 })] }),
  new Paragraph({ spacing: { before: 400 }, alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Autores: [Nombre y apellidos de los integrantes]", size: 24 })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Profesor/a: [Nombre]", size: 24 })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Grado: [Titulación] · Curso 2026/2027", size: 24 })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "[Universidad / Escuela]", size: 24 })] }),
];

// ---------- índice ----------
const indice = [
  new Paragraph({ pageBreakBefore: true, children: [new TextRun({ text: "Índice", bold: true, size: 32, color: AZUL })], spacing: { after: 200 } }),
  new TableOfContents("Índice", { hyperlink: true, headingStyleRange: "1-2" }),
  p("(Si el índice aparece vacío, en Word: clic derecho sobre él → «Actualizar campos».)", { alignment: AlignmentType.LEFT }),
];

// ---------- contenido ----------
const c = [];

c.push(h1("Resumen"));
c.push(p("El hormigón armado es el material de construcción más utilizado del mundo. Es un **material compuesto** formado por una matriz cerámica (el hormigón), que resiste muy bien la compresión pero mal la tracción, y un refuerzo metálico (barras de acero corrugado) que absorbe las tracciones. Su éxito se basa en tres propiedades que hacen posible el trabajo conjunto: la **adherencia** entre acero y hormigón, un **coeficiente de dilatación térmica casi idéntico** (≈10·10⁻⁶ K⁻¹) y la **protección química** que el medio alcalino del hormigón ofrece al acero frente a la corrosión."));
c.push(p("En este proyecto se estudian los materiales componentes y su microestructura, el mecanismo de trabajo conjunto, las propiedades mecánicas, la fabricación y puesta en obra, los ensayos normalizados de control, la durabilidad y las patologías más comunes, y el impacto ambiental. Como aplicación práctica se diseña la dosificación de un hormigón HA-30/B/20/IIa y se dimensiona una viga biapoyada de 6 m de luz según el Código Estructural (RD 470/2021) y el Eurocódigo 2."));
c.push(p("**Palabras clave:** hormigón armado, material compuesto, cemento Portland, acero B500S, adherencia, carbonatación, corrosión, Código Estructural."));

c.push(h1("1. Introducción y objetivos"));
c.push(p("La Ingeniería de Materiales estudia la relación entre la estructura interna de un material, su procesado, sus propiedades y su comportamiento en servicio. El hormigón armado es un caso de estudio ideal porque en él intervienen materiales cerámicos (cemento hidratado y áridos), metálicos (acero) y, cada vez más, polímeros (aditivos y fibras), y porque su comportamiento depende de fenómenos a escalas muy distintas: desde la química de hidratación a escala nanométrica hasta la respuesta estructural de un edificio."));
c.push(p("**Objetivo general:** comprender por qué el hormigón armado funciona como material compuesto y aplicar ese conocimiento a un caso práctico de diseño."));
c.push(p("**Objetivos específicos:**"));
[
  "Describir los componentes del hormigón y del acero de armar, y su influencia en las propiedades finales.",
  "Explicar la microestructura de la pasta de cemento hidratada y la interfaz árido-pasta.",
  "Justificar las condiciones que permiten el trabajo conjunto acero-hormigón.",
  "Recopilar las propiedades mecánicas y físicas de referencia y los ensayos normalizados para medirlas.",
  "Analizar los mecanismos de deterioro y las medidas de durabilidad.",
  "Dosificar un hormigón y dimensionar una viga de hormigón armado.",
].forEach((t) => c.push(li(t)));

c.push(h1("2. Antecedentes históricos"));
c.push(p("Los romanos ya empleaban un conglomerante hidráulico (opus caementicium) a base de cal y ceniza volcánica puzolánica, con el que construyeron obras como la cúpula del Panteón (siglo II d. C.), todavía en pie. Sin embargo, aquel hormigón no llevaba armadura y sólo podía trabajar a compresión."));
[
  "**1824** – Joseph Aspdin patenta el cemento Portland en Inglaterra.",
  "**1848** – Joseph-Louis Lambot construye una barca de hormigón reforzado con malla de hierro.",
  "**1867** – Joseph Monier, jardinero francés, patenta macetas de hormigón con alambres de hierro; es considerado uno de los padres del hormigón armado.",
  "**1892** – François Hennebique patenta un sistema completo de vigas, pilares y forjados monolíticos, con estribos, que se difunde por toda Europa.",
  "**Principios del siglo XX** – Aparecen las primeras teorías de cálculo (Mörsch) y las primeras normas. En España destacan Eduardo Torroja (Hipódromo de la Zarzuela, 1941) y, posteriormente, Carlos Fernández Casado y Javier Manterola.",
  "**Actualidad** – Hormigones de alta resistencia, autocompactantes, con fibras y de ultra altas prestaciones (UHPC, >150 MPa). En España el Código Estructural (2021) sustituye a la EHE-08 y se alinea con los Eurocódigos.",
].forEach((t) => c.push(li(t)));

c.push(h1("3. Materiales componentes"));
c.push(p("El hormigón es una mezcla de **cemento, agua, áridos** (arena y grava) y, habitualmente, **aditivos y adiciones**. Tras el endurecimiento se comporta como una roca artificial. El hormigón armado añade **barras de acero** colocadas donde aparecen tracciones."));

c.push(h2("3.1. Cemento Portland"));
c.push(p("Se obtiene calcinando a unos 1450 °C una mezcla de caliza (≈75 %) y arcilla (≈25 %) en un horno rotatorio. El producto, llamado **clínker**, se muele junto con un 3–5 % de yeso (regulador de fraguado). Sus fases principales son:"));
c.push(tabla(
  ["Fase (notación del cemento)", "Fórmula", "% típico", "Papel"],
  [
    ["Alita (C₃S)", "3CaO·SiO₂", "50–70", "Resistencia inicial (primeros 28 días); mucho calor de hidratación"],
    ["Belita (C₂S)", "2CaO·SiO₂", "15–30", "Resistencia a largo plazo; hidratación lenta"],
    ["Aluminato tricálcico (C₃A)", "3CaO·Al₂O₃", "5–10", "Fraguado rápido; sensible al ataque por sulfatos"],
    ["Ferrito-aluminato (C₄AF)", "4CaO·Al₂O₃·Fe₂O₃", "5–15", "Aporta el color gris; baja contribución resistente"],
  ],
  [2300, 2100, 1000, 3626],
));
c.push(pie("Tabla 1. Fases principales del clínker de cemento Portland."));
c.push(p("La norma UNE-EN 197-1 clasifica los cementos comunes en CEM I (Portland), CEM II (con adiciones), CEM III (con escoria de horno alto), CEM IV (puzolánico) y CEM V (compuesto), con clases resistentes 32,5, 42,5 y 52,5 MPa a 28 días. La designación incluye la resistencia inicial: N (normal) o R (rápida). Ejemplo: **CEM II/A-L 42,5 R**."));

c.push(h2("3.2. Áridos"));
c.push(p("Ocupan entre el 65 y el 80 % del volumen del hormigón, por lo que condicionan su densidad, módulo de elasticidad, retracción y coste. Se clasifican en **arena** (fracción 0/4 mm) y **grava** (4/D, siendo D el tamaño máximo, normalmente 20 mm). Deben ser limpios, duros, con granulometría continua (para minimizar huecos) y no reactivos con los álcalis del cemento. Se rigen por la UNE-EN 12620. Los áridos reciclados de hormigón pueden sustituir parcialmente a los naturales (el Código Estructural admite hasta un 20 % de árido grueso reciclado en hormigón estructural)."));

c.push(h2("3.3. Agua"));
c.push(p("El agua cumple dos funciones: hidratar el cemento y dar trabajabilidad a la mezcla. El parámetro más importante del hormigón es la **relación agua/cemento (a/c)**: la hidratación completa sólo necesita a/c ≈ 0,25 (químicamente combinada) + ≈0,15 (agua de gel), es decir, unos 0,40; el agua sobrante se evapora y deja **poros capilares** que reducen resistencia y durabilidad. Por eso las normas limitan la a/c máxima según el ambiente. El agua potable es apta; otras aguas deben ensayarse (contenido de cloruros, sulfatos, materia orgánica)."));
c.push(p("La relación entre resistencia y a/c se expresa con la **ley de Abrams**:"));
c.push(formula("fc = A / B^(a/c)"));
c.push(p("donde A y B son constantes empíricas que dependen del cemento y de la edad. Al bajar la a/c la resistencia crece de forma exponencial."));

c.push(h2("3.4. Aditivos y adiciones"));
[
  "**Superplastificantes** (policarboxilatos): permiten reducir el agua un 20–40 % manteniendo la trabajabilidad; imprescindibles en hormigones de alta resistencia y autocompactantes.",
  "**Aireantes**: introducen microburbujas que mejoran la resistencia a ciclos de hielo-deshielo.",
  "**Retardadores y aceleradores** de fraguado: para hormigonar con calor o frío.",
  "**Adiciones** (UNE-EN 450, 15167, 13263): cenizas volantes, escoria de horno alto y humo de sílice. Reaccionan con la portlandita (reacción puzolánica), densifican la microestructura y reducen el clínker, y con él el CO₂.",
].forEach((t) => c.push(li(t)));

c.push(h2("3.5. Acero de armar"));
c.push(p("Se emplean **barras corrugadas** de acero al carbono (C < 0,22 %) fabricadas por laminación en caliente, a menudo con un tratamiento de temple superficial (proceso Tempcore) que da una periferia martensítica resistente y un núcleo ferrítico-perlítico dúctil. Las corrugas (resaltos) aumentan mucho la adherencia mecánica con el hormigón. Diámetros normalizados: 6, 8, 10, 12, 14, 16, 20, 25, 32 y 40 mm."));
c.push(tabla(
  ["Propiedad", "B500S", "B500SD (alta ductilidad)"],
  [
    ["Límite elástico fyk (MPa)", "≥ 500", "500 – 625"],
    ["Resistencia a tracción fs (MPa)", "≥ 550", "≥ 575"],
    ["Relación fs/fy", "≥ 1,05", "1,15 – 1,35"],
    ["Alargamiento bajo carga máxima εmax", "≥ 5,0 %", "≥ 7,5 %"],
    ["Módulo de elasticidad Es", "200 000 MPa", "200 000 MPa"],
    ["Soldabilidad", "Sí", "Sí"],
  ],
  [3800, 2400, 2826],
));
c.push(pie("Tabla 2. Propiedades del acero de armar según el Código Estructural y UNE 36065 / UNE 36068."));
c.push(p("El B500SD es obligatorio o recomendable en zonas sísmicas, donde la estructura debe disipar energía mediante deformaciones plásticas sin romperse."));

c.push(h1("4. Microestructura e hidratación del cemento"));
c.push(p("Al mezclar el cemento con agua se producen reacciones de hidratación exotérmicas. Las principales, para los silicatos, son:"));
c.push(formula("2 C₃S + 6 H → C₃S₂H₃ (C-S-H) + 3 CH"));
c.push(formula("2 C₂S + 4 H → C₃S₂H₃ (C-S-H) + CH"));
c.push(p("(Notación del cemento: C = CaO, S = SiO₂, H = H₂O, CH = Ca(OH)₂.)"));
[
  "**Gel C-S-H** (silicato cálcico hidratado): 50–60 % del volumen de sólidos. Es un material nanoestructurado, prácticamente amorfo, con enorme superficie específica; es el responsable de la resistencia.",
  "**Portlandita, Ca(OH)₂**: 20–25 %. Cristales hexagonales que aportan poca resistencia pero mantienen el **pH en torno a 12,5–13,5**, esencial para proteger el acero.",
  "**Etringita y monosulfoaluminato**: productos de la hidratación del C₃A con el yeso.",
  "**Porosidad**: poros de gel (nanómetros, no perjudiciales) y poros capilares (0,01–10 µm, que controlan permeabilidad y resistencia). Su volumen crece con la relación a/c.",
].forEach((t) => c.push(li(t)));
c.push(p("La **zona de transición interfacial (ITZ)** es una capa de 10–50 µm alrededor de cada árido, con mayor porosidad y cristales orientados de portlandita. Es el eslabón más débil del hormigón: las fisuras se inician y propagan por ella. El humo de sílice y la reducción de la a/c la densifican."));
c.push(p("El **fraguado** (paso de estado plástico a sólido) tiene lugar en unas horas; el **endurecimiento** continúa durante meses. Por convenio, la resistencia de referencia es la obtenida a **28 días**, cuando se ha alcanzado aproximadamente el 70–80 % de la resistencia final."));

c.push(h1("5. El hormigón armado como material compuesto"));
c.push(p("El hormigón en masa tiene una resistencia a tracción de sólo el 8–10 % de la de compresión, y rompe de forma frágil. En una viga sometida a flexión la zona inferior está traccionada: sin armadura, se fisuraría y colapsaría con cargas muy bajas. Colocando acero en esa zona se obtiene un material compuesto en el que **el hormigón resiste las compresiones y el acero las tracciones**. Tres condiciones hacen posible el trabajo conjunto:"));
c.push(h3("5.1. Adherencia"));
c.push(p("Es la transmisión de esfuerzos entre ambos materiales, de modo que en cada punto ambos sufran la misma deformación (hipótesis de compatibilidad). Tiene tres componentes: adhesión química, rozamiento y, sobre todo, el **efecto de acuñamiento de las corrugas** contra el hormigón. De la adherencia dependen las longitudes de anclaje y solape de las barras."));
c.push(h3("5.2. Compatibilidad térmica"));
c.push(p("El coeficiente de dilatación del hormigón (≈10·10⁻⁶ K⁻¹) y del acero (≈12·10⁻⁶ K⁻¹) son muy parecidos. Si fueran distintos, los cambios de temperatura generarían tensiones internas que romperían la adherencia."));
c.push(h3("5.3. Protección del acero"));
c.push(p("En el medio muy alcalino (pH > 12,5) del hormigón, el acero se recubre de una **capa pasivante** de óxidos de hierro de pocos nanómetros que detiene la corrosión. El **recubrimiento** de hormigón (distancia entre la superficie de la barra y el paramento) actúa como barrera física frente a CO₂, cloruros y agua, y también como protección frente al fuego."));
c.push(h3("5.4. Variantes"));
[
  "**Hormigón pretensado**: el acero (cordones de alta resistencia, fpk ≈ 1860 MPa) se tensa antes de hormigonar; al liberarlo comprime el hormigón y permite mayores luces.",
  "**Hormigón postensado**: los tendones se tensan cuando el hormigón ya ha endurecido, dentro de vainas.",
  "**Hormigón reforzado con fibras** (acero, polipropileno, vidrio): mejora la tenacidad y controla la fisuración.",
  "**Armaduras no metálicas** (GFRP, CFRP, basalto): no se corroen; útiles en ambientes marinos.",
].forEach((t) => c.push(li(t)));

c.push(h1("6. Propiedades del hormigón y del hormigón armado"));
c.push(h2("6.1. Propiedades mecánicas"));
c.push(p("La propiedad básica es la **resistencia característica a compresión fck**, medida en probeta cilíndrica de 150×300 mm a 28 días, que es el valor que sólo el 5 % de las probetas no alcanzan. El resto de propiedades se estiman a partir de ella (Eurocódigo 2):"));
c.push(formula("fcm = fck + 8 MPa        fctm = 0,30 · fck^(2/3)        Ecm = 22 · (fcm/10)^0,3  [GPa]"));
c.push(tabla(
  ["Hormigón", "fck (MPa)", "fcm (MPa)", "fctm (MPa)", "Ecm (GPa)", "Uso típico"],
  [
    ["HA-25", "25", "33", "2,6", "31,5", "Edificación, cimentaciones"],
    ["HA-30", "30", "38", "2,9", "32,8", "Edificación, ambientes agresivos"],
    ["HA-40", "40", "48", "3,5", "35,2", "Pilares, prefabricados"],
    ["HA-50", "50", "58", "4,1", "37,3", "Puentes, alta resistencia"],
  ],
  [1300, 1100, 1100, 1200, 1200, 3126],
));
c.push(pie("Tabla 3. Propiedades mecánicas según la resistencia característica (valores calculados con las fórmulas del EC2)."));
c.push(p("El comportamiento del hormigón a compresión es no lineal. Para el cálculo se usa el **diagrama parábola-rectángulo** (Fig. 1), con deformación última εcu2 = 3,5 ‰. El acero se modeliza con un diagrama bilineal elástico-perfectamente plástico (Fig. 2)."));
c.push(...figura("fig1_hormigon.png", 440, 272, "Figura 1. Diagrama de cálculo parábola-rectángulo del hormigón HA-30 (fcd = fck/γc = 20 MPa)."));
c.push(...figura("fig2_acero.png", 440, 272, "Figura 2. Diagrama de cálculo bilineal del acero B500S (fyd = fyk/γs = 434,8 MPa)."));

c.push(h2("6.2. Deformaciones diferidas"));
[
  "**Retracción**: acortamiento del hormigón por pérdida de agua (retracción de secado) y por la propia hidratación (autógena). Valores finales típicos de 0,3–0,5 ‰. Genera fisuras si está coartada.",
  "**Fluencia**: aumento de la deformación bajo carga constante. La deformación final puede ser 2–3 veces la elástica (coeficiente de fluencia φ ≈ 2–3). Aumenta las flechas a largo plazo.",
].forEach((t) => c.push(li(t)));

c.push(h2("6.3. Propiedades físicas"));
c.push(tabla(
  ["Propiedad", "Hormigón", "Acero", "Hormigón armado"],
  [
    ["Densidad (kg/m³)", "2300 – 2400", "7850", "≈ 2500"],
    ["Coef. dilatación térmica (K⁻¹)", "10·10⁻⁶", "12·10⁻⁶", "10·10⁻⁶"],
    ["Conductividad térmica (W/m·K)", "1,6 – 2,0", "50", "≈ 2,3"],
    ["Comportamiento frente al fuego", "Incombustible (A1)", "Pierde el 50 % de fy a ≈ 600 °C", "Muy bueno si el recubrimiento es suficiente"],
  ],
  [2700, 1900, 2200, 2226],
));
c.push(pie("Tabla 4. Propiedades físicas comparadas."));

c.push(h1("7. Fabricación y puesta en obra"));
c.push(h2("7.1. Designación del hormigón"));
c.push(p("Según el Código Estructural, un hormigón se designa como **T – R / C / TM / A**: tipo (HM en masa, HA armado, HP pretensado), resistencia característica (MPa), consistencia (S seca, P plástica, B blanda, F fluida, L líquida), tamaño máximo del árido (mm) y designación del ambiente. Ejemplo: **HA-30/B/20/IIa**."));
c.push(h2("7.2. Proceso"));
nuevaLista();
[
  "**Dosificación**: cálculo de las cantidades de cada componente por m³ (ver apartado 7.3).",
  "**Amasado**: en central (hormigón preparado) o en obra; el tiempo desde el amasado hasta la puesta en obra no debe superar 1,5 horas.",
  "**Ferrallado y encofrado**: se colocan las armaduras con separadores que garantizan el recubrimiento.",
  "**Vertido**: desde una altura máxima de 1–2 m para evitar la segregación de los áridos.",
  "**Compactación**: con vibradores de aguja para eliminar el aire atrapado (cada 1 % de huecos reduce la resistencia ≈ 5 %). No es necesaria en el hormigón autocompactante.",
  "**Curado**: mantener la humedad durante al menos 3–7 días (riego, láminas o productos de curado). Un curado deficiente puede reducir la resistencia un 30 % y aumentar mucho la permeabilidad superficial.",
  "**Desencofrado**: cuando el hormigón alcanza la resistencia suficiente (días a semanas, según el elemento y la temperatura).",
].forEach((t) => c.push(num(t)));

c.push(h2("7.3. Ejemplo de dosificación: HA-30/B/20/IIa"));
c.push(p("Datos: fck = 30 MPa, consistencia blanda (asiento 6–9 cm), árido máximo 20 mm, ambiente IIa (exterior, humedad alta, sin cloruros). Requisitos del Código Estructural para ambiente IIa: a/c ≤ 0,60 y contenido de cemento ≥ 275 kg/m³."));
nuevaLista();
c.push(num("**Resistencia media objetivo**: fcm = fck + 8 = 38 MPa."));
c.push(num("**Relación a/c**: con un cemento CEM II/A-L 42,5 R y la ley de Abrams, para 38 MPa resulta a/c ≈ 0,50 (< 0,60, cumple durabilidad)."));
c.push(num("**Agua**: para consistencia blanda y árido de 20 mm con superplastificante: ≈ 175 L/m³."));
c.push(num("**Cemento**: 175 / 0,50 = 350 kg/m³ (≥ 275 kg/m³, cumple)."));
c.push(num("**Áridos**: se reparte el volumen restante (≈ 690 L) en ≈ 44 % arena y 56 % grava, con densidad de partícula 2,65 t/m³."));
c.push(tabla(
  ["Componente", "Masa (kg/m³)", "Densidad (kg/L)", "Volumen absoluto (L)"],
  [
    ["Cemento CEM II/A-L 42,5 R", "350", "3,10", "113"],
    ["Agua", "175", "1,00", "175"],
    ["Arena 0/4", "810", "2,65", "306"],
    ["Grava 4/20", "1020", "2,65", "385"],
    ["Superplastificante (1 % s.p.c.)", "3,5", "1,05", "3"],
    ["Aire ocluido (≈ 2 %)", "—", "—", "20"],
    ["TOTAL", "≈ 2360", "", "≈ 1002"],
  ],
  [3400, 1800, 1800, 2026],
));
c.push(pie("Tabla 5. Dosificación por metro cúbico. La suma de volúmenes ≈ 1 m³ confirma la coherencia de la dosificación."));
c.push(p("Esta dosificación teórica debe ajustarse con **amasadas de prueba** en laboratorio, corrigiendo la humedad real de los áridos y comprobando la consistencia (cono de Abrams) y la resistencia a 7 y 28 días."));

c.push(h1("8. Ensayos de caracterización y control"));
c.push(tabla(
  ["Ensayo", "Norma", "Qué mide", "Resultado típico"],
  [
    ["Cono de Abrams", "UNE-EN 12350-2", "Consistencia del hormigón fresco (asiento)", "Blanda: 6–9 cm"],
    ["Densidad y aire ocluido", "UNE-EN 12350-6 / -7", "Densidad y % de aire del fresco", "2350 kg/m³; 1–2 %"],
    ["Compresión en probeta", "UNE-EN 12390-3", "Resistencia a compresión (7 y 28 días)", "fc,28 ≥ fck"],
    ["Tracción indirecta (brasileño)", "UNE-EN 12390-6", "Resistencia a tracción", "≈ 0,1·fc"],
    ["Módulo de elasticidad", "UNE-EN 12390-13", "Ecm (módulo secante)", "30–35 GPa"],
    ["Penetración de agua bajo presión", "UNE-EN 12390-8", "Impermeabilidad (durabilidad)", "≤ 50 mm máx."],
    ["Carbonatación (fenolftaleína)", "UNE-EN 12390-12 / 14630", "Profundidad del frente carbonatado", "mm (k·√t)"],
    ["Tracción de barras", "UNE-EN ISO 15630-1", "fy, fs, alargamiento del acero", "fy ≥ 500 MPa"],
    ["Doblado-desdoblado", "UNE-EN ISO 15630-1", "Ductilidad del acero (sin fisuras)", "Apto"],
    ["Esclerómetro", "UNE-EN 12504-2", "Dureza superficial (no destructivo)", "Índice de rebote"],
    ["Ultrasonidos", "UNE-EN 12504-4", "Velocidad de pulso; homogeneidad", "> 4000 m/s: bueno"],
    ["Extracción de testigos", "UNE-EN 12504-1", "Resistencia in situ", "fc del testigo"],
  ],
  [2200, 2000, 2800, 2026],
));
c.push(pie("Tabla 6. Principales ensayos del hormigón y del acero."));
c.push(p("El **control de producción** se basa en ensayar probetas cilíndricas (150×300 mm) curadas en cámara húmeda a 20 ± 2 °C. La estimación de la resistencia característica real a partir de los resultados se hace con criterios estadísticos definidos en el Código Estructural. En el Anexo A se propone una práctica de laboratorio para el grupo."));

c.push(h1("9. Aplicación práctica: dimensionamiento de una viga"));
c.push(h2("9.1. Datos del problema"));
[
  "Viga biapoyada de luz **L = 6,00 m**, sección rectangular **b × h = 300 × 500 mm**.",
  "Materiales: hormigón **HA-30** (fck = 30 MPa) y acero **B500S** (fyk = 500 MPa).",
  "Ambiente IIa → recubrimiento nominal de 30 mm; canto útil estimado **d = 450 mm**.",
  "Cargas: permanente g = 15 kN/m (incluido peso propio); variable (uso) q = 10 kN/m.",
  "Coeficientes parciales: γG = 1,35, γQ = 1,50, γc = 1,50, γs = 1,15.",
].forEach((t) => c.push(li(t)));
c.push(...figura("fig3_seccion.png", 260, 332, "Figura 3. Sección transversal resultante del dimensionamiento."));

c.push(h2("9.2. Esfuerzos de cálculo (ELU)"));
c.push(formula("pd = 1,35·15 + 1,50·10 = 35,25 kN/m"));
c.push(formula("Md = pd·L²/8 = 35,25·6²/8 = 158,6 kN·m"));
c.push(formula("Vd = pd·L/2 = 35,25·6/2 = 105,8 kN"));
c.push(formula("fcd = 30/1,5 = 20 MPa        fyd = 500/1,15 = 434,8 MPa"));

c.push(h2("9.3. Armadura longitudinal a flexión"));
c.push(p("Se usa el diagrama rectangular simplificado (profundidad y = 0,8·x, tensión fcd). Momento reducido:"));
c.push(formula("μ = Md / (b·d²·fcd) = 158,6·10⁶ / (300·450²·20) = 0,131"));
c.push(formula("y = d·(1 − √(1 − 2μ)) = 450·(1 − √0,739) = 63,1 mm   →   x = y/0,8 = 78,9 mm"));
c.push(p("x/d = 0,175 < 0,45: la sección rompe de forma **dúctil** (el acero plastifica antes de que el hormigón agote) y no necesita armadura de compresión."));
c.push(formula("As = b·y·fcd / fyd = 300·63,1·20 / 434,8 = 871 mm²"));
c.push(p("Se disponen **3Ø20 (As = 942 mm²)**. Comprobación de cuantías mínimas:"));
c.push(formula("As,min (mecánica) = 0,26·(fctm/fyk)·b·d = 0,26·(2,90/500)·300·450 = 204 mm²"));
c.push(formula("As,min (geométrica, 3,3 ‰ para B500) = 0,0033·300·500 = 495 mm²"));
c.push(p("942 mm² > 495 mm² → **cumple**. Además se colocan 2Ø12 superiores como armadura de montaje."));

c.push(h2("9.4. Armadura transversal a cortante"));
c.push(p("Resistencia a cortante del hormigón sin armadura transversal (EC2, 6.2.2):"));
c.push(formula("k = 1 + √(200/d) = 1 + √(200/450) = 1,67 ≤ 2        ρl = 942/(300·450) = 0,0070"));
c.push(formula("VRd,c = (0,18/γc)·k·(100·ρl·fck)^(1/3)·b·d = 0,12·1,67·(20,9)^(1/3)·300·450 = 74,4 kN"));
c.push(p("Como Vd = 105,8 kN > VRd,c = 74,4 kN, **se necesitan estribos**. Con bielas a 45° (cot θ = 1) y z = 0,9·d = 405 mm:"));
c.push(formula("Asw/s = Vd / (z·fywd·cot θ) = 105 750 / (405·434,8·1) = 0,60 mm²/mm"));
c.push(p("Con estribos de dos ramas Ø8 (Asw = 100,5 mm²): s ≤ 100,5/0,60 = 167 mm → se disponen **estribos Ø8 cada 150 mm** (separación máxima 0,75·d = 337 mm; cuantía mínima 0,08·√fck/fyk·b = 0,26 mm²/mm → cumple)."));
c.push(p("Comprobación del agotamiento de las bielas comprimidas: VRd,max = b·z·ν₁·fcd/(cot θ + tan θ) = 300·405·0,528·20/2 = 641 kN ≫ 105,8 kN → **cumple**."));

c.push(h2("9.5. Estado límite de servicio: flecha"));
c.push(p("Se comprueba la esbeltez límite L/d del EC2 (7.4.2) para viga biapoyada (K = 1), con ρ₀ = √fck·10⁻³ = 0,0055 y ρ = 0,0070 > ρ₀:"));
c.push(formula("(L/d)lím = K·[11 + 1,5·√fck·ρ₀/ρ] = 11 + 1,5·5,48·0,0055/0,0070 = 17,4"));
c.push(p("La esbeltez real es 6000/450 = 13,3 < 17,4 → **no es necesario calcular la flecha**."));

c.push(h2("9.6. Resumen del armado"));
c.push(tabla(
  ["Elemento", "Armadura", "Comprobación"],
  [
    ["Inferior (tracción)", "3Ø20 (942 mm²)", "As,nec = 871 mm² ✔"],
    ["Superior (montaje)", "2Ø12", "Constructiva"],
    ["Estribos", "Ø8 c/150 mm (2 ramas)", "Asw/s,nec = 0,60 mm²/mm ✔"],
    ["Recubrimiento", "30 mm", "Ambiente IIa ✔"],
    ["Flecha", "—", "L/d = 13,3 < 17,4 ✔"],
  ],
  [2600, 3200, 3226],
));
c.push(pie("Tabla 7. Resumen del dimensionamiento de la viga."));

c.push(h1("10. Durabilidad y patologías"));
c.push(p("La durabilidad es la capacidad de la estructura de mantener sus prestaciones durante su vida útil (50 años en edificación, 100 en puentes). La mayoría de las patologías del hormigón armado tienen que ver con la **corrosión de las armaduras**: el óxido ocupa entre 2 y 6 veces el volumen del acero original, lo que fisura y desprende el recubrimiento, y además reduce la sección resistente de las barras."));
c.push(h2("10.1. Mecanismos de deterioro"));
[
  "**Carbonatación**: el CO₂ atmosférico reacciona con la portlandita, Ca(OH)₂ + CO₂ → CaCO₃ + H₂O, y baja el pH a ≈ 9. Cuando el frente carbonatado alcanza la armadura, se destruye la capa pasivante. Su avance sigue aproximadamente la ley x = k·√t (k en mm/año^0,5, entre 2 y 6 según la calidad del hormigón).",
  "**Cloruros** (ambiente marino, sales de deshielo): los iones Cl⁻ rompen localmente la capa pasiva incluso con pH alto y provocan **corrosión por picaduras**, muy peligrosa. El umbral crítico se sitúa en torno al 0,4 % de cloruros respecto al peso de cemento.",
  "**Ataque por sulfatos**: forman etringita secundaria expansiva que fisura el hormigón. Se previene con cementos resistentes a sulfatos (SR, bajo C₃A).",
  "**Reacción álcali-árido**: ciertos áridos silíceos reaccionan con los álcalis del cemento formando un gel expansivo.",
  "**Hielo-deshielo**: el agua de los poros se expande un 9 % al congelar. Se previene con aireantes y baja a/c.",
  "**Fisuración** por retracción plástica, térmica o por sobrecarga, que abre caminos a los agentes agresivos.",
].forEach((t) => c.push(li(t)));

c.push(h2("10.2. Clases de exposición y requisitos"));
c.push(tabla(
  ["Clase", "Ambiente", "a/c máx.", "Cemento mín. (kg/m³)", "Recubrimiento orientativo (mm)"],
  [
    ["I", "Interior seco", "0,65", "250", "15 – 25"],
    ["IIa", "Exterior, humedad alta", "0,60", "275", "25 – 35"],
    ["IIb", "Exterior, humedad media", "0,55", "300", "30 – 40"],
    ["IIIa", "Marino aéreo", "0,50", "300", "35 – 45"],
    ["IIIb", "Marino sumergido", "0,50", "325", "40 – 50"],
    ["IIIc", "Zona de carrera de mareas", "0,45", "350", "45 – 55"],
    ["IV", "Cloruros no marinos", "0,50", "325", "35 – 45"],
  ],
  [900, 2600, 1200, 1900, 2426],
));
c.push(pie("Tabla 8. Requisitos de durabilidad por ambiente (valores orientativos basados en la EHE-08 / Código Estructural; el Código Estructural usa además la nomenclatura XC, XD, XS, XF, XA del EC2)."));
c.push(h2("10.3. Prevención y reparación"));
[
  "Baja relación a/c, buena compactación y **curado cuidadoso**.",
  "**Recubrimientos** adecuados al ambiente y control de la abertura de fisura (wmáx 0,2–0,4 mm).",
  "Adiciones (escoria, cenizas, humo de sílice) que reducen la permeabilidad a cloruros.",
  "Protección superficial (pinturas, hidrofugantes), armaduras galvanizadas, inoxidables o de GFRP, y protección catódica en casos críticos.",
  "Reparación: saneado del hormigón dañado, limpieza de armaduras, pasivadores y morteros de reparación (UNE-EN 1504), o refuerzo con laminados de fibra de carbono.",
].forEach((t) => c.push(li(t)));

c.push(h1("11. Sostenibilidad e impacto ambiental"));
c.push(p("El hormigón es el segundo material más consumido del planeta después del agua (≈ 30 000 millones de toneladas al año). La fabricación del cemento es responsable de alrededor del **7–8 % de las emisiones mundiales de CO₂**. Cada tonelada de clínker emite aproximadamente 0,8–0,9 t de CO₂, de las que cerca del 60 % procede de la descarbonatación de la caliza (CaCO₃ → CaO + CO₂) y el resto de la combustión."));
c.push(p("Estrategias de reducción:"));
[
  "Cementos con menos clínker (CEM II, CEM III, LC3 con arcilla calcinada y caliza).",
  "Combustibles alternativos y captura de carbono (CCUS) en cementeras.",
  "Áridos reciclados y acero con alto contenido reciclado (el acero de armar procede mayoritariamente de chatarra en horno eléctrico).",
  "Optimización estructural: hormigones de mayor resistencia permiten secciones más pequeñas.",
  "Mayor vida útil: una estructura durable es la más sostenible.",
].forEach((t) => c.push(li(t)));
c.push(p("Como aspecto positivo, el hormigón **reabsorbe parte del CO₂** a lo largo de su vida por carbonatación, y su elevada inercia térmica reduce la demanda energética de los edificios."));

c.push(h1("12. Aplicaciones"));
[
  "**Edificación**: cimentaciones, pilares, vigas, forjados, muros y núcleos de escaleras.",
  "**Obra civil**: puentes, túneles, presas, muros de contención, depósitos y canales.",
  "**Infraestructuras**: pavimentos de aeropuertos, traviesas de ferrocarril (pretensadas), torres eólicas.",
  "**Prefabricados**: tubos, placas alveolares, paneles de fachada, pilotes.",
  "**Obras singulares**: rascacielos (Burj Khalifa, hormigón de hasta 80 MPa), estructuras marinas y centrales nucleares.",
].forEach((t) => c.push(li(t)));

c.push(h1("13. Ventajas e inconvenientes"));
c.push(tabla(
  ["Ventajas", "Inconvenientes"],
  [
    ["Materias primas abundantes y baratas", "Elevado peso propio (≈ 25 kN/m³)"],
    ["Moldeable en cualquier forma; estructuras monolíticas", "Baja resistencia a tracción; se fisura"],
    ["Buena resistencia al fuego", "Necesita encofrados y tiempo de curado"],
    ["Durable con bajo mantenimiento si está bien ejecutado", "Corrosión de armaduras en ambientes agresivos"],
    ["No requiere mano de obra muy especializada", "Alta huella de CO₂ del cemento"],
    ["Buen aislamiento acústico e inercia térmica", "Difícil de modificar, reparar y reciclar al 100 %"],
  ],
  [4513, 4513],
));
c.push(pie("Tabla 9. Ventajas e inconvenientes del hormigón armado."));

c.push(h1("14. Conclusiones"));
[
  "El hormigón armado es un **material compuesto** cuyo éxito se explica por la complementariedad de sus fases: el hormigón aporta resistencia a compresión, rigidez, moldeabilidad y protección; el acero aporta resistencia a tracción y ductilidad.",
  "Las propiedades del hormigón vienen determinadas por su **microestructura**, y en particular por la porosidad capilar, que depende sobre todo de la relación agua/cemento, la compactación y el curado.",
  "La **durabilidad** está ligada a la protección química del acero: controlar la carbonatación y la entrada de cloruros (baja a/c, recubrimiento suficiente, buen curado) es tan importante como el cálculo resistente.",
  "El caso práctico muestra que una viga de 6 m con cargas de edificación se resuelve con 3Ø20 y estribos Ø8 c/150 en HA-30, con rotura dúctil y sin problemas de flecha.",
  "El principal reto futuro del material es **reducir su huella de carbono** sin sacrificar prestaciones ni durabilidad.",
].forEach((t) => c.push(li(t)));

c.push(h1("Bibliografía"));
[
  "Ministerio de la Presidencia (2021). Real Decreto 470/2021, de 29 de junio, por el que se aprueba el Código Estructural. BOE núm. 190.",
  "CEN (2004). EN 1992-1-1. Eurocódigo 2: Proyecto de estructuras de hormigón. Parte 1-1: Reglas generales y reglas para edificación.",
  "Jiménez Montoya, P., García Meseguer, Á., Morán Cabré, F. y Arroyo Portero, J. C. (2009). Hormigón Armado (15.ª ed.). Barcelona: Gustavo Gili.",
  "Neville, A. M. (2011). Properties of Concrete (5th ed.). Harlow: Pearson.",
  "Mehta, P. K. y Monteiro, P. J. M. (2014). Concrete: Microstructure, Properties, and Materials (4th ed.). New York: McGraw-Hill.",
  "Callister, W. D. y Rethwisch, D. G. (2016). Ciencia e Ingeniería de Materiales. Barcelona: Reverté.",
  "Fernández Cánovas, M. (2013). Hormigón (10.ª ed.). Madrid: Colegio de Ingenieros de Caminos, Canales y Puertos.",
  "AENOR. UNE-EN 197-1 (Cementos), UNE-EN 206 (Hormigón), UNE-EN 12390 (Ensayos de hormigón endurecido), UNE-EN ISO 15630-1 (Aceros para armaduras).",
].forEach((t) => c.push(new Paragraph({ numbering: { reference: "biblio", level: 0 }, children: [new TextRun(t)], spacing: { after: 100 } })));

c.push(h1("Anexo A. Propuesta de práctica de laboratorio"));
c.push(p("**Objetivo:** fabricar probetas con la dosificación de la Tabla 5 y con una variante de a/c = 0,65, y comprobar experimentalmente la influencia de la relación agua/cemento en la resistencia (ley de Abrams)."));
c.push(p("**Material:** hormigonera, cono de Abrams, 6 moldes cilíndricos 150×300 mm (o cúbicos 150 mm), barra de picado o mesa vibrante, cámara de curado, prensa de compresión."));
c.push(p("**Procedimiento:**"));
nuevaLista();
[
  "Pesar los componentes para 0,03 m³ por amasada (multiplicar la Tabla 5 por 0,03).",
  "Amasar 3 minutos y medir el asiento en el cono de Abrams (UNE-EN 12350-2).",
  "Llenar los moldes en capas compactadas (UNE-EN 12390-2) y enrasar.",
  "Desmoldar a las 24 h y curar en agua a 20 °C.",
  "Romper 3 probetas a 7 días y 3 a 28 días de cada amasada (UNE-EN 12390-3).",
  "Opcional: aplicar fenolftaleína en la superficie de rotura de una probeta expuesta al aire para visualizar la carbonatación.",
].forEach((t) => c.push(num(t)));
c.push(p("**Tabla de resultados (a completar):**"));
c.push(tabla(
  ["Amasada", "a/c", "Asiento (cm)", "fc 7 días (MPa)", "fc 28 días (MPa)", "Tipo de rotura"],
  [
    ["A", "0,50", "", "", "", ""],
    ["B", "0,65", "", "", "", ""],
  ],
  [1300, 900, 1500, 1700, 1700, 1926],
));
c.push(pie("Tabla A.1. Plantilla de resultados del ensayo."));
c.push(p("**Resultado esperado:** la amasada B debería dar una resistencia a 28 días aproximadamente un 25–35 % menor que la A, confirmando la ley de Abrams."));

// ---------- documento ----------
const doc = new Document({
  creator: "Grupo de Ingeniería de Materiales",
  title: "El hormigón armado",
  styles: {
    default: { document: { run: { font: "Calibri", size: 22 } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 32, bold: true, color: AZUL }, paragraph: { spacing: { before: 240, after: 200 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 26, bold: true, color: AZUL }, paragraph: { spacing: { before: 240, after: 120 }, outlineLevel: 1 } },
      { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 23, bold: true, color: "404040" }, paragraph: { spacing: { before: 180, after: 80 }, outlineLevel: 2 } },
    ],
  },
  numbering: {
    config: [
      { reference: "vinetas", levels: [
        { level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } },
        { level: 1, format: LevelFormat.BULLET, text: "–", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 1440, hanging: 360 } } } },
      ] },
      { reference: "numeros", levels: [
        { level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } },
      ] },
      { reference: "biblio", levels: [
        { level: 0, format: LevelFormat.DECIMAL, text: "[%1]", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 540 } } } },
      ] },
    ],
  },
  sections: [
    { properties: { page: { margin: { top: 1418, bottom: 1418, left: 1418, right: 1418 } } }, children: portada },
    {
      properties: { page: { margin: { top: 1418, bottom: 1418, left: 1418, right: 1418 } } },
      headers: { default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: "El hormigón armado · Ingeniería de Materiales", size: 16, color: "808080" })] })] }) },
      footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ children: [PageNumber.CURRENT], size: 18 })] })] }) },
      children: [...indice, ...c],
    },
  ],
});

Packer.toBuffer(doc).then((buf) => {
  fs.writeFileSync(path.join(__dirname, "Memoria_Hormigon_Armado.docx"), buf);
  console.log("Memoria_Hormigon_Armado.docx generado");
});
