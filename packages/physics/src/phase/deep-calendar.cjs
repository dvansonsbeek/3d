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
const { jdToDecimalYear, calendarToJD } = require('../time/calendar.cjs');

/** THE TWO YEAR AXES (plan 27, doc 111 §1.36). The position axis counts tropical years OF DATE
 *  since the scene epoch; the engine axis is the civil year of the TT instant (the chain's age,
 *  the spin bank's edges, every physics read). They part by the year-length history: 0.055 %
 *  at −4.425 Gyr, 2.4 Myr — over which the cited Moon history moves 20 % at the genesis, so a
 *  ring sized on the position's count sat 27 % from a Moon placed at the TT age (measured). The
 *  navigable domain is the ENGINE's; the position table carries this margin beyond it (whole
 *  cells, so the grid inside the domain is the former grid, bit-identical — the build runs
 *  outward from J2000) and the navigable range is the engine edges' image on the position axis. */
const POSITION_TABLE_MARGIN = 0.002;

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
 * }} deps — `yearMin`/`yearMax` are the navigable domain as the callers count it (years since
 *   the scene epoch, default the engine's ±navigable years); the table adds its own margin.
 *   `meanYearInDaysAtAgeMa` is the engine's days-per-year source
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
  yearMin: domainYearMin = -NAVIGABLE_PAST_YEARS,
  yearMax: domainYearMax = NAVIGABLE_FUTURE_YEARS,
  stepYears = 10000,
}) {
  // The engine's edge years (the civil year of the TT instant: the one-source sampler's clamp,
  // the spin bank's ends) and the table's own span — the domain plus the margin in whole cells.
  const engineYearMin = 2000 + domainYearMin, engineYearMax = 2000 + domainYearMax;
  const yearMin = domainYearMin - Math.ceil(Math.abs(domainYearMin) * POSITION_TABLE_MARGIN / stepYears) * stepYears;
  const yearMax = domainYearMax + Math.ceil(Math.abs(domainYearMax) * POSITION_TABLE_MARGIN / stepYears) * stepYears;
  const j2000Idx = Math.round((startModelYear - yearMin) / stepYears);
  const N = Math.ceil((yearMax - yearMin) / stepYears) + 1;
  const J2000_JD = 2451545.0, JULIAN_YEAR_DAYS = 365.25;
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
  //
  // THE INTEGRAND IS READ AT THE AGE OF THE INSTANT, NEVER AT THE COUNT (plan 27 §8 J2). The
  // table solves dJD/dcount = D(age(JD)): the tropical year of date at the TT age the count has
  // REACHED — Julian years of TT before the scene epoch, the chain's own age axis. The first
  // form read D at the count itself ((startModelYear − count)/1e6): a count year is not an age
  // (doc 111 §1.36) — the count runs 0.055 % ahead of the TT age, 2.59 Myr at the genesis, so
  // the integrand was read 2.4 Myr too deep inside the cited history and on its fallback past
  // the history's end for the last 4.6 Myr of count (measured: 364.94 SI days per count year
  // at the edge where the tropical year of date is 328.74; 360.28 against 362.66 at 4,425 Ma).
  // Each cell is the implicit trapezoid T₁ = T₀ + ½·(D(age(T₀)) + D(age(T₁)))·Δcount, solved by
  // fixed point (D depends on T at 1e-8 per cell in the era, 2e-4 at the genesis: two to five
  // evaluations); the partial-cell read solves the same equation from the cell's lower node,
  // and the inverse is CLOSED FORM — the age of the target instant is known.
  /** @param {(tMa: number) => (number | null)} dpyAtAge days per tropical year of date */
  function makePositionTable(dpyAtAge) {
    /** SI days per tropical year of date at the instant `t` days from the scene epoch.
     *  @param {number} t @returns {number | null} */
    const dAt = (t) => dpyAtAge(-t / (JULIAN_YEAR_DAYS * 1e6));
    /** The integrand at the instant the last `stepFrom` returned — exactly `dAt` of that value,
     *  so a march reuses it as the next cell's f0 (two evaluations per era cell, not four). */
    let stepF = /** @type {number | null} */ (null);
    /** The implicit trapezoid from a node: the instant `dy` count years from the node at `t0`
     *  whose integrand there is `f0` — the iterate whose trapezoid image lies within the
     *  tolerance of itself (1e-9 d, or the double's own floor at depth). NaN where the
     *  integrand is undefined.
     *  @param {number} t0 @param {number} f0 @param {number} dy
     *  @param {number} [fGuess] the integrand expected at the far end (a march's extrapolation)
     *  @returns {number} */
    const stepFrom = (t0, f0, dy, fGuess) => {
      // the predictor: the node's own integrand, or — in a march — the trapezoid on the
      // integrand extrapolated from the previous cell (the first evaluation then usually
      // lands inside the tolerance: one evaluation per cell)
      let t = t0 + (fGuess === undefined ? f0 : 0.5 * (f0 + fGuess)) * dy;
      let f = dAt(t);
      for (let it = 0; it < 8 && f !== null; it++) {
        const next = t0 + 0.5 * (f0 + f) * dy;
        // 1e-9 d in the era; at depth LESS than one unit in the last place, i.e. an exact fixed
        // point — a residual of a few units per cell is systematic and accumulated to 0.9 days
        // at the genesis over the table's 443,000 cells (measured against the converged form)
        if (Math.abs(next - t) <= Math.abs(next) * 1e-16 + 1e-9) break;
        t = next;
        f = dAt(t);
      }
      stepF = f;
      return f === null ? NaN : t;
    };
    /** @type {Float64Array | null} */ let T = null;
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
        // the scene epoch is the zero (t = 0 at startModelYear); the grid node nearest it is
        // reached from there, then the march runs outward from that node in both directions
        const gy = yearMin + j2000Idx * stepYears;
        const d0 = dAt(0);
        table[j2000Idx] = d0 === null ? NaN : stepFrom(0, d0, gy - startModelYear);
        /** @param {number} from @param {number} to @param {number} dir */
        const march = (from, to, dir) => {
          let prev = Number.isNaN(table[from]) ? null : dAt(table[from]);
          /** @type {number | undefined} */ let before;   // the integrand one node further back
          for (let i = from + dir; dir > 0 ? i <= to : i >= to; i += dir) {
            const t0 = table[i - dir];
            table[i] = (prev === null || Number.isNaN(t0)) ? NaN : stepFrom(t0, prev, dir * stepYears, before === undefined ? undefined : 2 * prev - before);
            before = prev === null ? undefined : prev;
            prev = Number.isNaN(table[i]) ? null : stepF;   // ≡ dAt(table[i])
          }
        };
        march(j2000Idx, N - 1, 1);
        march(j2000Idx, 0, -1);
        // normalise: the epoch is read from its cell's LOWER node, whose trapezoid over the
        // partial cell is not the one that built the node — without this the zero point carries
        // a constant (a first form seeded the anchor by extrapolation: 37 s)
        const lo0 = Math.min(N - 2, Math.max(0, Math.floor((startModelYear - yearMin) / stepYears)));
        const f0 = Number.isNaN(table[lo0]) ? null : dAt(table[lo0]);
        const v0 = f0 === null ? NaN : stepFrom(table[lo0], f0, startModelYear - (yearMin + lo0 * stepYears));
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
    /** The integrand at an instant under the SAME α pin the table was built under: the partial
     *  cell reads it at query time, and an unpinned read (the climate-modulated α) parted from
     *  the pinned build by 2,743 s at the scene epoch itself (measured, plan 27).
     *  @param {number} t days from the scene epoch @returns {number | null} */
    const dAtPinned = (t) => { /** @type {number | null} */ let v = null; underShipped(() => { v = dAt(t); }); return v; };
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
      const dy = year - (yearMin + lo * stepYears);
      // the partial cell: the same implicit trapezoid the table was built with, from the lower node
      /** @type {number} */ let v = NaN;
      underShipped(() => { const f0 = dAt(a); v = f0 === null ? NaN : stepFrom(a, f0, dy); });
      return Number.isNaN(v) ? null : startModelJD + v;
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
      // CLOSED FORM: the cell's trapezoid target = a + ½·(D(age(a)) + D(age(target)))·dy has its
      // integrand at the target's OWN age, which is known — no iteration
      const a2 = t[lo], yLo = yearMin + lo * stepYears;
      const f0 = dAtPinned(a2), f1 = dAtPinned(target);
      if (f0 === null || f1 === null) return null;
      return yLo + (target - a2) / (0.5 * (f0 + f1));
    }
    return { jdAtYear, yearAtJD, range };
  }
  const ttTable = meanTropicalYearDaysAtAgeMa ? makePositionTable(meanTropicalYearDaysAtAgeMa) : null;
  /** The civil decimal year of the scene epoch — where the raw integral's age leaves the civil axis. */
  const epochCivilYear = jdToDecimalYear(startModelJD);
  /** The age (Myr before the scene epoch, the chain's unit) of a TT instant, for the RAW
   *  integral. Up to the scene epoch: the CIVIL calendar year the fitted ΔT convention reads
   *  (the fitter's own axis — proleptic Julian before 1582: the engine's Julian-year axis to a
   *  constant 12.5 days, which is 1 s of raw integral at −3000 and nothing at depth), unchanged.
   *  AHEAD of the scene epoch: Julian years of TT from it, the engine's axis — the civil year
   *  there is GREGORIAN and runs 2.05e-5 of the span ahead of the engine year (20.5 yr at
   *  +1 Myr, 2,053 yr at +100 Myr, 20,329 yr at +990 Myr, measured): the raw integral was read
   *  that far into the future of the instant, and the UT day parted from the chain's day by
   *  1.2e-6 at +100 Myr and 1.5e-5 at +990 Myr (plan 27 §8 J3 — the third axis finding; no
   *  record lies ahead of today, so the fitted convention has nothing to say there).
   *  @param {number} jdTT @returns {number} */
  const tMaOfJdTT = (jdTT) => (startModelYear - (jdTT <= startModelJD ? jdToDecimalYear(jdTT) : epochCivilYear + (jdTT - startModelJD) / JULIAN_YEAR_DAYS)) / 1e6;
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
      // the ENGINE's edge instant, where the chain is defined — the table's own edge lies the
      // margin beyond it, past the cited Moon history's end (the LOD is null there)
      jdTT = calendarToJD(jdUT < startModelJD ? engineYearMin : engineYearMax, 1, 1, 0);
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
    /** The navigable range on the POSITION axis (years of date since the scene epoch, as the
     *  callers count): the positions whose TT instant is the engine's edge year (January 1 of
     *  2000 ∓ the navigable years, the civil axis the physics reads) — never the table's own
     *  edge, which lies the margin beyond. */
    navigableYearRange: /** @returns {{yearMin: number, yearMax: number}} */ () => {
      if (!ttTable) return { yearMin: NaN, yearMax: NaN };
      const r = ttTable.range();
      const jdLo = calendarToJD(engineYearMin, 1, 1, 0), jdHi = calendarToJD(engineYearMax, 1, 1, 0);
      let lo = ttTable.yearAtJD(jdLo), hi = ttTable.yearAtJD(jdHi);
      // The position's resolution at 4.4e9 years is 30 s: round INTO the domain, so the edge's
      // TT instant is on or after January 1 (the label reads the edge year, not December 31).
      for (let k = 0; lo !== null && k < 4 && /** @type {number} */ (ttTable.jdAtYear(lo)) < jdLo; k++) lo += Math.abs(lo) * Number.EPSILON;
      for (let k = 0; hi !== null && k < 4 && /** @type {number} */ (ttTable.jdAtYear(hi)) > jdHi; k++) hi -= Math.abs(hi) * Number.EPSILON;
      return {
        yearMin: lo === null ? r.yearMin : Math.max(lo, r.yearMin),
        yearMax: hi === null ? r.yearMax : Math.min(hi, r.yearMax),
      };
    },
  });
}

module.exports = { createDeepCalendar };
