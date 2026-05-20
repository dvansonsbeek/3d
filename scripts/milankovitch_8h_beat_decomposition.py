#!/usr/bin/env python3
"""
MILANKOVITCH 8H BEAT-DECOMPOSITION
====================================

For each significant integer-divisor peak found in the LR04 8H spectrum,
enumerate all possible physical interpretations:

  Climatic precession sub-peak:  k + g_j   (Earth axial + planet apsidal)
  Obliquity sub-peak:            k + s_j   (Earth axial + planet nodal)
  Eccentricity beat:             g_j - g_k (between two planets)
  Nodal beat:                    s_j - s_k (between two planets)
  Direct planet apsidal (model): listed periods from doc 37

All quantities expressed in units of 1/(8H), so integer n in 8H/n
corresponds to the beat-rate integer.

Inputs are Laskar 2004 eigenfrequencies (the standard secular
perturbation theory values).

Output: for each peak found in LR04 (predicted + unpredicted), a list
of physical interpretations whose integer rounds to that n.

Run:  python3 scripts/milankovitch_8h_beat_decomposition.py
"""

import json
from pathlib import Path

import numpy as np

SCRIPT_DIR = Path(__file__).resolve().parent
DATA_DIR = SCRIPT_DIR.parent / "data"
SPEC_PATH = DATA_DIR / "milankovitch-8h-divisor-spectrum.json"
OUT_PATH = DATA_DIR / "milankovitch-8h-beat-decomposition.json"

H = 335.317
EIGHT_H = 8 * H  # 2682.536 kyr

# 1/(8H) frequency in "/yr (for converting eigenmodes to integer n)
# n = eigenmode_arcsec_per_yr × 8H_yr / 1,296,000
SCALE = EIGHT_H * 1000 / 1_296_000  # 2.07 — multiply eigenmode by this to get δ in 8H units


# Laskar 2004 secular eigenfrequencies (from docs/37 table)
EIGENMODES = {
    # Apsidal (g_i) — positive values
    "g1_Mercury":  5.59,
    "g2_Venus":    7.45,
    "g3_Earth":   17.37,
    "g4_Mars":    17.92,
    "g5_Jupiter":  4.26,
    "g6_Saturn":  28.25,
    "g7_Uranus":   3.09,
    "g8_Neptune":  0.673,
    # Nodal (s_i) — usually negative; |s_i| ≈ g_i except Earth and Saturn
    "s1_Mercury":  -5.61,
    "s2_Venus":    -7.06,
    "s3_Earth":   -18.85,
    "s4_Mars":    -17.74,
    "s5_Jupiter":  0.0,    # invariable plane
    "s6_Saturn":  -26.33,
    "s7_Uranus":   -2.99,
    "s8_Neptune":  -0.69,
}

# k = Earth's general precession in longitude (axial precession in 8H units)
# model: k = 50.243 "/yr (= H/13 rate); standard: 50.290 "/yr
K_AXIAL = 50.290
N_K = round(K_AXIAL * SCALE)  # = 104 (matches H/13)


# Model planetary apsidal periods (from docs/37 line 64-73)
# expressed as integer n in 8H/n form (n = 8H / P_kyr)
MODEL_PLANET_APSIDAL = {
    "Mercury (model H·8/11)":  11,     # 243,867 yr
    "Venus (model 8H/6, retro)": -6,    # 447,089 yr retrograde
    "Earth perihelion (H/16)": 128,    # 20,957 yr
    "Mars (model 8H/35)":      35,     # 76,644 yr
    "Jupiter ecliptic (H/5)":  40,     # 67,063 yr
    "Jupiter ICRF / Saturn ecliptic (H/8)": 64,  # 41,915 yr
    "Uranus (H/3)":            24,     # 111,772 yr
    "Neptune (2H)":             4,     # 670,634 yr
}


# Fibonacci H-divisor anchors (Earth's intrinsic precession periods)
EARTH_FIBONACCI = {
    "H/3 (inclination precession)":      24,
    "H/5 (ecliptic precession)":         40,
    "H/8 (obliquity / Jupiter ICRF)":    64,
    "H/13 (axial precession)":          104,
    "H/16 (climatic precession)":       128,
}


# ─────────────────────────────────────────────────────────────────────────
# Compute integer n for each beat type
# ─────────────────────────────────────────────────────────────────────────

def eigenmode_to_n(omega_arcsec):
    """Convert "/yr eigenmode rate to integer n in 8H units (rounded)."""
    return omega_arcsec * SCALE


def enumerate_interpretations(n_target, tolerance=0.5):
    """For integer n_target, list all eigenmode-beat interpretations whose
    8H-unit value is within `tolerance` of n_target.

    Returns a list of dicts {type, formula, n_predicted, period_kyr, error}.
    """
    matches = []

    # Type 1: Climatic precession sub-peaks (k + g_j)
    for label, val in EIGENMODES.items():
        if not label.startswith("g"):
            continue
        n = K_AXIAL * SCALE + val * SCALE
        if abs(n - n_target) <= tolerance:
            matches.append({
                "type": "Climatic precession sub-peak (k + g_j)",
                "formula": f"k + {label}",
                "n_predicted": round(n, 2),
                "period_kyr": EIGHT_H / n if n != 0 else None,
                "error": abs(n - n_target),
            })

    # Type 2: Obliquity sub-peaks (k + s_j)
    for label, val in EIGENMODES.items():
        if not label.startswith("s"):
            continue
        n = K_AXIAL * SCALE + val * SCALE
        if abs(n - n_target) <= tolerance:
            matches.append({
                "type": "Obliquity sub-peak (k + s_j)",
                "formula": f"k + {label}",
                "n_predicted": round(n, 2),
                "period_kyr": EIGHT_H / n if n != 0 else None,
                "error": abs(n - n_target),
            })

    # Type 3: Eccentricity beats (g_j - g_k)
    g_modes = [(k, v) for k, v in EIGENMODES.items() if k.startswith("g")]
    for la, va in g_modes:
        for lb, vb in g_modes:
            if la >= lb:
                continue
            for sign in [+1, -1]:
                n = sign * (va - vb) * SCALE
                if n < 0:
                    n = -n
                    label = f"{lb} - {la}"
                else:
                    label = f"{la} - {lb}"
                if 0 < n and abs(n - n_target) <= tolerance:
                    matches.append({
                        "type": "Eccentricity beat (g_j - g_k)",
                        "formula": label,
                        "n_predicted": round(n, 2),
                        "period_kyr": EIGHT_H / n if n > 0 else None,
                        "error": abs(n - n_target),
                    })
                    break  # avoid both signs for same pair

    # Type 4: Nodal beats (s_j - s_k)
    s_modes = [(k, v) for k, v in EIGENMODES.items() if k.startswith("s")]
    for la, va in s_modes:
        for lb, vb in s_modes:
            if la >= lb:
                continue
            diff = va - vb
            if diff == 0:
                continue
            n = abs(diff) * SCALE
            if 0 < n and abs(n - n_target) <= tolerance:
                label = f"{la} - {lb}" if va > vb else f"{lb} - {la}"
                matches.append({
                    "type": "Nodal beat (s_j - s_k)",
                    "formula": label,
                    "n_predicted": round(n, 2),
                    "period_kyr": EIGHT_H / n if n > 0 else None,
                    "error": abs(n - n_target),
                })

    # Type 5: Direct planet apsidal periods (model)
    for label, n in MODEL_PLANET_APSIDAL.items():
        if abs(abs(n) - n_target) <= tolerance:
            matches.append({
                "type": "Direct planet apsidal (model)",
                "formula": label,
                "n_predicted": n,
                "period_kyr": EIGHT_H / abs(n) if n != 0 else None,
                "error": abs(abs(n) - n_target),
            })

    # Type 6: Earth Fibonacci divisor (H/n)
    for label, n in EARTH_FIBONACCI.items():
        if abs(n - n_target) <= tolerance:
            matches.append({
                "type": "Earth Fibonacci (H/n)",
                "formula": label,
                "n_predicted": n,
                "period_kyr": EIGHT_H / n,
                "error": abs(n - n_target),
            })

    return sorted(matches, key=lambda m: m["error"])


# ─────────────────────────────────────────────────────────────────────────
# Read spectrum results and annotate peaks
# ─────────────────────────────────────────────────────────────────────────

def analyze_spectrum_result(spec_data, dataset_label):
    print("\n" + "=" * 80)
    print(f"BEAT DECOMPOSITION — {dataset_label}")
    print("=" * 80)

    result = spec_data["results"][dataset_label]
    peaks = result["peaks"]

    print(f"  T = {result['T_kyr']:.0f} kyr, {len(peaks)} significant peaks")
    print(f"\n  {'n':>4}  {'period':>9}  {'amp':>7}  {'×med':>5}  classification  →  interpretation(s)")
    print(f"  {'-'*4}  {'-'*9}  {'-'*7}  {'-'*5}  {'-'*15}     {'-'*60}")

    annotated = []
    for peak in peaks:
        n = peak["n"]
        amp = peak["amplitude"]
        med = peak["amp_over_median"]
        period = peak["period_kyr"]
        matches = enumerate_interpretations(n, tolerance=0.5)
        # Suppress redundant matches (same formula, similar error)
        cls = peak.get("class", "")
        print(f"  {n:>4}  {period:>7.2f}   {amp:>7.4f}  {med:>4.1f}×  {cls:<15}")
        if matches:
            for m in matches[:4]:  # top 4 interpretations
                ptxt = f"P={m['period_kyr']:.2f} kyr" if m["period_kyr"] else "—"
                print(f"           ✓ {m['formula']:<30}  (n_pred = {m['n_predicted']:.2f}, "
                      f"{ptxt}, err = {m['error']:.2f})  [{m['type']}]")
        else:
            print(f"           (no interpretation within tolerance 0.5)")
        annotated.append({**peak, "interpretations": matches})

    return annotated


def main():
    spec = json.loads(SPEC_PATH.read_text())
    out = {}
    print("=" * 80)
    print("MILANKOVITCH 8H BEAT-DECOMPOSITION")
    print("=" * 80)
    print(f"8H = {EIGHT_H:.3f} kyr, k = {K_AXIAL} \"/yr (axial precession)")
    print(f"Scale factor (eigenmode \"/yr → 8H units): {SCALE:.4f}")
    print(f"k in 8H units: {K_AXIAL * SCALE:.2f}  (rounded to n_k = {N_K})")
    print(f"\nKey eigenmodes (Laskar 2004) in 8H units:")
    for label in ["g1_Mercury", "g2_Venus", "g3_Earth", "g4_Mars",
                  "g5_Jupiter", "g6_Saturn", "g7_Uranus", "g8_Neptune"]:
        val = EIGENMODES[label]
        print(f"  {label:<15}  {val:>6.3f} \"/yr  →  δ = {val * SCALE:>5.2f}")

    for dataset in ["LR04 full", "LR04 0-1200", "LR04 0-700", "LR04 pre-MPT", "Cheng full"]:
        out[dataset] = analyze_spectrum_result(spec, dataset)

    OUT_PATH.write_text(json.dumps({
        "meta": {
            "script": "milankovitch_8h_beat_decomposition.py",
            "H_kyr": H, "8H_kyr": EIGHT_H,
            "k_arcsec_per_yr": K_AXIAL,
            "scale_factor": SCALE,
            "eigenmodes": EIGENMODES,
        },
        "annotated_peaks": out,
    }, indent=2))
    print(f"\n[saved] {OUT_PATH}")


if __name__ == "__main__":
    main()
