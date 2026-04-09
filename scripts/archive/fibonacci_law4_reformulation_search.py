#!/usr/bin/env python3
"""
LAW 4 SEARCH — REFORMULATION (R² pair variants)
=================================================

Note: This search concluded that no R-definition produces pair constraints
significantly tighter than random. Law 4 is now the K amplitude constant:
e_amp = K × sin(tilt) × √d / (√m × a^1.5).

This script tested whether the R²-pair Fibonacci ratios (R = e_base / i_mean_rad)
could be reformulated with alternative R-definitions after phase angles shifted.

This script tries SEVEN angles the archive search did not cover:

  1. Universal constant search WITH i_mean added to the parameter pool
  2. Per-mirror-pair searches (not a single universal formula)
  3. AMD-partition reformulation: f_e = 1−√(1−e²), f_i = 1−cos(i_mean)
  4. Pure-eccentricity Fibonacci ratios (no inclination at all): e_outer/e_inner
  5. (Earth/Saturn structural anchor — qualitative, see comments)
  6. (Proper Kepler-system null model — too heavy, deferred)
  7. Eccentricity amplitude / inclination amplitude: R' = e_amp / i_amp_rad

For every reformulation we report:
  - The 4 mirror-pair quantities
  - The closest Fibonacci/Lucas ratio per pair AND its error
  - A null-significance score: what fraction of the time would a random
    target in the same range find a Fibonacci candidate this tight?
  - Whether all 4 pairs simultaneously beat the median-random threshold

A reformulation is interesting iff ALL 4 pairs land tighter than the median
of random targets — anything else is statistical noise from the dense
Fibonacci/Lucas combination space.

Usage: python3 scripts/fibonacci_law4_reformulation_search.py
"""

import math
import random
import sys
import os
from itertools import combinations_with_replacement, product as iter_product

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)),
                                 '..', 'tools', 'lib', 'python'))
from constants_scripts import (
    PLANET_NAMES, ECC_BASE, ECC_J2000, ECC_AMPLITUDE, INCL_MEAN, INCL_AMP, INCL_J2000,
    MASS, SMA, ORBITAL_PERIOD, INCL_PERIOD, D, GROUP_203,
)
ECC_AMP = ECC_AMPLITUDE

random.seed(42)

# ─── Mirror pairs (the structural pairing the model uses) ───
PAIRS = [
    ("Mercury", "Uranus"),
    ("Venus",   "Neptune"),
    ("Earth",   "Saturn"),
    ("Mars",    "Jupiter"),
]


# ═══════════════════════════════════════════════════════════════════════════
# FIBONACCI/LUCAS CANDIDATE SPACE  (must match the previous null test)
# ═══════════════════════════════════════════════════════════════════════════

FIB = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987, 1597]
LUC = [2, 1, 3, 4, 7, 11, 18, 29, 47, 76, 123, 199, 322, 521, 843, 1364]

def build_candidates(max_val=200):
    s = set()
    for a in FIB:
        for b in FIB:
            if b: s.add(a / b)
    for a in LUC:
        for b in LUC:
            if b: s.add(a / b)
    for a in FIB:
        for b in LUC:
            if b: s.add(a / b)
    for a in LUC:
        for b in FIB:
            if b: s.add(a / b)
    for a in FIB[:12]:
        for b in FIB[:12]:
            for d in [1, 2, 3, 4, 5]:
                s.add((a + b) / d)
                s.add((a * b) / d)
    for a in LUC[:10]:
        for b in LUC[:10]:
            for d in [1, 2, 3, 4, 5]:
                s.add((a + b) / d)
    return sorted(v for v in s if 1e-3 < v < max_val)

CANDIDATES = build_candidates(200)


def closest_candidate(target):
    """Return (value, error_pct) of the closest Fibonacci/Lucas candidate."""
    best_v = min(CANDIDATES, key=lambda v: abs(v - target))
    err_pct = (best_v / target - 1) * 100
    return best_v, err_pct


# ═══════════════════════════════════════════════════════════════════════════
# NULL SIGNIFICANCE: how good would a random target near `value` be?
# ═══════════════════════════════════════════════════════════════════════════
#
# A reformulation is "interesting" if its actual error is in the bottom
# X% of random-target errors at the same scale. We compute X per pair.

def null_percentile(target, n=2000):
    """Fraction of random targets near this scale that have a CLOSER
    candidate than the actual one. Lower = more interesting.

    Returns the percentile rank of the actual error: 0% = best possible
    (no random target was closer), 100% = worst (every random target
    found a closer candidate).
    """
    log_min = math.log(target * 0.5)
    log_max = math.log(target * 2.0)
    actual_err = abs(closest_candidate(target)[1])
    better = 0
    for _ in range(n):
        rand_target = math.exp(random.uniform(log_min, log_max))
        rand_err = abs(closest_candidate(rand_target)[1])
        if rand_err < actual_err:
            better += 1
    return better / n * 100  # 0..100, lower is better


# ═══════════════════════════════════════════════════════════════════════════
# REFORMULATIONS — each builds a per-planet R-like quantity
# ═══════════════════════════════════════════════════════════════════════════

def to_rad(deg): return math.radians(deg)

REFORMULATIONS = {
    # The original Law 4 form (for comparison)
    "R = e_base / i_mean_rad      (current Law 4)":
        lambda p: ECC_BASE[p] / to_rad(INCL_MEAN[p]),

    # Angle 7: pure amplitudes
    "R = e_amp / i_amp_rad        (amplitudes)":
        lambda p: ECC_AMP[p] / to_rad(INCL_AMP[p]),

    # Angle 3: AMD partition components
    # f_e ≈ e²/2 for small e, f_i ≈ i²/2; ratio is ~ (e/i)² so this is similar
    # to R² but uses the proper relativistic form.
    "R = (1−√(1−e²)) / (1−cos i_mean)   (AMD partition)":
        lambda p: (1 - math.sqrt(1 - ECC_BASE[p]**2)) /
                  (1 - math.cos(to_rad(INCL_MEAN[p]))),

    # Variants
    "R = e_base / sin(i_mean)      (sin instead of rad)":
        lambda p: ECC_BASE[p] / math.sin(to_rad(INCL_MEAN[p])),

    "R = e_base² / (i_mean_rad)²   (squared from the start)":
        lambda p: (ECC_BASE[p] ** 2) / (to_rad(INCL_MEAN[p]) ** 2),

    "R = e_J2000 / i_J2000_rad     (J2000 observed)":
        lambda p: ECC_J2000[p] / to_rad(INCL_J2000[p]),

    "R = e_base × √m / i_mean_rad  (mass-weighted)":
        lambda p: ECC_BASE[p] * math.sqrt(MASS[p]) / to_rad(INCL_MEAN[p]),
}


# ═══════════════════════════════════════════════════════════════════════════
# PAIR FORMS — different ways the 4 pair quantities could relate
# ═══════════════════════════════════════════════════════════════════════════

def pair_forms(R_val):
    """Yield (form_label, value, label) for the 4 pairs under given R values."""
    out = {}
    for inner, outer in PAIRS:
        Ri, Ro = R_val[inner], R_val[outer]
        out[(inner, outer, "R²_o/R²_i")] = (Ro * Ro) / (Ri * Ri)
        out[(inner, outer, "R_o/R_i")]   = Ro / Ri
        out[(inner, outer, "R²_i+R²_o")] = Ri * Ri + Ro * Ro
        out[(inner, outer, "R_i+R_o")]   = Ri + Ro
        out[(inner, outer, "R_i*R_o")]   = Ri * Ro
        out[(inner, outer, "R_i²+R_o²/R_i*R_o")] = (Ri*Ri + Ro*Ro) / (Ri*Ro) if Ri*Ro else 0
    return out


# ═══════════════════════════════════════════════════════════════════════════
# REPORT
# ═══════════════════════════════════════════════════════════════════════════

print("=" * 84)
print("LAW 4 REFORMULATION SEARCH — comprehensive sweep with null-significance")
print("=" * 84)
print()
print("For each reformulation, we compute 6 candidate pair forms and find the")
print("Fibonacci/Lucas ratio closest to each. The 'null %' column shows the")
print("percentile rank of the actual error against 2000 random targets at the")
print("same scale: 0% = best possible, 50% = median noise, ≥50% = worse than")
print("noise. A reformulation is INTERESTING only if all 4 pairs have null %")
print("≪ 50% on the same form.")
print()


def pair_label(inner, outer, form):
    abbr = {"Mercury":"Me","Venus":"Ve","Earth":"Ea","Mars":"Ma",
            "Jupiter":"Ju","Saturn":"Sa","Uranus":"Ur","Neptune":"Ne"}
    return form.replace("_o", f"_{abbr[outer]}").replace("_i", f"_{abbr[inner]}")


for refname, refunc in REFORMULATIONS.items():
    print("─" * 84)
    print(f"  {refname}")
    print("─" * 84)
    R_val = {p: refunc(p) for p in PLANET_NAMES}
    print(f"  Per-planet R: " +
          "  ".join(f"{p[:2]}={R_val[p]:.3f}" for p in PLANET_NAMES))
    print()

    # Try each pair form across all 4 pairs
    forms = ["R²_o/R²_i", "R_o/R_i", "R²_i+R²_o", "R_i+R_o", "R_i*R_o"]
    print(f"  {'Form':<14} | " +
          " | ".join(f"{i+'/'+o[:3]:<11}" for i,o in PAIRS) +
          f" | sum null%")
    print(f"  {'':<14} | " +
          " | ".join(f"{'val (lab,err%,n%)':<11}" for _ in PAIRS) +
          " |")
    print("  " + "─" * 80)

    best_form = None
    best_sum_null = float('inf')

    for form in forms:
        cells = []
        sum_null = 0
        max_null = 0
        all_below_25 = True
        for inner, outer in PAIRS:
            Ri, Ro = R_val[inner], R_val[outer]
            if form == "R²_o/R²_i":
                v = (Ro*Ro)/(Ri*Ri) if Ri else 0
            elif form == "R_o/R_i":
                v = Ro/Ri if Ri else 0
            elif form == "R²_i+R²_o":
                v = Ri*Ri + Ro*Ro
            elif form == "R_i+R_o":
                v = Ri + Ro
            elif form == "R_i*R_o":
                v = Ri*Ro
            cand_v, err = closest_candidate(v)
            null_pct = null_percentile(v, n=500)
            sum_null += null_pct
            max_null = max(max_null, null_pct)
            if null_pct >= 25:
                all_below_25 = False
            cells.append(f"{v:5.2f}({err:+.1f},{null_pct:.0f})")
        marker = "  ★" if all_below_25 else ""
        print(f"  {form:<14} | " + " | ".join(f"{c:<11}" for c in cells) +
              f" | {sum_null:.0f}{marker}")
        if sum_null < best_sum_null:
            best_sum_null = sum_null
            best_form = form

    print(f"  → best form for this R: {best_form}, sum null = {best_sum_null:.0f}")
    print()


# ═══════════════════════════════════════════════════════════════════════════
# Angle 4: pure eccentricity ratios (no inclination at all)
# ═══════════════════════════════════════════════════════════════════════════

print("=" * 84)
print("Angle 4: Pure eccentricity-ratio constraints (no inclination)")
print("=" * 84)
print()
print("If Law 4 is really an eccentricity statement, the four mirror-pair")
print("ratios e_outer/e_inner (and their squares) should themselves cluster")
print("near Fibonacci/Lucas ratios with high significance.")
print()
print(f"  {'Pair':<18} | {'e_o/e_i':>10} | {'closest':<12} {'err%':>7} {'null%':>7} | {'(e_o/e_i)²':>12} | {'closest':<12} {'err%':>7} {'null%':>7}")
print("  " + "─" * 105)
sum_lin = 0
sum_sq = 0
for inner, outer in PAIRS:
    e_i, e_o = ECC_BASE[inner], ECC_BASE[outer]
    ratio = e_o / e_i
    sq = ratio * ratio
    cv1, err1 = closest_candidate(ratio)
    n1 = null_percentile(ratio, n=500)
    cv2, err2 = closest_candidate(sq)
    n2 = null_percentile(sq, n=500)
    sum_lin += n1
    sum_sq += n2
    # Try to find Fibonacci labels for the closest values
    def fib_label(v):
        for a in FIB:
            for b in FIB:
                if b and abs(a/b - v) < 1e-9: return f"{a}/{b}"
        for a in LUC:
            for b in LUC:
                if b and abs(a/b - v) < 1e-9: return f"{a}/{b}"
        return f"{v:.3f}"
    print(f"  {inner+'/'+outer:<18} | {ratio:>10.4f} | {fib_label(cv1):<12} {err1:>+6.2f}% {n1:>6.0f}% | {sq:>12.4f} | {fib_label(cv2):<12} {err2:>+6.2f}% {n2:>6.0f}%")
print(f"\n  Sum of null %: linear = {sum_lin:.0f},  squared = {sum_sq:.0f}  (lower = more interesting)")
print()


# ═══════════════════════════════════════════════════════════════════════════
# Angle 1: universal constant search WITH i_mean added
# ═══════════════════════════════════════════════════════════════════════════

print("=" * 84)
print("Angle 1: Universal-constant search WITH i_mean (the missing variable)")
print("=" * 84)
print()
print("The archive script searched ξ × ∏ param^exp = const with ~30 parameters")
print("but used i_amplitude, NOT i_mean. With four mean inclinations now changed,")
print("we re-run the search adding i_mean as a parameter.")
print()

# Pick a small set of physically motivated parameters + i_mean
PARAMS = {
    'i_mean':    {p: to_rad(INCL_MEAN[p]) for p in PLANET_NAMES},
    'i_amp':     {p: to_rad(INCL_AMP[p])  for p in PLANET_NAMES},
    'a':         {p: SMA[p]               for p in PLANET_NAMES},
    'mass':      {p: MASS[p]              for p in PLANET_NAMES},
    'd':         {p: float(D[p])          for p in PLANET_NAMES},
    'sqrt_m':    {p: math.sqrt(MASS[p])   for p in PLANET_NAMES},
    'P':         {p: ORBITAL_PERIOD[p]    for p in PLANET_NAMES},
    'AMD':       {p: MASS[p] * math.sqrt(SMA[p]) * (1 - math.sqrt(1 - ECC_BASE[p]**2))
                  for p in PLANET_NAMES},
    'L_orb':     {p: MASS[p] * math.sqrt(SMA[p] * (1 - ECC_BASE[p]**2))
                  for p in PLANET_NAMES},
}

EXPS = [-2, -1, -0.5, 0, 0.5, 1, 2]

def evaluate(param_exps):
    """Compute e_base × ∏ param^exp for each planet, return list of values."""
    out = []
    for p in PLANET_NAMES:
        v = ECC_BASE[p]
        for pname, exp in param_exps:
            v *= PARAMS[pname][p] ** exp
        out.append(v)
    return out


def spread(vals):
    mn, mx = min(vals), max(vals)
    if mn <= 0: return float('inf')
    return mx / mn - 1


def rel_std(vals):
    m = sum(vals) / len(vals)
    if m == 0: return float('inf')
    return math.sqrt(sum((v-m)**2 for v in vals) / len(vals)) / m


# Search up to 3 parameters
best = []
param_names = list(PARAMS.keys())
for n in [1, 2, 3]:
    for params in combinations_with_replacement(param_names, n):
        for exps in iter_product(EXPS, repeat=n):
            if all(e == 0 for e in exps): continue
            param_exp = list(zip(params, exps))
            vals = evaluate(param_exp)
            if min(vals) <= 0: continue
            sp = spread(vals)
            if sp < float('inf'):
                best.append((sp, rel_std(vals), param_exp))

best.sort(key=lambda x: x[0])

print(f"  Top 10 universal-constant fits (e_base × ∏ param^exp = const):")
print(f"  {'Rank':>4} | {'Spread':>9} | {'RelStd':>9} | Formula")
print("  " + "─" * 78)
seen = set()
shown = 0
for sp, rs, pe in best:
    key = tuple(sorted((p, round(e, 3)) for p, e in pe))
    if key in seen: continue
    seen.add(key)
    formula = "e × " + " × ".join(f"{p}^{e:g}" for p, e in pe if e != 0)
    print(f"  {shown+1:>4} | {sp*100:>8.3f}% | {rs*100:>8.3f}% | {formula}")
    shown += 1
    if shown >= 10: break

print()
print("  (Note: spread < 5% would be a very strong universal constant.)")
print("  (For context: a 0% spread means all 8 planets give the same value.)")
print()


# ═══════════════════════════════════════════════════════════════════════════
# Final ranking
# ═══════════════════════════════════════════════════════════════════════════

print("=" * 84)
print("VERDICT")
print("=" * 84)
print("""
A reformulation 'survives' iff:
  - All 4 pairs share the same form
  - All 4 pairs have null% < 25 (significantly tighter than median random)
  - The chosen integers are 'small' (not cherry-picked from the deep sequence)

If no reformulation survives, Law 4 is honestly an observation of clustering
near Fibonacci/Lucas ratios at noise level — not a derivation. The remaining
options are:
  - Demote Law 4 to an observation (Option 1)
  - Drop Law 4 entirely (Option 2)
  - Roll back the phase changes to preserve the old numerology (Option 3)
""")
