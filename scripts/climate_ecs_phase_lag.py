#!/usr/bin/env python3
"""
Bootstrap-based phase-lag analysis from the canonical L1 lattice.

NOTE: The ECS columns in this script use CO₂-only ΔF; later analyses
(climate_ecs_full_forcing.py + climate_ecs_monte_carlo.py) showed CO₂-only
overstates ECS by ~3× at orbital frequencies. **The phase-lag analysis
remains valid** — it depends only on L1 amplitude/phase from the fit, not
on ΔF choice. Use this script for the signed CO₂-T lag; use
climate_ecs_full_forcing.py / climate_ecs_monte_carlo.py for ECS.

Three components:

  1. BOOTSTRAP error bars. Block-bootstrap the raw paleoclimate records,
     re-fit the climate formula on each resample, and produce per-L1-line
     amplitude / phase distributions. Propagates to ECS uncertainty.

  2. SIGNED PHASE LAG. For each L1 line, compute the lag of CO₂ behind
     effective temperature in years. Positive = CO₂ lags T (Caillon 800-yr
     interpretation). Negative = CO₂ leads T (Shakun deglaciation result).
     Uses bootstrap to give CI on the lag.

  3. ESS-vs-CHARNEY decomposition. The naive ECS calculation gives Earth
     System Sensitivity (slow feedbacks included). Charney sensitivity
     (fast feedbacks only, IPCC convention) is obtained by removing the
     ice-albedo and vegetation contributions:
           Charney ≈ ESS × (1 − α_slow)
     We report under α_slow ∈ {0.3, 0.4, 0.5} (Hansen 2013 / PALAEOSENS range).

Block-bootstrap rationale: paleoclimate proxies are autocorrelated, so naive
i.i.d. bootstrap underestimates Fourier-coefficient variance. Block bootstrap
preserves within-block autocorrelation; block size set to ~30 kyr (a few times
the integral decorrelation length for benthic δ¹⁸O).
"""

import json
import math
import sys
from pathlib import Path
from typing import Dict, List, Tuple

import numpy as np

# Local import of the existing fit pipeline
SCRIPTS_DIR = Path(__file__).parent
sys.path.insert(0, str(SCRIPTS_DIR))
from milankovitch_climate_formula import (   # noqa: E402
    ClimateFormula,
    EIGHT_H,
    L1_LATTICE_INTEGERS,
    REGIME_WINDOWS,
    load_lr04,
    load_cenogrid,
    load_epica_co2,
    load_cenco2pip,
    preprocess,
)

# ── Physics & calibration constants ──────────────────────────────────────────
ALPHA = 5.35
F_2X = ALPHA * math.log(2)
T_PER_PERMIL_DEFAULT = 2.5     # Shakun 2012 / Snyder 2016 calibration (K per ‰)
SLOW_FEEDBACK_FRACTIONS = [0.3, 0.4, 0.5]   # Hansen 2013 / PALAEOSENS range

# Bootstrap parameters
N_BOOT = 200
BLOCK_KYR_PLEISTOCENE = 30      # ~ few × τ_acorr for benthic δ¹⁸O
BLOCK_KYR_CENOZOIC = 250        # longer τ_acorr at deep-time scales

RNG_SEED = 20260605

# Frequency-band identities (for grouped reporting)
BANDS = {
    "obliquity (40 kyr)": [(35, 45)],         # period range in kyr
    "100-kyr band":       [(75, 130)],
    "precession (20-25)": [(18, 26)],
    "long (>130)":        [(130, 999)],
    "short (<18)":        [(0, 18)],
}

PAIRS = [
    # (T-regime fit-name, F-regime fit-name, T-loader, F-loader, label, block_kyr)
    ("post-mpt", "epica-co2",
     load_lr04,  load_epica_co2,
     "Pleistocene (LR04 0–1 Ma  ↔  EPICA CO₂ 0–800 kyr)",
     BLOCK_KYR_PLEISTOCENE),
    ("cenogrid", "cenco2pip",
     load_cenogrid, load_cenco2pip,
     "Full Cenozoic (CENOGRID δ¹⁸O 0–67 Ma  ↔  CenCO2PIP CO₂ 0–66 Ma)",
     BLOCK_KYR_CENOZOIC),
]

OUTPUT_PATH = Path("/home/dennis/code/3d/data/climate-ecs-phase-lag.json")


# ── Helpers ──────────────────────────────────────────────────────────────────
def fit_and_extract(t: np.ndarray, y: np.ndarray, regime: str) -> Tuple[dict, dict, float]:
    """Fit climate formula and return raw L1 (a, b) coefficients and y_std."""
    f = ClimateFormula()
    f.fit(t, y, regime=regime, normalize=True)
    return dict(f._l1_a), dict(f._l1_b), f._fit_y_std


def block_bootstrap_indices(n: int, block_n: int, rng: np.random.Generator) -> np.ndarray:
    """Return an index array for one block bootstrap sample of length n."""
    if block_n >= n:
        block_n = n
    n_blocks = (n + block_n - 1) // block_n
    starts = rng.integers(0, n - block_n + 1, size=n_blocks)
    idx = np.concatenate([np.arange(s, s + block_n) for s in starts])[:n]
    return idx


def bootstrap_l1_coeffs(t: np.ndarray, y: np.ndarray, regime: str,
                        block_kyr: float, n_boot: int,
                        rng: np.random.Generator) -> Dict:
    """Block-bootstrap; collect L1 amplitude (physical units) and phase per line.

    Returns: {n: {"amplitudes": [...], "phases": [...]}}
    """
    dt = float(np.median(np.diff(t)))
    block_n = max(1, int(round(block_kyr / dt)))

    result = {n: {"amplitudes": [], "phases": []} for n in L1_LATTICE_INTEGERS}
    n_fail = 0
    for i in range(n_boot):
        idx = block_bootstrap_indices(len(t), block_n, rng)
        # Use the same t (preserves t-spacing required by Fourier basis);
        # only y is resampled, which gives a valid bootstrap of fit residuals.
        # This avoids non-monotonic t arrays in the fit.
        t_b, y_b = t, y[idx]
        try:
            a, b, std = fit_and_extract(t_b, y_b, regime)
        except Exception:
            n_fail += 1
            continue
        for n in L1_LATTICE_INTEGERS:
            an = a.get(n, 0.0)
            bn = b.get(n, 0.0)
            amp = math.hypot(an, bn) * std
            phase = math.atan2(bn, an)
            result[n]["amplitudes"].append(amp)
            result[n]["phases"].append(phase)
    if n_fail:
        print(f"  ({n_fail} bootstrap fits failed)", file=sys.stderr)
    return result


def baseline_l1(t: np.ndarray, y: np.ndarray, regime: str) -> Dict:
    """Single fit on full data; return per-L1-line (amplitude, phase, intercept-info)."""
    a, b, std = fit_and_extract(t, y, regime)
    return {
        n: {
            "amp": math.hypot(a.get(n, 0.0), b.get(n, 0.0)) * std,
            "phase": math.atan2(b.get(n, 0.0), a.get(n, 0.0)),
        }
        for n in L1_LATTICE_INTEGERS
    }


def pct(arr: List[float], q: float) -> float:
    if not arr:
        return float("nan")
    return float(np.percentile(np.asarray(arr), q))


def wrap_pi(angle: float) -> float:
    while angle > math.pi:
        angle -= 2 * math.pi
    while angle <= -math.pi:
        angle += 2 * math.pi
    return angle


def circ_stats(phases: List[float]) -> Tuple[float, float]:
    """Return (circular_mean, circular_std) in radians."""
    if not phases:
        return float("nan"), float("nan")
    c = np.mean(np.cos(phases))
    s = np.mean(np.sin(phases))
    mean = math.atan2(s, c)
    R = math.hypot(c, s)
    std = math.sqrt(-2 * math.log(R)) if R > 1e-6 else math.pi
    return mean, std


def co2_forcing(delta_co2: float, co2_ref: float) -> float:
    return ALPHA * math.log(1 + delta_co2 / co2_ref)


# ── Per-pair analysis ────────────────────────────────────────────────────────
def _load_2(loader):
    """Loader-shim: cenogrid returns (ages, d18o, d13c); we only want δ¹⁸O for T."""
    out = loader()
    if isinstance(out, tuple) and len(out) >= 2:
        return out[0], out[1]
    raise ValueError(f"Loader {loader.__name__} returned unexpected shape")


def analyze_pair(t_regime: str, f_regime: str,
                 t_loader, f_loader,
                 label: str, block_kyr: float,
                 kappa: float, rng: np.random.Generator) -> Dict:
    print()
    print("=" * 92)
    print(f"  {label}")
    print(f"  block bootstrap: {N_BOOT} samples, block ≈ {block_kyr:.0f} kyr")
    print(f"  T/δ¹⁸O calibration κ = {kappa} K/‰")
    print("=" * 92)

    # Load & preprocess to uniform grid in regime window
    print(f"  Loading T-regime {t_regime} ...", flush=True)
    t_raw_t, y_raw_t = _load_2(t_loader)
    t_win = REGIME_WINDOWS[t_regime]
    tg_t, yg_t = preprocess(t_raw_t, y_raw_t, t_win, dt_kyr=1.0)

    print(f"  Loading F-regime {f_regime} ...", flush=True)
    t_raw_f, y_raw_f = _load_2(f_loader)
    f_win = REGIME_WINDOWS[f_regime]
    tg_f, yg_f = preprocess(t_raw_f, y_raw_f, f_win, dt_kyr=1.0)

    # CO₂ reference = mean of RAW data in regime window (NOT preprocessed,
    # which is de-meaned). This is the physically-meaningful baseline CO₂
    # for radiative forcing.
    raw_mask_f = (t_raw_f >= f_win[0]) & (t_raw_f <= f_win[1])
    co2_ref = float(np.mean(y_raw_f[raw_mask_f]))
    print(f"  CO₂_ref (raw regime mean) = {co2_ref:.2f} ppm", flush=True)

    # Baseline fits — these are the point estimates we'll center CIs around
    print(f"  Baseline fits ...", flush=True)
    base_T = baseline_l1(tg_t, yg_t, t_regime)
    base_F = baseline_l1(tg_f, yg_f, f_regime)

    # Bootstrap
    print(f"  Bootstrap T-regime ...", flush=True)
    boot_T = bootstrap_l1_coeffs(tg_t, yg_t, t_regime, block_kyr, N_BOOT, rng)
    print(f"  Bootstrap F-regime ...", flush=True)
    boot_F = bootstrap_l1_coeffs(tg_f, yg_f, f_regime, block_kyr, N_BOOT, rng)

    # ── per-L1-line ECS with CI ──
    spectrum = []
    for n in L1_LATTICE_INTEGERS:
        # Baseline amplitudes & phases
        amp_T0 = base_T[n]["amp"]
        amp_F0 = base_F[n]["amp"]
        ph_T0  = base_T[n]["phase"]
        ph_F0  = base_F[n]["phase"]
        if amp_F0 <= 0 or amp_T0 <= 0:
            continue

        # Effective temperature phase (δ¹⁸O is inverted vs T)
        ph_T_eff = wrap_pi(ph_T0 + math.pi)
        # Signed phase lag — positive = CO₂ peaks AFTER T (CO₂ lags T)
        phase_diff = wrap_pi(ph_T_eff - ph_F0)
        period_kyr = EIGHT_H / n
        lag_kyr = phase_diff * period_kyr / (2 * math.pi)
        # Phase separation in raw frame (concordance check)
        sep_rad = abs(wrap_pi(ph_F0 - ph_T0))
        sep_deg = math.degrees(min(sep_rad, math.pi))

        # Bootstrap CI on ECS
        amp_T_boot = boot_T[n]["amplitudes"]
        amp_F_boot = boot_F[n]["amplitudes"]
        ph_T_boot  = boot_T[n]["phases"]
        ph_F_boot  = boot_F[n]["phases"]

        ecs_boot = []
        lag_boot = []
        for at, af, pt, pf in zip(amp_T_boot, amp_F_boot, ph_T_boot, ph_F_boot):
            if af <= 0 or at <= 0:
                continue
            dT = at * kappa
            dF = co2_forcing(af, co2_ref)
            if dF <= 1e-9:
                continue
            ecs_boot.append(dT * F_2X / dF)
            pt_eff = wrap_pi(pt + math.pi)
            pd = wrap_pi(pt_eff - pf)
            lag_boot.append(pd * period_kyr / (2 * math.pi))

        # Bootstrap phase concentration on lag (use circular stats)
        lag_circ_mean = float(np.median(lag_boot)) if lag_boot else float("nan")
        lag_p5 = pct(lag_boot, 5) if lag_boot else float("nan")
        lag_p95 = pct(lag_boot, 95) if lag_boot else float("nan")

        # Final point estimate (baseline) + bootstrap CI
        dT0 = amp_T0 * kappa
        dF0 = co2_forcing(amp_F0, co2_ref)
        ecs0 = dT0 * F_2X / dF0
        ecs_p5 = pct(ecs_boot, 5)
        ecs_p95 = pct(ecs_boot, 95)

        # Phase-concentration of T and F separately (informative)
        _, ph_T_circ_std = circ_stats(ph_T_boot)
        _, ph_F_circ_std = circ_stats(ph_F_boot)

        spectrum.append({
            "n": n,
            "period_kyr": period_kyr,
            "amp_T_permil": amp_T0,
            "amp_T_p5":  pct(amp_T_boot, 5),
            "amp_T_p95": pct(amp_T_boot, 95),
            "amp_F_ppm": amp_F0,
            "amp_F_p5":  pct(amp_F_boot, 5),
            "amp_F_p95": pct(amp_F_boot, 95),
            "co2_ref_ppm": co2_ref,
            "delta_T_K": dT0,
            "delta_F_Wm2": dF0,
            "ecs_K": ecs0,
            "ecs_p5_K": ecs_p5,
            "ecs_p95_K": ecs_p95,
            "phase_sep_deg": sep_deg,        # 0 = in-phase (bad), 180 = anti (good)
            "phase_concordant": sep_deg >= 90,
            "lag_kyr": lag_kyr,
            "lag_p5_kyr": lag_p5,
            "lag_p95_kyr": lag_p95,
            "phase_T_circ_std_deg": math.degrees(ph_T_circ_std),
            "phase_F_circ_std_deg": math.degrees(ph_F_circ_std),
        })

    # ── per-pair summary ──
    valid = [r for r in spectrum if 0 < r["ecs_K"] < 25]
    concordant = [r for r in valid if r["phase_concordant"]]

    def stats(rows):
        if not rows:
            return None
        ecs = np.array([r["ecs_K"] for r in rows])
        weights = np.array([r["delta_T_K"] for r in rows])
        return {
            "n_lines": len(rows),
            "mean_K": float(np.mean(ecs)),
            "median_K": float(np.median(ecs)),
            "weighted_mean_K": float(np.average(ecs, weights=weights)),
            "p5_K": float(np.percentile(ecs, 5)),
            "p95_K": float(np.percentile(ecs, 95)),
        }

    # Per-band ECS
    band_stats = {}
    for band_name, ranges in BANDS.items():
        band_lines = [r for r in concordant
                      if any(lo <= r["period_kyr"] <= hi for lo, hi in ranges)]
        band_stats[band_name] = stats(band_lines)

    summary = {
        "label": label,
        "co2_ref_ppm": co2_ref,
        "kappa_K_per_permil": kappa,
        "block_kyr": block_kyr,
        "all_valid": stats(valid),
        "concordant_only": stats(concordant),
        "by_band": band_stats,
        "spectrum": spectrum,
    }

    # ── per-line table ──
    print()
    print(f"   {'n':>4}{'P (kyr)':>9}"
          f"{'ΔT (K)':>9}{'ΔF (W/m²)':>11}"
          f"{'ECS [5-95]':>16}"
          f"{'lag [5-95] (kyr)':>20}{'Δφ':>7}{'?':>3}")
    for r in sorted(spectrum, key=lambda x: x["period_kyr"]):
        ok = "✓" if r["phase_concordant"] else "✗"
        ecs_str = f"{r['ecs_K']:>5.2f} [{r['ecs_p5_K']:.1f}-{r['ecs_p95_K']:.1f}]"
        lag_str = f"{r['lag_kyr']:+5.1f} [{r['lag_p5_kyr']:+.1f}-{r['lag_p95_kyr']:+.1f}]"
        print(f"   {r['n']:>4}{r['period_kyr']:>9.1f}"
              f"{r['delta_T_K']:>9.3f}{r['delta_F_Wm2']:>11.4f}"
              f"{ecs_str:>16}"
              f"{lag_str:>20}{r['phase_sep_deg']:>7.0f}{ok:>3}")

    print()
    print(f"   ── Overall ──")
    av = summary["all_valid"]
    cc = summary["concordant_only"]
    if av:
        print(f"   All valid          (n={av['n_lines']:>2}): "
              f"mean = {av['mean_K']:.2f} K, "
              f"median = {av['median_K']:.2f} K, "
              f"ΔT-weighted = {av['weighted_mean_K']:.2f} K, "
              f"90% CI = [{av['p5_K']:.2f}, {av['p95_K']:.2f}] K")
    if cc:
        print(f"   Phase-concordant   (n={cc['n_lines']:>2}): "
              f"mean = {cc['mean_K']:.2f} K, "
              f"median = {cc['median_K']:.2f} K, "
              f"ΔT-weighted = {cc['weighted_mean_K']:.2f} K, "
              f"90% CI = [{cc['p5_K']:.2f}, {cc['p95_K']:.2f}] K")

    # ── per-band breakdown ──
    print()
    print(f"   ── By band (phase-concordant only) ──")
    print(f"   {'Band':<25}{'n':>4}{'mean':>9}{'median':>10}{'ΔT-weight':>12}{'90% CI':>20}")
    for band_name, s in band_stats.items():
        if s and s["n_lines"] > 0:
            ci = f"[{s['p5_K']:.2f}-{s['p95_K']:.2f}]"
            print(f"   {band_name:<25}{s['n_lines']:>4}"
                  f"{s['mean_K']:>9.2f}{s['median_K']:>10.2f}"
                  f"{s['weighted_mean_K']:>12.2f}{ci:>20}")

    # ── ESS → Charney decomposition (concordant + ΔT-weighted) ──
    if cc:
        print()
        print(f"   ── ESS → Charney decomposition (ΔT-weighted, concordant) ──")
        ess = cc["weighted_mean_K"]
        print(f"   ESS (this calc)            = {ess:.2f} K")
        for alpha in SLOW_FEEDBACK_FRACTIONS:
            charney = ess * (1 - alpha)
            print(f"   Charney @ α_slow={alpha}      = {charney:.2f} K")
        print(f"   IPCC AR6 Charney range     : 2.5–4.0 K (best 3.0)")
        print(f"   PALAEOSENS:                : 3.0–4.5 K (with slow feedbacks)")

    return summary


# ── Main ─────────────────────────────────────────────────────────────────────
def main():
    rng = np.random.default_rng(RNG_SEED)
    output = {
        "method": (
            "Block-bootstrap of canonical climate formula L1 amplitudes. "
            "ECS(n) = ΔT(n) × ΔF₂ₓ / ΔF(n); ΔT = A_d18o × κ; "
            "ΔF = 5.35 ln(1 + A_co2/CO₂_ref). Signed lag from phase difference "
            "(positive = CO₂ lags T). ESS→Charney via Charney = ESS × (1 - α_slow)."
        ),
        "n_bootstrap": N_BOOT,
        "rng_seed": RNG_SEED,
        "F_2x_Wm2": F_2X,
        "kappa_default_K_per_permil": T_PER_PERMIL_DEFAULT,
        "slow_feedback_fractions_alpha": SLOW_FEEDBACK_FRACTIONS,
        "pairs": [],
    }

    for t_regime, f_regime, t_loader, f_loader, label, block_kyr in PAIRS:
        summary = analyze_pair(t_regime, f_regime, t_loader, f_loader,
                               label, block_kyr, T_PER_PERMIL_DEFAULT, rng)
        output["pairs"].append(summary)

    # Sensitivity sweep
    print()
    print("=" * 92)
    print("  Calibration sensitivity (Pleistocene, phase-concordant only)")
    print("=" * 92)
    print(f"  {'κ (K/‰)':>12}{'ESS (mean)':>14}{'ESS (median)':>14}{'ESS-ΔTw':>12}{'Charney':>11}")
    for kappa in [1.5, 2.0, 2.5, 3.0, 3.5, 4.0]:
        sub_rng = np.random.default_rng(RNG_SEED + int(kappa * 10))
        s = analyze_pair_silent(
            "post-mpt", "epica-co2", load_lr04, load_epica_co2,
            "Pleistocene-sweep", BLOCK_KYR_PLEISTOCENE, kappa, sub_rng
        )
        cc = s["concordant_only"]
        if cc:
            charney = cc["weighted_mean_K"] * (1 - 0.4)
            print(f"  {kappa:>12.1f}{cc['mean_K']:>14.2f}"
                  f"{cc['median_K']:>14.2f}{cc['weighted_mean_K']:>12.2f}"
                  f"{charney:>11.2f}")

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(json.dumps(output, indent=2, default=str))
    print()
    print(f"Wrote: {OUTPUT_PATH}")


def analyze_pair_silent(t_regime, f_regime, t_loader, f_loader,
                        label, block_kyr, kappa, rng) -> Dict:
    """Like analyze_pair but no stdout — used for calibration sweep."""
    t_raw_t, y_raw_t = _load_2(t_loader)
    tg_t, yg_t = preprocess(t_raw_t, y_raw_t, REGIME_WINDOWS[t_regime], dt_kyr=1.0)
    t_raw_f, y_raw_f = _load_2(f_loader)
    tg_f, yg_f = preprocess(t_raw_f, y_raw_f, REGIME_WINDOWS[f_regime], dt_kyr=1.0)
    base_T = baseline_l1(tg_t, yg_t, t_regime)
    base_F = baseline_l1(tg_f, yg_f, f_regime)
    raw_mask_f = (t_raw_f >= REGIME_WINDOWS[f_regime][0]) & (t_raw_f <= REGIME_WINDOWS[f_regime][1])
    co2_ref = float(np.mean(y_raw_f[raw_mask_f]))
    spectrum = []
    for n in L1_LATTICE_INTEGERS:
        a_T = base_T[n]["amp"]; a_F = base_F[n]["amp"]
        p_T = base_T[n]["phase"]; p_F = base_F[n]["phase"]
        if a_F <= 0 or a_T <= 0:
            continue
        dT = a_T * kappa; dF = co2_forcing(a_F, co2_ref)
        if dF <= 1e-9:
            continue
        sep = math.degrees(min(abs(wrap_pi(p_F - p_T)), math.pi))
        spectrum.append({
            "ecs_K": dT * F_2X / dF, "delta_T_K": dT,
            "phase_concordant": sep >= 90,
            "period_kyr": EIGHT_H / n,
        })
    valid = [r for r in spectrum if 0 < r["ecs_K"] < 25]
    concordant = [r for r in valid if r["phase_concordant"]]
    def stats(rows):
        if not rows: return None
        ecs = np.array([r["ecs_K"] for r in rows])
        w = np.array([r["delta_T_K"] for r in rows])
        return {
            "n_lines": len(rows),
            "mean_K": float(np.mean(ecs)),
            "median_K": float(np.median(ecs)),
            "weighted_mean_K": float(np.average(ecs, weights=w)),
            "p5_K": float(np.percentile(ecs, 5)),
            "p95_K": float(np.percentile(ecs, 95)),
        }
    return {"all_valid": stats(valid), "concordant_only": stats(concordant)}


if __name__ == "__main__":
    main()
