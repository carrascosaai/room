// Genera "Novedades_Hormigon_Armado_2026.docx": estado del arte y últimas novedades del
// hormigón armado (búsqueda en internet realizada el 2 de octubre de 2026).
// Uso: node generar_novedades.js   (requiere el paquete npm "docx")
const fs = require("fs");
const path = require("path");
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableRow, TableCell,
  WidthType, ShadingType, BorderStyle, TableOfContents, Footer, Header, PageNumber, LevelFormat,
  ExternalHyperlink,
} = require("docx");

const AZUL = "1F4E79";

// ---------- utilidades ----------
// Texto con **negrita**, *cursiva* y referencias [n] que enlazan a la lista de fuentes.
function runs(text) {
  return text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|\[\d+(?:,\s?\d+)*\])/).filter(Boolean).map((t) => {
    if (t.startsWith("**")) return new TextRun({ text: t.slice(2, -2), bold: true });
    if (t.startsWith("*") && t.endsWith("*") && t.length > 2) return new TextRun({ text: t.slice(1, -1), italics: true });
    if (/^\[\d/.test(t)) return new TextRun({ text: t, color: AZUL, size: 18 });
    return new TextRun(t);
  });
}
const p = (text, opts = {}) => new Paragraph({ children: runs(text), spacing: { after: 120, line: 300 }, alignment: AlignmentType.JUSTIFIED, ...opts });
const h1 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(t)], pageBreakBefore: true });
const h2 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(t)] });
const li = (t) => new Paragraph({ numbering: { reference: "vinetas", level: 0 }, children: runs(t), spacing: { after: 60, line: 280 } });
const pie = (t) => new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 240 }, children: [new TextRun({ text: t, italics: true, size: 18, color: "555555" })] });

// Recuadro "Qué significa para el hormigón armado".
function claveRA(texto) {
  return new Table({
    width: { size: 9026, type: WidthType.DXA }, columnWidths: [9026],
    rows: [new TableRow({ children: [new TableCell({
      width: { size: 9026, type: WidthType.DXA },
      shading: { type: ShadingType.CLEAR, fill: "EAF1F8", color: "auto" },
      borders: { top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" }, bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
        right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" }, left: { style: BorderStyle.SINGLE, size: 24, color: AZUL } },
      margins: { top: 100, bottom: 100, left: 180, right: 180 },
      children: [new Paragraph({ spacing: { line: 280 }, children: [new TextRun({ text: "Qué significa para el hormigón armado: ", bold: true, color: AZUL }), ...runs(texto)] })],
    })] })],
  });
}
const espacio = () => new Paragraph({ spacing: { after: 120 }, children: [] });

const borde = { style: BorderStyle.SINGLE, size: 4, color: "A6A6A6" };
const bordes = { top: borde, bottom: borde, left: borde, right: borde };
function tabla(cabecera, filas, anchos) {
  const total = anchos.reduce((a, b) => a + b, 0);
  const celda = (t, i, esCab) => new TableCell({
    width: { size: anchos[i], type: WidthType.DXA }, borders: bordes,
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
    shading: esCab ? { type: ShadingType.CLEAR, fill: AZUL, color: "auto" } : undefined,
    children: [new Paragraph({ children: [new TextRun({ text: t, bold: esCab, color: esCab ? "FFFFFF" : undefined, size: 18 })] })],
  });
  return new Table({
    width: { size: total, type: WidthType.DXA }, columnWidths: anchos,
    rows: [
      new TableRow({ tableHeader: true, children: cabecera.map((t, i) => celda(t, i, true)) }),
      ...filas.map((f) => new TableRow({ children: f.map((t, i) => celda(t, i, false)) })),
    ],
  });
}

// ---------- fuentes (numeradas en orden de aparición) ----------
const F = [
  ["The Concrete Centre – 2nd Generation Eurocode 2", "https://www.concretecentre.com/News/2023/2nd-Generation-Eurocode-2.aspx"],
  ["Peikko – Next Generation Eurocode 2: What's Coming and Why It Matters", "https://www.peikko.com/blog/next-generation-eurocode-2/"],
  ["ACIES – El calendario de implantación de los Eurocódigos de segunda generación", "https://www.acies.es/comunicacion/el-calendario-de-implantacion-de-los-eurocodigos-de-segunda-generacion-ya-esta-en-marcha"],
  ["Estructurando – Ya está aquí la Segunda Generación de los Eurocódigos (11/05/2026)", "https://estructurando.net/2026/05/11/ya-esta-aqui-la-segunda-generacion-de-los-eurocodigos/"],
  ["Graitec – Eurocódigos, segunda generación: qué cambia", "https://graitec.com/es/blog/segunda-generacion-eurocodigos-que-cambia/"],
  ["Demócrata – Transportes e IECA refuerzan la investigación en cemento y hormigón", "https://www.democrata.es/economia/transportes-e-ieca-refuerzan-la-investigacion-en-cemento-y-hormigon-para-la-ingenieria-civil/"],
  ["ARPHO – La descarbonización del hormigón avanza en España", "https://www.arpho.org/comunicacion/la-descarbonizacion-del-hormigon-avanza-en-espana-oportunidades-y-retos-para-el-sector-de-la-reparacion-y-proteccion"],
  ["AASHTO Journal – AASHTO Issues Ultra-High Performance Concrete Guide", "https://aashtojournal.transportation.org/aashto-issues-ultra-high-performance-concrete-guide/"],
  ["Concrete Society – Alkali activated cements (including geopolymer cements)", "https://www.concrete.org.uk/fingertips/alkali-activated-cements-including-geopolymer-cements/"],
  ["CMMB TU Delft – News (RILEM TC 294-MPA)", "https://sites.google.com/view/cmmb-tudelft/news"],
  ["Heidelberg Materials – World premiere: CCS cement facility opens in Norway (18/06/2025)", "https://www.heidelbergmaterials.com/en/pr-2025-06-18"],
  ["Heidelberg Materials – evoZero hits the market (17/10/2025)", "https://www.heidelbergmaterials.com/en/pr-2025-10-17"],
  ["ACS – Electricity could produce cement with almost no carbon footprint (05/2026)", "https://www.acs.org/pressroom/presspacs/2026/may/electricity-could-produce-cement-with-almost-no-carbon-footprint.html"],
  ["AZoM – How Electricity Could Slash Cement Emissions by 98%", "https://www.azom.com/news.aspx?newsID=65434"],
  ["Construction Dive – Cement producer pauses factory construction after funding pullback", "https://www.constructiondive.com/news/sublime-pauses-factory-construction-funding-pullback/807835/"],
  ["S&P Global – Sublime Systems pauses Holyoke plant after losing federal grant", "https://www.spglobal.com/energy/en/news-research/latest-news/fertilizers/121125-us-cement-maker-sublime-systems-pauses-holyoke-plant-after-losing-federal-grant"],
  ["Cambridge Enterprise – Cambridge Electric Cement raises £2.25m", "https://www.enterprise.cam.ac.uk/news/cambridge-electric-cement-raises-2-25m-to-industrialise-low-carbon-circular-cement-production/"],
  ["Cambridge Electric Cement – Industrial demonstrator (Cement 2 Zero)", "https://cambridgeelectriccement.com/cement-2-zero/"],
  ["MDPI Sustainability – LC3: Evolution of a Ternary Binder (2026)", "https://www.mdpi.com/2071-1050/18/7/3473"],
  ["RMI – Unleashing the Potential of LC3", "https://rmi.org/unleashing-the-potential-of-limestone-calcined-clay-cement/"],
  ["Carbon Herald – CarbonCure Named Climate Technology Company Of The Year", "https://carbonherald.com/carboncure-named-climate-technology-company-of-the-year/"],
  ["CarbonCure – MIT study reveals how CO₂ mineralization improves concrete microstructure", "https://www.carboncure.com/news/mit-study-with-carboncure-reveals-how-co2-mineralization-drives-improved-concrete-microstructure/"],
  ["BNN Bloomberg – INKAS research identifies opportunity to reduce cement emissions (30/03/2026)", "https://www.bnnbloomberg.ca/press-releases/2026/03/30/inkas-research-with-canadian-scientists-identifies-breakthrough-opportunity-to-reduce-cement-emissions/"],
  ["EurekAlert – New concrete formula creates stronger structures that absorb CO₂ (09/2026)", "https://www.eurekalert.org/news-releases/1122337"],
  ["Research and Markets – FRP Rebars Market Report 2026", "https://www.researchandmarkets.com/reports/6226719/fiber-reinforced-polymer-frp-rebars-market"],
  ["Future Market Insights – BFRP Market 2026-2036", "https://www.futuremarketinsights.com/reports/basalt-fiber-reinforced-polymer-bfrp-market"],
  ["TU Dresden – The CUBE", "https://tu-dresden.de/bu/bauingenieurwesen/imb/forschung/grossprojekte/cube"],
  ["Springer – Iron-Based Shape Memory Alloys in Construction: A Review (2025)", "https://link.springer.com/article/10.1007/s40830-025-00560-x"],
  ["Wiley Structural Concrete – Prestressed beams strengthened with Fe-SMA plates (2025)", "https://onlinelibrary.wiley.com/doi/10.1002/suco.70358"],
  ["Transition Asia – Will China Win the Green Steel Race? H2-DRI-EAF", "https://transitionasia.org/will-china-win-the-green-steel-race/"],
  ["Automation in Construction – Arc stud welding and spatial reinforcement in 3DCP (2026)", "https://www.sciencedirect.com/science/article/abs/pii/S0926580526003547"],
  ["Communications Engineering – 3D-printed concrete with embedded FRP grid (2026)", "https://www.nature.com/articles/s44172-026-00628-1"],
  ["Cement and Concrete Research – Concrete printing with textile reinforcement (2026)", "https://www.sciencedirect.com/science/article/pii/S0008884626002115"],
  ["Construction and Building Materials – Foldable reinforcement skeleton for 3DCP (2026)", "https://www.sciencedirect.com/science/article/abs/pii/S0950061826017605"],
  ["Scientific Reports – 3D-printed concrete columns with GFRP rebars (2025)", "https://www.nature.com/articles/s41598-025-22990-4"],
  ["Springer IJCE – Bacterial concrete for strength and self-healing (2026)", "https://link.springer.com/article/10.1007/s41062-026-02783-y"],
  ["Buildings (MDPI) – Biomineralization-based self-healing concrete: bacteria to fungi and algae (2026)", "https://doi.org/10.3390/buildings16153137"],
  ["MIT News – Pompeii offers insights into ancient Roman building technology (12/2025)", "https://news.mit.edu/2025/pompeii-offers-insights-ancient-roman-building-technology-1209"],
  ["MIT EC³ Hub – Concrete \"battery\" now packs 10 times the power (10/2025)", "https://eccube.mit.edu/2025/10/01/concrete-battery-developed-at-mit-now-packs-10-times-the-power/"],
  ["Advanced Science – Structural cement-based supercapacitors (2026)", "https://advanced.onlinelibrary.wiley.com/doi/10.1002/advs.202515769"],
  ["Chalmers – World first concept for rechargeable cement-based batteries", "https://news.cision.com/chalmers/r/world-first-concept-for-rechargeable-cement-based-batteries,c3342255"],
  ["Ambientum – PhotoKrete: un mortero fotónico para enfriar las ciudades", "https://www.ambientum.com/ambientum/eficiencia-energetica/photokrete-un-mortero-fotonico-para-enfriar-las-ciudades-y-combatir-el-efecto-isla-de-calor.asp"],
  ["Ikerbasque – Desarrollan un hormigón para hacer frente al cambio climático", "https://www.ikerbasque.net/es/noticias/desarrollan-un-hormigon-para-hacer-frente-al-cambio-climatico"],
  ["UPV Innovación – El hormigón más ecológico sale de los laboratorios de la UPV", "https://innovacion.upv.es/noticias/el-hormigon-mas-ecologico-sale-de-los-laboratorios-de-la-upv/"],
  ["CemNet – Graphene-enhanced cement gaining ground", "https://www.cemnet.com/News/story/180228/graphene-enhanced-cement-gaining-ground.html"],
  ["Mass Concrete – Graphene Concrete for Specification: Breakthrough or Hype?", "https://www.mass-concrete.com/news/graphene-concrete-breakthrough-specification"],
  ["Concrete Products – Meta releases Amrize-tested AI model for concrete mix design (31/03/2026)", "https://concreteproducts.com/index.php/2026/03/31/meta-releases-amrize-tested-ai-model-for-concrete-mix-design/"],
  ["arXiv – BOxCrete: A Bayesian Optimization Open-Source AI (2026)", "https://arxiv.org/pdf/2603.21525v1"],
  ["GitHub – facebookresearch/SustainableConcrete", "https://github.com/facebookresearch/SustainableConcrete"],
  ["Springer ESPR – Artificial intelligence in concrete mix design: a comprehensive review (2026)", "https://link.springer.com/article/10.1007/s11356-026-37541-1"],
  ["Structures – Machine learning applications in reinforced concrete structures: review (2026)", "https://www.sciencedirect.com/science/article/pii/S2352012426010520"],
  ["arXiv – 3D damage visualization via Gaussian Splatting-enabled digital twins (2026)", "https://arxiv.org/pdf/2602.16713"],
  ["Springer – Automated bridge inspection: UAVs, AI and a flying robot for corrosion assessment", "https://link.springer.com/chapter/10.1007/978-3-032-14170-5_3"],
  ["ACPA – Research Alert: how new science predicts where structures will fail (05/2026)", "https://www.concretepavements.org/2026/05/26/research-alert-unlocking-the-code-of-concrete-how-new-science-predicts-where-structures-will-fail/"],
  ["EurekAlert – New research enables safe reuse of concrete (2026)", "https://www.eurekalert.org/news-releases/1114522"],
  ["Springer – Corrosion behavior of reinforcing steel in concrete systems (artículos recientes)", "https://link.springer.com/subjects/corrosion-behavior-of-reinforcing-steel-in-concrete-systems"],
  ["Materials (MDPI) – Corrosion of rebar-reinforced UHPC (2025)", "https://doi.org/10.3390/ma18112661"],
  ["J. Structural Integrity and Maintenance – Rebar/concrete interface restraint and corrosion cracking", "https://www.tandfonline.com/doi/abs/10.1080/24705314.2025.2595370"],
];

// ---------- portada ----------
const portada = [
  new Paragraph({ spacing: { before: 2200 }, alignment: AlignmentType.CENTER, children: [new TextRun({ text: "INGENIERÍA DE MATERIALES · DOCUMENTO DE INVESTIGACIÓN", size: 24, color: "555555" })] }),
  new Paragraph({ spacing: { before: 500 }, alignment: AlignmentType.CENTER, children: [new TextRun({ text: "NOVEDADES DEL HORMIGÓN ARMADO", bold: true, size: 52, color: AZUL })] }),
  new Paragraph({ spacing: { before: 200 }, alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Estado del arte 2025–2026: normativa, descarbonización, nuevas armaduras, fabricación digital, materiales inteligentes, IA y durabilidad", size: 26 })] }),
  new Paragraph({ spacing: { before: 200 }, alignment: AlignmentType.CENTER, border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: AZUL, space: 1 } }, children: [] }),
  new Paragraph({ spacing: { before: 1600 }, alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Búsqueda bibliográfica en internet realizada el 2 de octubre de 2026", size: 22, italics: true })] }),
  new Paragraph({ spacing: { before: 400 }, alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Autores: [Nombre y apellidos de los integrantes]", size: 24 })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "[Universidad / Escuela] · Curso 2026/2027", size: 24 })] }),
];

const indice = [
  new Paragraph({ pageBreakBefore: true, children: [new TextRun({ text: "Índice", bold: true, size: 32, color: AZUL })], spacing: { after: 200 } }),
  new TableOfContents("Índice", { hyperlink: true, headingStyleRange: "1-2" }),
  p("(Si el índice aparece vacío, en Word: clic derecho sobre él → «Actualizar campos».)", { alignment: AlignmentType.LEFT }),
];

// ---------- contenido ----------
const c = [];

c.push(h1("Introducción y metodología"));
c.push(p("El hormigón armado es una tecnología con más de 150 años, pero está viviendo uno de sus periodos de mayor cambio. Tres fuerzas lo empujan: la **necesidad de descarbonizar** el cemento (responsable de alrededor del 8 % de las emisiones mundiales de CO₂), la **digitalización** (impresión 3D, inteligencia artificial, gemelos digitales) y la **renovación normativa** europea con la segunda generación de Eurocódigos."));
c.push(p("Este documento recoge las novedades más relevantes publicadas hasta el **2 de octubre de 2026**, obtenidas mediante una búsqueda extensa en internet en artículos científicos (Nature, ACS, Elsevier, Wiley, Springer, MDPI, arXiv), notas de universidades y centros de investigación (MIT, UBC, Cambridge, TU Dresden, Empa, CSIC), organismos normativos (CEN, AASHTO) y prensa técnica e industrial."));
c.push(p("**Cómo leer este documento.** Cada novedad indica su **grado de madurez**, porque no es lo mismo un resultado de laboratorio que un producto que ya se vende:"));
[
  "**Laboratorio**: resultado publicado en una investigación, todavía sin uso real.",
  "**Piloto / demostrador**: probado a escala real en pocos proyectos.",
  "**Comercial**: disponible en el mercado o ya en uso en obras.",
  "**Normativa**: incorporado a normas o guías oficiales de diseño.",
].forEach((t) => c.push(li(t)));
c.push(p("Las referencias entre corchetes [n] remiten a la lista de fuentes del final, con enlace. **Aviso:** parte de la información procede de notas de prensa o de empresas; antes de citar un dato concreto en un trabajo académico conviene consultar el artículo original."));

c.push(h1("Resumen: las novedades de un vistazo"));
c.push(tabla(
  ["Novedad", "Fecha", "Madurez", "Por qué importa"],
  [
    ["Eurocódigo 2 de 2.ª generación (EN 1992-1-1:2023)", "2023 → obligatorio 2027-28", "Normativa", "Nueva base de cálculo del hormigón armado en Europa"],
    ["Captura de CO₂ en cementera (Brevik) y cemento evoZero", "jun. y oct. 2025", "Comercial", "Primer cemento con CO₂ capturado a escala industrial"],
    ["Cemento electroquímico (UBC)", "may. 2026", "Laboratorio", "Hasta −98 % de CO₂ usando cemento reciclado"],
    ["Cemento reciclado en horno de arco eléctrico (Cambridge)", "2024-2026", "Piloto", "Recicla cemento viejo al reciclar acero"],
    ["Cemento LC3 (caliza + arcilla calcinada)", "en expansión", "Comercial", "−30-40 % de CO₂ con poca inversión"],
    ["Mineralización de CO₂ (CarbonCure)", ">10 M de camiones", "Comercial", "Almacena CO₂ y reduce cemento un 4-6 %"],
    ["Armaduras de FRP (vidrio, basalto)", "mercado 2026", "Comercial", "No se corroen; alternativa en ambientes agresivos"],
    ["Aleaciones con memoria de forma (Fe-SMA)", "2025", "Piloto / comercial", "Pretensado sin gatos ni anclajes para refuerzo"],
    ["Impresión 3D con armadura integrada", "2026", "Laboratorio / piloto", "Resuelve el gran problema de armar lo impreso"],
    ["Hormigón autorreparable con bacterias", "2026", "Laboratorio / piloto", "Sella fisuras y protege la armadura"],
    ["El secreto del hormigón romano (Pompeya)", "dic. 2025", "Laboratorio", "Mezcla en caliente con cal viva que se autorrepara"],
    ["Hormigón que almacena energía (ec³, MIT)", "oct. 2025", "Laboratorio / demostrador", "Elementos estructurales que funcionan como baterías"],
    ["Hormigón radiativo español (PhotoKrete)", "2024-2026", "Piloto", "Superficies hasta 30-35 °C más frías"],
    ["IA para dosificar hormigón (BOxCrete, Meta)", "mar. 2026", "Comercial (código abierto)", "Endurece un 43 % más rápido en obra real"],
    ["Reutilización de elementos de hormigón", "2026", "Laboratorio / piloto", "Vigas y losas con 50-100 años más de vida"],
  ],
  [2700, 1500, 1500, 3326],
));
c.push(pie("Tabla 1. Resumen de las principales novedades identificadas."));

// 1. NORMATIVA
c.push(h1("1. Normativa y códigos de diseño"));
c.push(h2("1.1. Eurocódigo 2 de segunda generación (EN 1992-1-1:2023)"));
c.push(p("Es **el cambio más importante para quien calcula hormigón armado en Europa**. La nueva versión del Eurocódigo 2 se terminó en abril de 2023 y se publicó a finales de 2023 (BSI la publicó el 30 de noviembre de 2023) [1]. Sus principales novedades son [1, 2]:"));
[
  "**Una sola parte para casi todo**: la EN 1992-1-1 integra ahora puentes, depósitos y estructuras de contención, que antes estaban en partes separadas (EN 1992-2 y EN 1992-3).",
  "**Nuevos materiales dentro de la norma**: hormigón reforzado con fibras de acero (SFRC) y refuerzo con fibra de carbono (CFRP).",
  "**Reglas revisadas** de cortante, torsión y otros estados límite, más precisas.",
  "**Anejos para estructuras existentes**: evaluación y refuerzo de estructuras ya construidas, clave para la rehabilitación.",
  "**Menos parámetros nacionales** (NDP), para que el cálculo sea más homogéneo entre países, y mayor peso de la durabilidad, la robustez y la sostenibilidad [5].",
].forEach((t) => c.push(li(t)));
c.push(p("**Calendario** [3, 4]: el CEN tenía de plazo hasta el **30 de marzo de 2026** para publicar todos los Eurocódigos de segunda generación (11 normas y 3 especificaciones técnicas, 74 partes en total). Cada país debe publicarlos como norma nacional antes del **30 de septiembre de 2027**, y los Eurocódigos de primera generación se retirarán el **30 de marzo de 2028**. En España se hará mediante su publicación como normas UNE o su aprobación formal."));
c.push(claveRA("lo que estudiéis hoy con la EHE-08 o con el Código Estructural de 2021 (basado en el Eurocódigo 2 de 2004) va a convivir con la nueva generación. Vuestra carrera profesional se desarrollará con el Eurocódigo 2 de 2023."));
c.push(espacio());

c.push(h2("1.2. España: investigación y sector"));
[
  "El **IECA** (Instituto Español del Cemento y sus Aplicaciones) y el **Cedex** (Ministerio de Transportes) han firmado un acuerdo de cuatro años para impulsar la investigación en cemento y hormigón para la ingeniería civil [6].",
  "La patronal del sector ha aprobado su primer **Plan Estratégico 2026–2030**, cuyas prioridades son hormigones con menos clínker, economía circular y digitalización de las plantas [7].",
].forEach((t) => c.push(li(t)));

c.push(h2("1.3. Otras guías y normas"));
[
  "**Hormigón de ultra altas prestaciones (UHPC)**: AASHTO publicó en marzo de 2024 la primera guía de diseño estructural con UHPC para puentes (Guide Specifications, 1.ª ed.), basada en el informe de la FHWA de 2023. Se espera que los puentes de luz corta sean la primera aplicación generalizada [8].",
  "**Hormigones activados alcalinamente (geopolímeros)**: siguen **sin norma europea (EN) ni ISO de diseño estructural**. Existen la PAS 8820:2016 británica y el código de práctica BSI Flex 350 v2.0 (2024), que permite comparar estos aglutinantes con un hormigón de cemento Portland de referencia [9]. El comité RILEM TC 294-MPA cerró su trabajo sobre propiedades mecánicas en mayo de 2025 [10].",
].forEach((t) => c.push(li(t)));

// 2. DESCARBONIZACIÓN
c.push(h1("2. Descarbonización del cemento y del hormigón"));
c.push(p("El cemento Portland emite unos 800 kg de CO₂ por tonelada de clínker, aproximadamente el 60 % por la descarbonatación de la caliza (CaCO₃ → CaO + CO₂) y el resto por el combustible. Las novedades atacan las dos fuentes."));

c.push(h2("2.1. Captura y almacenamiento de CO₂ en cementera: Brevik y evoZero"));
c.push(p("En **junio de 2025** Heidelberg Materials inauguró en **Brevik (Noruega)** la primera instalación de captura de carbono a escala industrial en una cementera [11]. Captura **400 000 t de CO₂ al año** (≈50 % de las emisiones de la planta) con aminas que absorben el CO₂ de los gases del horno, usando calor residual. El CO₂ se transporta y almacena bajo el mar del Norte (proyecto Northern Lights)."));
c.push(p("En **octubre de 2025** empezó a entregar **evoZero**, el primer cemento del mundo con emisiones casi nulas gracias a la captura de carbono. Los primeros clientes fueron Skanska y el proyecto alemán DREIHAUS, y la producción de 2025 se agotó [12]."));
c.push(p("**Madurez: comercial.** Es la tecnología más avanzada para eliminar las emisiones del proceso, aunque es cara y necesita infraestructura de transporte y almacenamiento."));

c.push(h2("2.2. Cemento electroquímico a baja temperatura (UBC, 2026)"));
c.push(p("Investigadores de la **University of British Columbia** publicaron en **mayo de 2026** en *ACS Energy Letters* un proceso eléctrico para fabricar clínker de **belita** [13, 14]:"));
[
  "Un reactor electroquímico forma un precursor (eCSH) a solo **60 °C**.",
  "Un segundo calentamiento a **650 °C** (frente a los ≈1450 °C del horno convencional) lo convierte en clínker rico en belita.",
  "El proceso genera **hidrógeno**, que puede quemarse para aportar ese calor.",
  "Con **cemento reciclado** como materia prima emite unos **20 kg de CO₂ por tonelada**, frente a ≈800 kg: una reducción de casi el **98 %**, con un 70 % menos de energía térmica.",
].forEach((t) => c.push(li(t)));
c.push(p("**Madurez: laboratorio.** La belita endurece más despacio que la alita, por lo que habrá que estudiar su resistencia inicial en elementos de hormigón armado."));
c.push(p("**Un caso de advertencia, Sublime Systems:** esta empresa del MIT, que fabrica cemento por vía electroquímica, iba a abrir en 2026 en Holyoke (EE. UU.) una planta de 30 000 t/año con contrato de compra de Microsoft. Tras la cancelación de una subvención federal de 87 millones de dólares, **paralizó el proyecto en diciembre de 2025** [15, 16]. Demuestra que, además de la ciencia, la financiación es decisiva para escalar estas tecnologías."));

c.push(h2("2.3. Reciclar cemento en hornos de acero (Cambridge Electric Cement)"));
c.push(p("La Universidad de Cambridge demostró que el cemento recuperado de la demolición puede usarse como **fundente en los hornos de arco eléctrico** donde se recicla la chatarra de acero; las altas temperaturas lo **vuelven a convertir en clínker**. Si el horno usa electricidad renovable, el cemento resultante tiene emisiones muy bajas. La spin-off (ahora **Reclinker**) obtuvo 2,25 millones de libras para industrializar el proceso en el horno de CELSA UK en Cardiff, y prepara pruebas que producirán unas **30 t/h** de cemento para construir demostradores [17, 18]."));
c.push(p("**Madurez: piloto.** Interesa especialmente porque acero y hormigón, los dos componentes del hormigón armado, se reciclan en el mismo proceso."));

c.push(h2("2.4. Cemento LC3 (caliza + arcilla calcinada)"));
c.push(p("Combina clínker, arcilla calcinada y caliza. La versión **LC3-50** (50 % de clínker) reduce las emisiones un **30–40 %**, está aceptada por las normas de cemento de Europa, India, EE. UU., Cuba y gran parte de Sudamérica, y apenas requiere cambios en las fábricas actuales [19, 20]."));
c.push(p("**Madurez: comercial.** Es la solución de bajo carbono más fácil de implantar a corto plazo."));

c.push(h2("2.5. Mineralización de CO₂ en el hormigón fresco"));
c.push(p("**CarbonCure** inyecta CO₂ en el hormigón durante el amasado; reacciona con el calcio y forma nanocristales de carbonato cálcico que mejoran la resistencia, lo que permite reducir el cemento un **4–6 %**. Se ha usado en más de **10 millones de camiones de hormigón** y fue nombrada empresa de tecnología climática del año en 2026 [21]. Un estudio con el MIT ha observado por primera vez, en tiempo real (espectroscopía Raman), la secuencia química que desencadena el CO₂ en la pasta [22]."));

c.push(h2("2.6. Otros avances de 2026"));
[
  "**Reactivar los finos del hormigón reciclado** (INKAS, Canadá, marzo de 2026): moliéndolos con equipos ya habituales en minería y cementeras se convierten en una adición reactiva que sustituye parte del cemento [23].",
  "**Hormigón con zeolita y biocarbón de bambú** (Universidad Agrícola de Shenyang, septiembre de 2026): +7,5 % de resistencia a compresión y +15 % a tracción, y absorbe ≈1,2 g de CO₂ al día en laboratorio [24].",
].forEach((t) => c.push(li(t)));
c.push(claveRA("absorber CO₂ significa carbonatar el hormigón, y la carbonatación baja el pH y destruye la capa que protege el acero. En el estudio de Shenyang el frente carbonatado avanzó 15 mm en 7 días en cámara acelerada. Un hormigón «captador de CO₂» puede ser excelente en masa, pero en hormigón armado obliga a revisar recubrimientos y riesgo de corrosión. Es un buen tema de debate para el trabajo."));

// 3. ARMADURAS
c.push(h1("3. Nuevas armaduras"));
c.push(h2("3.1. Barras de polímero reforzado con fibras (GFRP, BFRP, CFRP)"));
c.push(p("Las barras de fibra de vidrio (GFRP), basalto (BFRP) o carbono (CFRP) en matriz polimérica **no se corroen**, pesan una cuarta parte que el acero y no son magnéticas. El mercado de barras de FRP se estima en **1580 millones de dólares en 2026** y podría llegar a 2450 millones en 2030 (+11,7 % anual) [25]. Se usan en puentes, estructuras marinas y depuradoras."));
[
  "**GFRP**: la más extendida y con más historia normativa y de datos de campo.",
  "**BFRP (basalto)**: mayor resistencia a tracción y mejor resistencia a los álcalis que el vidrio E, pero más cara y con menos normativa [26].",
  "**Limitaciones**: comportamiento elástico-frágil (sin escalón de fluencia), menor módulo de elasticidad (más flecha y fisuración) y mal comportamiento a alta temperatura. Por eso el diseño es distinto al del acero.",
].forEach((t) => c.push(li(t)));

c.push(h2("3.2. Hormigón textil con fibra de carbono"));
c.push(p("Sustituye las barras por **mallas textiles de carbono**, que no necesitan recubrimiento contra la corrosión y permiten piezas mucho más delgadas. Su referencia es el **CUBE** de la TU Dresden (inaugurado en 2022), el primer edificio del mundo sin ninguna armadura metálica, con hasta un 50 % menos de CO₂ que una solución convencional [27]. La investigación actual se centra en combinarlo con la impresión 3D (apartado 4)."));

c.push(h2("3.3. Aleaciones con memoria de forma de base hierro (Fe-SMA)"));
c.push(p("Desarrolladas por **Empa** (Suiza). Las barras o pletinas se **calientan a ≥160 °C** una vez colocadas y, al enfriarse ancladas, intentan recuperar su forma original y **pretensan el hormigón**. No necesitan vainas, gatos ni anclajes, y no hay pérdidas por rozamiento. Son mucho más baratas que las de níquel-titanio [28]. Estudios de 2025 dan recomendaciones de diseño para reforzar vigas pretensadas con pletinas de Fe-SMA, con menos fisuración y más rigidez [29]."));
c.push(p("**Madurez: comercial en refuerzo de estructuras existentes**; en investigación como armadura en elementos nuevos."));

c.push(h2("3.4. Acero de armar de bajo carbono"));
c.push(p("El acero corrugado europeo ya procede mayoritariamente de chatarra en horno de arco eléctrico. El siguiente paso es la **reducción directa con hidrógeno + horno eléctrico (H₂-DRI-EAF)**, que recorta las emisiones un 90–95 % frente al alto horno. Por ejemplo, Baosteel prevé ofrecer desde 2026 acero con un 50–80 % menos de emisiones [30]."));

// 4. FABRICACIÓN DIGITAL
c.push(h1("4. Fabricación digital: impresión 3D de hormigón armado"));
c.push(p("La impresión 3D de hormigón (3DCP) avanza muy deprisa, pero su gran problema es **cómo meter la armadura**, porque la boquilla deposita capas continuas y las barras se interponen. En 2026 se han publicado varias soluciones:"));
[
  "**AMoRC con soldadura de pernos por arco** (*Automation in Construction*, 2026): una pistola de soldadura une mallas de armadura espacial en segundos mientras la impresora, con una boquilla en forma de horquilla de ancho variable, envuelve las barras de distintos tamaños [31].",
  "**Malla de FRP embebida durante la impresión** (*Communications Engineering*, 2026): se imprime a la vez el hormigón y una malla flexible de polímero reforzado con fibras. Las placas armadas así soportaron un **41 % más de carga** y admitieron una flecha **5,5 veces mayor** (+552 %) [32].",
  "**Armadura textil**: una revisión en *Cement and Concrete Research* (2026) clasifica todas las formas de integrar textiles según el momento de la fabricación en que se colocan [33].",
  "**Esqueleto de armadura plegable** (*Construction and Building Materials*, 2026): se fabrica plano, se despliega en obra y la impresión termina de envolverlo [34].",
  "**Pilares impresos con barras de GFRP** sometidos a compresión: ensayos publicados en *Scientific Reports* (2025) [35].",
].forEach((t) => c.push(li(t)));
c.push(claveRA("cuando se resuelva la integración de la armadura, la impresión 3D podrá fabricar elementos estructurales y no solo muros o piezas decorativas, con formas optimizadas que gastan menos material."));

// 5. MATERIALES INTELIGENTES
c.push(h1("5. Hormigones inteligentes y multifuncionales"));
c.push(h2("5.1. Hormigón autorreparable con bacterias"));
c.push(p("Se añaden al hormigón esporas de bacterias (*Bacillus subtilis*, *B. sphaericus*, *B. megaterium*, *Sporosarcina pasteurii*) junto con nutrientes. Cuando aparece una fisura y entra agua, las bacterias se activan y **precipitan carbonato cálcico** que la sella. En un estudio de junio de 2026 con *B. megaterium*, fisuras de unos 0,5 mm se cerraron hasta ≈0,1 mm, mientras que en el hormigón de control apenas hubo cambio. El microscopio electrónico (SEM-EDS) confirmó los cristales de carbonato [36]. También se reduce la absorción de agua y la penetración de cloruros."));
c.push(p("Las líneas actuales son el **encapsulado** para que las bacterias sobrevivan al pH alto y al amasado, y el uso de **hongos y algas** además de bacterias [37]."));
c.push(claveRA("sellar las fisuras impide que entren agua, CO₂ y cloruros hasta la armadura, que es la causa principal del deterioro del hormigón armado."));
c.push(espacio());

c.push(h2("5.2. El secreto del hormigón romano, confirmado en Pompeya (2025)"));
c.push(p("Un estudio del **MIT** publicado en *Nature Communications* en **diciembre de 2025** analizó una obra de Pompeya que estaba en plena reparación cuando el Vesubio entró en erupción en el año 79 d. C., con montones de materiales listos para mezclar [38]. Confirma que los romanos usaban la **mezcla en caliente** (*hot mixing*): premezclaban **cal viva** con ceniza volcánica (puzolana) antes de añadir agua. La reacción exotérmica superaba localmente los 200 °C y dejaba **clastos de cal** sin reaccionar. Cuando aparece una fisura y entra agua, esos clastos se disuelven y recristalizan como carbonato cálcico, **reparando la grieta**."));
c.push(p("Esto ayuda a explicar por qué obras como el Panteón siguen en pie 2000 años después, y está inspirando nuevos hormigones autorreparables."));

c.push(h2("5.3. Hormigón que almacena electricidad"));
c.push(p("El **MIT EC³ Hub** ha desarrollado el **ec³** (*electron-conducting carbon concrete*): cemento, agua, negro de carbono nanométrico y electrolito, que funciona como **supercondensador**. En **octubre de 2025** anunciaron una densidad de energía **unas 10 veces mayor** que la versión anterior, gracias a mejores electrolitos y a una técnica de hormigonado con el electrolito incorporado. Según el MIT, unos **5 m³** bastarían para cubrir el consumo diario de una vivienda media. Construyeron un arco portante que enciende un LED y lo han mostrado en pilares modulares en Fukushima (Japón) [39]. En 2026 siguen apareciendo supercondensadores estructurales de base cemento [40]. Un precedente es la **batería recargable de cemento** de Chalmers (Suecia, 2021), con ánodo de hierro y cátodo de níquel [41]."));
c.push(p("**Madurez: laboratorio / demostrador.** Queda por resolver la compatibilidad con las armaduras de acero, la durabilidad del electrolito y el coste."));

c.push(h2("5.4. Hormigón radiativo español que se enfría solo (PhotoKrete)"));
c.push(p("Desarrollado por **Jorge Sánchez Dolado** (Centro de Física de Materiales, CSIC-UPV/EHU) y **Miguel Beruete** (UPNA) en el proyecto europeo Horizon 2020 MIRACLE. La spin-off **PhotoKrete** se fundó en noviembre de 2024 [42, 43]. Es un mortero u hormigón **fotónico** que refleja la mayor parte de la radiación solar y emite calor en el infrarrojo, en la «ventana atmosférica», hacia el espacio:"));
[
  "Reduce la temperatura de la superficie del cemento hasta **30–35 °C**.",
  "En pruebas en Níjar (Almería) se mantuvo hasta 2 °C **por debajo de la temperatura ambiente** con fuerte radiación solar.",
  "Según simulaciones, aplicado en cubiertas y pavimentos podría bajar la temperatura urbana hasta **10–12 °C** durante olas de calor.",
].forEach((t) => c.push(li(t)));

c.push(h2("5.5. Otros materiales"));
[
  "**Grafeno**: pequeñas dosis de grafeno (p. ej. PureGRAPH de First Graphene) aumentan la resistencia a compresión hasta un 16 % en laboratorio, lo que permite usar menos cemento. Ya hay pruebas industriales en el Reino Unido: Morgan Sindall en losas ferroviarias y FP McCann en tejas prefabricadas [44]. Su disponibilidad comercial todavía es limitada [45].",
  "**Hormigón celular con residuos (UPV, Valencia)**: un 85 % de sus materiales son residuos y emite un 78 % menos que el hormigón celular actual [46].",
].forEach((t) => c.push(li(t)));

// 6. IA Y DIGITALIZACIÓN
c.push(h1("6. Inteligencia artificial y digitalización"));
c.push(h2("6.1. Dosificación con IA: BOxCrete (Meta, 2026)"));
c.push(p("En **marzo de 2026**, coincidiendo con la convención del ACI (American Concrete Institute), Meta publicó **BOxCrete** (*Bayesian Optimization for Concrete*), un modelo de IA de **código abierto** (licencia MIT, en GitHub) para diseñar dosificaciones [47, 48, 49]:"));
[
  "Se entrenó con más de 500 ensayos de resistencia de 123 mezclas (69 morteros y 54 hormigones) a 1, 3, 5, 14 y 28 días.",
  "Predice resistencia y consistencia (asiento) y propone nuevas mezclas que probar (aprendizaje activo).",
  "En el centro de datos de Meta en Rosemount (Minnesota), con Amrize, la mezcla optimizada con materiales locales alcanzó la resistencia **un 43 % más rápido** y redujo el riesgo de fisuración casi un 10 %.",
].forEach((t) => c.push(li(t)));
c.push(p("En el ámbito académico, revisiones de 2026 recogen el uso de aprendizaje automático para predecir la resistencia, la durabilidad, el tiempo hasta el inicio de la corrosión y la capacidad resistente de elementos de hormigón armado [50, 51]."));

c.push(h2("6.2. Inspección con drones, sensores y gemelos digitales"));
[
  "**Drones con visión artificial** que detectan y clasifican fisuras, desconchados y óxido en puentes, y generan modelos 3D. Ya se investigan **gemelos digitales con Gaussian Splatting** para visualizar el daño en 3D [52] y sistemas que combinan drones, IA y un robot volador que mide la corrosión [53].",
  "**Sensores embebidos** (temperatura, humedad) que estiman la resistencia del hormigón en obra en tiempo real (método de la madurez), y sensores de consistencia en el camión hormigonera.",
  "**Predicción de rotura**: un trabajo de 2026 identifica tres propiedades intrínsecas que gobiernan dónde y cómo se inicia y propaga la fractura en el hormigón: densidad de energía elástica, superficie de resistencia y tenacidad a fractura [54].",
].forEach((t) => c.push(li(t)));

// 7. DURABILIDAD
c.push(h1("7. Durabilidad, corrosión y economía circular"));
c.push(h2("7.1. Reutilizar elementos de hormigón armado (2026)"));
c.push(p("Un estudio publicado a principios de 2026 en *Materials and Structures* usó datos de dos edificios desmontados en Suecia y Finlandia y miles de simulaciones para predecir la vida útil restante de **losas, vigas y pilares reutilizados** [55]. Concluye que pueden reutilizarse con seguridad, **alargando su vida 50–100 años**, y que tratamientos superficiales (hidrofugantes o siliconas) reducen la velocidad de corrosión hasta un **70 %**. Es un paso clave para pasar del reciclaje (triturar el hormigón para hacer árido) a la **reutilización** directa."));

c.push(h2("7.2. Investigación sobre la corrosión de armaduras"));
[
  "Efecto del **curado con CO₂** sobre la capa pasivante del acero, y aceros con **cromo y tierras raras** más resistentes a los cloruros [56].",
  "Corrosión de armaduras en **UHPC**: tras 16 días de corrosión acelerada se perdió el 41,5 % de las fibras y el 29,1 % de la capacidad portante [57].",
  "El papel de la **interfaz acero-hormigón** en la fisuración por corrosión [58] y nuevos métodos de detección no destructiva (flujo magnético propio, SMFL).",
].forEach((t) => c.push(li(t)));

// 8. ANÁLISIS
c.push(h1("8. Análisis crítico"));
c.push(p("Al revisar todas estas novedades aparecen varias **tensiones** que conviene tener en cuenta:"));
[
  "**Bajo carbono frente a durabilidad.** Menos clínker significa menos portlandita y, por tanto, menos reserva alcalina. Los cementos LC3, con adiciones o «captadores de CO₂» pueden carbonatarse más rápido. Para el hormigón armado esto puede exigir más recubrimiento o hormigones más compactos.",
  "**Armaduras no metálicas frente a ductilidad.** Las barras de FRP y los textiles resuelven la corrosión, pero rompen de forma frágil. El diseño debe garantizar la seguridad por otras vías (rotura controlada por el hormigón, mayores coeficientes).",
  "**Laboratorio frente a escala industrial.** El caso de Sublime Systems muestra que una tecnología prometedora puede pararse por falta de financiación. Las soluciones que ya están en el mercado (captura de CO₂, LC3, CarbonCure, FRP) tendrán más impacto a corto plazo.",
  "**La norma va por detrás de la innovación.** Los geopolímeros aún no tienen norma europea de diseño estructural, y el Eurocódigo 2 de 2023 solo será obligatorio a partir de 2027-2028.",
].forEach((t) => c.push(li(t)));

c.push(tabla(
  ["Línea", "Impacto en CO₂", "Impacto en durabilidad del armado", "Horizonte"],
  [
    ["Captura de CO₂ en cementera", "Muy alto", "Neutro (mismo cemento)", "Ya disponible"],
    ["LC3 / cementos con adiciones", "Alto", "Vigilar carbonatación", "Ya disponible"],
    ["Cemento electroquímico / reciclado", "Muy alto", "Por estudiar (belita)", "5–10 años"],
    ["Armaduras FRP / textiles", "Medio (piezas más finas)", "Elimina la corrosión", "Ya disponible / en expansión"],
    ["Autorreparación bacteriana", "Bajo-medio (más vida útil)", "Mejora", "Pilotos"],
    ["IA en dosificación e inspección", "Medio (optimiza cemento)", "Mejora (detección temprana)", "Ya disponible"],
    ["Reutilización de elementos", "Alto", "Requiere evaluación y protección", "Pilotos"],
  ],
  [2600, 1800, 2626, 2000],
));
c.push(pie("Tabla 2. Valoración cualitativa de las principales líneas de innovación (elaboración propia)."));

c.push(h1("9. Conclusiones"));
[
  "El hormigón armado está en plena transformación: el reto principal ya no es solo resistir más, sino **emitir menos CO₂ y durar más**.",
  "La **segunda generación del Eurocódigo 2** será la nueva base de cálculo en Europa (obligatoria en 2027-2028) e incorpora fibras, CFRP y evaluación de estructuras existentes.",
  "En descarbonización conviven soluciones **ya comerciales** (captura de CO₂ en Brevik y evoZero, LC3, CarbonCure) con otras **disruptivas pero aún en laboratorio** (cemento electroquímico, reciclado en horno de arco).",
  "Las **nuevas armaduras** (FRP, textiles de carbono, Fe-SMA, acero verde) y la **impresión 3D armada** cambian el papel del refuerzo.",
  "Los **materiales inteligentes** (autorreparación inspirada también en los romanos, almacenamiento de energía, enfriamiento radiativo español) amplían las funciones del hormigón.",
  "La **IA** ya se usa en obras reales para dosificar e inspeccionar, y la **reutilización** de elementos abre la puerta a un hormigón armado circular.",
].forEach((t) => c.push(li(t)));

// ---------- fuentes ----------
c.push(h1("Fuentes consultadas"));
c.push(p("Búsqueda realizada el 2 de octubre de 2026. Numeración en orden de aparición en el texto.", { alignment: AlignmentType.LEFT }));
F.forEach(([titulo, url], i) => c.push(new Paragraph({
  spacing: { after: 80 }, indent: { left: 600, hanging: 600 },
  children: [
    new TextRun({ text: `[${i + 1}]\t${titulo}. `, size: 19 }),
    new ExternalHyperlink({ link: url, children: [new TextRun({ text: url, style: "Hyperlink", size: 17 })] }),
  ],
})));

// ---------- documento ----------
const margen = { top: 1418, bottom: 1418, left: 1418, right: 1418 };
const doc = new Document({
  creator: "Grupo de Ingeniería de Materiales",
  title: "Novedades del hormigón armado (2026)",
  styles: {
    default: { document: { run: { font: "Calibri", size: 22 } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 32, bold: true, color: AZUL }, paragraph: { spacing: { before: 240, after: 200 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 25, bold: true, color: AZUL }, paragraph: { spacing: { before: 240, after: 120 }, outlineLevel: 1 } },
    ],
  },
  numbering: {
    config: [
      { reference: "vinetas", levels: [
        { level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } },
      ] },
    ],
  },
  sections: [
    { properties: { page: { margin: margen } }, children: portada },
    {
      properties: { page: { margin: margen } },
      headers: { default: new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: "Novedades del hormigón armado · 2026", size: 16, color: "808080" })] })] }) },
      footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ children: [PageNumber.CURRENT], size: 18 })] })] }) },
      children: [...indice, ...c],
    },
  ],
});

Packer.toBuffer(doc).then((buf) => {
  fs.writeFileSync(path.join(__dirname, "Novedades_Hormigon_Armado_2026.docx"), buf);
  console.log("Novedades_Hormigon_Armado_2026.docx generado");
});
