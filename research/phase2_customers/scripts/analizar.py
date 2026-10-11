#!/usr/bin/env python3
"""Calcula las métricas M1–M10 de 08_criterios_decision.md a partir de las plantillas rellenas.

Uso: python3 research/phase2_customers/scripts/analizar.py [ruta_entrevistas.csv] [ruta_precios.csv]
Celdas vacías = desconocido: se excluyen del denominador de esa métrica (no cuentan como "no").
"""
import csv
import statistics
import sys
from pathlib import Path

BASE = Path(__file__).resolve().parent.parent / "plantillas"
ent_path = Path(sys.argv[1]) if len(sys.argv) > 1 else BASE / "entrevistas.csv"
pre_path = Path(sys.argv[2]) if len(sys.argv) > 2 else BASE / "precios.csv"
DOLOR_OBJETIVO = {"descubrimiento", "elegibilidad", "plazos"}


def rows(p):
    return list(csv.DictReader(open(p, encoding="utf-8")))


def pct(sel, base):
    base = [r for r in base]
    if not base:
        return "sin datos"
    return f"{100 * len(sel) / len(base):.0f} % ({len(sel)}/{len(base)})"


def known(rs, col):
    return [r for r in rs if r.get(col, "").strip() != ""]


def report(rs, label):
    print(f"\n== {label}: N = {len(rs)} ==")
    if not rs:
        return
    b1 = [r for r in rs if r["caso_inelegible"] in ("si", "no", "no_recuerda") or r["caso_cerrada_o_tarde"] in ("si", "no", "no_recuerda")]
    m1 = [r for r in b1 if r["caso_inelegible"] == "si" or r["caso_cerrada_o_tarde"] == "si"]
    print("M1 caso concreto inelegible/tarde:", pct(m1, b1))
    b2 = known(rs, "mayor_dolor_codigo")
    print("M2 mayor dolor = descubrimiento/elegibilidad/plazos:", pct([r for r in b2 if r["mayor_dolor_codigo"] in DOLOR_OBJETIVO], b2))
    h = [float(r["horas_semana_busqueda"]) for r in known(rs, "horas_semana_busqueda")]
    print("M3 mediana horas/semana:", f"{statistics.median(h):.1f} (n={len(h)})" if h else "sin datos")
    b4 = known(rs, "herramienta_propia")
    print("M4 usa herramienta propia:", pct([r for r in b4 if r["herramienta_propia"] == "si"], b4))
    b5 = known(rs, "entiende_B")
    print("M5 entiende B y no confunde ❔:", pct([r for r in b5 if r["entiende_B"] == "si" and r.get("interpreta_desconocido_como_si") == "no"], b5))
    b6 = known(rs, "compromiso_tiempo")
    print("M6 acepta piloto (entrevistas):", pct([r for r in b6 if r["compromiso_tiempo"] == "si"], b6))
    el = known(rs, "eleccion")
    print("Elección de concepto:", {k: sum(1 for r in el if r["eleccion"] == k) for k in ("A", "B", "ninguno")})
    ref = [float(r["referidos"]) for r in known(rs, "referidos")]
    print("M10 referidos (media):", f"{sum(ref) / len(ref):.1f}" if ref else "sin datos")
    mot = [r["motivo_inelegible"] for r in rs if r.get("motivo_inelegible")]
    print("Motivos de inelegibilidad:", {m: mot.count(m) for m in sorted(set(mot))})


ent = rows(ent_path)
validas = [r for r in ent if r.get("consentimiento") == "si"]
print(f"Entrevistas registradas: {len(ent)} · válidas con consentimiento: {len(validas)} · amigos/familia: "
      f"{sum(1 for r in validas if r.get('amigo_o_familiar') == 'si')}")
report(validas, "TODAS")
report([r for r in validas if r.get("segmento_principal_P1P3") == "si"], "SEGMENTO PRINCIPAL P1∩P3")
for p in ("P1", "P2", "P3", "P4", "P5"):
    sub = [r for r in validas if r.get("perfil_principal") == p]
    if len(sub) >= 3:
        report(sub, f"PERFIL {p}")

pre = rows(pre_path)
print(f"\n== EXPERIMENTO DE PRECIOS: {len(pre)} personas ==")
e1 = known(pre, "E1_acepta")
print("M6 acepta piloto (lista de espera):", pct([r for r in e1 if r["E1_acepta"] == "si" and r.get("E1_perfil_completo") == "si"], e1))
ini = [r for r in pre if r.get("E1_perfil_completo") == "si" and r.get("E1_respuestas_utiles_de_3", "") != ""]
print("M7 ≥2 de 3 envíos útiles:", pct([r for r in ini if int(r["E1_respuestas_utiles_de_3"]) >= 2], ini))
for precio in ("0", "3", "5", "9"):
    g = [r for r in pre if r.get("precio_asignado_eur") == precio and r.get("E2_visita") == "si"]
    res = [r for r in g if r.get("E2_reserva") == "si"]
    e3 = [r for r in res if r.get("E3_compromiso") == "si"]
    paid = [r for r in e3 if r.get("pago_real_entrega") == "si"]
    nota = " (n<20: solo recuentos)" if len(g) < 20 else ""
    print(f"  {precio} €/mes: visitas {len(g)} · reservas {len(res)} · E3 {len(e3)} · pagos reales {len(paid)}{nota}")
m8 = [r for r in pre if r.get("precio_asignado_eur") in ("3", "5", "9") and r.get("E3_compromiso") == "si"]
m9 = [r for r in m8 if r.get("pago_real_entrega") == "si"]
print(f"M8 compromisos reales en precio > 0: {len(m8)} (umbral ≥5)")
print(f"M9 pagos reales sobre M8: {pct(m9, m8)} (umbral ≥50 %)")
