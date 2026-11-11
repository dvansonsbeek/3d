'use strict';
/**
 * THE CROSSING OF A SAMPLED REFERENCE LONGITUDE — one home (doc 111 §1.41 a).
 *
 * The Horizons swap gate (tools/verify/sun-vs-horizons.js) and the plan-32
 * sweep (tools/explore/residual-spectra/series-sun.mjs, probes.mjs) read each
 * equinox and solstice instant off JPL Horizons' apparent longitude, sampled
 * every 10 days: the crossing of the target longitude inside a grid cell, by a
 * Lagrange interpolant through the bracketing rows, Newton-refined.
 *
 * The reference carries the 6.44″ Earth-around-EMB wobble at the synodic
 * month, and a cubic across thirty days follows it to a few arcseconds in
 * step with the Moon's phase; under yearly sampling that put a 0.5-min line at
 * 2.715 yr and a 6.40-yr doublet in every cardinal series — the gate's, not
 * the Sun's. The crossing here is found on the longitude with that wobble
 * taken out, the target shifted by the wobble at the solved instant (three
 * passes), so the interpolant sees the smooth part only: the line 0.53 →
 * 0.07 min, the doublet 0.21 → 0.007 (measured in the sweep's probes).
 *
 * The wobble model is an INTERPOLATION AID, not physics of the model: its
 * amplitude (a_M·μ/AU) and the mean elongation (Meeus 47.2 through T², TT
 * centuries) are the reference's own content, and any error in it leaves a
 * residual oscillation the interpolant handles exactly as before. The model's
 * own barycentre term lives in eclipse/sun-planetary-completion.cjs.
 */

const J2000_JD = 2451545.0;
const EMB_WOBBLE_ARCSEC = 6.44;

/** @param {number} d degrees @returns {number} d wrapped to (−180, 180] */
function wrap180(d) { return ((((d + 540) % 360) + 360) % 360) - 180; }

/** The Moon's mean elongation D (radians) at a TT Julian Day — the reference's wobble argument. */
function meanElongationRadians(jdTT) {
  const T = (jdTT - J2000_JD) / 36525;
  return (297.8501921 + 445267.1114034 * T - 0.0018819 * T * T) * Math.PI / 180;
}

/** The Earth-around-EMB wobble of the geocentric Sun's apparent longitude (degrees) at a TT Julian Day. */
function embWobbleDeg(jdTT) { return EMB_WOBBLE_ARCSEC / 3600 * Math.sin(meanElongationRadians(jdTT)); }

/**
 * The crossing of `target` (degrees) inside grid cell [i, i+1] by a Lagrange interpolant through the
 * n rows centred on the cell (n/2 − 1 before, n/2 after), Newton-refined from the linear estimate.
 * @param {number[][]} rows  [jdTT, lonDeg, ...] on a regular grid
 * @param {number} i  the cell's first row
 * @param {number} target  degrees
 * @param {number} n  rows in the interpolant (4: the cubic; 6: the quintic)
 * @param {(k: number) => number} valueOf  the longitude read of row k
 * @returns {number} the crossing's Julian Day on the rows' clock
 */
function crossingJD(rows, i, target, n, valueOf) {
  const lo = i - (n / 2 - 1), P = [];
  for (let k = 0; k < n; k++) P.push([rows[lo + k][0], valueOf(lo + k)]);
  const t0 = P[0][0], x = P.map((p) => p[0] - t0), base = P[n / 2 - 1][1];
  // unwrap around the cell's first row so the interpolant sees a monotone longitude
  const yv = P.map((p) => base + wrap180(p[1] - base)), tgt = base + wrap180(target - base);
  const L = (t) => { let s = 0; for (let j = 0; j < n; j++) { let l = yv[j]; for (let k = 0; k < n; k++) if (k !== j) l *= (t - x[k]) / (x[j] - x[k]); s += l; } return s; };
  const dL = (t, h = 1e-3) => (L(t + h) - L(t - h)) / (2 * h);
  const a = n / 2 - 1;
  let t = x[a] + (tgt - yv[a]) / (yv[a + 1] - yv[a]) * (x[a + 1] - x[a]);
  for (let k = 0; k < 12; k++) { const g = L(t) - tgt; t -= g / dL(t); if (Math.abs(g) < 1e-10) break; }
  return t0 + t;
}

/**
 * The gate's crossing: the interpolant on the longitude with the EMB wobble removed, the target
 * shifted by the wobble at the solved instant, three passes.
 * @param {number[][]} rows  [jdTT, lonDeg, ...]
 * @param {number} i  the cell's first row
 * @param {number} target  degrees
 * @param {number} [n=4]
 * @returns {number} the crossing's Julian Day (TT, the rows' clock)
 */
function horizonsCrossingJD(rows, i, target, n = 4) {
  const lonNoWobble = (k) => rows[k][1] - embWobbleDeg(rows[k][0]);
  let jd = crossingJD(rows, i, target, n, lonNoWobble);
  for (let k = 0; k < 3; k++) jd = crossingJD(rows, i, target - embWobbleDeg(jd), n, lonNoWobble);
  return jd;
}

module.exports = { EMB_WOBBLE_ARCSEC, wrap180, meanElongationRadians, embWobbleDeg, crossingJD, horizonsCrossingJD };
