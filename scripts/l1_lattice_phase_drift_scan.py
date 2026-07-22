"""
L1 LATTICE PHASE-DRIFT SCAN — does the climate record prefer an H(t)-rescaled lattice?

Question
--------
Every L1 line is a period 8H/n. Under ESSRT, H was smaller in the past
(~0.025 %/Myr), so the physical lattice periods were shorter. The production
fit (milankovitch_climate_formula.py) evaluates L1 phases on the FIXED J2000
lattice — a phase slip that is negligible below 1 Myr but reaches ~13 cycles
on the 41-kyr line at the far end of CENOGRID (66 Ma).

Because all L1 lines share one lattice, the proper phase is a single shared
time-warp ("lattice time"):

    tau(t)   = ∫₀ᵗ H₀/H(t′) dt′          (exported from tools/lib/deep-time.js
                                           via tools/explore/export-lattice-time-tau.js)
    tau_k(t) = t + k·(tau(t) − t)         k = drift scale

    k = 0  → production fixed-J2000 lattice
    k = 1  → full ESSRT lattice rescaling

L2 (405/202/135-kyr silicate-weathering thermostat, anchored on the OFF-lattice
g₂−g₅ secular eigenbeat) and L3 (Heaviside steps) stay on calendar time in all
runs — both the framework and mainstream treat the g₂−g₅ clock as H-independent.

Phases
------
  1b  Null guard      — LR04 post-MPT must be unchanged at k=1 (slip ~0.002 cyc).
  1c  Synthetic power — CENOGRID-like synthetic records with KNOWN k* ∈ {0, 1}
                        (real fitted amplitudes + phase-randomized real-residual
                        noise); can the k-scan recover k*? Gates interpretation.
  2   Real k-scan     — CENOGRID δ¹⁸O (+ δ¹³C, LR04 full) across k ∈ [−0.5, 2].
  3   Differential    — separate k for eccentricity-band lines (n = 22/25/28;
                        mainstream: g-modes spin-independent → no drift) vs the
                        remaining spin-linked lines (both frameworks: drift).
                        Framework predicts (k_spin, k_ecc) ≈ (1, 1);
                        mainstream-with-tidal-dissipation ≈ (1, 0);
                        fixed lattice ≈ (0, 0).

Output: data/l1-lattice-phase-drift-scan.json
Run:    python3 scripts/l1_lattice_phase_drift_scan.py
"""

import json
import sys
import time
from pathlib import Path

import numpy as np

SCRIPT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPT_DIR))
import milankovitch_climate_formula as mcf  # noqa: E402

TAU_PATH = mcf.DATA_DIR / "lattice-time-tau.json"
OUT_PATH = mcf.DATA_DIR / "l1-lattice-phase-drift-scan.json"

_tau_tbl = json.loads(TAU_PATH.read_text())
TAU_T = np.asarray(_tau_tbl["t_kyr"], dtype=float)
TAU_V = np.asarray(_tau_tbl["tau_kyr"], dtype=float)


def tau_of(t):
    """Lattice time tau(t) for lookback t in kyr BP (linear interp, 10-kyr grid)."""
    return np.interp(np.asarray(t, dtype=float), TAU_T, TAU_V)


# Eccentricity-band L1 integers (~100-kyr band, 75–130 kyr → 8H/n):
# mainstream treats these as spin-independent g-mode beats (no drift);
# the framework rescales them with H like every lattice line.
ECC_BAND_INTEGERS = {22, 25, 28}


class LatticeWarpedFormula(mcf.ClimateFormula):
    """ClimateFormula with L1 evaluated at lattice time tau_k(t).

    k may be a scalar (all L1 lines share the warp) or a dict
    {n: k_n} for the per-band differential test. L2/L3 untouched.
    """

    def __init__(self, k):
        super().__init__()
        self.k = k

    def _warp(self, t, k):
        t = np.asarray(t, dtype=float)
        if k == 0:
            return t
        return t + k * (tau_of(t) - t)

    def _build_l1_matrix(self, t):
        t = np.asarray(t, dtype=float)
        if not isinstance(self.k, dict):
            return super()._build_l1_matrix(self._warp(t, float(self.k)))
        # Per-line k: build column-by-column (intercept + cos/sin per n).
        cols = [np.ones_like(t)]
        for n in mcf.L1_LATTICE_INTEGERS:
            k_n = float(self.k.get(n, 0.0))
            tw = self._warp(t, k_n)
            omega = 2 * np.pi * n / mcf.EIGHT_H
            cols.append(np.cos(omega * tw))
            cols.append(np.sin(omega * tw))
        return np.column_stack(cols)


def fit_once(t, y, regime, k):
    f = LatticeWarpedFormula(k)
    s = f.fit(t, y, regime=regime)
    return s, f


def model_prediction_normalized(f, t):
    """Reconstruct the fitted model (normalized space) from stored coefficients,
    using the same (warped) matrices the fit used."""
    X1 = f._build_l1_matrix(t)
    beta1 = [f._intercept]
    for n in mcf.L1_LATTICE_INTEGERS:
        beta1.append(f._l1_a.get(n, 0.0))
        beta1.append(f._l1_b.get(n, 0.0))
    y_hat = X1 @ np.asarray(beta1)
    X2 = f._build_l2_matrix(t)
    beta2 = []
    for label in f.l2_labels:
        beta2.append(f._l2_a.get(label, 0.0))
        beta2.append(f._l2_b.get(label, 0.0))
    y_hat = y_hat + X2 @ np.asarray(beta2)
    if f._l3_transitions_kyr:
        step_times = list(f._l3_transitions_kyr.values())
        X3 = f._build_l3_matrix(t, step_times)
        beta3 = np.asarray([f._l3_betas[lbl] for lbl in f._l3_transitions_kyr])
        y_hat = y_hat + X3 @ beta3
    return y_hat


def phase_randomize(residual, rng):
    """Noise surrogate with the same amplitude spectrum as the real residual
    (Fourier phase randomization) — preserves the red-noise character."""
    n = len(residual)
    F = np.fft.rfft(residual)
    phases = rng.uniform(0, 2 * np.pi, len(F))
    phases[0] = 0.0
    if n % 2 == 0:
        phases[-1] = 0.0
    F_rand = np.abs(F) * np.exp(1j * phases)
    return np.fft.irfft(F_rand, n)


def refine_peak(ks, r2s):
    """Parabolic refinement of argmax over a k-grid (3-point vertex)."""
    i = int(np.argmax(r2s))
    if i == 0 or i == len(ks) - 1:
        return float(ks[i])
    x0, x1, x2 = ks[i - 1], ks[i], ks[i + 1]
    y0, y1, y2 = r2s[i - 1], r2s[i], r2s[i + 1]
    denom = (x1 - x0) * (y1 - y2) - (x1 - x2) * (y1 - y0)
    if abs(denom) < 1e-15:
        return float(x1)
    return float(x1 - 0.5 * ((x1 - x0) ** 2 * (y1 - y2)
                             - (x1 - x2) ** 2 * (y1 - y0)) / denom)


def scan_k(t, y, regime, k_grid, l1_only=False):
    """Fit at each k; return R²_L1-only and R²_full curves."""
    r2_l1, r2_full = [], []
    for k in k_grid:
        f = LatticeWarpedFormula(k)
        s = f.fit(t, y, regime=regime,
                  include_l2=not l1_only, include_l3=not l1_only)
        r2_l1.append(s.r2_l1_only)
        r2_full.append(s.r2_l1_l2_l3)
    return np.asarray(r2_l1), np.asarray(r2_full)


def highpass(y, dt_kyr, cutoff_kyr=500.0):
    """Remove a centered boxcar rolling mean (length = cutoff). A 500-kyr
    boxcar suppresses the Cenozoic secular trend and ~83 % of the 405-kyr
    L2 line while leaving the ≤130-kyr L1 band essentially intact."""
    w = max(3, int(round(cutoff_kyr / dt_kyr)) | 1)  # odd length
    kernel = np.ones(w) / w
    # edge-corrected running mean
    num = np.convolve(y, kernel, mode="same")
    den = np.convolve(np.ones_like(y), kernel, mode="same")
    return y - num / den


def main():
    t0 = time.time()
    out = {"tau_table": {"H0_yr": _tau_tbl["H0_yr"],
                          "excess_at_66Ma_kyr": float(tau_of(66000) - 66000)}}
    print("=" * 78)
    print("L1 LATTICE PHASE-DRIFT SCAN — fixed J2000 lattice (k=0) vs ESSRT H(t) (k=1)")
    print("=" * 78)
    print(f"tau(66 Ma) − t = {tau_of(66000) - 66000:.1f} kyr "
          f"(= {(tau_of(66000) - 66000) / (mcf.EIGHT_H / 65):.1f} cycles on the 41-kyr line)")

    # ── Phase 1b: null guard ─────────────────────────────────────────────
    print("\n─── Phase 1b: null guard (LR04 post-MPT, slip ~0.002 cycles) ───")
    ages_lr04, vals_lr04 = mcf.load_lr04()
    t_pm, y_pm = mcf.preprocess(ages_lr04, vals_lr04, mcf.REGIME_WINDOWS["post-mpt"])
    s_prod = mcf.ClimateFormula().fit(t_pm, y_pm, regime="post-mpt")
    s_k0, _ = fit_once(t_pm, y_pm, "post-mpt", 0.0)
    s_k1, _ = fit_once(t_pm, y_pm, "post-mpt", 1.0)
    d_harness = abs(s_k0.r2_l1_l2_l3 - s_prod.r2_l1_l2_l3)
    d_null = s_k1.r2_l1_l2_l3 - s_k0.r2_l1_l2_l3
    print(f"  production R²_full = {s_prod.r2_l1_l2_l3:.6f}")
    print(f"  harness k=0        = {s_k0.r2_l1_l2_l3:.6f}   (|Δ| = {d_harness:.2e}, must be ~0)")
    print(f"  harness k=1        = {s_k1.r2_l1_l2_l3:.6f}   (Δ vs k=0 = {d_null:+.2e}, must be <1e-3)")
    null_ok = d_harness < 1e-9 and abs(d_null) < 1e-3
    print(f"  NULL GUARD: {'PASS' if null_ok else 'FAIL'}")
    out["null_guard"] = {"r2_production": s_prod.r2_l1_l2_l3,
                          "r2_k0": s_k0.r2_l1_l2_l3, "r2_k1": s_k1.r2_l1_l2_l3,
                          "pass": bool(null_ok)}

    # ── Data for CENOGRID phases ─────────────────────────────────────────
    ages_cgd, d13c_cgd, d18o_cgd = mcf.load_cenogrid()
    t_cgd, y_cgd = mcf.preprocess(ages_cgd, d18o_cgd,
                                   mcf.REGIME_WINDOWS["cenogrid"], dt_kyr=5.0)

    K_GRID = np.array([-0.5, -0.25, 0.0, 0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 2.0])

    # ── Phase 1c: synthetic power analysis ───────────────────────────────
    print("\n─── Phase 1c: synthetic power analysis (CENOGRID grid, N=8 per k*) ───")
    print("  Synthetic = fitted L1(k*) + L2 + L3 signal + phase-randomized real residual")
    rng = np.random.default_rng(20260722)
    power = {}
    for k_star in (0.0, 1.0):
        s_gen, f_gen = fit_once(t_cgd, y_cgd, "cenogrid", k_star)
        y_norm = (y_cgd - f_gen._fit_y_mean) / f_gen._fit_y_std
        y_model = model_prediction_normalized(f_gen, t_cgd)
        resid = y_norm - y_model
        k_hats = []
        for _ in range(8):
            y_syn = y_model + phase_randomize(resid, rng)
            r2_l1, _ = scan_k(t_cgd, y_syn, "cenogrid", K_GRID)
            k_hats.append(refine_peak(K_GRID, r2_l1))
        k_hats = np.asarray(k_hats)
        power[k_star] = k_hats
        print(f"  k* = {k_star:.0f}:  k̂ = {k_hats.mean():+.3f} ± {k_hats.std():.3f}   "
              f"(realizations: {np.array2string(k_hats, precision=2)})")
    sep = abs(power[1.0].mean() - power[0.0].mean())
    spread = max(power[0.0].std(), power[1.0].std(), 1e-9)
    power_ok = sep > 3 * spread
    print(f"  separation = {sep:.3f}, max spread = {spread:.3f} → "
          f"POWER: {'SUFFICIENT' if power_ok else 'INSUFFICIENT'} "
          f"({sep / spread:.1f}σ)")
    out["synthetic_power"] = {
        "k_hat_given_0": power[0.0].tolist(), "k_hat_given_1": power[1.0].tolist(),
        "separation_sigma": float(sep / spread), "pass": bool(power_ok)}

    # ── Phase 2: real k-scan ─────────────────────────────────────────────
    print("\n─── Phase 2: real k-scan ───")
    real_scans = {}
    targets = [
        ("CENOGRID d18O 0-67 Ma", t_cgd, y_cgd, "cenogrid"),
    ]
    t_cgd13, y_cgd13 = mcf.preprocess(ages_cgd, d13c_cgd,
                                       mcf.REGIME_WINDOWS["cenogrid"], dt_kyr=5.0)
    targets.append(("CENOGRID d13C 0-67 Ma", t_cgd13, y_cgd13, "cenogrid"))
    t_full, y_full = mcf.preprocess(ages_lr04, vals_lr04,
                                     mcf.REGIME_WINDOWS["lr04-full"])
    targets.append(("LR04 full 0-5.3 Ma", t_full, y_full, "lr04-full"))

    for label, t, y, regime in targets:
        r2_l1, r2_full = scan_k(t, y, regime, K_GRID)
        k_hat = refine_peak(K_GRID, r2_l1)
        real_scans[label] = {"k_grid": K_GRID.tolist(),
                              "r2_l1_only": r2_l1.tolist(),
                              "r2_full": r2_full.tolist(),
                              "k_hat": k_hat,
                              "delta_r2_k1_minus_k0": float(r2_l1[list(K_GRID).index(1.0)]
                                                             - r2_l1[list(K_GRID).index(0.0)])}
        print(f"  {label:24s} R²_L1(k): " +
              " ".join(f"{v:.4f}" for v in r2_l1) +
              f"  | k̂ = {k_hat:+.2f}  ΔR²(1−0) = {real_scans[label]['delta_r2_k1_minus_k0']:+.4f}")
    print(f"  (k grid: {np.array2string(K_GRID, precision=2)})")
    out["real_scans"] = real_scans

    # ── Phase 2b: high-passed CENOGRID — L1 band isolated ────────────────
    print("\n─── Phase 2b: high-passed (500-kyr boxcar removed) CENOGRID, L1-only fits ───")
    y_hp = highpass(y_cgd, dt_kyr=5.0)
    y_hp13 = highpass(y_cgd13, dt_kyr=5.0)
    hp_scans = {}
    for label, y_use in [("CENOGRID d18O HP", y_hp), ("CENOGRID d13C HP", y_hp13)]:
        r2_l1, _ = scan_k(t_cgd, y_use, "cenogrid", K_GRID, l1_only=True)
        k_hat = refine_peak(K_GRID, r2_l1)
        hp_scans[label] = {"k_grid": K_GRID.tolist(), "r2_l1_only": r2_l1.tolist(),
                            "k_hat": k_hat,
                            "delta_r2_k1_minus_k0": float(r2_l1[list(K_GRID).index(1.0)]
                                                           - r2_l1[list(K_GRID).index(0.0)])}
        print(f"  {label:18s} R²_L1(k): " + " ".join(f"{v:.4f}" for v in r2_l1) +
              f"  | k̂ = {k_hat:+.2f}  ΔR²(1−0) = {hp_scans[label]['delta_r2_k1_minus_k0']:+.4f}")

    # Synthetic power under the high-passed protocol
    print("  Synthetic power under HP protocol (N=8 per k*):")
    power_hp = {}
    for k_star in (0.0, 1.0):
        f_gen = LatticeWarpedFormula(k_star)
        f_gen.fit(t_cgd, y_hp, regime="cenogrid", include_l2=False, include_l3=False)
        y_norm = (y_hp - f_gen._fit_y_mean) / f_gen._fit_y_std
        X1 = f_gen._build_l1_matrix(t_cgd)
        beta1 = [f_gen._intercept]
        for n in mcf.L1_LATTICE_INTEGERS:
            beta1.append(f_gen._l1_a.get(n, 0.0))
            beta1.append(f_gen._l1_b.get(n, 0.0))
        y_model = X1 @ np.asarray(beta1)
        resid = y_norm - y_model
        k_hats = []
        for _ in range(8):
            y_syn = y_model + phase_randomize(resid, rng)
            r2_l1, _ = scan_k(t_cgd, y_syn, "cenogrid", K_GRID, l1_only=True)
            k_hats.append(refine_peak(K_GRID, r2_l1))
        k_hats = np.asarray(k_hats)
        power_hp[k_star] = k_hats
        print(f"    k* = {k_star:.0f}:  k̂ = {k_hats.mean():+.3f} ± {k_hats.std():.3f}")
    sep_hp = abs(power_hp[1.0].mean() - power_hp[0.0].mean())
    spread_hp = max(power_hp[0.0].std(), power_hp[1.0].std(), 1e-9)
    print(f"    separation = {sep_hp:.3f}, max spread = {spread_hp:.3f} → "
          f"POWER: {'SUFFICIENT' if sep_hp > 3 * spread_hp else 'INSUFFICIENT'} "
          f"({sep_hp / spread_hp:.1f}σ)")
    out["hp_scans"] = hp_scans
    out["synthetic_power_hp"] = {
        "k_hat_given_0": power_hp[0.0].tolist(), "k_hat_given_1": power_hp[1.0].tolist(),
        "separation_sigma": float(sep_hp / spread_hp)}

    # ── Phase 3: differential per-band k (CENOGRID δ¹⁸O) ────────────────
    print("\n─── Phase 3: differential per-band k (ecc-band n=22/25/28 vs rest; HP record) ───")
    kk = np.array([0.0, 0.5, 1.0, 1.5])
    grid_r2 = np.zeros((len(kk), len(kk)))
    for i, k_spin in enumerate(kk):
        for j, k_ecc in enumerate(kk):
            kd = {n: (k_ecc if n in ECC_BAND_INTEGERS else k_spin)
                  for n in mcf.L1_LATTICE_INTEGERS}
            f = LatticeWarpedFormula(kd)
            s = f.fit(t_cgd, y_hp, regime="cenogrid",
                      include_l2=False, include_l3=False)
            grid_r2[i, j] = s.r2_l1_only
    i_best, j_best = np.unravel_index(np.argmax(grid_r2), grid_r2.shape)
    print("  R²_L1 grid (rows k_spin, cols k_ecc; k ∈ " +
          np.array2string(kk, precision=1) + "):")
    for i, k_spin in enumerate(kk):
        print(f"    k_spin={k_spin:.1f}: " +
              " ".join(f"{grid_r2[i, j]:.4f}" for j in range(len(kk))))
    print(f"  best: (k_spin, k_ecc) = ({kk[i_best]:.1f}, {kk[j_best]:.1f})")
    print("  predictions — framework: (1, 1) · mainstream+tidal: (1, 0) · fixed: (0, 0)")
    out["differential"] = {"k_values": kk.tolist(), "r2_grid": grid_r2.tolist(),
                            "best_k_spin": float(kk[i_best]),
                            "best_k_ecc": float(kk[j_best])}

    OUT_PATH.write_text(json.dumps(out, indent=2))
    print(f"\nWrote {OUT_PATH}  ({time.time() - t0:.1f} s)")


if __name__ == "__main__":
    main()
