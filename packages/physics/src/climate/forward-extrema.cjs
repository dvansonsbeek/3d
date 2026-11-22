/**
 * The Climate Formula's forward markers — ONE home (doc 111 §1.52).
 *
 * The simulator's "Forward projection" figure (15_LR04_Forward.png: the Earth
 * Climate Analysis panel's future tab, exported by tools/docs/export-figures.mjs)
 * extrapolates the canonical formula's post-MPT regime 250 kyr past 2000 AD and
 * marks the glacial maxima and interglacial peaks it draws. Two surfaces (the
 * website's predictions page, the paper's §9.1 item 3) quoted those dates from a
 * SECOND list computed by hand on another selection rule, and the two drifted
 * apart unseen: the first glacial 58.5 kyr in the prose against 62 on the
 * figure, two quoted superlatives with no marker within 16 kyr of them. The
 * figure's list is the one list: the evaluator, the finder and the rule live
 * here; the two chart renderers in src/script.js draw this list; the
 * model-values registry publishes it as keys; the prose cites the keys.
 *
 * The rule, verbatim from the renderer that shipped the figure: the regime
 * fitted on the post-MPT window, the figure's window (−250 … +250 kyr BP in
 * 1,000 samples: a 0.5-kyr grid), its forward half (t < 0, i.e. after
 * 2000 AD), a local extremum over ±32 samples (16 kyr) whose prominence
 * against the mean of its two neighbourhood ends is ≥ 0.3 ‰, then the
 * absolute thresholds — glacial ≥ 4.5 ‰ (mid- to full-glacial; LR04's
 * glacials read 4.8–5.3), interglacial ≤ 3.7 ‰ (the Holocene ≈ 3.2). An
 * extremum needs its whole neighbourhood inside the forward half, so the last
 * 16 kyr of the window carry no marker (the edge margin): the curve's own
 * warmest point of the window, ~237 kyr out, is unmarked by this rule — a
 * property of the list, published beside it (`curveMinimum`), never a reason
 * to hand-write a date.
 *
 * Pure in its inputs. The coefficients are the shipped
 * public/input/climate-formula-coefficients.json; the embed
 * FITTED_COEFFICIENTS.CLIMATE_FORMULA_COEFFS is that file (gate test:constants).
 */

'use strict';

/** @typedef {{ period_kyr: number, a: number, b: number }} ClimateL1Line */
/** @typedef {{ p_kyr: number, a: number, b: number }} ClimateL2Line */
/** @typedef {{ t_kyr: number, beta: number }} ClimateL3Step */
/**
 * @typedef {Object} ClimateFormulaRegime
 * @property {number} intercept
 * @property {ClimateL1Line[]} L1 - the orbital lines (kyr periods, fitted cos/sin coefficients)
 * @property {ClimateL2Line[]} L2 - the 405-kyr family (empty in the shipped file)
 * @property {ClimateL3Step[]} L3 - the regime steps (β added at every t ≥ t_kyr)
 * @property {{ y_std: number, y_mean: number, trend_slope: number, trend_intercept: number }} denormalization
 */
/** @typedef {{ regimes: Record<string, ClimateFormulaRegime> }} ClimateFormulaCoefficients */
/** @typedef {{ kyrFromNow: number, permil: number }} ClimateForwardMarker - a marker: kyr after 2000 AD, δ¹⁸O ‰ */
/**
 * @typedef {Object} ClimateForwardMarkerRule
 * @property {string} regimeKey - the regime whose lines are carried forward
 * @property {readonly [number, number]} windowKyrBP - the figure's window, kyr BP (negative = after 2000 AD)
 * @property {number} samples - samples across the window (the grid is their quotient)
 * @property {number} halfWidthSamples - the neighbourhood an extremum must dominate, each side, in samples
 * @property {number} prominencePermil - the least excursion against the neighbourhood ends' mean
 * @property {number} glacialMinPermil - a glacial marker's least δ¹⁸O
 * @property {number} interglacialMaxPermil - an interglacial marker's greatest δ¹⁸O
 */

/** @type {ClimateForwardMarkerRule} */
const CLIMATE_FORWARD_MARKER_RULE = Object.freeze({
  regimeKey: 'lr04-post-mpt',
  windowKyrBP: Object.freeze(/** @type {[number, number]} */ ([-250, 250])),
  samples: 1000,
  halfWidthSamples: 32,
  prominencePermil: 0.3,
  glacialMinPermil: 4.5,
  interglacialMaxPermil: 3.7,
});

/**
 * The canonical formula in the proxy's own units at age t (kyr BP), one regime.
 * Every layer line carries the L3 steps (they define the regime's baseline):
 *   layer 'l1'  → intercept + L1 + L3
 *   layer 'all' → intercept + L1 + L2 + L3 (the total; L2 is empty in the shipped file)
 * @param {ClimateFormulaCoefficients} coeffs
 * @param {number} tKyrBP
 * @param {string} regimeKey
 * @param {'l1' | 'all' | string} layer
 * @returns {number} the proxy value (δ¹⁸O ‰ for the LR04 regimes), NaN for an unknown regime
 */
function evalClimateFormulaProxyUnits(coeffs, tKyrBP, regimeKey, layer) {
  const r = coeffs.regimes[regimeKey];
  if (!r) return NaN;
  let C = r.intercept;
  if (layer === 'l1' || layer === 'all') {
    for (const c of r.L1) {
      const omega = 2 * Math.PI / c.period_kyr;
      C += c.a * Math.cos(omega * tKyrBP) + c.b * Math.sin(omega * tKyrBP);
    }
  }
  if (layer === 'all') {
    for (const c of r.L2) {
      const omega = 2 * Math.PI / c.p_kyr;
      C += c.a * Math.cos(omega * tKyrBP) + c.b * Math.sin(omega * tKyrBP);
    }
  }
  for (const s of r.L3) {
    if (tKyrBP >= s.t_kyr) C += s.beta;
  }
  const d = r.denormalization;
  return C * d.y_std + d.y_mean + d.trend_slope * tKyrBP + d.trend_intercept;
}

/**
 * Local maxima ('max') or minima ('min') of a sampled curve: a sample that
 * strictly dominates every sample within halfWidth on BOTH sides, with an
 * excursion of at least `prominence` against the mean of the two neighbourhood
 * ends. The first and last halfWidth samples cannot qualify (the edge margin).
 * @param {number[]} t
 * @param {number[]} vals
 * @param {'max' | 'min'} type
 * @param {number} prominence - in the curve's units
 * @param {number} halfWidth - in samples
 * @returns {Array<{ t: number, v: number }>}
 */
function findExtrema(t, vals, type, prominence, halfWidth) {
  const out = [];
  for (let i = halfWidth; i < vals.length - halfWidth; i++) {
    const v = vals[i];
    let isExtremum = true;
    for (let j = 1; j <= halfWidth; j++) {
      if (type === 'max' && (vals[i - j] >= v || vals[i + j] >= v)) { isExtremum = false; break; }
      if (type === 'min' && (vals[i - j] <= v || vals[i + j] <= v)) { isExtremum = false; break; }
    }
    if (!isExtremum) continue;
    const localOpposite = (vals[i - halfWidth] + vals[i + halfWidth]) / 2;
    if (Math.abs(v - localOpposite) < prominence) continue;
    out.push({ t: t[i], v });
  }
  return out;
}

/**
 * The forward figure's markers under the rule: the glacial maxima and the
 * interglacial peaks of the formula carried past 2000 AD, each sorted by time
 * from now, with the grid, the edge margin and the curve's own extremes over
 * the forward half (the window minimum lies inside the margin and is unmarked).
 * @param {ClimateFormulaCoefficients} coeffs
 * @param {ClimateForwardMarkerRule} [rule]
 * @returns {{ rule: ClimateForwardMarkerRule, gridKyr: number, edgeMarginKyr: number, glacials: ClimateForwardMarker[], interglacials: ClimateForwardMarker[], curveMaximum: ClimateForwardMarker, curveMinimum: ClimateForwardMarker }}
 */
function computeClimateForwardExtrema(coeffs, rule = CLIMATE_FORWARD_MARKER_RULE) {
  const [tLo, tHi] = rule.windowKyrBP;
  const dtGrid = (tHi - tLo) / rule.samples;
  const fT = [], fV = [];
  // the renderers' own grid loop (the accumulated sum, not i·dt), its forward half
  for (let t = tLo; t <= tHi + 1e-9; t += dtGrid) {
    if (t < 0) { fT.push(t); fV.push(evalClimateFormulaProxyUnits(coeffs, t, rule.regimeKey, 'all')); }
  }
  /**
   * @param {{ t: number, v: number }} p - a grid point (kyr BP, ‰)
   * @returns {ClimateForwardMarker}
   */
  const marker = (p) => ({ kyrFromNow: -p.t, permil: p.v });
  /**
   * @param {ClimateForwardMarker} a
   * @param {ClimateForwardMarker} b
   * @returns {number}
   */
  const byTime = (a, b) => a.kyrFromNow - b.kyrFromNow;
  const glacials = findExtrema(fT, fV, 'max', rule.prominencePermil, rule.halfWidthSamples)
    .filter((p) => p.v >= rule.glacialMinPermil).map(marker).sort(byTime);
  const interglacials = findExtrema(fT, fV, 'min', rule.prominencePermil, rule.halfWidthSamples)
    .filter((p) => p.v <= rule.interglacialMaxPermil).map(marker).sort(byTime);
  let iMax = 0, iMin = 0;
  for (let i = 1; i < fV.length; i++) {
    if (fV[i] > fV[iMax]) iMax = i;
    if (fV[i] < fV[iMin]) iMin = i;
  }
  return {
    rule,
    gridKyr: dtGrid,
    edgeMarginKyr: rule.halfWidthSamples * dtGrid,
    glacials,
    interglacials,
    curveMaximum: marker({ t: fT[iMax], v: fV[iMax] }),
    curveMinimum: marker({ t: fT[iMin], v: fV[iMin] }),
  };
}

module.exports = { CLIMATE_FORWARD_MARKER_RULE, evalClimateFormulaProxyUnits, findExtrema, computeClimateForwardExtrema };
