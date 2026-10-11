#!/usr/bin/env python3
"""Coste operativo reproducible de mantener las ofertas (horas del fundador + infraestructura).

Uso: python3 research/phase2_technical/scripts/coste_operativo.py > research/phase2_technical/data/coste_resultados.csv
Edita data/coste_inputs.csv. Todas las cifras de tiempo son estimaciones sin medición: sustituir
por los tiempos reales registrados en la prueba (protocolo_prueba.md).
"""
import csv
import sys
from pathlib import Path

inp = {r["id"]: r for r in csv.DictReader(open(Path(__file__).resolve().parent.parent / "data" / "coste_inputs.csv", encoding="utf-8"))}
w = csv.writer(sys.stdout)
w.writerow(["metrica", "conservador", "base", "optimista"])
res = {}
for sc in ("conservador", "base", "optimista"):
    g = lambda k: float(inp[k][sc])
    n = g("n_empresas")
    mix = {m: g(f"frac_{m}") for m in "ABCM"}
    setup_h = sum(n * mix[m] * g(f"setup_{m}") for m in mix) / 60
    mant_h = sum(n * mix[m] * g(f"mant_{m}") for m in mix) / 60
    nuevas = n * g("ofertas_empresa_mes")
    activas = nuevas * g("vida_oferta_meses")
    rev_h = nuevas * g("min_revision_oferta") / 60
    cierre_h = activas * mix["M"] * g("min_cierre_manual") / 60
    horas_mes = mant_h + rev_h + cierre_h + setup_h / g("meses_amortizar_setup")
    coste_mes = horas_mes * g("euros_hora") + g("infra_mes")
    res[sc] = {
        "horas_alta_inicial": setup_h, "horas_mes_mantenimiento_conectores": mant_h, "horas_mes_revision_ofertas": rev_h,
        "horas_mes_verificar_cierres_manuales": cierre_h, "HORAS_MES_TOTAL": horas_mes, "ofertas_nuevas_mes": nuevas,
        "ofertas_activas_promedio": activas, "COSTE_MES_EUR": coste_mes, "coste_por_empresa_mes_eur": coste_mes / n,
        "coste_por_oferta_activa_mes_eur": coste_mes / activas, "horas_mes_para_50_empresas": horas_mes * 50 / n,
    }
for k in res["base"]:
    w.writerow([k] + [round(res[sc][k], 2) for sc in ("conservador", "base", "optimista")])
