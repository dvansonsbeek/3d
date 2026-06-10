#!/usr/bin/env python3
"""
ECS spectrum with FULL radiative forcing (CO₂ + ice-albedo + other GHGs).

Goal
----
Diagnose whether our "ESS = 11 K at 100-kyr band" finding is a real signal or
an artifact of ignoring ice-albedo forcing.

Reasoning
---------
At any orbital frequency, the climate response satisfies:

    ΔT(f) = λ × ΔF_total(f)

where ΔF_total includes ALL radiative forcings, not just CO₂. If we compute
    ECS_CO2only = ΔT × 3.71 / ΔF_CO2
we get a *biased high* answer wherever non-CO₂ forcings contribute.

At the 100-kyr band specifically, the orbital signal IS the ice sheets — they
cycle at ~100 kyr. So ΔF_ice_albedo dominates. Computing ECS without including
it inflates the result by however much ice-albedo contributes.

Hansen 2013 forcings at LGM (Fig 5 of Hansen 2013):
    CO₂           ≈ 2.0 W/m²
    Other GHGs    ≈ 1.0 W/m²  (CH₄, N₂O, H₂O adjustment)
    Aerosols+dust ≈ 1.0 W/m²
    Ice albedo    ≈ 3.5 W/m²
    TOTAL         ≈ 6.5 W/m²    (Hansen's value)

Test
----
For each L1 line, compute ΔF_total = CO₂ + other-GHG + ice-albedo using the
proxies we have:
  - ΔF_CO2     = from EPICA CO₂ amplitude (already done)
  - ΔF_otherGHG = 0.5 × ΔF_CO2          (Hansen ratio)
  - ΔF_ice_albedo = LR04 amplitude × ICE_FRACTION × dSL_per_permil × 0.04 W/m²/m

If our "11 K at 100-kyr" was the artifact, the properly-forced ECS should drop
to literature range (3-6 K) at the 100-kyr band and STAY at literature range
elsewhere (it should not over-correct).

Sea-level conversion (Waelbroeck 2002, Spratt & Lisiecki 2016):
  ~120 m sea-level change per 1.0 ‰ of LR04 δ¹⁸O ice-volume contribution
  Post-MPT ice fraction of LR04: ~0.6 (Bintanja & van de Wal 2008)

Ice-albedo radiative forcing per m sea level (Hansen 2013):
  ~0.04 W/m²/m  (LGM 120 m drop → 4.8 W/m² ice forcing, close to Hansen's 3.5)
"""

import json
import math
import sys
from pathlib import Path
import numpy as np
import warnings
warnings.filterwarnings("ignore", category=UserWarning)

SCRIPTS_DIR = Path(__file__).parent
sys.path.insert(0, str(SCRIPTS_DIR))
from milankovitch_climate_formula import (   # noqa
    ClimateFormula, EIGHT_H, L1_LATTICE_INTEGERS,
    REGIME_WINDOWS, load_lr04, load_epica_co2, preprocess,
)

# ── Physics ──────────────────────────────────────────────────────────────────
ALPHA = 5.35
F_2X = ALPHA * math.log(2)

# Hansen 2013 ratio: non-CO₂ GHGs (CH₄, N₂O, H₂O) contribute ≈ 50% of CO₂'s forcing
OTHER_GHG_MULTIPLIER = 0.5

# Ice albedo forcing
ICE_FRACTION_OF_LR04 = 0.6              # Bintanja & van de Wal 2008 (post-MPT)
SEA_LEVEL_PER_PERMIL_ICE = 120.0        # m sea-level per ‰ ice-volume δ¹⁸O
FORCING_PER_M_SEA_LEVEL = 0.04          # W/m²/m  (Hansen 2013)

# Bootstrap
N_BOOT = 200
BLOCK_KYR = 30
RNG_SEED = 20260605

SNYDER_FILE = Path("/home/dennis/code/3d/data/Snyder_Data_Figures/Source Data - Figure 1.xlsx")
OUTPUT = Path("/home/dennis/code/3d/data/climate-ecs-full-forcing.json")

BANDS = {
    "obliquity (35-50)":   [(35, 50)],
    "100-kyr band (75-130)": [(75, 130)],
    "precession (18-26)":  [(18, 26)],
    "long (>130)":         [(130, 999)],
    "short (<18)":         [(0, 18)],
}


# ── Loaders ──────────────────────────────────────────────────────────────────
def load_snyder_gast():
    import openpyxl
    wb = openpyxl.load_workbook(SNYDER_FILE, data_only=True)
    ws = wb["1a-GAST reconstruction"]
    ages, t_med = [], []
    for i, row in enumerate(ws.iter_rows(values_only=True)):
        if i < 2: continue
        if row[0] is None or row[2] is None: continue
        try:
            ages.append(float(row[0]))
            t_med.append(float(row[2]))
        except (TypeError, ValueError):
            continue
    wb.close()
    return np.asarray(ages), np.asarray(t_med)


# ── Helpers (same as v2) ─────────────────────────────────────────────────────
def fit_extract(t, y, regime):
    f = ClimateFormula()
    f.fit(t, y, regime=regime, normalize=True)
    return dict(f._l1_a), dict(f._l1_b), f._fit_y_std


def block_idx(n, block_n, rng):
    if block_n >= n: block_n = n
    n_blocks = (n + block_n - 1) // block_n
    starts = rng.integers(0, n - block_n + 1, size=n_blocks)
    return np.concatenate([np.arange(s, s + block_n) for s in starts])[:n]


def boot_l1(t, y, regime, block_kyr, n_boot, rng):
    dt = float(np.median(np.diff(t)))
    block_n = max(1, int(round(block_kyr / dt)))
    out = {n: {"amp": [], "phase": []} for n in L1_LATTICE_INTEGERS}
    for _ in range(n_boot):
        idx = block_idx(len(t), block_n, rng)
        try:
            a, b, std = fit_extract(t, y[idx], regime)
        except Exception:
            continue
        for n in L1_LATTICE_INTEGERS:
            an, bn = a.get(n, 0.0), b.get(n, 0.0)
            out[n]["amp"].append(math.hypot(an, bn) * std)
            out[n]["phase"].append(math.atan2(bn, an))
    return out


def baseline(t, y, regime):
    a, b, std = fit_extract(t, y, regime)
    return {n: {
        "amp": math.hypot(a.get(n, 0.0), b.get(n, 0.0)) * std,
        "phase": math.atan2(b.get(n, 0.0), a.get(n, 0.0)),
    } for n in L1_LATTICE_INTEGERS}


def wrap_pi(a):
    while a > math.pi: a -= 2 * math.pi
    while a <= -math.pi: a += 2 * math.pi
    return a


def pct(arr, q):
    return float(np.percentile(np.asarray(arr), q)) if len(arr) else float("nan")


def co2_forcing(d_co2, co2_ref):
    return ALPHA * math.log(1 + d_co2 / co2_ref)


def ice_albedo_forcing(d_lr04_permil):
    """ΔF from LR04 amplitude (peak ‰). Uses 60% ice fraction + 120 m/‰ + 0.04 W/m²/m."""
    sea_level_amp_m = d_lr04_permil * ICE_FRACTION_OF_LR04 * SEA_LEVEL_PER_PERMIL_ICE
    return abs(sea_level_amp_m) * FORCING_PER_M_SEA_LEVEL


# ── Analysis ─────────────────────────────────────────────────────────────────
def main():
    rng = np.random.default_rng(RNG_SEED)

    print("=" * 96)
    print("  Full-forcing ECS spectrum (CO₂ + other-GHG + ice-albedo)")
    print(f"  Bootstrap N = {N_BOOT}, block ≈ {BLOCK_KYR} kyr,  ICE_FRACTION_LR04 = {ICE_FRACTION_OF_LR04}")
    print("=" * 96)

    # Load all three proxies on matched 0-800 kyr window
    print("\n  Loading Snyder GAST, LR04 δ¹⁸O, EPICA CO₂ ...")
    ages_s, t_s = load_snyder_gast()
    t_lr, y_lr = load_lr04()
    t_e,  y_e  = load_epica_co2()

    win = (0, 800)
    tg_s, yg_s = preprocess(ages_s, t_s, win, dt_kyr=1.0)
    tg_l, yg_l = preprocess(t_lr,  y_lr, win, dt_kyr=1.0)
    tg_e, yg_e = preprocess(t_e,   y_e,  win, dt_kyr=1.0)
    mask_e = (t_e >= win[0]) & (t_e <= win[1])
    co2_ref = float(np.mean(y_e[mask_e]))
    print(f"    CO₂_ref = {co2_ref:.2f} ppm")

    # Baseline fits
    print("  Baseline fits ...")
    base_S = baseline(tg_s, yg_s, win)   # Snyder GAST (K)
    base_L = baseline(tg_l, yg_l, win)   # LR04 δ¹⁸O (‰)
    base_E = baseline(tg_e, yg_e, "epica-co2")  # EPICA CO₂ (ppm)

    # Bootstrap all three
    print("  Bootstrap Snyder GAST ...")
    boot_S = boot_l1(tg_s, yg_s, win, BLOCK_KYR, N_BOOT, rng)
    print("  Bootstrap LR04 ...")
    boot_L = boot_l1(tg_l, yg_l, win, BLOCK_KYR, N_BOOT, rng)
    print("  Bootstrap EPICA CO₂ ...")
    boot_E = boot_l1(tg_e, yg_e, "epica-co2", BLOCK_KYR, N_BOOT, rng)

    # Per-line: compute ECS under CO₂-only vs full forcing
    spectrum = []
    for n in L1_LATTICE_INTEGERS:
        aS = base_S[n]["amp"];  pS = base_S[n]["phase"]   # K
        aL = base_L[n]["amp"]                              # ‰
        aE = base_E[n]["amp"];  pE = base_E[n]["phase"]   # ppm
        if aS <= 0 or aE <= 0: continue

        # Forcings
        dF_co2 = co2_forcing(aE, co2_ref)                       # CO₂
        dF_otherGHG = OTHER_GHG_MULTIPLIER * dF_co2             # CH₄ + N₂O + H₂O
        dF_ice = ice_albedo_forcing(aL)                         # ice albedo
        dF_total = dF_co2 + dF_otherGHG + dF_ice                # full ΔF
        if dF_total < 1e-9 or dF_co2 < 1e-9: continue

        ecs_co2only = aS * F_2X / dF_co2
        ecs_full   = aS * F_2X / dF_total

        # Ice fraction of forcing at this line
        ice_share = dF_ice / dF_total

        # Bootstrap full-forcing ECS
        ecs_full_boot = []
        ecs_co2_boot  = []
        for at, al, af in zip(boot_S[n]["amp"], boot_L[n]["amp"], boot_E[n]["amp"]):
            if at <= 0 or af <= 0: continue
            dFc = co2_forcing(af, co2_ref)
            dFi = ice_albedo_forcing(al)
            dFt = dFc * (1 + OTHER_GHG_MULTIPLIER) + dFi
            if dFt < 1e-9 or dFc < 1e-9: continue
            ecs_full_boot.append(at * F_2X / dFt)
            ecs_co2_boot.append(at * F_2X / dFc)

        period = EIGHT_H / n
        sep_deg = math.degrees(min(abs(wrap_pi(pE - pS)), math.pi))

        spectrum.append({
            "n": n,
            "period_kyr": period,
            "amp_T_K": aS,
            "amp_lr04_permil": aL,
            "amp_co2_ppm": aE,
            "dF_co2_Wm2": dF_co2,
            "dF_otherGHG_Wm2": dF_otherGHG,
            "dF_ice_Wm2": dF_ice,
            "dF_total_Wm2": dF_total,
            "ice_share_of_dF": ice_share,
            "ecs_co2only_K": ecs_co2only,
            "ecs_co2only_p5_K": pct(ecs_co2_boot, 5),
            "ecs_co2only_p95_K": pct(ecs_co2_boot, 95),
            "ecs_full_K": ecs_full,
            "ecs_full_p5_K": pct(ecs_full_boot, 5),
            "ecs_full_p95_K": pct(ecs_full_boot, 95),
            "phase_sep_deg": sep_deg,
            "phase_concordant": sep_deg <= 90,   # Snyder/CO₂ both positive → in-phase = good
        })

    # ── Per-line table (focus on dominant lines) ──
    print()
    print("   Per L1 line:  ΔF decomposition + ECS comparison")
    print("   " + "─" * 92)
    print(f"   {'n':>4}{'P (kyr)':>9}"
          f"{'ΔT (K)':>9}"
          f"{'F_CO₂':>9}{'F_GHG':>9}{'F_ice':>9}{'F_tot':>9}"
          f"{'ice %':>8}"
          f"{'ECS_CO₂':>10}{'ECS_full':>10}")
    for r in sorted(spectrum, key=lambda x: x["period_kyr"]):
        if not r["phase_concordant"]: continue
        ice_pct = 100 * r["ice_share_of_dF"]
        print(f"   {r['n']:>4}{r['period_kyr']:>9.1f}"
              f"{r['amp_T_K']:>9.4f}"
              f"{r['dF_co2_Wm2']:>9.3f}{r['dF_otherGHG_Wm2']:>9.3f}"
              f"{r['dF_ice_Wm2']:>9.3f}{r['dF_total_Wm2']:>9.3f}"
              f"{ice_pct:>7.0f}%"
              f"{r['ecs_co2only_K']:>10.2f}{r['ecs_full_K']:>10.2f}")

    # ── Band statistics ──
    concordant = [r for r in spectrum if r["phase_concordant"]]

    def stats(rows, key):
        if not rows: return None
        v = np.array([r[key] for r in rows])
        v = v[(v > 0) & (v < 50)]   # filter outliers
        if len(v) == 0: return None
        w = np.array([r["amp_T_K"] for r in rows])[: len(v)]
        return {
            "n_lines": len(v),
            "mean_K": float(np.mean(v)),
            "median_K": float(np.median(v)),
            "weighted_mean_K": float(np.average(v, weights=w[:len(v)])),
            "p5_K": float(np.percentile(v, 5)),
            "p95_K": float(np.percentile(v, 95)),
        }

    print()
    print("   ── Per-band ECS (concordant only): CO₂-only vs full-forcing ──")
    print(f"   {'Band':<25}{'n':>4}"
          f"{'ECS_CO₂only':>18}{'ECS_full':>18}{'reduction':>12}")
    band_stats = {}
    for bname, ranges in BANDS.items():
        rows = [r for r in concordant
                if any(lo <= r["period_kyr"] <= hi for lo, hi in ranges)]
        s_co2 = stats(rows, "ecs_co2only_K")
        s_full = stats(rows, "ecs_full_K")
        band_stats[bname] = {"co2_only": s_co2, "full": s_full}
        if s_co2 and s_full:
            red = (s_co2["weighted_mean_K"] - s_full["weighted_mean_K"]) / s_co2["weighted_mean_K"] * 100
            print(f"   {bname:<25}{s_co2['n_lines']:>4}"
                  f"  {s_co2['weighted_mean_K']:.2f} K [{s_co2['p5_K']:.1f}-{s_co2['p95_K']:.1f}]    "
                  f"  {s_full['weighted_mean_K']:.2f} K [{s_full['p5_K']:.1f}-{s_full['p95_K']:.1f}]"
                  f"{red:>10.0f}%")

    # ── Headline ──
    all_co2 = stats(concordant, "ecs_co2only_K")
    all_full = stats(concordant, "ecs_full_K")
    print()
    print("   ── Overall (ΔT-weighted, phase-concordant) ──")
    if all_co2 and all_full:
        print(f"   CO₂-only ECS  (old method): {all_co2['weighted_mean_K']:.2f} K  "
              f"[90% CI {all_co2['p5_K']:.1f}-{all_co2['p95_K']:.1f}]")
        print(f"   Full-forcing ECS (this)  : {all_full['weighted_mean_K']:.2f} K  "
              f"[90% CI {all_full['p5_K']:.1f}-{all_full['p95_K']:.1f}]")
        print(f"   Reduction factor: {all_co2['weighted_mean_K']/all_full['weighted_mean_K']:.2f}×")

    print()
    print("   ── Reference values ──")
    print("   IPCC AR6 Charney      : 2.5–4.0 K (best 3.0)")
    print("   Hansen 2013 Charney   : 3.0 ± 0.5 K  (paleo, full forcing)")
    print("   Hansen 2013 ESS       : ~6 K        (slow feedbacks INCLUDED)")
    print("   PALAEOSENS            : 3.0–4.5 K")

    # Output
    OUTPUT.write_text(json.dumps({
        "method": (
            f"Full radiative forcing: ΔF_total = ΔF_CO2 × (1 + {OTHER_GHG_MULTIPLIER}) + ΔF_ice_albedo. "
            f"Ice albedo: A_LR04 × {ICE_FRACTION_OF_LR04} (ice frac) × "
            f"{SEA_LEVEL_PER_PERMIL_ICE} m/‰ × {FORCING_PER_M_SEA_LEVEL} W/m²/m. "
            f"Bootstrap N={N_BOOT}, block={BLOCK_KYR} kyr."
        ),
        "constants": {
            "other_ghg_multiplier": OTHER_GHG_MULTIPLIER,
            "ice_fraction_of_lr04": ICE_FRACTION_OF_LR04,
            "sea_level_per_permil_ice_m": SEA_LEVEL_PER_PERMIL_ICE,
            "forcing_per_m_sea_level_Wm2": FORCING_PER_M_SEA_LEVEL,
        },
        "spectrum": spectrum,
        "by_band": band_stats,
        "overall_co2only": all_co2,
        "overall_full": all_full,
    }, indent=2, default=str))
    print(f"\n  Wrote: {OUTPUT}")


if __name__ == "__main__":
    main()
