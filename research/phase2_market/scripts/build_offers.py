#!/usr/bin/env python3
"""Construye data/offers.csv (deduplicado y clasificado) a partir de data/offers_raw.tsv.

Uso: python3 research/phase2_market/scripts/build_offers.py
Solo lee ficheros locales. Imprime un resumen con las cifras citadas en los informes.

Reglas (definidas antes de clasificar):
  * relevante_objetivo = "sí" si el puesto es de inicio de carrera para universitarios
    (prácticas/Praktikum/stage/internship/beca/thesis/TFM/graduate/trainee/afstudeerstage) Y la
    familia profesional es una ingeniería del objetivo (mecánica, industrial, eléctrica, electrónica,
    aeroespacial y afines). Informática/software/datos puros quedan fuera. "parcial" para Werkstudent y empleos
    que piden primera experiencia. "no" para FP, estudios duales, apprenticeships, puestos no técnicos
    y registros que no son una oferta concreta (volúmenes, eventos, ayudas económicas).
  * clave de deduplicación = empresa + título normalizado (sin marcas de género, ref., año) + ubicación.
  * n_urls_observadas = número de URLs distintas en las que se vio la MISMA oferta (otro idioma,
    otro agregador, otro ID), según lo anotado al registrar la fuente.
"""
import csv
import re
import sys
from collections import Counter, defaultdict
from pathlib import Path

BASE = Path(__file__).resolve().parent.parent
RAW = BASE / "data" / "offers_raw.tsv"
OUT = BASE / "data" / "offers.csv"

EARLY = re.compile(r"práctic|prácticas|praktik|stage|intern|beca|thesis|abschlussarbeit|tfm|graduate|trainee|"
                   r"afstudeer|pflicht|summer|programa de prácticas|kickstart|campus2career|tirocinio|jóvenes talentos|"
                   r"recién graduados|programa 1 año", re.I)
NOT_STUDENT = re.compile(r"\bFP\b|estudio dual|duales studium|apprentice|alternance|volumen agregado|"
                         r"recruiting event|ayuda económica|inserción de titulados|no es una oferta", re.I)
PARTIAL = re.compile(r"werkstudent|empleo cdi|empleo titulados|requiere 1\.ª experiencia", re.I)
TECH = re.compile(r"ing\.|ingenier|mecán|mecan|eléctr|electr|aeroesp|aeronáut|naval|industrial|fabricación|"
                  r"producción|procesos|robót|mecatr|diseño|calidad|simulación|test|energ|automatiz|"
                  r"utillaje|ferrovi|vehículo|automoción|chasis|sistemas|certificación|tolerancias|"
                  r"materiales|óptica|láser|stem|informática|software|electrónica|dinámica|industria|telecomunic", re.I)
# Familias técnicas fuera del objetivo (mecánica, industrial, eléctrica, electrónica, aeroespacial y afines).
OUT_OF_SCOPE = re.compile(r"informática|software|ciber|datos", re.I)
IN_SCOPE = re.compile(r"mecán|mecatr|eléctr|electr|industrial|aero|naval|fabricación|producción|telecomunic|ingenierías|ing\./stem|"
                      r"^ingeniería$|sistemas/informática", re.I)
NON_TECH = re.compile(r"^(economía|negocio|rr\. hh\.|marketing|legal|finanzas|derechos humanos|asuntos públicos)", re.I)

# Duplicados observados (misma oferta en varias URLs), anotados al registrar cada fuente.
DUP_HINTS = [
    (r"misma oferta en 6 idiomas", 6), (r"5 URLs regionales", 5), (r"3 IDs de JobTeaser", 3),
    (r"/de, /es y /da", 3), (r"/es_ES, /fr_FR y /de_DE", 3), (r"\?lang=ja y \?lang=zh", 3),
    (r"targetjobs con 2 IDs", 3), (r"3 URLs de jobjump", 3), (r"2 IDs de JobTeaser", 2),
    (r"/fr_FR y /hu_HU", 2), (r"/nl_NL y /zh_CN", 2), (r"/jobs y /de/stellenangebote", 2),
    (r"versiones /en y /de", 2), (r"aparece 2 veces", 2), (r"\(2 URLs\)", 2), (r"también en engagement-jeunes", 2),
    (r"también vakanser\.se", 2), (r"también Wizbii", 2),
]

ELIG = {
    "solo_practicas_obligatorias": re.compile(r"pflicht|solo obligatorias|prácticas obligatorias|curricular", re.I),
    "matricula_requerida": re.compile(r"matricul|enrolled|estudiante sin titular|enrol", re.I),
    "idioma_exigido": re.compile(r"\b[ABC][12]\b|inglés|alemán|sueco|fluido|idioma", re.I),
    "permiso_trabajo_nacionalidad_export": re.compile(r"autorización de trabajo|permiso de trabajo|ciudadan|"
                                                       r"control de exportaciones|export|sin patrocinio|derecho a trabajar", re.I),
    "discapacidad_33": re.compile(r"discapacidad", re.I),
}


def norm_title(t: str) -> str:
    t = t.lower()
    t = re.sub(r"\((?:w/m/x|m/w/d|w/m/d|d/m/w|m/f/d|f/m/d|dm|h/f|f/h|all genders?|mfd|m/w)\)", " ", t)
    t = re.sub(r"\b(?:req(?:\.|uest)? ?id|ref\.?|job id)\s*[\w-]+", " ", t)
    t = re.sub(r"\b(?:ws ?26/27|2026|2027)\b", " ", t)
    return re.sub(r"[^a-z0-9áéíóúñäöüß]+", " ", t).strip()


def classify(row: dict) -> str:
    blob = " ".join([row["tipo"], row["titulo"], row["familia"]])
    if NOT_STUDENT.search(blob):
        return "no"
    tech = bool(TECH.search(row["familia"])) and not NON_TECH.search(row["familia"])
    if tech and OUT_OF_SCOPE.search(row["familia"]) and not IN_SCOPE.search(row["familia"]):
        return "no"
    if PARTIAL.search(row["tipo"]):
        return "parcial" if tech else "no"
    if EARLY.search(row["tipo"] + " " + row["titulo"]) and tech:
        return "sí"
    return "no"


def main() -> None:
    rows = list(csv.DictReader(open(RAW, encoding="utf-8"), delimiter="\t"))
    groups = defaultdict(list)
    for r in rows:
        key = (r["empresa"].split("(")[0].strip().lower(), norm_title(r["titulo"]), r["ubicacion"].lower().strip())
        groups[key].append(r)

    out = []
    for i, (key, rs) in enumerate(groups.items(), 1):
        r = dict(rs[0])
        hint_text = " ".join(x["fuente_tipo"] + " " + x["requisitos"] for x in rs)
        n_urls = max([n for pat, n in DUP_HINTS if re.search(pat, hint_text)] or [1])
        n_urls = max(n_urls, len({x["url"] for x in rs}))
        req = r["requisitos"] + " " + r["titulo"] + " " + r["tipo"]
        r.update({
            "oferta_id": f"OF{i:03d}",
            "clave_dedup": "|".join(key),
            "registros_fusionados": len(rs),
            "n_urls_observadas": n_urls,
            "relevante_objetivo": classify(r),
            "fecha_limite_publicada": "sí" if re.search(r"\d{4}-\d{2}-\d{2}|\d{1,2}-(?:mar|jun|ene|feb)", r["fecha_limite"]) else "no",
            "url_es_portal_oficial": "sí" if r["fuente_tipo"].startswith(("portal oficial", "nota oficial")) else "no",
            "fecha_consulta": "2026-10-11",
            "nivel_verificacion": ("URL oficial indexada por buscador (no abierta)" if r["fuente_tipo"].startswith(("portal oficial", "nota oficial"))
                                   else "copia en tercero indexada por buscador (no abierta)"),
        })
        for k, rx in ELIG.items():
            r[k] = "sí" if rx.search(req) else "no"
        out.append(r)

    cols = ["oferta_id", "empresa", "pais", "familia", "tipo", "titulo", "ubicacion", "idioma", "requisitos",
            "fecha_limite", "fecha_limite_publicada", "url", "url_es_portal_oficial", "fuente_tipo", "estado_conocido",
            "relevante_objetivo", *ELIG.keys(), "registros_fusionados", "n_urls_observadas", "clave_dedup",
            "nivel_verificacion", "fuente_descubrimiento", "fecha_consulta"]
    with open(OUT, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=cols, extrasaction="ignore")
        w.writeheader()
        w.writerows(out)

    rel = [r for r in out if r["relevante_objetivo"] == "sí"]
    print(f"registros brutos: {len(rows)}")
    print(f"ofertas únicas tras deduplicar: {len(out)} (fusionados {len(rows) - len(out)})")
    print(f"ofertas con >1 URL observada: {sum(1 for r in out if r['n_urls_observadas'] > 1)}; "
          f"URLs redundantes: {sum(r['n_urls_observadas'] - 1 for r in out)}")
    print("relevancia:", dict(Counter(r["relevante_objetivo"] for r in out)))
    print("relevantes por país empresa:", dict(Counter(r["pais"] for r in rel)))
    print(f"relevantes con fecha límite publicada: {sum(1 for r in rel if r['fecha_limite_publicada'] == 'sí')}/{len(rel)}")
    print(f"relevantes con URL de portal oficial: {sum(1 for r in rel if r['url_es_portal_oficial'] == 'sí')}/{len(rel)}")
    for k in ELIG:
        print(f"relevantes con {k}: {sum(1 for r in rel if r[k] == 'sí')}/{len(rel)}")
    print("fuente de las relevantes:", dict(Counter(r["fuente_tipo"].split(" (")[0] for r in rel).most_common()))
    print("estado conocido de las relevantes:", dict(Counter(r["estado_conocido"].split(" (")[0] for r in rel).most_common()))
    print("empresas con ≥1 relevante:", len({r['empresa'].split(' (')[0] for r in rel}))


if __name__ == "__main__":
    sys.exit(main())
