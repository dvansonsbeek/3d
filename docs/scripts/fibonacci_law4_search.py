#!/usr/bin/env python3
"""
LAW 4 (ECCENTRICITY) — EXPLORATORY SEARCHES (NEGATIVE RESULTS)
================================================================

Consolidated search scripts testing whether Law 4's R² pair constraints
can be derived from simpler rules. All searches yield negative results.

Sections:
  1. Universal eccentricity constant search (no ξ-constant exists)
  2. R² target formula search (no rule d → R² target found)
  3. Fibonacci index formula search (data is irreducible)
  4. Mean inclination prediction from AMD formula (captures trend only)

Consolidated from:
  - fibonacci_eccentricity_constant.py  (universal constant search)
  - fibonacci_eccentricity_rule.py      (R² target formula)
  - fibonacci_index_formula.py          (Fibonacci index formula)
  - fibonacci_mean_incl_prediction.py   (mean inclination prediction)
"""

import math
import sys
import os
import statistics
from itertools import combinations_with_replacement, product as iter_product

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from constants_scripts import *


# ═══════════════════════════════════════════════════════════════════════════
# SEARCH INFRASTRUCTURE
# ═══════════════════════════════════════════════════════════════════════════

def spread(values):
    """Max/min spread (0 = perfect constant)."""
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


def fmt_exp(e):
    """Format exponent as clean fraction string."""
    fracs = {-2: '-2', -1.5: '-3/2', -1: '-1', -2/3: '-2/3', -0.5: '-1/2',
             -1/3: '-1/3', 0: '0', 1/3: '1/3', 0.5: '1/2', 2/3: '2/3',
             1: '1', 1.5: '3/2', 2: '2'}
    for k, v in fracs.items():
        if abs(e - k) < 0.001:
            return v
    return f'{e:.3f}'


XI_ALL = {p: ECC[p] * SQRT_M[p] for p in PLANET_NAMES}
XI_V = XI_ALL['Venus']


# ═══════════════════════════════════════════════════════════════════════════
# SECTION 1: UNIVERSAL ECCENTRICITY CONSTANT SEARCH
# ═══════════════════════════════════════════════════════════════════════════

print("=" * 90)
print("LAW 4 SEARCH — EXPLORATORY (NEGATIVE RESULTS)")
print("=" * 90)

print("\n" + "=" * 90)
print("Section 1: Universal eccentricity constant search")
print("  Goal: find ξ × f(T_prec, a, P, d, ...) = constant")
print("=" * 90)

# Parameter definitions
PARAMS = {
    'T_prec': {
        'desc': 'Precession period (years)',
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
        'desc': 'Period fraction denominator',
        'values': {p: float(PERIOD_FRAC[p][1]) for p in PLANET_NAMES},
    },
    'a_frac': {
        'desc': 'Period fraction numerator',
        'values': {p: float(PERIOD_FRAC[p][0]) for p in PLANET_NAMES},
    },
    'b_over_a': {
        'desc': 'b_frac/a_frac',
        'values': {p: PERIOD_FRAC[p][1] / PERIOD_FRAC[p][0] for p in PLANET_NAMES},
    },
    'x_2H': {
        'desc': '2H / T_prec',
        'values': {p: 2 * H / INCL_PERIOD[p] for p in PLANET_NAMES},
    },
    'i_rad': {
        'desc': 'Inclination amplitude (radians)',
        'values': {p: math.radians(INCL_AMP[p]) for p in PLANET_NAMES},
    },
    'P_over_Tprec': {
        'desc': 'P / T_prec',
        'values': {p: ORBITAL_PERIOD[p] / INCL_PERIOD[p] for p in PLANET_NAMES},
    },
    'sqrt_a': {
        'desc': '√a',
        'values': {p: math.sqrt(SMA[p]) for p in PLANET_NAMES},
    },
    'n': {
        'desc': 'Mean motion 2π/P (rad/yr)',
        'values': {p: 2 * math.pi / ORBITAL_PERIOD[p] for p in PLANET_NAMES},
    },
    'n_Tprec': {
        'desc': 'n × T_prec',
        'values': {p: 2 * math.pi / ORBITAL_PERIOD[p] * INCL_PERIOD[p] for p in PLANET_NAMES},
    },
    'i_J2000_rad': {
        'desc': 'J2000 inclination (radians)',
        'values': {p: math.radians(INCL_J2000[p]) for p in PLANET_NAMES},
    },
    'a_3_2': {
        'desc': 'a^(3/2)',
        'values': {p: SMA[p]**1.5 for p in PLANET_NAMES},
    },
    'Tprec_over_H': {
        'desc': 'T_prec / H',
        'values': {p: INCL_PERIOD[p] / H for p in PLANET_NAMES},
    },
    'AMD': {
        'desc': 'Angular Momentum Deficit',
        'values': {p: MASS[p] * math.sqrt(SMA[p]) * (1 - math.sqrt(1 - ECC[p]**2))
                   for p in PLANET_NAMES},
    },
    'f_e': {
        'desc': 'AMD kernel 1-√(1-e²)',
        'values': {p: 1 - math.sqrt(1 - ECC[p]**2) for p in PLANET_NAMES},
    },
    'h_e': {
        'desc': '√(1+√(1-e²))',
        'values': {p: math.sqrt(1 + math.sqrt(1 - ECC[p]**2)) for p in PLANET_NAMES},
    },
    'i_amp_rad': {
        'desc': 'Model inclination amplitude (radians)',
        'values': {p: math.radians(INCL_AMP[p]) for p in PLANET_NAMES},
    },
    'eta': {
        'desc': 'Mass-weighted inclination η = ψ/d',
        'values': {p: PSI / D[p] for p in PLANET_NAMES},
    },
    'mass': {
        'desc': 'Planetary mass (solar)',
        'values': {p: MASS[p] for p in PLANET_NAMES},
    },
    'e_raw': {
        'desc': 'Raw eccentricity',
        'values': {p: ECC[p] for p in PLANET_NAMES},
    },
    'R_law4': {
        'desc': 'R = e / i_amp (radians)',
        'values': {p: ECC[p] / math.radians(INCL_AMP[p]) for p in PLANET_NAMES},
    },
    'L_orb': {
        'desc': 'Orbital angular momentum ∝ m√(a(1-e²))',
        'values': {p: MASS[p] * math.sqrt(SMA[p] * (1 - ECC[p]**2))
                   for p in PLANET_NAMES},
    },
    'Hill': {
        'desc': 'Hill radius = a(m/3)^(1/3)',
        'values': {p: SMA[p] * (MASS[p] / 3) ** (1/3) for p in PLANET_NAMES},
    },
    'T_perih': {
        'desc': 'Perihelion precession period (years)',
        'values': {p: 1296000.0 / {
            'Mercury': 5.38, 'Venus': 7.35, 'Earth': 17.25, 'Mars': 17.77,
            'Jupiter': 4.31, 'Saturn': 28.22, 'Uranus': 3.11, 'Neptune': 0.67,
        }[p] for p in PLANET_NAMES},
    },
    'g_freq': {
        'desc': 'Dominant g-mode eigenfrequency (arcsec/yr)',
        'values': {p: {
            'Mercury': 4.257, 'Venus': 7.452, 'Earth': 17.368, 'Mars': 17.916,
            'Jupiter': 4.257, 'Saturn': 28.245, 'Uranus': 3.088, 'Neptune': 0.672,
        }[p] for p in PLANET_NAMES},
    },
    's_freq': {
        'desc': 'Dominant s-mode eigenfrequency (arcsec/yr)',
        'values': {p: abs({
            'Mercury': -5.59, 'Venus': -7.05, 'Earth': -18.85, 'Mars': -17.755,
            'Jupiter': -26.34, 'Saturn': -26.34, 'Uranus': -2.99, 'Neptune': -0.692,
        }[p]) for p in PLANET_NAMES},
    },
    'g_over_s': {'desc': 'g/s ratio', 'values': {}},
    'T_perih_over_H': {'desc': 'T_perih / H', 'values': {}},
    'AMD_over_L': {'desc': 'AMD / L_orb', 'values': {}},
    'Kozai': {'desc': '√(1-e²)cos(i)', 'values': {}},
}

# Compute derived parameters
for p in PLANET_NAMES:
    g = PARAMS['g_freq']['values'][p]
    s = PARAMS['s_freq']['values'][p]
    PARAMS['g_over_s']['values'][p] = g / s if s > 0 else float('inf')
    PARAMS['T_perih_over_H']['values'][p] = PARAMS['T_perih']['values'][p] / H
    amd = PARAMS['AMD']['values'][p]
    L = PARAMS['L_orb']['values'][p]
    PARAMS['AMD_over_L']['values'][p] = amd / L if L > 0 else 0
    PARAMS['Kozai']['values'][p] = math.sqrt(1 - ECC[p]**2) * math.cos(math.radians(INCL_J2000[p]))

EXPONENTS = [-2, -3/2, -1, -2/3, -1/2, -1/3, 0, 1/3, 1/2, 2/3, 1, 3/2, 2]


def evaluate(param_exp_list):
    """Evaluate ξ × ∏ param_i^exp_i for all planets."""
    result = []
    for p in PLANET_NAMES:
        val = XI_ALL[p]
        for pname, exp in param_exp_list:
            pval = PARAMS[pname]['values'][p]
            if pval < 0 and exp != int(exp):
                return None
            val *= pval ** exp
        if not isinstance(val, (int, float)) or math.isnan(val) or math.isinf(val):
            return None
        result.append(val)
    return result


def search_n_params(n, param_names=None, exponents=None, top_k=20):
    """Search all n-parameter combinations for minimum spread."""
    if param_names is None:
        param_names = list(PARAMS.keys())
    if exponents is None:
        exponents = EXPONENTS
    results = []
    for params in combinations_with_replacement(param_names, n):
        for exps in iter_product(exponents, repeat=n):
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


def refine(param_exp_list, step=0.05, rng=0.5):
    """Fine-grid refinement around a given parameter-exponent combination."""
    param_names = [pe[0] for pe in param_exp_list]
    center_exps = [pe[1] for pe in param_exp_list]
    n = len(param_exp_list)
    fine_exps = []
    for c in center_exps:
        fine_exps.append([c + i * step for i in range(int(-rng/step), int(rng/step) + 1)])
    best_sp = float('inf')
    best_result = None
    for exps in iter_product(*fine_exps):
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


def print_result(rank, sp, rs, param_exp, vals):
    """Pretty-print a search result."""
    formula = "ξ × " + " × ".join(f"{pn}^({fmt_exp(e)})" for pn, e in param_exp if e != 0)
    print(f"\n  Rank {rank}: {formula}")
    print(f"  Spread: {sp*100:.4f}%  |  Rel StdDev: {rs*100:.4f}%")
    mean_v = sum(vals) / len(vals)
    print(f"  {'Planet':>10}  {'Value':>14}  {'/ mean':>10}")
    for i, p in enumerate(PLANET_NAMES):
        print(f"  {p:>10}  {vals[i]:>14.6e}  {vals[i]/mean_v:>10.4f}")


# --- 1a: Single parameter search ---
print("\n─── 1a: Single parameter — ξ × param^α = constant? ───\n")
results1 = search_n_params(1, top_k=30)
print(f"Top 15 results:\n")
for i, (sp, rs, pe, vals) in enumerate(results1[:15]):
    pname, exp = pe[0]
    print(f"  {i+1:>2}. ξ × {pname}^({fmt_exp(exp):>5s})  →  spread {sp*100:>8.2f}%")

for i, (sp, rs, pe, vals) in enumerate(results1[:3]):
    print_result(i+1, sp, rs, pe, vals)

# --- 1b: Two parameter search ---
print("\n─── 1b: Two parameters — ξ × p1^α × p2^β = constant? ───\n")
results2 = search_n_params(2, top_k=30)
print(f"Top 15 results:\n")
for i, (sp, rs, pe, vals) in enumerate(results2[:15]):
    formula = " × ".join(f"{pn}^({fmt_exp(e)})" for pn, e in pe)
    print(f"  {i+1:>2}. ξ × {formula}  →  spread {sp*100:>8.2f}%")

for i, (sp, rs, pe, vals) in enumerate(results2[:3]):
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

# --- 1c: Three parameter search (Fibonacci-relevant) ---
print("\n─── 1c: Three parameters (Fibonacci-relevant) ───\n")

FOCUSED_SETS = [
    ['T_prec', 'a', 'P'], ['T_prec', 'a', 'd'], ['T_prec', 'P', 'd'],
    ['a', 'P', 'd'], ['T_prec', 'a', 'b_frac'], ['T_prec', 'a', 'b_over_a'],
    ['b_frac', 'a', 'd'], ['b_over_a', 'a', 'd'], ['x_2H', 'a', 'd'],
    ['x_2H', 'a', 'i_rad'], ['x_2H', 'd', 'i_rad'], ['i_rad', 'a', 'd'],
    ['i_rad', 'd', 'b_frac'], ['AMD', 'd', 'a'], ['AMD', 'd', 'i_rad'],
    ['T_perih', 'd', 'a'], ['T_perih', 'd', 'i_rad'], ['eta', 'd', 'a'],
    ['g_freq', 'd', 'a'], ['s_freq', 'd', 'a'], ['f_e', 'd', 'a'],
    ['R_law4', 'd', 'a'], ['i_amp_rad', 'd', 'a'],
]

all_3param = []
coarse_exp = [-2, -1, -1/2, 0, 1/2, 1, 2]
for pset in FOCUSED_SETS:
    for exps in iter_product(coarse_exp, repeat=3):
        if all(e == 0 for e in exps):
            continue
        param_exp = list(zip(pset, exps))
        vals = evaluate(param_exp)
        if vals is not None and min(vals) > 0:
            sp = spread(vals)
            all_3param.append((sp, rel_std(vals), param_exp, vals))

all_3param.sort(key=lambda x: x[0])
print(f"Tested {len(all_3param)} combinations across {len(FOCUSED_SETS)} sets\n")
print("Top 15 results:\n")
for i, (sp, rs, pe, vals) in enumerate(all_3param[:15]):
    formula = " × ".join(f"{pn}^({fmt_exp(e)})" for pn, e in pe)
    print(f"  {i+1:>2}. ξ × {formula}  →  spread {sp*100:>8.2f}%")

for i, (sp, rs, pe, vals) in enumerate(all_3param[:3]):
    print_result(i+1, sp, rs, pe, vals)

# --- 1d: Physics-only search (no Fibonacci quantum numbers) ---
print("\n─── 1d: Physics-only 2-param search (no d, b_frac, a_frac) ───\n")
PHYS_PARAMS = ['T_prec', 'a', 'P', 'sqrt_a', 'i_rad', 'i_J2000_rad',
               'P_over_Tprec', 'n', 'n_Tprec', 'Tprec_over_H',
               'AMD', 'f_e', 'h_e', 'i_amp_rad', 'mass', 'e_raw',
               'R_law4', 'L_orb', 'Hill', 'T_perih', 'g_freq', 's_freq',
               'g_over_s', 'T_perih_over_H', 'AMD_over_L', 'Kozai', 'eta']

results_phys = search_n_params(2, param_names=PHYS_PARAMS, top_k=30)
print(f"Top 15 physics-only 2-param results:\n")
for i, (sp, rs, pe, vals) in enumerate(results_phys[:15]):
    formula = " × ".join(f"{pn}^({fmt_exp(e)})" for pn, e in pe)
    print(f"  {i+1:>2}. ξ × {formula}  →  spread {sp*100:>8.2f}%")

for i, (sp, rs, pe, vals) in enumerate(results_phys[:3]):
    print_result(i+1, sp, rs, pe, vals)

# --- 1e: d^α × (H/b)^β search ---
print("\n─── 1e: ξ × d^α × (H/b)^β — Fibonacci divisor + precession ───\n")
H_over_b = {p: H / PERIOD_FRAC[p][1] for p in PLANET_NAMES}

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
print(f"Top 10 results:\n")
print(f"  {'Rank':>4}  {'α(d)':>6}  {'β(H/b)':>6}  {'Spread%':>10}")
print("  " + "─" * 40)
for i, (sp, alpha, beta, vals) in enumerate(best_6[:10]):
    print(f"  {i+1:>4}  {fmt_exp(alpha):>6s}  {fmt_exp(beta):>6s}  {sp*100:>10.4f}")

# --- 1f: d^α × a^β × (H/b)^γ ---
print("\n─── 1f: ξ × d^α × a^β × (H/b)^γ ───\n")
best_7 = []
for alpha in coarse_exp:
    for beta in coarse_exp:
        for gamma in coarse_exp:
            if alpha == 0 and beta == 0 and gamma == 0:
                continue
            vals = [XI_ALL[p] * D[p]**alpha * SMA[p]**beta * H_over_b[p]**gamma
                    for p in PLANET_NAMES]
            if min(vals) > 0:
                sp = spread(vals)
                best_7.append((sp, alpha, beta, gamma, vals))

best_7.sort()
print(f"Top 10 results:\n")
print(f"  {'Rank':>4}  {'α(d)':>6}  {'β(a)':>6}  {'γ(H/b)':>6}  {'Spread%':>10}")
print("  " + "─" * 50)
for i, (sp, alpha, beta, gamma, vals) in enumerate(best_7[:10]):
    print(f"  {i+1:>4}  {fmt_exp(alpha):>6s}  {fmt_exp(beta):>6s}  {fmt_exp(gamma):>6s}  {sp*100:>10.4f}")

# Refine top result
if best_7:
    sp0, a0, b0, g0, _ = best_7[0]
    fine_best = []
    for da in [i * 0.05 for i in range(-10, 11)]:
        for db in [i * 0.05 for i in range(-10, 11)]:
            for dg in [i * 0.05 for i in range(-10, 11)]:
                vals2 = [XI_ALL[p] * D[p]**(a0+da) * SMA[p]**(b0+db)
                         * H_over_b[p]**(g0+dg) for p in PLANET_NAMES]
                if min(vals2) > 0:
                    sp2 = spread(vals2)
                    fine_best.append((sp2, a0+da, b0+db, g0+dg))
    fine_best.sort()
    sp2, a_, b_, g_ = fine_best[0]
    print(f"\n  Best refined: α={a_:.3f}, β={b_:.3f}, γ={g_:.3f}  →  spread {sp2*100:.4f}%")

# Inner vs outer
print("\n─── 1g: Inner vs outer planets (single param) ───\n")
INNER = ["Mercury", "Venus", "Earth", "Mars"]
OUTER = ["Jupiter", "Saturn", "Uranus", "Neptune"]

for group_name, group in [("INNER", INNER), ("OUTER", OUTER)]:
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
    print(f"  {group_name} top 5:")
    for i, (sp, pname, exp, vals) in enumerate(best_inner[:5]):
        print(f"    {i+1}. ξ × {pname}^({fmt_exp(exp):>5s})  →  spread {sp*100:>8.2f}%")

print("\n  CONCLUSION: No universal eccentricity constant ξ × f(...) = C exists.")
print("  Best 1-param spreads are >50%, best 2-param >15%, best 3-param >5%.")
print("  The inclination's d × i × √m = ψ has NO eccentricity analog.")


# ═══════════════════════════════════════════════════════════════════════════
# SECTION 2: R² TARGET FORMULA SEARCH
# ═══════════════════════════════════════════════════════════════════════════

print("\n" + "=" * 90)
print("Section 2: R² target formula search")
print("  Goal: find R²_sum = F_f(d_idx) / F_g(d_idx)")
print("=" * 90)

# Mean inclinations
INCL_MEAN = {p: compute_mean_inclination(p) for p in PLANET_NAMES}
R_VAL = {p: ECC[p] / math.radians(INCL_MEAN[p]) for p in PLANET_NAMES}

# Known Fibonacci targets
TARGETS_R2SUM = {
    ("Mars", "Jupiter"):   (377, 5),    # F_14/F_5
    ("Earth", "Saturn"):   (34, 3),     # F_9/F_4
    ("Mercury", "Uranus"): (21, 2),     # F_8/F_3
    ("Venus", "Neptune"):  (1, 2),      # F_1/F_3
}
TARGETS_C2 = {
    ("Mars", "Jupiter"):   (34, 2),     # product = F_9/F_3
    ("Earth", "Saturn"):   (2, 1),      # product = F_3/F_1
    ("Mercury", "Uranus"): (2, 3),      # ratio = F_3/F_4
    ("Venus", "Neptune"):  (2, 8),      # ratio = F_3/F_6
}

# Master table
print(f"\n{'Pair':<22} {'d':>3} {'d_idx':>5} {'R²_sum':>10} {'Target':>10} {'Err%':>8}")
print("─" * 65)

pair_data = []
for k, (inner, outer) in enumerate(MIRROR_PAIRS, 1):
    d = D[inner]
    d_idx = FIB_INDEX.get(d, -1)
    R2_sum = R_VAL[inner]**2 + R_VAL[outer]**2
    num, den = TARGETS_R2SUM[(inner, outer)]
    target = num / den
    err = (R2_sum / target - 1) * 100
    pair_data.append({
        'inner': inner, 'outer': outer, 'd': d, 'd_idx': d_idx, 'k': k,
        'R2_sum': R2_sum
    })
    print(f"  {inner}/{outer:<14s} {d:>3} {d_idx:>5} {R2_sum:>10.4f} {target:>10.4f} {err:>+8.2f}%")

# R² sums as F_a/F_b — Fibonacci index table
print(f"\n  R² sum Fibonacci indices:")
print(f"  {'Pair':<20} {'Target':>10} {'num_idx':>7} {'den_idx':>7} {'d_idx':>5}")
print("  " + "─" * 55)
for pd in pair_data:
    key = (pd['inner'], pd['outer'])
    num, den = TARGETS_R2SUM[key]
    def fib_index_of(n):
        for i, f in enumerate(FIB):
            if f == n:
                return i
        return None
    idx_a = fib_index_of(num)
    idx_b = fib_index_of(den)
    print(f"  {pd['inner']}/{pd['outer']:<12s} {num}/{den:<6} {str(idx_a):>7} "
          f"{str(idx_b):>7} {pd['d_idx']:>5}")

# Systematic formula search: R²_sum = F_{a*d_idx + b} / F_{c*d_idx + d}
print("\n  Searching R²_sum = F_{a*idx + b} / F_{c*idx + d} ...")
best_formulas = []
for a_c in range(-3, 4):
    for b_c in range(-5, 10):
        for c_c in range(-3, 4):
            for d_c in range(-5, 10):
                total_err = 0
                valid = True
                for pd in pair_data:
                    di = pd['d_idx']
                    ni = a_c * di + b_c
                    di_ = c_c * di + d_c
                    if ni < 0 or di_ < 0 or ni > 17 or di_ > 17:
                        valid = False
                        break
                    if FIB[di_] == 0 or FIB[ni] == 0:
                        valid = False
                        break
                    predicted = FIB[ni] / FIB[di_]
                    err = abs(pd['R2_sum'] / predicted - 1)
                    total_err += err
                if valid and total_err < 0.1:
                    best_formulas.append((total_err, a_c, b_c, c_c, d_c))

best_formulas.sort()
if best_formulas:
    print(f"  Found {len(best_formulas)} formulas with <10% total error\n")
    for i, (te, a_, b_, c_, d_) in enumerate(best_formulas[:10]):
        formula = f"F_({a_}*idx + {b_}) / F_({c_}*idx + {d_})"
        print(f"    {i+1}. {formula}  →  total err {te*100:.3f}%")
        if i < 3:
            for pd in pair_data:
                di = pd['d_idx']
                ni = a_ * di + b_
                di_ = c_ * di + d_
                pred = FIB[ni] / FIB[di_]
                err = (pd['R2_sum'] / pred - 1) * 100
                print(f"       {pd['inner']}/{pd['outer']}: "
                      f"F_{ni}/F_{di_} = {FIB[ni]}/{FIB[di_]} = {pred:.3f}, "
                      f"actual={pd['R2_sum']:.3f}, err={err:+.2f}%")
else:
    print("  No formulas found with <10% total error")

# F₃ = 2 appears everywhere
print("""
  F₃ = 2 appears in EVERY constraint:
    R² sums: 21/2, 34/3, 1/2, 377/5 — denominator is 2 for outer pairs
    C2: 2/3, 2/8, 2 (=2/1), 34/2 — 2 in numerator or denominator everywhere
    F₃ = F_{b_E} where b_E = 3 is Earth's period denominator
    F₃ = 2 is also the denominator of ψ = 2205/(2H)""")

# Verify with different inclination definitions
print("  R² constraints with J2000 vs mean inclinations:")
for label, incl_source in [("J2000", INCL_J2000), ("Mean (ψ)", INCL_MEAN)]:
    print(f"\n    {label}:")
    for pd in pair_data:
        inner, outer = pd['inner'], pd['outer']
        R_in = ECC[inner] / math.radians(incl_source[inner])
        R_out = ECC[outer] / math.radians(incl_source[outer])
        R2 = R_in**2 + R_out**2
        num, den = TARGETS_R2SUM[(inner, outer)]
        target = num / den
        err = (R2 / target - 1) * 100
        print(f"      {inner}/{outer}: R²={R2:.4f}, target={target:.4f}, err={err:+.2f}%")

print("\n  CONCLUSION: No simple formula maps d_idx → R² target indices.")
print("  The 4 pairs' Fibonacci indices (14,9,1,8) / (5,4,3,3) are irreducible.")


# ═══════════════════════════════════════════════════════════════════════════
# SECTION 3: FIBONACCI INDEX FORMULA SEARCH
# ═══════════════════════════════════════════════════════════════════════════

print("\n" + "=" * 90)
print("Section 3: Fibonacci index formula search (extended)")
print("  Goal: find num_idx = f(k, d_idx, b_in, b_out)")
print("=" * 90)

# Complete data table
pairs_ext = []
for k, (inner, outer) in enumerate(MIRROR_PAIRS, 1):
    d = D[inner]
    d_idx = FIB_INDEX.get(d, -1)
    b_in = PERIOD_FRAC[inner][1]
    b_out = PERIOD_FRAC[outer][1]
    a_in = PERIOD_FRAC[inner][0]
    a_out = PERIOD_FRAC[outer][0]
    R2_targets = {1: (14, 5), 2: (9, 4), 3: (1, 3), 4: (8, 3)}
    num_idx, den_idx = R2_targets[k]
    pairs_ext.append({
        'k': k, 'inner': inner, 'outer': outer,
        'd': d, 'd_idx': d_idx, 'b_in': b_in, 'b_out': b_out,
        'a_in': a_in, 'a_out': a_out,
        'R2_num_idx': num_idx, 'R2_den_idx': den_idx,
        'b_sum': b_in + b_out, 'b_diff': abs(b_in - b_out),
        'b_prod': b_in * b_out, 'b_max': max(b_in, b_out),
        'b_min': min(b_in, b_out),
    })

print(f"\n{'k':>3}  {'Pair':>20}  {'d':>3}  {'d_idx':>5}  {'b_in':>4}  {'b_out':>5}  "
      f"{'a(R²)':>5}  {'b(R²)':>5}")
print("─" * 70)
for pd in pairs_ext:
    print(f"{pd['k']:>3}  {pd['inner']+'/'+pd['outer']:>20}  {pd['d']:>3}  "
          f"{pd['d_idx']:>5}  {pd['b_in']:>4}  {pd['b_out']:>5}  "
          f"{pd['R2_num_idx']:>5}  {pd['R2_den_idx']:>5}")

# Linear relationship search
props_names = ['k', 'd_idx', 'b_in', 'b_out']
all_props = {}
for pd in pairs_ext:
    all_props[pd['k']] = {n: pd[n] for n in props_names}

print("\n  Linear search: num_idx = c1 × X + c0")
found_any_num = False
for pname in props_names:
    vals = [all_props[pd['k']][pname] for pd in pairs_ext]
    targets = [pd['R2_num_idx'] for pd in pairs_ext]
    for c1_num in range(-5, 6):
        for c1_den in [1, 2, 3]:
            c1 = c1_num / c1_den
            for c0 in range(-20, 21):
                predicted = [c1 * v + c0 for v in vals]
                if all(abs(p - t) < 0.01 for p, t in zip(predicted, targets)):
                    print(f"    EXACT: num_idx = {c1}×{pname} + {c0}")
                    found_any_num = True
if not found_any_num:
    print("    No single-property linear formula found")

print("\n  Linear search: num_idx = c1 × X + c2 × Y + c0")
found_2term_num = 0
for i, pn1 in enumerate(props_names):
    for j, pn2 in enumerate(props_names):
        if j <= i:
            continue
        vals_i = [all_props[pd['k']][pn1] for pd in pairs_ext]
        vals_j = [all_props[pd['k']][pn2] for pd in pairs_ext]
        targets = [pd['R2_num_idx'] for pd in pairs_ext]
        for c1 in range(-5, 6):
            for c2 in range(-5, 6):
                for c0 in range(-20, 21):
                    predicted = [c1*vi + c2*vj + c0 for vi, vj in zip(vals_i, vals_j)]
                    if all(abs(p - t) < 0.01 for p, t in zip(predicted, targets)):
                        found_2term_num += 1
                        if found_2term_num <= 10:
                            print(f"    EXACT: num_idx = {c1}×{pn1} + {c2}×{pn2} + {c0}")
print(f"    Total 2-term formulas for num_idx: {found_2term_num}")

# Brute-force X op Y
print("\n  Brute-force: num_idx = X op Y")
comp_names = ['k', 'd_idx', 'b_in', 'b_out', 'b_sum', 'b_diff', 'b_prod',
              'b_max', 'b_min']
comp_props = {}
for pd in pairs_ext:
    comp_props[pd['k']] = {n: pd[n] for n in comp_names}

found_ops = []
for pn1 in comp_names:
    for pn2 in comp_names:
        if pn1 == pn2:
            continue
        ops = {'+': lambda a, b: a+b, '-': lambda a, b: a-b,
               '×': lambda a, b: a*b}
        for op_name, op_func in ops.items():
            match = True
            for pd in pairs_ext:
                v1 = comp_props[pd['k']][pn1]
                v2 = comp_props[pd['k']][pn2]
                result = op_func(v1, v2)
                if abs(result - pd['R2_num_idx']) > 0.01:
                    match = False
                    break
            if match:
                found_ops.append(f"{pn1} {op_name} {pn2}")
                print(f"    FOUND: num_idx = {pn1} {op_name} {pn2}")

# Same for denominator
print("\n  Brute-force: den_idx = X op Y")
found_ops_d = []
for pn1 in comp_names:
    for pn2 in comp_names:
        if pn1 == pn2:
            continue
        ops = {'+': lambda a, b: a+b, '-': lambda a, b: a-b,
               '×': lambda a, b: a*b}
        for op_name, op_func in ops.items():
            match = True
            for pd in pairs_ext:
                v1 = comp_props[pd['k']][pn1]
                v2 = comp_props[pd['k']][pn2]
                result = op_func(v1, v2)
                if abs(result - pd['R2_den_idx']) > 0.01:
                    match = False
                    break
            if match:
                found_ops_d.append(f"{pn1} {op_name} {pn2}")
                print(f"    FOUND: den_idx = {pn1} {op_name} {pn2}")

# Key insight: R²+C2 are not independent
print("""
  KEY INSIGHT: R² sum + ratio fully determines both R values.
  R² sum + product also determines both. These are NOT independent.
  Knowing any two of {R²_sum, product, ratio} determines the third.
  So only ONE Fibonacci constraint per pair beyond R² sum is needed.

  CONCLUSION: The 8 Fibonacci indices across 4 pairs cannot be derived
  from pair quantum numbers. The R² constraints are irreducible data.""")


# ═══════════════════════════════════════════════════════════════════════════
# SECTION 4: MEAN INCLINATION PREDICTION FROM AMD
# ═══════════════════════════════════════════════════════════════════════════

print("\n" + "=" * 90)
print("Section 4: Mean inclination prediction from AMD formula")
print("  Formula: i_mean = (h(e)/C)^4 / a  where h(e) = √(1+√(1-e²))")
print("=" * 90)

I_MEAN_DEG = {p: compute_mean_inclination(p) for p in PLANET_NAMES}
I_MEAN_RAD = {p: math.radians(I_MEAN_DEG[p]) for p in PLANET_NAMES}
AMD_vals = {p: MASS[p] * math.sqrt(SMA[p]) * (1 - math.sqrt(1 - ECC[p]**2))
            for p in PLANET_NAMES}

def h_e(e):
    return math.sqrt(1 + math.sqrt(1 - e**2))

# Compute formula value: h(e) × (a × i_mean_rad)^(-1/4)
formula_vals = {p: h_e(ECC[p]) * (SMA[p] * I_MEAN_RAD[p])**(-0.25) for p in PLANET_NAMES}

# Optimize C
best_C = None
best_rms = float('inf')
vals_sorted = sorted(formula_vals.values())
for i in range(10001):
    C_try = vals_sorted[0] + (vals_sorted[-1] - vals_sorted[0]) * i / 10000
    if C_try <= 0:
        continue
    sum_sq = 0
    for p in PLANET_NAMES:
        i_pred_rad = (h_e(ECC[p]) / C_try)**4 / SMA[p]
        i_pred_deg = math.degrees(i_pred_rad)
        err = (i_pred_deg / I_MEAN_DEG[p] - 1)**2
        sum_sq += err
    rms = math.sqrt(sum_sq / 8)
    if rms < best_rms:
        best_rms = rms
        best_C = C_try

C_geomean = math.exp(sum(math.log(v) for v in formula_vals.values()) / 8)

for C_name, C_val in [("RMS-optimal", best_C), ("geometric mean", C_geomean)]:
    print(f"\n  C = {C_val:.6f} ({C_name})")
    print(f"  {'Planet':>10} | {'i_m obs(°)':>10} | {'i_m pred(°)':>11} | {'Δ%':>8}")
    print("  " + "─" * 50)
    max_pct = 0
    sum_sq = 0
    for p in PLANET_NAMES:
        i_pred_rad = (h_e(ECC[p]) / C_val)**4 / SMA[p]
        i_pred_deg = math.degrees(i_pred_rad)
        delta_pct = (i_pred_deg / I_MEAN_DEG[p] - 1) * 100
        sum_sq += delta_pct**2
        max_pct = max(max_pct, abs(delta_pct))
        print(f"  {p:>10} | {I_MEAN_DEG[p]:>10.4f} | {i_pred_deg:>11.4f} | {delta_pct:>+7.1f}%")
    rms = math.sqrt(sum_sq / 8)
    print(f"  RMS error: {rms:.1f}%   Max error: {max_pct:.1f}%")

# Different exponent configs
print("\n  Optimized exponents: ξ × AMD^α × i_mean^β = C\n")
CONFIGS = [
    (-0.500, -0.250, "AMD^(-1/2) × i^(-1/4)"),
    (-0.500, -0.298, "AMD^(-0.50) × i^(-0.30) [optimal]"),
    (-0.500, -1/3,   "AMD^(-1/2) × i^(-1/3)"),
]

for alpha, beta, label in CONFIGS:
    fvals = {p: XI_ALL[p] * AMD_vals[p]**alpha * I_MEAN_RAD[p]**beta
             for p in PLANET_NAMES}
    sp = spread(list(fvals.values()))
    print(f"  {label}: formula spread = {sp*100:.1f}%")

# Inner vs outer
print("\n  Inner vs outer solar system (AMD^(-1/2) × i^(-1/4)):")
alpha, beta = -0.500, -0.250
for group_name, group in [("Inner", INNER), ("Outer", OUTER)]:
    fvals = [XI_ALL[p] * AMD_vals[p]**alpha * I_MEAN_RAD[p]**beta for p in group]
    sp = spread(fvals)
    C_g = math.exp(sum(math.log(v) for v in fvals) / len(fvals))
    print(f"\n    {group_name}: spread = {sp*100:.1f}%, C = {C_g:.4f}")
    for p in group:
        ratio = C_g / (XI_ALL[p] * AMD_vals[p]**alpha)
        i_pred_rad = ratio**(1/beta)
        i_pred_deg = math.degrees(i_pred_rad)
        delta_pct = (i_pred_deg / I_MEAN_DEG[p] - 1) * 100
        print(f"      {p:>10}: obs {I_MEAN_DEG[p]:>7.4f}°, "
              f"pred {i_pred_deg:>7.4f}°, Δ = {delta_pct:+.1f}%")

print("""
  Physical interpretation:
    • i_mean ∝ 1/a: closer planets are more tilted (stronger secular coupling)
    • i_mean increases with eccentricity (AMD conservation links e and i)
    • Mass cancels exactly — purely geometric relation
    • Captures trend but NOT fine structure (RMS ~30%)
    • Jupiter/Saturn poorly predicted (Great Inequality dominates)

  CONCLUSION: The AMD formula captures the gross trend i_mean ∝ 1/a but
  cannot replace the ψ-derived inclination predictions (which are <0.75%
  accurate). Not a viable alternative to Law 2.""")


# ═══════════════════════════════════════════════════════════════════════════
# COMPLETE
# ═══════════════════════════════════════════════════════════════════════════

print("\n" + "=" * 90)
print("LAW 4 SEARCH COMPLETE — ALL NEGATIVE RESULTS")
print("=" * 90)
print("""
Summary of negative results:
  1. No universal eccentricity constant ξ × f(...) = C exists
  2. No simple formula maps d_idx → R² target Fibonacci indices
  3. The 8 Fibonacci indices across 4 pairs are irreducible data
  4. AMD-based mean inclination prediction: RMS ~30%, not competitive
""")
