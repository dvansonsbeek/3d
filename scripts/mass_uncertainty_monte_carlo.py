#!/usr/bin/env python3
"""
MASS-UNCERTAINTY MONTE CARLO FOR LAW 5 BALANCE
================================================

Quantifies how much of the framework's 4.27 × 10⁻⁵ Law 5 residual is
attributable to planetary mass measurement uncertainty, per the framework's
own attribution (Fibonacci Laws Derivation §Law 5):

    "The residual may reflect contributions from minor bodies (dwarf
     planets, asteroids) not included in the 8-planet framework, or
     measurement uncertainties in planetary masses — particularly Uranus
     and Neptune, whose masses are currently known only from Voyager 2
     flybys (relative uncertainties ~0.02–0.08%)."

This script perturbs each planet's mass within its 1-σ measurement
uncertainty, recomputes the Law 5 v-balance for many Monte Carlo trials,
and reports:

  - σ(balance) attributable to each planet's mass uncertainty alone
  - Combined σ from all 8 planets' mass uncertainties
  - Comparison to the framework's observed 4.27 × 10⁻⁵ residual

The "minor-body channel" is the COMPLEMENT to this — whatever residual
is not explained by mass uncertainty must come from minor bodies (doc 19
§5.2). This script feeds the mass-uncertainty side of the split.

Mass uncertainty values (1-σ, relative):
  - Uranus / Neptune: ~5 × 10⁻⁴ (Voyager 2 flyby era; DE440 documentation)
  - Saturn:           ~3 × 10⁻⁶ (Cassini orbiter)
  - Jupiter:          ~1 × 10⁻⁸ (multiple flybys + Juno)
  - Inner planets:    ~1 × 10⁻⁷ (landers + orbital tracking)

Output: data/mass-uncertainty-mc.json
"""

import json
import math
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "tools" / "lib" / "python"))
import constants_scripts as C

OUT_PATH = Path(__file__).resolve().parent.parent / "data" / "mass-uncertainty-mc.json"

# Framework observed residual (signed gap in v: in-phase − anti-phase)
FRAMEWORK_RESIDUAL_V = -4.27e-5  # signed: anti-phase exceeds in-phase
FRAMEWORK_RESIDUAL_MAGNITUDE = abs(FRAMEWORK_RESIDUAL_V)
FRAMEWORK_CLOSURE_PCT = 99.862

# 1-σ relative mass uncertainties (fractional)
# Sources: DE440 documentation (Park et al. 2021), Folkner et al. lineage,
# Voyager era uncertainties for Uranus/Neptune.
RELATIVE_SIGMA = {
    'Mercury': 1e-7,   # MESSENGER ranging
    'Venus':   1e-7,   # Pioneer Venus + Magellan
    'Earth':   3e-9,   # very well determined
    'Mars':    1e-7,   # multiple landers + orbital tracking
    'Jupiter': 1e-8,   # multiple flybys + Juno
    'Saturn':  3e-6,   # Cassini orbiter
    'Uranus':  5e-4,   # Voyager 2 flyby only — the dominant uncertainty
    'Neptune': 5e-4,   # Voyager 2 flyby only — the dominant uncertainty
}

# Planet configuration (matches default Config #7)
# d-values from doc 10 §Law 3 / §Law 5 — Earth/Saturn d=3, Jupiter/Mars d=5,
# Mercury/Uranus d=21, Venus/Neptune d=34
D_VALUES = {
    'Mercury': 21, 'Venus': 34, 'Earth': 3, 'Mars': 5,
    'Jupiter': 5, 'Saturn': 3, 'Uranus': 21, 'Neptune': 34,
}
ANTI_PHASE = {p: (p == 'Saturn') for p in D_VALUES}

N_TRIALS = 100_000
RNG_SEED = 20260522


def v_weight(mass, sma, e, d):
    """Law 5 per-planet eccentricity-balance weight."""
    return math.sqrt(mass) * sma ** 1.5 * e / math.sqrt(d)


def baseline_balance():
    """Compute Law 5 balance with the canonical (unperturbed) masses."""
    v_in, v_anti = 0.0, 0.0
    weights = {}
    for p in C.PLANET_NAMES:
        m = C.MASS[p]
        a = C.SMA[p]
        e = C.ECC_BASE[p]
        d = D_VALUES[p]
        v = v_weight(m, a, e, d)
        weights[p] = v
        if ANTI_PHASE[p]:
            v_anti += v
        else:
            v_in += v
    gap = v_in - v_anti
    balance = (1 - abs(gap) / (v_in + v_anti)) * 100
    return v_in, v_anti, gap, balance, weights


def perturbed_balance(rng, sigmas):
    """Perturb each planet's mass by Gaussian(0, sigma_rel · m), recompute balance."""
    v_in, v_anti = 0.0, 0.0
    for p in C.PLANET_NAMES:
        m_nominal = C.MASS[p]
        sigma_rel = sigmas.get(p, 0.0)
        m_perturbed = m_nominal * (1 + rng.normal(0, sigma_rel))
        a = C.SMA[p]
        e = C.ECC_BASE[p]
        d = D_VALUES[p]
        v = v_weight(m_perturbed, a, e, d)
        if ANTI_PHASE[p]:
            v_anti += v
        else:
            v_in += v
    return v_in - v_anti, (1 - abs(v_in - v_anti) / (v_in + v_anti)) * 100


def main():
    print("=" * 72)
    print("MASS-UNCERTAINTY MONTE CARLO FOR LAW 5 BALANCE")
    print("=" * 72)
    print(f"  N_trials: {N_TRIALS:,}")
    print(f"  Framework residual: {FRAMEWORK_RESIDUAL_MAGNITUDE:.2e} (closure {FRAMEWORK_CLOSURE_PCT}%)")
    print()
    print("  Relative mass uncertainties (1-σ):")
    for p in C.PLANET_NAMES:
        sigma = RELATIVE_SIGMA[p]
        m = C.MASS[p]
        abs_sigma = sigma * m
        v_share = v_weight(m, C.SMA[p], C.ECC_BASE[p], D_VALUES[p])
        print(f"    {p:<8} σ_rel = {sigma:.0e}  (Δm = {abs_sigma:.2e}, baseline v = {v_share:.3e})")

    v_in, v_anti, gap, balance, weights = baseline_balance()
    print()
    print(f"  Baseline:  Σv_in = {v_in:.6e}, Σv_anti = {v_anti:.6e}")
    print(f"             gap = {gap:.3e}, balance = {balance:.6f}%")
    print()

    rng = np.random.default_rng(RNG_SEED)

    # ── Per-planet MC: only this planet's mass varies ────────────────────
    print("─" * 72)
    print("Per-planet contribution to balance σ (only this planet's mass varies):")
    print(f"  {'Planet':<8} {'σ(gap)':>14} {'σ(balance pct)':>16} {'% of residual':>16}")
    print("-" * 72)

    per_planet_results = {}
    for p in C.PLANET_NAMES:
        sigmas = {p: RELATIVE_SIGMA[p]}
        gaps = np.empty(N_TRIALS)
        for i in range(N_TRIALS):
            gaps[i], _ = perturbed_balance(rng, sigmas)
        sigma_gap = gaps.std()
        sigma_balance_pct = sigma_gap / (v_in + v_anti) * 100
        pct_of_residual = sigma_gap / FRAMEWORK_RESIDUAL_MAGNITUDE * 100
        per_planet_results[p] = {
            "sigma_relative_mass": RELATIVE_SIGMA[p],
            "sigma_gap": float(sigma_gap),
            "sigma_balance_pct": float(sigma_balance_pct),
            "pct_of_residual": float(pct_of_residual),
        }
        print(f"  {p:<8} {sigma_gap:>14.3e} {sigma_balance_pct:>15.5f}% {pct_of_residual:>15.2f}%")

    # ── Combined MC: all planets' masses vary simultaneously ─────────────
    print()
    print("─" * 72)
    print("Combined MC (all 8 planets' masses vary simultaneously):")
    print()
    gaps_combined = np.empty(N_TRIALS)
    balances_combined = np.empty(N_TRIALS)
    for i in range(N_TRIALS):
        gaps_combined[i], balances_combined[i] = perturbed_balance(rng, RELATIVE_SIGMA)
    sigma_gap_combined = gaps_combined.std()
    sigma_balance_pct_combined = sigma_gap_combined / (v_in + v_anti) * 100
    pct_of_residual_combined = sigma_gap_combined / FRAMEWORK_RESIDUAL_MAGNITUDE * 100

    print(f"  σ(gap) = {sigma_gap_combined:.3e}")
    print(f"  σ(balance pct) = {sigma_balance_pct_combined:.5f}%")
    print(f"  % of framework residual: {pct_of_residual_combined:.2f}%")
    print()

    # ── Implied minor-body budget ─────────────────────────────────────────
    print("─" * 72)
    print("Residual budget split (under quadrature combination):")
    print()
    residual_sq = FRAMEWORK_RESIDUAL_MAGNITUDE ** 2
    mass_sq = sigma_gap_combined ** 2
    minor_body_sq = residual_sq - mass_sq
    if minor_body_sq > 0:
        minor_body = math.sqrt(minor_body_sq)
        print(f"  Framework residual:           {FRAMEWORK_RESIDUAL_MAGNITUDE:.3e}")
        print(f"  Mass-uncertainty contribution: {sigma_gap_combined:.3e}  ({pct_of_residual_combined:.1f}%)")
        print(f"  Minor-body contribution:       {minor_body:.3e}  ({minor_body/FRAMEWORK_RESIDUAL_MAGNITUDE*100:.1f}%)")
        print()
        K = 3.4149e-6
        sin_tilt = 0.5
        N_implied = (minor_body / (K * sin_tilt)) ** 2
        print(f"  Implied N (minor bodies) after removing mass-uncertainty:")
        print(f"    N = ({minor_body:.3e} / (K · sin))² = {N_implied:.0f}")
    else:
        # Mass uncertainty alone exceeds residual — implies measurements have
        # tighter constraints OR the framework's e_base is overfit
        print(f"  Mass-uncertainty σ ({sigma_gap_combined:.3e}) EXCEEDS framework residual.")
        print(f"  The framework's 4.27e-5 residual is then consistent with mass")
        print(f"  uncertainty alone, with minor-body contribution potentially zero.")

    # ── Save results ──────────────────────────────────────────────────────
    OUT_PATH.write_text(json.dumps({
        "framework": "Mass-uncertainty Monte Carlo for Law 5 balance",
        "n_trials": N_TRIALS,
        "relative_mass_uncertainty_sigmas": RELATIVE_SIGMA,
        "framework_residual_v_magnitude": FRAMEWORK_RESIDUAL_MAGNITUDE,
        "framework_closure_pct": FRAMEWORK_CLOSURE_PCT,
        "baseline": {
            "v_in_phase": v_in, "v_anti_phase": v_anti, "gap": gap, "balance_pct": balance,
        },
        "per_planet_contribution": per_planet_results,
        "combined": {
            "sigma_gap": float(sigma_gap_combined),
            "sigma_balance_pct": float(sigma_balance_pct_combined),
            "pct_of_residual": float(pct_of_residual_combined),
        },
        "residual_split": {
            "framework_residual_v": FRAMEWORK_RESIDUAL_MAGNITUDE,
            "mass_uncertainty_v": float(sigma_gap_combined),
            "minor_body_v_implied": float(math.sqrt(max(0, residual_sq - mass_sq))),
            "minor_body_N_implied": float(math.sqrt(max(0, residual_sq - mass_sq)) /
                                          (3.4149e-6 * 0.5)) ** 2 if (residual_sq - mass_sq) > 0 else None,
        },
        "rng_seed": RNG_SEED,
    }, indent=2))
    print(f"\nOutput: {OUT_PATH}")


if __name__ == "__main__":
    main()
