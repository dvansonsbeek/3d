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
 * 3-point Simpson at build, LINEAR interpolation on read; beyond the dense
 * grid a COARSE cumulative table (1-kyr cells, the same per-cell Simpson,
 * anchored at the dense edge) grown lazily in 250-kyr chunks in the direction
 * asked for — the owner's playback at 1,000 yr/s past year 250,000 had fallen
 * to 190 ms of JS per frame: the former fallback, an adaptive Simpson of up to
 * 1,024 samples per call cached by exact year pair, re-integrated every one
 * of the four Moon chains from the grid edge on every frame, each sample a
 * deep-time LOD/α evaluation. The adaptive Simpson remains only for a chain
 * undefined somewhere in range (null) or beyond the coarse limit (±600 Myr,
 * past the model's domain). An "analytically better" integrator here would
 * detach the runtime from the certified numbers: the in-range path is
 * byte-identical to before.
 */

'use strict';

/**
 * @typedef {(tMa: number) => (number | null)} PeriodSecondsAtAge
 */

/**
 * @param {{
 *   ageAnchorYear: number,
 *   tropicalYearJ2000Seconds: number,
 *   isDeepTime: () => boolean,
 *   gridMinYear?: number,
 *   gridMaxYear?: number,
 *   gridStepYears?: number,
 *   gridAnchorYear?: number,
 *   maxCacheEntries?: number,
 * }} deps — ageAnchorYear is the year whose age is 0 in the period
 *   functions' t_Ma coordinate (startmodelYear = 2000.5, the certified
 *   convention); tropicalYearJ2000Seconds is the length of ONE tick of the
 *   year axis the integrator is fed — the linear SI-year label, each tick
 *   exactly one J2000 tropical year of seconds — so it is the integrand's
 *   weight in BOTH branches (plan 09 step 7c′: the deep branch had weighted
 *   each tick by the tropical year OF DATE, adding that year's deep-time
 *   drift to every lunar count — ~5° of Moon at ±100 kyr, ~1.3 orbits at
 *   1 Ma — although the tick itself never changes length; the owner's call:
 *   a plain correctness fix, the tick already is an SI tick);
 *   isDeepTime is read PER CALL so the engine's runtime toggle works.
 */
function createChainCycleIntegrator({
  ageAnchorYear,
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

  // (plan 09 step 7c′: the exact-argument memo of the year-of-date weight
  // left with the weight — the tick length is the constant below.)

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
      return tropicalYearJ2000Seconds / tPeriodS;   // cycles per tick (one SI year)
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

  // ── The coarse extension beyond the dense grid ─────────────────────────────
  // Per chain and per direction, a cumulative table in COARSE_STEP cells that
  // starts at the dense edge with the edge's own value and grows by COARSE_CHUNK
  // years whenever a year beyond its reach is asked for. The cells are built
  // with the same 3-point Simpson as the dense grid; the read is the same
  // linear interpolation. The period laws vary on Myr scales at deep time, so
  // 1-kyr cells hold the count to far below a cycle — the old fallback sampled
  // ~1 per kyr too, but re-did the whole span on every call.
  const COARSE_STEP = 1000, COARSE_CHUNK = 250000, COARSE_LIMIT_YEARS = 600e6;
  /** @typedef {{ cum: number[], ok: boolean }} CoarseSide */
  /** @type {WeakMap<PeriodSecondsAtAge, { fwd: CoarseSide, bwd: CoarseSide }>} */
  const coarse = new WeakMap();
  /** @param {PeriodSecondsAtAge} periodFnSeconds @param {number} y @returns {number | null} cycles per tick */
  const integrandAt = (periodFnSeconds, y) => {
    const tPeriodS = periodFnSeconds((ageAnchorYear - y) / 1e6);
    return tPeriodS === null ? null : tropicalYearJ2000Seconds / tPeriodS;
  };
  /** Grow one side until it covers `distance` years from the dense edge (or fails on a null chain).
   *  @param {PeriodSecondsAtAge} periodFnSeconds @param {CoarseSide} side @param {number} edgeYear
   *  @param {1|-1} dir @param {number} distance */
  function growCoarse(periodFnSeconds, side, edgeYear, dir, distance) {
    const need = Math.ceil(distance / COARSE_STEP) + 1;
    let target = side.cum.length;
    while (target < need) target += COARSE_CHUNK / COARSE_STEP;
    for (let i = side.cum.length; i < target && side.ok; i++) {
      const y0 = edgeYear + dir * (i - 1) * COARSE_STEP, y1 = y0 + dir * COARSE_STEP;
      const f0 = integrandAt(periodFnSeconds, y0), fm = integrandAt(periodFnSeconds, (y0 + y1) / 2), f1 = integrandAt(periodFnSeconds, y1);
      if (f0 === null || fm === null || f1 === null) { side.ok = false; break; }
      side.cum.push(side.cum[i - 1] + dir * (f0 + 4 * fm + f1) * (COARSE_STEP / 6));
    }
  }
  /** C(y) beyond the dense grid, or null when the chain is undefined on the way there.
   *  @param {PeriodSecondsAtAge} periodFnSeconds @param {Float64Array} tab @param {number} y @returns {number | null} */
  function coarseAt(periodFnSeconds, tab, y) {
    let c = coarse.get(periodFnSeconds);
    if (!c) {
      c = { fwd: { cum: [tab[tab.length - 1]], ok: true }, bwd: { cum: [tab[0]], ok: true } };
      coarse.set(periodFnSeconds, c);
    }
    const dir = y >= gridMaxYear ? 1 : -1;
    const side = dir === 1 ? c.fwd : c.bwd;
    const edgeYear = dir === 1 ? gridMaxYear : gridMinYear;
    const distance = Math.abs(y - edgeYear);
    if (distance > COARSE_LIMIT_YEARS) return null;
    if (side.cum.length < Math.ceil(distance / COARSE_STEP) + 1) growCoarse(periodFnSeconds, side, edgeYear, dir, distance);
    if (!side.ok || side.cum.length < Math.ceil(distance / COARSE_STEP) + 1) return null;
    const idxF = distance / COARSE_STEP;
    const i = Math.floor(idxF);
    return side.cum[i] + (idxF - i) * (side.cum[i + 1] - side.cum[i]);
  }
  /** C(y) anywhere the tables reach: dense inside the grid, coarse beyond.
   *  @param {PeriodSecondsAtAge} periodFnSeconds @param {Float64Array} tab @param {number} y @returns {number | null} */
  function cumulativeAt(periodFnSeconds, tab, y) {
    return (y > gridMinYear && y < gridMaxYear) ? tableAt(tab, y) : coarseAt(periodFnSeconds, tab, y);
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

    // Cumulative-table fast path (deterministic, call-order independent): the
    // dense grid inside ±250 kyr — byte-identical to before — and the lazily
    // grown coarse extension beyond it.
    const tab = table(periodFnSeconds);
    if (tab !== null) {
      if (yearA > gridMinYear && yearA < gridMaxYear && yearB > gridMinYear && yearB < gridMaxYear) {
        return tableAt(tab, yearB) - tableAt(tab, yearA);
      }
      const cA = cumulativeAt(periodFnSeconds, tab, yearA), cB = cumulativeAt(periodFnSeconds, tab, yearB);
      if (cA !== null && cB !== null) return cB - cA;
    }

    let cache = caches.get(periodFnSeconds);
    if (!cache) {
      cache = new Map();
      caches.set(periodFnSeconds, cache);
    }
    const cacheKey = yearA + '|' + yearB;
    const hit = cache.get(cacheKey);
    if (hit !== undefined) return hit;

    // Adaptive Simpson (a chain undefined in range, or beyond the coarse limit):
    // ~1 sample per 1 kyr, capped at 1024 to bound per-call cost.
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
      const integrand = tropicalYearJ2000Seconds / tPeriodS;  // cycles per tick (one SI year)
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
