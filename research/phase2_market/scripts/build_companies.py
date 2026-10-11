#!/usr/bin/env python3
"""Construye data/companies.csv: 57 empresas industriales, con evidencia de portal, ATS y ofertas.

Uso: python3 research/phase2_market/scripts/build_companies.py  (requiere data/offers.csv)
Los recuentos se calculan desde data/offers.csv; el resto son observaciones registradas el 2026-10-11.
"Sin resultados" significa que el buscador no devolvió ofertas: NO que la empresa no tenga ofertas.
"""
import csv
from collections import defaultdict
from pathlib import Path

BASE = Path(__file__).resolve().parent.parent
NV = "no verificado"

# empresa, alias en offers.csv, país, sector, tamaño (solo si hay fuente), portal oficial observado,
# patrón ATS inferido de la URL, canales de terceros donde se vieron sus ofertas, programas/volúmenes con fuente
COMPANIES = [
    ("Iberdrola", ["Iberdrola"], "ES", "Energía", NV, "https://iberdrola.wd3.myworkdayjobs.com/iberdrola (fase 1)", "Workday (fase 1, host de URL)", "PDFs de bolsa USAL", "Becas Máster 17.ª ed. (plazo 29-03-2026); Programa de Graduados (fase 1)"),
    ("Repsol", ["Repsol"], "ES", "Energía", NV, "https://repsol.wd3.myworkdayjobs.com/Repsol (fase 1)", "Workday (fase 1)", "becas.com; UC3M (PDF)", "Talent Energy 2026 (inscripción hasta 31-12-2026 según agregador); Becas Impulso 2026"),
    ("Indra Group", ["Indra Group"], "ES", "Defensa/aeroespacial/TI", NV, NV, "Workable solo Indra UK (fase 1)", "—", "Becas STEM con Fundación Universia (15 × 2.000 €)"),
    ("Gestamp", ["Gestamp"], "ES", "Automoción", NV, "https://jobs.gestamp.com", "Patrón SAP SuccessFactors Career Site Builder (/job/<título>/<id>) — inferido", "StudentJob (inactiva); portal público UK de apprenticeships", "Máster con Comillas con prácticas internacionales (oct-2025)"),
    ("SEAT S.A.", ["SEAT S.A."], "ES", "Automoción", NV, NV, NV, "Bolsas de prácticas UPC (EETAC)", "KickStart Programme 13.ª edición"),
    ("Sener", [], "ES", "Ingeniería/aeroespacial", NV, NV, NV, "—", "Sin resultados en el buscador (no implica que no haya ofertas)"),
    ("Acciona", ["Acciona"], "ES", "Energía/infraestructuras", NV, "https://www.acciona.com.au/energia-careers/interns-and-graduates", NV, "Indeed Perú", ">250 plazas de prácticas para FP en España (nota oficial, feb-2026)"),
    ("CAF", ["CAF (CAF Signalling)"], "ES", "Ferroviario", NV, NV, NV, "Prensa especializada; EHU", "Jóvenes Talentos CAF Signalling (fecha no indicada)"),
    ("Técnicas Reunidas", ["Técnicas Reunidas"], "ES", "Ingeniería y construcción industrial", NV, NV, NV, "InfoJobs; Jooble", "Programa con KazMunayGas (graduados kazajos, no aplica en España)"),
    ("Navantia", ["Navantia"], "ES", "Naval/defensa", NV, NV, NV, "PDF ETSIN-UPM; prensa", "Cátedra Romero Landa (600 €/mes); 131 vacantes de titulados (hasta 15-09-2026)"),
    ("ITP Aero", [], "ES", "Aeroespacial", "~6.600 personas (1T-2026, documento oficial)", NV, NV, "Bizkaia Talent (ofertas 2023-2025)", ">450 estudiantes en prácticas en 2025 (documento de talento oficial)"),
    ("Talgo", [], "ES", "Ferroviario", NV, "jobs.talgo.com (mencionado por terceros)", NV, "InfoJobs (empleo, no prácticas)", "Beca Fundación Talgo con máster UPC (2024-25); 200 empleos en Rivabellosa (2026)"),
    ("Ingeteam", ["Ingeteam"], "ES", "Electrónica de potencia/energía", NV, "https://ingeteam.teamtailor.com", "Teamtailor (host verificado en URL)", "InfoJobs", "Busca perfiles de ing. eléctrica, electrónica, industrial (Deia, dic-2025)"),
    ("CIE Automotive", [], "ES", "Automoción", NV, NV, NV, "—", "Sin resultados 2026 (solo prácticas EHU de 2019-2021)"),
    ("Irizar", [], "ES", "Automoción (autobuses)", NV, NV, NV, "—", "Sin resultados 2026"),
    ("Fagor Arrasate", [], "ES", "Maquinaria", NV, NV, NV, "—", "Sin resultados de ofertas; alianza con Mondragon Unibertsitatea (mar-2026)"),
    ("Siemens", ["Siemens"], "DE", "Tecnología industrial", NV, "https://jobs.siemens.com", "Avature (inferido en fase 1)", "resumegeni; ausbildung.de; workingstudentjobs.de", "Pflichtpraktikum System Test (Job ID 511813); Campus2Career"),
    ("Siemens Energy", ["Siemens Energy"], "DE", "Energía", NV, "https://jobs.siemens-energy.com", "Mismo patrón /jobs/FolderDetail que Avature (inferido)", "jobbsafari.se", "Summer internships 2026 (KSA, Turquía, Suecia); Future Energy Graduates"),
    ("Bosch", ["Bosch"], "DE", "Automoción/industrial", NV, "https://jobs.smartrecruiters.com/BoschGroup (fase 1)", "SmartRecruiters (fase 1)", "workingstudentjobs.de; studyflix; iAgora; Indeed", "Pflichtpraktikum Entwicklung und Konstruktion (Renningen)"),
    ("BMW Group", ["BMW Group"], "DE", "Automoción", NV, "https://jobs.bmwgroup.com", "Portal propio", "JobTeaser (varias fichas con el mismo título)", "Praktika 4-6 meses en Múnich"),
    ("Mercedes-Benz", ["Mercedes-Benz"], "DE", "Automoción", NV, NV, "Lever solo MBRDNA EE. UU. (fase 1)", "jobjump.net; StepStone; iAgora", "Pflichtpraktika en Sindelfingen/Stuttgart"),
    ("Volkswagen", ["Volkswagen"], "DE", "Automoción", NV, NV, NV, "workingstudentjobs.de; studyflix; meinestadt; BTU (PDF)", "Praktika Wolfsburg; estudios duales 2027 (solicitud 01-08-2026 a 30-04-2027)"),
    ("ZF Group", ["ZF Group"], "DE", "Automoción", NV, "jobs.zf.com (no aparece en resultados)", NV, "fluidjobs; ausbildung.de; berufsstart", "Estudios duales 2026-27; Praktikum M&A"),
    ("Continental", ["Continental"], "DE", "Automoción/neumáticos", NV, "jobs.continental.com (no aparece en resultados)", NV, "workingstudentjobs.de; arbeitsagentur.de", "≥7 Praktika/Pflichtpraktika en Hannover (REF…)"),
    ("Schaeffler", ["Schaeffler"], "DE", "Automoción/industrial", NV, NV, NV, "workingstudentjobs.de; StepStone; studyflix", "≥6 Praktika de ingeniería con inicio jul-oct 2026"),
    ("TRUMPF", ["TRUMPF"], "DE", "Maquinaria (láser)", NV, NV, NV, "workingstudentjobs.de; ZipRecruiter; berufsstart", "Praktika WS 2026/27 en Ditzingen"),
    ("Festo", ["Festo"], "DE", "Automatización", NV, NV, NV, "berufsstart; workingstudentjobs.de", "TFM de simulación; Nacht der Bewerber 2026"),
    ("MTU Aero Engines", ["MTU Aero Engines"], "DE", "Aeroespacial", NV, NV, NV, "JobTeaser; workingstudentjobs.de; aubi-plus", "Praktika en Múnich (pool de desarrollo/diseño)"),
    ("Voith", ["Voith"], "DE", "Maquinaria/energía", NV, NV, NV, "StepStone", "Praktika y Pflichtpraktika (Heidenheim, Crailsheim)"),
    ("KUKA", [], "DE", "Robótica", NV, NV, NV, "—", "Sin resultados en la búsqueda"),
    ("Liebherr", [], "DE/CH", "Maquinaria", NV, NV, NV, "—", "Sin resultados en la búsqueda"),
    ("Airbus", ["Airbus"], "FR/DE/ES/NL", "Aeroespacial", NV, "https://ag.wd3.myworkdayjobs.com/Airbus (fase 1)", "Workday (fase 1)", "flexa.careers; aeroemploiformation; iAgora; AGEFIPH", "Stages 2026 en Toulouse (exigen elegibilidad de control de exportaciones en algún caso)"),
    ("Safran", ["Safran"], "FR", "Aeroespacial", NV, "https://www.safran-group.com/jobs", "Portal propio", "Wizbii; engagement-jeunes; HelloWork; iAgora", "Jobdating SAE 16-10-2026 (empleo); stages de cálculo"),
    ("Thales", ["Thales"], "FR", "Defensa/aeroespacial", NV, "https://thales.wd3.myworkdayjobs.com (fase 1)", "Workday (fase 1)", "engagement-jeunes; Wizbii; JobTeaser", "~3.300 stages y alternancias en Francia en 2026 (1.700 + 1.600), ~40 % contratados (nota oficial)"),
    ("Schneider Electric", ["Schneider Electric"], "FR", "Energía/automatización", NV, "https://www.se.com/ww/fr/about-us/careers/", "Front propio (iCIMS en EE. UU., fase 1)", "The Muse; Wizbii; Indeed", "Stages en Grenoble/Rueil; programa recomendado por 92,9 % (declaración de la empresa)"),
    ("Renault Group", ["Renault Group", "Renault Group (Alpine)"], "FR", "Automoción", NV, NV, NV, "engagement-jeunes; Wizbii; JobTeaser; ZipRecruiter; iAgora", "Campaña de stages CS27 publicada 26-09-2026"),
    ("Valeo", ["Valeo"], "FR", "Automoción", NV, NV, NV, "JobTeaser; engagement-jeunes; France Travail", "Stages y alternancias de diseño mecánico"),
    ("Alstom", ["Alstom"], "FR", "Ferroviario", NV, "https://jobsearch.alstom.com", "Patrón SAP SuccessFactors Career Site Builder — inferido", "InfoJobs; iAgora", "Alstom Talent Energy (12 meses, sept-2026, España)"),
    ("Dassault Aviation", ["Dassault Aviation"], "FR", "Aeroespacial", NV, NV, NV, "CIDJ; Wizbii", "Stage ingénieur de production (ref. 2026-15069)"),
    ("Leonardo", ["Leonardo"], "IT", "Aeroespacial/defensa", NV, NV, NV, "iAgora; Joinrs; Jobbydoo; portales de universidades", "Stages con tesis en Turín, Ronchi, Anagni"),
    ("Ferrari", ["Ferrari"], "IT", "Automoción", NV, "corporate.ferrari.com (sección carreras, citada por terceros)", NV, "Career service Polimi; placement Uniroma2", "Evento Polimi 25-03-2026 (solo estudiantes Polimi)"),
    ("Pirelli", ["Pirelli"], "IT", "Automoción (neumáticos)", NV, NV, NV, "ICE", "Programa de estágio Brasil 2026 (cerrado)"),
    ("Prysmian", ["Prysmian"], "IT", "Cables/energía", NV, "https://www.prysmian.com (Global Graduate Program)", NV, "—", "Build the Future: graduate program de 2 años"),
    ("Fincantieri", ["Fincantieri"], "IT", "Naval", NV, NV, NV, "Universidad de Génova (PDF)", "Documento de perfiles feb-2026; Génova hace obligatorias las prácticas curriculares en 2026/27"),
    ("Brembo", ["Brembo"], "IT", "Automoción (frenos)", NV, NV, NV, "fluidjobs; concorsando", ">50 posiciones abiertas (tercero sin fecha)"),
    ("ASML", ["ASML"], "NL", "Semiconductores (maquinaria)", NV, "https://asml.wd3.myworkdayjobs.com/asmlext1 (fase 1)", "Workday (fase 1)", "JobTeaser de TU/e (6 idiomas); The Muse; iAgora", "Internships de ingeniería de 6 meses (plazo 31-12-2026)"),
    ("Philips", ["Philips"], "NL", "Tecnología sanitaria", NV, NV, NV, "dejobs (DirectEmployers); Scoutify; iAgora", "Internships en Eindhoven"),
    ("DAF Trucks (PACCAR)", ["DAF Trucks (PACCAR)"], "NL", "Automoción (camiones)", NV, NV, NV, "Magnet.me; Randstad", "Afstudeeropdracht WO (375-450 €/mes)"),
    ("VDL Groep", ["VDL Groep"], "NL", "Fabricación industrial", NV, NV, NV, "Magnet.me; Indeed", "Afstudeerstages no técnicas en la búsqueda"),
    ("Stellantis", ["Stellantis"], "NL/IT/FR", "Automoción", NV, NV, NV, "iAgora; mitalent; fluidjobs", "Sin stage de ingeniería en Europa en los resultados"),
    ("Vestas", ["Vestas"], "DK", "Energía eólica", NV, NV, NV, "greenish.careers; jobbank.dk; IMarEST", "Commissioning Supervisor Intern (inducción ago-2026)"),
    ("Danfoss", ["Danfoss"], "DK", "Industrial/energía", NV, "https://jobs.danfoss.com", "Patrón SAP SuccessFactors Career Site Builder (-en_GB) — inferido", "CareerFairy", "≥5 internships; Global Postgraduate Program (inicio 01-09-2026)"),
    ("Volvo Group", ["Volvo Group"], "SE", "Automoción/maquinaria", NV, "https://www.volvogroup.com/en/careers/students-and-graduates.html (fase 1)", NV, "jobbsafari; vakanser; StudentJob SE; Wizbii", "Thesis en Gotemburgo; 100+ graduates/año (fase 1)"),
    ("SKF", [], "SE", "Rodamientos/industrial", NV, NV, NV, "PDF de universidad búlgara (programa caducado)", "Sin oferta 2026 en la búsqueda"),
    ("ABB", ["ABB"], "CH", "Electrificación/automatización", NV, "https://abb.wd3.myworkdayjobs.com (fase 1)", "Workday (fase 1)", "refresh.cv (misma oferta en 3 idiomas); iAgora", "Summer internships en Västerås (jun-ago 2026)"),
    ("Hitachi Energy", ["Hitachi Energy"], "CH", "Energía (redes)", NV, "https://www.hitachienergy.com/careers/open-jobs/", "Front propio sobre Workday (fase 1)", "The Muse; vakanser", "Power+ Graduate (inicio sep-2027); requisitos de permiso permanente o ciudadanía UE en un trainee"),
    ("Rolls-Royce", ["Rolls-Royce"], "UK", "Aeroespacial", NV, "https://careers.rolls-royce.com", "Workday (fase 1)", "flexa.careers; targetjobs; connecticum", "Internships 3-6 meses en Alemania; graduate E&T 2 años en UK"),
]


def main() -> None:
    offers = list(csv.DictReader(open(BASE / "data" / "offers.csv", encoding="utf-8")))
    by = defaultdict(list)
    for o in offers:
        by[o["empresa"]].append(o)
    cols = ["empresa_id", "empresa", "pais_sede", "sector", "tamano_evidencia", "portal_oficial_observado",
            "ats_o_patron_inferido", "canales_terceros_observados", "n_ofertas_registradas", "n_relevantes_objetivo",
            "n_relevantes_con_url_oficial", "programas_o_volumenes", "resultado_busqueda", "fecha_consulta"]
    with open(BASE / "data" / "companies.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(cols)
        for i, (name, aliases, country, sector, size, portal, ats, third, prog) in enumerate(COMPANIES, 1):
            os_ = [o for a in aliases for o in by.get(a, [])]
            rel = [o for o in os_ if o["relevante_objetivo"] == "sí"]
            res = ("con ofertas relevantes" if rel else "con registros no relevantes" if os_
                   else "sin ofertas concretas encontradas en el buscador (no implica ausencia de ofertas)")
            w.writerow([f"C{i:02d}", name, country, sector, size, portal, ats, third, len(os_), len(rel),
                        sum(1 for o in rel if o["url_es_portal_oficial"] == "sí"), prog, res, "2026-10-11"])
    print(f"{len(COMPANIES)} empresas escritas")
    from collections import Counter
    print("por país:", Counter(c[2] for c in COMPANIES))


if __name__ == "__main__":
    main()
