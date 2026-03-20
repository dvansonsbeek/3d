#!/usr/bin/env python3
"""
INVESTIGATION: FIND THE FORMULA MAPPING PAIR QUANTUM NUMBERS → FIBONACCI R² INDICES
=====================================================================================

For each mirror pair, R² sum = F_a / F_b. The indices are:
  k=1 Mars/Jupiter:   F_14/F_5  → a=14, b=5
  k=2 Earth/Saturn:   F_9/F_4   → a=9,  b=4
  k=3 Venus/Neptune:  F_1/F_3   → a=1,  b=3
  k=4 Mercury/Uranus: F_8/F_3   → a=8,  b=3

Pair properties available: k, d, d_idx, b_inner, b_outer, F_d, etc.
This script searches for formulas a = f(pair properties), b = g(pair properties).

Also investigates the C2 constraint indices.
"""

import math
import sys
from itertools import product as iter_product
sys.path.insert(0, '.')
from fibonacci_data import *

print("=" * 78)
print("INVESTIGATION: FIBONACCI INDEX FORMULA FOR R² TARGETS")
print("=" * 78)

# ─────────────────────────────────────────────────────────────────────────────
# SECTION 1: Complete data table with all pair properties
# ─────────────────────────────────────────────────────────────────────────────
print("\n" + "─" * 78)
print("SECTION 1: Complete pair property table")
print("─" * 78)

# Define all properties for each pair
pairs_data = []
for k, (inner, outer) in enumerate(MIRROR_PAIRS, 1):
    d = D[inner]
    d_idx = FIB_INDEX.get(d, -1)
    b_in = PERIOD_FRAC[inner][1]   # period fraction denominator
    b_out = PERIOD_FRAC[outer][1]
    a_in = PERIOD_FRAC[inner][0]   # period fraction numerator
    a_out = PERIOD_FRAC[outer][0]

    # R² sum indices
    R2_targets = {
        1: (14, 5),   # Mars/Jupiter
        2: (9, 4),    # Earth/Saturn
        3: (1, 3),    # Venus/Neptune
        4: (8, 3),    # Mercury/Uranus
    }

    C2_targets = {
        1: ("product", 9, 3),   # 34/2 → F_9/F_3
        2: ("product", 3, 1),   # 2/1 → F_3/F_1
        3: ("ratio", 3, 6),     # 2/8 → F_3/F_6
        4: ("ratio", 3, 4),     # 2/3 → F_3/F_4
    }

    num_idx, den_idx = R2_targets[k]
    c2_type, c2_num_idx, c2_den_idx = C2_targets[k]

    pairs_data.append({
        'k': k,
        'inner': inner,
        'outer': outer,
        'd': d,
        'd_idx': d_idx,
        'b_in': b_in,
        'b_out': b_out,
        'a_in': a_in,
        'a_out': a_out,
        'R2_num_idx': num_idx,
        'R2_den_idx': den_idx,
        'C2_type': c2_type,
        'C2_num_idx': c2_num_idx,
        'C2_den_idx': c2_den_idx,
    })

print(f"\n{'k':>3}  {'Pair':>20}  {'d':>3}  {'d_idx':>5}  {'b_in':>4}  {'b_out':>5}  "
      f"{'a(R²)':>5}  {'b(R²)':>5}  {'a(C2)':>5}  {'b(C2)':>5}  {'C2type':>8}")
print("─" * 100)
for pd in pairs_data:
    print(f"{pd['k']:>3}  {pd['inner']+'/'+pd['outer']:>20}  {pd['d']:>3}  {pd['d_idx']:>5}  "
          f"{pd['b_in']:>4}  {pd['b_out']:>5}  {pd['R2_num_idx']:>5}  {pd['R2_den_idx']:>5}  "
          f"{pd['C2_num_idx']:>5}  {pd['C2_den_idx']:>5}  {pd['C2_type']:>8}")

# ─────────────────────────────────────────────────────────────────────────────
# SECTION 2: Arithmetic relationships between indices and pair properties
# ─────────────────────────────────────────────────────────────────────────────
print("\n" + "─" * 78)
print("SECTION 2: Arithmetic relationships — R² numerator index")
print("─" * 78)

print("\nTarget R² num_idx values: 14, 9, 1, 8")
print("Available pair properties: k, d_idx, b_in, b_out, a_in, a_out\n")

# Try all linear combinations c1*X + c2*Y + c3 where X,Y ∈ properties
props_names = ['k', 'd_idx', 'b_in', 'b_out', 'a_in', 'a_out']
for pd in pairs_data:
    pd['props'] = [pd['k'], pd['d_idx'], pd['b_in'], pd['b_out'], pd['a_in'], pd['a_out']]

# Single property + constant
print("Testing: num_idx = c1 × X + c0")
for i, pname in enumerate(props_names):
    vals = [pd['props'][i] for pd in pairs_data]
    targets = [pd['R2_num_idx'] for pd in pairs_data]

    # Try c1 ∈ {-5,...,5}, c0 ∈ {-20,...,20}
    for c1_num in range(-5, 6):
        for c1_den in [1, 2, 3]:
            c1 = c1_num / c1_den
            for c0 in range(-20, 21):
                predicted = [c1 * v + c0 for v in vals]
                if all(abs(p - t) < 0.01 for p, t in zip(predicted, targets)):
                    print(f"  EXACT: num_idx = {c1}×{pname} + {c0}")

# Two properties + constant
print("\nTesting: num_idx = c1 × X + c2 × Y + c0")
for i, pname_i in enumerate(props_names):
    for j, pname_j in enumerate(props_names):
        if j <= i:
            continue
        vals_i = [pd['props'][i] for pd in pairs_data]
        vals_j = [pd['props'][j] for pd in pairs_data]
        targets = [pd['R2_num_idx'] for pd in pairs_data]

        for c1 in range(-5, 6):
            for c2 in range(-5, 6):
                for c0 in range(-20, 21):
                    predicted = [c1*vi + c2*vj + c0 for vi, vj in zip(vals_i, vals_j)]
                    if all(abs(p - t) < 0.01 for p, t in zip(predicted, targets)):
                        print(f"  EXACT: num_idx = {c1}×{pname_i} + {c2}×{pname_j} + {c0}")

# ─────────────────────────────────────────────────────────────────────────────
# SECTION 3: Same for R² denominator index
# ─────────────────────────────────────────────────────────────────────────────
print("\n" + "─" * 78)
print("SECTION 3: Arithmetic relationships — R² denominator index")
print("─" * 78)

print("\nTarget R² den_idx values: 5, 4, 3, 3")

# Single property + constant
print("Testing: den_idx = c1 × X + c0")
for i, pname in enumerate(props_names):
    vals = [pd['props'][i] for pd in pairs_data]
    targets = [pd['R2_den_idx'] for pd in pairs_data]

    for c1_num in range(-5, 6):
        for c1_den in [1, 2, 3]:
            c1 = c1_num / c1_den
            for c0 in range(-20, 21):
                predicted = [c1 * v + c0 for v in vals]
                if all(abs(p - t) < 0.01 for p, t in zip(predicted, targets)):
                    print(f"  EXACT: den_idx = {c1}×{pname} + {c0}")

# Two properties
print("\nTesting: den_idx = c1 × X + c2 × Y + c0")
for i, pname_i in enumerate(props_names):
    for j, pname_j in enumerate(props_names):
        if j <= i:
            continue
        vals_i = [pd['props'][i] for pd in pairs_data]
        vals_j = [pd['props'][j] for pd in pairs_data]
        targets = [pd['R2_den_idx'] for pd in pairs_data]

        for c1 in range(-5, 6):
            for c2 in range(-5, 6):
                for c0 in range(-20, 21):
                    predicted = [c1*vi + c2*vj + c0 for vi, vj in zip(vals_i, vals_j)]
                    if all(abs(p - t) < 0.01 for p, t in zip(predicted, targets)):
                        print(f"  EXACT: den_idx = {c1}×{pname_i} + {c2}×{pname_j} + {c0}")

# ─────────────────────────────────────────────────────────────────────────────
# SECTION 4: Non-linear relationships
# ─────────────────────────────────────────────────────────────────────────────
print("\n" + "─" * 78)
print("SECTION 4: Non-linear relationships — products, ratios, sums")
print("─" * 78)

print("\nComposite properties per pair:")
for pd in pairs_data:
    pd['b_sum'] = pd['b_in'] + pd['b_out']
    pd['b_diff'] = abs(pd['b_in'] - pd['b_out'])
    pd['b_prod'] = pd['b_in'] * pd['b_out']
    pd['b_max'] = max(pd['b_in'], pd['b_out'])
    pd['b_min'] = min(pd['b_in'], pd['b_out'])
    pd['a_sum'] = pd['a_in'] + pd['a_out']
    pd['dk'] = pd['d_idx'] * pd['k']  # d_idx × k
    pd['d_plus_k'] = pd['d_idx'] + pd['k']
    pd['d_minus_k'] = pd['d_idx'] - pd['k']

comp_props_names = ['b_sum', 'b_diff', 'b_prod', 'b_max', 'b_min', 'a_sum',
                     'dk', 'd_plus_k', 'd_minus_k']

print(f"\n{'k':>3}  {'b_sum':>5}  {'b_diff':>6}  {'b_prod':>6}  {'b_max':>5}  {'b_min':>5}  "
      f"{'a_sum':>5}  {'dk':>4}  {'d+k':>4}  {'d-k':>4}  {'a(R²)':>5}  {'b(R²)':>5}")
print("─" * 80)
for pd in pairs_data:
    print(f"{pd['k']:>3}  {pd['b_sum']:>5}  {pd['b_diff']:>6}  {pd['b_prod']:>6}  "
          f"{pd['b_max']:>5}  {pd['b_min']:>5}  {pd['a_sum']:>5}  {pd['dk']:>4}  "
          f"{pd['d_plus_k']:>4}  {pd['d_minus_k']:>4}  {pd['R2_num_idx']:>5}  {pd['R2_den_idx']:>5}")

# Check if any composite matches
print("\nDirect matches for R² num_idx:")
targets = [pd['R2_num_idx'] for pd in pairs_data]
for pname in comp_props_names:
    vals = [pd[pname] for pd in pairs_data]
    if vals == targets:
        print(f"  EXACT MATCH: R² num_idx = {pname}")

# Check with simple offsets
for pname in comp_props_names:
    vals = [pd[pname] for pd in pairs_data]
    for offset in range(-20, 21):
        if [v + offset for v in vals] == targets:
            print(f"  MATCH: R² num_idx = {pname} + {offset}")

print("\nDirect matches for R² den_idx:")
targets_d = [pd['R2_den_idx'] for pd in pairs_data]
for pname in comp_props_names:
    vals = [pd[pname] for pd in pairs_data]
    if vals == targets_d:
        print(f"  EXACT MATCH: R² den_idx = {pname}")

for pname in comp_props_names:
    vals = [pd[pname] for pd in pairs_data]
    for offset in range(-20, 21):
        if [v + offset for v in vals] == targets_d:
            print(f"  MATCH: R² den_idx = {pname} + {offset}")

# ─────────────────────────────────────────────────────────────────────────────
# SECTION 5: Fibonacci number relationships (F_a = f(properties))
# ─────────────────────────────────────────────────────────────────────────────
print("\n" + "─" * 78)
print("SECTION 5: Direct Fibonacci number relationships")
print("─" * 78)

# Instead of index arithmetic, look at the Fibonacci NUMBERS themselves
print("\nR² sum numerator (Fibonacci number) vs pair properties:")
for pd in pairs_data:
    F_num = fib_n(pd['R2_num_idx'])
    print(f"  k={pd['k']}: F_{pd['R2_num_idx']} = {F_num:>5}  "
          f"(d={pd['d']}, b_in={pd['b_in']}, b_out={pd['b_out']}, "
          f"b_sum={pd['b_sum']}, b_prod={pd['b_prod']})")

print("\nR² sum denominator (Fibonacci number) vs pair properties:")
for pd in pairs_data:
    F_den = fib_n(pd['R2_den_idx'])
    print(f"  k={pd['k']}: F_{pd['R2_den_idx']} = {F_den:>5}  "
          f"(d={pd['d']}, b_in={pd['b_in']}, b_out={pd['b_out']})")

# Check: is the numerator F-number related to d of another pair?
print("\nCross-pair: numerator F-number vs other pairs' d values:")
for pd in pairs_data:
    F_num = fib_n(pd['R2_num_idx'])
    for pd2 in pairs_data:
        if pd2['k'] == pd['k']:
            continue
        if F_num == pd2['d']:
            print(f"  k={pd['k']}: F_{pd['R2_num_idx']} = {F_num} = d of k={pd2['k']} ({pd2['inner']}/{pd2['outer']})")
        if F_num == pd2['b_in']:
            print(f"  k={pd['k']}: F_{pd['R2_num_idx']} = {F_num} = b_in of k={pd2['k']} ({pd2['inner']}/{pd2['outer']})")
        if F_num == pd2['b_out']:
            print(f"  k={pd['k']}: F_{pd['R2_num_idx']} = {F_num} = b_out of k={pd2['k']} ({pd2['inner']}/{pd2['outer']})")

# ─────────────────────────────────────────────────────────────────────────────
# SECTION 6: Relationship between R² indices and period fractions
# ─────────────────────────────────────────────────────────────────────────────
print("\n" + "─" * 78)
print("SECTION 6: R² indices vs period fraction denominators (b)")
print("─" * 78)

print("""
Period fraction denominators:
  Mercury: b=11 (Lucas)    Venus: b=1     Earth: b=3     Mars: b=13
  Jupiter: b=5             Saturn: b=8    Uranus: b=3    Neptune: b=1

Mirror pair period fractions:
  k=1: Mars(b=13)/Jupiter(b=5)    → R² = F_14/F_5
  k=2: Earth(b=3)/Saturn(b=8)     → R² = F_9/F_4
  k=3: Venus(b=1)/Neptune(b=1)    → R² = F_1/F_3
  k=4: Mercury(b=11)/Uranus(b=3)  → R² = F_8/F_3

Key tests:
  k=1: b_in + b_out = 13 + 5 = 18, num_idx = 14, 14 = 18 - 4 or 13 + 1
  k=2: b_in + b_out = 3 + 8 = 11, num_idx = 9, 9 = 11 - 2 or 8 + 1
  k=3: b_in + b_out = 1 + 1 = 2, num_idx = 1, 1 = 2 - 1
  k=4: b_in + b_out = 11 + 3 = 14, num_idx = 8, 8 = 14 - 6 or 11 - 3

Differences: 18-14=4, 11-9=2, 2-1=1, 14-8=6 → NOT a pattern (4,2,1,6)
""")

# Try: num_idx = b_in + b_out - f(k)?
print("Testing num_idx = b_sum - f(k):")
for pd in pairs_data:
    diff = pd['b_sum'] - pd['R2_num_idx']
    print(f"  k={pd['k']}: b_sum({pd['b_sum']}) - num_idx({pd['R2_num_idx']}) = {diff}")

# Try: num_idx = b_out + d_idx - 1?
print("\nTesting other combinations:")
for pd in pairs_data:
    combos = {
        'b_out + d_idx': pd['b_out'] + pd['d_idx'],
        'b_in + 1': pd['b_in'] + 1,
        'b_out + k': pd['b_out'] + pd['k'],
        'b_in + b_out - 2k': pd['b_sum'] - 2*pd['k'],
        'd × k': pd['d'] * pd['k'],
        'b_max + b_min': pd['b_max'] + pd['b_min'],
        '2*b_out - 1': 2*pd['b_out'] - 1,
        'b_in + k - 1': pd['b_in'] + pd['k'] - 1,
        '|b_in - b_out|': pd['b_diff'],
    }
    matches = [name for name, val in combos.items() if val == pd['R2_num_idx']]
    if matches:
        print(f"  k={pd['k']}: num_idx={pd['R2_num_idx']} matches: {', '.join(matches)}")

# ─────────────────────────────────────────────────────────────────────────────
# SECTION 7: Systematic brute-force — try ALL simple formulas
# ─────────────────────────────────────────────────────────────────────────────
print("\n" + "─" * 78)
print("SECTION 7: Brute-force formula search for BOTH indices")
print("─" * 78)

# Properties available per pair
all_props = {}
for pd in pairs_data:
    all_props[pd['k']] = {
        'k': pd['k'],
        'd': pd['d'],
        'd_idx': pd['d_idx'],
        'b_in': pd['b_in'],
        'b_out': pd['b_out'],
        'a_in': pd['a_in'],
        'a_out': pd['a_out'],
        'b_sum': pd['b_sum'],
        'b_diff': pd['b_diff'],
        'b_prod': pd['b_prod'],
        'b_max': pd['b_max'],
        'b_min': pd['b_min'],
        'd_plus_k': pd['d_plus_k'],
        'd_minus_k': pd['d_minus_k'],
    }

prop_names = list(all_props[1].keys())

# For numerator: try X op Y for all combinations
print("\nSearching: num_idx = X op Y for all property pairs and ops (+,-,×,/,max,min):")
found_num = []
for pn1 in prop_names:
    for pn2 in prop_names:
        if pn1 == pn2:
            continue
        ops = {
            '+': lambda a,b: a+b,
            '-': lambda a,b: a-b,
            '×': lambda a,b: a*b,
            '/': lambda a,b: a/b if b != 0 else None,
        }
        for op_name, op_func in ops.items():
            match = True
            for pd in pairs_data:
                v1 = all_props[pd['k']][pn1]
                v2 = all_props[pd['k']][pn2]
                result = op_func(v1, v2)
                if result is None or abs(result - pd['R2_num_idx']) > 0.01:
                    match = False
                    break
            if match:
                found_num.append(f"num_idx = {pn1} {op_name} {pn2}")
                print(f"  FOUND: num_idx = {pn1} {op_name} {pn2}")
                for pd in pairs_data:
                    v1 = all_props[pd['k']][pn1]
                    v2 = all_props[pd['k']][pn2]
                    result = op_func(v1, v2)
                    print(f"    k={pd['k']}: {pn1}={v1}, {pn2}={v2} → {result} (target {pd['R2_num_idx']})")

print(f"\nTotal formulas found for num_idx: {len(found_num)}")

print("\nSearching: den_idx = X op Y:")
found_den = []
for pn1 in prop_names:
    for pn2 in prop_names:
        if pn1 == pn2:
            continue
        ops = {
            '+': lambda a,b: a+b,
            '-': lambda a,b: a-b,
            '×': lambda a,b: a*b,
            '/': lambda a,b: a/b if b != 0 else None,
        }
        for op_name, op_func in ops.items():
            match = True
            for pd in pairs_data:
                v1 = all_props[pd['k']][pn1]
                v2 = all_props[pd['k']][pn2]
                result = op_func(v1, v2)
                if result is None or abs(result - pd['R2_den_idx']) > 0.01:
                    match = False
                    break
            if match:
                found_den.append(f"den_idx = {pn1} {op_name} {pn2}")
                print(f"  FOUND: den_idx = {pn1} {op_name} {pn2}")
                for pd in pairs_data:
                    v1 = all_props[pd['k']][pn1]
                    v2 = all_props[pd['k']][pn2]
                    result = op_func(v1, v2)
                    print(f"    k={pd['k']}: {pn1}={v1}, {pn2}={v2} → {result} (target {pd['R2_den_idx']})")

print(f"\nTotal formulas found for den_idx: {len(found_den)}")

# ─────────────────────────────────────────────────────────────────────────────
# SECTION 8: Try three-term formulas
# ─────────────────────────────────────────────────────────────────────────────
print("\n" + "─" * 78)
print("SECTION 8: Three-term formulas — c1×X + c2×Y + c3×Z")
print("─" * 78)

# Use just the basic properties
basic = ['k', 'd_idx', 'b_in', 'b_out']
print(f"Using properties: {basic}")
print("Coefficients ∈ {{-3,...,3}}")

found_3term_num = 0
for i, pn1 in enumerate(basic):
    for j, pn2 in enumerate(basic):
        for m, pn3 in enumerate(basic):
            if j <= i or m <= j:
                continue
            for c1 in range(-3, 4):
                for c2 in range(-3, 4):
                    for c3 in range(-3, 4):
                        if c1 == 0 and c2 == 0 and c3 == 0:
                            continue
                        match = True
                        for pd in pairs_data:
                            v = c1*all_props[pd['k']][pn1] + c2*all_props[pd['k']][pn2] + c3*all_props[pd['k']][pn3]
                            if abs(v - pd['R2_num_idx']) > 0.01:
                                match = False
                                break
                        if match:
                            found_3term_num += 1
                            if found_3term_num <= 20:
                                print(f"  num_idx = {c1}×{pn1} + {c2}×{pn2} + {c3}×{pn3}")
                                for pd in pairs_data:
                                    v = c1*all_props[pd['k']][pn1] + c2*all_props[pd['k']][pn2] + c3*all_props[pd['k']][pn3]
                                    print(f"    k={pd['k']}: {v} (target {pd['R2_num_idx']})")

print(f"Total 3-term formulas for num_idx: {found_3term_num}")

found_3term_den = 0
for i, pn1 in enumerate(basic):
    for j, pn2 in enumerate(basic):
        for m, pn3 in enumerate(basic):
            if j <= i or m <= j:
                continue
            for c1 in range(-3, 4):
                for c2 in range(-3, 4):
                    for c3 in range(-3, 4):
                        if c1 == 0 and c2 == 0 and c3 == 0:
                            continue
                        match = True
                        for pd in pairs_data:
                            v = c1*all_props[pd['k']][pn1] + c2*all_props[pd['k']][pn2] + c3*all_props[pd['k']][pn3]
                            if abs(v - pd['R2_den_idx']) > 0.01:
                                match = False
                                break
                        if match:
                            found_3term_den += 1
                            if found_3term_den <= 20:
                                print(f"\n  den_idx = {c1}×{pn1} + {c2}×{pn2} + {c3}×{pn3}")
                                for pd in pairs_data:
                                    v = c1*all_props[pd['k']][pn1] + c2*all_props[pd['k']][pn2] + c3*all_props[pd['k']][pn3]
                                    print(f"    k={pd['k']}: {v} (target {pd['R2_den_idx']})")

print(f"\nTotal 3-term formulas for den_idx: {found_3term_den}")

# ─────────────────────────────────────────────────────────────────────────────
# SECTION 9: C2 constraint index analysis
# ─────────────────────────────────────────────────────────────────────────────
print("\n" + "─" * 78)
print("SECTION 9: C2 constraint Fibonacci index analysis")
print("─" * 78)

print("""
C2 constraints as F_a/F_b:
  k=1 Mars/Jupiter:   product = 34/2  = F_9/F_3  → c2_num=9, c2_den=3
  k=2 Earth/Saturn:   product = 2/1   = F_3/F_1  → c2_num=3, c2_den=1
  k=3 Venus/Neptune:  ratio   = 2/8   = F_3/F_6  → c2_num=3, c2_den=6
  k=4 Mercury/Uranus: ratio   = 2/3   = F_3/F_4  → c2_num=3, c2_den=4

Observations:
  - C2 numerator is F_9 for k=1, F_3 for k=2,3,4
  - C2 denominator: 3, 1, 6, 4
  - F_3 = 2 appears in ALL C2 constraints (as num or part of ratio)
""")

# Combined: R² and C2 constraints together
print("\nFull constraint set per pair:")
for pd in pairs_data:
    F_r2_num = fib_n(pd['R2_num_idx'])
    F_r2_den = fib_n(pd['R2_den_idx'])
    F_c2_num = fib_n(pd['C2_num_idx'])
    F_c2_den = fib_n(pd['C2_den_idx'])

    print(f"\n  k={pd['k']} {pd['inner']}/{pd['outer']} (d={pd['d']}, d_idx={pd['d_idx']}):")
    print(f"    R² sum = F_{pd['R2_num_idx']}/F_{pd['R2_den_idx']} = {F_r2_num}/{F_r2_den} = {F_r2_num/F_r2_den:.4f}")
    print(f"    C2 ({pd['C2_type']}) = F_{pd['C2_num_idx']}/F_{pd['C2_den_idx']} = {F_c2_num}/{F_c2_den} = {F_c2_num/F_c2_den:.4f}")

    # Sum of all 4 indices
    idx_sum = pd['R2_num_idx'] + pd['R2_den_idx'] + pd['C2_num_idx'] + pd['C2_den_idx']
    print(f"    Index sum: {pd['R2_num_idx']}+{pd['R2_den_idx']}+{pd['C2_num_idx']}+{pd['C2_den_idx']} = {idx_sum}")

# ─────────────────────────────────────────────────────────────────────────────
# SECTION 10: Look for pattern in the FULL constraint (R² + C2 combined)
# ─────────────────────────────────────────────────────────────────────────────
print("\n" + "─" * 78)
print("SECTION 10: Combined R²+C2 — can one derive from the other?")
print("─" * 78)

# Compute mean inclinations
mean_incl = {}
for p in PLANET_NAMES:
    mean_incl[p] = compute_mean_inclination(p)

R = {}
for p in PLANET_NAMES:
    R[p] = ECC[p] / math.radians(mean_incl[p])

# For each pair, given R² sum and actual R values, compute what C2 must be
print("\nGiven actual R values, verify both constraints:")
for k, (inner, outer) in enumerate(MIRROR_PAIRS, 1):
    r2sum = R[inner]**2 + R[outer]**2
    rprod = R[inner] * R[outer]
    rratio = R[inner] / R[outer]

    print(f"\n  k={k} {inner}/{outer}:")
    print(f"    R² sum = {r2sum:.4f}")
    print(f"    R product = {rprod:.4f}")
    print(f"    R ratio = {rratio:.6f}")

    # Cross-check: if we know R² sum and R ratio, product is determined
    # R_A/R_B = Q → R_A = Q×R_B → R_A×R_B = Q×R_B²
    # R_B² = S/(1+Q²) → product = Q×S/(1+Q²)
    S = r2sum
    Q = rratio
    implied_prod = Q * S / (1 + Q**2)
    print(f"    Implied product from sum+ratio = {implied_prod:.4f} (actual {rprod:.4f})")
    print(f"    Check: ratio and product are NOT independent (2 eqs, 2 unknowns → determined)")

print("""
IMPORTANT INSIGHT: R² sum + R ratio fully determines both R values.
R² sum + R product also determines both R values (up to assignment).
These are NOT independent — knowing any two of {R²_sum, product, ratio}
determines the third.

Therefore: we need only ONE Fibonacci constraint per pair beyond R² sum.
The choice of product vs ratio is a PRESENTATION choice, not a physical one.
""")

# ─────────────────────────────────────────────────────────────────────────────
# SECTION 11: Unified R_out/R_in ratio — Fibonacci index analysis
# ─────────────────────────────────────────────────────────────────────────────
print("\n" + "─" * 78)
print("SECTION 11: UNIFIED via R_out/R_in — Fibonacci index formula search")
print("─" * 78)

# Compute R_out/R_in for all pairs
print("\nR_out/R_in values and best Fibonacci matches:")
ratio_indices = []
extended = [1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377]
for k, (inner, outer) in enumerate(MIRROR_PAIRS, 1):
    ratio = R[outer] / R[inner]

    best = None
    best_err = float('inf')
    for a in extended:
        for b in extended:
            q = a/b
            err = abs(ratio/q - 1)
            if err < best_err:
                best_err = err
                best = (a, b, q, err)

    a_fib, b_fib, q, err = best
    a_idx = FIB_INDEX.get(a_fib, '?')
    b_idx = FIB_INDEX.get(b_fib, '?')

    print(f"  k={k} {inner:>7}/{outer:>7}: R_out/R_in = {ratio:8.4f} → "
          f"{a_fib}/{b_fib} = {q:.4f} (err {err*100:+.2f}%) "
          f"[F_{a_idx}/F_{b_idx}]")
    ratio_indices.append((k, a_idx, b_idx, a_fib, b_fib))

# Search for formula on the ratio indices
print("\nRatio indices: ", [(k, a, b) for k, a, b, _, _ in ratio_indices])

# ─────────────────────────────────────────────────────────────────────────────
# SECTION 12: Summary of all discovered patterns
# ─────────────────────────────────────────────────────────────────────────────
print("\n" + "─" * 78)
print("SECTION 12: Summary of all discovered index formulas")
print("─" * 78)

print("""
If exact formulas were found above, they are listed in Sections 2, 3, 7, 8.
This section collects and evaluates them.
""")

# Reprint the cleanest formulas found
print("R² sum = F_a / F_b where:")
for pd in pairs_data:
    F_num = fib_n(pd['R2_num_idx'])
    F_den = fib_n(pd['R2_den_idx'])
    print(f"  k={pd['k']} {pd['inner']:>7}/{pd['outer']:>7}: "
          f"a={pd['R2_num_idx']:>2}, b={pd['R2_den_idx']:>2} → "
          f"F_a/F_b = {F_num}/{F_den} = {F_num/F_den:.4f}  "
          f"[d={pd['d']}, b_in={pd['b_in']}, b_out={pd['b_out']}]")

print("\n" + "=" * 78)
print("INVESTIGATION COMPLETE")
print("=" * 78)
