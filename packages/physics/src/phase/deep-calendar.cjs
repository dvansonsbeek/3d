/**
 * Deep-time calendar — year ↔ JD under the drifting year length. ONE
 * implementation for both engines.
 *
 * Until the year/day collapse these functions lived twice, hand-mirrored:
 * `src/script.js` (the original) and `tools/lib/deep-time.js` (the port,
 * marked PHASE-B-DUPLICATE). The website's runtime twin was a third copy, and
 * both Phase E website bugs (Simpson-vs-trapezoid convention, the missing
 * α pin) were hand-mirror divergences. This module is extracted
 * VERBATIM from the browser copy — operation for operation — so the numerics
 * are the shipped ones:
 *
 *  - the days-per-year integral rides the engines' deep-time grid (10-kyr
 *    cells over ±500 Myr, trapezoid rule, linear interpolation between
 *    cells — the discretization every year-keyed golden was produced
 *    against); the integrand is the tropical year of date over the day of
 *    date — one equinox turn per the composed precession period T_p(t) (the
 *    calendar's year is a tropical year);
 *  - the table is built under the PINNED α: `withLatticeAlpha` is the
 *    engine's pin, injected, so a table build can never see the climate-
 *    modulated α(t);
 *  - `yearToJD` CARRIES A KNOWN 0.6-d ZERO-POINT OFFSET (measured −0.600 d in
 *    both engines): the anchor cell is seeded by linear extrapolation but read
 *    back by interpolation across a 10-kyr cell. A recorded property of the
 *    table — the Step 6a window and every year-keyed golden were produced
 *    against it; normalising it moves them.
 *
 * CommonJS on purpose, like `./index.cjs`: `tools/lib` is CJS and cannot
 * require an ESM module synchronously; ESM imports CJS natively.
 */

'use strict';

const { NAVIGABLE_PAST_YEARS, NAVIGABLE_FUTURE_YEARS } = require('../time/navigable-domain.cjs');
const { jdToDecimalYear } = require('../time/calendar.cjs');

/**
 * @typedef {Object} DeepCalendar
 * @property {(jd: number) => number} jdToSIyear SI-tropical-year label for a
 *   JD, anchored at startModelYearWithCorrection — NOT a calendar year (the
 *   scene's precession rotations integrate on this axis; a fit on it agrees
 *   with the runtime by construction; the round-trip bias Y_SI − Y is −11.0 yr
 *   at −302,635 and grows quadratically).
 * @property {(ySI: number) => number} siYearToJD the exact inverse of jdToSIyear.
 * @property {() => void} ensureCumulDaysTable builds the ∫ daysPerYear dt table
 *   (idempotent; under the pinned α).
 * @property {(year: number) => (number | null)} yearToJD calendar year → JD,
 *   integrating days-per-year from startModelYear; null outside the table
 *   domain or past the tidal-lock asymptote; startModelJD exactly at
 *   year = startModelYear.
 * @property {() => (number | null)} cumulDaysTableLength diagnostic — the
 *   table length once built, null before.
 * @property {(year: number) => (number | null)} yearToJDTT the TT instant (SI
 *   days) of a year of date — the position table, normalised, analytic partial
 *   cell; null out of domain or without a `meanTropicalYearDaysAtAgeMa` source
 *   (plan 27, doc 111 §1.36).
 * @property {(jd: number) => (number | null)} jdTTToYear the exact inverse of yearToJDTT.
 * @property {(year: number) => (number | null)} yearToJDUT the UT Julian Day (the
 *   solar-day count the UT clock keeps) of a year of date: its TT instant minus the
 *   full ΔT there; null out of domain.
 * @property {(jdUT: number) => (number | null)} jdUTToYear the year of date a UT
 *   Julian Day has reached — the inverse of yearToJDUT through the implicit bridge.
 * @property {(jdUT: number) => (number | null)} deltaTSecondsAtJdUT THE BRIDGE: ΔT at a
 *   UT Julian Day — the raw integral at the TT age the count has reached, the era
 *   corrections at the civil year; null without a `deltaTSecondsAtAges` source.
 * @property {(jdTT: number) => (number | null)} deltaTSecondsAtJdTT ΔT at a TT instant.
 * @property {() => {yearMin: number, yearMax: number}} navigableYearRange the first
 *   and last years the position table defines — the ONE navigable edge.
 */

/**
 * @param {{
 *   meanYearInDaysAtAgeMa: (tMa: number) => (number | null),
 *   meanTropicalYearDaysAtAgeMa?: ((tMa: number) => (number | null)) | null,
 *   withLatticeAlpha: (build: () => void) => void,
 *   withShippedAlpha?: ((build: () => void) => void) | null,
 *   deltaTSecondsAtAges?: ((tMaRaw: number, tMaCorrections: number) => number) | null,
 *   startModelJD: number,
 *   startModelYear: number,
 *   startModelYearWithCorrection: number,
 *   siTropicalYearDays: number,
 *   yearMin?: number,
 *   yearMax?: number,
 *   stepYears?: number,
 * }} deps — `meanYearInDaysAtAgeMa` is the engine's days-per-year source
 *   (the LOD channel's `yearInDaysAtAge`); `withLatticeAlpha` the engine's
 *   R2 pin; `startModelYear` is the table zero (2000.5) and
 *   `startModelYearWithCorrection` the SI-axis anchor (≈ 2000.4977) — two
 *   different constants, do not unify; the grid (±500 Myr, 10-kyr cells)
 *   is the engines' deep-time grid — the table zero sits at the cell
 *   nearest `startModelYear`.
 * @returns {DeepCalendar}
 */
function createDeepCalendar({
  meanYearInDaysAtAgeMa,
  meanTropicalYearDaysAtAgeMa = null,
  withLatticeAlpha,
  withShippedAlpha = null,
  deltaTSecondsAtAges = null,
  startModelJD,
  startModelYear,
  startModelYearWithCorrection,
  siTropicalYearDays,
  yearMin = -NAVIGABLE_PAST_YEARS,
  yearMax = NAVIGABLE_FUTURE_YEARS,
  stepYears = 10000,
}) {
  const j2000Idx = Math.round((startModelYear - yearMin) / stepYears);
  const N = Math.ceil((yearMax - yearMin) / stepYears) + 1;
  /** @type {(jd: number) => number} */
  const jdToSIyear = (jd) => startModelYearWithCorrection + (jd - startModelJD) / siTropicalYearDays;
  /** The exact inverse: SI-year label → JD (the Moon layers' argument clock
   *  reads the lunar arguments at the JD of the SI year the dispatch passes).
   *  @type {(ySI: number) => number} */
  const siYearToJD = (ySI) => startModelJD + (ySI - startModelYearWithCorrection) * siTropicalYearDays;

  /** ∫ daysPerYear dt from startModelYear, on the deep-time grid. @type {Float64Array | null} */
  let cumulDaysTable = null;

  function ensureCumulDaysTable() {
    if (cumulDaysTable !== null) return;
    withLatticeAlpha(buildCumulDaysTable);   // the tables pin α
  }

  function buildCumulDaysTable() {
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

  // ── THE POSITION TABLE AND THE ONE DEEP CLOCK (plan 27, doc 111 §1.36) ──────────────────
  // The scene's time coordinate is a TROPICAL-YEAR count of date from the scene epoch
  // (`year = startModelYear + pos`). ONE table on the calendar's grid, NORMALISED
  // (jd(startModelYear) ≡ startModelJD exactly) and read with an ANALYTIC partial-cell
  // integration (the linear chord of `yearToJD` above is that function's recorded 0.6-d
  // convention and stays its own): the tropical year of date in SI days gives the TT
  // instant of a position. The UT Julian Day the scene navigates and labels by — the
  // count of solar days the UT clock keeps — is that TT instant minus the engine's FULL ΔT
  // (the raw integral of the LOD history at the TT age plus the fitted era corrections on
  // the civil year), and a UT→year read solves that bridge implicitly. A second table of
  // solar days per year was measured and rejected: it counts the MEAN day, so its UT axis
  // parts from the civil one by the era corrections (24 s in 24 years, 1.3 h at −3000).
  // These were the two engines' hand-mirrored position tables (src/script.js,
  // tools/lib/deep-time.js) and their two hand-mirrored bridges; ONE home now.
  /** @param {(tMa: number) => (number | null)} dpyAtAge days per tropical year of date */
  function makePositionTable(dpyAtAge) {
    const dpy = (/** @type {number} */ year) => dpyAtAge((startModelYear - year) / 1e6);
    /** @type {Float64Array | null} */ let T = null;
    let lo0 = 0, dy0 = 0;
    // The position tables count the solar days the SHIPPED LOD gives (the climate-modulated α —
    // the LOD's own, the ΔT integral's own): under the α-reference pin (withLatticeAlpha) the J2000 day is 3.7 ms off
    // and the era's UT count drifts 32 s in 24 years. The engine's `withShippedAlpha` forces that
    // state for the build AND every read, whatever a caller's pin; without it (a legacy engine),
    // the caller's state stands.
    const underShipped = withShippedAlpha || ((/** @type {() => void} */ build) => build());
    function ensure() {
      if (T !== null) return;
      underShipped(() => {
        const table = new Float64Array(N);
        const gy = yearMin + j2000Idx * stepYears;
        const d0 = dpy(startModelYear);
        table[j2000Idx] = -(startModelYear - gy) * /** @type {number} */ (d0);
        let prev = dpy(gy);
        for (let i = j2000Idx + 1; i < N; i++) {
          const curr = dpy(yearMin + i * stepYears);
          table[i] = (prev !== null && curr !== null && !Number.isNaN(table[i - 1])) ? table[i - 1] + 0.5 * (prev + curr) * stepYears : NaN;
          prev = curr;
        }
        prev = dpy(gy);
        for (let i = j2000Idx - 1; i >= 0; i--) {
          const curr = dpy(yearMin + i * stepYears);
          table[i] = (prev !== null && curr !== null && !Number.isNaN(table[i + 1])) ? table[i + 1] - 0.5 * (prev + curr) * stepYears : NaN;
          prev = curr;
        }
        // normalise: the anchor cell is seeded by extrapolation and read by the analytic
        // partial-cell integration — without this the zero point carries a constant (37 s)
        lo0 = Math.floor((startModelYear - yearMin) / stepYears);
        dy0 = startModelYear - (yearMin + lo0 * stepYears);
        const f0 = dpy(yearMin + lo0 * stepYears), f1 = dpy(startModelYear);
        const v0 = (f0 !== null && f1 !== null) ? table[lo0] + 0.5 * (f0 + f1) * dy0 : NaN;
        if (Number.isFinite(v0)) for (let i = 0; i < N; i++) table[i] -= v0;
        T = table;
      });
    }
    /** The finite range of the table in years: the first and last cells the integrand defines. */
    function range() {
      ensure();
      const t = /** @type {Float64Array} */ (T);
      let lo = 0, hi = N - 1;
      while (lo < N && Number.isNaN(t[lo])) lo++;
      while (hi >= 0 && Number.isNaN(t[hi])) hi--;
      return { yearMin: yearMin + lo * stepYears, yearMax: yearMin + hi * stepYears, lo, hi };
    }
    /** The integrand under the SAME α pin the table was built under: the analytic partial cell
     *  reads it at query time, and an unpinned read (the climate-modulated α) parted from the
     *  pinned build by 2,743 s at the scene epoch itself (measured, plan 27).
     *  @param {number} year @returns {number | null} */
    const dpyPinned = (year) => { /** @type {number | null} */ let v = null; underShipped(() => { v = dpy(year); }); return v; };
    /** @param {number} year @returns {number | null} the Julian Day of a year of date */
    function jdAtYear(year) {
      if (!Number.isFinite(year)) return null;
      ensure();
      const t = /** @type {Float64Array} */ (T);
      let lo = Math.floor((year - yearMin) / stepYears);
      // The table's last node is INCLUSIVE: a year exactly on it reads from the cell below
      // (dy = one step), so jdAtYear(range().yearMax) is defined — the navigable range names it.
      if (lo === N - 1 && year === yearMin + lo * stepYears) lo--;
      if (lo < 0 || lo >= N - 1) return null;
      const a = t[lo];
      if (Number.isNaN(a)) return null;
      const yLo = yearMin + lo * stepYears, dy = year - yLo;
      const f0 = dpyPinned(yLo), f1 = dpyPinned(year);
      if (f0 === null || f1 === null) return null;
      return startModelJD + a + 0.5 * (f0 + f1) * dy;   // analytic partial cell
    }
    /** @param {number} jd @returns {number | null} the year of date — the exact inverse of jdAtYear */
    function yearAtJD(jd) {
      if (!Number.isFinite(jd)) return null;
      const r = range();
      const t = /** @type {Float64Array} */ (T);
      let lo = r.lo, hi = r.hi;
      if (lo >= hi) return null;
      const target = jd - startModelJD;
      if (target < t[lo] || target > t[hi]) return null;
      const guessYear = startModelYearWithCorrection + target / siTropicalYearDays;
      let g = Math.floor((guessYear - yearMin) / stepYears);
      if (g < lo) g = lo; if (g > hi - 1) g = hi - 1;
      if (t[g] <= target && t[g + 1] >= target) {
        lo = g; hi = g + 1;
      } else {
        let span = 1, a = g, b = g;
        while (span < N) {
          a = Math.max(lo, g - span); b = Math.min(hi, g + span);
          if (t[a] <= target && t[b] >= target) break;
          span <<= 1;
        }
        lo = a; hi = b;
        while (lo < hi - 1) {
          const mid = (lo + hi) >> 1;
          if (t[mid] <= target) lo = mid; else hi = mid;
        }
      }
      const a2 = t[lo], yLo = yearMin + lo * stepYears;
      const f0 = dpyPinned(yLo);
      if (f0 === null) return null;
      let dy = (t[hi] === a2) ? 0 : (target - a2) / (t[hi] - a2) * stepYears * (hi - lo);
      for (let it = 0; it < 4; it++) {
        const f1 = dpyPinned(yLo + dy);
        if (f1 === null) break;
        const gg = a2 + 0.5 * (f0 + f1) * dy - target;
        if (Math.abs(gg) < 1e-11) break;
        dy -= gg / f1;
      }
      return yLo + dy;
    }
    return { jdAtYear, yearAtJD, range };
  }
  const ttTable = meanTropicalYearDaysAtAgeMa ? makePositionTable(meanTropicalYearDaysAtAgeMa) : null;
  const J2000_JD = 2451545.0, JULIAN_YEAR_DAYS = 365.25;
  /** The age (Myr before the scene epoch, the chain's unit) of a TT instant — on the CIVIL
   *  calendar axis the fitted ΔT convention reads (proleptic Julian before 1582: the engine's
   *  Julian-year axis to a constant 12.5 days, which is 1 s of raw integral at −3000 and
   *  nothing at depth). @param {number} jdTT @returns {number} */
  const tMaOfJdTT = (jdTT) => (startModelYear - jdToDecimalYear(jdTT)) / 1e6;
  /** The Newton slope of the bridge f(jdTT) = jdTT − ΔT(jdTT)/86400 − jdUT: f′ = 86,400/LOD =
   *  solar days per SI day of date = (solar days per year)/(SI days per year). The inverse
   *  ratio (0.73 at −2 Gyr) overshoots every step and diverges at depth (measured).
   *  @param {number} jdTT @returns {number} */
  const bridgeSlopeAtJdTT = (jdTT) => {
    const tMa = (startModelYear - (2000 + (jdTT - J2000_JD) / JULIAN_YEAR_DAYS)) / 1e6;
    const si = meanTropicalYearDaysAtAgeMa ? meanTropicalYearDaysAtAgeMa(tMa) : null, solar = meanYearInDaysAtAgeMa(tMa);
    return (si !== null && solar !== null && si > 0) ? solar / si : 1;
  };
  /** The age the fitted era corrections read: the civil calendar year of the UT count (the ΔT
   *  records' own axis). @param {number} jdUT @returns {number} */
  const tMaCivilOfJdUT = (jdUT) => (startModelYear - jdToDecimalYear(jdUT)) / 1e6;
  /** THE BRIDGE — ΔT (seconds) at a UT Julian Day, its two ages named: the raw integral at
   *  the TT age the UT count has reached (solved implicitly — ΔT changes by ≪ 1 of itself per
   *  ΔT of time, three fixed-point steps reach the double's floor), the era corrections at the
   *  civil year. Without a `deltaTSecondsAtAges` source (a legacy engine) the civil reading
   *  stands for both, as before plan 27. @param {number} jdUT @returns {number | null} */
  function deltaTSecondsAtJdUT(jdUT) {
    if (!Number.isFinite(jdUT) || !deltaTSecondsAtAges) return null;
    const tMaCivil = tMaCivilOfJdUT(jdUT);
    // Newton on f(jdTT) = jdTT − ΔT(jdTT)/86400 − jdUT, slope f′ = SI days per solar day of
    // date (the fixed point jdTT ← jdUT + ΔT(jdTT)/86400 diverges where the UT clock outruns
    // TT by more than 2×, beyond ~1 Gyr; measured: −8e6 yr at −2 Gyr, +4e9 yr at the edge).
    // The start: the civil-label reading inside the era (one step then lands); at depth the
    // label's age is beyond the chain's domain (the UT count of 4.4 Ga of TT reads 6.7 Ga), so
    // the walk starts at the table's deepest instant and f is monotone from there (f′ > 0).
    const civilDT = deltaTSecondsAtAges(tMaCivil, tMaCivil);
    let jdTT;
    if (Number.isFinite(civilDT)) {
      jdTT = jdUT + civilDT / 86400;
    } else {
      if (!ttTable) return null;
      const r = ttTable.range();
      const edge = jdUT < startModelJD ? ttTable.jdAtYear(r.yearMin) : ttTable.jdAtYear(r.yearMax);
      if (edge === null) return null;
      jdTT = edge;
    }
    let dT = NaN;
    for (let it = 0; it < 40; it++) {
      const next = deltaTSecondsAtAges(tMaOfJdTT(jdTT), tMaCivil);
      if (!Number.isFinite(next)) return Number.isFinite(dT) ? dT : null;
      const f = jdTT - next / 86400 - jdUT;
      dT = next;
      if (Math.abs(f) < 1e-9) break;
      jdTT -= f / bridgeSlopeAtJdTT(jdTT);
    }
    return dT;
  }
  /** ΔT (seconds) at a TT instant: the raw integral at that instant's age, the corrections at
   *  the civil year of the UT count it implies. @param {number} jdTT @returns {number | null} */
  function deltaTSecondsAtJdTT(jdTT) {
    if (!Number.isFinite(jdTT) || !deltaTSecondsAtAges) return null;
    const tMaTT = tMaOfJdTT(jdTT);
    const dT = deltaTSecondsAtAges(tMaTT, tMaTT);
    if (!Number.isFinite(dT)) return null;
    const next = deltaTSecondsAtAges(tMaTT, tMaCivilOfJdUT(jdTT - dT / 86400));
    return Number.isFinite(next) ? next : dT;
  }

  return Object.freeze({
    jdToSIyear,
    siYearToJD,
    ensureCumulDaysTable,
    yearToJD,
    cumulDaysTableLength: () => (cumulDaysTable === null ? null : cumulDaysTable.length),
    /** The TT instant (SI days) of a year of date — the position table, normalised, analytic; null
     *  out of domain or without a `meanTropicalYearDaysAtAgeMa` source. */
    yearToJDTT: /** @param {number} year @returns {number | null} */ (year) => (ttTable ? ttTable.jdAtYear(year) : null),
    /** The year of date of a TT Julian Day — the exact inverse of yearToJDTT. */
    jdTTToYear: /** @param {number} jd @returns {number | null} */ (jd) => (ttTable ? ttTable.yearAtJD(jd) : null),
    /** The UT Julian Day (the solar-day count the UT clock keeps) of a year of date: its TT
     *  instant minus the full ΔT there; null out of domain. */
    yearToJDUT: /** @param {number} year @returns {number | null} */ (year) => {
      const jdTT = ttTable ? ttTable.jdAtYear(year) : null;
      if (jdTT === null) return null;
      const dT = deltaTSecondsAtJdTT(jdTT);
      return dT === null ? jdTT : jdTT - dT / 86400;
    },
    /** The year of date a UT Julian Day has reached — the inverse of yearToJDUT through the
     *  implicit bridge; null out of domain. */
    jdUTToYear: /** @param {number} jdUT @returns {number | null} */ (jdUT) => {
      if (!ttTable) return null;
      const dT = deltaTSecondsAtJdUT(jdUT);
      return ttTable.yearAtJD(dT === null ? jdUT : jdUT + dT / 86400);
    },
    deltaTSecondsAtJdUT,
    deltaTSecondsAtJdTT,
    /** The navigable year range: the first and last cells the position table defines. */
    navigableYearRange: /** @returns {{yearMin: number, yearMax: number}} */ () => {
      if (!ttTable) return { yearMin: NaN, yearMax: NaN };
      const r = ttTable.range(); return { yearMin: r.yearMin, yearMax: r.yearMax };
    },
  });
}

module.exports = { createDeepCalendar };
