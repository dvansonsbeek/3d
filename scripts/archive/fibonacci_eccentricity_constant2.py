#!/usr/bin/env python3
"""
ECCENTRICITY CONSTANT SEARCH — Part 2 (Targeted Physical Exploration)
======================================================================

Building on the best results from the main search:
  Best physics-only: ξ × T_prec^1.75 × √a^0.05 × i_rad^0.85 × i_J2000^-0.6 → 249%
  Best with Fibonacci: ξ × x_2H^-1 × i_rad × b_frac^-1 → 79%

The gap tells us: Fibonacci quantum numbers carry info that physical parameters don't.
This script explores what PHYSICAL information might close the gap.

Key new ideas:
  1. Mass as separate parameter (to decouple e from √m in ξ)
  2. η = i_amp × √m (mass-weighted inclination = ψ/d, encodes d naturally)
  3. Bare eccentricity e (without mass weighting)
  4. Cross-parameter ratios (ξ/η, AMD quantities)
  5. Investigate mirror-pair structure
"""

import sys, os, math
from itertools import product

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from fibonacci_data import *

# ═══════════════════════════════════════════════════════════════════════════
# COMPUTE ALL PARAMETERS
# ═══════════════════════════════════════════════════════════════════════════

XI_ALL = {p: ECC[p] * SQRT_M[p] for p in PLANET_NAMES}
XI_V = XI_ALL['Venus']
ETA_ALL = {p: INCL_AMP[p] * SQRT_M[p] for p in PLANET_NAMES}  # = ψ/d

PARAMS = {}

def add_param(name, desc, values):
    PARAMS[name] = {'desc': desc, 'values': values}

# Standard orbital elements
add_param('T_prec', 'Inclination precession period (yr)',
          {p: float(INCL_PERIOD[p]) for p in PLANET_NAMES})
add_param('a', 'Semi-major axis (AU)',
          {p: SMA[p] for p in PLANET_NAMES})
add_param('P', 'Orbital period (yr)',
          {p: ORBITAL_PERIOD[p] for p in PLANET_NAMES})
add_param('i_rad', 'Model inclination amplitude (rad)',
          {p: math.radians(INCL_AMP[p]) for p in PLANET_NAMES})
add_param('i_J2000', 'J2000 inclination (rad)',
          {p: math.radians(INCL_J2000[p]) for p in PLANET_NAMES})

# Mass-related (separate from ξ)
add_param('m', 'Planet mass (solar units)',
          {p: MASS[p] for p in PLANET_NAMES})
add_param('sqrt_m', '√m',
          {p: SQRT_M[p] for p in PLANET_NAMES})

# AMD-natural variables
add_param('eta', 'η = i_amp × √m (mass-weighted inclination = ψ/d)',
          {p: ETA_ALL[p] for p in PLANET_NAMES})
add_param('Lambda', 'Λ = m × √a (Delaunay action)',
          {p: MASS[p] * math.sqrt(SMA[p]) for p in PLANET_NAMES})
add_param('AMD_ecc', 'AMD_ecc ≈ m√a × e²/2',
          {p: MASS[p] * math.sqrt(SMA[p]) * ECC[p]**2 / 2 for p in PLANET_NAMES})
add_param('AMD_incl', 'AMD_incl ≈ m√a × i²/2 (i in rad)',
          {p: MASS[p] * math.sqrt(SMA[p]) * math.radians(INCL_J2000[p])**2 / 2 for p in PLANET_NAMES})

# Cross-parameter ratios (dimensionless)
add_param('xi_over_eta', 'ξ/η = e/i_amp (ecc/incl ratio)',
          {p: XI_ALL[p] / ETA_ALL[p] for p in PLANET_NAMES})
add_param('e_bare', 'Bare eccentricity (no mass weighting)',
          {p: ECC[p] for p in PLANET_NAMES})
add_param('e_over_i', 'e / i_J2000 (rad)',
          {p: ECC[p] / math.radians(INCL_J2000[p]) for p in PLANET_NAMES})

# Precession-related ratios
add_param('P_over_T', 'P/T_prec (orbits per precession)',
          {p: ORBITAL_PERIOD[p] / INCL_PERIOD[p] for p in PLANET_NAMES})
add_param('T_over_H', 'T_prec/H',
          {p: INCL_PERIOD[p] / H for p in PLANET_NAMES})
add_param('sqrt_a', '√a',
          {p: math.sqrt(SMA[p]) for p in PLANET_NAMES})

# Orbital velocity / angular momentum related
add_param('v_orb', 'Orbital velocity ∝ 1/√a (v = 2π/P × a)',
          {p: 2 * math.pi * SMA[p] / ORBITAL_PERIOD[p] for p in PLANET_NAMES})
add_param('L_orb', 'Specific ang. momentum ∝ √a',
          {p: math.sqrt(SMA[p]) for p in PLANET_NAMES})
add_param('n_T', 'n × T_prec (orbits in radians per prec.)',
          {p: 2 * math.pi / ORBITAL_PERIOD[p] * INCL_PERIOD[p] for p in PLANET_NAMES})


# ═══════════════════════════════════════════════════════════════════════════
# SEARCH UTILITIES
# ═══════════════════════════════════════════════════════════════════════════

EXPONENTS = [-2, -3/2, -1, -2/3, -1/2, -1/3, 0, 1/3, 1/2, 2/3, 1, 3/2, 2]
COARSE = [-2, -1, -1/2, 0, 1/2, 1, 2]

def fmt_exp(e):
    fracs = {-2: '-2', -1.5: '-3/2', -1: '-1', -2/3: '-2/3', -0.5: '-1/2',
             -1/3: '-1/3', 0: '0', 1/3: '1/3', 0.5: '1/2', 2/3: '2/3',
             1: '1', 1.5: '3/2', 2: '2'}
    for k, v in fracs.items():
        if abs(e - k) < 0.001:
            return v
    return f'{e:.3f}'

def spread(values):
    mn, mx = min(values), max(values)
    if mn <= 0: return float('inf')
    return mx / mn - 1

def evaluate(param_exp_list, base='xi'):
    """Evaluate base × ∏ param_i^exp_i for all planets."""
    result = []
    for p in PLANET_NAMES:
        if base == 'xi':
            val = XI_ALL[p]
        elif base == 'e':
            val = ECC[p]
        elif base == 'eta':
            val = ETA_ALL[p]
        else:
            val = 1.0
        for pname, exp in param_exp_list:
            val *= PARAMS[pname]['values'][p] ** exp
        result.append(val)
    return result

def refine(param_exp_list, base='xi', step=0.05, rng=0.5):
    """Fine-grid refinement."""
    param_names = [pe[0] for pe in param_exp_list]
    center_exps = [pe[1] for pe in param_exp_list]
    n = len(param_exp_list)

    fine_exps = []
    for c in center_exps:
        fine_exps.append([c + i * step for i in range(int(-rng/step), int(rng/step) + 1)])

    best_sp = float('inf')
    best_result = None

    for exps in product(*fine_exps):
        param_exp = list(zip(param_names, exps))
        vals = evaluate(param_exp, base=base)
        if min(vals) > 0:
            sp = spread(vals)
            if sp < best_sp:
                best_sp = sp
                best_result = (sp, param_exp, vals)
    return best_result


# ═══════════════════════════════════════════════════════════════════════════
print("=" * 90)
print("ECCENTRICITY CONSTANT SEARCH — Part 2")
print("=" * 90)

# ═══════════════════════════════════════════════════════════════════════════
# SECTION A: DIAGNOSTIC — why does η help so much?
# ═══════════════════════════════════════════════════════════════════════════

print("\n" + "─" * 90)
print("SECTION A: Diagnostic — parameter values for each planet")
print("─" * 90)

print(f"\n{'Planet':>10} | {'ξ':>10} | {'ξ/ξ_V':>8} | {'η':>10} | {'ψ/d':>10} | {'d':>4} | {'b':>4} | {'a_fr':>4} | {'e':>10} | {'i_amp(°)':>8} | {'m':>10} | {'T_prec':>8} | {'a':>7}")
print("─" * 140)
for p in PLANET_NAMES:
    a_f, b_f = PERIOD_FRAC[p]
    print(f"{p:>10} | {XI_ALL[p]:.4e} | {XI_ALL[p]/XI_V:>8.3f} | {ETA_ALL[p]:.4e} | {PSI/D[p]:.4e} | {D[p]:>4} | {b_f:>4} | {a_f:>4} | {ECC[p]:.6f} | {INCL_AMP[p]:>8.4f} | {MASS[p]:.4e} | {INCL_PERIOD[p]:>8.0f} | {SMA[p]:>7.3f}")

print(f"\n  ψ = {PSI:.6e}")
print(f"  ξ_V = {XI_V:.6e}")
print(f"  R = ψ/ξ_V = {PSI/XI_V:.4f}")

# Key ratio: ξ/η for each planet (= e/i_amp)
print(f"\n  ξ/η = e/i_amp (cross-parameter ratio):")
for p in PLANET_NAMES:
    print(f"    {p:>10}: ξ/η = {XI_ALL[p]/ETA_ALL[p]:>10.4f}  (e/i_amp = {ECC[p]/INCL_AMP[p]:>10.4f})")


# ═══════════════════════════════════════════════════════════════════════════
# SECTION B: ξ with η (mass-weighted inclination) — can we connect ecc to incl?
# ═══════════════════════════════════════════════════════════════════════════

print("\n" + "=" * 90)
print("SECTION B: ξ × η^α × (physical)^β = constant?")
print("η = ψ/d encodes the Fibonacci divisor naturally")
print("=" * 90)

# Try: ξ × η^α for various α
print("\n─── B1: ξ × η^α (single parameter) ───\n")
for alpha in EXPONENTS:
    if alpha == 0: continue
    vals = [XI_ALL[p] * ETA_ALL[p]**alpha for p in PLANET_NAMES]
    sp = spread(vals)
    print(f"  α={fmt_exp(alpha):>5s}  →  spread {sp*100:>8.2f}%")

# Try: ξ × η^α × T_prec^β
print("\n─── B2: ξ × η^α × T_prec^β ───\n")
best_b2 = []
for alpha in EXPONENTS:
    for beta in EXPONENTS:
        if alpha == 0 and beta == 0: continue
        vals = [XI_ALL[p] * ETA_ALL[p]**alpha * INCL_PERIOD[p]**beta for p in PLANET_NAMES]
        if min(vals) > 0:
            sp = spread(vals)
            best_b2.append((sp, alpha, beta, vals))
best_b2.sort()
print("Top 20:")
for i, (sp, a, b, vals) in enumerate(best_b2[:20]):
    print(f"  {i+1:>2}. ξ × η^({fmt_exp(a):>5s}) × T_prec^({fmt_exp(b):>5s})  →  spread {sp*100:>8.2f}%")

# Show details + refine top 3
for i, (sp, a, b, vals) in enumerate(best_b2[:3]):
    print(f"\n  Rank {i+1}: ξ × η^({fmt_exp(a)}) × T_prec^({fmt_exp(b)})")
    print(f"  Spread: {sp*100:.4f}%")
    for j, p in enumerate(PLANET_NAMES):
        print(f"    {p:>10}: {vals[j]:.6e}")

    # Refine
    best_ref = (sp, a, b, vals)
    for da in [i * 0.05 for i in range(-10, 11)]:
        for db in [i * 0.05 for i in range(-10, 11)]:
            a2, b2 = a + da, b + db
            vals2 = [XI_ALL[p] * ETA_ALL[p]**a2 * INCL_PERIOD[p]**b2 for p in PLANET_NAMES]
            if min(vals2) > 0:
                sp2 = spread(vals2)
                if sp2 < best_ref[0]:
                    best_ref = (sp2, a2, b2, vals2)
    print(f"  → Refined: η^({best_ref[1]:.3f}) × T_prec^({best_ref[2]:.3f})  spread={best_ref[0]*100:.4f}%")


# ═══════════════════════════════════════════════════════════════════════════
# SECTION C: ξ × η^α × T_prec^β × (third param)^γ
# ═══════════════════════════════════════════════════════════════════════════

print("\n" + "=" * 90)
print("SECTION C: ξ × η^α × T_prec^β × (third)^γ — 3-parameter with η")
print("=" * 90)

THIRD_PARAMS = ['a', 'P', 'sqrt_a', 'i_J2000', 'm', 'sqrt_m', 'P_over_T',
                'v_orb', 'e_bare', 'n_T', 'e_over_i', 'Lambda']

all_c = []
for tname in THIRD_PARAMS:
    for alpha in COARSE:
        for beta in COARSE:
            for gamma in COARSE:
                if alpha == 0 and beta == 0 and gamma == 0: continue
                vals = [XI_ALL[p] * ETA_ALL[p]**alpha * INCL_PERIOD[p]**beta
                        * PARAMS[tname]['values'][p]**gamma for p in PLANET_NAMES]
                if min(vals) > 0:
                    sp = spread(vals)
                    all_c.append((sp, alpha, beta, gamma, tname, vals))

all_c.sort()
print(f"\nTested {len(all_c)} combinations\n")
print("Top 30 results:\n")
for i, (sp, a, b, g, tname, vals) in enumerate(all_c[:30]):
    print(f"  {i+1:>2}. ξ × η^({fmt_exp(a):>5s}) × T^({fmt_exp(b):>5s}) × {tname}^({fmt_exp(g):>5s})  →  spread {sp*100:>8.2f}%")

# Details + refine top 5
for i, (sp, a, b, g, tname, vals) in enumerate(all_c[:5]):
    print(f"\n  Rank {i+1}: ξ × η^({fmt_exp(a)}) × T_prec^({fmt_exp(b)}) × {tname}^({fmt_exp(g)})")
    print(f"  Spread: {sp*100:.4f}%")
    for j, p in enumerate(PLANET_NAMES):
        print(f"    {p:>10}: {vals[j]:.6e}")

    param_exp = [('eta', a), ('T_prec', b), (tname, g)]
    ref = refine(param_exp)
    if ref:
        rsp, rpe, rvals = ref
        formula = " × ".join(f"{pn}^({fmt_exp(e)})" for pn, e in rpe)
        print(f"  → Refined: {formula}  spread={rsp*100:.4f}%")
        for j, p in enumerate(PLANET_NAMES):
            print(f"      {p:>10}: {rvals[j]:.6e}")


# ═══════════════════════════════════════════════════════════════════════════
# SECTION D: Start from bare eccentricity e instead of ξ
# ═══════════════════════════════════════════════════════════════════════════

print("\n" + "=" * 90)
print("SECTION D: Start from bare e (not ξ) — e × f(...) = constant?")
print("Maybe the constant works better without mass weighting")
print("=" * 90)

# D1: e × (single param)^α
print("\n─── D1: e × param^α (single parameter) ───\n")
best_d1 = []
for pname in PARAMS:
    for exp in EXPONENTS:
        if exp == 0: continue
        vals = [ECC[p] * PARAMS[pname]['values'][p]**exp for p in PLANET_NAMES]
        if min(vals) > 0:
            sp = spread(vals)
            best_d1.append((sp, pname, exp, vals))
best_d1.sort()
print("Top 15 (starting from bare e):")
for i, (sp, pname, exp, vals) in enumerate(best_d1[:15]):
    print(f"  {i+1:>2}. e × {pname}^({fmt_exp(exp):>5s})  →  spread {sp*100:>8.2f}%")

# D2: e × p1^α × p2^β
print("\n─── D2: e × p1^α × p2^β (two parameters) ───\n")
D2_PAIRS = [
    ('T_prec', 'eta'), ('T_prec', 'm'), ('T_prec', 'sqrt_m'),
    ('T_prec', 'a'), ('T_prec', 'i_J2000'), ('T_prec', 'i_rad'),
    ('eta', 'a'), ('eta', 'P'), ('eta', 'm'), ('eta', 'sqrt_m'),
    ('eta', 'i_J2000'), ('eta', 'sqrt_a'),
    ('m', 'a'), ('m', 'P'), ('m', 'i_rad'), ('m', 'i_J2000'),
    ('sqrt_m', 'a'), ('sqrt_m', 'i_rad'), ('sqrt_m', 'T_prec'),
    ('P_over_T', 'eta'), ('P_over_T', 'm'), ('P_over_T', 'a'),
    ('Lambda', 'eta'), ('Lambda', 'T_prec'), ('Lambda', 'i_J2000'),
    ('T_over_H', 'eta'), ('T_over_H', 'm'), ('T_over_H', 'a'),
]

best_d2 = []
for p1, p2 in D2_PAIRS:
    for a in EXPONENTS:
        for b in EXPONENTS:
            if a == 0 and b == 0: continue
            vals = [ECC[p] * PARAMS[p1]['values'][p]**a * PARAMS[p2]['values'][p]**b
                    for p in PLANET_NAMES]
            if min(vals) > 0:
                sp = spread(vals)
                best_d2.append((sp, p1, a, p2, b, vals))

best_d2.sort()
print("Top 20 (starting from bare e):")
for i, (sp, p1, a, p2, b, vals) in enumerate(best_d2[:20]):
    print(f"  {i+1:>2}. e × {p1}^({fmt_exp(a):>5s}) × {p2}^({fmt_exp(b):>5s})  →  spread {sp*100:>8.2f}%")

# Details + refine top 3
for i, (sp, p1, a, p2, b, vals) in enumerate(best_d2[:3]):
    print(f"\n  Rank {i+1}: e × {p1}^({fmt_exp(a)}) × {p2}^({fmt_exp(b)})")
    print(f"  Spread: {sp*100:.4f}%")
    for j, p in enumerate(PLANET_NAMES):
        print(f"    {p:>10}: {vals[j]:.6e}")

    param_exp = [(p1, a), (p2, b)]
    ref = refine(param_exp, base='e')
    if ref:
        rsp, rpe, rvals = ref
        formula = " × ".join(f"{pn}^({fmt_exp(e)})" for pn, e in rpe)
        print(f"  → Refined: e × {formula}  spread={rsp*100:.4f}%")


# ═══════════════════════════════════════════════════════════════════════════
# SECTION E: MIRROR PAIR ANALYSIS
# ═══════════════════════════════════════════════════════════════════════════

print("\n" + "=" * 90)
print("SECTION E: Mirror pair analysis — what differs within pairs?")
print("=" * 90)

for inner, outer in MIRROR_PAIRS:
    d_val = D[inner]
    xi_ratio = XI_ALL[outer] / XI_ALL[inner]
    e_ratio = ECC[outer] / ECC[inner]
    m_ratio = MASS[outer] / MASS[inner]
    a_ratio = SMA[outer] / SMA[inner]
    P_ratio = ORBITAL_PERIOD[outer] / ORBITAL_PERIOD[inner]
    T_ratio = INCL_PERIOD[outer] / INCL_PERIOD[inner]

    print(f"\n  {inner:>10} ↔ {outer:<10}  (d={d_val})")
    print(f"    ξ-ratio:    {xi_ratio:>10.4f}  (ξ_out/ξ_in)")
    print(f"    e-ratio:    {e_ratio:>10.4f}  (bare eccentricity)")
    print(f"    m-ratio:    {m_ratio:>10.4f}  (mass)")
    print(f"    √m-ratio:   {math.sqrt(m_ratio):>10.4f}")
    print(f"    a-ratio:    {a_ratio:>10.4f}  (semi-major axis)")
    print(f"    P-ratio:    {P_ratio:>10.4f}  (orbital period)")
    print(f"    T-ratio:    {T_ratio:>10.4f}  (precession period)")
    print(f"    ξ/(e×a^α):")
    for alpha in [0, 0.5, 1, 1.5, 2]:
        xi_ea_in = XI_ALL[inner] / (ECC[inner] * SMA[inner]**alpha)
        xi_ea_out = XI_ALL[outer] / (ECC[outer] * SMA[outer]**alpha)
        print(f"      α={alpha:.1f}: inner={xi_ea_in:.4e}, outer={xi_ea_out:.4e}, ratio={xi_ea_out/xi_ea_in:.4f}")


# ═══════════════════════════════════════════════════════════════════════════
# SECTION F: The most targeted search — what formula gives ξ_outer/ξ_inner
#            correctly for mirror pairs?
# ═══════════════════════════════════════════════════════════════════════════

print("\n" + "=" * 90)
print("SECTION F: Can orbital elements predict ξ-ratios within mirror pairs?")
print("For each pair: ξ_outer/ξ_inner = f(a, P, m, T_prec)?")
print("=" * 90)

for inner, outer in MIRROR_PAIRS:
    xi_ratio = XI_ALL[outer] / XI_ALL[inner]
    print(f"\n  {inner:>10} ↔ {outer:<10}: ξ-ratio = {xi_ratio:.4f}")

    # Try simple power-law ratios
    best_pairs = []
    for pname in ['a', 'P', 'm', 'sqrt_m', 'T_prec', 'v_orb', 'Lambda']:
        v_in = PARAMS[pname]['values'][inner]
        v_out = PARAMS[pname]['values'][outer]
        for alpha in [-2, -3/2, -1, -1/2, 0, 1/2, 1, 3/2, 2]:
            if alpha == 0: continue
            predicted = (v_out / v_in) ** alpha
            err = abs(predicted / xi_ratio - 1) * 100
            best_pairs.append((err, pname, alpha, predicted))

    best_pairs.sort()
    print(f"    Best single-parameter predictions:")
    for k, (err, pname, alpha, pred) in enumerate(best_pairs[:5]):
        print(f"      ({pname})^{fmt_exp(alpha):>5s}: predicted={pred:>10.4f}, error={err:>6.2f}%")


# ═══════════════════════════════════════════════════════════════════════════
# SECTION G: Comprehensive 3-param: ξ × η^α × T^β × a^γ (most promising)
# ═══════════════════════════════════════════════════════════════════════════

print("\n" + "=" * 90)
print("SECTION G: ξ × η^α × T_prec^β × a^γ — the most promising 3-param combo")
print("(η encodes d, T_prec encodes b_frac, a adds spatial separation)")
print("=" * 90)

best_g = []
fine_exp = [-2, -3/2, -1, -2/3, -1/2, -1/3, 0, 1/3, 1/2, 2/3, 1, 3/2, 2]
for alpha in fine_exp:
    for beta in fine_exp:
        for gamma in fine_exp:
            if alpha == 0 and beta == 0 and gamma == 0: continue
            vals = [XI_ALL[p] * ETA_ALL[p]**alpha * INCL_PERIOD[p]**beta
                    * SMA[p]**gamma for p in PLANET_NAMES]
            if min(vals) > 0:
                sp = spread(vals)
                best_g.append((sp, alpha, beta, gamma, vals))

best_g.sort()
print(f"\nTop 30:\n")
for i, (sp, a, b, g, vals) in enumerate(best_g[:30]):
    print(f"  {i+1:>2}. ξ × η^({fmt_exp(a):>5s}) × T^({fmt_exp(b):>5s}) × a^({fmt_exp(g):>5s})  →  spread {sp*100:>8.2f}%")

# Refine top 5
print("\n─── Refinement ───")
for i, (sp, a, b, g, vals) in enumerate(best_g[:5]):
    best_ref = (sp, a, b, g, vals)
    for da in [j * 0.05 for j in range(-10, 11)]:
        for db in [j * 0.05 for j in range(-10, 11)]:
            for dg in [j * 0.05 for j in range(-10, 11)]:
                a2, b2, g2 = a+da, b+db, g+dg
                vals2 = [XI_ALL[p] * ETA_ALL[p]**a2 * INCL_PERIOD[p]**b2
                         * SMA[p]**g2 for p in PLANET_NAMES]
                if min(vals2) > 0:
                    sp2 = spread(vals2)
                    if sp2 < best_ref[0]:
                        best_ref = (sp2, a2, b2, g2, vals2)
    sp2, a2, b2, g2, vals2 = best_ref
    print(f"\n  Rank {i+1}: η^({a2:.3f}) × T^({b2:.3f}) × a^({g2:.3f})  spread={sp2*100:.4f}%")
    for j, p in enumerate(PLANET_NAMES):
        print(f"    {p:>10}: {vals2[j]:.6e}")


# ═══════════════════════════════════════════════════════════════════════════
# SECTION H: 4-param champion: ξ × η^α × T^β × a^γ × m^δ
# ═══════════════════════════════════════════════════════════════════════════

print("\n" + "=" * 90)
print("SECTION H: ξ × η^α × T^β × a^γ × m^δ — 4 parameters")
print("(m separates mass from eccentricity)")
print("=" * 90)

best_h = []
for alpha in COARSE:
    for beta in COARSE:
        for gamma in COARSE:
            for delta in COARSE:
                if alpha == 0 and beta == 0 and gamma == 0 and delta == 0: continue
                vals = [XI_ALL[p] * ETA_ALL[p]**alpha * INCL_PERIOD[p]**beta
                        * SMA[p]**gamma * MASS[p]**delta for p in PLANET_NAMES]
                if min(vals) > 0:
                    sp = spread(vals)
                    best_h.append((sp, alpha, beta, gamma, delta, vals))

best_h.sort()
print(f"\nTested {len(best_h)} combinations\n")
print("Top 30:\n")
for i, (sp, a, b, g, d, vals) in enumerate(best_h[:30]):
    print(f"  {i+1:>2}. ξ×η^({fmt_exp(a):>5s})×T^({fmt_exp(b):>5s})×a^({fmt_exp(g):>5s})×m^({fmt_exp(d):>5s})  →  spread {sp*100:>8.2f}%")

# Refine top 3
print("\n─── Refinement ───")
for i, (sp, a, b, g, d, vals) in enumerate(best_h[:3]):
    best_ref = (sp, a, b, g, d, vals)
    step = 0.1
    for da in [j * step for j in range(-5, 6)]:
        for db in [j * step for j in range(-5, 6)]:
            for dg in [j * step for j in range(-5, 6)]:
                for dd in [j * step for j in range(-5, 6)]:
                    a2, b2, g2, d2 = a+da, b+db, g+dg, d+dd
                    vals2 = [XI_ALL[p] * ETA_ALL[p]**a2 * INCL_PERIOD[p]**b2
                             * SMA[p]**g2 * MASS[p]**d2 for p in PLANET_NAMES]
                    if min(vals2) > 0:
                        sp2 = spread(vals2)
                        if sp2 < best_ref[0]:
                            best_ref = (sp2, a2, b2, g2, d2, vals2)
    sp2, a2, b2, g2, d2, vals2 = best_ref
    print(f"\n  Rank {i+1}: η^({a2:.3f}) × T^({b2:.3f}) × a^({g2:.3f}) × m^({d2:.3f})  spread={sp2*100:.4f}%")
    for j, p in enumerate(PLANET_NAMES):
        print(f"    {p:>10}: {vals2[j]:.6e}")


# ═══════════════════════════════════════════════════════════════════════════
# SECTION I: Alternative bases — try η×ξ, ξ², or ξ/η as base
# ═══════════════════════════════════════════════════════════════════════════

print("\n" + "=" * 90)
print("SECTION I: Alternative bases — ξ×η, ξ², ξ/η as starting quantities")
print("=" * 90)

for base_name, base_vals in [
    ("ξ × η", {p: XI_ALL[p] * ETA_ALL[p] for p in PLANET_NAMES}),
    ("ξ / η", {p: XI_ALL[p] / ETA_ALL[p] for p in PLANET_NAMES}),
    ("ξ²", {p: XI_ALL[p]**2 for p in PLANET_NAMES}),
    ("e × η", {p: ECC[p] * ETA_ALL[p] for p in PLANET_NAMES}),
]:
    print(f"\n─── Base: {base_name} ───")
    best_base = []
    for pname in ['T_prec', 'a', 'P', 'm', 'sqrt_m', 'P_over_T', 'T_over_H', 'v_orb', 'i_J2000']:
        for exp in EXPONENTS:
            if exp == 0: continue
            vals = [base_vals[p] * PARAMS[pname]['values'][p]**exp for p in PLANET_NAMES]
            if min(vals) > 0:
                sp = spread(vals)
                best_base.append((sp, pname, exp, vals))
    best_base.sort()
    print(f"  Top 5:")
    for k, (sp, pname, exp, vals) in enumerate(best_base[:5]):
        print(f"    {k+1}. {base_name} × {pname}^({fmt_exp(exp):>5s})  →  spread {sp*100:>8.2f}%")


print("\n" + "=" * 90)
print("SEARCH COMPLETE")
print("=" * 90)
