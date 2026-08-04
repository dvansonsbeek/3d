/**
 * Generic chain-cycle integrator — THE shared implementation (Phase 8.2-4).
 *
 * Counts cycles of any evolving period T(t) between two calendar years:
 * ∫ (T_yr_SI / T_period_SI)(y) dy. Serves every Moon scene-graph chain
 * (tropical month, perigee/node precession, the beat cycles) AND the seven
 * planet OrbitalCyclesBetween functions — it is chain-generic, keyed by the
 * period function's identity.
 *
 * Extracted VERBATIM from src/script.js _moonCycleTable/_moonCycleTableAt/
 * _moonChainCycles, which tools/lib/scene-graph.js mirrored. Three mirror
 * gaps closed by this move (each measured against the lunar golden masters):
 *
 *  - S5: the snapshot branch (deep-time OFF → linear at the J2000 rate),
 *    the memoized periodFn(0), and the bounded FIFO cache existed only in
 *    the browser. They are the implementation now; the Node engine gains
 *    them (its snapshot semantics thereby ALIGN with the browser's).
 *  - S12: the browser maps year → age with ageAnchorYear = startmodelYear
 *    (2000.5, the scene's t_Ma convention) while the tools mirror used a
 *    literal 2000 — a half-year skew in the integrand argument. The anchor
 *    is INJECTED; both engines pass startmodelYear (the certified browser
 *    convention).
 *  - The cumulative table stays anchored C(gridAnchorYear) = 0 at calendar
 *    2000 (NOT 2000.5) in both engines — grid anchor and age anchor are two
 *    different constants, deliberately (cf. the phase machinery's
 *    tableAnchorYear vs driftRefYear pair).
 *
 * NUMERICS ARE LOAD-BEARING: fixed 10-yr grid over ±250 kyr, per-cell
 * 3-point Simpson at build, LINEAR interpolation on read; adaptive Simpson
 * (~1 sample/kyr, n ∈ [32, 1024], even) as the out-of-range fallback. The
 * table replaced the per-call Simpson for in-range spans (the L-4
 * 92 s/century full-canon regression); an "analytically better" integrator
 * here would detach the runtime from the certified numbers.
 */

'use strict';

/**
 * @typedef {(tMa: number) => (number | null)} PeriodSecondsAtAge
 */

/**
 * @param {{
 *   ageAnchorYear: number,
 *   tropicalYearSecondsAtAge: (tMa: number) => (number | null),
 *   tropicalYearJ2000Seconds: number,
 *   isDeepTime: () => boolean,
 *   gridMinYear?: number,
 *   gridMaxYear?: number,
 *   gridStepYears?: number,
 *   gridAnchorYear?: number,
 *   maxCacheEntries?: number,
 * }} deps — ageAnchorYear is the year whose age is 0 in the period
 *   functions' t_Ma coordinate (startmodelYear = 2000.5, the certified
 *   convention); tropicalYearJ2000Seconds feeds the snapshot branch;
 *   isDeepTime is read PER CALL so the engine's runtime toggle works.
 */
function createChainCycleIntegrator({
  ageAnchorYear,
  tropicalYearSecondsAtAge,
  tropicalYearJ2000Seconds,
  isDeepTime,
  gridMinYear = 2000 - 250000,
  gridMaxYear = 2000 + 250000,
  gridStepYears = 10,
  gridAnchorYear = 2000,
  maxCacheEntries = 512,
}) {
  /** @type {WeakMap<PeriodSecondsAtAge, Map<string, number>>} */
  const caches = new WeakMap();
  /** @type {WeakMap<PeriodSecondsAtAge, number>} */
  const j2000Periods = new WeakMap();       // memoized periodFn(0)
  /** @type {Map<PeriodSecondsAtAge, Float64Array | null>} */
  const tables = new Map();

  /** Lazy cumulative table for one chain; null when the chain is undefined
   *  anywhere in range (→ Simpson fallback).
   *  @param {PeriodSecondsAtAge} periodFnSeconds
   *  @returns {Float64Array | null} */
  function table(periodFnSeconds) {
    let tab = tables.get(periodFnSeconds);
    if (tab !== undefined) return tab;
    const N = Math.round((gridMaxYear - gridMinYear) / gridStepYears);
    const cum = new Float64Array(N + 1);
    const anchorIdx = Math.round((gridAnchorYear - gridMinYear) / gridStepYears);
    /** @param {number} y @returns {number | null} */
    const f = (y) => {
      const tMa = (ageAnchorYear - y) / 1e6;
      const tPeriodS = periodFnSeconds(tMa);
      if (tPeriodS === null) return null;
      const tYrS = tropicalYearSecondsAtAge(tMa);
      return tYrS === null ? null : tYrS / tPeriodS;
    };
    let ok = true;
    let fPrev = f(gridMinYear);
    for (let i = 1; i <= N; i++) {
      const fMid = f(gridMinYear + (i - 0.5) * gridStepYears);
      const fCur = f(gridMinYear + i * gridStepYears);
      if (fPrev === null || fMid === null || fCur === null) { ok = false; break; }
      cum[i] = cum[i - 1] + (fPrev + 4 * fMid + fCur) * (gridStepYears / 6);
      fPrev = fCur;
    }
    if (ok) {
      const c0 = cum[anchorIdx];
      for (let i = 0; i <= N; i++) cum[i] -= c0;   // anchor C(gridAnchorYear) = 0
      tab = cum;
    } else {
      tab = null;
    }
    tables.set(periodFnSeconds, tab);
    return tab;
  }

  /** @param {Float64Array} tab @param {number} y @returns {number} */
  function tableAt(tab, y) {
    const idxF = (y - gridMinYear) / gridStepYears;
    const i = Math.floor(idxF);
    return tab[i] + (idxF - i) * (tab[i + 1] - tab[i]);
  }

  /** Cycles of the chain between two calendar years. Snapshot mode: linear
   *  at the J2000 rate. Deep time: table lookup in ±range, adaptive Simpson
   *  beyond. null past the tidal-lock asymptote.
   *  @param {PeriodSecondsAtAge} periodFnSeconds
   *  @param {number} yearA @param {number} yearB
   *  @returns {number | null} */
  function cyclesBetween(periodFnSeconds, yearA, yearB) {
    const dy = yearB - yearA;
    if (dy === 0) return 0;

    let tJ2000 = j2000Periods.get(periodFnSeconds);
    if (tJ2000 === undefined) {
      const t0 = periodFnSeconds(0);
      if (t0 === null) return null;
      tJ2000 = t0;
      j2000Periods.set(periodFnSeconds, tJ2000);
    }

    if (!isDeepTime()) {
      return dy * tropicalYearJ2000Seconds / tJ2000;
    }

    // Cumulative-table fast path (deterministic, call-order independent)
    if (yearA > gridMinYear && yearA < gridMaxYear && yearB > gridMinYear && yearB < gridMaxYear) {
      const tab = table(periodFnSeconds);
      if (tab !== null) return tableAt(tab, yearB) - tableAt(tab, yearA);
    }

    let cache = caches.get(periodFnSeconds);
    if (!cache) {
      cache = new Map();
      caches.set(periodFnSeconds, cache);
    }
    const cacheKey = yearA + '|' + yearB;
    const hit = cache.get(cacheKey);
    if (hit !== undefined) return hit;

    // Adaptive Simpson: ~1 sample per 1 kyr, capped at 1024 to bound per-call cost.
    let n = Math.max(32, Math.ceil(Math.abs(dy) / 1000));
    if (n > 1024) n = 1024;
    if (n % 2 === 1) n++;
    const h = dy / n;

    let sum = 0;
    for (let i = 0; i <= n; i++) {
      const y = yearA + i * h;
      const tMa = (ageAnchorYear - y) / 1e6;
      const tPeriodS = periodFnSeconds(tMa);
      if (tPeriodS === null) return null;
      const tYrS = tropicalYearSecondsAtAge(tMa);
      if (tYrS === null) return null;
      const integrand = tYrS / tPeriodS;  // cycles per SI year
      const w = (i === 0 || i === n) ? 1 : (i % 2 === 1 ? 4 : 2);
      sum += w * integrand;
    }
    const result = (sum * h) / 3;

    if (cache.size >= maxCacheEntries) {
      const firstKey = cache.keys().next().value;
      cache.delete(/** @type {string} */ (firstKey));
    }
    cache.set(cacheKey, result);
    return result;
  }

  return { cyclesBetween };
}

module.exports = { createChainCycleIntegrator };
