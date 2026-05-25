#!/usr/bin/env python3
"""
MILANKOVITCH 13H ↔ BOULILA 2020 CROSS-CHECK
============================================

Pre-registered Test A from doc 17 §12.1.

The 8H Orbital Forcing Framework predicts a long-period climate eigenmode at
13H = 4.359 Myr (next integer multiple of H after 8H that survives the joint
inclination-precession resonance structure). Boulila et al. (2020)
independently identify a Cenozoic libration of the secular-resonance argument
θ = 2(g₄ − g₃) − (s₄ − s₃) with characteristic period ~4.5 Myr (range 3.7–4.8
Myr).

This is a numerical cross-check, not a Monte Carlo: the framework's value
is computed from first principles (13 × H), the empirical value is the
published Boulila 2020 result, and we ask whether they agree within the
published uncertainty range.

Output: data/milankovitch-13H-boulila-test.json
"""

import json
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
DATA_DIR = SCRIPT_DIR.parent / "data"
OUT_PATH = DATA_DIR / "milankovitch-13H-boulila-test.json"

H_KYR = 335.317
H_MYR = H_KYR / 1000.0

# Boulila et al. (2020), Earth-Science Reviews 200, 102954 — published libration period
BOULILA_2020_CENTRAL_MYR = 4.5
BOULILA_2020_RANGE_MYR = (3.7, 4.8)

# Laskar 2004 secular-resonance eigenfrequency context (for reference only)
# g₄ − g₃ ≈ 2.945 arcsec/yr → fundamental libration ≈ 4.36 Myr, not the secular
# period itself. Kept here only to make the framework-vs-libration distinction
# explicit in the report.
LASKAR_2004_S3_EIGENPERIOD_MYR = 173600.0 / 1419.5  # rough ≈ 122 Myr (s₃ eigenperiod)


def main():
    model_13H_myr = 13 * H_MYR
    diff_central_pct = 100.0 * abs(model_13H_myr - BOULILA_2020_CENTRAL_MYR) / BOULILA_2020_CENTRAL_MYR
    in_range = BOULILA_2020_RANGE_MYR[0] <= model_13H_myr <= BOULILA_2020_RANGE_MYR[1]

    print("=" * 72)
    print("13H ↔ BOULILA 2020 CROSS-CHECK")
    print("=" * 72)
    print(f"  H = {H_KYR} kyr = {H_MYR:.6f} Myr")
    print(f"  Model long-period eigenmode:     13H = {model_13H_myr:.6f} Myr")
    print(f"  Boulila 2020 central estimate:        {BOULILA_2020_CENTRAL_MYR:.2f} Myr")
    print(f"  Boulila 2020 published range:    {BOULILA_2020_RANGE_MYR[0]:.2f}–{BOULILA_2020_RANGE_MYR[1]:.2f} Myr")
    print(f"  Relative difference (model vs central): {diff_central_pct:.2f} %")
    print(f"  Model inside Boulila range?      {in_range}")

    verdict = ("13H matches Boulila 2020 within published range"
               if in_range else "13H falls outside Boulila 2020 published range")
    print(f"\n  VERDICT: {verdict}")

    result = {
        "model_13H_myr": model_13H_myr,
        "laskar_2004_eigenfreq_period_myr": LASKAR_2004_S3_EIGENPERIOD_MYR,
        "boulila_2020_central_estimate_myr": BOULILA_2020_CENTRAL_MYR,
        "boulila_2020_range_myr": list(BOULILA_2020_RANGE_MYR),
        "diff_model_vs_laskar_pct": 100.0 * abs(model_13H_myr - LASKAR_2004_S3_EIGENPERIOD_MYR) / LASKAR_2004_S3_EIGENPERIOD_MYR,
        "diff_model_vs_boulila_central_pct": diff_central_pct,
        "model_in_boulila_range": in_range,
        "verdict": verdict,
    }
    OUT_PATH.write_text(json.dumps(result, indent=2))
    print(f"\nWrote {OUT_PATH}")


if __name__ == "__main__":
    main()
