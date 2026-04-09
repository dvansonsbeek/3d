#!/usr/bin/env python3
"""
LAW 4 (ECCENTRICITY CONSTANT) — VERIFICATION
==============================================

Law 4 connects the eight planetary eccentricities to the eight inclination
amplitudes through four small Fibonacci/Lucas ratios — one per mirror pair.
For each planet define the dimensionless ratio

    R = e_base / i_mean_rad

where e_base is the long-term eccentricity midpoint (from the model's
base/amplitude split) and i_mean is the planet's mean inclination to the
invariable plane (from Law 2).

The four pair constraints are:

    Mars / Jupiter   :   R_Ju² / R_Ma²  =  144 / 11    (F₁₂ / L₅)
    Earth / Saturn   :   R_S  / R_E     =  21 / 4      (F₈  / L₃)
    Venus / Neptune  :   R_Ne² / R_V²   =  55 / 4      (F₁₀ / L₃)
    Mercury / Uranus :   R_Me² + R_Ur²  =  55 / 5  = 11 (F₁₀ / F₅)

Three of the four are pure Fibonacci/Lucas ratios; one is a Fibonacci/Fibonacci
sum-of-squares. Each constraint gives one equation, so the four pair
relations predict the four outer-planet eccentricities given the four
inner-planet eccentricities — leaving zero free parameters beyond the inner
quartet (which itself satisfies the ξ-ladder).

Sections:
  1. Constraint accuracy (R-form value vs Fibonacci target)
  2. Per-planet eccentricity prediction (inner → outer)
  3. Cross-check with Law 5 balance
  4. Monte Carlo independence test (random e satisfying Law 5 don't satisfy Law 4)
"""

import math
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)),
                                 '..', 'tools', 'lib', 'python'))
from constants_scripts import (
    PLANET_NAMES, ECC_BASE, INCL_MEAN, MASS, SMA, D, GROUP_203,
    verify_law3,
)


# ═══════════════════════════════════════════════════════════════════════════
# COMMON SETUP
# ═══════════════════════════════════════════════════════════════════════════

INCL_MEAN_RAD = {p: math.radians(INCL_MEAN[p]) for p in PLANET_NAMES}
R_VAL = {p: ECC_BASE[p] / INCL_MEAN_RAD[p] for p in PLANET_NAMES}

# Pair definitions: (inner, outer, form, target, target_label)
# form: 'sq_ratio'  → R_outer² / R_inner² = target          (predict R_outer = R_inner × √target)
#       'lin_ratio' → R_outer  / R_inner  = target          (predict R_outer = R_inner × target)
#       'sq_sum'    → R_inner² + R_outer² = target          (predict R_outer = √(target − R_inner²))
PAIRS = [
    ("Mars",    "Jupiter", "sq_ratio", 144 / 11, "144/11 (F₁₂/L₅)"),
    ("Earth",   "Saturn",  "lin_ratio", 21 / 4,   "21/4  (F₈/L₃)"),
    ("Venus",   "Neptune", "sq_ratio", 55 / 4,   "55/4  (F₁₀/L₃)"),
    ("Mercury", "Uranus",  "sq_sum",   55 / 5,   "55/5  (F₁₀/F₅) = 11"),
]


def predict_outer_R(inner_R, form, target):
    if form == "sq_ratio":
        return inner_R * math.sqrt(target)
    if form == "lin_ratio":
        return inner_R * target
    if form == "sq_sum":
        return math.sqrt(max(0.0, target - inner_R * inner_R))
    raise ValueError(form)


def measure(inner, outer, form):
    Ri = R_VAL[inner]
    Ro = R_VAL[outer]
    if form == "sq_ratio":
        return (Ro * Ro) / (Ri * Ri)
    if form == "lin_ratio":
        return Ro / Ri
    if form == "sq_sum":
        return Ri * Ri + Ro * Ro
    raise ValueError(form)


# ═══════════════════════════════════════════════════════════════════════════
# HEADER
# ═══════════════════════════════════════════════════════════════════════════

print("=" * 78)
print("LAW 4 (ECCENTRICITY CONSTANT) — VERIFICATION")
print("=" * 78)
print("\nInputs: e_base (model long-term midpoint), i_mean (Law 2 mean inclination)")
print("Form  : four pair-specific Fibonacci/Lucas constraints (one per mirror pair)")
print()

print(f"  {'Planet':>10}  {'e_base':>10}  {'i_mean°':>9}  "
      f"{'i_mean_rad':>12}  {'R = e/i':>10}")
print("  " + "─" * 60)
for p in PLANET_NAMES:
    print(f"  {p:>10}  {ECC_BASE[p]:10.6f}  {INCL_MEAN[p]:9.4f}  "
          f"{INCL_MEAN_RAD[p]:12.6e}  {R_VAL[p]:10.4f}")


# ═══════════════════════════════════════════════════════════════════════════
# SECTION 1: CONSTRAINT ACCURACY
# ═══════════════════════════════════════════════════════════════════════════

print("\n" + "=" * 78)
print("Section 1: Pair constraint accuracy")
print("=" * 78)

print(f"\n  {'Pair':<22} {'Form':<22} {'Observed':>10} {'Target':>10} {'Error':>9}")
print("  " + "─" * 75)

constraint_errs = []
for inner, outer, form, target, label in PAIRS:
    obs = measure(inner, outer, form)
    err_pct = (obs / target - 1) * 100
    constraint_errs.append(abs(err_pct))
    form_display = {
        "sq_ratio":  f"R_{outer[0]}²/R_{inner[0]}² = {label}",
        "lin_ratio": f"R_{outer[0]}/R_{inner[0]} = {label}",
        "sq_sum":    f"R_{inner[0]}²+R_{outer[0]}² = {label}",
    }[form]
    print(f"  {inner+'/'+outer:<22} {form_display:<22} "
          f"{obs:10.4f} {target:10.4f} {err_pct:+8.4f}%")

print(f"\n  Mean |constraint error|: {sum(constraint_errs)/4:.4f}%")
print(f"  Max  |constraint error|: {max(constraint_errs):.4f}%")


# ═══════════════════════════════════════════════════════════════════════════
# SECTION 2: PER-PLANET ECCENTRICITY PREDICTION (inner → outer)
# ═══════════════════════════════════════════════════════════════════════════

print("\n" + "=" * 78)
print("Section 2: Eccentricity prediction (4 inner planets → 4 outer planets)")
print("=" * 78)

print("\n  References:  Mercury, Venus, Earth, Mars  (inner quartet — ξ-ladder)")
print("  Predicted:   Jupiter, Saturn, Uranus, Neptune  (one per Law 4 pair)\n")

predictions = {}
for inner, outer, form, target, _ in PAIRS:
    Ri = R_VAL[inner]
    Ro_pred = predict_outer_R(Ri, form, target)
    e_pred = Ro_pred * INCL_MEAN_RAD[outer]
    predictions[outer] = e_pred

# Build a single table over all 8 planets
print(f"  {'Planet':>10}  {'Role':<10}  {'e_predicted':>12}  "
      f"{'e_observed':>12}  {'Error':>9}")
print("  " + "─" * 60)

per_planet_errs = []
for p in PLANET_NAMES:
    e_obs = ECC_BASE[p]
    if p in predictions:
        e_pred = predictions[p]
        err = (e_pred - e_obs) / e_obs * 100
        per_planet_errs.append(abs(err))
        # Find which pair predicted it
        pair_inner = next(inner for (inner, outer, _, _, _) in PAIRS if outer == p)
        role = f"← {pair_inner[:3]}"
        print(f"  {p:>10}  {role:<10}  {e_pred:12.6f}  "
              f"{e_obs:12.6f}  {err:+8.4f}%")
    else:
        print(f"  {p:>10}  {'reference':<10}  {e_obs:12.6f}  "
              f"{e_obs:12.6f}  {'   ref':>9}")

print(f"\n  Mean |prediction error| (4 outer planets): {sum(per_planet_errs)/4:.4f}%")
print(f"  Max  |prediction error|                    : {max(per_planet_errs):.4f}%")


# ═══════════════════════════════════════════════════════════════════════════
# SECTION 3: CROSS-CHECK WITH LAW 5 BALANCE
# ═══════════════════════════════════════════════════════════════════════════

print("\n" + "=" * 78)
print("Section 3: Law 5 cross-check")
print("=" * 78)

# Build the predicted-eccentricity set: inner observed + outer predicted
e_pred_set = {}
for p in PLANET_NAMES:
    e_pred_set[p] = predictions.get(p, ECC_BASE[p])

# Law 5: Σ(in-phase) √m × a^1.5 × e / √d  ≈  same for Saturn alone
def law5_balance(ecc_dict):
    sum_in = sum(math.sqrt(MASS[p]) * SMA[p]**1.5 * ecc_dict[p] / math.sqrt(D[p])
                 for p in GROUP_203)
    sum_sa = (math.sqrt(MASS["Saturn"]) * SMA["Saturn"]**1.5
              * ecc_dict["Saturn"] / math.sqrt(D["Saturn"]))
    return (1 - abs(sum_in - sum_sa) / (sum_in + sum_sa)) * 100

bal_observed  = law5_balance(ECC_BASE)
bal_predicted = law5_balance(e_pred_set)
print(f"\n  Law 5 balance (observed e_base) : {bal_observed:9.4f}%")
print(f"  Law 5 balance (Law-4 predicted) : {bal_predicted:9.4f}%")
print(f"  Difference                       : {bal_observed - bal_predicted:+9.4f} pp")


# ═══════════════════════════════════════════════════════════════════════════
# SECTION 4: MONTE CARLO INDEPENDENCE TEST
# ═══════════════════════════════════════════════════════════════════════════

print("\n" + "=" * 78)
print("Section 4: Independence — random eccentricities satisfying Law 5")
print("           don't simultaneously satisfy Law 4")
print("=" * 78)

import random
random.seed(42)

N_TRIALS = 50000
hits_per_pair = {(i, o): 0 for (i, o, _, _, _) in PAIRS}
all_4_hits = 0
valid = 0

for _ in range(N_TRIALS):
    e_rand = {}
    for p in PLANET_NAMES:
        if p == "Saturn":
            continue
        e_rand[p] = math.exp(random.uniform(math.log(0.005), math.log(0.25)))

    sum_in = sum(math.sqrt(MASS[p]) * SMA[p]**1.5 * e_rand[p] / math.sqrt(D[p])
                 for p in GROUP_203)
    coeff_Sa = math.sqrt(MASS["Saturn"]) * SMA["Saturn"]**1.5 / math.sqrt(D["Saturn"])
    e_Sa = sum_in / coeff_Sa
    if e_Sa <= 0 or e_Sa > 0.5:
        continue
    e_rand["Saturn"] = e_Sa
    valid += 1

    R_rand = {p: e_rand[p] / INCL_MEAN_RAD[p] for p in PLANET_NAMES}
    pair_hit = []
    for inner, outer, form, target, _ in PAIRS:
        if form == "sq_ratio":
            obs = (R_rand[outer]**2) / (R_rand[inner]**2)
        elif form == "lin_ratio":
            obs = R_rand[outer] / R_rand[inner]
        else:
            obs = R_rand[inner]**2 + R_rand[outer]**2
        if abs(obs / target - 1) < 0.01:
            hits_per_pair[(inner, outer)] += 1
            pair_hit.append(True)
        else:
            pair_hit.append(False)
    if all(pair_hit):
        all_4_hits += 1

print(f"\n  Trials satisfying Law 5 (Saturn ∈ [0,0.5]): {valid:,}")
print(f"\n  {'Pair':<22} {'Within 1% of target':>22}")
print("  " + "─" * 46)
for (inner, outer), n in hits_per_pair.items():
    pct = n / valid * 100 if valid else 0
    print(f"  {inner+'/'+outer:<22} {n:>7,} = {pct:>6.3f}%")
print(f"\n  All 4 pairs simultaneously: {all_4_hits:,} / {valid:,} "
      f"= {all_4_hits/valid*100:.4f}%")
print("  → Law 4 cannot be derived from Law 5 alone (independent constraints).")


# ═══════════════════════════════════════════════════════════════════════════
# COMPLETE
# ═══════════════════════════════════════════════════════════════════════════

print("\n" + "=" * 78)
print("LAW 4 VERIFICATION COMPLETE")
print("=" * 78)
