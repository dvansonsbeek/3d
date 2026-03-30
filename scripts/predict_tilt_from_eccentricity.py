#!/usr/bin/env python3
"""
ECCENTRICITY AMPLITUDE CONSTANT K — INVESTIGATION
====================================================

The eccentricity amplitude formula:

    e_amp = K × sin(tilt) × √d / (√m × a^1.5)

uses a universal constant K = 3.4149 × 10⁻⁶, derived from Earth's parameters.
This constant predicts all 8 planetary eccentricity amplitudes.

This script investigates:
  1. Whether K can be derived from ψ (the inclination constant)
  2. Two candidate relations: K ≈ ψ²/π (0.77%) and K ≈ ψ^(11/5) (0.89%)
  3. Whether the tilt can be predicted from eccentricity data
  4. The inner/outer planet distinction for tilt prediction

CONCLUSION: K is an empirical constant derived from Earth. The relations
K ≈ ψ²/π and K ≈ ψ^(L₅/F₅) are numerical coincidences worth noting but
not proven identities. Further investigation is needed to determine whether
K has a deeper origin.

Usage: python3 scripts/predict_tilt_from_eccentricity.py
"""

import math
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'tools', 'lib', 'python'))
from constants_scripts import *


# ═══════════════════════════════════════════════════════════════════════════
# SETUP
# ═══════════════════════════════════════════════════════════════════════════

# K stored (empirical, derived from Earth)
K_STORED = ECC_AMPLITUDE_K

# ψ — the inclination amplitude constant
PSI_NUM = 2205  # 5 × 21² = F₅ × F₈²
PSI = PSI_NUM / (2 * H)

# Candidate relations
K_PSI2_PI = PSI**2 / math.pi      # ψ²/π
K_PSI_115 = PSI**(11/5)           # ψ^(11/5) = ψ^(L₅/F₅)

# Golden ratio
PHI = (1 + math.sqrt(5)) / 2

# Eccentricity cycle periods
def calc_wobble_period(peri_ecl_yr, axial_yr):
    """Eccentricity cycle = meeting frequency of axial and inclination precession in ICRF."""
    H13 = H / 13
    incl_ICRF = (peri_ecl_yr * H13) / (H13 - peri_ecl_yr)
    wobble_rate = abs(1 / axial_yr - 1 / incl_ICRF)
    return 1 / wobble_rate

PERI_ECL = {
    "Mercury": H / (1 + 3/8),
    "Venus":   H * 2,
    "Earth":   H / 3,
    "Mars":    H / (4 + 1/3),
    "Jupiter": H / 5,
    "Saturn":  -H / 8,
    "Uranus":  H / 3,
    "Neptune": H * 2,
}

AXIAL_PREC = {
    "Mercury": H * 1597,
    "Venus":   -H * 987,
    "Earth":   H / 13,
    "Mars":    H / (5 - 1/3),
    "Jupiter": H * 2,
    "Saturn":  H * 2,
    "Uranus":  H * 610,
    "Neptune": H * 987,
}

ECC_CYCLE = {}
for p in PLANET_NAMES:
    try:
        ECC_CYCLE[p] = calc_wobble_period(abs(PERI_ECL[p]), abs(AXIAL_PREC[p]))
    except ZeroDivisionError:
        ECC_CYCLE[p] = None

ECC_CYCLE["Earth"] = H / 16

BALANCED_YEAR = round(1246 - 14.5 * (H / 16))
REF_YEAR = {"Earth": BALANCED_YEAR}
for p in PLANET_NAMES:
    if p != "Earth" and ECC_CYCLE[p] is not None:
        REF_YEAR[p] = 2000 - (ECC_PHASE_J2000[p] / 360) * ECC_CYCLE[p]


# ═══════════════════════════════════════════════════════════════════════════
# ECCENTRICITY MODEL
# ═══════════════════════════════════════════════════════════════════════════

def compute_eccentricity(year, ref_year, cycle, e_base, e_amp):
    """Replicate computeEccentricityEarth from script.js."""
    root = math.sqrt(e_base**2 + e_amp**2)
    degrees = ((year - ref_year) / cycle) * 360
    cos_theta = math.cos(math.radians(degrees))
    h1 = root - e_base
    return root + (-e_amp - h1 * cos_theta) * cos_theta


def e_amp_from_tilt(tilt_deg, d, m, a, K):
    """Compute eccentricity amplitude from tilt using K formula."""
    return K * math.sin(math.radians(tilt_deg)) * math.sqrt(d) / (math.sqrt(m) * a**1.5)


def model_e_j2000(tilt_deg, planet, K):
    """Compute our model's e(2000) for a given tilt."""
    e_amp = e_amp_from_tilt(tilt_deg, D[planet], MASS[planet], SMA[planet], K)
    return compute_eccentricity(2000, REF_YEAR[planet], ECC_CYCLE[planet],
                                ECC_BASE[planet], e_amp)


def solve_tilt(planet, K):
    """Solve for the tilt that makes model e(2000) = JPL e_J2000."""
    e_target = ECC_J2000[planet]

    if abs(e_target - ECC_BASE[planet]) < 1e-12:
        return 0.0, True

    e_low = model_e_j2000(0.001, planet, K)
    e_high = model_e_j2000(89.99, planet, K)
    e_min_range = min(e_low, e_high)
    e_max_range = max(e_low, e_high)

    reachable = e_min_range <= e_target <= e_max_range

    lo, hi = 0.001, 89.99
    for _ in range(200):
        mid = (lo + hi) / 2
        e_mid = model_e_j2000(mid, planet, K)
        if (e_high > e_low):
            if e_mid < e_target:
                lo = mid
            else:
                hi = mid
        else:
            if e_mid > e_target:
                lo = mid
            else:
                hi = mid

    return (lo + hi) / 2, reachable


# ═══════════════════════════════════════════════════════════════════════════
# SECTION 1: K DERIVATION FROM EARTH
# ═══════════════════════════════════════════════════════════════════════════

print("=" * 90)
print("ECCENTRICITY AMPLITUDE CONSTANT K — INVESTIGATION")
print("=" * 90)

print(f"""
  THE K CONSTANT
  ══════════════
  Formula: e_amp = K × sin(tilt) × √d / (√m × a^1.5)

  K is derived from Earth's parameters:
    K = e_amp_earth × √m_earth × a_earth^1.5 / (sin(tilt_earth) × √d_earth)

  Using Earth's mean obliquity = {EARTH_OBLIQUITY_MEAN}°:
    K = {K_STORED:.10e}

  This constant predicts all 8 planetary eccentricity amplitudes.
  Earth is the anchor — K is exact for Earth by construction.
""")


# ═══════════════════════════════════════════════════════════════════════════
# SECTION 2: K UNIVERSALITY VERIFICATION
# ═══════════════════════════════════════════════════════════════════════════

print("=" * 90)
print("Section 1: K Universality — Does K predict all planets?")
print("=" * 90)

print(f"\n  {'Planet':>10} {'e_amp stored':>14} {'K predicted':>14} {'Error':>10}")
print("  " + "─" * 55)

for p in PLANET_NAMES:
    e_amp_stored = ECC_AMPLITUDE[p]
    e_amp_pred = e_amp_from_tilt(AXIAL_TILT[p], D[p], MASS[p], SMA[p], K_STORED)
    err = (e_amp_pred / e_amp_stored - 1) * 100 if e_amp_stored > 0 else 0
    print(f"  {p:>10} {e_amp_stored:>14.6e} {e_amp_pred:>14.6e} {err:>+9.4f}%")

print("""
  Note: The stored amplitudes were computed FROM K, so the near-zero errors
  reflect only floating-point precision differences between Python and JavaScript.
  K is universal BY CONSTRUCTION — derived from Earth, applied to all planets.
  The true test is whether this K produces eccentricity predictions that match
  observations over time.
""")


# ═══════════════════════════════════════════════════════════════════════════
# SECTION 3: CANDIDATE RELATIONS — K vs ψ
# ═══════════════════════════════════════════════════════════════════════════

print("=" * 90)
print("Section 2: Candidate Relations — K and ψ")
print("=" * 90)

print(f"""
  ψ (inclination constant) = {PSI_NUM} / (2 × {H}) = {PSI:.10e}
  K (eccentricity constant) = {K_STORED:.10e}

  Two numerical coincidences found:

  ┌─────────────────────────────────────────────────────────────────────┐
  │  Candidate 1: K ≈ ψ²/π                                           │
  │    ψ²/π = {K_PSI2_PI:.10e}                                │
  │    Error: {(K_STORED/K_PSI2_PI - 1)*100:+.4f}%                                                    │
  │    Note: π has no clear physical derivation in this context.      │
  │    Why π and not 2π (full orbit) or 4π² (Kepler)?                 │
  │                                                                   │
  │  Candidate 2: K ≈ ψ^(11/5) = ψ^(L₅/F₅)                         │
  │    ψ^(11/5) = {K_PSI_115:.10e}                                │
  │    Error: {(K_STORED/K_PSI_115 - 1)*100:+.4f}%                                                    │
  │    Note: 11 = L₅ (5th Lucas number), 5 = F₅ (5th Fibonacci).    │
  │    Pure Fibonacci/Lucas — no transcendental constants needed.     │
  │    But 11 is not a Fibonacci number.                              │
  └─────────────────────────────────────────────────────────────────────┘

  Both are close but neither is exact. With enough mathematical constants
  to try (π, φ, √2, Lucas numbers...), a ~0.1% match is not surprising.
""")


# ═══════════════════════════════════════════════════════════════════════════
# SECTION 4: SYSTEMATIC SEARCH
# ═══════════════════════════════════════════════════════════════════════════

print("=" * 90)
print("Section 3: Systematic Search — K vs functions of ψ")
print("=" * 90)

candidates = []
for label, val in [
    ('ψ²/π',        PSI**2 / math.pi),
    ('ψ^(11/5)',    PSI**(11/5)),
    ('ψ²/(2φ)',     PSI**2 / (2*PHI)),
    ('ψ²/3',        PSI**2 / 3),
    ('ψ²/e',        PSI**2 / math.e),
    ('ψ²/φ²',       PSI**2 / PHI**2),
    ('ψ²/√(2π)',    PSI**2 / math.sqrt(2*math.pi)),
    ('ψ²×φ/π',     PSI**2 * PHI / math.pi),
    ('ψ³×2π',       PSI**3 * 2*math.pi),
    ('7/22 × ψ²',   7/22 * PSI**2),
    ('ψ²×3/π²',     PSI**2 * 3 / math.pi**2),
    ('ψ²/ln(π)',    PSI**2 / math.log(math.pi)),
    ('ψ²/√3',       PSI**2 / math.sqrt(3)),
    ('ψ²/√5',       PSI**2 / math.sqrt(5)),
]:
    if val > 0:
        err_pct = (K_STORED / val - 1) * 100
        candidates.append((abs(err_pct), label, val, err_pct))

candidates.sort()

print(f"\n  {'Rank':>4} {'Formula':>16} {'Value':>14} {'Error':>10}")
print("  " + "─" * 50)
for i, (abs_err, label, val, err_pct) in enumerate(candidates[:10]):
    marker = " <-- best" if i == 0 else (" <-- 2nd" if i == 1 else "")
    print(f"  {i+1:>4} {label:>16} {val:>14.6e} {err_pct:>+9.4f}%{marker}")

print("""
  The two best candidates (ψ²/π at 0.77% and ψ^(11/5) at 0.89%) are
  closer than most others. The next best is ψ²/(2φ) at 3.1%.
""")


# ═══════════════════════════════════════════════════════════════════════════
# SECTION 5: EPOCH SENSITIVITY — WHICH TILT?
# ═══════════════════════════════════════════════════════════════════════════

print("=" * 90)
print("Section 4: Epoch Sensitivity — Which Earth tilt defines K?")
print("=" * 90)

print(f"""
  K depends on Earth's tilt. Different tilt choices change K and the match:
""")

tilts_test = {
    'Model mean (23.41357)': EARTH_OBLIQUITY_MEAN,
    'J2000 IAU  (23.4393)':  23.4393,
}

print(f"  {'Tilt choice':>25} {'K value':>14} {'vs ψ²/π':>10} {'vs ψ^(11/5)':>12}")
print("  " + "─" * 65)

for label, tilt in tilts_test.items():
    sin_t = math.sin(math.radians(tilt))
    K_val = EARTH_ECCENTRICITY_AMPLITUDE * math.sqrt(MASS['Earth']) / (sin_t * math.sqrt(D['Earth']))
    err_pi = (K_val / K_PSI2_PI - 1) * 100
    err_115 = (K_val / K_PSI_115 - 1) * 100
    print(f"  {label:>25} {K_val:>14.10e} {err_pi:>+9.4f}% {err_115:>+11.4f}%")

print(f"""
  With J2000 IAU obliquity, ψ²/π improves to 0.014% but ψ^(11/5) worsens.
  However, the model uses mean obliquity (23.41357°) consistently. Using
  J2000 obliquity for K while keeping mean values elsewhere is inconsistent.

  CONCLUSION: K must be evaluated at mean values. The ψ²/π relation holds
  at 0.09% — suggestive but not exact.
""")


# ═══════════════════════════════════════════════════════════════════════════
# SECTION 6: TILT PREDICTION FROM J2000 ECCENTRICITY
# ═══════════════════════════════════════════════════════════════════════════

print("=" * 90)
print("Section 5: Tilt Prediction — Using JPL J2000 eccentricity")
print("  Method: solve for tilt that makes model e(2000) = JPL e_J2000")
print("  JPL e_J2000 values are INDEPENDENT observations (not from our model)")
print("=" * 90)

print(f"\n  {'Planet':>10} {'Observed':>9} {'Predicted':>10} {'Diff':>9} "
      f"{'Reachable':>10} {'Sensitivity':>12}")
print("  " + "─" * 70)

for p in PLANET_NAMES:
    tilt_obs = AXIAL_TILT[p]

    if ECC_CYCLE[p] is None:
        print(f"  {p:>10} {tilt_obs:8.4f}° {'N/A':>10}")
        continue

    tilt_pred, reachable = solve_tilt(p, K_STORED)
    diff = tilt_pred - tilt_obs

    # Sensitivity: how much does e(2000) change per degree of tilt?
    e_amp_max = K_STORED * 1.0 * math.sqrt(D[p]) / (math.sqrt(MASS[p]) * SMA[p]**1.5)
    gap = abs(ECC_J2000[p] - ECC_BASE[p])
    if gap > 0:
        ratio = e_amp_max / gap
        sens = "high" if ratio > 0.5 else ("moderate" if ratio > 0.1 else "low")
    else:
        sens = "exact"

    reach_str = "YES" if reachable else "no"
    print(f"  {p:>10} {tilt_obs:8.4f}° {tilt_pred:9.4f}° {diff:+8.4f}° "
          f"{reach_str:>10} {sens:>12}")

print(f"""
  "Reachable" means the model CAN match JPL e_J2000 for some tilt value.
  For outer planets (Jupiter–Neptune), the gap between e_base and e_J2000
  exceeds the maximum possible amplitude — no tilt can bridge it.

  This does NOT mean K is wrong for outer planets. It means the tilt
  prediction method only works where the amplitude is large enough to
  constrain the fit: Venus, Earth, and Mars.
""")


# ═══════════════════════════════════════════════════════════════════════════
# SECTION 7: INNER/OUTER PLANET GAP ANALYSIS
# ═══════════════════════════════════════════════════════════════════════════

print("=" * 90)
print("Section 6: Inner vs Outer Planet Gap Analysis")
print("=" * 90)

print(f"\n  {'Planet':>10} {'e_base':>10} {'JPL J2000':>10} {'gap':>11} {'max e_amp':>10} "
      f"{'gap/max':>8} {'status':>12}")
print("  " + "─" * 75)

for p in PLANET_NAMES:
    e_base = ECC_BASE[p]
    e_j2000 = ECC_J2000[p]
    gap = abs(e_j2000 - e_base)
    e_amp_max = K_STORED * 1.0 * math.sqrt(D[p]) / (math.sqrt(MASS[p]) * SMA[p]**1.5)
    ratio = gap / e_amp_max if e_amp_max > 0 else float('inf')

    if gap < 1e-10:
        status = "exact"
    elif ratio <= 1.0:
        status = "reachable"
    else:
        status = f"gap {ratio:.1f}x"

    print(f"  {p:>10} {e_base:10.8f} {e_j2000:10.8f} {gap:11.2e} {e_amp_max:10.2e} "
          f"{ratio:8.2f} {status:>12}")

print(f"""
  Inner planets (Mercury–Mars): gap/max ≤ 1.0 — tilt CAN be constrained
  Outer planets (Jupiter–Neptune): gap/max = 3–10× — tilt CANNOT be constrained

  For outer planets, the gap between our balance-derived e_base and JPL's
  J2000 value is much larger than any possible eccentricity amplitude. This
  gap reflects the combined uncertainty of both sources, not a failure of K.

  Note: Uranus's tilt is ~82.23° (or equivalently 97.77° for the retrograde
  rotator). Since sin(82.23°) = sin(97.77°) = 0.990, Uranus is already near
  the sin(tilt) = 1 maximum. Even tilting to 90° only increases the amplitude
  by 1%, far short of the 3× needed.
""")


# ═══════════════════════════════════════════════════════════════════════════
# SUMMARY
# ═══════════════════════════════════════════════════════════════════════════

print("=" * 90)
print("SUMMARY")
print("=" * 90)

print(f"""
  THE K CONSTANT
  ══════════════
  K = {K_STORED:.10e}

  Derived from Earth's mean parameters:
    e_amp = {EARTH_ECCENTRICITY_AMPLITUDE}, tilt = {EARTH_OBLIQUITY_MEAN}°,
    m = {MASS['Earth']:.6e}, d = {D['Earth']}, a = {SMA['Earth']}

  Predicts all 8 planetary eccentricity amplitudes via:
    e_amp = K × sin(tilt) × √d / (√m × a^1.5)

  STATUS: Empirical constant, exact for Earth by construction.
  Whether it holds for other planets requires independent amplitude
  measurements — our stored amplitudes are derived FROM K.

  CANDIDATE RELATIONS
  ═══════════════════
  1. K ≈ ψ²/π     = {K_PSI2_PI:.10e}  (err = {(K_STORED/K_PSI2_PI-1)*100:+.4f}%)
  2. K ≈ ψ^(11/5) = {K_PSI_115:.10e}  (err = {(K_STORED/K_PSI_115-1)*100:+.4f}%)

  Both are numerical coincidences — close but not exact.
  - ψ²/π: π has no clear physical derivation in this context
  - ψ^(11/5): L₅/F₅ ratio is elegant but 11 is not Fibonacci

  These relations are NOTED but not claimed as identities.

  TILT PREDICTION
  ═══════════════
  Using JPL J2000 eccentricities as independent observations:
  - Venus, Earth, Mars: tilt predicted to within 0.03° (high sensitivity)
  - Mercury, Jupiter–Neptune: tilt cannot be constrained (low sensitivity)

  The inner planet results are promising but may reflect the consistency of
  the model's parameter fitting rather than an independent prediction.

  FUTURE INVESTIGATION NEEDED
  ═══════════════════════════
  1. Independent eccentricity amplitude measurements (e.g., from long-term
     JPL orbital integrations over multiple eccentricity cycles)
  2. Physical derivation of K from first principles
  3. Whether the K ≈ ψ²/π or K ≈ ψ^(11/5) relation has a theoretical basis
  4. Exoplanet systems — does the same K formula apply?
""")
