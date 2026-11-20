/**
 * The Sun's mean longitude of date — the integral of the one-family tropical year, seated on the lunar cumulative bank.
 *
 * One slice of `assembleModel` (../model.js): receives the context the earlier slices built, returns the bindings the later ones read.
 *
 * ITS OWN SLICE (plan 33's close-out rider, built in the plan-34 cascade): the lunar cumulative bank records this
 * table's coarse segment prefixes (`sun.meanLongitude`), so the file that defines it is one of the bank's hashed
 * inputs. While it lived inside sun-and-eclipses.js every edit to the eclipse finders, the formula or the
 * besselian tier re-ran the 2-hour bank for identical values; here the bank hashes this slice and not the eclipse
 * one (tools/verify/lunar-cumulative-bank.js INPUT_FILES, tools/lib/artifact-inputs.js modelSourceFilesExcluding).
 */
import { ONE_FAMILY_WINDOW_YEARS } from '../earth/year-lengths.cjs';
import { DAYS_PER_JULIAN_YEAR, SECONDS_PER_DAY } from '../constants/units.cjs';

/** @param {import('./lunar-theory.js').Ctx} ctx @returns the bindings the later slices read */
export function assembleSunMeanLongitude(ctx) {
  const { C, options, julianCenturyDays, meanSolarYearDays, oneFamilyTropicalYearSeconds } = ctx;
  // PLAN 26 pickup — the Sun's mean-longitude table seats on the lunar cumulative bank too
  // (its `sun.meanLongitude` section): the same segmented association, a seat never a value.
  const sunBank = options.lunarCheckpointsArtifact && options.lunarCheckpointsArtifact.sun ? options.lunarCheckpointsArtifact.sun.meanLongitude : null;
  // The certified Sun — assembled from the model's own laws, ZERO fitted Sun
  // constants: e(t) and ϖ(t) are the eclipse Sun's mean elements of date
  // (earth-scalars.js: the one-source series plus the derived mean offset);
  // L(t) is the integral of the one-family tropical year (below). The
  // finders, the derived planetary completion and the besselian location
  // tier are wired on it (sun-and-eclipses.js); the sun-vs-horizons gate banks its modern-window
  // residual, the eclipse audit the finders' canon statistics.
  const sunL0Deg = C.earthOrbital.sunMeanLongitudeJ2000_deg;
  const sunTropicalRateDegPerCy = 360 * julianCenturyDays / meanSolarYearDays;
  const sunMeanLongitudeDegAt = (() => {
    // The Sun's mean longitude of date is the INTEGRAL of the one-source
    // tropical year: L(t) = L0 + 360·∫_{2000}^{t} dt′/T_trop(t′), T_trop the
    // one-family tropical year of date in SI seconds (one-source-movement.js).
    // MEASURED: it equals the IAU/Laskar drift expression to 0.1 s over
    // −1000..+3000. The smooth year cannot carry the Earth–Mars–Jupiter long
    // inequality (1783 yr, 6.3″); derived on the model's own N-body and
    // shipped in the planetary completion, the JPL instrument reads 1.03″
    // all-phase sd (Horizons ±3000 yr: modern-window mean +0.8″).
    // NUMERICS (rate vs point value): a cumulative trapezoid table of
    // cycles, yearly inside ±20,000 yr and per century beyond, grown on
    // demand from 2000 in both directions and interpolated inside a cell —
    // never a rate multiplied by a span. Beyond the one-family window the
    // tidal-chain year continues the integrand (the scene overlay ends at
    // 20,000 yr; the finders refuse out-of-domain epochs upstream).
    const JULIAN_YEAR_S = DAYS_PER_JULIAN_YEAR * SECONDS_PER_DAY;
    const tropSec = oneFamilyTropicalYearSeconds;
    const FINE_SPAN = 20000, COARSE_STEP = 100;
    // PLAN 26 pickup — the coarse tier in SEGMENTS of COARSE_SEGMENT_CELLS cells (250 kyr, the
    // lunar bank's spacing): within a segment the cells sum from zero (S_k[j]), the prefixes
    // P[k+1] = P[k] + S_k[last] are kept apart, a value is P[k] + S_k[j] + the partial cell —
    // the same doubles in the same order with and without the bank's prefixes (a seat, never a
    // value). Measured before: this table was 10 of the 12 s of a seated deep jump to −400 Myr
    // (4 M cells of the tidal-chain year through the GIA sinusoids).
    const COARSE_SEGMENT_CELLS = 2500, SEAT_REL_TOL = 1e-7;
    /** @typedef {{ fine: number[], P: number[] | null, segs: Map<number, number[]>, banked: number }} SunSide */
    /** @type {SunSide} */ const fwd = { fine: [0], P: null, segs: new Map(), banked: 0 };
    /** @type {SunSide} */ const bwd = { fine: [0], P: null, segs: new Map(), banked: 0 };
    /** UNSIGNED trapezoid cycles over the span between two years (Julian
     *  years → SI seconds over the one-family year); the caller applies the
     *  direction sign. @param {number} ya @param {number} yb @returns {number} */
    const segAbs = (ya, yb) => 0.5 * (Math.abs(yb - ya) * JULIAN_YEAR_S) * (1 / tropSec(ya) + 1 / tropSec(yb));
    /** @param {SunSide} side @param {1|-1} s @param {number} upto grow the fine table to this many cells */
    const growFine = (side, s, upto) => { const fine = side.fine; while (fine.length <= upto) { const k = fine.length; fine.push(fine[k - 1] + s * segAbs(2000 + s * (k - 1), 2000 + s * k)); } };
    /** The coarse prefixes' seat: P[0] = the fine edge; the bank's array when its P[0] agrees to SEAT_REL_TOL. @param {SunSide} side @param {1|-1} s */
    const coarseInit = (side, s) => {
      if (side.P) return;
      growFine(side, s, FINE_SPAN);
      side.P = [side.fine[FINE_SPAN]];
      const arr = sunBank ? sunBank[s === 1 ? 'fwd' : 'bwd'] : undefined;
      if (Array.isArray(arr) && arr.length > 1 && Math.abs(arr[0] - side.P[0]) <= SEAT_REL_TOL * Math.max(1, Math.abs(side.P[0]))) { side.P = arr.slice(); side.banked = arr.length; }
    };
    /** Segment k's within-segment prefix sums (built once). @param {SunSide} side @param {1|-1} s @param {number} k */
    const segment = (side, s, k) => {
      let S = side.segs.get(k);
      if (S) return S;
      S = [0];
      const base = FINE_SPAN + k * COARSE_SEGMENT_CELLS * COARSE_STEP;
      for (let j = 1; j <= COARSE_SEGMENT_CELLS; j++) { const y0 = 2000 + s * (base + (j - 1) * COARSE_STEP); S.push(S[j - 1] + s * segAbs(y0, y0 + s * COARSE_STEP)); }
      side.segs.set(k, S);
      return S;
    };
    /** Make P[0..k] exist (segments before k summed from their own zero and chained, unless banked). @param {SunSide} side @param {1|-1} s @param {number} k */
    const prefixesTo = (side, s, k) => { const P = /** @type {number[]} */ (side.P); for (let m = P.length - 1; m < k; m++) P.push(P[m] + segment(side, s, m)[COARSE_SEGMENT_CELLS]); };
    /** signed cycles from 2000 to `year` @param {number} year @returns {number} */
    const cyclesTo = (year) => {
      const dy = year - 2000;
      const s = dy >= 0 ? 1 : -1, a = Math.abs(dy);
      // WARM THE SAMPLER TO THE TARGET FIRST (measured): the
      // table below grows outward in 1-yr / 100-yr steps, and every step
      // beyond ~1.6 Myr enlarged the one-family sampler's >2-Myr tier just
      // past its span, rebuilding the whole deep integration about every 32
      // steps — ~125 rebuilds and 22 s for the first deep-epoch call (the
      // scene's first jump to −5 Myr), 0.4 ms once built. One read at the
      // clamped target builds the tier at its final span; the grid stores
      // are endpoint-independent, so every value is bit-identical.
      tropSec(2000 + s * Math.min(a, ONE_FAMILY_WINDOW_YEARS));
      const side = s > 0 ? fwd : bwd;
      if (a <= FINE_SPAN) {
        const i = Math.floor(a), f = a - i;
        growFine(side, s, i + 1);
        return side.fine[i] + f * (side.fine[i + 1] - side.fine[i]);
      }
      coarseInit(side, s);
      const c = (a - FINE_SPAN) / COARSE_STEP, ci = Math.floor(c), cf = c - ci;
      const k = Math.floor(ci / COARSE_SEGMENT_CELLS), j = ci - k * COARSE_SEGMENT_CELLS;
      if (/** @type {number[]} */ (side.P).length <= k) prefixesTo(side, s, k);
      const S = segment(side, s, k);
      const P = /** @type {number[]} */ (side.P);
      const v0 = P[k] + S[j];
      // the next cell's start (the segment's next entry, or the next segment's first prefix)
      const v1 = j + 1 <= COARSE_SEGMENT_CELLS ? P[k] + S[j + 1] : (prefixesTo(side, s, k + 1), P[k + 1] + segment(side, s, k + 1)[0]);
      return v0 + cf * (v1 - v0);
    };
    /** THE GENERATOR'S HOOK (plan 26 pickup): the coarse segment prefixes in both directions — the
     *  segments whose END lies within ±limitYears of J2000 (the one rule of the three banked tables,
     *  chain-cycles/index.cjs recordSegmentPrefixes). @param {number | {past: number, future: number}} limitYears */
    const recordSunCumulativeBank = (limitYears) => {
      // the limit per direction (a number means both): the bank is ASYMMETRIC like the domain it covers
      const lim = typeof limitYears === 'number' ? { past: limitYears, future: limitYears } : limitYears;
      const segmentsInside = (/** @type {number} */ limit) => Math.max(0, Math.floor((limit - FINE_SPAN) / (COARSE_SEGMENT_CELLS * COARSE_STEP)));
      const Kf = segmentsInside(lim.future), Kb = segmentsInside(lim.past);
      coarseInit(fwd, 1); coarseInit(bwd, -1); prefixesTo(fwd, 1, Kf); prefixesTo(bwd, -1, Kb);
      return { fwd: /** @type {number[]} */ (fwd.P).slice(0, Kf + 1), bwd: /** @type {number[]} */ (bwd.P).slice(0, Kb + 1) };
    };
    /** THE SEAT DIAGNOSTIC: whether the bank seated and the two edge values compared, per direction. */
    const sunSeatStatus = () => { coarseInit(fwd, 1); coarseInit(bwd, -1); const b = (/** @type {'fwd'|'bwd'} */ d) => sunBank && Array.isArray(sunBank[d]) ? sunBank[d][0] : null; return { fwd: { banked: fwd.banked, edge: /** @type {number[]} */ (fwd.P)[0], bankEdge: b('fwd') }, bwd: { banked: bwd.banked, edge: /** @type {number[]} */ (bwd.P)[0], bankEdge: b('bwd') } }; };
    const fn = /** @param {number} year @returns {number} */ (year) => sunL0Deg + 360 * cyclesTo(year);
    return Object.assign(fn, { recordSunCumulativeBank, sunSeatStatus });
  })();
  const recordSunCumulativeBank = sunMeanLongitudeDegAt.recordSunCumulativeBank;
  const sunSeatStatus = sunMeanLongitudeDegAt.sunSeatStatus;

  return { sunL0Deg, sunTropicalRateDegPerCy, sunMeanLongitudeDegAt, recordSunCumulativeBank, sunSeatStatus };
}
/** @typedef {import('./lunar-theory.js').Ctx & ReturnType<typeof assembleSunMeanLongitude>} Ctx */
