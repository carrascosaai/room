"""Genera las figuras de la memoria (diagramas tensión-deformación y sección de la viga)."""
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import Rectangle, Circle

plt.rcParams.update({"font.size": 10, "font.family": "DejaVu Sans"})

# --- Fig. 1: diagrama parábola-rectángulo del hormigón (EC2 / Código Estructural) ---
fck, gc = 30.0, 1.5
fcd = fck / gc
ec2, ecu2 = 2.0, 3.5  # por mil
e = np.linspace(0, ecu2, 300)
s = np.where(e <= ec2, fcd * (1 - (1 - e / ec2) ** 2), fcd)
fig, ax = plt.subplots(figsize=(5.5, 3.4), dpi=200)
ax.plot(e, s, color="#1f4e79", lw=2.2, label="Diagrama de cálculo")
ax.axhline(fcd, color="#999", ls=":", lw=1)
ax.axvline(ec2, color="#999", ls=":", lw=1)
ax.set_xlabel("Deformación de compresión εc (‰)")
ax.set_ylabel("Tensión σc (MPa)")
ax.set_title("Hormigón HA-30: diagrama parábola-rectángulo")
ax.annotate(f"fcd = {fcd:.0f} MPa", (0.2, fcd + 0.6))
ax.annotate("εc2 = 2,0‰", (ec2 + 0.05, 2))
ax.annotate("εcu2 = 3,5‰", (ecu2 - 0.75, 2))
ax.set_xlim(0, 3.8); ax.set_ylim(0, 24)
ax.grid(alpha=0.25)
fig.tight_layout(); fig.savefig("figuras/fig1_hormigon.png"); plt.close(fig)

# --- Fig. 2: diagrama bilineal del acero B500S ---
fyk, gs, Es = 500.0, 1.15, 200000.0
fyd = fyk / gs
eyd = fyd / Es * 1000  # por mil
fig, ax = plt.subplots(figsize=(5.5, 3.4), dpi=200)
ax.plot([0, eyd, 10], [0, fyd, fyd], color="#b03a2e", lw=2.2, label="Cálculo (fyd)")
ax.plot([0, fyk / Es * 1000, 10], [0, fyk, fyk], color="#b03a2e", lw=1.2, ls="--", label="Característico (fyk)")
ax.set_xlabel("Deformación εs (‰)")
ax.set_ylabel("Tensión σs (MPa)")
ax.set_title("Acero B500S: diagrama bilineal")
ax.annotate(f"fyd = {fyd:.1f} MPa", (4, fyd - 40))
ax.annotate(f"εyd = {eyd:.2f}‰", (eyd + 0.2, 60))
ax.set_xlim(0, 10); ax.set_ylim(0, 580)
ax.legend(loc="lower right"); ax.grid(alpha=0.25)
fig.tight_layout(); fig.savefig("figuras/fig2_acero.png"); plt.close(fig)

# --- Fig. 3: sección transversal de la viga del ejemplo ---
fig, ax = plt.subplots(figsize=(3.6, 4.6), dpi=200)
b, h, rec, est, phi = 300, 500, 30, 8, 20
ax.add_patch(Rectangle((0, 0), b, h, fc="#d9d9d9", ec="black", lw=1.5))
ax.add_patch(Rectangle((rec, rec), b - 2 * rec, h - 2 * rec, fc="none", ec="#1f4e79", lw=1.6))
y_inf = rec + est + phi / 2
for x in np.linspace(rec + est + phi / 2, b - rec - est - phi / 2, 3):
    ax.add_patch(Circle((x, y_inf), phi / 2, fc="#b03a2e", ec="black"))
for x in (rec + est + 6, b - rec - est - 6):
    ax.add_patch(Circle((x, h - rec - est - 6), 6, fc="#555", ec="black"))
ax.annotate("", (0, -25), (b, -25), arrowprops=dict(arrowstyle="<->"))
ax.text(b / 2, -45, "b = 300 mm", ha="center")
ax.annotate("", (-25, 0), (-25, h), arrowprops=dict(arrowstyle="<->"))
ax.text(-40, h / 2, "h = 500 mm", rotation=90, va="center", ha="center")
ax.annotate("", (b + 20, y_inf), (b + 20, h), arrowprops=dict(arrowstyle="<->", color="#1f4e79"))
ax.text(b + 35, (h + y_inf) / 2, "d ≈ 450 mm", rotation=90, va="center", color="#1f4e79")
ax.text(b / 2, y_inf + 30, "3Ø20 (As = 942 mm²)", ha="center", fontsize=8, color="#b03a2e")
ax.text(b / 2, h - 75, "2Ø12 montaje", ha="center", fontsize=8)
ax.text(b / 2, h / 2, "Estribos\nØ8 c/150", ha="center", fontsize=8, color="#1f4e79")
ax.set_xlim(-70, b + 70); ax.set_ylim(-70, h + 20)
ax.set_aspect("equal"); ax.axis("off")
ax.set_title("Sección de la viga (HA-30 / B500S)", fontsize=10)
fig.tight_layout(); fig.savefig("figuras/fig3_seccion.png"); plt.close(fig)
print("ok")
