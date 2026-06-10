#!/usr/bin/env python3
"""
Test whether using time-evolving 8H(t) improves the climate formula's R²
vs the current constant 8H_now = 2,682,536 yr.

Method
------
The current climate formula uses sinusoids cos(2πn t / 8H) where 8H is constant.
For a time-evolving 8H(t), the phase accumulates as
  φ(t) = ∫₀ᵗ dt' / 8H(t')
and the sinusoid becomes cos(2πn × 8H_now × φ(t)).

Equivalent reformulation: replace the time axis with a "phase-warped time"
  τ(t) = 8H_now × φ(t) = ∫₀ᵗ (8H_now / 8H(t')) dt'

For 8H_paleo(t) < 8H_now (deep time), τ accumulates FASTER than t,
so τ(-66 Myr) > 66 Myr — a tiny but real shift.

We compare R² between:
  - Constant 8H fit (current implementation)
  - Time-warped phase fit (proposed enhancement)

If R² improves materially, time-evolving 8H is worth implementing.
"""

import json
import sys
from pathlib import Path
import numpy as np
from scipy.integrate import cumulative_trapezoid

SCRIPTS_DIR = Path(__file__).parent
sys.path.insert(0, str(SCRIPTS_DIR))
from milankovitch_climate_formula import (
    EIGHT_H, H, L1_LATTICE_INTEGERS, L2_THERMOSTAT_FAMILY,
    L3_TRANSITIONS_MA, ClimateFormula, REGIME_WINDOWS,
)

MilankovitchClimateFormula = ClimateFormula  # alias for clarity

H_NOW = 335317
LOD_NOW_S = 86400


# Paleo-LOD calibration (from doc 99 — extends from Farhat 2022 + observations)
LOD_KNOTS_MA = [
    (-200, 24.36), (-100, 24.18), (-50, 24.09), (0, 24.00),
    (10, 23.99), (50, 23.94), (90, 23.50), (180, 23.05),
    (290, 22.60), (380, 22.00), (440, 21.80), (500, 21.85), (620, 21.90),
]
_AGES = np.array([k[0] for k in LOD_KNOTS_MA])
_LODS = np.array([k[1] for k in LOD_KNOTS_MA])


def lod_at_age_kyr(age_kyr_bp):
    """Linear interpolation of LOD (hours) given age in kyr before present
    (positive going back)."""
    age_ma = age_kyr_bp / 1000.0
    return float(np.interp(age_ma, _AGES, _LODS))


def eight_h_at_kyr(age_kyr_bp):
    """8H value (kyr) at given age in kyr before present."""
    lod = lod_at_age_kyr(age_kyr_bp)
    return (EIGHT_H * lod / 24.0)   # kyr


def time_warp(t_kyr):
    """Compute time-warped τ(t) so that constant-8H_now sinusoids in τ are
    equivalent to time-evolving-8H sinusoids in t.

    τ(t) = ∫₀ᵗ (8H_now / 8H(t')) dt'

    For deep-time data, t is in kyr before present (positive going back),
    so we integrate from t=0 backward. The warp factor (8H_now/8H_paleo) is
    > 1 in the past (8H_paleo < 8H_now), so τ accumulates faster than t.
    """
    t = np.asarray(t_kyr, dtype=float)
    if len(t) == 0:
        return t.copy()
    # Sort by time
    order = np.argsort(t)
    t_sorted = t[order]
    # Compute integrand: 8H_now / 8H_paleo at each point
    eight_h_paleo = np.array([eight_h_at_kyr(ti) for ti in t_sorted])
    integrand = EIGHT_H / eight_h_paleo
    # Integrate from t=0 reference. Find anchor closest to t=0
    anchor_idx = int(np.argmin(np.abs(t_sorted)))
    tau_sorted = np.zeros_like(t_sorted)
    # Forward integration from anchor
    if anchor_idx < len(t_sorted) - 1:
        tau_sorted[anchor_idx+1:] = cumulative_trapezoid(
            integrand[anchor_idx:], t_sorted[anchor_idx:], initial=0)[1:]
    # Backward (in t) — for indices < anchor_idx
    if anchor_idx > 0:
        rev = cumulative_trapezoid(
            integrand[:anchor_idx+1][::-1],
            -t_sorted[:anchor_idx+1][::-1],
            initial=0)
        tau_sorted[:anchor_idx] = -rev[1:][::-1]
    # Add t_anchor offset
    tau_sorted = tau_sorted + t_sorted[anchor_idx]
    # Restore original order
    tau = np.zeros_like(t)
    tau[order] = tau_sorted
    return tau


def load_lr04():
    """Load LR04 benthic δ¹⁸O stack."""
    p = Path("/home/dennis/code/3d/data/lr04-stack.txt")
    if not p.exists():
        return None
    ages, d18o = [], []
    with open(p) as f:
        for line in f:
            s = line.strip()
            if not s: continue
            parts = s.split("\t") if "\t" in s else s.split()
            try:
                age_kyr = float(parts[0])
                v = float(parts[1])
                ages.append(age_kyr)
                d18o.append(v)
            except (ValueError, IndexError):
                continue
    return np.asarray(ages), np.asarray(d18o)


def load_cenogrid():
    """Load CENOGRID δ¹⁸O (Westerhold 2020 PANGAEA tab format)."""
    p = Path("/home/dennis/code/3d/data/westerhold2020-cenogrid.tab")
    if not p.exists():
        return None
    ages_ma, d18o_vals = [], []
    in_data = False
    with open(p) as f:
        for line in f:
            s = line.strip()
            if s == "*/":
                in_data = True
                continue
            if not in_data: continue
            if not s or s.lower().startswith("tuned"): continue
            parts = s.split("\t")
            try:
                age = float(parts[0])
                # CENOGRID has δ18O at column 5 (foram benthic δ18O binned)
                # Try multiple positions
                for col in [5, 7, 6, 4]:
                    if col < len(parts):
                        try:
                            v = float(parts[col])
                            ages_ma.append(age)
                            d18o_vals.append(v)
                            break
                        except ValueError:
                            continue
            except (ValueError, IndexError):
                continue
    if ages_ma:
        ages_kyr = np.array(ages_ma) * 1000.0
        vals = np.array(d18o_vals)
        return ages_kyr, vals
    return None


def fit_and_compare(t_kyr, y, regime, label):
    """Fit climate formula with both constant 8H and warped time. Compare R²."""
    print(f"\n  ── {label} ({regime}) ──")
    if len(t_kyr) < 100:
        print(f"    Insufficient data ({len(t_kyr)} pts)")
        return None

    # Determine fit window
    if isinstance(regime, str):
        window = REGIME_WINDOWS.get(regime)
        if window is None:
            return None
    else:
        window = regime

    mask = (t_kyr >= window[0]) & (t_kyr <= window[1])
    if mask.sum() < 100:
        print(f"    Window {window} has only {mask.sum()} points")
        return None
    print(f"    Window: {window[0]:.0f}-{window[1]:.0f} kyr, "
          f"{mask.sum()} points")

    # Fit 1: standard constant 8H
    fm_const = MilankovitchClimateFormula()
    summary_const = fm_const.fit(t_kyr, y, regime=regime, normalize=True)
    print(f"    Constant 8H_now ({EIGHT_H:.0f} kyr):")
    print(f"      R² L1: {summary_const.r2_l1_only:.4f}, "
          f"+L2: {summary_const.r2_l1_l2:.4f}, "
          f"+L3: {summary_const.r2_l1_l2_l3:.4f}")

    # Fit 2: time-warped (time-evolving 8H)
    t_sub = t_kyr[mask]
    y_sub = y[mask]
    tau = time_warp(t_sub)
    fm_warp = MilankovitchClimateFormula()
    # Use full tau range as window
    tau_min, tau_max = float(tau.min()), float(tau.max())
    summary_warp = fm_warp.fit(tau, y_sub, regime=(tau_min, tau_max), normalize=True)
    print(f"    Time-evolving 8H(t) — phase-warped:")
    print(f"      R² L1: {summary_warp.r2_l1_only:.4f}, "
          f"+L2: {summary_warp.r2_l1_l2:.4f}, "
          f"+L3: {summary_warp.r2_l1_l2_l3:.4f}")

    delta_r2_l1 = summary_warp.r2_l1_only - summary_const.r2_l1_only
    delta_r2_total = summary_warp.r2_l1_l2_l3 - summary_const.r2_l1_l2_l3
    print(f"    ΔR² (warp − const):  L1: {delta_r2_l1:+.4f}, "
          f"Total: {delta_r2_total:+.4f}")

    # Maximum time warp factor in window
    warp_max = float(np.abs(tau - t_sub).max())
    warp_frac = warp_max / max(abs(t_sub).max(), 1)
    print(f"    Max time shift: {warp_max:.2f} kyr ({warp_frac*100:.2f}% of window)")

    return {
        "regime": str(regime),
        "n_points": int(mask.sum()),
        "window_kyr": list(window),
        "r2_const_l1": summary_const.r2_l1_only,
        "r2_const_total": summary_const.r2_l1_l2_l3,
        "r2_warp_l1": summary_warp.r2_l1_only,
        "r2_warp_total": summary_warp.r2_l1_l2_l3,
        "delta_r2_l1": delta_r2_l1,
        "delta_r2_total": delta_r2_total,
        "max_time_shift_kyr": warp_max,
    }


def main():
    print("=" * 92)
    print("  TEST: Does time-evolving 8H(t) improve climate formula R²?")
    print("=" * 92)
    print(f"\n  Modern 8H: {EIGHT_H:.1f} kyr (= 8 × {H} yr)")
    print(f"  Time-warping replaces this with time-evolving 8H(t) calibrated to paleo-LOD")

    # Quick sanity check on time warp
    print("\n  Sanity check on time warp:")
    t_test = np.array([0.0, 100.0, 1000.0, 5000.0, 30000.0, 66000.0])  # kyr BP
    tau_test = time_warp(t_test)
    print(f"    {'t (kyr)':>10}{'8H(t) kyr':>13}{'τ (kyr)':>12}{'shift kyr':>12}")
    for t, tau in zip(t_test, tau_test):
        eight_h = eight_h_at_kyr(t)
        print(f"    {t:>10.0f}{eight_h:>13.1f}{tau:>12.2f}{tau - t:>+12.3f}")

    # Test on LR04
    results = []
    lr04 = load_lr04()
    if lr04 is not None:
        t_kyr, y = lr04
        print(f"\n  Loaded LR04: {len(t_kyr)} points, t range "
              f"{t_kyr.min():.0f}-{t_kyr.max():.0f} kyr")
        for regime in ["post-mpt", "inhg-mpt", "pre-inhg", "lr04-full"]:
            r = fit_and_compare(t_kyr, y, regime, f"LR04 {regime}")
            if r: results.append(r)
    else:
        print("\n  LR04 data not found at data/lr04-benthic-stack.txt")

    # Test on CENOGRID
    cenogrid = load_cenogrid()
    if cenogrid is not None:
        t_kyr, y = cenogrid
        print(f"\n  Loaded CENOGRID: {len(t_kyr)} points, t range "
              f"{t_kyr.min():.0f}-{t_kyr.max():.0f} kyr")
        r = fit_and_compare(t_kyr, y, (0, 66000), "CENOGRID 0-66 Myr")
        if r: results.append(r)

    # Summary
    print()
    print("=" * 92)
    print("  SUMMARY")
    print("=" * 92)
    if results:
        print(f"\n  {'Regime':<25}{'ΔR² L1':>10}{'ΔR² total':>12}{'max shift':>12}")
        for r in results:
            print(f"  {r['regime'][:25]:<25}{r['delta_r2_l1']:>+10.5f}"
                  f"{r['delta_r2_total']:>+12.5f}{r['max_time_shift_kyr']:>10.1f} kyr")
        max_improvement = max(r['delta_r2_total'] for r in results)
        any_better = any(r['delta_r2_total'] > 0.0005 for r in results)
        print()
        if any_better:
            print(f"  ✓ Time-evolving 8H improves R² in at least one regime.")
            print(f"    Max improvement: ΔR² = +{max_improvement:.5f}")
        else:
            print(f"  ✗ Time-evolving 8H does NOT materially improve R²")
            print(f"    in any tested regime. Improvements all < 0.001.")
            print(f"    Implication: keep constant 8H_now for current fits.")

    Path("/home/dennis/code/3d/data/evolving-8h-test.json").write_text(
        json.dumps({
            "method": "Compare R² between constant 8H_now and time-warped 8H(t)",
            "results": results,
        }, indent=2))
    print(f"\n  Wrote: data/evolving-8h-test.json")


if __name__ == "__main__":
    main()
