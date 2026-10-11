#!/usr/bin/env python3
"""Experimento reproducible: cuenta ofertas relevantes en los portales oficiales (ATS) de la muestra.

POR QUÉ EXISTE: el entorno donde se hizo la investigación no tenía acceso HTTP directo a los
portales de empleo (proxy 403 / DNS bloqueado), así que la Fase 2 no pudo medir el número
real de vacantes en cada portal. Este script permite repetir la medición desde un equipo
normal y generar el denominador que falta para la Fase 3.

ESTADO: la lógica de clasificación tiene autotest offline (--selftest). Las llamadas de red
NO se han podido ejecutar desde el entorno de investigación; revisa los resultados.

Reglas que respeta:
  * Solo endpoints públicos de lectura que el propio portal usa para mostrar sus ofertas.
  * Nunca envía candidaturas, nunca inicia sesión, no resuelve CAPTCHA ni rota IPs.
  * 1 petición cada 2 s por defecto; se detiene ante 401/403/429 y lo registra.
  * Workday no tiene API pública documentada para ofertas (categoría C en ats-analysis.md):
    solo se consulta con --allow-unofficial, y bajo tu responsabilidad.

Uso:
  python3 research/scripts/ats_probe.py --selftest
  python3 research/scripts/ats_probe.py research/data/ats_endpoints.csv > research/data/portal_counts.csv
  python3 research/scripts/ats_probe.py research/data/ats_endpoints.csv --allow-unofficial > ...

Formato de ats_endpoints.csv: sample_id,ats,identifier
  greenhouse      -> board token          (https://boards-api.greenhouse.io/v1/boards/<token>/jobs)
  lever / lever_eu-> site slug            (https://api.lever.co/v0/postings/<slug>?mode=json)
  smartrecruiters -> company id           (https://api.smartrecruiters.com/v1/companies/<id>/postings)
  ashby           -> organization slug    (https://api.ashbyhq.com/posting-api/job-board/<slug>)
  workday         -> host|tenant|site     (POST https://<host>/wday/cxs/<tenant>/<site>/jobs)
"""
import csv
import json
import re
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone

USER_AGENT = "job-research-probe/0.1 (investigacion academica; contacto: definir antes de ejecutar)"
DELAY_S = 2.0

EARLY = re.compile(
    r"\b(intern(ship)?s?|co-?op|praktik(um|ant|antin)?|pr[aá]cticas|becari[oa]s?|beca|stage|stagiaire|alternan(ce|t)"
    r"|trainee|graduate|grad(uate)? program|werkstudent(in)?|working student|thesis|abschlussarbeit|masterarbeit"
    r"|bachelorarbeit|tfg|tfm|apprentice(ship)?|placement|junior|entry[- ]level|new grad|vie|absolvent)\b", re.I)
ENGINEERING = re.compile(
    r"(engineer|ingenier|ing[ée]nieur|mechanic|mec[aá]nic|maschinenbau|mechatroni|electri|el[ée]ctric|elektro"
    r"|aerospace|aeron[aá]ut|a[ée]ro|manufactur|fabricaci|produktion|production|producci|quality|calidad|qualit"
    r"|process|proceso|design|dise[ñn]o|konstruktion|cad|cae|simulation|simulaci|thermal|t[ée]rmic|hvac"
    r"|energy|energ|power|renewable|renovable|wind|e[óo]lic|solar|battery|bater|automation|automatiz"
    r"|robotic|rob[óo]tic|industrial|materials|materiales|structur|estructur|propulsion|propulsi|r&d|i\+d)", re.I)


def classify(title: str) -> dict:
    early = bool(EARLY.search(title or ""))
    eng = bool(ENGINEERING.search(title or ""))
    return {"early_career": early, "engineering": eng, "relevant": early and eng}


def _get(url: str, data: bytes | None = None) -> dict:
    headers = {"User-Agent": USER_AGENT, "Accept": "application/json"}
    if data is not None:
        headers["Content-Type"] = "application/json"
    req = urllib.request.Request(url, data=data, headers=headers, method="POST" if data else "GET")
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read().decode("utf-8"))


def fetch(ats: str, ident: str, allow_unofficial: bool) -> list[dict]:
    """Devuelve [{title, location, url, posted}] o lanza excepción."""
    if ats == "greenhouse":
        d = _get(f"https://boards-api.greenhouse.io/v1/boards/{ident}/jobs")
        return [{"title": j.get("title"), "location": (j.get("location") or {}).get("name"),
                 "url": j.get("absolute_url"), "posted": j.get("updated_at")} for j in d.get("jobs", [])]
    if ats in ("lever", "lever_eu"):
        base = "api.eu.lever.co" if ats == "lever_eu" else "api.lever.co"
        d = _get(f"https://{base}/v0/postings/{ident}?mode=json")
        return [{"title": j.get("text"), "location": (j.get("categories") or {}).get("location"),
                 "url": j.get("hostedUrl"), "posted": j.get("createdAt")} for j in d]
    if ats == "smartrecruiters":
        out, offset = [], 0
        while True:
            d = _get(f"https://api.smartrecruiters.com/v1/companies/{ident}/postings?limit=100&offset={offset}")
            for j in d.get("content", []):
                loc = j.get("location") or {}
                out.append({"title": j.get("name"), "location": f"{loc.get('city')}, {loc.get('country')}",
                            "url": f"https://jobs.smartrecruiters.com/{ident}/{j.get('id')}",
                            "posted": j.get("releasedDate")})
            offset += 100
            if offset >= d.get("totalFound", 0):
                return out
            time.sleep(DELAY_S)
    if ats == "ashby":
        d = _get(f"https://api.ashbyhq.com/posting-api/job-board/{ident}")
        return [{"title": j.get("title"), "location": j.get("location"), "url": j.get("jobUrl"),
                 "posted": j.get("publishedAt")} for j in d.get("jobs", [])]
    if ats == "workday":
        if not allow_unofficial:
            raise RuntimeError("workday omitido: endpoint no documentado (usa --allow-unofficial)")
        host, tenant, site = ident.split("|")
        out, offset = [], 0
        while True:
            body = json.dumps({"appliedFacets": {}, "limit": 20, "offset": offset, "searchText": ""}).encode()
            d = _get(f"https://{host}/wday/cxs/{tenant}/{site}/jobs", data=body)
            for j in d.get("jobPostings", []):
                out.append({"title": j.get("title"), "location": j.get("locationsText"),
                            "url": f"https://{host}/{site}{j.get('externalPath', '')}", "posted": j.get("postedOn")})
            offset += 20
            if offset >= d.get("total", 0) or offset >= 2000:
                return out
            time.sleep(DELAY_S)
    raise RuntimeError(f"ATS no soportado por el script: {ats}")


def main(path: str, allow_unofficial: bool) -> None:
    w = csv.writer(sys.stdout)
    w.writerow(["sample_id", "ats", "checked_at_utc", "status", "total_postings", "early_career",
                "relevant_engineering_early", "duplicates", "examples"])
    for row in csv.DictReader(open(path)):
        now = datetime.now(timezone.utc).isoformat(timespec="seconds")
        try:
            jobs = fetch(row["ats"], row["identifier"], allow_unofficial)
            status = "ok"
        except urllib.error.HTTPError as e:
            jobs, status = [], f"http_{e.code}"
        except Exception as e:  # registrar y seguir: no reintentar agresivamente
            jobs, status = [], f"error: {e}"[:120]
        tagged = [(j, classify(j["title"] or "")) for j in jobs]
        rel = [j for j, c in tagged if c["relevant"]]
        keys = [(re.sub(r"\W+", " ", (j["title"] or "").lower()), j["location"]) for j in rel]
        dups = len(keys) - len(set(keys))
        ex = " || ".join(f"{j['title']} | {j['location']} | {j['posted']} | {j['url']}" for j in rel[:5])
        w.writerow([row["sample_id"], row["ats"], now, status, len(jobs),
                    sum(1 for _, c in tagged if c["early_career"]), len(rel), dups, ex])
        sys.stdout.flush()
        time.sleep(DELAY_S)


def selftest() -> None:
    cases = {
        "Praktikum Maschinenbau Konstruktion (w/m/d)": True,
        "Prácticas Ingeniería Mecánica - Planta de Martorell": True,
        "Stage - Ingénieur méthodes production H/F": True,
        "Mechanical Engineering Intern - Summer 2027": True,
        "Graduate Programme - Electrical Engineering": True,
        "Senior Mechanical Engineer": False,
        "Marketing Intern": False,
        "Werkstudent HR": False,
    }
    for title, expected in cases.items():
        got = classify(title)["relevant"]
        assert got == expected, (title, got, expected)
    print(f"selftest OK ({len(cases)} casos)")


if __name__ == "__main__":
    if "--selftest" in sys.argv:
        selftest()
    else:
        args = [a for a in sys.argv[1:] if not a.startswith("--")]
        main(args[0], "--allow-unofficial" in sys.argv)
