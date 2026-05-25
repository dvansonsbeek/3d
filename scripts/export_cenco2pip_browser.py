#!/usr/bin/env python3
"""
EXPORT CenCO2PIP CO2 DATA FOR BROWSER MODAL
============================================

Generates `public/input/cenco2pip-data.json` for the Climate Formula
Explorer modal's "CenCO2PIP" tab.

Source: data/cenco2pip-100kyr-bayesian.csv
  (CenCO2PIP Consortium 2023, Bayesian time-series at 100-kyr resolution,
   from SPATIAL-Lab/CenoCO2 v1.2 on Zenodo)

The native CSV is already at 100-kyr resolution (~680 samples over 0–68 Ma).
For the browser we use the median (50% quantile) and crop to 0–66 Ma. The
CSV stores ln(CO2/ppm), which we convert to ppm via exp().

Output: public/input/cenco2pip-data.json
Run:    python3 scripts/export_cenco2pip_browser.py
"""

import json
from pathlib import Path

import numpy as np

import sys
sys.path.insert(0, str(Path(__file__).resolve().parent))
from milankovitch_climate_formula import load_cenco2pip  # noqa: E402

SCRIPT_DIR = Path(__file__).resolve().parent
OUT_PATH = SCRIPT_DIR.parent / "public" / "input" / "cenco2pip-data.json"

MAX_AGE_KYR = 66000.0  # cap to the Cenozoic (drop the 66-68 Ma tail)


def main():
    print("Loading CenCO2PIP native...")
    ages_kyr, co2 = load_cenco2pip()
    print(f"  {len(ages_kyr)} native samples, 0-{ages_kyr.max()/1000:.1f} Ma")

    # Sort + dedupe + crop to 0–66 Ma
    order = np.argsort(ages_kyr)
    a = ages_kyr[order]
    v = co2[order]
    keep = np.concatenate([[True], np.diff(a) > 0])
    a = a[keep]; v = v[keep]
    mask = a <= MAX_AGE_KYR
    a = a[mask]; v = v[mask]

    out = {
        "source": "CenCO2PIP Consortium 2023, Science 382:eadi5177 (Bayesian time-series, 100-kyr res, median quantile)",
        "doi": "10.1126/science.adi5177",
        "binning_kyr": 100.0,
        "n_samples": int(len(a)),
        "age_range_kyr": [float(a.min()), float(a.max())],
        "age_kyr_BP": [round(float(x), 1) for x in a],
        "co2_ppm": [round(float(x), 2) for x in v],
    }

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with OUT_PATH.open("w") as f:
        json.dump(out, f)
    print(f"Wrote {OUT_PATH}")
    print(f"  Size: {OUT_PATH.stat().st_size / 1024:.1f} KB ({len(a)} samples)")


if __name__ == "__main__":
    main()
