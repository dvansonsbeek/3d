/**
 * Sun planetary completion — the 20.3h location-tier term table.
 *
 * The finder Sun (framework linear rate + Kepler EoC + the fitted
 * SUN_HARMONICS) omits the classical planetary perturbations of the
 * geocentric Sun (the Newcomb Venus/Jupiter/Mars terms and the
 * Earth-around-EMB wobble). Measured against JPL Horizons (ObsEcLon,
 * geocentric, leading-nutation-bridged to mean-of-date) on 960
 * deterministic all-phase epochs 1970–2049: the omission is 10.0″ RMS
 * of Sun-longitude scatter; this table removes the coherent part,
 * 10.0″ → 2.9″ RMS, with every term era-stable (amplitude and phase
 * agree between the 1970–2009 and 2010–2049 half-samples).
 *
 * THE CONSTANT-ATTRIBUTION RULE (the 20.3h-lite trap, resolved here):
 * the table carries NO constant term — the all-phase fit attributes the
 * constant to the tier's existing anchors, so the terms ship without
 * the +6″ syzygy-mean penalty that an eclipse-sample fit produced (at
 * new moon the EMB argument D locks near 0 and its cos-component
 * becomes a constant; fitting on eclipses alone poisons the mean).
 * Verified on the 179-eclipse-syzygy sample: elongation mean stays
 * +1.1″ → +1.5″ while RMS drops 10.6″ → 5.5″; and on the 15 NASA
 * path-table centerline points: shadow-plane mean 6.0″ → 3.6″, max
 * 10.1″ → 5.0″, every event improved.
 *
 * Arguments are of-date mean longitudes (IAU-class instrument
 * polynomials, degrees/Julian-century TT). They are phase carriers for
 * the fitted amplitudes — the framework-native derivation of these
 * term tables is the 20.3e research item. Terms with ambiguous
 * identifications (the ~8-yr band, the 414-day Venus/three-planet
 * blend, E−M, E−S) are deliberately NOT shipped: each failed the
 * half-sample stability test or has no unique two-planet argument at
 * the window's frequency resolution (~1.5″ RSS accepted as floor).
 *
 * Sign convention: the table models (framework − truth), so consumers
 * SUBTRACT the evaluation from the finder Sun longitude.
 *
 * MATCHED PAIR: these amplitudes are fitted against the CURRENT finder
 * Sun (framework rate + EoC + SUN_HARMONICS). The ARGUMENTS are physics
 * and stand; the AMPLITUDES are the residual of that specific chain vs
 * JPL and must be RE-MEASURED whenever the chain moves — a SUN_HARMONICS
 * refit (pipeline Step 0; its fitter header carries the reciprocal
 * note), an eccentricity/perihelion definition change, or the 20.3e
 * derived-tables decision. Re-derivation:
 *   node tools/fit/sun-planetary-completion-fit.js
 * ENFORCED, not just documented: PAIRED_SUN_HARMONICS_SHA256 below is
 * the fingerprint of the SUN_LONGITUDE_HARMONICS this table was fitted
 * under; the create-model parity gate (test:model, in `npm run check`)
 * recomputes it from the live constants and fails on mismatch — so a
 * Step-0 refit cannot land without a conscious re-derivation of this
 * table. The api centerline gate (≤8″ shadow-plane) backstops gross
 * staleness independently.
 */

'use strict';

/** Of-date mean-longitude polynomials, degrees per Julian century TT. */
const ARG_RATES = {
  lV: [181.979801, 58517.815676],   // Venus
  lE: [100.466457, 36000.769780],   // Earth (EMB)
  lM: [355.433000, 19141.696300],   // Mars
  lJ: [34.351519, 3036.302389],     // Jupiter
  D: [297.8501921, 445267.1114034], // Moon mean elongation (EMB wobble carrier)
};

/**
 * The fitted table: [k·lV, k·lE, k·lM, k·lJ, k·D, cosAmp″, sinAmp″].
 * Fit: 960-epoch all-phase LSQ vs JPL Horizons DE441-class ObsEcLon,
 * free constant excluded from shipment; SE 0.13″ per coefficient.
 */
const TERMS = [
  [1, -1, 0, 0, 0, 0, -5.08],   // V−E      (Venus synodic)
  [2, -2, 0, 0, 0, 0, 5.55],    // 2(V−E)
  [3, -3, 0, 0, 0, 0, 0.68],    // 3(V−E)
  [2, -3, 0, 0, 0, -2.64, 0],   // 2V−3E    (the classic Newcomb Venus term)
  [0, 1, 0, -1, 0, 0, 7.19],    // E−J      (Jupiter synodic)
  [0, 2, 0, -2, 0, 0, -2.81],   // 2(E−J)
  [0, 1, 0, -2, 0, -1.34, 0.97],// E−2J
  [0, 2, -2, 0, 0, 0, 2.05],    // 2(E−M)   (Mars)
  [0, 2, 0, 0, 0, 0, 1.42],     // 2lE      (semiannual Kepler leftover)
  [0, 0, 0, 0, 1, 0, -6.64],    // D        (Earth-around-EMB wobble, 6.44″ theory)
];

const D2R = Math.PI / 180;

/**
 * Planetary-completion correction to the finder Sun longitude.
 * @param {number} T - Julian centuries TT from J2000
 * @returns {number} degrees — SUBTRACT from the finder Sun longitude
 */
function sunPlanetaryCompletionDeg(T) {
  const lV = (ARG_RATES.lV[0] + ARG_RATES.lV[1] * T) * D2R;
  const lE = (ARG_RATES.lE[0] + ARG_RATES.lE[1] * T) * D2R;
  const lM = (ARG_RATES.lM[0] + ARG_RATES.lM[1] * T) * D2R;
  const lJ = (ARG_RATES.lJ[0] + ARG_RATES.lJ[1] * T) * D2R;
  const D = (ARG_RATES.D[0] + ARG_RATES.D[1] * T) * D2R;
  let arcsec = 0;
  for (const [kV, kE, kM, kJ, kD, cA, sA] of TERMS) {
    const th = kV * lV + kE * lE + kM * lM + kJ * lJ + kD * D;
    arcsec += cA * Math.cos(th) + sA * Math.sin(th);
  }
  return arcsec / 3600;
}

/** sha256/16 of JSON.stringify(FITTED_COEFFICIENTS.SUN_LONGITUDE_HARMONICS)
 *  at fit time — the matched-pair fingerprint asserted by test:model. */
const PAIRED_SUN_HARMONICS_SHA256 = 'e2cf42e9770c9e0a';

module.exports = { sunPlanetaryCompletionDeg, PAIRED_SUN_HARMONICS_SHA256 };
