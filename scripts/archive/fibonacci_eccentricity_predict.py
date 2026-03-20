#!/usr/bin/env python3
"""
ECCENTRICITY PREDICTION from the AMD formula
=============================================

Formula: e/√f(e) × (a × i_mean)^(-1/4) = C
where f(e) = 1 - √(1-e²)

Key algebraic identity:
  h(e) = e/√f(e) = √(1 + √(1-e²))

Proof: h² = e²/f(e) = e²/(1-√(1-e²))
       Multiply by (1+√(1-e²))/(1+√(1-e²)):
       h² = e²(1+√(1-e²)) / (1-(1-e²)) = e²(1+√(1-e²))/e² = 1+√(1-e²)

Inversion: Given K = C × (a × i_mean)^(1/4), solve h(e) = K:
  K² = 1 + √(1-e²)
  √(1-e²) = K² - 1
  e² = 1 - (K²-1)² = 2K² - K⁴ = K²(2-K²)
  e = K × √(2-K²)

Valid for K ∈ (0, √2], giving e ∈ [0, 1).
"""

import sys, os, math

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from fibonacci_data import *

# ═══════════════════════════════════════════════════════════════════════════
# COMPUTE QUANTITIES
# ═══════════════════════════════════════════════════════════════════════════

I_MEAN_DEG = {p: compute_mean_inclination(p) for p in PLANET_NAMES}
I_MEAN_RAD = {p: math.radians(I_MEAN_DEG[p]) for p in PLANET_NAMES}

def h(e):
    """h(e) = e/√f(e) = √(1+√(1-e²))"""
    return math.sqrt(1 + math.sqrt(1 - e**2))

def predict_e(K):
    """Given K = h(e), return e = K × √(2-K²). Valid for 0 < K ≤ √2."""
    if K > math.sqrt(2) or K <= 0:
        return float('nan')
    return K * math.sqrt(2 - K**2)

# Geometric factor for each planet
GEOM = {p: (SMA[p] * I_MEAN_RAD[p])**0.25 for p in PLANET_NAMES}

# Formula value for each planet: h(e) / geom = h(e) × (a × i_mean)^(-1/4)
FORMULA_VAL = {p: h(ECC[p]) / GEOM[p] for p in PLANET_NAMES}

print("=" * 100)
print("ECCENTRICITY PREDICTION from e/√f(e) × (a × i_mean)^(-1/4) = C")
print("=" * 100)

# ═══════════════════════════════════════════════════════════════════════════
# SECTION A: Show algebraic identity
# ═══════════════════════════════════════════════════════════════════════════

print(f"\n─── A. Algebraic identity: h(e) = e/√f(e) = √(1+√(1-e²)) ───\n")
print(f"  {'Planet':>10} | {'e':>10} | {'f(e)':>12} | {'e/√f(e)':>10} | {'√(1+√(1-e²))':>14} | {'Match?':>8}")
print("  " + "─" * 75)
for p in PLANET_NAMES:
    e = ECC[p]
    fe = 1 - math.sqrt(1 - e**2)
    h1 = e / math.sqrt(fe)
    h2 = math.sqrt(1 + math.sqrt(1 - e**2))
    match = abs(h1 - h2) < 1e-12
    print(f"  {p:>10} | {e:>10.6f} | {fe:>12.6e} | {h1:>10.6f} | {h2:>14.6f} | {'✓' if match else '✗':>8s}")

print(f"\n  Inversion formula: e = K × √(2 - K²)  where K = C × (a × i_mean)^(1/4)")


# ═══════════════════════════════════════════════════════════════════════════
# SECTION B: Current formula values and optimal C
# ═══════════════════════════════════════════════════════════════════════════

print(f"\n─── B. Current formula values ───\n")
print(f"  {'Planet':>10} | {'e':>10} | {'h(e)':>10} | {'(a×i_m)^¼':>10} | {'h(e)/geom':>10}")
print("  " + "─" * 60)
for p in PLANET_NAMES:
    print(f"  {p:>10} | {ECC[p]:>10.6f} | {h(ECC[p]):>10.6f} | {GEOM[p]:>10.6f} | {FORMULA_VAL[p]:>10.6f}")

vals = list(FORMULA_VAL.values())
C_mean = sum(vals) / len(vals)
C_median = sorted(vals)[3]  # 4th of 8 (lower median)
C_geomean = math.exp(sum(math.log(v) for v in vals) / len(vals))
mn, mx = min(vals), max(vals)
print(f"\n  Spread: {(mx/mn-1)*100:.2f}%")
print(f"  Mean C = {C_mean:.6f}")
print(f"  Geometric mean C = {C_geomean:.6f}")
print(f"  Median C = {C_median:.6f}")

# Find C that minimizes max absolute deviation
best_C = None
best_maxdev = float('inf')
for i in range(10001):
    C_try = mn + (mx - mn) * i / 10000
    maxdev = max(abs(v / C_try - 1) for v in vals)
    if maxdev < best_maxdev:
        best_maxdev = maxdev
        best_C = C_try

print(f"  Minimax C = {best_C:.6f} (max deviation ±{best_maxdev*100:.2f}%)")


# ═══════════════════════════════════════════════════════════════════════════
# SECTION C: Eccentricity predictions for each choice of C
# ═══════════════════════════════════════════════════════════════════════════

print(f"\n─── C. Eccentricity predictions ───")

for C_name, C_val in [("geometric mean", C_geomean), ("minimax", best_C), ("mean", C_mean)]:
    print(f"\n  C = {C_val:.6f} ({C_name})")
    print(f"  {'Planet':>10} | {'e_actual':>10} | {'K=C×geom':>10} | {'e_pred':>10} | {'Δe':>10} | {'Δ%':>8} | {'e_pred/e_act':>12}")
    print("  " + "─" * 85)

    sum_sq = 0
    max_pct = 0
    for p in PLANET_NAMES:
        K = C_val * GEOM[p]
        e_pred = predict_e(K)
        e_act = ECC[p]
        if math.isnan(e_pred):
            print(f"  {p:>10} | {e_act:>10.6f} | {K:>10.6f} | {'NO SOLN':>10s} | {'---':>10s} | {'---':>8s} | {'---':>12s}")
        else:
            delta_e = e_pred - e_act
            delta_pct = delta_e / e_act * 100
            sum_sq += delta_pct**2
            max_pct = max(max_pct, abs(delta_pct))
            print(f"  {p:>10} | {e_act:>10.6f} | {K:>10.6f} | {e_pred:>10.6f} | {delta_e:>+10.6f} | {delta_pct:>+7.1f}% | {e_pred/e_act:>12.4f}")
    rms = math.sqrt(sum_sq / 8) if sum_sq > 0 else 0
    print(f"  RMS error: {rms:.1f}%   Max error: {max_pct:.1f}%")


# ═══════════════════════════════════════════════════════════════════════════
# SECTION D: Best-fit C for each planet (what C would make prediction exact)
# ═══════════════════════════════════════════════════════════════════════════

print(f"\n─── D. What constant C would each planet need? ───\n")
print(f"  {'Planet':>10} | {'e_actual':>10} | {'h(e)':>10} | {'geom':>10} | {'C_needed':>10} | {'C/C_gm':>10}")
print("  " + "─" * 70)
for p in PLANET_NAMES:
    C_needed = FORMULA_VAL[p]
    print(f"  {p:>10} | {ECC[p]:>10.6f} | {h(ECC[p]):>10.6f} | {GEOM[p]:>10.6f} | {C_needed:>10.6f} | {C_needed/C_geomean:>10.4f}")

print(f"\n  The spread (95%) means the formula can predict e to within a factor of ~√2")
print(f"  This IS a constraint: random eccentricities would give much larger spread")


# ═══════════════════════════════════════════════════════════════════════════
# SECTION E: Sensitivity analysis — how much does e change per % change in C?
# ═══════════════════════════════════════════════════════════════════════════

print(f"\n─── E. Sensitivity: ∂e/∂C — how sensitive is e to the constant? ───\n")
print(f"  The prediction e = K√(2-K²) with K = C × (a×i_mean)^(1/4)")
print(f"  de/dK = √(2-K²) + K × (-K)/√(2-K²) = (2-2K²)/√(2-K²)")
print(f"  At K ≈ √2 (small e): de/dK ≈ (2-4)/0 → diverges! The inverse is singular.")
print(f"  This means small changes in C produce huge changes in predicted e for small-e planets.\n")

print(f"  {'Planet':>10} | {'K (geom)':>10} | {'√2-K':>10} | {'de/dK':>10} | {'1% C change → Δe':>18}")
print("  " + "─" * 75)
sqrt2 = math.sqrt(2)
for p in PLANET_NAMES:
    K = C_geomean * GEOM[p]
    if K >= sqrt2 or K <= 0:
        print(f"  {p:>10} | {K:>10.6f} | {'---':>10s} | {'---':>10s} | {'---':>18s}")
        continue
    dedK = (2 - 2*K**2) / math.sqrt(2 - K**2)
    # 1% change in C → dK = 0.01 × C × geom = 0.01 × K
    dK = 0.01 * K
    de = abs(dedK * dK)
    e_pred = predict_e(K)
    e_act = ECC[p]
    print(f"  {p:>10} | {K:>10.6f} | {sqrt2-K:>10.6f} | {dedK:>10.4f} | {de:>18.6f} (±{de/e_act*100:.1f}% of e)")


# ═══════════════════════════════════════════════════════════════════════════
# SECTION F: Can we do better? The h(e) factor carries information
# ═══════════════════════════════════════════════════════════════════════════

print(f"\n─── F. The h(e) factor: where is the information? ───\n")
print(f"  h(e) = √(1+√(1-e²)) ≈ √2 × (1 - e²/8 - ...)")
print(f"  Deviation from √2: Δh = h(e) - √2 ≈ -√2 × e²/8")
print(f"  The formula value = h(e) × (a×i_mean)^(-1/4)")
print(f"  = √2 × (1-e²/8) × (a×i_mean)^(-1/4)   [to first order]")
print(f"  = √2 × (a×i_mean)^(-1/4) × (1-e²/8)")
print(f"  So the '95% spread' is almost entirely from (a×i_mean)^(-1/4).")
print(f"  The eccentricity barely matters! (Mercury's e²/8 = 0.53%, others < 0.1%)\n")

# Show: (a×i_mean)^(-1/4) values
print(f"  {'Planet':>10} | {'(a×i_m)^-¼':>12} | {'e²/8':>10} | {'h(e)/√2':>10} | {'Δh/√2 %':>10}")
print("  " + "─" * 65)
for p in PLANET_NAMES:
    geom_inv = 1 / GEOM[p]
    e2_8 = ECC[p]**2 / 8
    h_ratio = h(ECC[p]) / sqrt2
    delta_h = (h_ratio - 1) * 100
    print(f"  {p:>10} | {geom_inv:>12.6f} | {e2_8:>10.6f} | {h_ratio:>10.6f} | {delta_h:>+10.4f}%")

print(f"\n  The geometric factor (a×i_mean)^(-1/4) spans {min(1/GEOM[p] for p in PLANET_NAMES):.3f} to {max(1/GEOM[p] for p in PLANET_NAMES):.3f}")
print(f"  → ratio {max(1/GEOM[p] for p in PLANET_NAMES)/min(1/GEOM[p] for p in PLANET_NAMES):.3f} → spread {(max(1/GEOM[p] for p in PLANET_NAMES)/min(1/GEOM[p] for p in PLANET_NAMES)-1)*100:.1f}%")
print(f"  Meanwhile h(e)/√2 spans 0.9947 to 1.0000 → contributes only 0.5% of variation")


# ═══════════════════════════════════════════════════════════════════════════
# SECTION G: Strip h(e) — the REAL constraint is (a×i_mean)^(-1/4) ≈ const
# ═══════════════════════════════════════════════════════════════════════════

print(f"\n─── G. The real constraint: ξ ∝ √(AMD) × i_mean^(1/4) ───\n")
print(f"  Since h(e) ≈ √2 for all planets, the formula simplifies to:")
print(f"  √2 / (a × i_mean)^(1/4) ≈ C")
print(f"  This is NOT a prediction of eccentricity — it's a geometric constraint.")
print(f"  The eccentricity enters only through √(AMD) on the other side:\n")
print(f"  ξ × AMD^(-1/2) = e/√(√a × f(e)) ≈ √2 × a^(-1/4)\n")
print(f"  The real content is: ξ / √AMD = √(2/√a), which is:")
print(f"  e√m / √(m√a(1-√(1-e²))) = √(2/√a)")
print(f"  → e / √(f(e)×√a) = √(2/√a)")
print(f"  → e / √f(e) = √2")
print(f"  → This is an IDENTITY for small e, not a prediction!\n")
print(f"  The 95% spread comes from multiplying by i_mean^(-1/4),")
print(f"  which adds real information but NOT about eccentricity.")

# So the formula is really: 1/(a × i_mean)^(1/4) ≈ C/√2
# Prediction: i_mean ∝ 1/a (approximately, at 4th root)

print(f"\n  Prediction: i_mean_rad = 2 / (C⁴ × a)")
print(f"  {'Planet':>10} | {'i_mean_obs(°)':>14} | {'i_mean_pred(°)':>15} | {'Δ%':>8}")
print("  " + "─" * 60)
C_geom4 = C_geomean**4
for p in PLANET_NAMES:
    i_pred_rad = 2 / (C_geom4 * SMA[p])
    i_pred_deg = math.degrees(i_pred_rad)
    delta = (i_pred_deg - I_MEAN_DEG[p]) / I_MEAN_DEG[p] * 100
    print(f"  {p:>10} | {I_MEAN_DEG[p]:>14.4f} | {i_pred_deg:>15.4f} | {delta:>+7.1f}%")


# ═══════════════════════════════════════════════════════════════════════════
# SECTION H: So what DOES predict eccentricity? Back to ξ/ξ_V = d/d_V
# ═══════════════════════════════════════════════════════════════════════════

print(f"\n─── H. What actually constrains eccentricity? ───\n")
print(f"  The AMD formula reveals: mass cancels, eccentricity self-cancels (h≈√2).")
print(f"  The real eccentricity information is in the Fibonacci ladder: ξ_p/ξ_V = k_p")
print(f"  where k = {{8, 1, 5/2, 5, 141, 85, 29.5, 5.8}}.")
print(f"  The AMD formula captures the a^(-1/4) trend but NOT the Fibonacci structure.\n")

# Show: detrended eccentricity (remove a^(-1/4) trend)
print(f"  Detrended: ξ × a^(1/4) (remove distance scaling)")
xi_detrend = {p: ECC[p] * SQRT_M[p] * SMA[p]**0.25 for p in PLANET_NAMES}
xi_det_V = xi_detrend['Venus']
print(f"  {'Planet':>10} | {'ξ×a^¼':>12} | {'/ Venus':>10} | {'d (Fib)':>8} | {'ξ/ξ_V':>10} | {'k_ladder':>10}")
print("  " + "─" * 75)

K_ECC_FULL = {
    "Mercury": 8, "Venus": 1, "Earth": 5/2, "Mars": 5,
    "Jupiter": 141, "Saturn": 85, "Uranus": 29.5, "Neptune": 5.8
}

for p in PLANET_NAMES:
    xi_rat = ECC[p]*SQRT_M[p] / (ECC['Venus']*SQRT_M['Venus'])
    print(f"  {p:>10} | {xi_detrend[p]:.6e} | {xi_detrend[p]/xi_det_V:>10.3f} | {D[p]:>8d} | {xi_rat:>10.3f} | {K_ECC_FULL[p]:>10.1f}")

print(f"\n  Detrended spread: {(max(xi_detrend.values())/min(xi_detrend.values())-1)*100:.0f}%")
print(f"  → Removing the a^(-1/4) trend still leaves huge variation (the Fibonacci ladder)")
print(f"  → The AMD formula captures only the smooth distance scaling, not the discrete structure")


# ═══════════════════════════════════════════════════════════════════════════
# SECTION I: Predictions table using geometric mean C
# ═══════════════════════════════════════════════════════════════════════════

print(f"\n" + "=" * 100)
print(f"SECTION I: FINAL PREDICTIONS TABLE")
print(f"Using C = {C_geomean:.6f} (geometric mean)")
print("=" * 100)

print(f"\n  e = K × √(2-K²),  K = C × (a × i_mean_rad)^(1/4)\n")
print(f"  {'Planet':>10} | {'a (AU)':>10} | {'i_mean(°)':>10} | {'K':>10} | {'e_predicted':>12} | {'e_actual':>10} | {'Δ%':>8} | {'Δe':>10}")
print("  " + "─" * 100)

for p in PLANET_NAMES:
    K = C_geomean * GEOM[p]
    e_pred = predict_e(K)
    e_act = ECC[p]
    if math.isnan(e_pred):
        print(f"  {p:>10} | {SMA[p]:>10.4f} | {I_MEAN_DEG[p]:>10.4f} | {K:>10.6f} | {'NO SOLN':>12s} | {e_act:>10.6f} | {'---':>8s} | {'---':>10s}")
    else:
        delta_pct = (e_pred - e_act) / e_act * 100
        delta_e = e_pred - e_act
        print(f"  {p:>10} | {SMA[p]:>10.4f} | {I_MEAN_DEG[p]:>10.4f} | {K:>10.6f} | {e_pred:>12.6f} | {e_act:>10.6f} | {delta_pct:>+7.1f}% | {delta_e:>+10.6f}")

print(f"\n  Note: K must be ≤ √2 = {sqrt2:.6f} for a solution to exist.")
print(f"  K close to √2 → small e;  K close to 1 → e close to 1.")
print(f"  The sensitivity diverges as K → √2 (small-e limit).")


print(f"\n" + "=" * 100)
print("DONE")
print("=" * 100)
