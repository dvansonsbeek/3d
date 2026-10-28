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
 * anchored at the dense edge; read with a 3-point Simpson over the partial
 * cell, so the count's RATE is continuous — plan 23 follow-up, see the tier
 * note below) in 250-kyr SEGMENTS with separate segment prefixes (plan 25 —
 * the lunar cumulative bank seats the prefixes, the association is the same
 * with and without it), grown lazily in the direction
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
 *   checkpoints?: { chains?: Record<string, { fwd: number[], bwd: number[] }> } | null,
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
  // PLAN 25 — the lunar cumulative bank (data/lunar-cumulative-checkpoints.json, parsed): per named
  // chain the coarse tier's segment prefixes in both directions; null/absent = compute them.
  checkpoints = null,
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
  // with the same 3-point Simpson as the dense grid; the read is a 3-point
  // Simpson over the partial cell from the cell's start (three integrand
  // evaluations per read), NOT the dense grid's linear interpolation: a
  // linear read makes the count's rate piecewise constant per cell, and the
  // of-date node and perigee are SMALL differences of two large counts
  // (N_drac − N_trop: 13.4 − 13.37 cycles/yr), so each table's per-cell slope
  // step — 1e-6 of its own rate, the month's tidal drift over 1 kyr — landed
  // fully on the difference: a ±0.3-d sawtooth per cell on the node period
  // beyond ±250 kyr (measured on the Node Regression panel, plan 23
  // follow-up). On the dense 10-yr grid the same step is 100× smaller and
  // below every reader, so its linear read — the byte-identical in-window
  // path — stays. The period laws vary on Myr scales at deep time, so 1-kyr
  // cells hold the count to far below a cycle — the old fallback sampled
  // ~1 per kyr too, but re-did the whole span on every call.
  // PLAN 25 — THE SEGMENTED ASSOCIATION. The coarse table was ONE running sum
  // from the dense edge; it is now SEGMENTS of COARSE_SEGMENT_CELLS cells
  // (250 kyr, the checkpoint spacing of the lunar cumulative bank): inside a
  // segment the cells sum from zero (S_k[j]), and the segment prefixes
  // P[k+1] = P[k] + S_k[last] are kept apart, so the value at a cell is the
  // two-term sum P[k] + S_k[j]. The lunar bank (data/lunar-cumulative-
  // checkpoints.json) stores exactly the P[k] this recursion produces, and a
  // runtime seated on it computes only the segment it reads — the SAME doubles
  // in the SAME order as the no-bank path, so the bank is a seat, never a
  // value (the sampler-purity gate's lunar rows pin it bit-exact). The former
  // contiguous sum differed from this association at the rounding level
  // beyond ±250 kyr (1e-16 of 650 million months, 0.02″ of lunar longitude);
  // inside the dense grid nothing changed.
  const COARSE_STEP = 1000, COARSE_SEGMENT_CELLS = 250, COARSE_LIMIT_YEARS = 600e6;
  const COARSE_SEGMENT_YEARS = COARSE_STEP * COARSE_SEGMENT_CELLS;
  // The seat's relative bound on the edge value (measured 2026-10-28: the chain counts agree across
  // Chromium and Node to the last bit, the obliquity carrier — an integrand of nearly equal
  // obliquities — to 2.4e-9; a counterfactual constant moves an edge by its own class, ≥ 1e-6).
  // The perf gate asserts every seat took, so a runtime split beyond this bound fails loudly.
  const SEAT_REL_TOL = 1e-7;
  /** @typedef {{ P: number[], segs: Map<number, number[]>, ok: boolean, banked: number }} CoarseSide
   *  P[k] = the cumulative value at the start of segment k (P[0] = the dense edge's);
   *  segs.get(k) = the within-segment prefix sums S_k[0..COARSE_SEGMENT_CELLS], S_k[0] = 0;
   *  banked = how many P entries came from the bank (never recomputed). */
  /** @type {WeakMap<PeriodSecondsAtAge, { fwd: CoarseSide, bwd: CoarseSide }>} */
  const coarse = new WeakMap();
  /** @type {WeakMap<PeriodSecondsAtAge, string>} */
  const chainNames = new WeakMap();
  /** @type {PeriodSecondsAtAge[]} the named chains, for the seat diagnostic (a WeakMap cannot be iterated) */
  const namedChains = [];
  /** @param {PeriodSecondsAtAge} periodFnSeconds @param {number} y @returns {number | null} cycles per tick */
  const integrandAt = (periodFnSeconds, y) => {
    const tPeriodS = periodFnSeconds((ageAnchorYear - y) / 1e6);
    return tPeriodS === null ? null : tropicalYearJ2000Seconds / tPeriodS;
  };
  /** The within-segment prefix sums of segment k (built once; null on an undefined chain).
   *  @param {PeriodSecondsAtAge} periodFnSeconds @param {CoarseSide} side @param {number} edgeYear
   *  @param {1|-1} dir @param {number} k @returns {number[] | null} */
  function segment(periodFnSeconds, side, edgeYear, dir, k) {
    let S = side.segs.get(k);
    if (S) return S;
    S = [0];
    const base = edgeYear + dir * k * COARSE_SEGMENT_YEARS;
    for (let j = 1; j <= COARSE_SEGMENT_CELLS; j++) {
      const y0 = base + dir * (j - 1) * COARSE_STEP, y1 = y0 + dir * COARSE_STEP;
      const f0 = integrandAt(periodFnSeconds, y0), fm = integrandAt(periodFnSeconds, (y0 + y1) / 2), f1 = integrandAt(periodFnSeconds, y1);
      if (f0 === null || fm === null || f1 === null) { side.ok = false; return null; }
      S.push(S[j - 1] + dir * (f0 + 4 * fm + f1) * (COARSE_STEP / 6));
    }
    side.segs.set(k, S);
    return S;
  }
  /** Make P[0..k] exist: segments before k are summed from their own zero and
   *  chained — unless the bank supplied them. @param {PeriodSecondsAtAge} periodFnSeconds
   *  @param {CoarseSide} side @param {number} edgeYear @param {1|-1} dir @param {number} k */
  function prefixesTo(periodFnSeconds, side, edgeYear, dir, k) {
    for (let m = side.P.length - 1; m < k && side.ok; m++) {
      const S = segment(periodFnSeconds, side, edgeYear, dir, m);
      if (!S) return;
      side.P.push(side.P[m] + S[COARSE_SEGMENT_CELLS]);
    }
  }
  /** The two sides of a chain's coarse tier, the bank's prefixes seated when the chain is named there.
   *  @param {PeriodSecondsAtAge} periodFnSeconds @param {Float64Array} tab */
  function coarseSides(periodFnSeconds, tab) {
    let c = coarse.get(periodFnSeconds);
    if (!c) {
      c = { fwd: { P: [tab[tab.length - 1]], segs: new Map(), ok: true, banked: 0 }, bwd: { P: [tab[0]], segs: new Map(), ok: true, banked: 0 } };
      const name = chainNames.get(periodFnSeconds);
      const bankedChain = name && checkpoints && checkpoints.chains ? checkpoints.chains[name] : undefined;
      if (bankedChain) {
        // The bank's P[0] is the dense edge's value too, so it must agree with ours — a bank
        // made on another configuration is refused here (the freshness gate and createModel's
        // constants guard are the real fences). The agreement is a RELATIVE one, not bit-exact:
        // the browser's V8 and Node's differ at the last bit on ~6 % of transcendental
        // arguments (doc 111 §1.29), so a bit-exact check silently refused every seat in the
        // browser and the tables walked the whole span (measured: 215 s at −400 Myr with both
        // banks "landed"). Seated, the browser's deep tables carry Node's last-bit arithmetic,
        // as its deep spin walk already does since plan 24; within one runtime the seat is
        // bit-identical to the unseeded path (the purity gate's lunar rows).
        for (const [key, side] of /** @type {Array<['fwd'|'bwd', CoarseSide]>} */ ([['fwd', c.fwd], ['bwd', c.bwd]])) {
          const arr = bankedChain[key];
          if (Array.isArray(arr) && arr.length > 1 && Math.abs(arr[0] - side.P[0]) <= SEAT_REL_TOL * Math.max(1, Math.abs(side.P[0]))) { side.P = arr.slice(); side.banked = arr.length; }
        }
      }
      coarse.set(periodFnSeconds, c);
    }
    return c;
  }
  /** C(y) beyond the dense grid, or null when the chain is undefined on the way there.
   *  @param {PeriodSecondsAtAge} periodFnSeconds @param {Float64Array} tab @param {number} y @returns {number | null} */
  function coarseAt(periodFnSeconds, tab, y) {
    const c = coarseSides(periodFnSeconds, tab);
    const dir = y >= gridMaxYear ? 1 : -1;
    const side = dir === 1 ? c.fwd : c.bwd;
    const edgeYear = dir === 1 ? gridMaxYear : gridMinYear;
    const distance = Math.abs(y - edgeYear);
    if (distance > COARSE_LIMIT_YEARS) return null;
    const i = Math.floor(distance / COARSE_STEP);
    const k = Math.floor(i / COARSE_SEGMENT_CELLS), j = i - k * COARSE_SEGMENT_CELLS;
    if (side.P.length <= k) prefixesTo(periodFnSeconds, side, edgeYear, dir, k);
    if (!side.ok || side.P.length <= k) return null;
    const S = segment(periodFnSeconds, side, edgeYear, dir, k);
    if (!S) return null;
    const cellStart = side.P[k] + S[j];
    // the partial cell from its start y0 to y: a 3-point Simpson, signed by (y − y0)
    const y0 = edgeYear + dir * i * COARSE_STEP;
    if (y === y0) return cellStart;
    const f0 = integrandAt(periodFnSeconds, y0), fm = integrandAt(periodFnSeconds, (y0 + y) / 2), f1 = integrandAt(periodFnSeconds, y);
    if (f0 === null || fm === null || f1 === null) return null;
    return cellStart + (f0 + 4 * fm + f1) * ((y - y0) / 6);
  }
  /** Name a chain so the lunar bank's prefixes can seat it (plan 25). The three twins name the
   *  same five chains; an unnamed chain never seats and never records.
   *  @param {string} name @param {PeriodSecondsAtAge} periodFnSeconds */
  function nameChain(name, periodFnSeconds) { chainNames.set(periodFnSeconds, name); if (!namedChains.includes(periodFnSeconds)) namedChains.push(periodFnSeconds); }
  /** THE GENERATOR'S HOOK (plan 25): the segment prefixes P[0..K] of a chain's coarse tier in both
   *  directions, computed by the recursion above from the chain's own dense edge — the arrays the
   *  bank stores. K = the number of whole segments inside limitYears from the edge.
   *  @param {PeriodSecondsAtAge} periodFnSeconds @param {number} limitYears
   *  @returns {{ fwd: number[], bwd: number[], segmentYears: number } | null} */
  function recordSegmentPrefixes(periodFnSeconds, limitYears) {
    const tab = table(periodFnSeconds);
    if (tab === null) return null;
    const c = coarseSides(periodFnSeconds, tab);
    const K = Math.floor(Math.min(limitYears, COARSE_LIMIT_YEARS) / COARSE_SEGMENT_YEARS);
    prefixesTo(periodFnSeconds, c.fwd, gridMaxYear, 1, K);
    prefixesTo(periodFnSeconds, c.bwd, gridMinYear, -1, K);
    if (!c.fwd.ok || !c.bwd.ok) return null;
    return { fwd: c.fwd.P.slice(0, K + 1), bwd: c.bwd.P.slice(0, K + 1), segmentYears: COARSE_SEGMENT_YEARS };
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

  /** THE SEAT DIAGNOSTIC (plan 25): for every named chain, whether the bank's prefixes seated and the
   *  two edge values compared (ours, the bank's) per direction — the perf gate asserts every seat took,
   *  a probe reads why one did not. Forces the dense table and the coarse sides of each named chain.
   *  @returns {Record<string, { fwd: {banked: number, edge: number, bankEdge: number | null}, bwd: {banked: number, edge: number, bankEdge: number | null} } | null>} */
  function seatStatus() {
    /** @type {Record<string, any>} */
    const out = {};
    const named = /** @type {Array<[PeriodSecondsAtAge, string]>} */ ([]);
    // WeakMap has no iteration: the names are re-collected from the chains the caller named through nameChain
    for (const fn of namedChains) { const n = chainNames.get(fn); if (n) named.push([fn, n]); }
    for (const [fn, n] of named) {
      const tab = table(fn);
      if (tab === null) { out[n] = null; continue; }
      const c = coarseSides(fn, tab);
      const b = checkpoints && checkpoints.chains ? checkpoints.chains[n] : undefined;
      out[n] = {
        fwd: { banked: c.fwd.banked, edge: c.fwd.P[0], bankEdge: b && Array.isArray(b.fwd) ? b.fwd[0] : null },
        bwd: { banked: c.bwd.banked, edge: c.bwd.P[0], bankEdge: b && Array.isArray(b.bwd) ? b.bwd[0] : null },
      };
    }
    return out;
  }
  return { cyclesBetween, nameChain, recordSegmentPrefixes, seatStatus, coarseSegmentYears: COARSE_SEGMENT_YEARS, coarseLimitYears: COARSE_LIMIT_YEARS };
}

module.exports = { createChainCycleIntegrator };
