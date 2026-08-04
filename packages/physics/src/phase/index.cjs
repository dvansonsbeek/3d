/**
 * Integrated-phase machinery — THE shared implementation (Phase 7.1).
 *
 * The cumulative ∫1/H(t)dt table and everything derived from it: cycle counts,
 * the J2000 drift correction, and the inverse lookup. Extracted VERBATIM from
 * tools/lib/deep-time.js, which was itself the port of src/script.js — this
 * file replaces both copies (and is the reference the website's deepTime.ts
 * must match; Phase E measured what happens when it doesn't).
 *
 * CommonJS on purpose: `tools/lib` is CJS and cannot require an ESM module
 * synchronously; ESM (`src/script.js`, bundlers) imports CJS natively. One
 * file, every engine.
 *
 * THE CONVENTIONS ARE LOAD-BEARING — the fitted coefficients were produced
 * against THIS discretization, so the numerics ship with the coefficients:
 *
 *  - TRAPEZOID rule on 10-kyr cells with LINEAR interpolation between cells.
 *    An analytically better integrator is WRONG here: the website's adaptive
 *    Simpson disagreed by ~1e-6 cycles at −280 kyr = ~18 s of cardinal-point
 *    JD through the ×16 braid phase (Gate E measured 24.7 s before the fix).
 *  - R2: the table must be built under the LATTICE α — the CONSTANT moment of
 *    inertia, not the climate-modulated α(t). The `holisticHAtAgeMa` the
 *    caller injects must already be pinned (see each engine's construction
 *    site). The always-on climate modulation integrates into a linear phase
 *    drift (the same ~18 s class — the dominant Phase E bug).
 *  - R3: the drift-correction anchor is identified by CALL SHAPE, never by
 *    distance from J2000 — the old distance heuristic put a 2·drift
 *    = 6.80e-5-cycle STEP DISCONTINUITY at yearB == yearA, worth 0.393 d of
 *    apsis displacement and 100% of 6d's anomalistic residual.
 *  - The table zero sits at the cell nearest `tableAnchorYear` (2000.5,
 *    startmodelYear); the drift reference is `driftRefYear`
 *    (startModelYearWithCorrection ≈ 2000.4977) — TWO different constants,
 *    half a day apart. Do not "unify" them.
 */

'use strict';

function createPhaseMachinery({
  holisticHAtAgeMa,   // (t_Ma) => H in years — MUST be the lattice-α form
  tableAnchorYear,    // startmodelYear (2000.5): table zero + t_Ma convention
  driftRefYear,       // startModelYearWithCorrection: R3 drift anchor
  hJ2000,             // H at J2000 (the snapshot rate the drift compares against)
  yearMin = -500e6,
  yearMax = 500e6,
  stepYears = 10000,  // 10 kyr per cell — matches both engines' historic tables
}) {
  let table = null;
  let j2000Idx = -1;

  function ensureTable() {
    if (table !== null) return;
    const N = Math.ceil((yearMax - yearMin) / stepYears) + 1;
    const t = new Float64Array(N);
    j2000Idx = Math.round((tableAnchorYear - yearMin) / stepYears);

    const invH = (year) => {
      const t_Ma = (tableAnchorYear - year) / 1e6;
      const H = holisticHAtAgeMa(t_Ma);
      return H === null ? null : 1 / H;
    };

    t[j2000Idx] = 0;
    let prev = invH(yearMin + j2000Idx * stepYears);
    for (let i = j2000Idx + 1; i < N; i++) {
      const year_i = yearMin + i * stepYears;
      const curr = invH(year_i);
      t[i] = (prev !== null && curr !== null)
        ? t[i - 1] + 0.5 * (prev + curr) * stepYears
        : NaN;
      prev = curr;
    }
    prev = invH(yearMin + j2000Idx * stepYears);
    for (let i = j2000Idx - 1; i >= 0; i--) {
      const year_i = yearMin + i * stepYears;
      const curr = invH(year_i);
      t[i] = (prev !== null && curr !== null)
        ? t[i + 1] - 0.5 * (prev + curr) * stepYears
        : NaN;
      prev = curr;
    }
    table = t;
  }

  /** Cumulative ∫1/H at a year (linear interpolation). null outside the range
   *  or where the physics is undefined (past the tidal-lock asymptote). */
  function cumulAtYear(year) {
    ensureTable();
    if (year < yearMin || year > yearMax) return null;
    const idx_f = (year - yearMin) / stepYears;
    const idx_lo = Math.floor(idx_f);
    const idx_hi = Math.min(idx_lo + 1, table.length - 1);
    const v_lo = table[idx_lo];
    const v_hi = table[idx_hi];
    if (Number.isNaN(v_lo) || Number.isNaN(v_hi)) return null;
    return v_lo + (idx_f - idx_lo) * (v_hi - v_lo);
  }

  /** ∫_{yearA}^{yearB} 1/H(t') dt'. null if either endpoint is out of domain. */
  function integralBetween(yearA, yearB) {
    if (yearA === yearB) return 0;
    const cA = cumulAtYear(yearA);
    const cB = cumulAtYear(yearB);
    if (cA === null || cB === null) return null;
    return cB - cA;
  }

  /** How far the integrated form has drifted from the J2000-snapshot form over
   *  (yearA → driftRefYear). Subtracting it at the anchor restores the
   *  snapshot-fitted harmonic calibration at J2000 without changing the
   *  integrated form's shape at deep time. */
  function j2000Drift(yearA) {
    const integral = integralBetween(yearA, driftRefYear);
    if (integral === null) return 0;
    const snapshot = (driftRefYear - yearA) / hJ2000;
    return integral - snapshot;
  }

  /** Total cycles between two years for a cycle of period H/divisorN.
   *  R3: the anchor is identified from the CALL SHAPE — two shapes exist,
   *  (anchor, movingYear, N) and (J2000, anchor, N) where yearA IS the J2000
   *  reference itself. The correction depends only on a FIXED endpoint, so it
   *  is constant across any scan. Returns null past the tidal-lock asymptote. */
  function cyclesBetween(yearA, yearB, divisorN) {
    const integral = integralBetween(yearA, yearB);
    if (integral === null) return null;
    const anchorIsA = (yearA !== driftRefYear);
    const correction = anchorIsA ? j2000Drift(yearA) : -j2000Drift(yearB);
    return divisorN * (integral - correction);
  }

  /** Inverse of cumulAtYear — the year at a given cumulative ∫1/H (binary
   *  search over the monotone table). null outside the table domain. */
  function yearAtCumul(targetCumul) {
    ensureTable();
    const N = table.length;
    let lo = 0, hi = N - 1;
    while (lo < N && Number.isNaN(table[lo])) lo++;
    while (hi >= 0 && Number.isNaN(table[hi])) hi--;
    if (lo >= hi) return null;
    if (targetCumul < table[lo] || targetCumul > table[hi]) return null;
    while (lo < hi - 1) {
      const mid = (lo + hi) >> 1;
      if (table[mid] <= targetCumul) lo = mid; else hi = mid;
    }
    const v_lo = table[lo], v_hi = table[hi];
    const frac = (v_lo === v_hi) ? 0 : (targetCumul - v_lo) / (v_hi - v_lo);
    return yearMin + (lo + frac) * stepYears;
  }

  /** Grid geometry — consumed by the engines' days/pos tables, which share
   *  this grid but keep their own integrands (they move at Phase 8). */
  function grid() {
    ensureTable();
    return { yearMin, yearMax, stepYears, j2000Idx, length: table.length };
  }

  return { ensureTable, cumulAtYear, integralBetween, j2000Drift, cyclesBetween, yearAtCumul, grid };
}

module.exports = { createPhaseMachinery };
