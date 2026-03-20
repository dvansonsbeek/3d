#!/usr/bin/env python3
"""
MEAN INCLINATION PREDICTION from AMD formula
=============================================

Breakthrough insight: The formula ξ × AMD^(-1/2) × i_mean^(-1/4) = C
cannot predict eccentricity (h(e) ≈ √2 for small e), but REARRANGED
it predicts mean inclination from known eccentricity and semi-major axis.

From: h(e) × (a × i_mean)^(-1/4) = C
where h(e) = √(1 + √(1-e²))

Solving: i_mean = (h(e) / C)^4 / a

This predicts the BASELINE inclination (around which each planet oscillates)
from purely orbital mechanics quantities. The mean inclination is not
a standard prediction target — this would be a new result.

Also explore whether the optimized 2-param AMD^(-0.50) × i_mean^(-0.298)
gives better i_mean predictions.
"""

import sys, os, math

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from fibonacci_data import *

# ═══════════════════════════════════════════════════════════════════════════
# COMPUTE QUANTITIES
# ═══════════════════════════════════════════════════════════════════════════

XI_ALL = {p: ECC[p] * SQRT_M[p] for p in PLANET_NAMES}
I_MEAN_DEG = {p: compute_mean_inclination(p) for p in PLANET_NAMES}
I_MEAN_RAD = {p: math.radians(I_MEAN_DEG[p]) for p in PLANET_NAMES}
L_CIRC = {p: MASS[p] * math.sqrt(SMA[p]) for p in PLANET_NAMES}
AMD = {p: L_CIRC[p] * (1 - math.sqrt(1 - ECC[p]**2)) for p in PLANET_NAMES}

def h(e):
    """h(e) = √(1+√(1-e²))"""
    return math.sqrt(1 + math.sqrt(1 - e**2))

def spread(values):
    mn, mx = min(values), max(values)
    if mn <= 0: return float('inf')
    return mx / mn - 1


print("=" * 100)
print("MEAN INCLINATION PREDICTION from AMD × eccentricity formula")
print("=" * 100)


# ═══════════════════════════════════════════════════════════════════════════
# SECTION A: The general framework
# ═══════════════════════════════════════════════════════════════════════════

print(f"\n─── A. General framework ───\n")
print(f"  Given: ξ × AMD^α × i_mean^β = C")
print(f"  Solve for i_mean: i_mean = (C / (ξ × AMD^α))^(1/β)")
print(f"  = (C × AMD^(-α) / ξ)^(1/β)")
print(f"\n  Key quantity: ξ/√AMD = e/√(√a × f(e)) where f(e) = 1-√(1-e²)")
print(f"  For small e: ξ/√AMD ≈ √(2/√a) — depends only on distance!\n")

# Show ξ/√AMD for each planet
print(f"  {'Planet':>10} | {'e':>10} | {'a (AU)':>8} | {'ξ/√AMD':>10} | {'√(2/√a)':>10} | {'Δ%':>8} | {'i_mean(°)':>10}")
print("  " + "─" * 80)
for p in PLANET_NAMES:
    ratio = XI_ALL[p] / math.sqrt(AMD[p])
    approx = math.sqrt(2 / math.sqrt(SMA[p]))
    delta = (ratio / approx - 1) * 100
    print(f"  {p:>10} | {ECC[p]:>10.6f} | {SMA[p]:>8.4f} | {ratio:>10.6f} | {approx:>10.6f} | {delta:>+7.3f}% | {I_MEAN_DEG[p]:>10.4f}")


# ═══════════════════════════════════════════════════════════════════════════
# SECTION B: Predict i_mean using the exact formula
# Formula: h(e) × (a × i_mean)^(-1/4) = C
# → i_mean = (h(e)/C)^4 / a   (in radians)
# ═══════════════════════════════════════════════════════════════════════════

print(f"\n─── B. Predict i_mean from: h(e) × (a × i_mean_rad)^(-1/4) = C ───\n")

# Compute formula value for each planet
formula_vals = {p: h(ECC[p]) * (SMA[p] * I_MEAN_RAD[p])**(-0.25) for p in PLANET_NAMES}

# Find optimal C by minimizing RMS % error on i_mean predictions
best_C = None
best_rms = float('inf')
vals_list = sorted(formula_vals.values())
for i in range(10001):
    C_try = vals_list[0] + (vals_list[-1] - vals_list[0]) * i / 10000
    if C_try <= 0: continue
    sum_sq = 0
    for p in PLANET_NAMES:
        i_pred_rad = (h(ECC[p]) / C_try)**4 / SMA[p]
        i_pred_deg = math.degrees(i_pred_rad)
        err = (i_pred_deg / I_MEAN_DEG[p] - 1)**2
        sum_sq += err
    rms = math.sqrt(sum_sq / 8)
    if rms < best_rms:
        best_rms = rms
        best_C = C_try

# Also compute geometric mean and median
import statistics
C_geomean = math.exp(sum(math.log(v) for v in formula_vals.values()) / 8)
C_median = statistics.median(formula_vals.values())

for C_name, C_val in [("RMS-optimal", best_C), ("geometric mean", C_geomean),
                       ("median", C_median)]:
    print(f"  C = {C_val:.6f} ({C_name})")
    print(f"  {'Planet':>10} | {'i_m obs(°)':>10} | {'i_m pred(°)':>11} | {'Δ%':>8} | {'Δ(°)':>8} | {'rank obs':>9} | {'rank pred':>10}")
    print("  " + "─" * 80)

    preds = {}
    for p in PLANET_NAMES:
        i_pred_rad = (h(ECC[p]) / C_val)**4 / SMA[p]
        i_pred_deg = math.degrees(i_pred_rad)
        preds[p] = i_pred_deg

    # Rankings
    obs_ranked = sorted(PLANET_NAMES, key=lambda p: I_MEAN_DEG[p], reverse=True)
    pred_ranked = sorted(PLANET_NAMES, key=lambda p: preds[p], reverse=True)
    obs_rank = {p: i+1 for i, p in enumerate(obs_ranked)}
    pred_rank = {p: i+1 for i, p in enumerate(pred_ranked)}

    max_pct = 0
    sum_sq = 0
    for p in PLANET_NAMES:
        delta_pct = (preds[p] / I_MEAN_DEG[p] - 1) * 100
        delta_deg = preds[p] - I_MEAN_DEG[p]
        sum_sq += delta_pct**2
        max_pct = max(max_pct, abs(delta_pct))
        print(f"  {p:>10} | {I_MEAN_DEG[p]:>10.4f} | {preds[p]:>11.4f} | {delta_pct:>+7.1f}% | {delta_deg:>+8.4f} | {obs_rank[p]:>9d} | {pred_rank[p]:>10d}")

    rms = math.sqrt(sum_sq / 8)
    # Rank correlation
    rank_diffs = [(obs_rank[p] - pred_rank[p])**2 for p in PLANET_NAMES]
    spearman = 1 - 6 * sum(rank_diffs) / (8 * (64 - 1))
    print(f"  RMS error: {rms:.1f}%   Max error: {max_pct:.1f}%   Spearman rank: {spearman:.3f}")
    print()


# ═══════════════════════════════════════════════════════════════════════════
# SECTION C: Use optimized exponents AMD^(-0.504) × i_mean^(-0.298)
# Solving for i_mean: i_mean = (C / (ξ × AMD^α))^(1/β)
# ═══════════════════════════════════════════════════════════════════════════

print(f"\n─── C. Optimized exponents: ξ × AMD^α × i_mean^β = C ───\n")

# Test several (α, β) pairs from our optimization
CONFIGS = [
    (-0.500, -0.250, "AMD^(-1/2) × i_mean^(-1/4)"),
    (-0.500, -0.298, "AMD^(-0.50) × i_mean^(-0.30) [optimal]"),
    (-0.500, -2/7,   "AMD^(-1/2) × i_mean^(-2/7)"),
    (-0.500, -1/3,   "AMD^(-1/2) × i_mean^(-1/3)"),
]

for alpha, beta, label in CONFIGS:
    # Compute formula values
    fvals = {p: XI_ALL[p] * AMD[p]**alpha * I_MEAN_RAD[p]**beta for p in PLANET_NAMES}
    sp = spread(list(fvals.values()))

    # Optimal C for i_mean prediction
    best_C_opt = None
    best_rms_opt = float('inf')
    fv_sorted = sorted(fvals.values())
    for i in range(10001):
        C_try = fv_sorted[0] + (fv_sorted[-1] - fv_sorted[0]) * i / 10000
        if C_try <= 0: continue
        sum_sq = 0
        for p in PLANET_NAMES:
            # i_mean = (C / (ξ × AMD^α))^(1/β)
            ratio = C_try / (XI_ALL[p] * AMD[p]**alpha)
            if ratio <= 0: continue
            i_pred_rad = ratio**(1/beta)
            i_pred_deg = math.degrees(i_pred_rad)
            if i_pred_deg > 0:
                err = (i_pred_deg / I_MEAN_DEG[p] - 1)**2
                sum_sq += err
        rms = math.sqrt(sum_sq / 8)
        if rms < best_rms_opt:
            best_rms_opt = rms
            best_C_opt = C_try

    print(f"  {label}  (formula spread: {sp*100:.1f}%)")
    print(f"  C = {best_C_opt:.6e}")
    print(f"  {'Planet':>10} | {'i_m obs(°)':>10} | {'i_m pred(°)':>11} | {'Δ%':>8} | {'Δ(°)':>8}")
    print("  " + "─" * 60)

    max_pct = 0
    sum_sq = 0
    for p in PLANET_NAMES:
        ratio = best_C_opt / (XI_ALL[p] * AMD[p]**alpha)
        i_pred_rad = ratio**(1/beta)
        i_pred_deg = math.degrees(i_pred_rad)
        delta_pct = (i_pred_deg / I_MEAN_DEG[p] - 1) * 100
        delta_deg = i_pred_deg - I_MEAN_DEG[p]
        sum_sq += delta_pct**2
        max_pct = max(max_pct, abs(delta_pct))
        print(f"  {p:>10} | {I_MEAN_DEG[p]:>10.4f} | {i_pred_deg:>11.4f} | {delta_pct:>+7.1f}% | {delta_deg:>+8.4f}")

    rms = math.sqrt(sum_sq / 8)
    print(f"  RMS error: {rms:.1f}%   Max error: {max_pct:.1f}%")
    print()


# ═══════════════════════════════════════════════════════════════════════════
# SECTION D: What if we anchor to specific planets?
# Use Earth + Jupiter (best-known) to set C, predict others
# ═══════════════════════════════════════════════════════════════════════════

print(f"\n─── D. Anchor to specific planets ───\n")

alpha, beta = -0.500, -0.250  # simplest formula
for anchor in PLANET_NAMES:
    C_anchor = XI_ALL[anchor] * AMD[anchor]**alpha * I_MEAN_RAD[anchor]**beta
    preds = {}
    for p in PLANET_NAMES:
        ratio = C_anchor / (XI_ALL[p] * AMD[p]**alpha)
        i_pred_rad = ratio**(1/beta)
        preds[p] = math.degrees(i_pred_rad)

    errs = [abs(preds[p]/I_MEAN_DEG[p] - 1)*100 for p in PLANET_NAMES if p != anchor]
    rms = math.sqrt(sum(e**2 for e in errs) / len(errs))
    max_err = max(errs)
    print(f"  Anchor: {anchor:>10} (C = {C_anchor:.6f})  →  RMS={rms:.1f}%  Max={max_err:.1f}%")

# Best pair anchor
print(f"\n  Best pair anchor:")
best_pair = None
best_pair_rms = float('inf')
for i, p1 in enumerate(PLANET_NAMES):
    for p2 in PLANET_NAMES[i+1:]:
        C1 = XI_ALL[p1] * AMD[p1]**alpha * I_MEAN_RAD[p1]**beta
        C2 = XI_ALL[p2] * AMD[p2]**alpha * I_MEAN_RAD[p2]**beta
        C_avg = math.sqrt(C1 * C2)  # geometric mean

        errs = []
        for p in PLANET_NAMES:
            if p == p1 or p == p2: continue
            ratio = C_avg / (XI_ALL[p] * AMD[p]**alpha)
            i_pred_rad = ratio**(1/beta)
            i_pred_deg = math.degrees(i_pred_rad)
            errs.append(abs(i_pred_deg / I_MEAN_DEG[p] - 1) * 100)

        rms = math.sqrt(sum(e**2 for e in errs) / len(errs))
        if rms < best_pair_rms:
            best_pair_rms = rms
            best_pair = (p1, p2, C_avg, rms)

p1, p2, C_avg, rms = best_pair
print(f"  {p1} + {p2}: C = {C_avg:.6f}, RMS on other 6 = {rms:.1f}%")
print(f"\n  Predictions from {p1}+{p2} anchor:")
print(f"  {'Planet':>10} | {'i_m obs(°)':>10} | {'i_m pred(°)':>11} | {'Δ%':>8}")
print("  " + "─" * 50)
for p in PLANET_NAMES:
    ratio = C_avg / (XI_ALL[p] * AMD[p]**alpha)
    i_pred_rad = ratio**(1/beta)
    i_pred_deg = math.degrees(i_pred_rad)
    delta_pct = (i_pred_deg / I_MEAN_DEG[p] - 1) * 100
    marker = " ← anchor" if p in (p1, p2) else ""
    print(f"  {p:>10} | {I_MEAN_DEG[p]:>10.4f} | {i_pred_deg:>11.4f} | {delta_pct:>+7.1f}%{marker}")


# ═══════════════════════════════════════════════════════════════════════════
# SECTION E: Physical interpretation
# ═══════════════════════════════════════════════════════════════════════════

print(f"\n" + "=" * 100)
print("SECTION E: Physical interpretation")
print("=" * 100)

print(f"""
  The formula i_mean = (h(e)/C)^4 / a says:

  1. Mean inclination DECREASES with distance (∝ 1/a)
     → Closer planets are more tilted on average
     → This reflects the stronger secular coupling in the inner system

  2. Mean inclination INCREASES with eccentricity (via h(e))
     → More eccentric planets have higher mean inclination
     → Physical: AMD conservation links eccentricity and inclination budgets
     → A planet with high eccentricity must also have high inclination
        (both draw from the same angular momentum deficit)

  3. Mass does NOT appear (cancels exactly between ξ and √AMD)
     → The inclination baseline is a purely geometric property
     → Consistent with secular theory: eigenfrequencies depend on mass ratios,
        but individual orbit orientations depend on initial conditions + coupling

  Key limitation: The formula captures the TREND (inner > outer) but not the
  fine structure. Jupiter's very low i_mean (0.33°) and Saturn's moderate i_mean
  (0.93°) are not well-predicted because their mean inclinations are set by the
  Jupiter-Saturn Great Inequality, not by a simple distance scaling.
""")

# Show the trend vs actual
print(f"  Distance scaling: i_mean ∝ 1/a (normalized to Earth)")
print(f"  {'Planet':>10} | {'a/a_E':>8} | {'1/a':>8} | {'i_m obs':>10} | {'i_m ∝ 1/a':>10} | {'Δ%':>8}")
print("  " + "─" * 65)
C_earth = I_MEAN_DEG['Earth']  # normalize so Earth is exact
for p in PLANET_NAMES:
    a_ratio = SMA[p] / SMA['Earth']
    i_pred = C_earth / a_ratio
    delta = (i_pred / I_MEAN_DEG[p] - 1) * 100
    print(f"  {p:>10} | {a_ratio:>8.4f} | {1/a_ratio:>8.4f} | {I_MEAN_DEG[p]:>10.4f} | {i_pred:>10.4f} | {delta:>+7.1f}%")


# ═══════════════════════════════════════════════════════════════════════════
# SECTION F: Inner vs outer — separate constants?
# ═══════════════════════════════════════════════════════════════════════════

print(f"\n─── F. Inner vs outer solar system — separate constants? ───\n")

alpha, beta = -0.500, -0.250
INNER = ["Mercury", "Venus", "Earth", "Mars"]
OUTER = ["Jupiter", "Saturn", "Uranus", "Neptune"]

for group_name, group in [("Inner (Me,Ve,Ea,Ma)", INNER), ("Outer (Ju,Sa,Ur,Ne)", OUTER)]:
    fvals = [XI_ALL[p] * AMD[p]**alpha * I_MEAN_RAD[p]**beta for p in group]
    sp = spread(fvals)
    C_g = math.exp(sum(math.log(v) for v in fvals) / len(fvals))

    print(f"  {group_name}: formula spread = {sp*100:.1f}%, C = {C_g:.4f}")
    print(f"  {'Planet':>10} | {'i_m obs(°)':>10} | {'i_m pred(°)':>11} | {'Δ%':>8}")
    print("  " + "─" * 50)
    for p in group:
        ratio = C_g / (XI_ALL[p] * AMD[p]**alpha)
        i_pred_rad = ratio**(1/beta)
        i_pred_deg = math.degrees(i_pred_rad)
        delta_pct = (i_pred_deg / I_MEAN_DEG[p] - 1) * 100
        print(f"  {p:>10} | {I_MEAN_DEG[p]:>10.4f} | {i_pred_deg:>11.4f} | {delta_pct:>+7.1f}%")
    print()


# ═══════════════════════════════════════════════════════════════════════════
# SECTION G: Mirror pair analysis
# ═══════════════════════════════════════════════════════════════════════════

print(f"─── G. Mirror pair analysis ───\n")
print(f"  Do mirror pairs have similar formula values (suggesting d-structure)?")
print(f"\n  {'Inner':>10} | {'val_inner':>10} | {'Outer':>10} | {'val_outer':>10} | {'ratio':>8} | {'d':>4}")
print("  " + "─" * 70)
for p_in, p_out in MIRROR_PAIRS:
    v_in = XI_ALL[p_in] * AMD[p_in]**alpha * I_MEAN_RAD[p_in]**beta
    v_out = XI_ALL[p_out] * AMD[p_out]**alpha * I_MEAN_RAD[p_out]**beta
    ratio = v_in / v_out
    d_val = D[p_in]
    print(f"  {p_in:>10} | {v_in:>10.4f} | {p_out:>10} | {v_out:>10.4f} | {ratio:>8.4f} | {d_val:>4d}")

print(f"\n  If the formula were exact for mirror pairs, all ratios would be 1.0")
print(f"  Mars/Jupiter ratio ≈ {XI_ALL['Mars']*AMD['Mars']**alpha*I_MEAN_RAD['Mars']**beta / (XI_ALL['Jupiter']*AMD['Jupiter']**alpha*I_MEAN_RAD['Jupiter']**beta):.4f} (closest to 1)")


# ═══════════════════════════════════════════════════════════════════════════
# SECTION H: SUMMARY
# ═══════════════════════════════════════════════════════════════════════════

print(f"\n" + "=" * 100)
print("SUMMARY: Mean inclination prediction from AMD formula")
print("=" * 100)

print(f"""
  Formula: i_mean = (h(e) / C)^4 / a  [in radians]
  where h(e) = √(1 + √(1-e²)),  C ≈ {best_C:.3f}

  What's new:
  • Connects mean inclination to eccentricity through AMD conservation
  • Mass cancels exactly — purely geometric relation
  • Predicts inner planets better than outer (secular coupling stronger)
  • The relation i_mean ∝ 1/a is a zeroth-order prediction from AMD theory

  Quality (1 free parameter = C):
""")

# Final table with best C
C_final = best_C
print(f"  {'Planet':>10} | {'i_mean obs':>10} | {'i_mean pred':>11} | {'Δ%':>8} | {'|Δ|(°)':>8}")
print("  " + "─" * 55)
total_sq = 0
for p in PLANET_NAMES:
    i_pred_rad = (h(ECC[p]) / C_final)**4 / SMA[p]
    i_pred_deg = math.degrees(i_pred_rad)
    delta_pct = (i_pred_deg / I_MEAN_DEG[p] - 1) * 100
    delta_deg = abs(i_pred_deg - I_MEAN_DEG[p])
    total_sq += delta_pct**2
    print(f"  {p:>10} | {I_MEAN_DEG[p]:>10.4f}° | {i_pred_deg:>10.4f}° | {delta_pct:>+7.1f}% | {delta_deg:>8.4f}°")

rms = math.sqrt(total_sq / 8)
print(f"\n  RMS error: {rms:.1f}%  (1 free parameter)")

print(f"\n" + "=" * 100)
print("DONE")
print("=" * 100)
