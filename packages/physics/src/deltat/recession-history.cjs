/**
 * Regime-aware lunar recession history + the solar angular-momentum
 * channels (Driver 1½) — THE shared implementation.
 *
 * Background (docs/99 §"The ungated mid-Precambrian window", docs/106 §D,
 * and the research record in tools/explore/{farhat-divergence-probe,
 * regime-aware-recession-study,fit-regime-recession}.js): Farhat 2022's
 * central result is that lunar recession followed a resonant STAIRCASE —
 * a single smooth quartic anchored at the modern LLR rate, the gated
 * 0–650 Ma era and the Roche crossing cannot follow it through the
 * 1–3.5 Ga window (−8.9σ Joffre, −11.4σ Moodies). This module carries
 * the regime-aware history:
 *
 *   t ≤ jointMa       — the calibrated quartic, BIT-IDENTICAL (the
 *                       Wells/Wu-gated era; its α set is the calibrated
 *                       effective closed-budget pair and is not touched).
 *   jointMa..genesisMa — monotone cubic Hermite (Fritsch–Carlson) through
 *                       the fitted knots, value- AND slope-continuous at
 *                       the joint (analytic polynomial derivative), ending
 *                       at the rigid Roche limit at genesisMa.
 *   t ≥ genesisMa     — clamped at the Roche value (the Moon does not
 *                       exist beyond its genesis; boundary value, not an
 *                       extrapolation).
 *
 * The solar channels (explicit ONLY beyond jointMa — inside the gated era
 * they are absorbed by the α calibration, and applying them there without
 * recalibration measurably breaks Wells; see the study's variant 3):
 *   leak  τ_s = β₀ (a/a₀)⁶ · τ_moon   — ocean solar tide (M²/AU⁶ ratio
 *          scaling of the semidiurnal torque)
 *   pump  τ_t = f_p · (τ_moon + τ_s) inside [pumpStartMa, pumpEndMa] —
 *          the insolation-driven atmospheric thermal tide
 *          (Zahnle–Walker 1987; Bartlett–Stevenson 2016;
 *          Mitchell–Kirscher 2023). The FITTED f_p ≈ 0.45 over a ~300 Myr
 *          window (degenerate with 0.15 × 900 Myr — the data constrain
 *          the INTEGRATED pump, ~2σ preferred over zero, Zhou 2024's
 *          contrary reading honestly noted in the fit record).
 *
 * Fit provenance: tools/explore/fit-regime-recession.js — 11 anchors
 * (Lantink/Joffre 2022 · Weeli Wolli · Zhou 2024 ×3 paired a+LOD ·
 * Meyers–Malinverno 2018 · Nanfen 2023 · Moodies), all ≤1.3σ; genesis
 * pinned at the shipped 4498 Ma Roche crossing (the genesis profile is
 * flat — the data do not constrain it). The knot values ARE the shipped
 * definition (metre-rounded at fit time, not truncated from a more
 * precise source).
 */

'use strict';

/**
 * @typedef {Object} RecessionRegime
 * @property {number} jointMa - regime boundary; quartic below, spline above
 * @property {number[]} knotAgesMa - interior knot ages (ascending)
 * @property {number[]} knotDistancesKm - fitted knot distances
 * @property {number} genesisMa - the Roche-crossing epoch
 * @property {number} rocheLimitKm - the rigid Roche endpoint
 */

/**
 * @param {{
 *   aMoonNowMetres: number,
 *   alpha1PerMa: number, alpha3PerMa3: number, alpha4PerMa4: number,
 *   regime: RecessionRegime,
 * }} deps
 * @returns {{ distanceMetresAtAge: (tMa: number) => number }}
 */
function createMoonRecessionHistory(deps) {
  const { aMoonNowMetres: aNow, alpha1PerMa: a1, alpha3PerMa3: a3, alpha4PerMa4: a4 } = deps;
  const R = deps.regime;

  /** The calibrated quartic (identical expression to every consumer).
   * @param {number} tMa @returns {number} */
  const polyM = (tMa) => aNow * (1 + a1 * tMa + a3 * tMa * tMa * tMa + a4 * tMa * tMa * tMa * tMa);
  /** Analytic slope of the quartic, m/Ma.
   * @param {number} tMa @returns {number} */
  const polySlopeM = (tMa) => aNow * (a1 + 3 * a3 * tMa * tMa + 4 * a4 * tMa * tMa * tMa);

  // Knot chain: joint (value+slope from the quartic) → fitted knots → Roche.
  const ts = [R.jointMa, ...R.knotAgesMa, R.genesisMa];
  const vs = [polyM(R.jointMa), ...R.knotDistancesKm.map((km) => km * 1000), R.rocheLimitKm * 1000];
  const n = ts.length;
  const d = [];
  for (let i = 0; i < n - 1; i++) d.push((vs[i + 1] - vs[i]) / (ts[i + 1] - ts[i]));
  const m = new Array(n);
  m[0] = polySlopeM(R.jointMa);
  for (let i = 1; i < n - 1; i++) m[i] = (d[i - 1] * d[i] <= 0) ? 0 : (d[i - 1] + d[i]) / 2;
  m[n - 1] = d[n - 2];
  // Fritsch–Carlson monotonicity limiter — the history must be monotone
  // into the past (the Moon only recedes on the mean).
  for (let i = 0; i < n - 1; i++) {
    if (d[i] === 0) { m[i] = 0; m[i + 1] = 0; continue; }
    const a = m[i] / d[i], b = m[i + 1] / d[i];
    const s = a * a + b * b;
    if (s > 9) { const tau = 3 / Math.sqrt(s); m[i] = tau * a * d[i]; m[i + 1] = tau * b * d[i]; }
  }

  /** @param {number} tMa @returns {number} metres */
  function distanceMetresAtAge(tMa) {
    if (tMa <= R.jointMa) return polyM(tMa);
    if (tMa >= R.genesisMa) return R.rocheLimitKm * 1000;
    let i = 0;
    while (i < n - 2 && tMa > ts[i + 1]) i++;
    const h = ts[i + 1] - ts[i], s = (tMa - ts[i]) / h, s2 = s * s, s3 = s2 * s;
    return (2 * s3 - 3 * s2 + 1) * vs[i] + (s3 - 2 * s2 + s) * h * m[i]
      + (-2 * s3 + 3 * s2) * vs[i + 1] + (s3 - s2) * h * m[i + 1];
  }

  return { distanceMetresAtAge };
}

/**
 * The solar angular-momentum channels: L_EM(t) integrated backward from
 * J2000 with the ocean leak and the thermal-tide pump, explicit only
 * beyond jointMa. Absent this module, every consumer's L_EM is the J2000
 * constant — which remains the exact behaviour for t ≤ jointMa.
 *
 * @param {{
 *   lTotalJ2000KgM2S: number,
 *   mMoonAloneKg: number, gmEmM3PerS2: number, eFactorMoon: number,
 *   beta0: number,
 *   pumpStartMa: number, pumpEndMa: number, pumpFactor: number,
 *   jointMa: number, genesisMa: number,
 *   distanceMetresAtAge: (tMa: number) => number,
 *   stepMa?: number,
 * }} deps
 * @returns {{ lEmAtAgeKgm2S: (tMa: number) => number }}
 */
function createSolarChannelBudget(deps) {
  const STEP = deps.stepMa ?? 5;
  /** @param {number} aM @returns {number} */
  const lOrb = (aM) => deps.mMoonAloneKg * Math.sqrt(deps.gmEmM3PerS2 * aM) * deps.eFactorMoon;
  const a0 = deps.distanceMetresAtAge(0);

  /** @type {Float64Array|null} */
  let table = null;
  const build = () => {
    const nSteps = Math.ceil(deps.genesisMa / STEP) + 1;
    const t = new Float64Array(nSteps);
    let L = deps.lTotalJ2000KgM2S;
    for (let i = 0; i < nSteps; i++) {
      t[i] = L;
      const tMa = i * STEP;
      const dLorb = lOrb(deps.distanceMetresAtAge(tMa)) - lOrb(deps.distanceMetresAtAge(tMa + STEP));
      const mid = tMa + STEP / 2;
      const leakDt = mid > deps.jointMa ? deps.beta0 * Math.pow(deps.distanceMetresAtAge(tMa) / a0, 6) * dLorb : 0;
      const pumpDt = (mid > deps.pumpStartMa && mid < deps.pumpEndMa) ? deps.pumpFactor * (dLorb + leakDt) : 0;
      L = L - (pumpDt - leakDt);
    }
    return t;
  };

  /** @param {number} tMa @returns {number} */
  function lEmAtAgeKgm2S(tMa) {
    // The channels are zero below jointMa by construction — return the
    // constant EXACTLY there (no table interpolation), so the gated era
    // stays bit-identical to the closed-budget engine (the 1-ULP fixture
    // gates depend on this).
    if (tMa <= deps.jointMa) return deps.lTotalJ2000KgM2S;
    if (table === null) table = build();
    const x = tMa / STEP;
    const i = Math.min(Math.floor(x), table.length - 2);
    const f = Math.min(x - i, 1);
    return table[i] * (1 - f) + table[i + 1] * f;
  }

  return { lEmAtAgeKgm2S };
}

module.exports = { createMoonRecessionHistory, createSolarChannelBudget };
