/**
 * Deep-time calendar — year ↔ JD under the drifting year length, and the
 * H-balanced event finder. ONE implementation for both engines.
 *
 * Until the year/day collapse these five functions lived twice, hand-mirrored:
 * `src/script.js` (the original) and `tools/lib/deep-time.js` (the port,
 * marked PHASE-B-DUPLICATE). The website's runtime twin was a third copy, and
 * both Phase E website bugs (Simpson-vs-trapezoid convention, the missing
 * lattice-α pin) were hand-mirror divergences. This module is extracted
 * VERBATIM from the browser copy — operation for operation — so the numerics
 * are the shipped ones:
 *
 *  - the days-per-year integral rides the phase machinery's grid (10-kyr
 *    cells, trapezoid rule, linear interpolation between cells) — the same
 *    discretization the fitted coefficients were produced against;
 *  - the table is built under the LATTICE α (R2): `withLatticeAlpha` is the
 *    engine's pin, injected, so a table build can never see the climate-
 *    modulated α(t);
 *  - `yearToJD` CARRIES A KNOWN 0.6-d ZERO-POINT OFFSET (measured −0.600 d in
 *    both engines): the anchor cell is seeded by linear extrapolation but read
 *    back by interpolation across a 10-kyr cell. DO NOT "fix" it in
 *    isolation — `balancedYearAtCycle` round-trips through `cyclesBetween`,
 *    which absorbs the offset (that is why the bracket lands on
 *    −302635.004 / 32682.268 exactly); normalising the table without
 *    re-checking that round-trip moves the Step 6a window;
 *  - `balancedYearAtCycle` round-trips through the JD deliberately, NOT as a
 *    shortcut to bisecting `cyclesBetween` in calendar units: calendar-year
 *    delta = H_J2000 exactly, but SI-year delta does not — they differ by
 *    ~6.7 SI yr per H. Dropping the round-trip returns the SI label instead of
 *    the calendar year. The Newton step uses H at J2000 (the browser stepped
 *    with its live H; the iteration converges to 1e-12 cycles either way and
 *    the two agree at J2000 scene state by construction).
 *
 * CommonJS on purpose, like `./index.cjs`: `tools/lib` is CJS and cannot
 * require an ESM module synchronously; ESM imports CJS natively.
 */

'use strict';

/**
 * @typedef {Object} PhaseMachinery
 * @property {() => void} ensureTable
 * @property {(year: number) => (number | null)} cumulAtYear
 * @property {(targetCumul: number) => (number | null)} yearAtCumul
 * @property {() => {yearMin: number, yearMax: number, stepYears: number, j2000Idx: number, length: number}} grid
 */

/**
 * @typedef {Object} DeepCalendar
 * @property {(jd: number) => number} jdToSIyear SI-tropical-year label for a
 *   JD, anchored at startModelYearWithCorrection — NOT a calendar year (the
 *   scene's precession rotations integrate on this axis; a fit on it agrees
 *   with the runtime by construction; the round-trip bias Y_SI − Y is −11.0 yr
 *   at −302,635 and grows quadratically).
 * @property {(targetCumul: number) => (number | null)} yearAtCumulIntegral
 *   inverse of the phase machinery's cumulAtYear — null outside the table.
 * @property {() => void} ensureCumulDaysTable builds the ∫ daysPerYear dt table
 *   (idempotent; under the lattice α).
 * @property {(year: number) => (number | null)} yearToJD calendar year → JD,
 *   integrating days-per-year from startModelYear; null outside the table
 *   domain or past the tidal-lock asymptote; startModelJD exactly at
 *   year = startModelYear.
 * @property {(cycleOffset: number) => (number | null)} balancedYearAtCycle
 *   calendar year of the k-th H-balanced event, k = 0 being `balancedYear`;
 *   negative k = past; null outside the table domain.
 * @property {() => (number | null)} cumulDaysTableLength diagnostic — the
 *   table length once built, null before.
 */

/**
 * @param {{
 *   phase: () => PhaseMachinery,
 *   meanYearInDaysAtAgeMa: (tMa: number) => (number | null),
 *   withLatticeAlpha: (build: () => void) => void,
 *   startModelJD: number,
 *   startModelYear: number,
 *   startModelYearWithCorrection: number,
 *   siTropicalYearDays: number,
 *   balancedYear: number,
 *   hJ2000: number,
 *   cyclesBetween: (yearA: number, yearB: number, divisorN: number) => (number | null),
 * }} deps — `phase` is the engine's (lazily built) phase machinery, whose
 *   grid the days table shares; `meanYearInDaysAtAgeMa` the engine's
 *   days-per-year source (the LOD channel's `yearInDaysAtAge`);
 *   `withLatticeAlpha` the engine's R2 pin; `cyclesBetween` the engine's
 *   cycle counter (the browser passes its toggle-aware form, Node the
 *   integrated form — the caller's convention, preserved); `startModelYear`
 *   is the table zero (2000.5) and `startModelYearWithCorrection` the SI-axis
 *   anchor (≈ 2000.4977) — two different constants, do not unify.
 * @returns {DeepCalendar}
 */
function createDeepCalendar({
  phase,
  meanYearInDaysAtAgeMa,
  withLatticeAlpha,
  startModelJD,
  startModelYear,
  startModelYearWithCorrection,
  siTropicalYearDays,
  balancedYear,
  hJ2000,
  cyclesBetween,
}) {
  /** @type {(jd: number) => number} */
  const jdToSIyear = (jd) => startModelYearWithCorrection + (jd - startModelJD) / siTropicalYearDays;

  /** @type {(targetCumul: number) => (number | null)} */
  const yearAtCumulIntegral = (targetCumul) => phase().yearAtCumul(targetCumul);

  /** ∫ daysPerYear dt from startModelYear, on the phase grid. @type {Float64Array | null} */
  let cumulDaysTable = null;

  function ensureCumulDaysTable() {
    if (cumulDaysTable !== null) return;
    withLatticeAlpha(buildCumulDaysTable);   // R2: lattice tables pin α
  }

  function buildCumulDaysTable() {
    const P = phase();
    P.ensureTable();
    const { yearMin, stepYears, j2000Idx, length: N } = P.grid();
    const table = new Float64Array(N);

    /** @type {(year: number) => (number | null)} */
    const daysPerYear = (year) => meanYearInDaysAtAgeMa((startModelYear - year) / 1e6);

    const gridYearAtJ2000Idx = yearMin + j2000Idx * stepYears;
    const partialYearOffset = startModelYear - gridYearAtJ2000Idx;
    const daysAtJ2000 = meanYearInDaysAtAgeMa(0);
    table[j2000Idx] = -partialYearOffset * /** @type {number} */ (daysAtJ2000);

    let prev = daysPerYear(gridYearAtJ2000Idx);
    for (let i = j2000Idx + 1; i < N; i++) {
      const curr = daysPerYear(yearMin + i * stepYears);
      table[i] = (prev !== null && curr !== null && !Number.isNaN(table[i - 1]))
        ? table[i - 1] + 0.5 * (prev + curr) * stepYears
        : NaN;
      prev = curr;
    }

    prev = daysPerYear(gridYearAtJ2000Idx);
    for (let i = j2000Idx - 1; i >= 0; i--) {
      const curr = daysPerYear(yearMin + i * stepYears);
      table[i] = (prev !== null && curr !== null && !Number.isNaN(table[i + 1]))
        ? table[i + 1] - 0.5 * (prev + curr) * stepYears
        : NaN;
      prev = curr;
    }
    cumulDaysTable = table;
  }

  /** @type {(year: number) => (number | null)} */
  function yearToJD(year) {
    if (!Number.isFinite(year)) return null;
    ensureCumulDaysTable();
    const table = /** @type {Float64Array} */ (cumulDaysTable);
    const { yearMin, yearMax, stepYears } = phase().grid();
    if (year < yearMin || year > yearMax) return null;
    const idx_f = (year - yearMin) / stepYears;
    const idx_lo = Math.floor(idx_f);
    const idx_hi = Math.min(idx_lo + 1, table.length - 1);
    const v_lo = table[idx_lo];
    const v_hi = table[idx_hi];
    if (Number.isNaN(v_lo) || Number.isNaN(v_hi)) return null;
    const daysFromStartModel = v_lo + (idx_f - idx_lo) * (v_hi - v_lo);
    return startModelJD + daysFromStartModel;
  }

  /** @type {(cycleOffset: number) => (number | null)} */
  function balancedYearAtCycle(cycleOffset) {
    // No cycleOffset === 0 short-circuit: returning balancedYear directly
    // skips the JD round-trip below, misses the exact integer-cycle JD by
    // ~0.5 d and gives ~21″ obliquity drift + ~3e-9 e drift at cycle 0.
    const refCumul = phase().cumulAtYear(balancedYear);
    if (refCumul === null) return null;
    let Y = yearAtCumulIntegral(refCumul + cycleOffset);
    if (Y === null) return null;
    for (let iter = 0; iter < 5; iter++) {
      const jd = yearToJD(Y);
      if (jd === null) return Y;
      const Y_SI = jdToSIyear(jd);
      if (!Number.isFinite(Y_SI)) return Y;
      const corrected = cyclesBetween(balancedYear, Y_SI, 1);
      if (corrected === null) return Y;
      const error = corrected - cycleOffset;
      if (Math.abs(error) < 1e-12) break;
      Y = Y - error * hJ2000;
    }
    return Y;
  }

  return Object.freeze({
    jdToSIyear,
    yearAtCumulIntegral,
    ensureCumulDaysTable,
    yearToJD,
    balancedYearAtCycle,
    cumulDaysTableLength: () => (cumulDaysTable === null ? null : cumulDaysTable.length),
  });
}

module.exports = { createDeepCalendar };
