#!/usr/bin/env python3
"""
LAW-4 TNO OBLIQUITY PREDICTIONS
================================

The framework's Law 4 (eccentricity amplitude scaling) is *bidirectional*:

    e_amp = K · sin(tilt) · √d / (√m · a^(3/2))

Solved for sin(tilt):

    sin(tilt) = e_amp · √m · a^(3/2) / (K · √d)

This means for any body satisfying Law 4, its observed eccentricity-oscillation
amplitude e_amp and its axial obliquity (sin of tilt) are linked. For the
8 primary planets, both are independently observed and they fit Law 4 with
the same universal K = 3.4149 × 10⁻⁶.

For TNOs:
  - Eccentricity is observed (e_obs is a current snapshot)
  - Long-term oscillation amplitude e_amp is NOT directly observed
  - Axial obliquity is unknown for most bodies (3-4 measured to date)

If we ASSUME Law 4 applies to a TNO and that the observed e is approximately
its oscillation amplitude (a body sampled near its eccentricity peak, with
small base eccentricity — the regime where distant bodies sit in the
framework's structure), we can derive the implied obliquity from observation.

This script computes that implied obliquity for known TNOs across the
Fibonacci d-range. For bodies whose required sin(tilt) > 1, Law 4 cannot
apply — they live in dynamical regimes (resonances, scattered disk) where
the framework's amplitude scaling breaks down. For bodies where sin(tilt) ≤ 1
is achievable for some d, the framework makes a falsifiable prediction
about their axial obliquity that future measurements can test.

Output: data/tno-obliquity-predictions.json
"""

import json
import math
from pathlib import Path

OUT_PATH = Path(__file__).resolve().parent.parent / "data" / "tno-obliquity-predictions.json"

K_CONSTANT = 3.4149e-6
FIB_D = [1, 2, 3, 5, 8, 13, 21, 34, 55]

# Known TNOs with orbital elements and (where available) measured rotation poles.
# Mass in solar masses, a in AU, e dimensionless, obliquity in degrees.
# Obliquity = angle between rotation axis and orbital normal.
# Measured obliquities marked; unknown marked as None.
TNOS = [
    # name, mass (M_sun), a (AU), e_obs, measured_obliquity (deg or None), notes
    ("Pluto+Charon",   7.27e-9,  39.482, 0.249, 119.6, "tidally locked binary; obliquity well-known"),
    ("Eris+Dysnomia",  8.40e-9,  67.864, 0.439, None,  "obliquity poorly constrained"),
    ("Haumea+system",  2.02e-9,  43.13,  0.191, 75.0,  "fast rotator, oblate ellipsoid"),
    ("Makemake",       1.54e-9,  45.79,  0.159, None,  "obliquity not directly measured"),
    ("Gonggong",       9.00e-10, 67.49,  0.503, None,  "extreme scattered-disk object"),
    ("Quaoar+Weywot",  7.00e-10, 43.69,  0.039, None,  "classical KBO; LOW eccentricity"),
    ("Sedna",          4.00e-10, 506.0,  0.852, None,  "detached/inner-Oort-cloud body"),
    ("Orcus+Vanth",    6.30e-10, 39.42,  0.226, None,  "plutino (3:2 resonance)"),
    ("Salacia+Actaea", 4.92e-10, 42.18,  0.106, None,  "classical KBO"),
    ("Varuna",         2.00e-10, 42.70,  0.054, None,  "classical KBO; LOW eccentricity"),
    ("2002 MS4",       1.50e-10, 41.93,  0.143, None,  "classical KBO"),
    ("Ixion",          1.30e-10, 39.61,  0.241, None,  "plutino"),
    ("2002 AW197",     1.20e-10, 47.42,  0.131, None,  "classical KBO"),
    ("2003 AZ84",      1.30e-10, 39.49,  0.176, None,  "plutino"),
    ("2004 GV9",       1.00e-10, 41.85,  0.077, None,  "classical KBO"),
    ("Chaos",          1.00e-10, 45.84,  0.106, None,  "classical KBO"),
    ("Varda",          1.40e-10, 45.93,  0.144, None,  "classical KBO with companion"),
]


def predict_sin_tilt(m_sun, a_au, e_obs, d):
    """Solve Law 4 for sin(tilt), assuming e_obs ≈ e_amp.

    Returns sin(tilt) value. If > 1, the body cannot satisfy Law 4
    at this d. If < 1, the framework predicts the obliquity to be
    arcsin(sin_tilt).
    """
    return e_obs * math.sqrt(m_sun) * a_au ** 1.5 / (K_CONSTANT * math.sqrt(d))


def main():
    print("=" * 78)
    print("LAW-4 TNO OBLIQUITY PREDICTIONS")
    print("=" * 78)
    print(f"  K = {K_CONSTANT:.4e}")
    print(f"  Fibonacci d-pool: {FIB_D}")
    print()
    print("  Law 4 inverted:  sin(tilt) = e_obs · √m · a^(3/2) / (K · √d)")
    print()
    print("  Computing required sin(tilt) for each TNO across the Fibonacci d range.")
    print("  sin(tilt) > 1 → body cannot satisfy Law 4 (incompatible with the framework)")
    print("  sin(tilt) ≤ 1 → framework predicts obliquity = arcsin(sin_tilt)")
    print()

    print(f"  {'Body':<18} {'m (M_sun)':>10} {'a (AU)':>7} {'e_obs':>7} "
          f"{'min sin_tilt':>13} {'best d':>7} {'predicted tilt':>16} {'measured':>10}")
    print("  " + "─" * 95)

    results = []
    for name, m, a, e, measured_obliq, notes in TNOS:
        # Compute sin(tilt) at each d; find smallest (most generous, achievable)
        per_d = []
        for d in FIB_D:
            s = predict_sin_tilt(m, a, e, d)
            per_d.append({"d": d, "sin_tilt": s})
        # Smallest sin_tilt across d corresponds to largest d (least restrictive)
        min_entry = min(per_d, key=lambda x: x["sin_tilt"])
        min_sin = min_entry["sin_tilt"]
        best_d = min_entry["d"]

        if min_sin <= 1:
            tilt_deg = math.degrees(math.asin(min_sin))
            verdict = f"{tilt_deg:.1f}°"
        else:
            verdict = f">90° (sin={min_sin:.0f}×, unphysical)"

        measured_str = f"{measured_obliq:.1f}°" if measured_obliq is not None else "—"

        print(f"  {name:<18} {m:>10.2e} {a:>7.2f} {e:>7.3f} "
              f"{min_sin:>13.3f} {best_d:>7d} {verdict:>16} {measured_str:>10}")

        results.append({
            "name": name, "m_sun": m, "a_au": a, "e_obs": e,
            "min_sin_tilt": min_sin, "best_d": best_d,
            "predicted_tilt_deg": tilt_deg if min_sin <= 1 else None,
            "measured_obliquity_deg": measured_obliq,
            "law4_compliant": bool(min_sin <= 1),
            "notes": notes,
            "per_d_sin_tilt": per_d,
        })

    print()
    print("-" * 78)
    n_compliant = sum(1 for r in results if r["law4_compliant"])
    print(f"  Law-4-compliant TNOs (sin_tilt ≤ 1 for some d): {n_compliant} of {len(results)}")
    print()

    if n_compliant > 0:
        print("  Compliant bodies (framework makes a testable obliquity prediction):")
        for r in results:
            if r["law4_compliant"]:
                print(f"    {r['name']:<18} predicted obliquity ≈ {r['predicted_tilt_deg']:.1f}° "
                      f"at d = {r['best_d']}")
        print()
    else:
        print("  No known major TNO satisfies Law 4 with sin(tilt) ≤ 1 at any d.")
        print("  Interpretation: these bodies live in dynamical regimes (resonances,")
        print("  scattered disk, detached) where Law 4's amplitude scaling does not apply.")
        print("  This is consistent with the framework's primary-planets-only scope.")
        print()

    # Threshold analysis: what mass / e combination CAN satisfy Law 4?
    print("-" * 78)
    print("  THRESHOLD: For a hypothetical TNO at a = 45 AU and varying e_obs,")
    print("             the maximum mass that satisfies Law 4 with sin(tilt) = 1 at d = 55:")
    print()
    print(f"  {'e_obs':>8} {'max m (M_sun)':>15} {'max m (M_Earth)':>17} {'~diameter (km, ρ=2)':>22}")
    print("  " + "─" * 70)
    a_test = 45.0
    M_EARTH = 3.0035e-6
    M_SUN_KG = 1.989e30
    for e_test in [0.5, 0.3, 0.15, 0.10, 0.05, 0.02, 0.01]:
        # sin(tilt) = e · √m · a^1.5 / (K · √d) ≤ 1
        # √m ≤ K · √d / (e · a^1.5)
        d_max = 55
        sqrt_m_max = K_CONSTANT * math.sqrt(d_max) / (e_test * a_test ** 1.5)
        m_max_sun = sqrt_m_max ** 2
        m_max_earth = m_max_sun / M_EARTH
        m_kg = m_max_sun * M_SUN_KG
        # diameter assuming density 2000 kg/m³
        radius_m = (3 * m_kg / (4 * math.pi * 2000)) ** (1/3)
        diameter_km = 2 * radius_m / 1000
        print(f"  {e_test:>8.3f} {m_max_sun:>15.2e} {m_max_earth:>17.2e} {diameter_km:>20.1f}")
    print()

    print("-" * 78)
    print("  INTERPRETATION:")
    print()
    print("  • All known major dwarf planets (Pluto, Eris, Haumea, Makemake, Sedna...)")
    print("    fail Law 4 compliance: they require sin(tilt) >> 1, unphysical.")
    print("    → They live outside the framework's primary-planet scope.")
    print()
    print("  • The Law-4-compatible region at TNO distances (a ~ 40-50 AU) is")
    print("    bounded by very small masses for high-e bodies, but accommodates")
    print("    100-km-diameter bodies at moderate eccentricities (e ~ 0.05).")
    print()
    print("  • For Pluto specifically: measured obliquity 119.6°, sin(119.6°) = 0.87.")
    print("    The framework's Law 4 prediction (assuming e_obs is amplitude, d=55):")
    print(f"    Predicted sin(tilt) = {predict_sin_tilt(7.27e-9, 39.482, 0.249, 55):.0f}× — physically impossible.")
    print("    → Pluto does NOT follow Law 4. This is consistent with its 3:2 Neptune")
    print("    resonance (its dynamics dominated by Neptune coupling, not by Law 4).")
    print()
    print("  • TESTABLE PREDICTION: if a 100-km classical-KBO (ρ ~ 2 g/cm³, m ~ 1e-12 M_sun)")
    print("    at a = 45 AU with e = 0.05 has its axial obliquity measured, the framework")
    print(f"    predicts sin(tilt) ≈ {predict_sin_tilt(1e-12, 45, 0.05, 55):.3f}, i.e. tilt ≈ "
          f"{math.degrees(math.asin(min(1, predict_sin_tilt(1e-12, 45, 0.05, 55)))):.1f}°.")
    print()

    OUT_PATH.write_text(json.dumps({
        "framework": "Law-4 TNO obliquity predictions",
        "K_constant": K_CONSTANT,
        "fibonacci_d_pool": FIB_D,
        "assumption": "e_obs ≈ e_amp (body sampled near eccentricity peak)",
        "results": results,
        "threshold_analysis": {
            "a_au": 45,
            "d_max": 55,
            "note": "Maximum mass that satisfies Law 4 with sin(tilt) ≤ 1 at d = 55, for various e values",
        },
    }, indent=2))
    print(f"  Output: {OUT_PATH}")


if __name__ == "__main__":
    main()
