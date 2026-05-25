#!/usr/bin/env python3
"""
EXPORT EPICA CO2 DATA FOR BROWSER MODAL
========================================

Generates `public/input/epica-co2-data.json` for the Climate Formula
Explorer modal's EPICA tab.

Source: data/epica-co2-bereiter2015.txt
  (Bereiter et al. 2015 GRL 42, 542 — Antarctic ice core composite, 0-800 kyr)

The native dataset has ~1840 samples in 0-800 kyr (~2 kyr mean resolution,
but irregular). For the browser we bin to a 2-kyr uniform grid (~400 samples)
which is plenty for displaying ~100-kyr glacial cycles at this scale and
keeps the JSON small (<20 KB).

Output: public/input/epica-co2-data.json
Run:    python3 scripts/export_epica_browser.py
"""

import json
from pathlib import Path

import numpy as np

import sys
sys.path.insert(0, str(Path(__file__).resolve().parent))
from milankovitch_climate_formula import load_epica_co2  # noqa: E402

SCRIPT_DIR = Path(__file__).resolve().parent
OUT_PATH = SCRIPT_DIR.parent / "public" / "input" / "epica-co2-data.json"

DT_KYR = 2.0  # 2-kyr bins → ~400 samples over 800 kyr


def main():
    print("Loading EPICA CO2 native...")
    ages_kyr, co2 = load_epica_co2()
    print(f"  {len(ages_kyr)} native samples, 0-{ages_kyr.max():.0f} kyr")

    # Sort + dedupe
    order = np.argsort(ages_kyr)
    a = ages_kyr[order]
    v = co2[order]
    keep = np.concatenate([[True], np.diff(a) > 0])
    a = a[keep]; v = v[keep]

    # Bin to DT_KYR resolution via linear interpolation
    hi = min(a.max(), 800.0)
    grid = np.arange(0, hi + DT_KYR, DT_KYR)
    v_binned = np.interp(grid, a, v)

    out = {
        "source": "Bereiter et al. 2015, GRL 42, 542 (EPICA Dome C composite, Antarctica2015 CO2)",
        "doi": "10.1002/2014GL061957",
        "binning_kyr": DT_KYR,
        "n_samples": int(len(grid)),
        "age_range_kyr": [float(grid.min()), float(grid.max())],
        "age_kyr_BP": [round(float(x), 1) for x in grid],
        "co2_ppm": [round(float(x), 2) for x in v_binned],
    }

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with OUT_PATH.open("w") as f:
        json.dump(out, f)
    print(f"Wrote {OUT_PATH}")
    print(f"  Size: {OUT_PATH.stat().st_size / 1024:.1f} KB ({len(grid)} binned samples)")


if __name__ == "__main__":
    main()
