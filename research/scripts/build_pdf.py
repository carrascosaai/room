#!/usr/bin/env python3
"""Reúne todos los informes de research/ en un único PDF: research/informe_completo.pdf

Uso: python3 research/scripts/build_pdf.py
Requiere pandoc y Chromium (headless). Convierte Markdown → HTML (pandoc) → PDF (Chromium).
"""
import csv
import html
import re
import subprocess
import sys
import tempfile
from pathlib import Path

R = Path(__file__).resolve().parent.parent
CHROME = next((p for p in ["/opt/pw-browsers/chromium-1194/chrome-linux/chrome", "/usr/bin/chromium"] if Path(p).exists()), None)

PARTS = [
    ("Resumen global", ["resumen_global.md"]),
    ("Fase 1 — Estudio inicial", ["README.md", "market-study.md", "competitor-matrix.md", "ats-analysis.md", "market-gap.md",
                                  "business-model.md", "validation-plan.md", "go-no-go.md", "technical-architecture.md",
                                  "budget.md", "launch-plan.md"]),
    ("Fase 2 — Investigación de mercado", ["phase2_market/README.md", *[f"phase2_market/{f}" for f in [
        "01_auditoria_fase1.md", "02_mercado_objetivo_y_comportamiento.md", "03_competidores.md", "04_mapa_funcionalidades.md",
        "05_empresas_y_ofertas.md", "06_tam_sam_som.md", "07_top10_problemas.md", "08_incertidumbres.md"]]]),
    ("Fase 2 — Validación de clientes", ["phase2_customers/README.md", *[f"phase2_customers/{f}" for f in [
        "01_segmentacion.md", "02_evidencia_publica.md", "03_guion_entrevista.md", "04_formulario_registro.md",
        "05_conceptos_prototipo.md", "06_guion_presentacion.md", "07_experimento_precios.md", "08_criterios_decision.md",
        "plantillas/diccionario_variables.md"]]]),
    ("Fase 2 — Modelo de negocio", ["phase2_business_model/README.md", "phase2_business_model/experimentos_pago.md"]),
    ("Fase 2 — Auditoría técnica y legal", ["phase2_technical/README.md", *[f"phase2_technical/{f}" for f in [
        "protocolo_prueba.md", "elegibilidad.md", "legal_seguridad.md", "arquitectura.md", "riesgos.md"]]]),
    ("Fase 2 — Estrategia de captación", ["phase2_growth/README.md", "phase2_growth/plan_experimentos.md",
                                          "phase2_growth/mensajes.md", "phase2_growth/criterios_parada.md"]),
    ("Estudio de nichos de mercado", ["nichos/README.md"]),
]

# (título, csv, columnas a mostrar, filtro opcional)
ANNEXES = [
    ("A1. Ofertas verificadas por buscador (relevantes)", "phase2_market/data/offers.csv",
     ["oferta_id", "empresa", "pais", "tipo", "titulo", "ubicacion", "fecha_limite", "estado_conocido", "url"],
     lambda r: r["relevante_objetivo"] == "sí"),
    ("A2. 57 empresas industriales", "phase2_market/data/companies.csv",
     ["empresa", "pais_sede", "sector", "ats_o_patron_inferido", "n_relevantes_objetivo", "resultado_busqueda"], None),
    ("A3. Competidores", "phase2_market/data/competitors.csv",
     ["competidor", "paises", "numero_ofertas_solo_si_verificable", "precio_modelo", "problema_que_deja_sin_resolver"], None),
    ("A4. Mapa de funcionalidades", "phase2_market/data/feature_map.csv", None, None),
    ("A5. TAM/SAM/SOM — resultados", "phase2_market/data/tam_results.csv", None, None),
    ("A6. TAM/SAM/SOM — supuestos", "phase2_market/data/tam_inputs.csv", ["id", "descripcion", "bajo", "base", "alto", "tipo"], None),
    ("A7. Precios de competidores", "phase2_business_model/precios_competidores.csv",
     ["actor", "quien_paga", "producto", "precio_publicado", "nivel_evidencia"], None),
    ("A8. Comparativa de modelos de negocio", "phase2_business_model/modelos.csv",
     ["id", "modelo", "cliente_que_paga", "evidencia_de_pago_en_el_mercado", "viable_sin_inversion", "depende_de_acuerdos_dificiles"], None),
    ("A9. Escenarios financieros (resultados)", "phase2_business_model/escenarios_resultados.csv", None, None),
    ("A10. 30 empresas — prueba técnica", "phase2_technical/data/empresas_30.csv",
     ["id", "empresa", "pais", "ats_identificado", "categoria_acceso", "relevantes_indexadas_fase2", "frecuencia_recomendada"], None),
    ("A11. Inventario de APIs", "phase2_technical/data/inventario_apis.csv",
     ["proveedor", "producto", "nivel_verificacion", "autenticacion", "categoria"], None),
    ("A12. Matriz de fuentes de ofertas", "phase2_technical/data/matriz_fuentes.csv",
     ["fuente", "categoria", "acceso_permitido", "deteccion_cierres"], None),
    ("A13. Coste operativo de mantener ofertas", "phase2_technical/data/coste_resultados.csv", None, None),
    ("A14. Canales de captación", "phase2_growth/canales.csv",
     ["canal", "coste_prueba", "tiempo_necesario", "dificultad", "adecuacion_fundador_sin_audiencia"], None),
    ("A15. Calendario de 30 días", "phase2_growth/calendario_30_dias.csv", None, None),
    ("A16. Presupuesto de captación", "phase2_growth/presupuesto.csv", None, None),
    ("A17. Evidencia pública sobre el problema", "phase2_customers/evidencia_fuentes.csv", ["fuente", "nivel", "hallazgo", "url"], None),
    ("A0. Nichos evaluados", "nichos/nichos.csv",
     ["id", "nicho", "detonante_y_fecha", "quien_paga", "competencia_observada", "puntuacion_0_25", "veredicto"], None),
    ("A0b. Fuentes del estudio de nichos", "nichos/fuentes.csv", None, None),
    ("A18. Fuentes de la fase 2 (mercado)", "phase2_market/data/sources.csv", ["fuente", "dato_usado", "url"], None),
]

SYMBOLS = {"✅": "✔", "❌": "✘", "❔": "?", "🔧 ": "", "🎓": "", "💼": "", "🤖": "", "🔬": ""}


def clean(text: str) -> str:
    for k, v in SYMBOLS.items():
        text = text.replace(k, v)
    return text


def demote(md: str) -> str:
    """Baja un nivel los encabezados (fuera de bloques de código) y elimina enlaces relativos rotos."""
    out, code = [], False
    for line in md.splitlines():
        if line.strip().startswith("```"):
            code = not code
        if not code and re.match(r"^#{1,5} ", line):
            line = "#" + line
        out.append(line)
    md = "\n".join(out)
    # enlaces relativos a ficheros del repositorio: dejar solo el texto
    return re.sub(r"\[([^\]]+)\]\((?!https?://)[^)]+\)", r"\1", md)


def csv_table(path: Path, cols, flt) -> str:
    rows = list(csv.DictReader(open(path, encoding="utf-8")))
    if flt:
        rows = [r for r in rows if flt(r)]
    cols = cols or list(rows[0].keys())
    head = "".join(f"<th>{html.escape(c)}</th>" for c in cols)
    body = ""
    for r in rows:
        cells = []
        for c in cols:
            v = clean(r.get(c, "") or "")
            if v.startswith("http"):
                cells.append(f'<td class="url"><a href="{html.escape(v)}">{html.escape(v)}</a></td>')
            else:
                cells.append(f"<td>{html.escape(v)}</td>")
        body += "<tr>" + "".join(cells) + "</tr>"
    return f'<div class="annex"><p class="src">Fuente: research/{path.relative_to(R)} · {len(rows)} filas</p><table><thead><tr>{head}</tr></thead><tbody>{body}</tbody></table></div>'


CSS = """
@page { size: A4; margin: 16mm 14mm 16mm 14mm; }
body { font-family: 'DejaVu Sans', sans-serif; font-size: 9.5pt; line-height: 1.42; color: #1a1d23; }
h1 { font-size: 26pt; color: #12355b; text-align: center; padding-top: 260px; page-break-before: always; page-break-after: always; margin-top: 0; }
h2 { font-size: 15pt; color: #12355b; page-break-before: always; margin-top: 0; }
h3 { font-size: 12pt; color: #1f4e79; margin-top: 16px; }
h4, h5, h6 { font-size: 10.5pt; color: #333; }
table { border-collapse: collapse; width: 100%; margin: 8px 0 12px; font-size: 8pt; page-break-inside: auto; }
tr { page-break-inside: avoid; }
th { background: #e8eef5; text-align: left; }
th, td { border: 1px solid #c9d2dc; padding: 3px 5px; vertical-align: top; word-break: break-word; }
.annex table { font-size: 6.8pt; }
td.url { font-size: 6pt; word-break: break-all; }
code, pre { font-family: 'DejaVu Sans Mono', monospace; font-size: 8pt; background: #f3f5f8; }
pre { padding: 6px; white-space: pre-wrap; }
blockquote { border-left: 3px solid #9fb3c8; margin-left: 0; padding-left: 10px; color: #444; }
a { color: #1f4e79; text-decoration: none; }
.src { font-size: 7.5pt; color: #555; }
.cover { page-break-after: always; text-align: center; padding-top: 180px; }
.cover h1 { border: none; font-size: 28pt; page-break-before: avoid; }
.cover p { font-size: 12pt; color: #444; }
#TOC { page-break-after: always; }
#TOC ul { list-style: none; padding-left: 14px; }
#TOC > ul > li { font-weight: bold; margin-top: 6px; }
#TOC > ul > li > ul > li { font-weight: normal; }
"""


def main():
    md = []
    for part, files in PARTS:
        md.append(f"\n\n# {part}\n")
        for f in files:
            md.append("\n\n" + demote(clean((R / f).read_text(encoding="utf-8"))) + "\n")
    md.append("\n\n# Anexos — tablas de datos\n\nTablas generadas directamente de los CSV del repositorio. Algunas columnas se omiten por espacio; los CSV completos están en las rutas indicadas.\n")
    for title, f, cols, flt in ANNEXES:
        md.append(f"\n\n## {title}\n\n```{{=html}}\n{csv_table(R / f, cols, flt)}\n```\n")
    with tempfile.TemporaryDirectory() as td:
        src, css, out_html = Path(td, "all.md"), Path(td, "s.css"), Path(td, "all.html")
        src.write_text("".join(md), encoding="utf-8")
        css.write_text(CSS, encoding="utf-8")
        before = Path(td, "cover.html")
        before.write_text('<div class="cover"><h1>Plataforma de prácticas y primer empleo de ingeniería</h1>'
                          '<p>Informe completo de la investigación</p><p>Fases 1 y 2 y estudio de nichos · 2026-10-11</p>'
                          '<p style="font-size:9pt;margin-top:60px">Leyenda de evidencia: [H] verificado · [S] secundario · [C] comercial · '
                          '[T] terceros · [U] usuario · [E] estimación · [Hip] hipótesis · NV no verificado</p></div>', encoding="utf-8")
        subprocess.run(["pandoc", str(src), "-f", "markdown+pipe_tables-yaml_metadata_block", "-t", "html5", "-s",
                        "--toc", "--toc-depth=2", "--metadata", "title=Informe completo", "--metadata", "lang=es",
                        "--css", str(css), "--embed-resources", "-B", str(before),
                        "--variable", "toc-title=Índice", "-o", str(out_html)], check=True)
        # quitar el título automático de pandoc (la portada ya lo tiene)
        h = out_html.read_text(encoding="utf-8")
        h = re.sub(r'<header id="title-block-header">.*?</header>', "", h, flags=re.S)
        out_html.write_text(h, encoding="utf-8")
        pdf = R / "informe_completo.pdf"
        subprocess.run([CHROME, "--headless", "--no-sandbox", "--disable-gpu", "--no-pdf-header-footer",
                        f"--print-to-pdf={pdf}", out_html.as_uri()], check=True, capture_output=True)
    print(pdf)


if __name__ == "__main__":
    sys.exit(main())
