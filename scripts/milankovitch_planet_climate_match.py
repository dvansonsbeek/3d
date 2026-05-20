#!/usr/bin/env python3
"""
MILANKOVITCH PLANET-CLIMATE INFLUENCE MATCHING
================================================

For each significant LR04 climate peak (from milankovitch_8h_divisor_spectrum),
cross-reference against EVERY planet cycle from doc 55 (6 cycle types × 8 planets
= 48 entries) and count direct/near matches per planet.

Tests the user's hypothesis: do inner-rocky and Earth-adjacent planets imprint
more strongly on Earth's climate spectrum than outer ice giants?

Run:  python3 scripts/milankovitch_planet_climate_match.py
"""

import json
from collections import defaultdict
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
DATA_DIR = SCRIPT_DIR.parent / "data"
SPEC_PATH = DATA_DIR / "milankovitch-8h-divisor-spectrum.json"
OUT_PATH = DATA_DIR / "milankovitch-planet-climate-match.json"

H = 335.317
EIGHT_H = 8 * H


# Doc 55 — Solar System Resonance Cycle Period Table (all values as 8H/N)
# Negative N indicates retrograde; None indicates frozen (~infinite); 0 indicates N/A
PLANET_CYCLES = {
    "Mercury": {"Axial": 9,  "Peri_ecl": 11, "ICRF": 93,  "AscNode": 9,  "Obliq": 3,   "Ecc": 84},
    "Venus":   {"Axial": 91, "Peri_ecl": 6,  "ICRF": 110, "AscNode": 1,  "Obliq": 110, "Ecc": 19},
    "Earth":   {"Axial": 104,"Peri_ecl": 128,"ICRF": 24,  "AscNode": 40, "Obliq": 64,  "Ecc": 128},
    "Mars":    {"Axial": 16, "Peri_ecl": 35, "ICRF": 69,  "AscNode": 63, "Obliq": 21,  "Ecc": 53},
    "Jupiter": {"Axial": 21, "Peri_ecl": 40, "ICRF": 64,  "AscNode": 36, "Obliq": 16,  "Ecc": 43},
    "Saturn":  {"Axial": 6,  "Peri_ecl": 64, "ICRF": 168, "AscNode": 36, "Obliq": 24,  "Ecc": 162},
    "Uranus":  {"Axial": 0,  "Peri_ecl": 24, "ICRF": 80,  "AscNode": 12, "Obliq": 16,  "Ecc": 80},
    "Neptune": {"Axial": 0,  "Peri_ecl": 4,  "ICRF": 100, "AscNode": 3,  "Obliq": 100, "Ecc": 100},
}


def match_peak(n_obs, tolerance=0):
    """Find all (planet, cycle_type) entries with N value within tolerance of n_obs.
    Returns list of (planet, cycle_type, N_model, error)."""
    matches = []
    for planet, cycles in PLANET_CYCLES.items():
        for cycle_type, N in cycles.items():
            if N == 0:  # skip frozen
                continue
            error = abs(N - n_obs)
            if error <= tolerance:
                matches.append((planet, cycle_type, N, error))
    return matches


def analyze_dataset(spec_data, dataset_label):
    print(f"\n{'=' * 80}")
    print(f"PLANET-CLIMATE MATCHING — {dataset_label}")
    print("=" * 80)
    result = spec_data["results"][dataset_label]
    peaks = result["peaks"]

    print(f"  {len(peaks)} significant peaks. Cross-referencing against {sum(1 for p in PLANET_CYCLES.values() for v in p.values() if v != 0)} planet-cycle entries from doc 55.")

    # Build cross-reference table per peak
    peak_matches = []
    for peak in peaks:
        n_obs = peak["n"]
        period = peak["period_kyr"]
        amp = peak["amplitude"]
        exact   = match_peak(n_obs, tolerance=0)
        near    = [m for m in match_peak(n_obs, tolerance=1) if abs(m[2] - n_obs) == 1]
        peak_matches.append({"n": n_obs, "period": period, "amp": amp,
                              "exact": exact, "near": near})

    # Print table
    print(f"\n  {'n':>4}  {'period':>9}  {'amp':>7}  {'exact match':<45}  near match (±1)")
    print(f"  {'-'*4}  {'-'*9}  {'-'*7}  {'-'*45}  {'-'*30}")
    for pm in peak_matches:
        exact_str = ", ".join(f"{p} {c}" for p, c, N, e in pm["exact"]) or "—"
        near_str  = ", ".join(f"{p} {c}(N={N})" for p, c, N, e in pm["near"]) or "—"
        print(f"  {pm['n']:>4}  {pm['period']:>7.2f}   {pm['amp']:>7.4f}  {exact_str:<45}  {near_str}")

    # Aggregate per planet
    print(f"\n  --- Per-planet match counts ---")
    by_planet_exact = defaultdict(int)
    by_planet_near  = defaultdict(int)
    by_planet_peaks_exact = defaultdict(list)
    by_planet_peaks_near  = defaultdict(list)
    for pm in peak_matches:
        for p, c, N, e in pm["exact"]:
            by_planet_exact[p] += 1
            by_planet_peaks_exact[p].append((pm["n"], pm["period"], c))
        for p, c, N, e in pm["near"]:
            by_planet_near[p] += 1
            by_planet_peaks_near[p].append((pm["n"], pm["period"], c, N))

    planet_order = ["Mercury", "Venus", "Earth", "Mars", "Jupiter", "Saturn", "Uranus", "Neptune"]
    print(f"\n  {'Planet':<10}  {'Exact':>5}  {'Near':>4}  {'Total':>5}  Cycles touched")
    print(f"  {'-'*10}  {'-'*5}  {'-'*4}  {'-'*5}  {'-'*60}")
    summary = {}
    for p in planet_order:
        ex = by_planet_exact[p]
        nr = by_planet_near[p]
        tot = ex + nr
        cycles_ex = [f"n={n} ({c}, {per:.0f}k)" for n, per, c in by_planet_peaks_exact[p]]
        cycles_nr = [f"n={n}≈{c}=N{N} ({per:.0f}k)" for n, per, c, N in by_planet_peaks_near[p]]
        all_cycles = cycles_ex + [f"[±1: {x}]" for x in cycles_nr]
        cycles_str = ", ".join(all_cycles) or "—"
        print(f"  {p:<10}  {ex:>5}  {nr:>4}  {tot:>5}  {cycles_str}")
        summary[p] = {"exact_matches": ex, "near_matches": nr, "total": tot,
                      "peaks_exact": cycles_ex, "peaks_near": cycles_nr}

    return {"peak_matches": peak_matches, "per_planet_summary": summary}


def main():
    spec = json.loads(SPEC_PATH.read_text())
    out = {}
    print("=" * 80)
    print("MILANKOVITCH PLANET-CLIMATE INFLUENCE MATCHING")
    print("=" * 80)
    print(f"Cross-referencing LR04 spectral peaks against 48 planet-cycle entries")
    print(f"from doc 55 (8 planets × 6 cycle types).")
    print(f"Skipping frozen entries (Uranus/Neptune axial). Total active: 46.")

    for ds in ["LR04 full", "LR04 0-1200", "LR04 0-700", "LR04 pre-MPT", "Cheng full"]:
        out[ds] = analyze_dataset(spec, ds)

    OUT_PATH.write_text(json.dumps({
        "meta": {
            "script": "milankovitch_planet_climate_match.py",
            "H_kyr": H, "8H_kyr": EIGHT_H,
            "doc_55_table": PLANET_CYCLES,
        },
        "results": out,
    }, indent=2))
    print(f"\n[saved] {OUT_PATH}")


if __name__ == "__main__":
    main()
