#!/usr/bin/env python3
"""Mide la cobertura de los listados públicos de Simplify sobre la muestra de 30 empresas.

Fuente de datos (pública, en GitHub):
  https://raw.githubusercontent.com/SimplifyJobs/Summer2026-Internships/dev/.github/scripts/listings.json
  https://raw.githubusercontent.com/SimplifyJobs/New-Grad-Positions/dev/.github/scripts/listings.json

Uso:
  python3 research/scripts/simplify_coverage.py <dir_con_los_json> > research/data/simplify_sample_matches.csv

Solo lee ficheros locales; no hace peticiones de red. Ver research/company-sample.csv
para la muestra y research/job-coverage-matrix.csv para el resultado consolidado.
"""
import collections
import csv
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse

# id de la muestra -> expresión regular sobre company_name de Simplify
SAMPLE = {
    "ES-01 Iberdrola": r"^Iberdrola",
    "ES-02 Repsol": r"^Repsol",
    "ES-03 Indra": r"^Indra\b",
    "ES-04 Gestamp": r"Gestamp",
    "ES-05 SEAT": r"^(SEAT|CUPRA)\b",
    "ES-06 Sener": r"^Sener\b",
    "ES-07 Acciona": r"^Acciona",
    "ES-08 CAF": r"^CAF\b|Construcciones y Auxiliar",
    "EU-01 Airbus": r"^Airbus",
    "EU-02 Siemens": r"^Siemens$",
    "EU-03 Siemens Energy": r"^Siemens Energy",
    "EU-04 Bosch": r"Bosch",
    "EU-05 ABB": r"^ABB$",
    "EU-06 Schneider Electric": r"^Schneider Electric",
    "EU-07 Rolls-Royce plc": r"^Rolls-Royce$",
    "EU-08 Safran": r"^Safran",
    "EU-09 Volvo Group": r"^(Volvo Group|AB Volvo|Volvo$)",
    "EU-10 Volkswagen Group": r"Volkswagen",
    "EU-11 BMW Group": r"^BMW",
    "EU-12 Mercedes-Benz": r"^Mercedes",
    "EU-13 ASML": r"^ASML",
    "EU-14 Thales": r"^Thales",
    "US-01 GE Aerospace": r"^GE Aerospace",
    "US-02 GE Vernova": r"^GE Vernova",
    "US-03 Carrier": r"^Carrier",
    "US-04 Boeing": r"Boeing",
    "US-05 Caterpillar": r"^Caterpillar",
    "US-06 Honeywell": r"^Honeywell",
    "US-07 Tesla": r"^Tesla$",
    "OT-01 Hitachi Energy": r"^Hitachi Energy",
}

_US_CA_CODES = ("AL AK AZ AR CA CO CT DE FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND "
                "OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY DC PR AB BC MB NB NL NS ON PE QC SK").split()
US_CA = re.compile(r", (" + "|".join(_US_CA_CODES) + r")$|^(NYC|SF|LA|South SF|Remote.*|USA|United States|Canada)$|, Canada$"
                   r"|^(California|Texas|Iowa|Georgia|Minnesota|Washington|Florida|Colorado|Massachusetts"
                   r"|North Carolina|Ohio|Kansas|Pennsylvania|Oregon|South Carolina|Virginia|Maryland|Missouri"
                   r"|Indiana|Michigan|Wisconsin|Utah|Nevada|Tennessee|Louisiana|Oklahoma|Vermont|New Mexico)$")

EUROPE = re.compile(r"\b(UK|United Kingdom|England|Scotland|Wales|Ireland|Germany|France|Spain|Italy|Netherlands|Belgium"
                    r"|Switzerland|Austria|Sweden|Norway|Denmark|Finland|Poland|Portugal|Czech|Hungary|Romania|Greece"
                    r"|Munich|Berlin|Paris|London|Madrid|Barcelona|Amsterdam|Dublin|Zurich|Stockholm|Warsaw|Lisbon|Milan)\b")


def ats_from_url(url: str) -> str:
    host = urlparse(url).netloc.lower()
    for key, name in [("myworkdayjobs", "Workday"), ("myworkdaysite", "Workday"), ("greenhouse", "Greenhouse"),
                      ("lever.co", "Lever"), ("smartrecruiters", "SmartRecruiters"), ("icims", "iCIMS"),
                      ("successfactors", "SAP SuccessFactors"), ("oraclecloud", "Oracle Recruiting Cloud"),
                      ("taleo", "Taleo"), ("ashbyhq", "Ashby"), ("workable", "Workable"), ("avature", "Avature"),
                      ("bamboohr", "BambooHR"), ("eightfold", "Eightfold")]:
        if key in host:
            return name
    return "propio/otro:" + host


def norm(s: str) -> str:
    return re.sub(r"[^a-z0-9]+", " ", s.lower()).strip()


def main(data_dir: str) -> None:
    files = {"intern": "simplify_Summer2026-Internships.json", "newgrad": "simplify_New-Grad-Positions.json"}
    rows = []
    for kind, fname in files.items():
        for x in json.load(open(Path(data_dir) / fname)):
            x["_kind"] = kind
            rows.append(x)

    w = csv.writer(sys.stdout)
    w.writerow(["sample_id", "simplify_company_names", "listings_total", "listings_active",
                "active_hardware", "active_non_us_ca", "active_europe", "active_spain", "active_duplicates",
                "ats_hosts", "examples_active (titulo | ubicacion | fecha_publicacion | url)"])
    for sid, pattern in SAMPLE.items():
        rx = re.compile(pattern, re.I)
        match = [x for x in rows if rx.search(x["company_name"])]
        active = [x for x in match if x.get("active")]
        hw = [x for x in active if x.get("category", "").startswith("Hardware")]
        non_na = [x for x in active if any(not US_CA.search(l) for l in x.get("locations") or [])]
        europe = [x for x in active if any(EUROPE.search(l) and not US_CA.search(l) for l in x.get("locations") or [])]
        spain = [x for x in active if any(re.search(r"Spain|España|Madrid|Barcelona", l) for l in x.get("locations") or [])]
        seen, dups = collections.Counter(), 0
        for x in active:
            key = (norm(x["company_name"]), norm(x["title"]), tuple(sorted(x.get("locations") or [])))
            seen[key] += 1
        dups = sum(c - 1 for c in seen.values() if c > 1)
        hosts = collections.Counter(ats_from_url(x["url"]) for x in match)
        ex = sorted(active, key=lambda x: -x["date_posted"])[:5]
        examples = " || ".join(
            f"{x['title']} | {'; '.join(x.get('locations') or [])} | "
            f"{datetime.fromtimestamp(x['date_posted'], timezone.utc).date()} | {x['url']}" for x in ex)
        w.writerow([sid, "; ".join(sorted({x["company_name"] for x in match})), len(match), len(active),
                    len(hw), len(non_na), len(europe), len(spain), dups,
                    "; ".join(f"{k}={v}" for k, v in hosts.most_common()), examples])


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else ".")
