#!/usr/bin/env python3
"""
LAW 4 — SEARCH FOR NEW FIBONACCI RATIOS
========================================

After the phase-angle update (Mars 96.95°→231.95°, Mercury 99.52°→234.52°,
Venus 79.82°→259.82°, Neptune 354.04°→174.04°), the mean inclinations changed
and Law 4's R² pair constraints no longer match their old Fibonacci/Lucas
targets. Three of four pairs are now off:

  Mars/Jupiter   : R²_J/R²_M  =  9.67  (old target 144/11 = 13.09, err -26.13%)
  Earth/Saturn   : R_S/R_E    =  5.27  (old target 21/4   =  5.25, err  +0.28%)
  Venus/Neptune  : R²_N/R²_V  = 14.11  (old target 55/4   = 13.75, err  +2.62%)
  Mercury/Uranus : R²_M+R²_U  = 10.24  (old target 55/5   = 11.00, err  -6.94%)

Only Earth/Saturn is intact (because neither planet's phase changed).

This script searches for Fibonacci/Lucas/Lucas-Fibonacci ratios that match
the NEW R² values within ≤ 1.0% accuracy. For each pair we search:

  - Pure Fibonacci/Fibonacci ratios   (F_a / F_b)
  - Pure Lucas/Lucas ratios           (L_a / L_b)
  - Cross ratios                      (F_a / L_b, L_a / F_b)
  - Sums                              (F_a + F_b, L_a + L_b, F_a + L_b)
  - Sum of squares                    (F_a² + F_b², etc.)
  - Half- and double-Fibonacci numbers

The threshold is 1.0% (looser than the old 0.3% — we want to see ALL
candidates, not just the strict winners). For each pair we report the
top 5 candidates ranked by error.

Usage: python3 scripts/fibonacci_law4_search_new_ratios.py
"""

import math
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)),
                                 '..', 'tools', 'lib', 'python'))
from constants_scripts import (
    PLANET_NAMES, ECC_BASE, INCL_MEAN, MASS, SMA, D, GROUP_203,
)


# ═══════════════════════════════════════════════════════════════════════════
# SETUP
# ═══════════════════════════════════════════════════════════════════════════

INCL_MEAN_RAD = {p: math.radians(INCL_MEAN[p]) for p in PLANET_NAMES}
R_VAL = {p: ECC_BASE[p] / INCL_MEAN_RAD[p] for p in PLANET_NAMES}


# Fibonacci & Lucas sequences up to a reasonable size
FIB = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987, 1597]
LUC = [2, 1, 3, 4, 7, 11, 18, 29, 47, 76, 123, 199, 322, 521, 843, 1364]
NAMES_F = {v: f"F{i}" for i, v in enumerate(FIB) if i >= 1}
NAMES_L = {v: f"L{i}" for i, v in enumerate(LUC) if i >= 1}


def candidate_value_label_pairs():
    """Generate (value, label) pairs for ALL candidate Fibonacci/Lucas combos.

    Includes: F_a/F_b, L_a/L_b, F_a/L_b, L_a/F_b, F_a+F_b (whole),
    F_a×F_b (whole), F_a/2, 2×F_b, etc.
    """
    out = []

    # Pure ratios
    for a in FIB:
        for b in FIB:
            if b == 0: continue
            out.append((a / b, f"{a}/{b}"))
    for a in LUC:
        for b in LUC:
            if b == 0: continue
            out.append((a / b, f"{a}/{b}"))
    for a in FIB:
        for b in LUC:
            if b == 0: continue
            out.append((a / b, f"{a}/{b}"))
    for a in LUC:
        for b in FIB:
            if b == 0: continue
            out.append((a / b, f"{a}/{b}"))

    # Half-integers and integers (from sums)
    for a in FIB[:12]:
        for b in FIB[:12]:
            for d in [1, 2, 3, 4, 5]:
                if d == 0: continue
                out.append(((a + b) / d, f"({a}+{b})/{d}"))
                out.append(((a * b) / d, f"({a}×{b})/{d}"))
    for a in LUC[:10]:
        for b in LUC[:10]:
            for d in [1, 2, 3, 4, 5]:
                if d == 0: continue
                out.append(((a + b) / d, f"({a}+{b})/{d}"))

    # Filter out obviously useless (zero, infinity, > 100, < 0.001)
    out = [(v, l) for v, l in out if 1e-3 < v < 200]
    return out


CANDIDATES = candidate_value_label_pairs()


def find_closest(target, top_n=5, max_err_pct=1.0):
    """Return up to top_n closest candidates within max_err_pct of target."""
    scored = []
    for v, l in CANDIDATES:
        err_pct = (v / target - 1) * 100
        if abs(err_pct) <= max_err_pct:
            scored.append((abs(err_pct), v, l, err_pct))
    scored.sort()
    # De-duplicate by value (within 1e-9)
    seen = set()
    unique = []
    for s in scored:
        key = round(s[1], 9)
        if key in seen:
            continue
        seen.add(key)
        unique.append(s)
    return unique[:top_n]


# ═══════════════════════════════════════════════════════════════════════════
# REPORT
# ═══════════════════════════════════════════════════════════════════════════

print("=" * 78)
print("LAW 4 — SEARCH FOR NEW FIBONACCI/LUCAS RATIOS (post phase update)")
print("=" * 78)
print()
print("Current R values (from updated phase angles):")
print(f"  {'Planet':>10}  {'i_mean°':>10}  {'e_base':>10}  {'R = e/i_rad':>12}")
print("  " + "─" * 50)
for p in PLANET_NAMES:
    print(f"  {p:>10}  {INCL_MEAN[p]:10.4f}  {ECC_BASE[p]:10.6f}  {R_VAL[p]:12.4f}")
print()


PAIRS = [
    ("Mars",    "Jupiter", "sq_ratio", "R²_J/R²_M"),
    ("Earth",   "Saturn",  "lin_ratio","R_S/R_E"),
    ("Venus",   "Neptune", "sq_ratio", "R²_N/R²_V"),
    ("Mercury", "Uranus",  "sq_sum",   "R²_M+R²_U"),
]
OLD_TARGETS = {
    ("Mars", "Jupiter"): (144/11,  "144/11   (F₁₂/L₅)"),
    ("Earth", "Saturn"): (21/4,    "21/4     (F₈/L₃)"),
    ("Venus", "Neptune"):(55/4,    "55/4     (F₁₀/L₃)"),
    ("Mercury","Uranus"):(55/5,    "55/5 = 11 (F₁₀/F₅)"),
}


def measure(inner, outer, form):
    Ri, Ro = R_VAL[inner], R_VAL[outer]
    if form == "sq_ratio":
        return (Ro * Ro) / (Ri * Ri)
    if form == "lin_ratio":
        return Ro / Ri
    if form == "sq_sum":
        return Ri * Ri + Ro * Ro
    raise ValueError(form)


for inner, outer, form, label in PAIRS:
    measured = measure(inner, outer, form)
    old_target, old_label = OLD_TARGETS[(inner, outer)]
    old_err = (measured / old_target - 1) * 100
    print("─" * 78)
    print(f"  {inner} / {outer}  ({label})")
    print(f"    Measured value : {measured:10.4f}")
    print(f"    Old target     : {old_target:10.4f}  = {old_label}")
    print(f"    Old error      : {old_err:+8.4f}%")
    print()
    print(f"    TOP 5 candidates within 1.0% of measured value:")
    print(f"    {'rank':>4}  {'value':>10}  {'label':<15}  {'err':>9}")
    print("    " + "─" * 50)
    candidates = find_closest(measured, top_n=5, max_err_pct=1.0)
    if not candidates:
        print("    (no Fibonacci/Lucas candidate within 1.0%)")
    else:
        for i, (abs_err, val, lab, err) in enumerate(candidates, 1):
            mark = ""
            # Mark candidates that are nicer (smaller integers)
            tot_size = sum(int(c) for c in lab.replace('/','+').replace('×','+').replace('(','').replace(')','').split('+') if c.strip().isdigit())
            if tot_size <= 30:
                mark = "  ← small integers"
            print(f"    {i:>4}  {val:10.4f}  {lab:<15}  {err:+8.4f}%{mark}")
    print()

# ═══════════════════════════════════════════════════════════════════════════
# SECTION 2: best simultaneous fit
# ═══════════════════════════════════════════════════════════════════════════

print("=" * 78)
print("SECTION 2: Compact Fibonacci/Lucas summary")
print("=" * 78)
print()
print("If new clean candidates exist for all 4 pairs, we have a viable Law 4")
print("reformulation. Otherwise, the new phase angles cannot be fit to a clean")
print("Fibonacci structure for these specific R definitions, and we need a")
print("different R definition (rejected by archive search) or accept the loss.")
print()
print("  Pair                Old (F/L)         New best fit       Δ from clean")
print("  " + "─" * 75)
for inner, outer, form, label in PAIRS:
    measured = measure(inner, outer, form)
    candidates = find_closest(measured, top_n=1, max_err_pct=1.0)
    old_target, old_label = OLD_TARGETS[(inner, outer)]
    if candidates:
        _, val, lab, err = candidates[0]
        print(f"  {inner+'/'+outer:<18}  {old_label:<17}  {lab:<17}  {err:+6.3f}%")
    else:
        print(f"  {inner+'/'+outer:<18}  {old_label:<17}  (none < 1.0%)      n/a")
print()
