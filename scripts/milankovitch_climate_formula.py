#!/usr/bin/env python3
"""
MILANKOVITCH 8H CLIMATE FORMULA — modular L1/L2/L3 architecture
===================================================================

This is the canonical climate-prediction formula. Built from the findings of
doc 92 / Tier B Rounds 1-3.

Architecture:
  • Explicit three-layer decomposition + regime-aware sequential fitting
    (L1 → L2 → L3 on residuals; per-layer ΔR² is the unique variance
    contribution after preceding layers)

The formula:

    C(t) = c₀
         + Σ_n [a_n cos(2π·n·t/8H) + b_n sin(2π·n·t/8H)]     ← L1 (31 lattice integers)
         + Σ_p [α_p cos(2π·t/p)   + β_p sin(2π·t/p)]          ← L2 (3 carbon-thermostat lines)
         + Σ_i γ_i H(t - t_i)                                  ← L3 (step components)

L1 = 31 integer divisors of 8H = 2682.536 kyr
  Canonical 25 (Berger eigenmode beats + Mars/Jupiter direct cycles, doc 91 §2.2)
  + 6 precession-band sidebands (MTM-significant per Round 1 A1, doc 92 §2.2)

L2 = 405-kyr silicate-weathering thermostat family
  Fundamental 405-kyr (g₂−g₅ eccentricity beat, off-lattice)
  2nd harmonic 202.25 kyr (Round 1 B1: cross-proxy ratio 3.27)
  3rd harmonic 134.83 kyr (Round 1 B1: cross-proxy ratio 13.99)
  These three pass the carbon-cycle amplification diagnostic (Round 2 C2 etc.)

L1 fit method: ridge regression (λ = L1_RIDGE_LAMBDA, intercept un-penalized).
  Required because the lattice has 5 unresolved groups inside the 1000-kyr
  post-MPT window (Rayleigh limit 1×10⁻³ kyr⁻¹; lattice spacing 3.7×10⁻⁴
  kyr⁻¹ ⇒ ~3 integers per Rayleigh element; n=12,14,16,18,20,21,22 all sit
  in one block). OLS finds degenerate cancelling coefficients (VIF up to
  69 600; max |amp| ≈ 17 in normalized units) that fit the window but
  blow up under extrapolation. Ridge λ=1 shrinks max |amp| ≈ 25× with
  ΔR² < 0.01 in post-MPT and is a no-op for the well-conditioned
  inhg-mpt / pre-inhg / lr04-full regimes (cond ≤ 3). See doc 92 §9.5.

L3 = Cenozoic boundary-condition step components
  At PETM (56 Ma), EOT (34 Ma), Mi-1 (23 Ma), MMCT (14 Ma), iNHG (2.7 Ma), MPT (1 Ma)
  Only transitions inside the fit window are included.
  Round 2 B5: adding these lifts CENOGRID δ¹⁸O R² from 0.027 → 0.676 (25× improvement).

API:

    f = ClimateFormula()
    fit_summary = f.fit(t_kyr, y, regime="post-mpt")
    # → per-layer R² and ΔR² breakdown

    y_l1    = f.evaluate(t_kyr, layer="l1")        # L1 lattice only
    y_l2    = f.evaluate(t_kyr, layer="l2")        # L2 thermostat only
    y_l3    = f.evaluate(t_kyr, layer="l3")        # L3 step terms only
    y_total = f.evaluate(t_kyr, layer="all")       # full formula

    decomp  = f.decompose(t_kyr)                   # dict of per-layer arrays

Regime-aware fitting:

    fit(t, y, regime="full")          # entire record, auto-include all steps inside
    fit(t, y, regime="post-mpt")      # 0–1000 kyr (LR04)
    fit(t, y, regime="inhg-mpt")      # 1000–2700 kyr
    fit(t, y, regime="pre-inhg")      # 2700–5320 kyr (LR04)
    fit(t, y, regime="cenogrid")      # 0–67000 kyr (CENOGRID)
    fit(t, y, regime=(lo, hi))        # explicit window

Forward projection honesty:
  The current operative regime is **post-MPT** (we are at ~1.05 Ma since MPT;
  no scheduled boundary-condition transition within the next 250 kyr). A
  formula trained on post-MPT data projects forward credibly within this
  regime. Doc 93 Round 2 C5 + Round 3 R3-3 documented that cross-regime
  prediction fails catastrophically (R² ≈ −0.9). Forward projections
  beyond ~250 kyr enter "unknown" territory because they may encounter
  the next boundary-condition shift (an Anthropocene-induced regime
  change is the most-discussed candidate).

Output: data/milankovitch-climate-formula.json
Run:    python3 scripts/milankovitch_climate_formula.py
"""

import json
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional, Union

import numpy as np
from scipy.signal import detrend, find_peaks

SCRIPT_DIR = Path(__file__).resolve().parent
DATA_DIR = SCRIPT_DIR.parent / "data"
LR04_PATH = DATA_DIR / "lr04-stack.txt"
CENOGRID_PATH = DATA_DIR / "westerhold2020-cenogrid.tab"
EPICA_PATH = DATA_DIR / "epica-co2-bereiter2015.txt"
CENCO2PIP_PATH = DATA_DIR / "cenco2pip-100kyr-bayesian.csv"
OUT_PATH = DATA_DIR / "milankovitch-climate-formula.json"

H = 335.317
EIGHT_H = 8 * H              # 2682.536 kyr

# L1 ridge regularization. Acts only where the lattice is under-determined
# (post-MPT 1000-kyr window: cond ≈ 632, max VIF ≈ 7×10⁴). No-op in regimes
# whose window length resolves the lattice (cond ≤ 3). See doc 92 §9.5.
L1_RIDGE_LAMBDA = 1.0

# ─────────────────────────────────────────────────────────────────────────
# Three-layer specification (the formula's structural commitment)
# ─────────────────────────────────────────────────────────────────────────

L1_LATTICE_INTEGERS = sorted([
    # Canonical 25 (doc 91 §2.2 + pre-MPT additions from §3.3)
    9, 12, 14, 16, 18, 20, 21, 22, 25, 28, 30, 31, 35,
    38, 39, 48, 50, 53, 65, 66, 68, 73, 76, 113, 120,
    # 6 precession-band sidebands (Round 1 A1; MTM-significant, on-lattice at higher N)
    96, 107, 110, 134, 152, 185,
    # Berger quintet completion: k+g₃ Earth climatic precession at ~19 kyr.
    # Subthreshold in LR04 (amp/median 2.03×) but 3σ-significant in Cheng monsoon (3.6×).
    # Combines with k+g₅ (n=113) to produce the 95-kyr eccentricity beat at n=28
    # (Wigley 1976 / Berger 1978 combination tone: 1/95 ≈ 1/19 − 1/23.7).
    141,
])

L2_THERMOSTAT_FAMILY = {
    "405-kyr (fundamental)":  404.5,
    "202-kyr (2nd harmonic)": 202.25,
    "135-kyr (3rd harmonic)": 134.83,
}

L3_TRANSITIONS_MA = {
    "PETM":  56.0,
    "EOT":   34.0,
    "Mi-1":  23.0,
    "MMCT":  14.0,
    "iNHG":   2.7,
    "MPT":    1.0,
}

# Per-integer label (mirrored from v1 for backward compatibility + 6 new sidebands)
L1_LABELS = {
    9:   "g₂−g₇ Venus-Uranus ecc / Mercury Axial = 8H/9",
    12:  "s₅−s₁ Jupiter-Mercury nodal",
    14:  "g₂−g₈ Venus-Neptune ecc",
    16:  "Mars Axial = 8H/16",
    18:  "s₄−s₆ Mars-Saturn nodal",
    20:  "g₃−g₂ Earth-Venus ecc",
    21:  "Mars Obliq / Jupiter Axial = 8H/21",
    22:  "s₂−s₄ Venus-Mars nodal / g₄−g₂ (Round 1 C8: highest L2 ratio at 12.84)",
    25:  "s₁−s₄ Mercury-Mars nodal (100-kyr centroid)",
    28:  "g₄−g₅ Mars-Jupiter ecc (Berger 95k)",
    30:  "g₃−g₇ Earth-Uranus ecc",
    31:  "g₄−g₇ Mars-Uranus",
    35:  "Earth.Axial(104) − Mercury.ICRF(93) + Saturn.Obliq(24) (3-term beat; close to Mars apsidal at 8H/36)",
    38:  "s₈−s₃ Neptune-Earth nodal",
    39:  "s₅−s₃ Earth nodal",
    48:  "s₇−s₆ Uranus-Saturn nodal",
    50:  "g₆−g₅ Saturn-Jupiter ecc",
    53:  "Mars.AscNode(64) − Uranus.AscNode(11) s-beat (close to Mars Ecc cycle at 8H/52)",
    65:  "k+s₃ Earth obliquity (Berger 41k)",
    66:  "obliquity-band arithmetic-mean (Round 2 C10: EPICA CO₂ ratio 15.79)",
    68:  "k+s₄ Berger Mars obliquity sub-peak",
    73:  "2|s₄| Mars nodal harmonic",
    76:  "g₄−s₃ Mars-Earth beat",
    96:  "k+g₆ Saturn climatic precession sub-peak (Round 1 A1 sideband)",
    107: "k+g₇ Uranus climatic precession sub-peak (Round 1 A1)",
    110: "k+g₃ Earth secondary precession sideband (Round 1 A1)",
    113: "k+g₅ Jupiter climatic precession (Berger 23.7k)",
    120: "k+g₂ Venus climatic precession = H/15",
    134: "k+g₅ Jupiter precession sub-peak (Round 1 A1)",
    141: "k+g₃ Earth climatic precession — Berger quintet 19-kyr peak (subthreshold LR04, 3σ in Cheng monsoon; beats with n=113 to form n=28 per Wigley 1976)",
    152: "k+g₄ Mars climatic precession sub-peak (Round 1 A1)",
    185: "k+g₂ Venus precession sub-peak (Round 1 A1)",
}

# Regime windows (kyr BP)
REGIME_WINDOWS = {
    "post-mpt":      (0,    1000),    # LR04, current 100-kyr regime
    "inhg-mpt":      (1000, 2700),    # LR04, 41-kyr regime with NH ice sheets
    "pre-inhg":      (2700, 5320),    # LR04, pre-NH-glaciation
    "lr04-full":     (0,    5320),    # full LR04
    "neogene":       (0,    23000),   # CENOGRID Neogene
    "post-eot":      (0,    34000),   # CENOGRID post-Eocene-Oligocene
    "cenogrid":      (0,    67000),   # full CENOGRID
    "epica-co2":     (0,    800),     # EPICA Dome C atmospheric CO2 (Bereiter 2015)
    "cenco2pip":     (0,    66000),   # CenCO2PIP consortium Bayesian CO2 (0–66 Ma)
}


# ─────────────────────────────────────────────────────────────────────────
# Climate formula class
# ─────────────────────────────────────────────────────────────────────────

@dataclass
class FitSummary:
    """Per-layer fit diagnostics."""
    regime: str
    window_kyr: tuple
    n_samples: int
    n_l1_components: int
    n_l2_components: int
    n_l3_steps: int

    intercept: float
    r2_l1_only: float
    r2_l1_l2: float
    r2_l1_l2_l3: float           # full model
    delta_r2_l2: float            # R²_L1L2 − R²_L1
    delta_r2_l3: float            # R²_L1L2L3 − R²_L1L2
    condition_number: float

    l1_amplitudes: dict = field(default_factory=dict)  # n → amplitude
    l2_amplitudes: dict = field(default_factory=dict)  # label → amplitude
    l3_step_betas: dict = field(default_factory=dict)  # label → step coefficient


class ClimateFormula:
    """Three-layer 8H orbital + L2 + L3 climate formula.

    See module docstring for usage. Stores fitted coefficients after fit();
    evaluate() returns per-layer or total contributions at arbitrary timestamps.
    """

    def __init__(self):
        self.l1_periods = [EIGHT_H / n for n in L1_LATTICE_INTEGERS]
        self.l1_integers = L1_LATTICE_INTEGERS
        self.l2_periods = list(L2_THERMOSTAT_FAMILY.values())
        self.l2_labels  = list(L2_THERMOSTAT_FAMILY.keys())
        # Fitted coefficients (populated by fit())
        self._intercept: float = 0.0
        self._l1_a: dict = {}   # n → cos coeff
        self._l1_b: dict = {}   # n → sin coeff
        self._l2_a: dict = {}   # label → cos coeff
        self._l2_b: dict = {}   # label → sin coeff
        self._l3_betas: dict = {}     # label → step amplitude
        self._l3_transitions_kyr: dict = {}  # label → transition time (kyr)
        self._fitted_regime: Optional[str] = None
        self._fitted_window: Optional[tuple] = None
        self._fit_y_mean: float = 0.0
        self._fit_y_std: float = 1.0

    # ─── fitting (SEQUENTIAL / HIERARCHICAL — fits L1 first, then L2 on
    #              residuals, then L3 on residuals) ────────────────────

    def fit(self,
            t_kyr: np.ndarray,
            y: np.ndarray,
            regime: Union[str, tuple] = "post-mpt",
            include_l1: bool = True,
            include_l2: bool = True,
            include_l3: bool = True,
            normalize: bool = True,
            ) -> FitSummary:
        """Fit the formula to (t_kyr, y) using **sequential regression**.

        Sequential fit order: L1 lattice → L2 thermostat → L3 step components.
        Each subsequent layer is fitted to the residual of the previous layer's
        fit. This guarantees per-layer coefficients capture UNIQUE variance:
          • L1 contribution = R²_L1_alone (best fit of just lattice)
          • L2 contribution = ΔR²_L2 = additional variance L2 explains AFTER L1
                              (zero if L2 is collinear with L1)
          • L3 contribution = ΔR²_L3 = additional variance L3 explains AFTER L1+L2

        Why sequential (not joint OLS)? At short windows (e.g. post-MPT
        1000 kyr), several L2 lines are within 1 Rayleigh element of nearby
        L1 lattice integers (e.g. L2 135-kyr ≈ L1 8H/20 = 134 kyr).
        Joint OLS finds degenerate cancelling solutions with no physical
        meaning. Sequential fitting gives interpretable per-layer amplitudes.

        regime: name (see REGIME_WINDOWS) OR (lo_kyr, hi_kyr) tuple.
                The fit is restricted to the regime window. L3 step
                components for transitions inside the window are auto-included.
        normalize: zero-mean / unit-std y before fitting (recommended).
        """
        # Resolve regime window
        if isinstance(regime, str):
            if regime not in REGIME_WINDOWS:
                raise ValueError(f"Unknown regime '{regime}'. "
                                 f"Choices: {list(REGIME_WINDOWS.keys())} or (lo, hi) tuple.")
            window = REGIME_WINDOWS[regime]
            regime_name = regime
        else:
            window = tuple(regime)
            regime_name = f"custom({window[0]:.0f}-{window[1]:.0f}kyr)"
        lo, hi = window

        # Subset and normalize
        mask = (t_kyr >= lo) & (t_kyr <= hi)
        t = t_kyr[mask]
        y_sub = y[mask].copy()
        if normalize:
            mu, sigma = float(y_sub.mean()), float(y_sub.std())
            y_sub = (y_sub - mu) / max(sigma, 1e-12)
            self._fit_y_mean = mu
            self._fit_y_std = max(sigma, 1e-12)
        else:
            self._fit_y_mean, self._fit_y_std = 0.0, 1.0

        # L3 step transitions inside this window
        if include_l3:
            step_dict = {
                label: ma * 1000
                for label, ma in L3_TRANSITIONS_MA.items()
                if lo < ma * 1000 < hi
            }
        else:
            step_dict = {}
        step_labels = list(step_dict.keys())
        step_times = list(step_dict.values())

        ss_tot = float(np.sum((y_sub - y_sub.mean()) ** 2))
        ss_tot = max(ss_tot, 1e-12)

        # ─── Step 1: Fit L1 to y_sub (intercept + 31 lattice sinusoids) ───
        self._intercept = 0.0
        self._l1_a, self._l1_b = {}, {}
        self._l2_a, self._l2_b = {}, {}
        self._l3_betas = {}
        condition_l1 = 1.0
        residual = y_sub - y_sub.mean()  # default if L1 not included

        if include_l1:
            X_l1 = self._build_l1_matrix(t)  # intercept + 31 cos/sin pairs
            # Ridge solve (intercept un-penalized). Equivalent to OLS when
            # the lattice is well-resolved by the window length.
            p = X_l1.shape[1]
            I_reg = np.eye(p)
            I_reg[0, 0] = 0.0
            XtX = X_l1.T @ X_l1
            beta_l1 = np.linalg.solve(XtX + L1_RIDGE_LAMBDA * I_reg, X_l1.T @ y_sub)
            # Condition number of the *centered* sinusoid columns (excl. intercept)
            svals_l1 = np.linalg.svd(X_l1[:, 1:] - X_l1[:, 1:].mean(axis=0),
                                       compute_uv=False)
            y_hat_l1 = X_l1 @ beta_l1
            residual = y_sub - y_hat_l1
            r2_l1_only = 1.0 - float(np.sum(residual ** 2)) / ss_tot
            condition_l1 = (float(svals_l1[0] / svals_l1[-1])
                             if len(svals_l1) > 1 and svals_l1[-1] > 0 else 1.0)
            # Unpack L1 coefficients: beta_l1[0] = intercept, then pairs
            self._intercept = float(beta_l1[0])
            for i, n in enumerate(L1_LATTICE_INTEGERS):
                self._l1_a[n] = float(beta_l1[1 + 2 * i])
                self._l1_b[n] = float(beta_l1[2 + 2 * i])
        else:
            self._intercept = float(y_sub.mean())
            r2_l1_only = 0.0

        # ─── Step 2: Fit L2 to L1's residual (no intercept; just 3 sinusoids) ───
        if include_l2:
            X_l2 = self._build_l2_matrix(t)  # 3 cos/sin pairs, no intercept
            beta_l2, _, _, _ = np.linalg.lstsq(X_l2, residual, rcond=1e-10)
            y_hat_l2 = X_l2 @ beta_l2
            residual = residual - y_hat_l2
            r2_l1_l2 = 1.0 - float(np.sum(residual ** 2)) / ss_tot
            # Unpack L2 coefficients
            for i, label in enumerate(self.l2_labels):
                self._l2_a[label] = float(beta_l2[2 * i])
                self._l2_b[label] = float(beta_l2[2 * i + 1])
        else:
            r2_l1_l2 = r2_l1_only

        # ─── Step 3: Fit L3 step components to L1+L2 residual ───
        r2_l1_l2_l3 = r2_l1_l2
        if include_l3 and step_times:
            X_l3 = self._build_l3_matrix(t, step_times)  # k step columns
            beta_l3, _, _, _ = np.linalg.lstsq(X_l3, residual, rcond=1e-10)
            y_hat_l3 = X_l3 @ beta_l3
            residual = residual - y_hat_l3
            r2_l1_l2_l3 = 1.0 - float(np.sum(residual ** 2)) / ss_tot
            # Unpack L3 coefficients
            for i, label in enumerate(step_labels):
                self._l3_betas[label] = float(beta_l3[i])

        self._fitted_regime = regime_name
        self._fitted_window = window
        self._l3_transitions_kyr = dict(step_dict)

        # Per-component amplitudes
        l1_amps = {n: float(np.sqrt(self._l1_a.get(n, 0)**2 + self._l1_b.get(n, 0)**2))
                   for n in L1_LATTICE_INTEGERS}
        l2_amps = {label: float(np.sqrt(self._l2_a.get(label, 0)**2 + self._l2_b.get(label, 0)**2))
                   for label in self.l2_labels}

        return FitSummary(
            regime=regime_name,
            window_kyr=tuple(window),
            n_samples=int(len(t)),
            n_l1_components=len(L1_LATTICE_INTEGERS) if include_l1 else 0,
            n_l2_components=len(L2_THERMOSTAT_FAMILY) if include_l2 else 0,
            n_l3_steps=len(step_labels),
            intercept=float(self._intercept),
            r2_l1_only=float(r2_l1_only),
            r2_l1_l2=float(r2_l1_l2),
            r2_l1_l2_l3=float(r2_l1_l2_l3),
            delta_r2_l2=float(r2_l1_l2 - r2_l1_only),
            delta_r2_l3=float(r2_l1_l2_l3 - r2_l1_l2),
            condition_number=float(condition_l1),
            l1_amplitudes=l1_amps,
            l2_amplitudes=l2_amps,
            l3_step_betas=dict(self._l3_betas),
        )

    # ─── evaluation ───────────────────────────────────────────────────

    def evaluate(self, t_kyr: np.ndarray, layer: str = "all") -> np.ndarray:
        """Evaluate the formula at t_kyr (in normalized units).
        layer: "all" | "l1" | "l2" | "l3" | "intercept"
        Returns: array of same shape as t_kyr.
        """
        t = np.asarray(t_kyr, dtype=float)
        out = np.zeros_like(t)
        if layer in ("intercept", "all"):
            out = out + self._intercept
        if layer in ("l1", "all"):
            for n in L1_LATTICE_INTEGERS:
                omega = 2 * np.pi * n / EIGHT_H
                a = self._l1_a.get(n, 0.0)
                b = self._l1_b.get(n, 0.0)
                out = out + a * np.cos(omega * t) + b * np.sin(omega * t)
        if layer in ("l2", "all"):
            for label, p in L2_THERMOSTAT_FAMILY.items():
                omega = 2 * np.pi / p
                a = self._l2_a.get(label, 0.0)
                b = self._l2_b.get(label, 0.0)
                out = out + a * np.cos(omega * t) + b * np.sin(omega * t)
        if layer in ("l3", "all"):
            for label, t_step in self._l3_transitions_kyr.items():
                beta = self._l3_betas.get(label, 0.0)
                out = out + beta * (t >= t_step).astype(float)
        return out

    def decompose(self, t_kyr: np.ndarray) -> dict:
        """Return per-layer contributions at t_kyr (normalized units)."""
        return {
            "intercept": np.full_like(np.asarray(t_kyr, dtype=float), self._intercept),
            "l1":        self.evaluate(t_kyr, "l1") - self._intercept,
            "l2":        self.evaluate(t_kyr, "l2"),
            "l3":        self.evaluate(t_kyr, "l3"),
            "total":     self.evaluate(t_kyr, "all"),
        }

    # ─── persistence ──────────────────────────────────────────────────

    def to_dict(self) -> dict:
        return {
            "config": {
                "H_kyr": H,
                "eight_H_kyr": EIGHT_H,
                "L1_integers": L1_LATTICE_INTEGERS,
                "L2_periods_kyr": L2_THERMOSTAT_FAMILY,
                "L3_transitions_ma": L3_TRANSITIONS_MA,
            },
            "fitted_regime": self._fitted_regime,
            "fitted_window_kyr": list(self._fitted_window) if self._fitted_window else None,
            "intercept": self._intercept,
            "L1_coefficients": {
                str(n): {"a_cos": self._l1_a.get(n, 0), "b_sin": self._l1_b.get(n, 0),
                          "amp": float(np.sqrt(self._l1_a.get(n, 0)**2 + self._l1_b.get(n, 0)**2)),
                          "label": L1_LABELS.get(n, "")}
                for n in L1_LATTICE_INTEGERS
            },
            "L2_coefficients": {
                label: {"a_cos": self._l2_a.get(label, 0), "b_sin": self._l2_b.get(label, 0),
                        "amp": float(np.sqrt(self._l2_a.get(label, 0)**2 + self._l2_b.get(label, 0)**2)),
                        "period_kyr": L2_THERMOSTAT_FAMILY[label]}
                for label in self.l2_labels
            },
            "L3_step_components": {
                label: {"beta": beta, "transition_kyr": self._l3_transitions_kyr.get(label)}
                for label, beta in self._l3_betas.items()
            },
            "normalization": {"y_mean": self._fit_y_mean, "y_std": self._fit_y_std},
        }

    # ─── internal helpers ─────────────────────────────────────────────

    def _build_l1_matrix(self, t):
        """L1 design matrix: intercept + 31 cos/sin pairs (lattice sinusoids)."""
        n_obs = len(t)
        cols = [np.ones(n_obs)]
        for n in L1_LATTICE_INTEGERS:
            omega = 2 * np.pi * n / EIGHT_H
            cols.append(np.cos(omega * t))
            cols.append(np.sin(omega * t))
        return np.column_stack(cols)

    def _build_l2_matrix(self, t):
        """L2 design matrix: 3 cos/sin pairs (carbon thermostat family). No intercept."""
        cols = []
        for p in self.l2_periods:
            omega = 2 * np.pi / p
            cols.append(np.cos(omega * t))
            cols.append(np.sin(omega * t))
        return np.column_stack(cols)

    def _build_l3_matrix(self, t, step_times):
        """L3 design matrix: k Heaviside step columns. No intercept."""
        cols = [(t >= ts).astype(float) for ts in step_times]
        return np.column_stack(cols)

    @staticmethod
    def _r2(y, y_hat):
        ss_res = float(np.sum((y - y_hat) ** 2))
        ss_tot = float(np.sum((y - y.mean()) ** 2))
        return 1.0 - ss_res / max(ss_tot, 1e-12)


# ─────────────────────────────────────────────────────────────────────────
# Data loaders
# ─────────────────────────────────────────────────────────────────────────

def load_lr04():
    ages, vals = [], []
    with open(LR04_PATH, "rt") as f:
        for line in f:
            parts = line.split()
            if len(parts) < 2:
                continue
            try:
                a, v = float(parts[0]), float(parts[1])
            except ValueError:
                continue
            ages.append(a)
            vals.append(v)
    return np.array(ages), np.array(vals)


def load_cenogrid():
    """CENOGRID Westerhold 2020. Returns (ages_kyr, d13c, d18o).
    Columns: col 0 = tuned time (Ma), col 7 = δ¹³C LOESS, col 8 = δ¹⁸O LOESS."""
    ages_ma, d13c, d18o = [], [], []
    with CENOGRID_PATH.open() as f:
        in_data = False
        for line in f:
            s = line.rstrip("\n")
            if not in_data:
                if s.startswith("Tuned time"):
                    in_data = True
                continue
            if not s.strip():
                continue
            parts = s.split("\t")
            if len(parts) < 9:
                continue
            try:
                t_ma = float(parts[0])
                v_c = float(parts[7])
                v_o = float(parts[8])
            except ValueError:
                continue
            ages_ma.append(t_ma)
            d13c.append(v_c)
            d18o.append(v_o)
    return np.array(ages_ma) * 1000.0, np.array(d13c), np.array(d18o)


def load_epica_co2():
    """EPICA Dome C composite atmospheric CO2 (Bereiter et al. 2015 GRL).
    Returns (ages_kyr, co2_ppm). Data file column 0 is age_gas_calBP in years,
    column 1 is co2_ppm. Negative ages (post-1950 / lab-air samples) are filtered."""
    ages_yr, co2 = [], []
    with EPICA_PATH.open() as f:
        for line in f:
            s = line.strip()
            if not s or s.startswith("#") or s.startswith("age_gas"):
                continue
            parts = s.split()
            if len(parts) < 2:
                continue
            try:
                a = float(parts[0]); v = float(parts[1])
            except ValueError:
                continue
            if a < 0:                   # drop post-1950 measurements
                continue
            ages_yr.append(a)
            co2.append(v)
    return np.array(ages_yr) / 1000.0, np.array(co2)   # → kyr BP


def load_cenco2pip():
    """CenCO2PIP Consortium (2023) Cenozoic CO2 reconstruction
    (Bayesian time-series at 100 kyr resolution from CenoCO2 v1.2).
    Returns (ages_kyr, co2_median_ppm). The CSV stores ln(CO2/ppm) quantiles;
    we use the 50% column and convert to ppm via exp()."""
    ages_ma, ln_co2_50 = [], []
    with CENCO2PIP_PATH.open() as f:
        header = None
        for line in f:
            s = line.strip()
            if not s or s.startswith("#"):
                continue
            if header is None:
                # First non-comment line is the column header
                header = [c.strip().strip('"') for c in s.split(",")]
                continue
            parts = s.split(",")
            try:
                a = float(parts[header.index("ages")])
                v = float(parts[header.index("50%")])
            except (ValueError, IndexError):
                continue
            ages_ma.append(a)
            ln_co2_50.append(v)
    ages = np.array(ages_ma) * 1000.0          # Ma → kyr
    co2 = np.exp(np.array(ln_co2_50))          # ln(ppm) → ppm
    return ages, co2


def preprocess(ages_kyr, vals, window, dt_kyr=1.0):
    lo, hi = window
    mask = (ages_kyr >= lo) & (ages_kyr <= hi)
    a = ages_kyr[mask]; v = vals[mask]
    order = np.argsort(a)
    a, v = a[order], v[order]
    keep = np.concatenate([[True], np.diff(a) > 0])
    a, v = a[keep], v[keep]
    grid = np.arange(lo, hi + dt_kyr / 2, dt_kyr)
    v_grid = np.interp(grid, a, v)
    v_det = detrend(v_grid, type="linear")
    return grid, v_det


# ─────────────────────────────────────────────────────────────────────────
# Main demonstration
# ─────────────────────────────────────────────────────────────────────────

def main():
    t0 = time.time()
    print("=" * 78)
    print("MILANKOVITCH 8H CLIMATE FORMULA v2 — modular L1/L2/L3")
    print("=" * 78)
    print(f"L1: {len(L1_LATTICE_INTEGERS)} integer divisors of 8H = {EIGHT_H:.1f} kyr")
    print(f"L2: {len(L2_THERMOSTAT_FAMILY)} carbon-thermostat lines ({list(L2_THERMOSTAT_FAMILY.keys())})")
    print(f"L3: {len(L3_TRANSITIONS_MA)} Cenozoic transitions ({list(L3_TRANSITIONS_MA.keys())})")

    ages, vals = load_lr04()
    print(f"\nLR04: {len(ages)} samples, {ages.max():.0f} kyr coverage")

    out = {"config": {"H_kyr": H, "eight_H_kyr": EIGHT_H,
                       "L1_integers": L1_LATTICE_INTEGERS,
                       "L2_periods_kyr": L2_THERMOSTAT_FAMILY,
                       "L3_transitions_ma": L3_TRANSITIONS_MA},
           "regime_fits": {}}

    # Fit each regime separately
    print(f"\n{'='*78}")
    print(f"REGIME-AWARE FITTING — per-layer R² decomposition")
    print(f"{'='*78}")
    print(f"  {'regime':14s}  {'window (kyr)':>18s}  {'L1 only':>8s}  {'L1+L2':>8s}  {'L1+L2+L3':>10s}  {'ΔR² L2':>8s}  {'ΔR² L3':>8s}  {'cond':>5s}")
    print(f"  {'-'*14}  {'-'*18}  {'-'*8}  {'-'*8}  {'-'*10}  {'-'*8}  {'-'*8}  {'-'*5}")

    regime_tests = ["post-mpt", "inhg-mpt", "pre-inhg", "lr04-full"]
    formulas = {}
    for regime in regime_tests:
        f = ClimateFormula()
        window = REGIME_WINDOWS[regime]
        t, y = preprocess(ages, vals, window=window)
        summary = f.fit(t, y, regime=regime)
        formulas[regime] = f
        window_str = f"{summary.window_kyr[0]:5.0f}-{summary.window_kyr[1]:5.0f}"
        print(f"  {regime:14s}  {window_str:>18s}  {summary.r2_l1_only:>8.4f}  "
              f"{summary.r2_l1_l2:>8.4f}  {summary.r2_l1_l2_l3:>10.4f}  "
              f"{summary.delta_r2_l2:>+8.4f}  {summary.delta_r2_l3:>+8.4f}  "
              f"{summary.condition_number:>5.1f}")
        out["regime_fits"][regime] = {
            "window_kyr": list(summary.window_kyr),
            "n_samples": summary.n_samples,
            "n_l1_components": summary.n_l1_components,
            "n_l2_components": summary.n_l2_components,
            "n_l3_steps": summary.n_l3_steps,
            "r2_l1_only": summary.r2_l1_only,
            "r2_l1_l2": summary.r2_l1_l2,
            "r2_l1_l2_l3": summary.r2_l1_l2_l3,
            "delta_r2_l2": summary.delta_r2_l2,
            "delta_r2_l3": summary.delta_r2_l3,
            "condition_number": summary.condition_number,
            "l3_step_betas": summary.l3_step_betas,
        }

    # ─── Layer-decomposition demo on post-MPT ───
    print(f"\n{'='*78}")
    print(f"LAYER DECOMPOSITION — post-MPT regime (0-1000 kyr)")
    print(f"{'='*78}")
    f_pm = formulas["post-mpt"]
    t_demo, y_demo = preprocess(ages, vals, window=REGIME_WINDOWS["post-mpt"])
    decomp = f_pm.decompose(t_demo)
    print(f"  Time-mean of each layer's contribution (normalized units):")
    print(f"    intercept           = {decomp['intercept'].mean():+.4f} (constant)")
    print(f"    L1 lattice mean     = {decomp['l1'].mean():+.4f}, std = {decomp['l1'].std():.4f}")
    print(f"    L2 thermostat mean  = {decomp['l2'].mean():+.4f}, std = {decomp['l2'].std():.4f}")
    print(f"    L3 step mean        = {decomp['l3'].mean():+.4f}, std = {decomp['l3'].std():.4f}")
    print(f"    Total fit mean      = {decomp['total'].mean():+.4f}")

    # Variance partition
    var_total = decomp['total'].var()
    var_l1 = decomp['l1'].var()
    var_l2 = decomp['l2'].var()
    var_l3 = decomp['l3'].var()
    print(f"\n  Variance partition (post-MPT):")
    print(f"    L1 variance         = {var_l1:.4f}  ({100*var_l1/max(var_total, 1e-12):>5.1f}% of total fit variance)")
    print(f"    L2 variance         = {var_l2:.4f}  ({100*var_l2/max(var_total, 1e-12):>5.1f}%)")
    print(f"    L3 variance         = {var_l3:.4f}  ({100*var_l3/max(var_total, 1e-12):>5.1f}%)")
    print(f"    Total fit variance  = {var_total:.4f}")

    # Forward projection — post-MPT formula, 250 kyr ahead
    print(f"\n{'='*78}")
    print(f"FORWARD PROJECTION — post-MPT formula, 0 → −250 kyr from now")
    print(f"{'='*78}")
    print(f"  Convention: t<0 = future. t=0 ≈ 1950 CE (LR04 zero point).")
    print(f"  Scope: post-MPT regime physics assumed to continue.")
    print(f"         No L3 step transition expected within this projection.")

    t_future = np.arange(-250, 0.001, 0.5)
    C_future = f_pm.evaluate(t_future, layer="all")

    glacial_idx, _ = find_peaks(C_future, prominence=0.3)
    intergl_idx, _ = find_peaks(-C_future, prominence=0.3)
    glacial_future = sorted([(float(t_future[i]), float(C_future[i])) for i in glacial_idx],
                             key=lambda x: -x[0])
    intergl_future = sorted([(float(t_future[i]), float(C_future[i])) for i in intergl_idx],
                             key=lambda x: -x[0])

    print(f"\n  --- Next glacial maxima (predicted) ---")
    print(f"  {'kyr from now':>14}  {'C(t) norm':>10s}")
    for t_v, C_v in glacial_future[:5]:
        print(f"  {-t_v:>13.1f}   {C_v:>+10.3f}")

    print(f"\n  --- Next interglacial peaks (predicted) ---")
    print(f"  {'kyr from now':>14}  {'C(t) norm':>10s}")
    for t_v, C_v in intergl_future[:5]:
        print(f"  {-t_v:>13.1f}   {C_v:>+10.3f}")

    # Per-layer forward decomposition at t = -100 kyr (just after the next predicted glacial)
    print(f"\n  --- Per-layer contribution at t = -100 kyr (100 kyr from now) ---")
    t_pt = np.array([-100.0])
    d = f_pm.decompose(t_pt)
    print(f"    intercept  : {d['intercept'][0]:+.4f}")
    print(f"    L1 lattice : {d['l1'][0]:+.4f}  (orbital forcing)")
    print(f"    L2 carbon  : {d['l2'][0]:+.4f}  (silicate-weathering thermostat)")
    print(f"    L3 step    : {d['l3'][0]:+.4f}  (no transition; expected ~0)")
    print(f"    Total      : {d['total'][0]:+.4f}")

    out["post_mpt_formula"] = f_pm.to_dict()
    out["forward_projection_250kyr"] = {
        "regime": "post-mpt",
        "scope_note": "Forward projection assumes post-MPT physics. R² ≈ 0.90 within regime; not predictive across regime boundaries.",
        "glacial_maxima_kyr_from_now": [(-t, c) for t, c in glacial_future[:5]],
        "interglacial_peaks_kyr_from_now": [(-t, c) for t, c in intergl_future[:5]],
    }

    # ─── CENOGRID evaluation — δ¹⁸O and δ¹³C separately ───
    print(f"\n{'='*78}")
    print(f"CENOGRID EVALUATION (0-67 Myr, both proxies, full L3 step set)")
    print(f"{'='*78}")
    ages_cgd_kyr, d13c_cgd, d18o_cgd = load_cenogrid()
    print(f"  CENOGRID: {len(ages_cgd_kyr)} samples, 0-{ages_cgd_kyr.max()/1000:.1f} Ma")

    out["cenogrid_evaluation"] = {}
    cgd_results = []
    print(f"\n  {'proxy':6s} {'regime':12s} {'window (Ma)':>12s}  {'R²L1':>8s} {'R²L1+L2':>9s} {'R²L1+L2+L3':>12s} {'ΔR²L2':>8s} {'ΔR²L3':>8s} {'n_steps':>8s}")
    print(f"  {'-'*6} {'-'*12} {'-'*12}  {'-'*8} {'-'*9} {'-'*12} {'-'*8} {'-'*8} {'-'*8}")
    for proxy_name, proxy_vals in [("δ¹⁸O", d18o_cgd), ("δ¹³C", d13c_cgd)]:
        for regime in ["neogene", "post-eot", "cenogrid"]:
            window = REGIME_WINDOWS[regime]
            t_cgd, y_cgd = preprocess(ages_cgd_kyr, proxy_vals, window=window, dt_kyr=5.0)
            f_cgd = ClimateFormula()
            summary = f_cgd.fit(t_cgd, y_cgd, regime=regime)
            window_ma = f"{window[0]/1000:.0f}-{window[1]/1000:.0f}"
            print(f"  {proxy_name:6s} {regime:12s} {window_ma:>12s}  "
                  f"{summary.r2_l1_only:>8.4f} {summary.r2_l1_l2:>9.4f} {summary.r2_l1_l2_l3:>12.4f} "
                  f"{summary.delta_r2_l2:>+8.4f} {summary.delta_r2_l3:>+8.4f} {summary.n_l3_steps:>8d}")
            cgd_results.append({
                "proxy": proxy_name,
                "regime": regime,
                "window_kyr": list(summary.window_kyr),
                "n_samples": summary.n_samples,
                "r2_l1_only": summary.r2_l1_only,
                "r2_l1_l2": summary.r2_l1_l2,
                "r2_l1_l2_l3": summary.r2_l1_l2_l3,
                "delta_r2_l2": summary.delta_r2_l2,
                "delta_r2_l3": summary.delta_r2_l3,
                "n_l3_steps": summary.n_l3_steps,
                "l3_step_betas": summary.l3_step_betas,
            })
    out["cenogrid_evaluation"] = cgd_results

    print(f"\n  CENOGRID full-record δ¹⁸O step amplitudes (Cenozoic climate history):")
    full_d18o = [r for r in cgd_results if r['proxy'] == 'δ¹⁸O' and r['regime'] == 'cenogrid'][0]
    for label, beta in full_d18o['l3_step_betas'].items():
        print(f"    {label:8s}  β = {beta:+.3f}")
    print(f"  CENOGRID full-record δ¹³C step amplitudes (carbon-cycle history):")
    full_d13c = [r for r in cgd_results if r['proxy'] == 'δ¹³C' and r['regime'] == 'cenogrid'][0]
    for label, beta in full_d13c['l3_step_betas'].items():
        print(f"    {label:8s}  β = {beta:+.3f}")

    # ─── EPICA CO2 cross-proxy fit ───
    print(f"\n{'='*78}")
    print(f"EPICA CO2 EVALUATION (Bereiter 2015 composite, 0-800 kyr)")
    print(f"{'='*78}")
    ages_epi_kyr, co2_epi = load_epica_co2()
    print(f"  EPICA: {len(ages_epi_kyr)} samples, 0-{ages_epi_kyr.max():.0f} kyr, "
          f"CO2 range {co2_epi.min():.1f}-{co2_epi.max():.1f} ppm")

    # Fit at 1-kyr binning (EPICA has ~400 samples in 800 kyr, mean ~2 kyr resolution)
    t_epi, y_epi = preprocess(ages_epi_kyr, co2_epi, window=REGIME_WINDOWS["epica-co2"], dt_kyr=1.0)
    f_epi = ClimateFormula()
    sum_epi = f_epi.fit(t_epi, y_epi, regime="epica-co2")
    print(f"  R² L1_only={sum_epi.r2_l1_only:.4f}, +L2={sum_epi.delta_r2_l2:+.4f}, "
          f"+L3={sum_epi.delta_r2_l3:+.4f}, total={sum_epi.r2_l1_l2_l3:.4f}")
    print(f"  No L3 transitions inside the 0-800 kyr window (MPT is at boundary).")

    # Per-line carbon-amplification ratio: (EPICA L1 amp) / (LR04 post-MPT L1 amp)
    # — diagnoses which L1 lines manifest primarily through carbon-cycle dynamics
    f_lr_pm = formulas["post-mpt"]
    print(f"\n  Carbon-amplification ratio per L1 line (EPICA amp / LR04 post-MPT amp, normalized):")
    print(f"  Higher = the line manifests more in atmospheric CO2 than in ice volume.")
    print(f"  {'n':>3s} {'period (kyr)':>12s} {'LR04 amp':>10s} {'EPICA amp':>10s} {'ratio':>8s}  label")
    amp_ratios = {}
    for n in L1_LATTICE_INTEGERS:
        lr_amp = float(np.sqrt(f_lr_pm._l1_a.get(n, 0)**2 + f_lr_pm._l1_b.get(n, 0)**2))
        ep_amp = float(np.sqrt(f_epi._l1_a.get(n, 0)**2 + f_epi._l1_b.get(n, 0)**2))
        ratio  = ep_amp / max(lr_amp, 1e-12)
        amp_ratios[n] = {"lr04": lr_amp, "epica": ep_amp, "ratio": ratio}
    # Sort by ratio descending — top L2-driven lines bubble up
    for n, info in sorted(amp_ratios.items(), key=lambda kv: -kv[1]["ratio"])[:10]:
        period = EIGHT_H / n
        print(f"  {n:>3d} {period:>12.1f} {info['lr04']:>10.4f} {info['epica']:>10.4f} "
              f"{info['ratio']:>8.3f}  {L1_LABELS.get(n, '')}")

    out["epica_evaluation"] = {
        "regime": "epica-co2",
        "window_kyr": list(sum_epi.window_kyr),
        "n_samples": sum_epi.n_samples,
        "r2_l1_only": sum_epi.r2_l1_only,
        "r2_l1_l2": sum_epi.r2_l1_l2,
        "r2_l1_l2_l3": sum_epi.r2_l1_l2_l3,
        "delta_r2_l2": sum_epi.delta_r2_l2,
        "delta_r2_l3": sum_epi.delta_r2_l3,
        "co2_range_ppm": [float(co2_epi.min()), float(co2_epi.max())],
        "carbon_amplification_ratios": {
            str(n): {
                "lr04_post_mpt_amp": amp_ratios[n]["lr04"],
                "epica_amp": amp_ratios[n]["epica"],
                "ratio": amp_ratios[n]["ratio"],
                "period_kyr": EIGHT_H / n,
                "label": L1_LABELS.get(n, ""),
            }
            for n in L1_LATTICE_INTEGERS
        },
    }

    # ─── CenCO2PIP deep-time CO2 fit ───
    print(f"\n{'='*78}")
    print(f"CenCO2PIP DEEP-TIME CO2 (CenCO2PIP Consortium 2023, 0-66 Myr)")
    print(f"{'='*78}")
    ages_pip_kyr, co2_pip = load_cenco2pip()
    print(f"  CenCO2PIP: {len(ages_pip_kyr)} samples, 0-{ages_pip_kyr.max()/1000:.1f} Ma, "
          f"CO2 range {co2_pip.min():.1f}-{co2_pip.max():.1f} ppm")

    t_pip, y_pip = preprocess(ages_pip_kyr, co2_pip, window=REGIME_WINDOWS["cenco2pip"], dt_kyr=100.0)
    f_pip = ClimateFormula()
    sum_pip = f_pip.fit(t_pip, y_pip, regime="cenco2pip")
    print(f"  R² L1_only={sum_pip.r2_l1_only:.4f}, +L2={sum_pip.delta_r2_l2:+.4f}, "
          f"+L3={sum_pip.delta_r2_l3:+.4f}, total={sum_pip.r2_l1_l2_l3:.4f}")
    print(f"  L3 step amplitudes (CO2 jumps at Cenozoic transitions, normalized):")
    for label, beta in sum_pip.l3_step_betas.items():
        print(f"    {label:8s}  β = {beta:+.3f}")

    out["cenco2pip_evaluation"] = {
        "regime": "cenco2pip",
        "window_kyr": list(sum_pip.window_kyr),
        "n_samples": sum_pip.n_samples,
        "r2_l1_only": sum_pip.r2_l1_only,
        "r2_l1_l2": sum_pip.r2_l1_l2,
        "r2_l1_l2_l3": sum_pip.r2_l1_l2_l3,
        "delta_r2_l2": sum_pip.delta_r2_l2,
        "delta_r2_l3": sum_pip.delta_r2_l3,
        "co2_range_ppm": [float(co2_pip.min()), float(co2_pip.max())],
        "l3_step_betas": sum_pip.l3_step_betas,
    }

    out["meta"] = {
        "script": str(SCRIPT_DIR / "milankovitch_climate_formula.py"),
        "doc": "docs/92-climate-formula.md",
        "runtime_sec": time.time() - t0,
    }

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with OUT_PATH.open("w") as f:
        json.dump(out, f, indent=2)
    print(f"\n  Total runtime: {time.time() - t0:.1f}s")
    print(f"  Output: {OUT_PATH}")


if __name__ == "__main__":
    main()
