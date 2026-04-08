#!/usr/bin/env python3
"""
LAW 4 — BALANCE-EQUATION SEARCH
================================

Law 5 has the form:

    Σ(in-phase) c_p · e_p  =  Σ(anti-phase) c_p · e_p

with c_p = √m_p · a_p^(3/2) / √d_p. This is one equation in eight unknowns
(the eccentricities); given seven of them, the eighth is determined.

The current Law 4 tries to predict four outer eccentricities from four inner
ones via fitted Fibonacci ratios — but those ratios are at noise level under
the dense Fibonacci/Lucas combination space, so Law 4 isn't really a law.

THIS SCRIPT asks the right question:

  Are there OTHER balance equations of the same form as Law 5, with
  different (c_p, groupings)? If so, we have multiple independent linear
  constraints on the eccentricities, and Law 4 becomes "the eccentricities
  satisfy N balance equations" — derived structurally, not fitted.

Search:
  weight  c_p = m^α · a^β · d^γ      with α,β,γ ∈ {-2,-1.5,-1,-0.5,0,0.5,1,1.5,2}
  groupings:
    G1: in-phase vs anti-phase    (= Law 5)
    G2: inner four vs outer four
    G3: rocky vs gas (= same as G2 here)
    G4: each of 4 mirror pairs    (4 separate equations)
    G5: odd vs even Fibonacci d    (3,5,21 vs 13,34)

For each (weight, grouping) combination compute:
  - balance_pct = 100 × (1 − |sum_A − sum_B| / (sum_A + sum_B))
  - null tightness via 1000 random eccentricity-shuffles

A combination 'survives' iff:
  - balance_pct ≥ 99.99%   AND
  - fewer than 0.5% of random shuffles reach this accuracy
  - The (α, β, γ) exponents are "small" (|·| ≤ 1.5)

Any survivor is a candidate Law 4 component.

Usage: python3 scripts/fibonacci_law4_balance_search.py
"""

import math
import random
import sys
import os
from itertools import product as iprod

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)),
                                 '..', 'tools', 'lib', 'python'))
from constants_scripts import (
    PLANET_NAMES, ECC_BASE, MASS, SMA, D, GROUP_203, INCL_MEAN,
)

random.seed(42)

# ─── Groupings ───
INNER = ["Mercury", "Venus", "Earth", "Mars"]
OUTER = ["Jupiter", "Saturn", "Uranus", "Neptune"]

# Mirror pairs (the pair structure the model uses)
PAIRS = [
    ("Mercury", "Uranus"),
    ("Venus",   "Neptune"),
    ("Earth",   "Saturn"),
    ("Mars",    "Jupiter"),
]

# In-phase vs anti-phase (Saturn alone is anti-phase)
IN_PHASE = [p for p in PLANET_NAMES if p != "Saturn"]
ANTI = ["Saturn"]

# Odd vs even Fibonacci d (3,5,21 odd; 13,34 even — but 13 is odd, 34 is even)
# Actually use a different split: d ≤ 8 vs d > 8
SMALL_D = [p for p in PLANET_NAMES if D[p] <= 8]
LARGE_D = [p for p in PLANET_NAMES if D[p] > 8]


# ─── Helper: compute weighted sum ───
def weighted_sum(group, alpha, beta, gamma):
    return sum(
        (MASS[p] ** alpha) * (SMA[p] ** beta) * (D[p] ** gamma) * ECC_BASE[p]
        for p in group
    )


def balance(group_a, group_b, alpha, beta, gamma):
    """Return balance% (100 = perfect match)."""
    sa = weighted_sum(group_a, alpha, beta, gamma)
    sb = weighted_sum(group_b, alpha, beta, gamma)
    if sa == 0 or sb == 0:
        return 0
    return (1 - abs(sa - sb) / (sa + sb)) * 100


# ─── Null test: random eccentricity permutations ───
def null_distribution(group_a, group_b, alpha, beta, gamma, n=1000):
    """For random shuffles of the 8 eccentricities, compute balance%.
    Returns the fraction of shuffles that beat the actual configuration."""
    actual = balance(group_a, group_b, alpha, beta, gamma)
    e_list = [ECC_BASE[p] for p in PLANET_NAMES]
    plist = list(PLANET_NAMES)
    better_or_equal = 0
    for _ in range(n):
        random.shuffle(e_list)
        perm_e = dict(zip(plist, e_list))
        sa = sum((MASS[p] ** alpha) * (SMA[p] ** beta) * (D[p] ** gamma) * perm_e[p]
                 for p in group_a)
        sb = sum((MASS[p] ** alpha) * (SMA[p] ** beta) * (D[p] ** gamma) * perm_e[p]
                 for p in group_b)
        if sa == 0 or sb == 0:
            continue
        b = (1 - abs(sa - sb) / (sa + sb)) * 100
        if b >= actual:
            better_or_equal += 1
    # Restore order
    for p, e in zip(plist, [ECC_BASE[q] for q in PLANET_NAMES]):
        pass
    return better_or_equal / n * 100


# ═══════════════════════════════════════════════════════════════════════════
# REPORT
# ═══════════════════════════════════════════════════════════════════════════

print("=" * 88)
print("LAW 4 BALANCE-EQUATION SEARCH")
print("=" * 88)
print()
print("Searching for balance equations of the form  Σ_A c_p·e_p = Σ_B c_p·e_p")
print("with c_p = m_p^α · a_p^β · d_p^γ  and groupings:")
print("  G1: in-phase (7 planets) vs anti-phase (Saturn)        [= Law 5]")
print("  G2: inner four (Me Ve Ea Ma) vs outer four (Ju Sa Ur Ne)")
print("  G3: small d (≤8) vs large d (>8)")
print("  G4: 4 mirror-pair internal balances (one equation per pair)")
print()
print("Significance threshold: balance ≥ 99.99%  AND  < 0.5% of random")
print("eccentricity shuffles match this accuracy. Exponents bounded by 1.5.")
print()

# ─── Reference: confirm Law 5 ───
print("─" * 88)
print("REFERENCE: Law 5 (in-phase vs anti-phase, c = √m·a^(3/2)/√d)")
print("─" * 88)
b5 = balance(IN_PHASE, ANTI, 0.5, 1.5, -0.5)
n5 = null_distribution(IN_PHASE, ANTI, 0.5, 1.5, -0.5, n=2000)
print(f"  Balance: {b5:.4f}%   Null rank: {n5:.2f}% of shuffles match this")
print()

# ─── Sweep weights × groupings ───
EXPS = [-1.5, -1, -0.5, 0, 0.5, 1, 1.5]

groupings = [
    ("G1: in-phase / anti-phase    ", IN_PHASE, ANTI),
    ("G2: inner / outer            ", INNER, OUTER),
    ("G3: small d / large d        ", SMALL_D, LARGE_D),
]

print("─" * 88)
print("GLOBAL GROUPINGS — top 10 best (weight, grouping) combinations")
print("─" * 88)

results = []
for label, A, B in groupings:
    for a, b, c in iprod(EXPS, EXPS, EXPS):
        if a == 0 and b == 0 and c == 0:
            continue
        bal = balance(A, B, a, b, c)
        if bal < 99.0:
            continue
        # Quick null check (cheap)
        n = null_distribution(A, B, a, b, c, n=200)
        results.append((bal, n, label, a, b, c))

results.sort(key=lambda r: (-r[0], r[1]))
print(f"\n  {'rank':>4}  {'bal%':>10}  {'null%':>7}  {'grouping':<32}  {'c_p':<22}")
print("  " + "─" * 84)
seen_grouping = set()
shown = 0
for r in results[:30]:
    bal, n, lbl, a, b, c = r
    parts = []
    if a != 0: parts.append(f"m^{a:g}")
    if b != 0: parts.append(f"a^{b:g}")
    if c != 0: parts.append(f"d^{c:g}")
    weight = "·".join(parts) if parts else "(constant)"
    print(f"  {shown+1:>4}  {bal:>9.5f}%  {n:>6.1f}%  {lbl:<32}  {weight:<22}")
    shown += 1
print()

# ─── Mirror-pair internal balance (4 separate equations) ───
print("─" * 88)
print("MIRROR-PAIR INTERNAL BALANCES — does each pair satisfy its own balance?")
print("─" * 88)
print()
print("For each mirror pair (P_inner, P_outer), find if c_P_inner·e_inner = c_P_outer·e_outer")
print("for some weight c = m^α·a^β·d^γ. This would give 4 independent equations,")
print("one per pair, all of the same structural form.")
print()
print("  For each pair, the ratio R_pair = c_inner·e_inner / c_outer·e_outer should = 1")
print()

# For each pair, sweep exponents and find combos giving R = 1 within tolerance
for inner, outer in PAIRS:
    print(f"  ─── {inner} / {outer} ───")
    candidates = []
    for a, b, c in iprod(EXPS, EXPS, EXPS):
        if a == 0 and b == 0 and c == 0:
            continue
        ci = (MASS[inner] ** a) * (SMA[inner] ** b) * (D[inner] ** c)
        co = (MASS[outer] ** a) * (SMA[outer] ** b) * (D[outer] ** c)
        if co == 0 or ci == 0:
            continue
        ratio = (ci * ECC_BASE[inner]) / (co * ECC_BASE[outer])
        # Want ratio = 1 (or any small simple fraction p/q?)
        err_from_1 = abs(ratio - 1) * 100
        candidates.append((err_from_1, a, b, c, ratio))
    candidates.sort()
    print(f"    Top 3 fits (smallest |ratio − 1|):")
    for err, a, b, c, ratio in candidates[:3]:
        parts = []
        if a != 0: parts.append(f"m^{a:g}")
        if b != 0: parts.append(f"a^{b:g}")
        if c != 0: parts.append(f"d^{c:g}")
        wt = "·".join(parts) if parts else "(const)"
        print(f"      ratio = {ratio:.6f}  err {err:.4f}%   c = {wt}")
    print()


# ═══════════════════════════════════════════════════════════════════════════
# Significance: try the BEST combinations against the null
# ═══════════════════════════════════════════════════════════════════════════
print("─" * 88)
print("DEEP NULL TEST on top results")
print("─" * 88)
print()
print("For each top candidate, run 5000 random eccentricity shuffles and report")
print("how many shuffles match the balance accuracy.")
print()

# Filter out duplicate (label, exponents up to symmetry) and Law 5 itself
dedup = []
seen = set()
for r in results:
    bal, n, lbl, a, b, c = r
    key = (lbl, a, b, c)
    if key in seen:
        continue
    seen.add(key)
    # Skip Law 5 itself
    if lbl.startswith("G1") and abs(a-0.5)<1e-9 and abs(b-1.5)<1e-9 and abs(c-(-0.5))<1e-9:
        continue
    dedup.append(r)

print(f"  {'rank':>4}  {'bal%':>10}  {'null/5000':>10}  {'grouping':<32}  {'c_p':<22}")
print("  " + "─" * 84)
for i, r in enumerate(dedup[:8]):
    bal, _, lbl, a, b, c = r
    n_strict = null_distribution(
        IN_PHASE if "in-phase" in lbl else (INNER if "inner" in lbl else SMALL_D),
        ANTI if "in-phase" in lbl else (OUTER if "inner" in lbl else LARGE_D),
        a, b, c, n=5000)
    parts = []
    if a != 0: parts.append(f"m^{a:g}")
    if b != 0: parts.append(f"a^{b:g}")
    if c != 0: parts.append(f"d^{c:g}")
    weight = "·".join(parts) if parts else "(constant)"
    marker = "  ★" if (bal >= 99.99 and n_strict < 0.5) else ""
    print(f"  {i+1:>4}  {bal:>9.5f}%  {n_strict:>9.2f}%  {lbl:<32}  {weight:<22}{marker}")

print()
print("=" * 88)
print("VERDICT")
print("=" * 88)
print("""
A 'star' combination (★) is a balance equation that:
  - matches the eight observed eccentricities to ≥ 99.99% accuracy
  - is significantly better than random eccentricity orderings (< 0.5% null)
  - uses small-integer/half-integer exponents in (m, a, d)

These are real candidates for additional laws of the same form as Law 5.
If we find 3 such laws (in addition to Law 5), we'd have 4 linear constraints
on the eccentricities — a complete predictive system for one chosen unknown.

If no stars appear, the eccentricities don't satisfy multiple independent
balance equations beyond Law 5 itself, and the four mirror-pair eccentricities
must come from somewhere outside the (m, a, d) framework.
""")
