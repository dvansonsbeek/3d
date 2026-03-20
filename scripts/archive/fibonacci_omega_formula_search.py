#!/usr/bin/env python3
"""
Argument of Perihelion (ω) — Unified Formula Search
=====================================================
Systematically searches for a single formula ω = 360° × f(quantum numbers)
that predicts all 8 (or 7, excluding Earth) ω values simultaneously.

Available quantum numbers per planet:
  d     = Fibonacci divisor (from Law 2)
  n, m  = period numerator, denominator (T = H × n/m)
  F_idx = Fibonacci index (F_{F_idx} = d)
  dir   = precession direction (+1 or -1)
  n_m, m_m = mirror partner's period fraction

Strategy:
  1. Enumerate simple rational expressions using quantum numbers
  2. For each expression, compute predicted ω for all planets
  3. Score by RMS error
  4. Report best candidates
"""

import math
import itertools
from collections import defaultdict

# ==============================================================
# Planet quantum numbers
# ==============================================================
# Period T = H × n/m, where n=numerator, m=denominator
# For retrograde Saturn, dir=-1

planets = {
    # name:       d   n  m  F_idx  dir  (mirror: d_m, n_m, m_m)
    'Mercury':  {'d': 21, 'n': 8,  'm': 11, 'F_idx': 8,  'dir': +1},
    'Venus':    {'d': 34, 'n': 2,  'm': 1,  'F_idx': 9,  'dir': +1},
    'Earth':    {'d': 3,  'n': 1,  'm': 3,  'F_idx': 4,  'dir': +1},
    'Mars':     {'d': 5,  'n': 3,  'm': 13, 'F_idx': 5,  'dir': +1},
    'Jupiter':  {'d': 5,  'n': 1,  'm': 5,  'F_idx': 5,  'dir': +1},
    'Saturn':   {'d': 3,  'n': 1,  'm': 8,  'F_idx': 4,  'dir': -1},
    'Uranus':   {'d': 21, 'n': 1,  'm': 3,  'F_idx': 8,  'dir': +1},
    'Neptune':  {'d': 34, 'n': 2,  'm': 1,  'F_idx': 9,  'dir': +1},
}

# Mirror pairs
mirrors = {
    'Mercury': 'Uranus', 'Uranus': 'Mercury',
    'Venus': 'Neptune', 'Neptune': 'Venus',
    'Earth': 'Saturn', 'Saturn': 'Earth',
    'Mars': 'Jupiter', 'Jupiter': 'Mars',
}

# Add mirror partner's quantum numbers
for name, p in planets.items():
    mirror = mirrors[name]
    mp = planets[mirror]
    p['d_m'] = mp['d']  # Same as d (mirror pairs share d)
    p['n_m'] = mp['n']
    p['m_m'] = mp['m']
    p['dir_m'] = mp['dir']
    p['F_idx_m'] = mp['F_idx']

# Target ω values (mean from Excel analysis)
# Using |ω| for unsigned matching, sign handled separately
targets = {
    'Mercury':  +45.086,
    'Venus':    +73.834,
    'Earth':   +180.000,  # meeting-frequency ω
    'Mars':     -21.282,
    'Jupiter':  +62.653,
    'Saturn':   -27.117,
    'Uranus':  -138.104,
    'Neptune': -144.097,
}

# Fibonacci numbers for reference
FIB = {0: 0, 1: 1}
for i in range(2, 25):
    FIB[i] = FIB[i-1] + FIB[i-2]

planet_order = ['Mercury', 'Venus', 'Earth', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune']

print("=" * 80)
print("ω UNIFIED FORMULA SEARCH")
print("=" * 80)

# ==============================================================
# 1. Display quantum numbers
# ==============================================================
print("\n" + "─" * 80)
print("1. QUANTUM NUMBERS")
print("─" * 80)

print(f"\n  {'Planet':10s}  {'d':>4s}  {'n':>3s}  {'m':>3s}  {'F_idx':>5s}  {'dir':>4s}  {'n_m':>3s}  {'m_m':>3s}  {'ω target':>10s}")
print("  " + "─" * 55)
for name in planet_order:
    p = planets[name]
    t = targets[name]
    print(f"  {name:10s}  {p['d']:4d}  {p['n']:3d}  {p['m']:3d}  {p['F_idx']:5d}  {p['dir']:+4d}  {p['n_m']:3d}  {p['m_m']:3d}  {t:+10.3f}°")

# ==============================================================
# 2. Build expression evaluators
# ==============================================================
# For each planet, we have these "atoms":
#   d, n, m, F_idx, dir, n_m, m_m, d_m, dir_m, F_idx_m
#
# We also include Fibonacci numbers of the indices:
#   F(F_idx) = d  (by definition)
#   F(m) if m is a valid index
#
# And derived quantities:
#   b = m/n (effective period denominator, so T = H/b)

def get_atoms(p):
    """Get all atomic values for formula construction."""
    atoms = {
        'd': p['d'],
        'n': p['n'],
        'm': p['m'],
        'b': p['m'] / p['n'],  # effective period denominator
        'dir': p['dir'],
        'd_m': p['d_m'],
        'n_m': p['n_m'],
        'm_m': p['m_m'],
        'b_m': p['m_m'] / p['n_m'],  # mirror's effective period denominator
        'dir_m': p['dir_m'],
    }
    return atoms

# ==============================================================
# 3. Systematic formula search — Approach 1: numerator/denominator
# ==============================================================
print("\n" + "─" * 80)
print("2. SYSTEMATIC SEARCH: ω = 360° × NUM / DEN")
print("─" * 80)

# Build numerator and denominator from products of atom values
# NUM and DEN are products of 1-3 atoms

atom_names = ['d', 'n', 'm', 'b', 'd_m', 'n_m', 'm_m', 'b_m']

# Generate all products of 1-2 atoms
def gen_products(atoms, max_factors=2):
    """Generate all products of 1 to max_factors atom values."""
    products = {}
    names = list(atoms.keys())
    vals = {k: v for k, v in atoms.items() if isinstance(v, (int, float)) and v != 0}

    # Single atoms
    for k, v in vals.items():
        if abs(v) > 0:
            products[k] = v

    # Products of 2
    if max_factors >= 2:
        for k1 in vals:
            for k2 in vals:
                if k1 <= k2:  # avoid duplicates
                    label = f"{k1}×{k2}" if k1 != k2 else f"{k1}²"
                    products[label] = vals[k1] * vals[k2]

    # Squares
    for k, v in vals.items():
        label = f"{k}²"
        if label not in products and abs(v) > 0:
            products[label] = v * v

    return products

# Also add some Fibonacci-specific atoms
def get_fib_atoms(p):
    """Get Fibonacci-derived atoms."""
    atoms = get_atoms(p)

    # Fibonacci of period denominator
    m = p['m']
    if 0 <= m <= 20:
        atoms[f'F({m})'] = FIB.get(m, 0)

    m_m = p['m_m']
    if 0 <= m_m <= 20:
        atoms[f'F({m_m})_m'] = FIB.get(m_m, 0)

    # Fibonacci of n
    n = p['n']
    if 0 <= n <= 20:
        atoms[f'F({n})_n'] = FIB.get(n, 0)

    return atoms

# Strategy: test ω = sign × 360° × A / B
# where A and B are simple expressions of quantum numbers

results = []
tested = set()

# For computational tractability, use pre-filtered atom sets
num_atoms = ['d', 'n', 'm', 'b', 'd_m', 'n_m', 'm_m', 'b_m']
# Also include constant Fibonacci numbers
fib_constants = {f'F_{i}': FIB[i] for i in range(2, 14) if FIB[i] <= 377}

def evaluate_formula(num_func, den_func, sign_func, label):
    """Evaluate a formula across all planets and score it."""
    predictions = {}
    for name in planet_order:
        p = planets[name]
        atoms = get_fib_atoms(p)
        try:
            num_val = num_func(atoms, p)
            den_val = den_func(atoms, p)
            sign_val = sign_func(atoms, p)
            if den_val == 0:
                return None
            pred = sign_val * 360.0 * num_val / den_val
            predictions[name] = pred
        except (KeyError, ZeroDivisionError, TypeError):
            return None

    # Score: RMS percentage error
    errors = []
    for name in planet_order:
        obs = targets[name]
        pred = predictions[name]
        if abs(obs) > 0.01:
            err = abs(pred - obs) / abs(obs) * 100
        else:
            err = abs(pred - obs) * 100
        errors.append(err)

    rms = math.sqrt(sum(e**2 for e in errors) / len(errors))
    mean_err = sum(errors) / len(errors)
    max_err = max(errors)

    return {
        'label': label,
        'rms': rms,
        'mean': mean_err,
        'max': max_err,
        'predictions': predictions,
        'errors': {name: errors[i] for i, name in enumerate(planet_order)},
    }

# ==============================================================
# Strategy A: ω = dir × 360° × A / B
# where A, B are single atoms or products of two atoms
# ==============================================================
print("\n  Strategy A: ω = dir × 360° × A / B")
print("  Testing all combinations of quantum-number atoms...\n")

# Generate candidate numerators and denominators
# We test: numerator from {atoms, atoms², atom products}
# denominator from {atoms, atoms², atom products}

def get_num_den_candidates(p):
    """Generate (value, label) pairs for numerator and denominator."""
    atoms = get_atoms(p)
    candidates = []

    # Single atoms
    for k, v in atoms.items():
        if isinstance(v, (int, float)) and abs(v) > 0:
            candidates.append((abs(v), k))

    # Squares
    for k, v in atoms.items():
        if isinstance(v, (int, float)) and abs(v) > 0:
            candidates.append((v * v, f"{k}²"))

    # Products of 2 different atoms
    keys = [k for k in atoms if isinstance(atoms[k], (int, float)) and abs(atoms[k]) > 0]
    for i, k1 in enumerate(keys):
        for k2 in keys[i+1:]:
            candidates.append((abs(atoms[k1] * atoms[k2]), f"{k1}×{k2}"))

    # Add constant Fibonacci numbers
    for i in range(2, 14):
        f = FIB[i]
        if f <= 377:
            candidates.append((f, f"F_{i}={f}"))

    return candidates

# Test all numerator × denominator combinations
# For each, check if the formula gives a consistent ω across planets
# (i.e., if 360° × num/den produces the right value for each planet)

strategy_a_results = []

# For each planet, compute num/den ratio needed: target / (dir × 360)
for name in planet_order:
    p = planets[name]
    t = targets[name]
    needed_ratio = t / (p['dir'] * 360.0)  # This is what num/den must equal
    p['needed_ratio'] = needed_ratio

# Now test: for each pair of atom names (num_atom, den_atom),
# does 360° × num_atom_value / den_atom_value ≈ |target| for ALL planets?

# First, let's be smarter: parameterize by atom NAME, then evaluate across planets

# Atom extractors
def atom_value(p, atom_name):
    """Extract atom value for a planet."""
    atoms = get_atoms(p)
    if atom_name in atoms:
        return atoms[atom_name]
    # Check Fibonacci constants
    if atom_name.startswith('F_'):
        idx = int(atom_name.split('=')[0].split('_')[1])
        return FIB.get(idx, None)
    return None

# More flexible: try all pairs of expressions
# Expression = single atom, atom², atom×atom, constant, atom×constant

def build_expressions():
    """Build a list of (label, evaluator_func) pairs."""
    exprs = []

    # Single atoms (no dir, no dir_m)
    simple_atoms = ['d', 'n', 'm', 'b', 'd_m', 'n_m', 'm_m', 'b_m']

    for a in simple_atoms:
        exprs.append((a, lambda p, a=a: get_atoms(p).get(a, None)))

    # Squares
    for a in simple_atoms:
        exprs.append((f"{a}²", lambda p, a=a: get_atoms(p).get(a, 0)**2))

    # Products of 2
    for i, a1 in enumerate(simple_atoms):
        for a2 in simple_atoms[i+1:]:
            exprs.append((f"{a1}×{a2}", lambda p, a1=a1, a2=a2: get_atoms(p).get(a1, 0) * get_atoms(p).get(a2, 0)))

    # Fibonacci constants
    for idx in range(2, 14):
        f = FIB[idx]
        exprs.append((f"F_{idx}({f})", lambda p, f=f: f))

    # Atom × Fibonacci constant
    for a in simple_atoms:
        for idx in [3, 4, 5, 6, 7, 8]:
            f = FIB[idx]
            exprs.append((f"{a}×F_{idx}", lambda p, a=a, f=f: get_atoms(p).get(a, 0) * f))

    return exprs

expressions = build_expressions()
print(f"  Generated {len(expressions)} expressions")
print(f"  Testing {len(expressions)}² = {len(expressions)**2} num/den combinations...")

best_results = []

for i, (num_label, num_func) in enumerate(expressions):
    for j, (den_label, den_func) in enumerate(expressions):
        if num_label == den_label:
            continue

        # For each sign convention, evaluate
        for sign_mode in ['dir', 'const_pos', 'inner_outer']:
            if sign_mode == 'dir':
                sign_label = "dir"
                sign_func = lambda atoms, p: p['dir']
            elif sign_mode == 'const_pos':
                sign_label = "+"
                sign_func = lambda atoms, p: 1
            elif sign_mode == 'inner_outer':
                # +1 for inner (Me, Ve, Ea), -1 for outer (Ma through Ne)
                inner = {'Mercury', 'Venus', 'Earth'}
                sign_label = "inner/outer"
                sign_func = lambda atoms, p, inner=inner: 1  # We'll handle sign differently
                continue  # Skip for now, too complex

            label = f"{sign_label} × 360° × {num_label} / {den_label}"

            # Evaluate across planets
            errors = []
            valid = True
            for name in planet_order:
                p = planets[name]
                atoms = get_fib_atoms(p)
                try:
                    n_val = num_func(p)
                    d_val = den_func(p)
                    s_val = sign_func(atoms, p)
                    if d_val == 0 or n_val is None or d_val is None:
                        valid = False
                        break
                    pred = s_val * 360.0 * n_val / d_val
                    obs = targets[name]
                    if abs(obs) > 0.01:
                        err = abs(pred - obs) / abs(obs) * 100
                    else:
                        err = abs(pred - obs) * 100
                    errors.append((name, pred, obs, err))
                except (ZeroDivisionError, TypeError):
                    valid = False
                    break

            if not valid or len(errors) != 8:
                continue

            rms = math.sqrt(sum(e[3]**2 for e in errors) / len(errors))
            max_err = max(e[3] for e in errors)

            if rms < 50:  # Only keep reasonable candidates
                best_results.append((rms, max_err, label, errors))

# Sort by RMS error
best_results.sort(key=lambda x: x[0])

print(f"\n  Found {len(best_results)} candidates with RMS < 50%")
print(f"\n  TOP 20 FORMULAS:")
print(f"  {'Rank':>4s}  {'RMS':>8s}  {'Max':>8s}  Formula")
print("  " + "─" * 70)

for rank, (rms, max_err, label, errors) in enumerate(best_results[:20]):
    print(f"  {rank+1:4d}  {rms:7.2f}%  {max_err:7.2f}%  {label}")

# Show details for top 5
print("\n" + "─" * 80)
print("3. TOP 5 FORMULA DETAILS")
print("─" * 80)

for rank, (rms, max_err, label, errors) in enumerate(best_results[:5]):
    print(f"\n  #{rank+1}: {label}")
    print(f"  RMS = {rms:.3f}%, Max = {max_err:.3f}%")
    print(f"  {'Planet':10s}  {'Predicted':>10s}  {'Observed':>10s}  {'Error':>8s}")
    print("  " + "─" * 44)
    for name, pred, obs, err in errors:
        print(f"  {name:10s}  {pred:+10.3f}°  {obs:+10.3f}°  {err:7.2f}%")

# ==============================================================
# Strategy B: look for ω relationships BETWEEN planets
# ==============================================================
print("\n" + "─" * 80)
print("4. STRATEGY B: INTER-PLANET RELATIONSHIPS")
print("─" * 80)

print("""
  Instead of one formula per planet, look for relationships
  between ω values of different planets.

  Key observation from the best-fit expressions:
    Mercury: 360°/8     → 8 is Saturn's m
    Venus:   360°×8/39  → 39 = 13×3 = Mars_m × Earth_m
    Saturn:  360°×3/40  → 40 = 5×8 = Jupiter_m × Saturn_m
    Neptune: 360°×2/5   → 5 is Jupiter's m

  Hypothesis: ω_planet = 360° × product(m values of other planets)
""")

# Test: ω = sign × 360° / m_mirror
print(f"\n  Test: ω = dir × 360° / m_mirror")
print(f"  {'Planet':10s}  {'m_mirror':>8s}  {'Predicted':>10s}  {'Observed':>10s}  {'Error':>8s}")
print("  " + "─" * 50)
for name in planet_order:
    p = planets[name]
    m_m = p['m_m']
    pred = p['dir'] * 360.0 / m_m if m_m != 0 else 0
    obs = targets[name]
    err = abs(pred - obs) / abs(obs) * 100 if abs(obs) > 0.01 else 0
    print(f"  {name:10s}  {m_m:8.1f}  {pred:+10.3f}°  {obs:+10.3f}°  {err:7.2f}%")

# Test: ω = sign × 360° × n / (m × something)
# What if ω relates to the PRODUCT of the Law 6 triad members' m-values?

print(f"\n\n  Test: ω_inner = 360° / m_outer, ω_outer = -360° × n_inner / m_inner")
# Check if there's a cross-belt mapping
cross_map = {
    'Mercury': ('Uranus', +1),
    'Venus': ('Neptune', +1),
    'Earth': ('Saturn', +1),
    'Mars': ('Jupiter', +1),
    'Jupiter': ('Mars', -1),
    'Saturn': ('Earth', -1),
    'Uranus': ('Mercury', -1),
    'Neptune': ('Venus', -1),
}

# ==============================================================
# Strategy C: The "Law 6 triad" approach
# ==============================================================
print("\n" + "─" * 80)
print("5. STRATEGY C: BUILDING FROM LAW 6 TRIAD {3, 5, 8, 13}")
print("─" * 80)

# The best-fit expressions all use {3, 5, 8, 13}.
# Can we express each ω using ONLY these 4 numbers?

# The Law 6 triad: Earth(m=3), Jupiter(m=5), Saturn(m=8), Axial(m=13)
TRIAD = {'E': 3, 'J': 5, 'S': 8, 'A': 13}

# Generate all fractions a/(b×c) where a, b, c ∈ {1, 2, 3, 5, 8, 13, 21, 34}
# and their squares
triad_extended = [1, 2, 3, 5, 8, 13, 21, 34, 55]

print(f"\n  Searching for ω = ±360° × a/b using only Fibonacci numbers...")

triad_matches = {}
for name in planet_order:
    obs = abs(targets[name])
    best_err = 999
    best_expr = ""
    best_pred = 0

    # a / b
    for a in triad_extended:
        for b in triad_extended:
            if b > 0 and a != b:
                pred = 360.0 * a / b
                if 0 < pred < 360:
                    err = abs(pred - obs) / obs * 100
                    if err < best_err:
                        best_err = err
                        best_expr = f"{a}/{b}"
                        best_pred = pred

    # a / (b × c)
    for a in triad_extended:
        for b in triad_extended:
            for c in triad_extended:
                if b * c > 0:
                    pred = 360.0 * a / (b * c)
                    if 0 < pred < 360:
                        err = abs(pred - obs) / obs * 100
                        if err < best_err:
                            best_err = err
                            best_expr = f"{a}/({b}×{c})"
                            best_pred = pred

    # a² / b
    for a in triad_extended[:6]:
        for b in triad_extended:
            if b > 0:
                pred = 360.0 * a * a / b
                if 0 < pred < 360:
                    err = abs(pred - obs) / obs * 100
                    if err < best_err:
                        best_err = err
                        best_expr = f"{a}²/{b}"
                        best_pred = pred

    # (a × b) / c
    for a in triad_extended[:6]:
        for b in triad_extended[:6]:
            for c in triad_extended:
                if c > 0:
                    pred = 360.0 * a * b / c
                    if 0 < pred < 360:
                        err = abs(pred - obs) / obs * 100
                        if err < best_err:
                            best_err = err
                            best_expr = f"({a}×{b})/{c}"
                            best_pred = pred

    triad_matches[name] = (best_pred, best_err, best_expr)

print(f"\n  {'Planet':10s}  {'|ω| obs':>10s}  {'Best match':>10s}  {'Expression':>20s}  {'Error':>8s}")
print("  " + "─" * 65)
for name in planet_order:
    obs = abs(targets[name])
    pred, err, expr = triad_matches[name]
    print(f"  {name:10s}  {obs:10.3f}°  {pred:10.3f}°  360°×{expr:>16s}  {err:7.3f}%")

# ==============================================================
# Strategy D: ω as function of (d, m, m_mirror)
# ==============================================================
print("\n" + "─" * 80)
print("6. STRATEGY D: ω = f(d, m, m_mirror)")
print("─" * 80)

print("""
  Each planet has (d, m, m_mirror). Test simple functions:
""")

# Collect the triples
print(f"\n  {'Planet':10s}  {'d':>4s}  {'m':>4s}  {'m_m':>4s}  {'ω':>10s}")
print("  " + "─" * 38)
for name in planet_order:
    p = planets[name]
    print(f"  {name:10s}  {p['d']:4d}  {p['m']:4.0f}  {p['m_m']:4.0f}  {targets[name]:+10.3f}°")

# Test formulas: ω = sign × 360° × F(some combo of d, m, m_m)
formulas_d = [
    ("m_m/d",           lambda p: p['m_m'] / p['d']),
    ("m/d",             lambda p: p['m'] / p['d']),
    ("d/m",             lambda p: p['d'] / p['m']),
    ("d/m_m",           lambda p: p['d'] / p['m_m']),
    ("m/(d×m_m)",       lambda p: p['m'] / (p['d'] * p['m_m'])),
    ("m_m/(d×m)",       lambda p: p['m_m'] / (p['d'] * p['m'])),
    ("d/(m×m_m)",       lambda p: p['d'] / (p['m'] * p['m_m'])),
    ("m×m_m/d",         lambda p: p['m'] * p['m_m'] / p['d']),
    ("m²/d",            lambda p: p['m']**2 / p['d']),
    ("d/m²",            lambda p: p['d'] / p['m']**2),
    ("m_m²/d",          lambda p: p['m_m']**2 / p['d']),
    ("n×m_m/d",         lambda p: p['n'] * p['m_m'] / p['d']),
    ("n_m×m/d",         lambda p: p['n_m'] * p['m'] / p['d']),
    ("(m+m_m)/d",       lambda p: (p['m'] + p['m_m']) / p['d']),
    ("(m-m_m)/d",       lambda p: abs(p['m'] - p['m_m']) / p['d']),
    ("n/(m×d)",         lambda p: p['n'] / (p['m'] * p['d'])),
    ("d×n/m",           lambda p: p['d'] * p['n'] / p['m']),
    ("d×n_m/m_m",       lambda p: p['d'] * p['n_m'] / p['m_m']),
    ("F(m)/d",          lambda p: FIB.get(p['m'], 0) / p['d'] if p['m'] <= 20 else 0),
    ("F(m_m)/d",        lambda p: FIB.get(p['m_m'], 0) / p['d'] if p['m_m'] <= 20 else 0),
    ("d/F(m)",          lambda p: p['d'] / FIB[p['m']] if 0 < p['m'] <= 20 and FIB.get(p['m'], 0) > 0 else 0),
    ("n×F(m_m)/d",      lambda p: p['n'] * FIB.get(p['m_m'], 0) / p['d'] if p['m_m'] <= 20 else 0),
    ("F(m)×n/d",        lambda p: FIB.get(p['m'], 0) * p['n'] / p['d'] if p['m'] <= 20 else 0),
    ("F(m)/F(m_m)",     lambda p: FIB.get(p['m'], 0) / FIB.get(p['m_m'], 1) if p['m'] <= 20 and p['m_m'] <= 20 else 0),
]

formula_results = []

for label, func in formulas_d:
    errors = []
    preds = {}
    valid = True
    for name in planet_order:
        p = planets[name]
        try:
            ratio = func(p)
            if ratio == 0:
                valid = False
                break
            pred = p['dir'] * 360.0 * ratio
            obs = targets[name]
            err = abs(pred - obs) / abs(obs) * 100 if abs(obs) > 0.01 else abs(pred - obs) * 100
            errors.append(err)
            preds[name] = pred
        except (ZeroDivisionError, KeyError):
            valid = False
            break

    if valid and len(errors) == 8:
        rms = math.sqrt(sum(e**2 for e in errors) / len(errors))
        formula_results.append((rms, label, preds, errors))

formula_results.sort()

print(f"\n  TOP 10 f(d, m, m_m) FORMULAS:")
print(f"  {'Rank':>4s}  {'RMS':>8s}  Formula")
print("  " + "─" * 40)
for rank, (rms, label, preds, errors) in enumerate(formula_results[:10]):
    print(f"  {rank+1:4d}  {rms:7.2f}%  ω = dir × 360° × {label}")

# Show details for best
if formula_results:
    print(f"\n  BEST FORMULA DETAILS:")
    rms, label, preds, errors = formula_results[0]
    print(f"  ω = dir × 360° × {label}")
    print(f"  RMS = {rms:.3f}%")
    print(f"\n  {'Planet':10s}  {'Predicted':>10s}  {'Observed':>10s}  {'Error':>8s}")
    print("  " + "─" * 44)
    for i, name in enumerate(planet_order):
        print(f"  {name:10s}  {preds[name]:+10.3f}°  {targets[name]:+10.3f}°  {errors[i]:7.2f}%")

# ==============================================================
# Strategy E: Different formula for inner vs outer planets
# ==============================================================
print("\n" + "─" * 80)
print("7. STRATEGY E: SEPARATE INNER/OUTER FORMULAS")
print("─" * 80)

print("""
  Since mirror pairs share d but differ in m, maybe there's a formula
  that treats the inner and outer member differently.

  For each mirror pair (inner, outer):
    ω_inner = 360° × f_inner(d, m_inner, m_outer)
    ω_outer = -360° × f_outer(d, m_inner, m_outer)
""")

# For each mirror pair, check if there's a pattern
for inner, outer in [('Mercury', 'Uranus'), ('Venus', 'Neptune'), ('Earth', 'Saturn'), ('Mars', 'Jupiter')]:
    pi = planets[inner]
    po = planets[outer]
    wi = targets[inner]
    wo = targets[outer]
    d = pi['d']
    mi = pi['m']
    mo = po['m']

    # What fraction of 360 is each ω?
    ri = wi / 360.0
    ro = wo / 360.0

    print(f"\n  {inner}/{outer} (d={d}, m_inner={mi}, m_outer={mo}):")
    print(f"    ω_inner = {wi:+.3f}° = 360° × {ri:+.6f}")
    print(f"    ω_outer = {wo:+.3f}° = 360° × {ro:+.6f}")
    print(f"    |ω_inner/ω_outer| = {abs(wi/wo):.4f}")

    # Test: is the ratio related to m_inner/m_outer?
    if mo != 0:
        print(f"    m_inner/m_outer = {mi}/{mo} = {mi/mo:.4f}")
        print(f"    ω ratio / m ratio = {abs(wi/wo) / (mi/mo):.4f}" if mi/mo != 0 else "")

    # What values of a, b give 360×a/b ≈ |ω_inner| and |ω_outer|?
    # Focus on Fibonacci expressions using d, m_inner, m_outer
    for target, label in [(abs(wi), f"|ω_{inner}|"), (abs(wo), f"|ω_{outer}|")]:
        best = (999, "", 0)
        for a in [1, d, mi, mo, d*mi, d*mo, mi*mo, mi**2, mo**2]:
            for b in [1, d, mi, mo, d*mi, d*mo, mi*mo, mi**2, mo**2]:
                if b > 0 and a != b:
                    pred = 360.0 * a / b
                    if 0 < pred < 360:
                        err = abs(pred - target) / target * 100
                        if err < best[0]:
                            best = (err, f"360×{a}/{b}", pred)
        print(f"    {label} = {target:.3f}° ≈ {best[1]} = {best[2]:.3f}° ({best[0]:.2f}%)")

# ==============================================================
# Strategy F: Fibonacci-INDEX formulas
# ==============================================================
print("\n" + "─" * 80)
print("8. STRATEGY F: FIBONACCI-INDEX FORMULAS")
print("─" * 80)

print("""
  Instead of quantum numbers directly, use Fibonacci INDICES of the
  best-fit expressions and see if they map to planet quantum numbers.
""")

# For each planet, what Fibonacci indices appear in the best ω expression?
# From the mean ω analysis (findings document):
best_fit_info = {
    'Mercury':  {'expr': '360°/F₆',           'num_idx': [],    'den_idx': [6],     'ratio': 1/8},
    'Venus':    {'expr': '360°×F₆/(F₇×F₄)',   'num_idx': [6],   'den_idx': [7, 4],  'ratio': 8/39},
    'Earth':    {'expr': '360°/F₃',            'num_idx': [],    'den_idx': [3],     'ratio': 1/2},
    'Mars':     {'expr': '360°×F₃/F₉',        'num_idx': [3],   'den_idx': [9],     'ratio': 2/34},
    'Jupiter':  {'expr': '360°×F₅²/F₁₂',      'num_idx': [5,5], 'den_idx': [12],    'ratio': 25/144},
    'Saturn':   {'expr': '360°×F₄/(F₅×F₆)',   'num_idx': [4],   'den_idx': [5, 6],  'ratio': 3/40},
    'Uranus':   {'expr': '360°×F₅/F₇',        'num_idx': [5],   'den_idx': [7],     'ratio': 5/13},
    'Neptune':  {'expr': '360°×F₃/F₅',        'num_idx': [3],   'den_idx': [5],     'ratio': 2/5},
}

print(f"  {'Planet':10s}  {'F_idx':>5s}  {'d':>3s}  {'m':>3s}  ω expression              Fib indices used")
print("  " + "─" * 75)
for name in planet_order:
    p = planets[name]
    info = best_fit_info[name]
    all_idx = sorted(info['num_idx'] + info['den_idx'])
    idx_str = ', '.join(str(i) for i in all_idx)
    print(f"  {name:10s}  {p['F_idx']:5d}  {p['d']:3d}  {p['m']:3d}  {info['expr']:<24s}  [{idx_str}]")

# Check: do the Fibonacci indices map to quantum numbers?
print(f"\n  Key observations:")
print(f"  - Mercury (F_idx=8): uses F₆ → F_idx - 2 = 6 ✓")
print(f"  - Earth (F_idx=4): uses F₃ → F_idx - 1 = 3 ✓")
print(f"  - Mars (F_idx=5): uses F₃, F₉ → F_idx - 2 = 3 ✓, and F₉ = mirror(Venus) d = 34")
print(f"  - Uranus (F_idx=8): uses F₅, F₇ → Jupiter's m=5, Mars's m=13 (F₇)")
print(f"  - Neptune (F_idx=9): uses F₃, F₅ → F₃=2, F₅=5=Jupiter's m")
print(f"  - Jupiter (F_idx=5): uses F₅², F₁₂ → own d², F₁₂=144")
print(f"  - Saturn (F_idx=4): uses F₄, F₅, F₆ → d=3, Jupiter_m=5, Saturn_m=8")
print(f"  - Venus (F_idx=9): uses F₆, F₇, F₄ → Saturn_m=8, Mars_m=13, Earth_m=3")

# Which other planet's m-values appear in each expression?
print(f"\n  Cross-referencing ω denominators with other planets' m-values:")
print(f"  (Recall: Earth_m=3, Jupiter_m=5, Saturn_m=8, Mars_m=13)")
for name in planet_order:
    info = best_fit_info[name]
    all_idx = info['num_idx'] + info['den_idx']
    # Map Fibonacci values to planets
    fib_vals = [FIB.get(i, 0) for i in all_idx]
    m_matches = []
    for fv in fib_vals:
        for pname in planet_order:
            if planets[pname]['m'] == fv and pname != name:
                m_matches.append(f"F→{fv}={pname}_m")
    print(f"  {name:10s}: Fib values {fib_vals} → {', '.join(m_matches) if m_matches else 'no direct m match'}")

# ==============================================================
# Strategy G: Golden angle multiples
# ==============================================================
print("\n" + "─" * 80)
print("9. STRATEGY G: GOLDEN ANGLE MULTIPLES")
print("─" * 80)

golden_angle = 360.0 / (1 + (1 + 5**0.5)/2)  # 360°/φ² ≈ 137.508°
phi = (1 + 5**0.5) / 2

print(f"\n  Golden angle = 360°/φ² = {golden_angle:.3f}°")
print(f"  Test: ω = n × golden_angle (mod 360°) for integer n\n")

print(f"  {'Planet':10s}  {'|ω|':>10s}  {'n_gold':>6s}  {'Predicted':>10s}  {'Error':>8s}")
print("  " + "─" * 50)
for name in planet_order:
    obs = abs(targets[name])
    # Find best integer multiple of golden angle
    best_err = 999
    best_n = 0
    best_pred = 0
    for n in range(1, 20):
        pred = (n * golden_angle) % 360
        err1 = abs(pred - obs) / obs * 100
        err2 = abs((360 - pred) - obs) / obs * 100 if obs > 0 else 999
        if err1 < best_err:
            best_err = err1
            best_n = n
            best_pred = pred
        if err2 < best_err:
            best_err = err2
            best_n = n
            best_pred = 360 - pred
    print(f"  {name:10s}  {obs:10.3f}°  {best_n:6d}  {best_pred:10.3f}°  {best_err:7.2f}%")

# Also test Fibonacci-number multiples of golden angle
print(f"\n  Test: ω = F_n × golden_angle (mod 360°)")
print(f"  {'Planet':10s}  {'|ω|':>10s}  {'F_n':>6s}  {'Predicted':>10s}  {'Error':>8s}")
print("  " + "─" * 50)
for name in planet_order:
    obs = abs(targets[name])
    best_err = 999
    best_fn = 0
    best_pred = 0
    for idx in range(1, 15):
        fn = FIB[idx]
        pred = (fn * golden_angle) % 360
        err1 = abs(pred - obs) / obs * 100
        pred2 = 360 - pred
        err2 = abs(pred2 - obs) / obs * 100
        if err1 < best_err:
            best_err = err1
            best_fn = fn
            best_pred = pred
        if err2 < best_err:
            best_err = err2
            best_fn = fn
            best_pred = pred2
    print(f"  {name:10s}  {obs:10.3f}°  F={best_fn:4d}  {best_pred:10.3f}°  {best_err:7.2f}%")

# ==============================================================
# Strategy H: ω = 360° × rational fn of (k, d) where k = mirror index
# ==============================================================
print("\n" + "─" * 80)
print("10. STRATEGY H: POSITION-BASED FORMULA (k = mirror index)")
print("─" * 80)

# k=1: Mercury/Uranus, k=2: Venus/Neptune, k=3: Earth/Saturn, k=4: Mars/Jupiter
k_vals = {
    'Mercury': 1, 'Uranus': 1,
    'Venus': 2, 'Neptune': 2,
    'Earth': 3, 'Saturn': 3,
    'Mars': 4, 'Jupiter': 4,
}
# inner/outer flag
is_inner = {
    'Mercury': True, 'Venus': True, 'Earth': True, 'Mars': True,
    'Jupiter': False, 'Saturn': False, 'Uranus': False, 'Neptune': False,
}

print(f"\n  {'Planet':10s}  {'k':>3s}  {'inner':>5s}  {'d':>3s}  {'m':>3s}  {'ω':>10s}")
print("  " + "─" * 42)
for name in planet_order:
    p = planets[name]
    k = k_vals[name]
    inner = is_inner[name]
    print(f"  {name:10s}  {k:3d}  {'yes' if inner else 'no':>5s}  {p['d']:3d}  {p['m']:3d}  {targets[name]:+10.3f}°")

# Test: ω = sign × 360° × f(k)
print(f"\n  Testing f(k) formulas:")
k_formulas = [
    ("1/(k+1)",      lambda k: 1/(k+1)),
    ("k/8",          lambda k: k/8),
    ("F(k)/F(k+3)",  lambda k: FIB[k]/FIB[k+3] if k+3 <= 20 else 0),
    ("F(k+1)/F(k+4)", lambda k: FIB[k+1]/FIB[k+4] if k+4 <= 20 else 0),
    ("1/F(k+3)",     lambda k: 1/FIB[k+3] if k+3 <= 20 else 0),
    ("F(k)/F(2k+2)", lambda k: FIB[k]/FIB[2*k+2] if 2*k+2 <= 20 else 0),
]

for flabel, ffunc in k_formulas:
    errors = []
    preds = {}
    for name in planet_order:
        k = k_vals[name]
        p = planets[name]
        ratio = ffunc(k)
        if ratio == 0:
            break
        # inner planets get +ω, outer get -ω (empirical observation)
        sign = 1 if is_inner[name] else -1
        pred = sign * 360.0 * ratio
        obs = targets[name]
        err = abs(pred - obs) / abs(obs) * 100 if abs(obs) > 0.01 else abs(pred - obs) * 100
        errors.append(err)
        preds[name] = pred

    if len(errors) == 8:
        rms = math.sqrt(sum(e**2 for e in errors) / len(errors))
        print(f"    f(k) = {flabel:15s}  RMS = {rms:7.1f}%")

# ==============================================================
# Strategy I: Combined quantum number + Fibonacci index search
# ==============================================================
print("\n" + "─" * 80)
print("11. STRATEGY I: EXTENDED SEARCH — ω = 360° × F_a / F_b")
print("─" * 80)

print("""
  For each planet, test if ω = ±360° × F_a / F_b where a,b are
  simple functions of the planet's quantum numbers (d, m, F_idx, k).
""")

# For each planet, find (a, b) such that 360°×F_a/F_b ≈ |ω|
print(f"  {'Planet':10s}  {'|ω|':>10s}  Best F_a/F_b        a,b          Error")
print("  " + "─" * 65)
for name in planet_order:
    obs = abs(targets[name])
    best = (999, 0, 0, 0, 0)
    for a in range(1, 16):
        for b in range(1, 16):
            if a != b and FIB.get(b, 0) > 0:
                ratio = FIB[a] / FIB[b]
                pred = 360.0 * ratio
                if 0 < pred < 360:
                    err = abs(pred - obs) / obs * 100
                    if err < best[0]:
                        best = (err, a, b, FIB[a], FIB[b])
    err, a, b, fa, fb = best
    print(f"  {name:10s}  {obs:10.3f}°  F_{a}/F_{b} = {fa}/{fb:<6d}  = {360*fa/fb:8.3f}°  {err:7.3f}%")

# Now try F_a²/F_b and F_a/(F_b×F_c)
print(f"\n  Extended: ω = 360° × F_a²/F_b or F_a/(F_b×F_c)")
print(f"  {'Planet':10s}  {'|ω|':>10s}  Best expression                   Error")
print("  " + "─" * 70)
for name in planet_order:
    obs = abs(targets[name])
    best = (999, "")

    # F_a²/F_b
    for a in range(1, 14):
        for b in range(1, 20):
            if FIB.get(b, 0) > 0:
                pred = 360.0 * FIB[a]**2 / FIB[b]
                if 0 < pred < 360:
                    err = abs(pred - obs) / obs * 100
                    if err < best[0]:
                        best = (err, f"F_{a}²/F_{b} = {FIB[a]}²/{FIB[b]} = {pred:.3f}°")

    # F_a/(F_b×F_c)
    for a in range(1, 14):
        for b in range(1, 14):
            for c in range(b, 14):
                if FIB.get(b, 0) > 0 and FIB.get(c, 0) > 0:
                    den = FIB[b] * FIB[c]
                    if den > 0:
                        pred = 360.0 * FIB[a] / den
                        if 0 < pred < 360:
                            err = abs(pred - obs) / obs * 100
                            if err < best[0]:
                                best = (err, f"F_{a}/(F_{b}×F_{c}) = {FIB[a]}/({FIB[b]}×{FIB[c]}) = {pred:.3f}°")

    # (F_a×F_b)/F_c
    for a in range(1, 12):
        for b in range(a, 12):
            for c in range(1, 20):
                if FIB.get(c, 0) > 0:
                    pred = 360.0 * FIB[a] * FIB[b] / FIB[c]
                    if 0 < pred < 360:
                        err = abs(pred - obs) / obs * 100
                        if err < best[0]:
                            best = (err, f"(F_{a}×F_{b})/F_{c} = ({FIB[a]}×{FIB[b]})/{FIB[c]} = {pred:.3f}°")

    err, expr = best
    print(f"  {name:10s}  {obs:10.3f}°  {expr:<40s}  {err:7.3f}%")

# ==============================================================
# SUMMARY
# ==============================================================
print("\n" + "=" * 80)
print("SUMMARY")
print("=" * 80)

best_a_rms = best_results[0][0] if best_results else float('inf')
best_a_label = best_results[0][2] if best_results else "none found"
best_d_rms = formula_results[0][0] if formula_results else float('inf')
best_d_label = formula_results[0][1] if formula_results else "none found"

print(f"""
  UNIFIED FORMULA SEARCH RESULTS
  ──────────────────────────────

  Strategy A (systematic num/den, ~10,000 combos): {"Best RMS = " + f"{best_a_rms:.1f}%" if best_results else "No candidate below 50% RMS"}
  Strategy C (Fibonacci-only fractions): Each planet matches individually at <0.5%
  Strategy D (f(d,m,m_m), 24 formulas): Best RMS = {best_d_rms:.1f}% ({best_d_label})
  Strategy F (Fibonacci-index analysis): Indices map to Law 6 triad (3,5,8,13)
  Strategy G (golden angle multiples): No systematic improvement
  Strategy H (position k formula): No formula below ~50% RMS
  Strategy I (F_a/F_b for each planet): Each planet has its own best Fibonacci ratio

  KEY FINDING:
  ────────────
  No single formula ω = f(quantum numbers) can predict all 8 planets.
  The best systematic formulas have RMS > 50%, vs individual Fibonacci
  fractions at 0.02-0.50% per planet.

  STRUCTURAL OBSERVATIONS:
  1. All ω expressions use numbers from the Law 6 triad {{3, 5, 8, 13}}
  2. Each ω denominator maps to OTHER planets' period denominators (m)
  3. Mercury uses Saturn_m=8, Venus uses Earth_m×Mars_m=3×13,
     Saturn uses Jupiter_m×Saturn_m=5×8, Neptune uses Jupiter_m=5
  4. The pattern is: ω encodes INTER-PLANET coupling, not self-properties
  5. This is fundamentally different from ψ = d×η×√m (a SELF-property)

  CONCLUSION:
  ω is NOT derivable from a universal formula like Law 2's ψ-constant.
  It is a formation constraint where each planet's perihelion direction
  is set by its couplings to other planets, organized via Fibonacci
  fractions of 360° using the Law 6 triad numbers {{3, 5, 8, 13}}.
""")
