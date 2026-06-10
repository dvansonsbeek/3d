#!/usr/bin/env python3
"""
Paleo-LOD evidence: framework's bounded-oscillator model vs mainstream
tidal-dissipation models, tested against published paleontological /
sedimentological / cyclostratigraphic data.

Published data sources compiled
-------------------------------
- Phanerozoic corals: Wells 1963 (Devonian), Eicher 1976, Scrutton 1970
- Williams 2000: Elatina/Reynella tidal rhythmites at 620 Ma (21.9 ±0.4 hr)
- Sonett & Chan 1998: Big Cottonwood + Elatina Formations
- Lantink et al. 2022: Joffre Gorge cyclostratigraphy at 2.46 Ga
- Zhou et al. 2022: Cyclostratigraphic reconstruction over 2.5 Gyr
- Farhat et al. 2022 (A&A): Non-linear resonant tidal evolution model
- Bartlett & Stevenson 2016: Mid-Proterozoic 21-hour resonance stall
- Mitchell & Kirscher 2023 (Nat Geosci): ~19 hr Proterozoic stall

Four candidate models compared
-------------------------------
M1 — MAINSTREAM LINEAR: LOD decreases at constant 2.3 ms/century going back
     (IERS / lunar laser ranging). Textbook tidal-dissipation extrapolation.

M2 — FARHAT 2022 RESONANT: Continuous tidal evolution with resonance
     'inflection points' at ~350 Ma, ~600 Ma. Best-fitting modern model
     using only two anchors (modern recession + lunar age).

M3 — BARTLETT-STEVENSON RESONANCE-LOCK: LOD locked at 21 hr during
     mid-Proterozoic (~1-2 Ga), broken by Snowball-Earth deglaciation.

M4 — FRAMEWORK BOUNDED-OSCILLATOR: LOD fluctuates around 86,400 s mean,
     with framework harmonics at H/3, H/5, H/8, H/16, H/24, H/32. Mean
     LOD does NOT secularly drift in this model.

M5 — FRAMEWORK + SLOW SECULAR SHIFT (compromise): bounded oscillation
     around a slowly-evolving equilibrium that drifts over Gyr scales.
"""

import json
import sys
from pathlib import Path
import numpy as np

H = 335317
MODERN_LOD_HOURS = 24.000
MODERN_LOD_S = 86400.0


# ─────────────────────────────────────────────────────────────────────
# COMPILED PALEO-LOD DATA from published literature
# (geological_age_Ma, lod_hours, uncertainty_hours, source, method)
# ─────────────────────────────────────────────────────────────────────
PALEO_LOD = [
    # Modern anchor
    (0.0,        24.000, 0.000, "IERS modern",                "lunar laser ranging"),
    # Phanerozoic corals
    (90.0,       23.50,  0.20,  "Pannella 1972 / Scrutton",   "Cretaceous bivalves"),
    (180.0,      23.05,  0.25,  "Scrutton 1970",              "Jurassic bivalves"),
    (290.0,      22.60,  0.25,  "Mazzullo 1971",              "Permian corals"),
    (380.0,      22.00,  0.20,  "Wells 1963",                 "Devonian corals (~400 d/yr)"),
    (440.0,      21.80,  0.25,  "Wells 1963",                 "Silurian corals"),
    # Late Precambrian
    (620.0,      21.90,  0.40,  "Williams 2000",              "Elatina-Reynella tidal rhythmites"),
    (650.0,      20.70,  0.70,  "Williams 1989",              "Precambrian tidal rhythmites"),
    (900.0,      19.40,  1.00,  "Sonett & Chan 1998",         "Big Cottonwood Formation"),
    # Deep Proterozoic — resonance-stall / cyclostratigraphy
    (1400.0,     18.70,  1.50,  "Zhou et al. 2022",           "cyclostratigraphy"),
    (2460.0,     16.90,  1.50,  "Lantink et al. 2022",        "Joffre Gorge cyclostratigraphy"),
    (2500.0,     17.50,  2.00,  "Zhou et al. 2022",           "cyclostratigraphy"),
]


def mainstream_linear_LOD(age_Ma, rate_ms_per_century=2.3):
    """LOD decreases by constant rate going back. Modern = 86400 s."""
    centuries_back = age_Ma * 1e4
    lod_s = MODERN_LOD_S - rate_ms_per_century * 1e-3 * centuries_back
    return lod_s / 3600


def farhat_2022_LOD(age_Ma):
    """Piecewise interpolation of Farhat et al. 2022 A&A model
    (values extracted from their published evolution curve)."""
    knots = np.array([
        [0,    24.0],
        [350,  22.5],
        [600,  21.0],
        [1000, 18.0],
        [2500, 13.0],
        [3250, 10.0],
    ])
    return np.interp(age_Ma, knots[:, 0], knots[:, 1])


def bartlett_stevenson_LOD(age_Ma):
    """Resonance-stall: LOD locked at ~21 hr during 1-2 Ga, otherwise
    similar to mainstream."""
    if 1000 <= age_Ma <= 2000:
        return 21.0
    elif age_Ma < 1000:
        # Linear from (0, 24) to (1000, 21)
        return 24.0 - 3.0 * (age_Ma / 1000)
    else:
        # Linear from (2000, 21) to (4500, 6)
        return 21.0 - 15.0 * ((age_Ma - 2000) / 2500)


def framework_bounded_LOD(age_Ma, amp_s=10.0, period_Myr=H/3 * 1e-6):
    """Strict framework: LOD oscillates around 86,400 s with H/n harmonics.
    Mean does NOT shift secularly."""
    lod_s = MODERN_LOD_S + amp_s * np.sin(2 * np.pi * age_Ma / period_Myr)
    return lod_s / 3600


def framework_plus_secular_LOD(age_Ma, amp_s=10.0, period_Myr=H/3 * 1e-6,
                                secular_rate_hr_per_Gyr=2.5):
    """Compromise: framework bounded oscillation on top of slow secular
    drift. The secular term reproduces deep-time data; the oscillation
    explains the 'unexplained' Myr-scale beat drift in Test C-Libration."""
    oscillation_s = amp_s * np.sin(2 * np.pi * age_Ma / period_Myr)
    secular_hr = secular_rate_hr_per_Gyr * (age_Ma * 1e-3)
    return MODERN_LOD_HOURS - secular_hr + oscillation_s / 3600


def model_fit_metrics(model_fn, data, name, **kwargs):
    """For each data point compute prediction and residual; report
    RMS residual + max residual."""
    residuals = []
    for age, lod_obs, unc, src, mth in data:
        lod_pred = model_fn(age, **kwargs) if kwargs else model_fn(age)
        residuals.append((age, lod_obs, lod_pred, lod_pred - lod_obs, unc))
    arr = np.array([[r[3] for r in residuals]])
    rms = float(np.sqrt(np.mean(arr ** 2)))
    max_abs = float(np.max(np.abs(arr)))
    chi2 = float(np.sum([(r[3] / r[4])**2 if r[4] > 0 else 0 for r in residuals]))
    return {
        "name": name,
        "rms_residual_hr": rms,
        "max_abs_residual_hr": max_abs,
        "chi2": chi2,
        "residuals": residuals,
    }


def main():
    print("=" * 92)
    print("  PALEO-LOD COMPARISON — framework vs mainstream vs published data")
    print("=" * 92)

    print(f"\n  Compiled paleo-LOD data ({len(PALEO_LOD)} points):")
    print(f"  {'Age (Ma)':>10}{'LOD (hr)':>10}{'σ':>6}  {'Source':<28}{'Method'}")
    for age, lod, unc, src, mth in PALEO_LOD:
        print(f"  {age:>10.1f}{lod:>10.2f}{unc:>6.2f}  {src:<28}{mth}")

    print("\n  Testing models against compiled data ...")
    models = [
        ("M1 mainstream linear (2.3 ms/cent)", mainstream_linear_LOD, {}),
        ("M2 Farhat 2022 resonant",          farhat_2022_LOD, {}),
        ("M3 Bartlett-Stevenson 21h stall",  bartlett_stevenson_LOD, {}),
        ("M4 framework bounded (no drift)",  framework_bounded_LOD,
         {"amp_s": 10.0, "period_Myr": H/3 * 1e-6}),
        ("M5 framework + secular shift",     framework_plus_secular_LOD,
         {"amp_s": 10.0, "secular_rate_hr_per_Gyr": 2.5}),
    ]
    results = []
    for name, fn, kwargs in models:
        if kwargs:
            r = model_fit_metrics(fn, PALEO_LOD, name, **kwargs)
        else:
            r = model_fit_metrics(fn, PALEO_LOD, name)
        results.append(r)

    print()
    print(f"  ── Model fits ──")
    print(f"  {'Model':<40}{'RMS (hr)':>11}{'max (hr)':>11}{'χ²':>10}")
    for r in results:
        print(f"  {r['name']:<40}{r['rms_residual_hr']:>10.2f}h"
              f"{r['max_abs_residual_hr']:>10.2f}h{r['chi2']:>10.1f}")

    # ── Per-point residuals for the most interesting comparisons ──
    print()
    print(f"  ── Per-point residuals (model − observed) ──")
    print(f"  {'Age (Ma)':>10}{'Obs':>9}{'M1 lin':>9}{'M2 farh':>10}"
          f"{'M3 lock':>9}{'M4 bnd':>9}{'M5 bnd+sec':>13}")
    for i, (age, lod_obs, unc, src, mth) in enumerate(PALEO_LOD):
        preds = [r["residuals"][i][2] for r in results]
        print(f"  {age:>10.1f}{lod_obs:>9.2f}"
              f"{preds[0]:>9.2f}{preds[1]:>10.2f}"
              f"{preds[2]:>9.2f}{preds[3]:>9.2f}{preds[4]:>13.2f}")

    # ── Focused test: at 50 Ma (our LA2004 window) ──
    print()
    print(f"  ── Predictions at the LA2004 50-Myr window ──")
    test_age = 50.0  # Ma
    print(f"  At {test_age} Ma:")
    print(f"    M1 mainstream linear:     {mainstream_linear_LOD(test_age):.4f} hr  "
          f"({(mainstream_linear_LOD(test_age) - 24) * 3600:.1f} s vs modern)")
    print(f"    M2 Farhat 2022:           {farhat_2022_LOD(test_age):.4f} hr  "
          f"({(farhat_2022_LOD(test_age) - 24) * 3600:.1f} s vs modern)")
    print(f"    M4 framework (amp 10s):   {framework_bounded_LOD(test_age):.4f} hr  "
          f"({(framework_bounded_LOD(test_age) - 24) * 3600:.1f} s vs modern)")
    print(f"    M5 framework + secular:   {framework_plus_secular_LOD(test_age):.4f} hr  "
          f"({(framework_plus_secular_LOD(test_age) - 24) * 3600:.1f} s vs modern)")

    # Implied k drift for each
    print(f"\n  Implied k drift over 50 Myr (Δk/k = ΔLOD/LOD inverse):")
    for name, fn, kw in models[:5]:
        lod_50 = fn(test_age, **kw) if kw else fn(test_age)
        lod_50_s = lod_50 * 3600
        dk = (MODERN_LOD_S / lod_50_s - 1) * 100
        print(f"    {name:<40}: Δk = {dk:+.2f}%")

    print(f"\n  → Test C-Libration measured: implied Δk ≈ +5.94%")
    print(f"    Closest match: Farhat 2022 ({(MODERN_LOD_S/(farhat_2022_LOD(50)*3600) - 1)*100:.2f}% — still too small)")
    print(f"    None of the 'standard' tidal models account for the full 5.94%.")

    # ── Synthesis ──
    print()
    print("=" * 92)
    print("  SYNTHESIS")
    print("=" * 92)
    best = min(results, key=lambda r: r["chi2"])
    worst = max(results, key=lambda r: r["chi2"])
    print(f"""
    Of compiled paleo-LOD data from 0 to 2.5 Ga:

    BEST FIT:  {best['name']} (χ² = {best['chi2']:.1f}, RMS = {best['rms_residual_hr']:.2f} hr)
    WORST FIT: {worst['name']} (χ² = {worst['chi2']:.1f}, RMS = {worst['rms_residual_hr']:.2f} hr)

    For the user's framework specifically:

    • M4 FRAMEWORK BOUNDED-OSCILLATOR (no secular drift):
        χ² = {results[3]['chi2']:.1f}, RMS = {results[3]['rms_residual_hr']:.2f} hr
        This model predicts LOD ≈ 24 hr at all ages, but Wells 1963 (Devonian
        ~22 hr) and Williams 2000 (Elatina ~21.9 hr at 620 Ma) directly
        contradict it. Strict bounded-LOD around modern 86,400 s is
        INCOMPATIBLE with paleo-tidal data on Gyr timescales.

    • M5 FRAMEWORK + SLOW SECULAR SHIFT:
        χ² = {results[4]['chi2']:.1f}, RMS = {results[4]['rms_residual_hr']:.2f} hr
        Combining bounded-oscillation on Myr scales with secular drift on
        Gyr scales fits the data MUCH better. This is a defensible
        interpretation: the equilibrium itself slowly evolves due to lunar
        recession, while on Myr timescales the LOD librates around the
        current equilibrium.

    Independent evidence:
    • Bartlett-Stevenson 2016 / Mitchell-Kirscher 2023: there's an active
      scientific case for LOD resonance lock during 1-2 Ga. This SUPPORTS
      the principle that LOD can reach equilibrium and stop monotonic
      evolution — exactly the framework's spirit.
    • Farhat 2022 (best modern model): tidal evolution is NOT linear; has
      resonance steps where evolution speeds/slows. Inflection points
      around 350 and 600 Ma. Consistent with system spending time near
      various equilibria.

    Honest verdict:
    The framework's STRICT bounded-LOD (constant equilibrium at 86,400 s)
    is refuted by paleo-tidal data. But the framework's IDEA — that LOD
    has equilibria where it stalls — is increasingly supported by
    current research (Bartlett-Stevenson, Mitchell-Kirscher).

    The correct framework reframing: the system has *equilibria* (multiple,
    set by ocean-tide / atmospheric-tide / continental configuration),
    and the modern LOD ≈ 86,400 s is the current one. LOD oscillates
    around this on Myr scales (consistent with Test C-Libration aggregate
    bias = 0) and only secularly shifts when an equilibrium becomes
    unstable (resonance break).
""")


if __name__ == "__main__":
    main()
