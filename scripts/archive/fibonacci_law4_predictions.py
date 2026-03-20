#!/usr/bin/env python3
"""
LAW 4: ECCENTRICITY CONSTANT — FULL PREDICTION CHAIN
=====================================================

Starting from ONE input (Earth's base eccentricity e_E = 0.015321),
predict all 8 eccentricities using the Fibonacci R² pair constraints.

Chain:
  1. Law 2 gives mean inclinations for all 8 planets (from H = 333,888)
  2. e_E fixes R_Earth = e_E / i_Earth_mean_rad
  3. Earth/Saturn R² sum determines R_Saturn → e_Saturn
  4. Mars/Jupiter pair constraints determine both R values → e_Mars, e_Jupiter
  5. Venus/Neptune ratio constraint determines both → e_Venus, e_Neptune
  6. Mercury/Uranus ratio constraint determines both → e_Mercury, e_Uranus
"""

import math
import sys
sys.path.insert(0, '.')
from fibonacci_data import *

print("=" * 78)
print("LAW 4 (ECCENTRICITY CONSTANT): PREDICTIONS FROM e_E = 0.015321")
print("=" * 78)

# Step 1: Mean inclinations from Law 2
print("\n─── Step 1: Mean inclinations from Law 2 (ψ-derived) ───\n")

mean_incl = {}
mean_incl_rad = {}
for p in PLANET_NAMES:
    mean_incl[p] = compute_mean_inclination(p)
    mean_incl_rad[p] = math.radians(mean_incl[p])

print(f"{'Planet':>10}  {'i_mean (°)':>10}  {'i_mean (rad)':>14}")
print("─" * 40)
for p in PLANET_NAMES:
    print(f"{p:>10}  {mean_incl[p]:10.4f}  {mean_incl_rad[p]:14.6e}")

# Step 2: Fix R_Earth from e_E
print("\n─── Step 2: R_Earth from e_E = 0.015321 ───\n")

e_E = EARTH_BASE_ECCENTRICITY  # 0.015321
R_E = e_E / mean_incl_rad["Earth"]
print(f"  R_Earth = e_E / i_Earth_mean_rad = {e_E} / {mean_incl_rad['Earth']:.6e} = {R_E:.6f}")

# Step 3: Earth/Saturn — use R² sum to get R_Saturn
print("\n─── Step 3: Earth/Saturn pair (R² sum = 34/3) ───\n")

S_ES = 34 / 3  # F_9 / F_4
R2_S = S_ES - R_E**2
R_S = math.sqrt(R2_S)
e_S_pred = R_S * mean_incl_rad["Saturn"]

print(f"  R²_Earth + R²_Saturn = 34/3 = {S_ES:.4f}")
print(f"  R²_Saturn = {S_ES:.4f} - {R_E**2:.6f} = {R2_S:.6f}")
print(f"  R_Saturn = {R_S:.6f}")
print(f"  e_Saturn = R_Saturn × i_Saturn_mean_rad = {R_S:.6f} × {mean_incl_rad['Saturn']:.6e} = {e_S_pred:.6f}")
print(f"  Observed: {ECC['Saturn']:.6f}, Error: {(e_S_pred - ECC['Saturn'])/ECC['Saturn']*100:+.2f}%")

# Cross-check with product constraint
R_prod_check = R_E * R_S
print(f"\n  Cross-check: R_E × R_S = {R_prod_check:.4f} (target: 2, error: {(R_prod_check/2 - 1)*100:+.2f}%)")

# Step 4: Mars/Jupiter — product constraint
print("\n─── Step 4: Mars/Jupiter pair ───")
print("  R²_sum = 377/5 = 75.4000, R_product = 34/2 = 17.0000\n")

S_MJ = 377 / 5
P_MJ = 34 / 2
disc = S_MJ**2 - 4*P_MJ**2
u1 = (S_MJ + math.sqrt(disc)) / 2
u2 = (S_MJ - math.sqrt(disc)) / 2
R_large = math.sqrt(u1)
R_small = math.sqrt(u2)

# Inner (Mars) gets smaller root
R_Ma = R_small
R_Ju = R_large
e_Ma_pred = R_Ma * mean_incl_rad["Mars"]
e_Ju_pred = R_Ju * mean_incl_rad["Jupiter"]

print(f"  Quadratic roots: {R_large:.6f} and {R_small:.6f}")
print(f"  R_Mars (inner, smaller) = {R_Ma:.6f}")
print(f"  R_Jupiter (outer, larger) = {R_Ju:.6f}")
print(f"  e_Mars    = {R_Ma:.6f} × {mean_incl_rad['Mars']:.6e} = {e_Ma_pred:.6f}  (obs: {ECC['Mars']:.6f}, err: {(e_Ma_pred - ECC['Mars'])/ECC['Mars']*100:+.2f}%)")
print(f"  e_Jupiter = {R_Ju:.6f} × {mean_incl_rad['Jupiter']:.6e} = {e_Ju_pred:.6f}  (obs: {ECC['Jupiter']:.6f}, err: {(e_Ju_pred - ECC['Jupiter'])/ECC['Jupiter']*100:+.2f}%)")

# Step 5: Venus/Neptune — ratio constraint
print("\n─── Step 5: Venus/Neptune pair ───")
print("  R²_sum = 1/2 = 0.5000, R_Venus/R_Neptune = 2/8 = 0.2500\n")

S_VN = 1 / 2
Q_VN = 2 / 8  # = 0.25
R2_Ne = S_VN / (1 + Q_VN**2)
R2_V = Q_VN**2 * R2_Ne
R_V = math.sqrt(R2_V)
R_Ne = math.sqrt(R2_Ne)
e_V_pred = R_V * mean_incl_rad["Venus"]
e_Ne_pred = R_Ne * mean_incl_rad["Neptune"]

print(f"  R_Neptune = √(S / (1 + Q²)) = √({S_VN:.4f} / {1+Q_VN**2:.4f}) = {R_Ne:.6f}")
print(f"  R_Venus   = Q × R_Neptune = {Q_VN:.4f} × {R_Ne:.6f} = {R_V:.6f}")
print(f"  e_Venus   = {R_V:.6f} × {mean_incl_rad['Venus']:.6e} = {e_V_pred:.6f}  (obs: {ECC['Venus']:.6f}, err: {(e_V_pred - ECC['Venus'])/ECC['Venus']*100:+.2f}%)")
print(f"  e_Neptune = {R_Ne:.6f} × {mean_incl_rad['Neptune']:.6e} = {e_Ne_pred:.6f}  (obs: {ECC['Neptune']:.6f}, err: {(e_Ne_pred - ECC['Neptune'])/ECC['Neptune']*100:+.2f}%)")

# Step 6: Mercury/Uranus — ratio constraint
print("\n─── Step 6: Mercury/Uranus pair ───")
print("  R²_sum = 21/2 = 10.5000, R_Mercury/R_Uranus = 2/3 = 0.6667\n")

S_MU = 21 / 2
Q_MU = 2 / 3
R2_Ur = S_MU / (1 + Q_MU**2)
R2_Me = Q_MU**2 * R2_Ur
R_Me = math.sqrt(R2_Me)
R_Ur = math.sqrt(R2_Ur)
e_Me_pred = R_Me * mean_incl_rad["Mercury"]
e_Ur_pred = R_Ur * mean_incl_rad["Uranus"]

print(f"  R_Uranus  = √(S / (1 + Q²)) = √({S_MU:.4f} / {1+Q_MU**2:.4f}) = {R_Ur:.6f}")
print(f"  R_Mercury = Q × R_Uranus = {Q_MU:.4f} × {R_Ur:.6f} = {R_Me:.6f}")
print(f"  e_Mercury = {R_Me:.6f} × {mean_incl_rad['Mercury']:.6e} = {e_Me_pred:.6f}  (obs: {ECC['Mercury']:.6f}, err: {(e_Me_pred - ECC['Mercury'])/ECC['Mercury']*100:+.2f}%)")
print(f"  e_Uranus  = {R_Ur:.6f} × {mean_incl_rad['Uranus']:.6e} = {e_Ur_pred:.6f}  (obs: {ECC['Uranus']:.6f}, err: {(e_Ur_pred - ECC['Uranus'])/ECC['Uranus']*100:+.2f}%)")

# Summary table
print("\n" + "=" * 78)
print("SUMMARY: All 8 eccentricities from e_E = 0.015321")
print("=" * 78)

predictions = {
    "Mercury": e_Me_pred,
    "Venus": e_V_pred,
    "Earth": e_E,
    "Mars": e_Ma_pred,
    "Jupiter": e_Ju_pred,
    "Saturn": e_S_pred,
    "Uranus": e_Ur_pred,
    "Neptune": e_Ne_pred,
}

print(f"\n{'Planet':>10}  {'Predicted':>12}  {'Observed':>12}  {'Error':>8}  {'Source':>25}")
print("─" * 75)
for p in PLANET_NAMES:
    e_pred = predictions[p]
    e_obs = ECC[p]
    if p == "Earth":
        err_str = "   ref"
        source = "input (reference)"
    else:
        err = (e_pred - e_obs) / e_obs * 100
        err_str = f"{err:+6.2f}%"
        if p == "Saturn":
            source = "R² sum (Earth/Saturn)"
        elif p in ["Mars", "Jupiter"]:
            source = "product (Mars/Jupiter)"
        elif p in ["Venus", "Neptune"]:
            source = "ratio (Venus/Neptune)"
        else:
            source = "ratio (Mercury/Uranus)"
    print(f"{p:>10}  {e_pred:12.6f}  {e_obs:12.6f}  {err_str}  {source:>25}")

# Also show: what does Law 5 predict for Saturn independently?
print("\n─── Cross-check: Law 5 (Eccentricity Balance) Saturn prediction ───\n")
sum_203 = sum(eccentricity_weight(p) for p in GROUP_203)
coeff_S = math.sqrt(MASS["Saturn"]) * SMA["Saturn"]**1.5 / math.sqrt(D["Saturn"])
e_S_law5 = sum_203 / coeff_S
print(f"  Law 5 predicts e_Saturn = {e_S_law5:.6f} (error: {(e_S_law5 - ECC['Saturn'])/ECC['Saturn']*100:+.2f}%)")
print(f"  Law 4 predicts e_Saturn = {e_S_pred:.6f} (error: {(e_S_pred - ECC['Saturn'])/ECC['Saturn']*100:+.2f}%)")
print(f"  Consistency: Law 5 vs Law 4 differ by {abs(e_S_law5 - e_S_pred)/ECC['Saturn']*100:.2f}%")

print("\n" + "=" * 78)
print("COMPLETE")
print("=" * 78)
