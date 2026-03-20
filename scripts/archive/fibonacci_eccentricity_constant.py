#!/usr/bin/env python3
"""
ECCENTRICITY CONSTANT SEARCH
=============================

Search for a universal eccentricity constant analogous to the inclination ψ.

The inclination law gives:  d × i × √m = ψ  (constant for all 8 planets)

Can we find:  ξ × f(T_prec, a, P, ...) = ψ_ecc  (constant)?

where ξ = e × √m is the mass-weighted eccentricity.

The search combines ξ with powers of:
  - T_prec : precession period (H × a_frac/b_frac from Law 1)
  - a      : semi-major axis (AU)
  - P      : orbital period (years)
  - d      : inclination Fibonacci divisor
  - b_frac : period fraction denominator (Fibonacci number)
  - a_frac : period fraction numerator
  - b_over_a: H/T_prec ratio

Parameters are modular — add new ones to PARAMS dict.
Exponents include fractional powers (1/2, 1/3, 2/3, etc.).

Usage:
    python fibonacci_eccentricity_constant.py
"""

import sys
import os
import math
from itertools import combinations_with_replacement

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from fibonacci_data import *

# ═══════════════════════════════════════════════════════════════════════════
# PARAMETER DEFINITIONS (add new parameters here)
# ═══════════════════════════════════════════════════════════════════════════

PARAMS = {
    'T_prec': {
        'desc': 'Precession period (years) = H × a_frac/b_frac',
        'values': {p: float(INCL_PERIOD[p]) for p in PLANET_NAMES},
    },
    'a': {
        'desc': 'Semi-major axis (AU)',
        'values': {p: SMA[p] for p in PLANET_NAMES},
    },
    'P': {
        'desc': 'Orbital period (years)',
        'values': {p: ORBITAL_PERIOD[p] for p in PLANET_NAMES},
    },
    'd': {
        'desc': 'Inclination Fibonacci divisor',
        'values': {p: float(D[p]) for p in PLANET_NAMES},
    },
    'b_frac': {
        'desc': 'Period fraction denominator (Fibonacci number from H/T)',
        'values': {p: float(PERIOD_FRAC[p][1]) for p in PLANET_NAMES},
    },
    'a_frac': {
        'desc': 'Period fraction numerator',
        'values': {p: float(PERIOD_FRAC[p][0]) for p in PLANET_NAMES},
    },
    'b_over_a': {
        'desc': 'H/T_prec ratio = b_frac/a_frac',
        'values': {p: PERIOD_FRAC[p][1] / PERIOD_FRAC[p][0] for p in PLANET_NAMES},
    },
    'x_2H': {
        'desc': '2H / T_prec = precession cycles per 2H (same 2H as in ψ denominator)',
        'values': {p: 2 * H / INCL_PERIOD[p] for p in PLANET_NAMES},
    },
    'i_rad': {
        'desc': 'Inclination amplitude in radians = ψ/(d×√m) × π/180',
        'values': {p: math.radians(INCL_AMP[p]) for p in PLANET_NAMES},
    },
    # ── Physical orbital parameters (no Fibonacci quantum numbers) ──
    'P_over_Tprec': {
        'desc': 'P / T_prec — orbits per precession cycle (dimensionless)',
        'values': {p: ORBITAL_PERIOD[p] / INCL_PERIOD[p] for p in PLANET_NAMES},
    },
    'sqrt_a': {
        'desc': '√a — AMD natural variable',
        'values': {p: math.sqrt(SMA[p]) for p in PLANET_NAMES},
    },
    'n': {
        'desc': 'Mean motion n = 2π/P (rad/yr)',
        'values': {p: 2 * math.pi / ORBITAL_PERIOD[p] for p in PLANET_NAMES},
    },
    'n_Tprec': {
        'desc': 'n × T_prec — orbital radians per precession cycle',
        'values': {p: 2 * math.pi / ORBITAL_PERIOD[p] * INCL_PERIOD[p] for p in PLANET_NAMES},
    },
    'i_J2000': {
        'desc': 'J2000 invariable plane inclination (degrees)',
        'values': {p: INCL_J2000[p] for p in PLANET_NAMES},
    },
    'i_J2000_rad': {
        'desc': 'J2000 invariable plane inclination (radians)',
        'values': {p: math.radians(INCL_J2000[p]) for p in PLANET_NAMES},
    },
    'a_3_2': {
        'desc': 'a^(3/2) — proportional to P (Kepler)',
        'values': {p: SMA[p]**1.5 for p in PLANET_NAMES},
    },
    'Tprec_over_H': {
        'desc': 'T_prec / H — precession period in Holistic units',
        'values': {p: INCL_PERIOD[p] / H for p in PLANET_NAMES},
    },
    # ── NEW: Parameters discovered during investigation ──
    'AMD': {
        'desc': 'Angular Momentum Deficit = m√a × (1-√(1-e²))',
        'values': {p: MASS[p] * math.sqrt(SMA[p]) * (1 - math.sqrt(1 - ECC[p]**2))
                   for p in PLANET_NAMES},
    },
    'f_e': {
        'desc': 'AMD kernel f(e) = 1-√(1-e²) ≈ e²/2',
        'values': {p: 1 - math.sqrt(1 - ECC[p]**2) for p in PLANET_NAMES},
    },
    'h_e': {
        'desc': 'Half-angle identity h(e) = √(1+√(1-e²)) = √2×cos(arcsin(e)/2)',
        'values': {p: math.sqrt(1 + math.sqrt(1 - ECC[p]**2)) for p in PLANET_NAMES},
    },
    'i_amp': {
        'desc': 'Model inclination amplitude (degrees) = ψ/(d×√m)',
        'values': {p: INCL_AMP[p] for p in PLANET_NAMES},
    },
    'i_amp_rad': {
        'desc': 'Model inclination amplitude (radians)',
        'values': {p: math.radians(INCL_AMP[p]) for p in PLANET_NAMES},
    },
    'eta': {
        'desc': 'Mass-weighted inclination η = ψ/d = i_amp × √m',
        'values': {p: PSI / D[p] for p in PLANET_NAMES},
    },
    'mass': {
        'desc': 'Planetary mass in solar masses',
        'values': {p: MASS[p] for p in PLANET_NAMES},
    },
    'e_raw': {
        'desc': 'Raw eccentricity (without √m weighting)',
        'values': {p: ECC[p] for p in PLANET_NAMES},
    },
    'R_law4': {
        'desc': 'Law 4 ratio R = e / i_amp (radians)',
        'values': {p: ECC[p] / math.radians(INCL_AMP[p]) for p in PLANET_NAMES},
    },
    'L_orb': {
        'desc': 'Orbital angular momentum ∝ m × √(a(1-e²))',
        'values': {p: MASS[p] * math.sqrt(SMA[p] * (1 - ECC[p]**2))
                   for p in PLANET_NAMES},
    },
    'Hill': {
        'desc': 'Hill radius = a × (m/3)^(1/3)',
        'values': {p: SMA[p] * (MASS[p] / 3) ** (1/3) for p in PLANET_NAMES},
    },
    # ── Perihelion precession (different timescale from inclination!) ──
    'T_perih': {
        'desc': 'Perihelion precession period (years, secular only)',
        'values': {p: 1296000.0 / {
            'Mercury': 5.38, 'Venus': 7.35, 'Earth': 17.25, 'Mars': 17.77,
            'Jupiter': 4.31, 'Saturn': 28.22, 'Uranus': 3.11, 'Neptune': 0.67,
        }[p] for p in PLANET_NAMES},
    },
    'g_freq': {
        'desc': 'Dominant g-mode eigenfrequency (arcsec/yr, perihelion precession)',
        'values': {p: {
            'Mercury': 4.257, 'Venus': 7.452, 'Earth': 17.368, 'Mars': 17.916,
            'Jupiter': 4.257, 'Saturn': 28.245, 'Uranus': 3.088, 'Neptune': 0.672,
        }[p] for p in PLANET_NAMES},
    },
    's_freq': {
        'desc': 'Dominant s-mode eigenfrequency (arcsec/yr, nodal precession)',
        'values': {p: abs({
            'Mercury': -5.59, 'Venus': -7.05, 'Earth': -18.85, 'Mars': -17.755,
            'Jupiter': -26.34, 'Saturn': -26.34, 'Uranus': -2.99, 'Neptune': -0.692,
        }[p]) for p in PLANET_NAMES},
    },
    'g_over_s': {
        'desc': 'g/s eigenfrequency ratio (ecc/incl timescale ratio)',
        'values': {},  # computed below
    },
    'T_perih_over_H': {
        'desc': 'T_perih / H — perihelion precession in Holistic units',
        'values': {},  # computed below
    },
    'AMD_over_L': {
        'desc': 'AMD / L_orb — deficit fraction of angular momentum',
        'values': {},  # computed below
    },
    'Kozai': {
        'desc': 'Kozai integral √(1-e²)×cos(i_mean) per planet',
        'values': {},  # computed below
    },
    'e_over_i_amp': {
        'desc': 'e / i_amp — eccentricity per unit inclination amplitude',
        'values': {p: ECC[p] / math.radians(INCL_AMP[p]) for p in PLANET_NAMES},
    },
    'Sigma': {
        'desc': 'Total deviation angle Σ = e² + i_amp² (AMD-like, radians)',
        'values': {p: ECC[p]**2 + math.radians(INCL_AMP[p])**2 for p in PLANET_NAMES},
    },
    'xi_sq_plus_eta_sq': {
        'desc': 'ξ² + η² — Pythagorean AMD norm',
        'values': {p: (ECC[p] * math.sqrt(MASS[p]))**2 + (PSI / D[p])**2
                   for p in PLANET_NAMES},
    },
}

# Compute derived parameters that need other params
for p in PLANET_NAMES:
    g = PARAMS['g_freq']['values'][p]
    s = PARAMS['s_freq']['values'][p]
    PARAMS['g_over_s']['values'][p] = g / s if s > 0 else float('inf')
    PARAMS['T_perih_over_H']['values'][p] = PARAMS['T_perih']['values'][p] / H
    amd = PARAMS['AMD']['values'][p]
    L = PARAMS['L_orb']['values'][p]
    PARAMS['AMD_over_L']['values'][p] = amd / L if L > 0 else 0
    i_j2000_rad = math.radians(INCL_J2000[p])
    PARAMS['Kozai']['values'][p] = math.sqrt(1 - ECC[p]**2) * math.cos(i_j2000_rad)

# ═══════════════════════════════════════════════════════════════════════════
# EXPONENT GRID (fractional powers included)
# ═══════════════════════════════════════════════════════════════════════════

EXPONENTS = [-2, -3/2, -1, -2/3, -1/2, -1/3, 0, 1/3, 1/2, 2/3, 1, 3/2, 2]

# For fine-grid refinement
FINE_STEP = 0.05
FINE_RANGE = 0.5


def fmt_exp(e):
    """Format exponent as clean fraction string."""
    fracs = {-2: '-2', -1.5: '-3/2', -1: '-1', -2/3: '-2/3', -0.5: '-1/2',
             -1/3: '-1/3', 0: '0', 1/3: '1/3', 0.5: '1/2', 2/3: '2/3',
             1: '1', 1.5: '3/2', 2: '2'}
    for k, v in fracs.items():
        if abs(e - k) < 0.001:
            return v
    return f'{e:.3f}'


def spread(values):
    """Compute max/min spread (0 = perfect constant)."""
    mn, mx = min(values), max(values)
    if mn <= 0:
        return float('inf')
    return mx / mn - 1


def rel_std(values):
    """Relative standard deviation."""
    mean = sum(values) / len(values)
    if mean == 0:
        return float('inf')
    var = sum((v - mean)**2 for v in values) / len(values)
    return math.sqrt(var) / mean


def compute_xi():
    """Base eccentricity ladder: ξ = e × √m for each planet."""
    return {p: ECC[p] * SQRT_M[p] for p in PLANET_NAMES}

XI_ALL = compute_xi()
XI_V = XI_ALL['Venus']


# ═══════════════════════════════════════════════════════════════════════════
# PRINT PARAMETER TABLE
# ═══════════════════════════════════════════════════════════════════════════

print("=" * 90)
print("ECCENTRICITY CONSTANT SEARCH")
print("=" * 90)

print("\n─── Available parameters ───\n")
for name, info in PARAMS.items():
    print(f"  {name:10s}  {info['desc']}")
    for p in PLANET_NAMES:
        v = info['values'][p]
        print(f"    {p:10s}: {v:>12.4f}")
    print()

print("─── Base eccentricity ladder (ξ/ξ_Venus) ───\n")
for p in PLANET_NAMES:
    print(f"  {p:10s}: ξ = {XI_ALL[p]:.6e}  →  ξ/ξ_V = {XI_ALL[p]/XI_V:>10.4f}")


# ═══════════════════════════════════════════════════════════════════════════
# SEARCH ENGINE
# ═══════════════════════════════════════════════════════════════════════════

def evaluate(param_exp_list):
    """Evaluate ξ × ∏ param_i^exp_i for all planets.
    param_exp_list: list of (param_name, exponent) tuples.
    Returns list of 8 values (or None if complex/invalid).
    """
    result = []
    for p in PLANET_NAMES:
        val = XI_ALL[p]
        for pname, exp in param_exp_list:
            pval = PARAMS[pname]['values'][p]
            if pval < 0 and exp != int(exp):
                return None  # fractional power of negative → complex
            val *= pval ** exp
        if not isinstance(val, (int, float)) or math.isnan(val) or math.isinf(val):
            return None
        result.append(val)
    return result


def search_n_params(n, param_names=None, exponents=None, top_k=20):
    """Search all n-parameter combinations for minimum spread.
    Returns sorted list of (spread, rel_std, param_exp_list, values).
    """
    if param_names is None:
        param_names = list(PARAMS.keys())
    if exponents is None:
        exponents = EXPONENTS

    results = []
    # All n-element combinations of parameters (with repetition allowed)
    for params in combinations_with_replacement(param_names, n):
        # All exponent combinations (skip all-zero)
        for exps in __import__('itertools').product(exponents, repeat=n):
            if all(e == 0 for e in exps):
                continue
            param_exp = list(zip(params, exps))
            vals = evaluate(param_exp)
            if vals is None:
                continue
            if min(vals) > 0:
                sp = spread(vals)
                rs = rel_std(vals)
                results.append((sp, rs, param_exp, vals))

    results.sort(key=lambda x: x[0])
    return results[:top_k]


def refine(param_exp_list, step=FINE_STEP, rng=FINE_RANGE):
    """Fine-grid refinement around a given parameter-exponent combination."""
    param_names = [pe[0] for pe in param_exp_list]
    center_exps = [pe[1] for pe in param_exp_list]
    n = len(param_exp_list)

    fine_exps = []
    for c in center_exps:
        fine_exps.append([c + i * step for i in range(int(-rng/step), int(rng/step) + 1)])

    best_sp = float('inf')
    best_result = None

    for exps in __import__('itertools').product(*fine_exps):
        param_exp = list(zip(param_names, exps))
        vals = evaluate(param_exp)
        if vals is None:
            continue
        if min(vals) > 0:
            sp = spread(vals)
            if sp < best_sp:
                best_sp = sp
                best_result = (sp, rel_std(vals), param_exp, vals)

    return best_result


def print_result(rank, sp, rs, param_exp, vals, show_fib=True):
    """Pretty-print a search result."""
    formula = "ξ × " + " × ".join(f"{pn}^({fmt_exp(e)})" for pn, e in param_exp if e != 0)
    print(f"\n  Rank {rank}: {formula}")
    print(f"  Spread: {sp*100:.4f}%  |  Rel StdDev: {rs*100:.4f}%")
    print(f"  {'Planet':>10}  {'Value':>14}  {'/ mean':>10}", end="")
    if show_fib:
        print(f"  {'Nearest Fib':>12}  {'Fib err%':>10}", end="")
    print()

    mean_v = sum(vals) / len(vals)
    for i, p in enumerate(PLANET_NAMES):
        ratio = vals[i] / mean_v
        line = f"  {p:>10}  {vals[i]:>14.6e}  {ratio:>10.4f}"
        if show_fib:
            a, b, r, err = nearest_fib_ratio(vals[i] / min(vals), FIB_MATCH + [34, 55, 89, 144])
            line += f"  {a:>4}/{b:<4}      {err*100:>8.2f}%"
        print(line)


# ═══════════════════════════════════════════════════════════════════════════
# RUN SEARCHES
# ═══════════════════════════════════════════════════════════════════════════

# --- 1-parameter search ---
print("\n" + "=" * 90)
print("SEARCH 1: Single parameter — ξ × param^α = constant?")
print("=" * 90)

results1 = search_n_params(1, top_k=30)
print(f"\nTop 15 results (out of {len(PARAMS) * len(EXPONENTS)} tested):\n")
for i, (sp, rs, pe, vals) in enumerate(results1[:15]):
    pname, exp = pe[0]
    print(f"  {i+1:>2}. ξ × {pname}^({fmt_exp(exp):>5s})  →  spread {sp*100:>8.2f}%")

# Show details for top 3
for i, (sp, rs, pe, vals) in enumerate(results1[:3]):
    print_result(i+1, sp, rs, pe, vals)

# --- 2-parameter search ---
print("\n" + "=" * 90)
print("SEARCH 2: Two parameters — ξ × p1^α × p2^β = constant?")
print("=" * 90)

results2 = search_n_params(2, top_k=30)
print(f"\nTop 15 results:\n")
for i, (sp, rs, pe, vals) in enumerate(results2[:15]):
    formula = " × ".join(f"{pn}^({fmt_exp(e)})" for pn, e in pe)
    print(f"  {i+1:>2}. ξ × {formula}  →  spread {sp*100:>8.2f}%")

# Show details for top 5
for i, (sp, rs, pe, vals) in enumerate(results2[:5]):
    print_result(i+1, sp, rs, pe, vals)

# Refine top 3
print("\n─── Fine-grid refinement of top 3 ───")
for i, (sp, rs, pe, vals) in enumerate(results2[:3]):
    refined = refine(pe)
    if refined:
        rsp, rrs, rpe, rvals = refined
        formula = " × ".join(f"{pn}^({fmt_exp(e)})" for pn, e in rpe)
        print(f"\n  Rank {i+1} refined: ξ × {formula}")
        print(f"  Spread: {sp*100:.4f}% → {rsp*100:.4f}%")
        for j, p in enumerate(PLANET_NAMES):
            print(f"    {p:>10}: {rvals[j]:.6e}")

# --- 3-parameter search (focused: T_prec + a + P or d) ---
print("\n" + "=" * 90)
print("SEARCH 3: Three parameters — ξ × p1^α × p2^β × p3^γ = constant?")
print("(Focused on physically motivated combinations)")
print("=" * 90)

# For 3-param, limit to physically motivated subsets to keep runtime manageable
FOCUSED_SETS = [
    # Original sets
    ['T_prec', 'a', 'P'],
    ['T_prec', 'a', 'd'],
    ['T_prec', 'P', 'd'],
    ['a', 'P', 'd'],
    ['T_prec', 'a', 'b_frac'],
    ['T_prec', 'a', 'b_over_a'],
    ['b_frac', 'a', 'd'],
    ['b_over_a', 'a', 'd'],
    ['T_prec', 'd', 'b_frac'],
    ['a_frac', 'b_frac', 'a'],
    ['a_frac', 'b_frac', 'd'],
    ['x_2H', 'a', 'd'],
    ['x_2H', 'a', 'i_rad'],
    ['x_2H', 'P', 'i_rad'],
    ['x_2H', 'd', 'i_rad'],
    ['x_2H', 'i_rad', 'b_frac'],
    ['i_rad', 'a', 'd'],
    ['i_rad', 'a', 'b_frac'],
    ['i_rad', 'd', 'b_frac'],
    ['x_2H', 'a', 'b_frac'],
    ['x_2H', 'i_rad', 'a_frac'],
    # ── NEW: AMD with Fibonacci quantum numbers ──
    ['AMD', 'd', 'a'],
    ['AMD', 'd', 'b_frac'],
    ['AMD', 'd', 'i_rad'],
    ['AMD', 'd', 'i_amp_rad'],
    ['AMD', 'b_frac', 'i_rad'],
    ['AMD', 'b_frac', 'i_amp_rad'],
    # ── NEW: Perihelion with Fibonacci ──
    ['T_perih', 'd', 'a'],
    ['T_perih', 'd', 'i_rad'],
    ['T_perih', 'd', 'i_amp_rad'],
    ['T_perih', 'b_frac', 'a'],
    ['T_perih', 'b_frac', 'i_rad'],
    # ── NEW: Mean inclination with Fibonacci ──
    ['i_amp_rad', 'd', 'a'],
    ['i_amp_rad', 'd', 'b_frac'],
    ['i_amp_rad', 'd', 'T_prec'],
    ['i_amp_rad', 'b_frac', 'a'],
    # ── NEW: eta (η) with other params ──
    ['eta', 'd', 'a'],
    ['eta', 'd', 'T_prec'],
    ['eta', 'd', 'T_perih'],
    ['eta', 'b_frac', 'a'],
    ['eta', 'b_frac', 'T_prec'],
    # ── NEW: Eigenfrequencies with Fibonacci ──
    ['g_freq', 'd', 'a'],
    ['g_freq', 'd', 'i_rad'],
    ['g_freq', 'b_frac', 'a'],
    ['s_freq', 'd', 'a'],
    ['g_over_s', 'd', 'a'],
    ['g_over_s', 'd', 'i_rad'],
    # ── NEW: f(e) with Fibonacci ──
    ['f_e', 'd', 'a'],
    ['f_e', 'd', 'i_rad'],
    ['f_e', 'b_frac', 'a'],
    # ── NEW: Hill and L_orb with Fibonacci ──
    ['Hill', 'd', 'i_rad'],
    ['L_orb', 'd', 'i_rad'],
    ['R_law4', 'd', 'a'],
]

all_3param = []
for pset in FOCUSED_SETS:
    # Use a coarser exponent grid for 3-param to keep it fast
    coarse_exp = [-2, -1, -1/2, 0, 1/2, 1, 2]
    for exps in __import__('itertools').product(coarse_exp, repeat=3):
        if all(e == 0 for e in exps):
            continue
        param_exp = list(zip(pset, exps))
        vals = evaluate(param_exp)
        if min(vals) > 0:
            sp = spread(vals)
            rs = rel_std(vals)
            all_3param.append((sp, rs, param_exp, vals))

all_3param.sort(key=lambda x: x[0])

print(f"\nTested {len(all_3param)} combinations across {len(FOCUSED_SETS)} parameter sets\n")
print("Top 20 results:\n")
for i, (sp, rs, pe, vals) in enumerate(all_3param[:20]):
    formula = " × ".join(f"{pn}^({fmt_exp(e)})" for pn, e in pe)
    print(f"  {i+1:>2}. ξ × {formula}  →  spread {sp*100:>8.2f}%")

# Show details for top 5
for i, (sp, rs, pe, vals) in enumerate(all_3param[:5]):
    print_result(i+1, sp, rs, pe, vals)

# Refine top 3
print("\n─── Fine-grid refinement of top 3 ───")
for i, (sp, rs, pe, vals) in enumerate(all_3param[:3]):
    refined = refine(pe)
    if refined:
        rsp, rrs, rpe, rvals = refined
        formula = " × ".join(f"{pn}^({fmt_exp(e)})" for pn, e in rpe)
        print(f"\n  Rank {i+1} refined: ξ × {formula}")
        print(f"  Spread: {sp*100:.4f}% → {rsp*100:.4f}%")
        for j, p in enumerate(PLANET_NAMES):
            print(f"    {p:>10}: {rvals[j]:.6e}")


# ═══════════════════════════════════════════════════════════════════════════
# SPECIAL: INNER vs OUTER PLANET ANALYSIS
# ═══════════════════════════════════════════════════════════════════════════

print("\n" + "=" * 90)
print("SEARCH 4: Inner planets only — can we find d_ecc from (T_prec, a, P)?")
print("=" * 90)

INNER = ["Mercury", "Venus", "Earth", "Mars"]
OUTER = ["Jupiter", "Saturn", "Uranus", "Neptune"]

for group_name, group in [("INNER", INNER), ("OUTER", OUTER)]:
    print(f"\n─── {group_name} planets ───\n")
    best_inner = []
    for pname in PARAMS:
        for exp in EXPONENTS:
            if exp == 0:
                continue
            vals = [XI_ALL[p] * PARAMS[pname]['values'][p] ** exp for p in group]
            if min(vals) > 0:
                sp = spread(vals)
                best_inner.append((sp, pname, exp, vals))
    best_inner.sort()
    print(f"  Top 10 single-parameter results:")
    for i, (sp, pname, exp, vals) in enumerate(best_inner[:10]):
        print(f"    {i+1:>2}. ξ × {pname}^({fmt_exp(exp):>5s})  →  spread {sp*100:>8.2f}%  |  values: {', '.join(f'{v:.4e}' for v in vals)}")


# ═══════════════════════════════════════════════════════════════════════════
# SPECIAL: CHECK ξ × (H/b)^α = constant?
# ═══════════════════════════════════════════════════════════════════════════

print("\n" + "=" * 90)
print("SEARCH 5: ξ × (H/b_frac)^α — using the Fibonacci precession denominator")
print("=" * 90)

H_over_b = {p: H / PERIOD_FRAC[p][1] for p in PLANET_NAMES}
print("\n  H/b_frac for each planet:")
for p in PLANET_NAMES:
    b = PERIOD_FRAC[p][1]
    print(f"    {p:10s}: b={b:>2}, H/b = {H_over_b[p]:>12.1f}")

print("\n  ξ × (H/b)^α for various α:\n")
print(f"  {'α':>6s}  {'Spread %':>10s}  | Mercury    Venus      Earth      Mars       Jupiter    Saturn     Uranus     Neptune")
print("  " + "─" * 120)

for alpha in EXPONENTS:
    if alpha == 0:
        continue
    vals = [XI_ALL[p] * H_over_b[p] ** alpha for p in PLANET_NAMES]
    sp = spread(vals)
    val_str = "  ".join(f"{v:>9.4e}" for v in vals)
    print(f"  {fmt_exp(alpha):>6s}  {sp*100:>10.2f}  | {val_str}")


# ═══════════════════════════════════════════════════════════════════════════
# SEARCH 6: ξ × d^α × (H/b)^β — combining inclination + precession divisors
# ═══════════════════════════════════════════════════════════════════════════

print("\n" + "=" * 90)
print("SEARCH 6: ξ × d^α × (H/b)^β — Fibonacci divisor + precession")
print("=" * 90)

best_6 = []
for alpha in EXPONENTS:
    for beta in EXPONENTS:
        if alpha == 0 and beta == 0:
            continue
        vals = [XI_ALL[p] * D[p]**alpha * H_over_b[p]**beta for p in PLANET_NAMES]
        if min(vals) > 0:
            sp = spread(vals)
            best_6.append((sp, alpha, beta, vals))

best_6.sort()
print(f"\nTop 20 results:\n")
print(f"  {'Rank':>4}  {'α(d)':>6}  {'β(H/b)':>6}  {'Spread%':>10}")
print("  " + "─" * 40)
for i, (sp, alpha, beta, vals) in enumerate(best_6[:20]):
    print(f"  {i+1:>4}  {fmt_exp(alpha):>6s}  {fmt_exp(beta):>6s}  {sp*100:>10.4f}")

# Details for top 3
for i, (sp, alpha, beta, vals) in enumerate(best_6[:3]):
    print(f"\n  Rank {i+1}: ξ × d^({fmt_exp(alpha)}) × (H/b)^({fmt_exp(beta)})")
    print(f"  Spread: {sp*100:.4f}%")
    for j, p in enumerate(PLANET_NAMES):
        print(f"    {p:10s}: {vals[j]:.6e}  (d={D[p]:>2}, b={PERIOD_FRAC[p][1]:>2}, H/b={H_over_b[p]:>8.1f})")

# Refine top result
if best_6:
    sp0, a0, b0, _ = best_6[0]
    print(f"\n  Fine-grid refinement of rank 1 (α≈{fmt_exp(a0)}, β≈{fmt_exp(b0)}):")
    fine_best = []
    for da in [i * 0.02 for i in range(-25, 26)]:
        for db in [i * 0.02 for i in range(-25, 26)]:
            a_ = a0 + da
            b_ = b0 + db
            vals = [XI_ALL[p] * D[p]**a_ * H_over_b[p]**b_ for p in PLANET_NAMES]
            if min(vals) > 0:
                sp = spread(vals)
                fine_best.append((sp, a_, b_, vals))
    fine_best.sort()
    for i in range(min(5, len(fine_best))):
        sp, a_, b_, vals = fine_best[i]
        print(f"    #{i+1}: α={a_:.3f}, β={b_:.3f}  →  spread {sp*100:.4f}%")
    # Show the best one
    sp, a_, b_, vals = fine_best[0]
    print(f"\n  Best: ξ × d^({a_:.3f}) × (H/b)^({b_:.3f})")
    for j, p in enumerate(PLANET_NAMES):
        print(f"    {p:10s}: {vals[j]:.6e}")


# ═══════════════════════════════════════════════════════════════════════════
# SEARCH 7: ξ × d^α × a^β × (H/b)^γ — three Fibonacci-relevant parameters
# ═══════════════════════════════════════════════════════════════════════════

print("\n" + "=" * 90)
print("SEARCH 7: ξ × d^α × a^β × (H/b)^γ — full three-parameter Fibonacci search")
print("=" * 90)

best_7 = []
coarse = [-2, -3/2, -1, -1/2, 0, 1/2, 1, 3/2, 2]
for alpha in coarse:
    for beta in coarse:
        for gamma in coarse:
            if alpha == 0 and beta == 0 and gamma == 0:
                continue
            vals = [XI_ALL[p] * D[p]**alpha * SMA[p]**beta * H_over_b[p]**gamma
                    for p in PLANET_NAMES]
            if min(vals) > 0:
                sp = spread(vals)
                best_7.append((sp, alpha, beta, gamma, vals))

best_7.sort()
print(f"\nTested {len(best_7)} combinations\n")
print(f"Top 20 results:\n")
print(f"  {'Rank':>4}  {'α(d)':>6}  {'β(a)':>6}  {'γ(H/b)':>6}  {'Spread%':>10}")
print("  " + "─" * 50)
for i, (sp, alpha, beta, gamma, vals) in enumerate(best_7[:20]):
    print(f"  {i+1:>4}  {fmt_exp(alpha):>6s}  {fmt_exp(beta):>6s}  {fmt_exp(gamma):>6s}  {sp*100:>10.4f}")

# Details + refinement for top 3
for i, (sp, alpha, beta, gamma, vals) in enumerate(best_7[:3]):
    print(f"\n  Rank {i+1}: ξ × d^({fmt_exp(alpha)}) × a^({fmt_exp(beta)}) × (H/b)^({fmt_exp(gamma)})")
    print(f"  Spread: {sp*100:.4f}%")
    for j, p in enumerate(PLANET_NAMES):
        print(f"    {p:10s}: {vals[j]:.6e}")

    # Fine refinement
    fine_best = []
    for da in [i * 0.05 for i in range(-10, 11)]:
        for db in [i * 0.05 for i in range(-10, 11)]:
            for dg in [i * 0.05 for i in range(-10, 11)]:
                a_ = alpha + da
                b_ = beta + db
                g_ = gamma + dg
                vals2 = [XI_ALL[p] * D[p]**a_ * SMA[p]**b_ * H_over_b[p]**g_
                         for p in PLANET_NAMES]
                if min(vals2) > 0:
                    sp2 = spread(vals2)
                    fine_best.append((sp2, a_, b_, g_, vals2))
    fine_best.sort()
    sp2, a_, b_, g_, vals2 = fine_best[0]
    print(f"  → Refined: α={a_:.3f}, β={b_:.3f}, γ={g_:.3f}  spread={sp2*100:.4f}%")
    for j, p in enumerate(PLANET_NAMES):
        print(f"      {p:10s}: {vals2[j]:.6e}")


# ═══════════════════════════════════════════════════════════════════════════
# SEARCH 8: PHYSICS-ONLY — standard orbital elements, no Fibonacci numbers
# ═══════════════════════════════════════════════════════════════════════════

print("\n" + "=" * 90)
print("SEARCH 8: PHYSICS-ONLY — ξ × f(T_prec, a, P, i, ...) = constant?")
print("No Fibonacci quantum numbers (d, b_frac, a_frac) allowed.")
print("=" * 90)

PHYS_PARAMS = ['T_prec', 'a', 'P', 'sqrt_a', 'i_rad', 'i_J2000_rad',
               'P_over_Tprec', 'n', 'n_Tprec', 'Tprec_over_H',
               # NEW physical parameters:
               'AMD', 'f_e', 'h_e', 'i_amp_rad', 'mass', 'e_raw',
               'R_law4', 'L_orb', 'Hill', 'T_perih', 'g_freq', 's_freq',
               'g_over_s', 'T_perih_over_H', 'AMD_over_L', 'Kozai',
               'e_over_i_amp', 'Sigma', 'eta']

# --- 8a: Single physical parameter ---
print("\n─── 8a: Single physical parameter ───\n")
results_8a = search_n_params(1, param_names=PHYS_PARAMS, top_k=30)
print(f"Top 15 results:\n")
for i, (sp, rs, pe, vals) in enumerate(results_8a[:15]):
    pname, exp = pe[0]
    print(f"  {i+1:>2}. ξ × {pname}^({fmt_exp(exp):>5s})  →  spread {sp*100:>8.2f}%")

for i, (sp, rs, pe, vals) in enumerate(results_8a[:3]):
    print_result(i+1, sp, rs, pe, vals)

# --- 8b: Two physical parameters ---
print("\n─── 8b: Two physical parameters ───\n")
results_8b = search_n_params(2, param_names=PHYS_PARAMS, top_k=30)
print(f"Top 20 results:\n")
for i, (sp, rs, pe, vals) in enumerate(results_8b[:20]):
    formula = " × ".join(f"{pn}^({fmt_exp(e)})" for pn, e in pe)
    print(f"  {i+1:>2}. ξ × {formula}  →  spread {sp*100:>8.2f}%")

for i, (sp, rs, pe, vals) in enumerate(results_8b[:5]):
    print_result(i+1, sp, rs, pe, vals)

# Refine top 3
print("\n─── Refinement of 8b top 3 ───")
for i, (sp, rs, pe, vals) in enumerate(results_8b[:3]):
    refined = refine(pe)
    if refined:
        rsp, rrs, rpe, rvals = refined
        formula = " × ".join(f"{pn}^({fmt_exp(e)})" for pn, e in rpe)
        print(f"\n  Rank {i+1} refined: ξ × {formula}")
        print(f"  Spread: {sp*100:.4f}% → {rsp*100:.4f}%")
        for j, p in enumerate(PLANET_NAMES):
            print(f"    {p:>10}: {rvals[j]:.6e}")

# --- 8c: Three physical parameters (focused subsets) ---
print("\n─── 8c: Three physical parameters ───\n")
PHYS_FOCUSED = [
    # Original sets
    ['T_prec', 'a', 'P'],
    ['T_prec', 'a', 'i_rad'],
    ['T_prec', 'P', 'i_rad'],
    ['T_prec', 'a', 'i_J2000_rad'],
    ['T_prec', 'P', 'i_J2000_rad'],
    ['a', 'P', 'i_rad'],
    ['a', 'P', 'i_J2000_rad'],
    ['P_over_Tprec', 'a', 'i_rad'],
    ['P_over_Tprec', 'a', 'P'],
    ['P_over_Tprec', 'i_rad', 'P'],
    ['P_over_Tprec', 'i_J2000_rad', 'a'],
    ['n_Tprec', 'a', 'i_rad'],
    ['n_Tprec', 'a', 'i_J2000_rad'],
    ['n_Tprec', 'P', 'i_rad'],
    ['n_Tprec', 'i_rad', 'i_J2000_rad'],
    ['sqrt_a', 'T_prec', 'i_rad'],
    ['sqrt_a', 'P_over_Tprec', 'i_rad'],
    ['sqrt_a', 'n_Tprec', 'i_rad'],
    ['Tprec_over_H', 'a', 'i_rad'],
    ['Tprec_over_H', 'P', 'i_rad'],
    ['Tprec_over_H', 'a', 'i_J2000_rad'],
    ['Tprec_over_H', 'sqrt_a', 'i_rad'],
    ['Tprec_over_H', 'P_over_Tprec', 'i_rad'],
    ['T_prec', 'sqrt_a', 'i_rad'],
    ['n', 'T_prec', 'i_rad'],
    ['n', 'a', 'i_rad'],
    ['n', 'T_prec', 'a'],
    # ── NEW: AMD-centered combinations ──
    ['AMD', 'a', 'i_rad'],
    ['AMD', 'a', 'i_amp_rad'],
    ['AMD', 'i_rad', 'i_amp_rad'],
    ['AMD', 'T_prec', 'i_rad'],
    ['AMD', 'T_prec', 'i_amp_rad'],
    ['AMD', 'T_perih', 'i_rad'],
    ['AMD', 'T_perih', 'i_amp_rad'],
    ['AMD', 'a', 'T_perih'],
    ['AMD', 'L_orb', 'i_rad'],
    ['AMD', 'L_orb', 'i_amp_rad'],
    ['AMD', 'mass', 'i_amp_rad'],
    ['AMD', 'e_raw', 'a'],
    ['AMD', 'Hill', 'i_rad'],
    # ── NEW: Perihelion precession combinations ──
    ['T_perih', 'a', 'i_rad'],
    ['T_perih', 'a', 'i_amp_rad'],
    ['T_perih', 'i_rad', 'i_amp_rad'],
    ['T_perih', 'P', 'i_rad'],
    ['T_perih', 'P', 'i_amp_rad'],
    ['T_perih', 'sqrt_a', 'i_rad'],
    ['T_perih', 'T_prec', 'i_rad'],
    ['T_perih', 'T_prec', 'a'],
    ['T_perih', 'T_prec', 'i_amp_rad'],
    # ── NEW: Mean inclination combinations ──
    ['i_amp_rad', 'a', 'P'],
    ['i_amp_rad', 'a', 'T_prec'],
    ['i_amp_rad', 'T_prec', 'P'],
    ['i_amp_rad', 'sqrt_a', 'T_prec'],
    ['i_amp_rad', 'a', 'mass'],
    ['i_amp_rad', 'L_orb', 'a'],
    ['i_amp_rad', 'i_rad', 'a'],
    ['i_amp_rad', 'i_rad', 'T_prec'],
    # ── NEW: Eigenfrequency combinations ──
    ['g_freq', 'a', 'i_rad'],
    ['g_freq', 'a', 'i_amp_rad'],
    ['g_freq', 's_freq', 'a'],
    ['g_freq', 's_freq', 'i_rad'],
    ['g_freq', 's_freq', 'i_amp_rad'],
    ['g_over_s', 'a', 'i_rad'],
    ['g_over_s', 'a', 'i_amp_rad'],
    ['g_over_s', 'T_prec', 'i_rad'],
    # ── NEW: Hill radius and angular momentum ──
    ['Hill', 'a', 'i_rad'],
    ['Hill', 'T_prec', 'i_rad'],
    ['Hill', 'i_amp_rad', 'a'],
    ['L_orb', 'a', 'i_rad'],
    ['L_orb', 'T_prec', 'i_rad'],
    ['L_orb', 'i_amp_rad', 'a'],
    ['AMD_over_L', 'a', 'i_rad'],
    ['AMD_over_L', 'T_prec', 'i_rad'],
    # ── NEW: Cross-parameter combinations ──
    ['e_raw', 'i_amp_rad', 'a'],
    ['e_raw', 'i_rad', 'a'],
    ['R_law4', 'a', 'i_rad'],
    ['R_law4', 'a', 'mass'],
    ['R_law4', 'T_prec', 'i_rad'],
    ['Kozai', 'a', 'T_prec'],
    ['Kozai', 'a', 'i_rad'],
    ['f_e', 'a', 'i_rad'],
    ['f_e', 'a', 'i_amp_rad'],
    ['f_e', 'i_rad', 'T_prec'],
    ['Sigma', 'a', 'T_prec'],
    ['Sigma', 'a', 'mass'],
    ['eta', 'a', 'T_prec'],
    ['eta', 'a', 'T_perih'],
    ['eta', 'T_prec', 'T_perih'],
]

all_8c = []
for pset in PHYS_FOCUSED:
    coarse_exp = [-2, -3/2, -1, -2/3, -1/2, -1/3, 0, 1/3, 1/2, 2/3, 1, 3/2, 2]
    for exps in __import__('itertools').product(coarse_exp, repeat=3):
        if all(e == 0 for e in exps):
            continue
        param_exp = list(zip(pset, exps))
        vals = evaluate(param_exp)
        if min(vals) > 0:
            sp = spread(vals)
            rs = rel_std(vals)
            all_8c.append((sp, rs, param_exp, vals))

all_8c.sort(key=lambda x: x[0])

print(f"Tested {len(all_8c)} combinations across {len(PHYS_FOCUSED)} parameter sets\n")
print("Top 30 results:\n")
for i, (sp, rs, pe, vals) in enumerate(all_8c[:30]):
    formula = " × ".join(f"{pn}^({fmt_exp(e)})" for pn, e in pe)
    print(f"  {i+1:>2}. ξ × {formula}  →  spread {sp*100:>8.2f}%")

for i, (sp, rs, pe, vals) in enumerate(all_8c[:5]):
    print_result(i+1, sp, rs, pe, vals)

# Refine top 5
print("\n─── Refinement of 8c top 5 ───")
for i, (sp, rs, pe, vals) in enumerate(all_8c[:5]):
    refined = refine(pe)
    if refined:
        rsp, rrs, rpe, rvals = refined
        formula = " × ".join(f"{pn}^({fmt_exp(e)})" for pn, e in rpe)
        print(f"\n  Rank {i+1} refined: ξ × {formula}")
        print(f"  Spread: {sp*100:.4f}% → {rsp*100:.4f}%")
        for j, p in enumerate(PLANET_NAMES):
            print(f"    {p:>10}: {rvals[j]:.6e}")


# ═══════════════════════════════════════════════════════════════════════════
# SEARCH 9: DEEP PHYSICS — systematic 4-parameter physical search
# ═══════════════════════════════════════════════════════════════════════════

print("\n" + "=" * 90)
print("SEARCH 9: DEEP PHYSICS — 4 physical parameters")
print("=" * 90)

# For 4-param, use very coarse exponents and most promising subsets
DEEP_SETS = [
    # Original sets
    ['T_prec', 'a', 'P', 'i_rad'],
    ['T_prec', 'a', 'P', 'i_J2000_rad'],
    ['T_prec', 'a', 'i_rad', 'i_J2000_rad'],
    ['T_prec', 'P', 'i_rad', 'i_J2000_rad'],
    ['P_over_Tprec', 'a', 'P', 'i_rad'],
    ['P_over_Tprec', 'a', 'i_rad', 'i_J2000_rad'],
    ['n_Tprec', 'a', 'P', 'i_rad'],
    ['n_Tprec', 'a', 'i_rad', 'i_J2000_rad'],
    ['Tprec_over_H', 'a', 'P', 'i_rad'],
    ['Tprec_over_H', 'a', 'i_rad', 'i_J2000_rad'],
    ['T_prec', 'sqrt_a', 'P', 'i_rad'],
    ['T_prec', 'sqrt_a', 'i_rad', 'i_J2000_rad'],
    # ── NEW: AMD-centered 4-param ──
    ['AMD', 'a', 'i_rad', 'i_amp_rad'],
    ['AMD', 'a', 'T_prec', 'i_rad'],
    ['AMD', 'a', 'T_prec', 'i_amp_rad'],
    ['AMD', 'a', 'T_perih', 'i_rad'],
    ['AMD', 'a', 'T_perih', 'i_amp_rad'],
    ['AMD', 'T_prec', 'T_perih', 'i_rad'],
    ['AMD', 'L_orb', 'a', 'i_rad'],
    ['AMD', 'i_rad', 'i_amp_rad', 'T_prec'],
    # ── NEW: Both precession timescales ──
    ['T_prec', 'T_perih', 'a', 'i_rad'],
    ['T_prec', 'T_perih', 'a', 'i_amp_rad'],
    ['T_prec', 'T_perih', 'i_rad', 'i_amp_rad'],
    ['T_prec', 'T_perih', 'P', 'i_rad'],
    # ── NEW: Eigenfrequencies ──
    ['g_freq', 's_freq', 'a', 'i_rad'],
    ['g_freq', 's_freq', 'a', 'i_amp_rad'],
    ['g_freq', 'a', 'i_rad', 'i_amp_rad'],
    ['g_over_s', 'a', 'i_rad', 'i_amp_rad'],
    ['g_over_s', 'a', 'T_prec', 'i_rad'],
    # ── NEW: Mean inclination centered ──
    ['i_amp_rad', 'a', 'T_prec', 'i_rad'],
    ['i_amp_rad', 'a', 'P', 'i_rad'],
    ['i_amp_rad', 'a', 'T_perih', 'i_rad'],
    ['i_amp_rad', 'mass', 'a', 'T_prec'],
    # ── NEW: Hill / angular momentum ──
    ['Hill', 'a', 'i_rad', 'T_prec'],
    ['Hill', 'a', 'i_amp_rad', 'T_prec'],
    ['L_orb', 'a', 'i_rad', 'T_prec'],
    ['AMD_over_L', 'a', 'i_rad', 'T_prec'],
    # ── NEW: Cross-eccentricity-inclination ──
    ['f_e', 'a', 'i_rad', 'i_amp_rad'],
    ['f_e', 'a', 'i_rad', 'T_prec'],
    ['eta', 'a', 'T_prec', 'T_perih'],
    ['eta', 'a', 'T_perih', 'i_amp_rad'],
    ['R_law4', 'a', 'i_rad', 'T_prec'],
    ['Sigma', 'a', 'T_prec', 'mass'],
]

deep_exp = [-2, -1, -1/2, 0, 1/2, 1, 2]
all_9 = []
for pset in DEEP_SETS:
    for exps in __import__('itertools').product(deep_exp, repeat=4):
        if all(e == 0 for e in exps):
            continue
        param_exp = list(zip(pset, exps))
        vals = evaluate(param_exp)
        if min(vals) > 0:
            sp = spread(vals)
            rs = rel_std(vals)
            all_9.append((sp, rs, param_exp, vals))

all_9.sort(key=lambda x: x[0])

print(f"\nTested {len(all_9)} combinations across {len(DEEP_SETS)} parameter sets\n")
print("Top 30 results:\n")
for i, (sp, rs, pe, vals) in enumerate(all_9[:30]):
    formula = " × ".join(f"{pn}^({fmt_exp(e)})" for pn, e in pe)
    print(f"  {i+1:>2}. ξ × {formula}  →  spread {sp*100:>8.2f}%")

for i, (sp, rs, pe, vals) in enumerate(all_9[:5]):
    print_result(i+1, sp, rs, pe, vals)

# Refine top 5
print("\n─── Refinement of top 5 ───")
for i, (sp, rs, pe, vals) in enumerate(all_9[:5]):
    refined = refine(pe, step=0.05, rng=0.5)
    if refined:
        rsp, rrs, rpe, rvals = refined
        formula = " × ".join(f"{pn}^({fmt_exp(e)})" for pn, e in rpe)
        print(f"\n  Rank {i+1} refined: ξ × {formula}")
        print(f"  Spread: {sp*100:.4f}% → {rsp*100:.4f}%")
        for j, p in enumerate(PLANET_NAMES):
            print(f"    {p:>10}: {rvals[j]:.6e}")


# ═══════════════════════════════════════════════════════════════════════════
# PHYSICAL INSIGHT SECTION: show what each parameter contributes
# ═══════════════════════════════════════════════════════════════════════════

print("\n" + "=" * 90)
print("PHYSICAL INSIGHT: Parameter values for each planet")
print("=" * 90)

print(f"\n{'Planet':>10} | {'ξ':>10} | {'ξ/ξ_V':>8} | {'e':>10} | {'√m':>10} | {'a (AU)':>8} | {'P (yr)':>8} | {'T_prec':>8} | {'P/T_prec':>10} | {'i_amp(°)':>10} | {'i_J2000(°)':>10}")
print("─" * 140)
for p in PLANET_NAMES:
    print(f"{p:>10} | {XI_ALL[p]:.4e} | {XI_ALL[p]/XI_V:>8.3f} | {ECC[p]:.6f} | {SQRT_M[p]:.4e} | {SMA[p]:>8.4f} | {ORBITAL_PERIOD[p]:>8.3f} | {INCL_PERIOD[p]:>8.0f} | {ORBITAL_PERIOD[p]/INCL_PERIOD[p]:.4e} | {INCL_AMP[p]:>10.4f} | {INCL_J2000[p]:>10.4f}")

print(f"\nKey dimensionless ratios:")
print(f"  R = ψ/ξ_V = {PSI/XI_V:.4f}")
print(f"  ψ = {PSI:.6e}")
print(f"  ξ_V = {XI_V:.6e}")


print("\n" + "=" * 90)
print("SEARCH COMPLETE")
print("=" * 90)
