/**
 * The deep-time chain — ONE assembly (createDeepTimeChain destructured), the climate L1 layer and the realized pole rate over a window.
 *
 * One slice of `assembleModel` (../model.js): receives the context the earlier slices built, returns the bindings the later ones read.
 */
import { evalClimateL1OrbitalPermil } from '../climate/l1-orbital.cjs';
import { createDeepTimeChain } from '../deltat/deep-time-chain.js';
import { MOON_DISTANCE_ARTIFACT } from '../deltat/moon-distance-artifact.cjs';
import { DEEP_MODES_ARTIFACT } from '../moon/deep-modes-artifact.cjs';

/** @param {import('./derived-constants.js').Ctx} ctx @returns the bindings the later slices read */
export function assembleDeepTimeChain(ctx) {
  const { C, F, late, startmodelYear } = ctx;
  // The GIA α channel (the lagged response to the L1 ice history, with the R2
  // lattice pin and the exact-argument memo), the Layer-0 bundle, the cited
  // Earth–Moon distance history (plan 12 option A), the ΔT cycle stack (all
  // channels ON here), |s₃|, the LOD/ΔT core and the lunar month chain are
  // assembled once in deltat/deep-time-chain.js from this context's constants
  // and fitted coefficients (so a counterfactual context flows through them);
  // the Node twin and the browser destructure the same module.
  const chain = createDeepTimeChain({
    constants: C, fitted: F, deepModes: DEEP_MODES_ARTIFACT, moonDistanceArtifact: MOON_DISTANCE_ARTIFACT,
    ageAnchorYear: startmodelYear,
  });
  const { alphaGia, earthMoiFactorAtAge, EPOCH_PARAMS, recession, dtCycles, dtCycleLodCorrectionSum, s3ArcsecPerYr, deepLod, deepEcc, moonChain } = chain;
  const CLIMATE_REGIME = F.CLIMATE_FORMULA_COEFFS.regimes['lr04-post-mpt'];
  /** The climate formula's L1 (unlagged) — the orbital δ¹⁸O layer itself. @param {number} year @returns {number} */
  const evalClimateL1 = (year) => evalClimateL1OrbitalPermil(year, {
    l1Terms: CLIMATE_REGIME.L1,
    yStdDenormalization: CLIMATE_REGIME.denormalization.y_std,
  });
  const moonDistanceMetresAtAge = recession.distanceMetresAtAge;
  /** The published surfaces' km reading — NaN beyond the cited history's span (the API's
   *  validity span lies inside it; the deep charts stop where the input stops).
   *  @param {number} year @returns {number} */
  const moonDistanceKmAtYearOrNaN = (year) => { const m = moonDistanceMetresAtAge(yearToTMa(year)); return m === null ? NaN : m / 1000; };

  /** THE REALIZED POLE RATE OVER A WINDOW, ″/yr — the mean over [yearFrom, yearTo] of the rate the spin
   *  integration actually turns the pole at: the inertial secular rate of date × the solar-torque factor at
   *  e(t) × J₂(t)/J₂₀ × cos ε(t)/cos ε₀ (ds/dt = α (ŝ·n̂)(ŝ×n̂): the azimuthal rate about n̂ is α cos ε).
   *  The secular rate here is the CONSTANT's scaling (lunisolarTorqueRate…), not the published rate of
   *  date: the hybrid's own ε(t) carries the ONE cosine, so the cited mean obliquity's factor (plan 12 §8)
   *  does not enter twice — inside the ζ-series span the hybrid IS the model's obliquity of date.
   *  Measured (2026-10): the dominant obliquity line of the model's own ε(t) over the last 5 Myr sits at
   *  this mean minus |s₃| (40,938 fitted vs 40,936 predicted), NOT at the J2000 beat (41,098) — the pole
   *  turned faster in the past (spin +0.06 ″/yr over 5 Myr, lower mean obliquity +0.05, higher mean
   *  eccentricity +0.015); La2004's own series reads the same (40,917). The climate records' preferred
   *  "+0.12…+0.20 ″/yr on the obliquity lines" is this window mean (50.515 over the LR04 record).
   *  Reads the one-source history and p₀ through `late` (one-source-movement.js, year-day-lengths.js —
   *  evaluated at call time) and the deep-time LOD.
   *  `ellipticity: false` leaves the J₂(t)/J₂₀ factor out: that factor is the ice-driven GIA channel, which
   *  rides the climate formula's own post-MPT layer — the one piece that would make the climate LINES
   *  depend on their own fit (measured: its LR04-window mean moved 1 − 3e-5 → 1 across one refit,
   *  1.4e-3 ″/yr, 1 yr of period). The line derivation (the T1 exporter) excludes it; the published
   *  realized period and the hybrid verdict's gate keep the full rate.
   *  @param {number} yearFrom @param {number} yearTo @param {number} [stepYears=500]
   *  @param {{ellipticity?: boolean}} [opts] @returns {number} */
  const spinAxisInertialRateMeanArcsecPerYr = (yearFrom, yearTo, stepYears = 500, opts = {}) => {
    const useEllipticity = opts.ellipticity !== false;
    const lo = Math.min(yearFrom, yearTo), hi = Math.max(yearFrom, yearTo);
    const cosEps0 = Math.cos(late.oneSourceM.epsAt(2000) * Math.PI / 180);
    const kInertial = late.certifiedAxialPrecessionJ2000Years() / late.oneSourceM.axialPrecessionYearsLunisolarJ2000;
    let sum = 0, n = 0;
    for (let y = lo; y <= hi; y += stepYears) {
      const r = deepLod.lunisolarTorqueRateArcsecPerYrAtAge(yearToTMa(y));
      const psiDot = (r === null ? 1296000 / late.certifiedAxialPrecessionJ2000Years() : r) * kInertial;
      const f = late.oneSourceM.precessionOfDateFactorsAt(y);
      sum += psiDot * f.solarTorque * (useEllipticity ? f.ellipticity : 1) * Math.cos(late.oneSourceM.epsAt(y) * Math.PI / 180) / cosEps0;
      n++;
    }
    return sum / n;
  };

  /** @param {number} year @returns {number} */
  const yearToTMa = (year) => (2000 - year) / 1e6;

  return { EPOCH_PARAMS, alphaGia, chain, deepEcc, deepLod, dtCycleLodCorrectionSum, dtCycles, earthMoiFactorAtAge, evalClimateL1, moonChain, moonDistanceKmAtYearOrNaN, moonDistanceMetresAtAge, s3ArcsecPerYr, spinAxisInertialRateMeanArcsecPerYr, yearToTMa };
}
/** @typedef {import('./derived-constants.js').Ctx & ReturnType<typeof assembleDeepTimeChain>} Ctx */
