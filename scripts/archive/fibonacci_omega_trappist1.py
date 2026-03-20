#!/usr/bin/env python3
"""
TRAPPIST-1 Argument of Periapsis (ω) — Fibonacci Test
=======================================================

Tests whether the argument of periapsis (ω) for TRAPPIST-1 planets shows
Fibonacci structure analogous to the Solar System pattern.

Data source: Grimm et al. 2018 (A&A 613, A68), via NASA Exoplanet Archive.
The ω values are derived from TTV analysis using ecosω and esinω as free
parameters.

Key finding: Current ω uncertainties (3-34°) are ~1000× larger than the
Solar System precision (0.003°), making the Fibonacci test inconclusive.
"""

import math
import os
import sys

# ═══════════════════════════════════════════════════════════════════════════
# DATA
# ═══════════════════════════════════════════════════════════════════════════

# Grimm et al. 2018 / NASA Exoplanet Archive
# ω values from TTV fitting (ecosω, esinω free parameters)
# Note: these are ω relative to the SKY-PLANE ascending node,
# NOT the invariable-plane ascending node (as in the Solar System analysis).
TRAPPIST1 = {
    "b": {"omega": 336.86, "omega_err": 34.24, "e": 0.00622, "e_err": 0.00304},
    "c": {"omega": 282.45, "omega_err": 17.10, "e": 0.00654, "e_err": 0.00188},
    "d": {"omega": 351.27, "omega_err":  6.17, "e": 0.00837, "e_err": 0.00093},  # -8.73° → 351.27°
    "e": {"omega": 108.37, "omega_err":  8.47, "e": 0.00510, "e_err": 0.00058},
    "f": {"omega":   8.81, "omega_err":  3.11, "e": 0.01007, "e_err": 0.00068},  # 368.81° → 8.81°
    "g": {"omega": 191.34, "omega_err": 13.83, "e": 0.00208, "e_err": 0.00058},
    "h": {"omega": 338.92, "omega_err":  9.66, "e": 0.00567, "e_err": 0.00121},
}

PLANETS = list(TRAPPIST1.keys())

# Solar System comparison (frame-corrected ω₀ from sinusoidal fit)
SOLAR_SYSTEM = {
    "Mercury":  {"omega":  45.012, "omega_err": 0.023},
    "Venus":    {"omega":  73.832, "omega_err": 0.022},
    "Earth":    {"omega": 180.000, "omega_err": 0.000},
    "Mars":     {"omega": -21.213, "omega_err": 0.004},
    "Jupiter":  {"omega":  62.652, "omega_err": 0.003},
    "Saturn":   {"omega": -27.116, "omega_err": 0.003},
    "Uranus":   {"omega":-138.104, "omega_err": 0.003},
    "Neptune":  {"omega":-144.051, "omega_err": 0.032},
}

# Fibonacci numbers for matching
FIBS = [1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377]


def norm360(a):
    """Normalize angle to [0, 360)."""
    return a % 360


def norm180(a):
    """Normalize angle to [-180, 180)."""
    r = a % 360
    return r - 360 if r >= 180 else r


# ═══════════════════════════════════════════════════════════════════════════
# 1. GENERATE FIBONACCI FRACTION TARGETS
# ═══════════════════════════════════════════════════════════════════════════

def generate_fib_targets():
    """Generate all unique Fibonacci fractions of 360° in [0, 360)."""
    targets = set()
    fibs = FIBS[:10]  # up to F₁₃ = 233

    # a/b
    for a in fibs:
        for b in fibs:
            if b > 0 and a != b:
                val = 360.0 * a / b
                if 0 < val < 360:
                    targets.add(round(val, 6))

    # a²/b
    for a in fibs[:8]:
        for b in fibs:
            if b > 0:
                val = 360.0 * a * a / b
                if 0 < val < 360:
                    targets.add(round(val, 6))

    # a/(b×c)
    for a in fibs[:8]:
        for b in fibs[:8]:
            for c in fibs[:8]:
                denom = b * c
                if denom > 0:
                    val = 360.0 * a / denom
                    if 0 < val < 360:
                        targets.add(round(val, 6))

    # (a×b)/c
    for a in fibs[:8]:
        for b in fibs[:8]:
            for c in fibs:
                numer = a * b
                if c > 0:
                    val = 360.0 * numer / c
                    if 0 < val < 360:
                        targets.add(round(val, 6))

    return sorted(targets)


# ═══════════════════════════════════════════════════════════════════════════
# MAIN ANALYSIS
# ═══════════════════════════════════════════════════════════════════════════

print("=" * 80)
print("TRAPPIST-1 ARGUMENT OF PERIAPSIS (ω) — FIBONACCI TEST")
print("=" * 80)

# ───────────────────────────────────────────────────────────────────────────
# 1. DATA OVERVIEW
# ───────────────────────────────────────────────────────────────────────────
print("\n" + "─" * 80)
print("1. DATA OVERVIEW: TRAPPIST-1 ω VALUES (Grimm et al. 2018)")
print("─" * 80)

print(f"""
  Source: Grimm et al. 2018 (A&A 613, A68), via NASA Exoplanet Archive
  Method: Transit timing variation (TTV) fitting with ecosω and esinω
          as free parameters per planet

  IMPORTANT: These ω values are relative to the SKY-PLANE ascending node
  (line of nodes with Earth's line of sight), NOT the invariable-plane
  ascending node used in the Solar System analysis.
""")

print(f"  {'Planet':>6}  {'ω':>10}  {'± σ':>8}  {'e':>10}  {'± σ_e':>10}  {'σ_ω/ω':>8}")
print(f"  {'─'*6}  {'─'*10}  {'─'*8}  {'─'*10}  {'─'*10}  {'─'*8}")

for p in PLANETS:
    d = TRAPPIST1[p]
    frac_err = d["omega_err"] / max(abs(d["omega"]), 1) * 100
    print(f"  {p:>6}  {d['omega']:+10.2f}°  {d['omega_err']:8.2f}°"
          f"  {d['e']:10.5f}  {d['e_err']:10.5f}  {frac_err:7.1f}%")

print(f"""
  Median σ_ω = {sorted(d['omega_err'] for d in TRAPPIST1.values())[3]:.1f}°
  Range: {min(d['omega_err'] for d in TRAPPIST1.values()):.1f}° to {max(d['omega_err'] for d in TRAPPIST1.values()):.1f}°

  Compare Solar System: σ_ω = 0.003° to 0.032° (frame-corrected values)
  TRAPPIST-1 uncertainties are ~100-10,000× larger.
""")

# ───────────────────────────────────────────────────────────────────────────
# 2. FIBONACCI FRACTION MATCHING
# ───────────────────────────────────────────────────────────────────────────
print("\n" + "─" * 80)
print("2. FIBONACCI FRACTION MATCHING")
print("─" * 80)

targets = generate_fib_targets()
print(f"\n  Fibonacci target set: {len(targets)} unique angles in [0°, 360°)")
print(f"  Average spacing: {360.0/len(targets):.2f}°")

print(f"\n  {'Planet':>6}  {'ω':>10}  {'Best Fib':>10}  {'Error':>8}  {'σ_ω':>7}  {'Nsigma':>7}  {'Status':>12}")
print(f"  {'─'*6}  {'─'*10}  {'─'*10}  {'─'*8}  {'─'*7}  {'─'*7}  {'─'*12}")

fib_errors = []
for p in PLANETS:
    d = TRAPPIST1[p]
    w = norm360(d["omega"])
    sigma = d["omega_err"]

    # Find closest Fibonacci target
    best_target = None
    best_dist = 999
    for t in targets:
        dist = min(abs(w - t), 360 - abs(w - t))  # angular distance
        if dist < best_dist:
            best_dist = dist
            best_target = t

    # How many sigma is the offset?
    n_sigma = best_dist / sigma if sigma > 0 else 0
    err_pct = best_dist / best_target * 100 if best_target > 0 else 0
    fib_errors.append(err_pct)

    # Status: is the match meaningful?
    if n_sigma < 0.5:
        status = "within 0.5σ"
    elif n_sigma < 1.0:
        status = "within 1σ"
    elif n_sigma < 2.0:
        status = "within 2σ"
    else:
        status = f"{n_sigma:.1f}σ away"

    print(f"  {p:>6}  {w:10.2f}°  {best_target:10.2f}°  {err_pct:7.2f}%  {sigma:6.1f}°"
          f"  {n_sigma:6.2f}σ  {status:>12}")

rms_err = math.sqrt(sum(e**2 for e in fib_errors) / len(fib_errors))
print(f"\n  RMS Fibonacci match error: {rms_err:.2f}%")

# ───────────────────────────────────────────────────────────────────────────
# 3. DISCRIMINATING POWER ANALYSIS
# ───────────────────────────────────────────────────────────────────────────
print("\n" + "─" * 80)
print("3. DISCRIMINATING POWER: CAN WE DISTINGUISH FIBONACCI FROM RANDOM?")
print("─" * 80)

print(f"""
  The key question: given the uncertainties, would a RANDOM ω value also
  match a Fibonacci fraction well?

  With {len(targets)} Fibonacci targets in 360°, the average spacing is
  {360.0/len(targets):.2f}°. A random angle's expected distance to the
  nearest target is ~{360.0/len(targets)/4:.2f}°.
""")

# For each planet, compute P(random angle matches within observed distance)
import random
random.seed(42)

N_RANDOM = 100_000
print(f"  Monte Carlo: {N_RANDOM:,} random angles per planet")
print(f"\n  {'Planet':>6}  {'σ_ω':>6}  {'Match dist':>10}  {'P(random≤dist)':>15}  {'Verdict':>15}")
print(f"  {'─'*6}  {'─'*6}  {'─'*10}  {'─'*15}  {'─'*15}")

for p in PLANETS:
    d = TRAPPIST1[p]
    w = norm360(d["omega"])
    sigma = d["omega_err"]

    # Distance to nearest Fibonacci target
    best_dist = 999
    for t in targets:
        dist = min(abs(w - t), 360 - abs(w - t))
        best_dist = min(best_dist, dist)

    # How often does a random angle match as well?
    count_better = 0
    for _ in range(N_RANDOM):
        rand_w = random.uniform(0, 360)
        rand_best = 999
        for t in targets:
            rd = min(abs(rand_w - t), 360 - abs(rand_w - t))
            rand_best = min(rand_best, rd)
        if rand_best <= best_dist:
            count_better += 1

    p_random = count_better / N_RANDOM
    verdict = "UNINFORMATIVE" if p_random > 0.10 else "MARGINAL" if p_random > 0.05 else "SUGGESTIVE"

    print(f"  {p:>6}  {sigma:5.1f}°  {best_dist:10.2f}°  {p_random:14.1%}  {verdict:>15}")

# ───────────────────────────────────────────────────────────────────────────
# 4. UNCERTAINTY-BROADENED TEST
# ───────────────────────────────────────────────────────────────────────────
print("\n" + "─" * 80)
print("4. HOW MANY FIBONACCI TARGETS WITHIN 1σ OF EACH ω?")
print("─" * 80)

print(f"""
  If ω ± σ_ω encompasses many Fibonacci targets, the test has no power.
  We count targets within 1σ and 2σ of the measured ω.
""")

print(f"  {'Planet':>6}  {'ω':>10}  {'σ_ω':>6}  {'Within 1σ':>10}  {'Within 2σ':>10}  {'Diagnostic':>20}")
print(f"  {'─'*6}  {'─'*10}  {'─'*6}  {'─'*10}  {'─'*10}  {'─'*20}")

for p in PLANETS:
    d = TRAPPIST1[p]
    w = norm360(d["omega"])
    sigma = d["omega_err"]

    n_1sigma = 0
    n_2sigma = 0
    for t in targets:
        dist = min(abs(w - t), 360 - abs(w - t))
        if dist <= sigma:
            n_1sigma += 1
        if dist <= 2 * sigma:
            n_2sigma += 1

    if n_1sigma > 5:
        diag = "NO POWER"
    elif n_1sigma > 2:
        diag = "LOW POWER"
    elif n_1sigma > 0:
        diag = "MARGINAL"
    else:
        diag = "SOME POWER"

    print(f"  {p:>6}  {w:10.2f}°  {sigma:5.1f}°  {n_1sigma:>10}  {n_2sigma:>10}  {diag:>20}")

# ───────────────────────────────────────────────────────────────────────────
# 5. PAIRWISE ω DIFFERENCES
# ───────────────────────────────────────────────────────────────────────────
print("\n" + "─" * 80)
print("5. PAIRWISE ω DIFFERENCES (may have better precision)")
print("─" * 80)

print(f"""
  For TTV-derived parameters, pairwise differences between adjacent
  planets may have correlated errors that partially cancel, giving
  better effective precision for Δω values.
""")

print(f"  {'Pair':>6}  {'Δω':>10}  {'Best Fib':>10}  {'Error%':>8}")
print(f"  {'─'*6}  {'─'*10}  {'─'*10}  {'─'*8}")

fib_angles_simple = []
for a in FIBS[:10]:
    for b in FIBS[:10]:
        if b > 0 and a != b:
            val = 360.0 * a / b
            if 0 < val < 360:
                fib_angles_simple.append(val)
fib_angles_simple = sorted(set(round(v, 4) for v in fib_angles_simple))

for i in range(len(PLANETS) - 1):
    p1, p2 = PLANETS[i], PLANETS[i + 1]
    w1 = norm360(TRAPPIST1[p1]["omega"])
    w2 = norm360(TRAPPIST1[p2]["omega"])
    dw = norm180(w2 - w1)

    # Find closest Fibonacci angle
    best_t = None
    best_d = 999
    for t in fib_angles_simple:
        for sign in [1, -1]:
            dist = abs(abs(dw) - t)
            if dist < best_d:
                best_d = dist
                best_t = t

    err_pct = best_d / best_t * 100 if best_t > 0 else 999

    print(f"  {p1}-{p2}  {dw:+10.2f}°  {best_t:10.2f}°  {err_pct:7.2f}%")

# ───────────────────────────────────────────────────────────────────────────
# 6. COMPARISON WITH SOLAR SYSTEM
# ───────────────────────────────────────────────────────────────────────────
print("\n" + "─" * 80)
print("6. PRECISION COMPARISON: SOLAR SYSTEM vs TRAPPIST-1")
print("─" * 80)

print(f"""
  The critical difference: precision relative to Fibonacci target spacing.
  Fibonacci targets are spaced ~{360.0/len(targets):.2f}° apart on average.
""")

print(f"  {'System':>15}  {'Median σ_ω':>12}  {'σ/spacing':>12}  {'Power':>15}")
print(f"  {'─'*15}  {'─'*12}  {'─'*12}  {'─'*15}")

ss_median = sorted(d["omega_err"] for d in SOLAR_SYSTEM.values())[3]
t1_median = sorted(d["omega_err"] for d in TRAPPIST1.values())[3]
spacing = 360.0 / len(targets)

print(f"  {'Solar System':>15}  {ss_median:12.3f}°  {ss_median/spacing:12.4f}  {'EXCELLENT':>15}")
print(f"  {'TRAPPIST-1':>15}  {t1_median:12.1f}°  {t1_median/spacing:12.1f}  {'NONE':>15}")

print(f"""
  Solar System: σ/spacing = {ss_median/spacing:.4f} → each ω resolves ONE target
  TRAPPIST-1:   σ/spacing = {t1_median/spacing:.1f} → each ω spans ~{int(2*t1_median/spacing)} targets

  CONCLUSION: TRAPPIST-1 ω uncertainties are too large by a factor of
  ~{int(t1_median/ss_median)} to resolve individual Fibonacci fractions.
""")

# ───────────────────────────────────────────────────────────────────────────
# 7. CONCEPTUAL DIFFERENCES
# ───────────────────────────────────────────────────────────────────────────
print("\n" + "─" * 80)
print("7. CONCEPTUAL DIFFERENCES: SKY-PLANE ω vs INVARIABLE-PLANE ω")
print("─" * 80)

print(f"""
  Even with perfect precision, a direct comparison is complicated:

  SOLAR SYSTEM ω:
    ω = ϖ − Ω_inv
    - ϖ = longitude of perihelion (in ecliptic/ICRF)
    - Ω_inv = ascending node on the INVARIABLE PLANE
    - A constant for each planet (perihelion and node precess at same rate)
    - Physically: angle from invariable-plane node to closest approach

  TRAPPIST-1 ω:
    ω = argument of periastron from TTV fitting
    - Measured from the SKY-PLANE ascending node (line of sight geometry)
    - The sky-plane node direction depends on the OBSERVER (Earth's position)
    - NOT the same as the invariable-plane ω

  To make a fair comparison, we would need:
    1. TRAPPIST-1's invariable plane orientation (requires 3D orbit solutions)
    2. Individual planets' ascending nodes on that plane
    3. Subtract to get ω_inv = ϖ − Ω_inv

  The mutual inclinations of TRAPPIST-1 planets are tiny (<0.5°),
  so the ascending nodes on the invariable plane are VERY poorly defined
  (small angle = uncertain node direction). This is a fundamental limit.
""")

# ───────────────────────────────────────────────────────────────────────────
# 8. WHAT WOULD BE NEEDED FOR A MEANINGFUL TEST
# ───────────────────────────────────────────────────────────────────────────
print("\n" + "─" * 80)
print("8. REQUIREMENTS FOR A MEANINGFUL TRAPPIST-1 ω TEST")
print("─" * 80)

print(f"""
  To achieve Solar-System-level discriminating power (σ/spacing < 0.1):

  Required σ_ω: < {spacing * 0.1:.2f}° (currently {t1_median:.1f}°)
  Improvement needed: ~{int(t1_median / (spacing * 0.1))}×

  This requires:
    1. Eccentricities known to σ_e/e < 5% (currently 10-50%)
    2. Eccentricities themselves large enough (e > 0.01 for good ω constraint)
    3. Long TTV baselines (JWST + ground-based, multi-year)

  Current status by planet:
""")

print(f"  {'Planet':>6}  {'e':>8}  {'σ_e/e':>8}  {'σ_ω':>7}  {'Need':>7}  {'Factor':>8}")
print(f"  {'─'*6}  {'─'*8}  {'─'*8}  {'─'*7}  {'─'*7}  {'─'*8}")

for p in PLANETS:
    d = TRAPPIST1[p]
    frac_e = d["e_err"] / d["e"] * 100
    need = spacing * 0.1
    factor = d["omega_err"] / need

    print(f"  {p:>6}  {d['e']:8.5f}  {frac_e:7.1f}%  {d['omega_err']:6.1f}°"
          f"  {need:6.2f}°  {factor:7.0f}×")

print(f"""
  Planet f has the best prospect (largest e = 0.01, smallest σ_ω = 3.1°),
  but still needs ~{TRAPPIST1['f']['omega_err'] / (spacing * 0.1):.0f}× improvement.

  Planet g is the worst case (smallest e = 0.002, σ_ω = 13.8°).
  For nearly circular orbits, ω is fundamentally ill-defined.

  Realistic timeline: JWST transit timing over 5-10 years may improve
  e and ω precision by factors of 2-5, but not the ~{int(t1_median / (spacing * 0.1))}× needed.
  The TRAPPIST-1 ω test will likely remain inconclusive for the foreseeable
  future.
""")

# ───────────────────────────────────────────────────────────────────────────
# 9. EXPLORATORY: BEST FIBONACCI MATCHES (for reference)
# ───────────────────────────────────────────────────────────────────────────
print("\n" + "─" * 80)
print("9. BEST FIBONACCI MATCHES (exploratory, NOT statistically meaningful)")
print("─" * 80)

print(f"""
  For completeness, the best Fibonacci fraction matches to the measured ω
  values. These matches are NOT statistically meaningful given the
  uncertainties — they are shown only for future reference if precision
  improves.
""")

for p in PLANETS:
    d = TRAPPIST1[p]
    w = norm360(d["omega"])

    candidates = []
    for a in FIBS[:10]:
        for b in FIBS[:10]:
            if b > 0 and a != b:
                val = 360.0 * a / b
                if 0 < val < 360:
                    dist = min(abs(w - val), 360 - abs(w - val))
                    candidates.append((dist, val, f"360°×{a}/{b}"))

    for a in FIBS[:8]:
        for b in FIBS[:10]:
            if b > 0:
                val = 360.0 * a * a / b
                if 0 < val < 360:
                    dist = min(abs(w - val), 360 - abs(w - val))
                    candidates.append((dist, val, f"360°×{a}²/{b}"))

    candidates.sort()
    print(f"\n  {p}: ω = {w:.2f}° ± {d['omega_err']:.1f}°")
    seen = set()
    shown = 0
    for dist, val, expr in candidates:
        vk = round(val, 2)
        if vk in seen:
            continue
        seen.add(vk)
        if shown < 3:
            nsig = dist / d["omega_err"]
            print(f"    {expr:30s} = {val:8.2f}°  (Δ = {dist:5.2f}°, {nsig:.2f}σ)")
            shown += 1

# ═══════════════════════════════════════════════════════════════════════════
# SUMMARY
# ═══════════════════════════════════════════════════════════════════════════
print("\n" + "=" * 80)
print("SUMMARY")
print("=" * 80)

print(f"""
  TRAPPIST-1 ω FIBONACCI TEST: INCONCLUSIVE (data-limited)

  1. DATA QUALITY: ω uncertainties of 3-34° are ~{int(t1_median/ss_median)}× larger than
     Solar System values (0.003-0.032°). Each ω value spans ~{int(2*t1_median/spacing)}
     Fibonacci targets within 1σ.

  2. DISCRIMINATING POWER: Zero. A random angle matches Fibonacci fractions
     as well as the measured values. The test cannot distinguish Fibonacci
     from non-Fibonacci.

  3. CONCEPTUAL MISMATCH: TRAPPIST-1's ω is measured from the sky-plane
     ascending node, not the invariable-plane node. Even with perfect
     precision, a direct comparison with the Solar System pattern requires
     3D orbit solutions and invariable-plane geometry.

  4. NEAR-CIRCULAR ORBITS: With e ≈ 0.002-0.010, the argument of
     periastron is poorly defined (small e → ω barely meaningful).
     This is a fundamental limit, not just a measurement issue.

  5. FUTURE PROSPECTS: JWST transit timing (5-10 year baseline) may
     improve precision by 2-5×, but ~{int(t1_median / (spacing * 0.1))}× improvement is needed.
     The TRAPPIST-1 ω Fibonacci test will likely remain inconclusive.

  6. WHAT COULD WORK: A system with:
     - Eccentric orbits (e > 0.05, like Solar System inner planets)
     - Precise radial velocity measurements (σ_ω < 1°)
     - Known 3D orbital geometry (astrometry or mutual events)
     Such a system does not currently exist among well-characterized
     multi-planet systems.
""")
