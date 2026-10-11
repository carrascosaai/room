#!/usr/bin/env python3
"""TAM/SAM/SOM reproducible a partir de data/tam_inputs.csv (escenarios bajo/base/alto).

Uso: python3 research/phase2_market/scripts/tam_sam_som.py > research/phase2_market/data/tam_results.csv
Cada fórmula usa solo identificadores de tam_inputs.csv. Los "supuestos" no tienen fuente y están
marcados como tales; cámbialos y vuelve a ejecutar.
"""
import csv
import sys
from pathlib import Path

BASE = Path(__file__).resolve().parent.parent
inp = {r["id"]: r for r in csv.DictReader(open(BASE / "data" / "tam_inputs.csv", encoding="utf-8"))}

FORMULAS = [
    ("TAM_stock_UE", "Estudiantes UE en F07 (stock)", "I1*I2", "personas"),
    ("TAM_flujo_UE", "Titulados UE en F07 por año (flujo)", "I3*I4", "personas/año"),
    ("SAM_UE_transfronterizo", "Titulados F07 de las familias objetivo que hacen prácticas en otro país UE, por año", "I3*I4*I5*I6*A1", "personas/año"),
    ("SAM_ES_stock", "Estudiantes en España de las familias objetivo (stock)", "I7*I8*A1", "personas"),
    ("SAM_ES_transfronterizo", "Parte del SAM España que haría prácticas en otro país UE (aplicando I6)", "I7*I8*A1*I6", "personas"),
    ("SOM_ES_usuarios", "Usuarios alcanzables en España en 24 meses", "I7*I8*A1*A2", "personas"),
    ("SOM_ES_ingresos_B2C", "Ingresos B2C anuales del SOM España", "I7*I8*A1*A2*A3*A4", "€/año"),
    ("Techo_B2C_UE", "Ingresos B2C si se alcanzara TODO el SAM transfronterizo UE", "I3*I4*I5*I6*A1*A3*A4", "€/año"),
    ("SOM_empleadores", "Ingresos por publicaciones de pymes", "A5*A6*A7", "€/año"),
]


def ev(expr: str, scen: str) -> float:
    val = 1.0
    for tok in expr.split("*"):
        val *= float(inp[tok][scen])
    return val


w = csv.writer(sys.stdout)
w.writerow(["metrica", "descripcion", "formula", "unidad", "bajo", "base", "alto"])
for key, desc, expr, unit in FORMULAS:
    w.writerow([key, desc, expr, unit] + [round(ev(expr, s)) for s in ("bajo", "base", "alto")])
