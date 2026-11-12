/**
 * The DEEP Earth-eccentricity channel — engine-switch Stage B, the T5d-(d)
 * decision (ii) (plan 02 §8, owner-approved MODEL CHANGE, pre-registered
 * acceptance in the same record).
 *
 * Evaluates Earth's e(t) from the engine's own ±10-Myr NAFF mode table
 * (data/nbody-deep-secular-modes.json, embedded verbatim by generate.mjs as
 * deep-modes-artifact.cjs) in the ANCHORED form the era chain also uses:
 *
 *     z(t) = Σ (re + i·im)·e^{iωt} + (z_J2000 − Σ(0)),   e = |z|
 *
 * — the constant remainder pins the unresolved short/ultra-long content at
 * the JPL J2000 seed anchor, so e(J2000) is exact by construction.
 *
 * DOMAIN (decision (ii)): the ENTIRE lunar chain reads THIS channel — eccAt
 * (the Δe² argument terms), channelIntegral (perigee/node of-date rates),
 * modulation (the month/precession chain and its integrated cycle counts),
 * eFactorAt (the Meeus E-factor). Earth's eccentricity of date is the
 * N-body series on every other path as well (plan 21: one e-vector of date
 * on every surface).
 *
 * MEASURED at adoption (banked in the plan record): the attractor-mean
 * modulation shifts were +2,526 ppm (perigee channel) and +1,067 ppm (node)
 * against the single-line law it replaced — month/LOD shifts of ~10–25 ppm
 * class, all 41 paleo anchors in bands; the ancient eclipse stack's cycle
 * counts shift (χ² IMPROVES — recorded with its explanation: this e is
 * La2004-corroborated in-era; theory-corroborated, never tuned). Beyond
 * ~5 Myr the table is spectrum-class (phases decohere) — the quasi-periodic
 * ATTRACTOR (mean e and the 405-kyr-class beat structure) is the claim,
 * never a pointwise ephemeris.
 *
 * LOAD-BEARING conventions (the certified numerics):
 *  - channelIntegral uses composite Simpson with step ≤ ~4,000 yr
 *    (N ≥ 2, even) inside |T| ≤ 2,500 cy — the certified era form, verbatim —
 *    and the same 4-kyr Simpson cells on a SEGMENTED cumulative table beyond
 *    (plan 27, doc 111 §1.36: pure in T, O(1) per read after a one-time walk);
 *  - modulation(tMa, s) takes age in Myr, positive = past, ≡ 1 at J2000;
 *  - eFactorAt(tYr) = eccAt(tYr) / e0, ≡ 1 at J2000.
 */

'use strict';

/**
 * THE SLOPE ANCHOR (owner-approved model change, after the Moon panels).
 * The 18-term table reproduces the attractor and the 405-kyr beat, but
 * nothing constrained its local DERIVATIVE at J2000: measured, its ė read
 * −5.00e-5/cy against the run's own −4.24e-5 (and the observed −4.20e-5),
 * a 19 % slope error that the lunar chain multiplied straight into the
 * perigee and node curvature (−44″/cy² against Meeus's −37″/cy² — the
 * "18 % split" the Moon precession panels showed). Against the ±10-Myr
 * series the table compresses, the error is a LINEAR vector drift of
 * 2.25e-4 per kyr out to ±20 kyr (an unresolved ultra-long mode), then
 * spectrum-class either way. So the anchored form gains a second,
 * BOUNDED term of the same class as the constant remainder:
 *
 *     z(t) = Σ … + (z_J2000 − Σ(0)) + (ż_J2000 − Σ̇(0))·I(t),
 *     I(t) = ∫₀ᵗ cos²(π τ / 2T_q) dτ  (the arguments' taper: linear near
 *            J2000, saturating at ±T_q/2 beyond |t| ≥ T_q)
 *
 * — ż_J2000 is the run's own z-rate at J2000 (script-written into the
 * artifact by generate.mjs from the banked series: "we are the source"),
 * T_q the arguments' secular-completion taper (SECULAR_COMPLETION_TAPER_YEARS,
 * the one the rate anchors ride). Inside the canon it
 * restores the run's slope exactly; beyond ±T_q it is a constant vector
 * offset of ~3e-3, the size of the table's own spectrum-class scatter
 * there, never a growing polynomial. Absent the two fields (an older
 * artifact), the channel is the value-anchored form above, unchanged.
 *
 * @param {{
 *   earthZ: ReadonlyArray<{omegaRadPerYr: number, re: number, im: number}>,
 *   anchorE: number,
 *   anchorPeriEclipticDeg: number,
 *   anchorZDotPerYr?: ReadonlyArray<number>,
 *   slopeTaperYears?: number,
 * }} artifact — the embedded deep-modes artifact (earth z-modes + the J2000
 *   anchor pair joined from the chain artifact's one home, + the J2000
 *   z-rate pair and the taper from the series' one home).
 */
function createDeepEccChannel({ earthZ, anchorE, anchorPeriEclipticDeg, anchorZDotPerYr, slopeTaperYears }) {
  const D2R = Math.PI / 180;
  const zA = [anchorE * Math.cos(anchorPeriEclipticDeg * D2R), anchorE * Math.sin(anchorPeriEclipticDeg * D2R)];
  /** @param {number} tYr @returns {[number, number]} */
  const modeSum = (tYr) => {
    let re = 0, im = 0;
    for (const m of earthZ) {
      const c = Math.cos(m.omegaRadPerYr * tYr), s = Math.sin(m.omegaRadPerYr * tYr);
      re += m.re * c - m.im * s;
      im += m.re * s + m.im * c;
    }
    return [re, im];
  };
  /** dΣ/dt (per year) — analytic. @param {number} tYr @returns {[number, number]} */
  const modeSumRate = (tYr) => {
    let dx = 0, dy = 0;
    for (const m of earthZ) {
      const c = Math.cos(m.omegaRadPerYr * tYr), s = Math.sin(m.omegaRadPerYr * tYr);
      dx += m.omegaRadPerYr * (-m.re * s - m.im * c);
      dy += m.omegaRadPerYr * (m.re * c - m.im * s);
    }
    return [dx, dy];
  };
  const s0 = modeSum(0);
  const R = [zA[0] - s0[0], zA[1] - s0[1]];   // the constant remainder
  // the slope anchor: the run's J2000 z-rate minus the table's, through the taper
  const Tq = (anchorZDotPerYr && typeof slopeTaperYears === 'number' && slopeTaperYears > 0) ? slopeTaperYears : 0;
  const sDot0 = modeSumRate(0);
  const DZ = Tq > 0 && anchorZDotPerYr ? [anchorZDotPerYr[0] - sDot0[0], anchorZDotPerYr[1] - sDot0[1]] : [0, 0];
  /** ∫₀ᵗ cos²(π τ / 2T_q) dτ, saturating at ±T_q/2. @param {number} t */
  const iEnv = (t) => {
    if (Tq <= 0) return 0;
    if (Math.abs(t) >= Tq) return Math.sign(t) * Tq / 2;
    return t / 2 + (Tq / (2 * Math.PI)) * Math.sin(Math.PI * t / Tq);
  };
  /** cos²(π t / 2T_q), 0 beyond |t| ≥ T_q — dI/dt. @param {number} t */
  const env = (t) => (Tq <= 0 || Math.abs(t) >= Tq) ? 0 : Math.cos(Math.PI * t / (2 * Tq)) ** 2;

  // Exact-argument memo of e(tYr) — a pure dedupe (the deep-time chain's α memo pattern), not a
  // grid: the lunar node and perigee of date, and since plan 31 A the Laplace-plane regime inside
  // the precession rate, read the same age in the same pass; eviction through a ring of keys.
  const ECC_MEMO_MAX = 1 << 14;
  /** @type {Map<number, number>} */
  const eccMemo = new Map();
  const eccRing = new Float64Array(ECC_MEMO_MAX);
  let eccRingAt = 0;
  /** Earth's e at tYr years from J2000 (negative = past).
   *  @param {number} tYr @returns {number} */
  function eccAt(tYr) {
    const hit = eccMemo.get(tYr);
    if (hit !== undefined) return hit;
    const [x, y] = modeSum(tYr);
    const I = iEnv(tYr);
    const e = Math.hypot(x + R[0] + DZ[0] * I, y + R[1] + DZ[1] * I);
    if (eccMemo.size >= ECC_MEMO_MAX) eccMemo.delete(eccRing[eccRingAt]);
    eccRing[eccRingAt] = tYr;
    eccRingAt = (eccRingAt + 1) % ECC_MEMO_MAX;
    eccMemo.set(tYr, e);
    return e;
  }

  /** de/dyear — analytic: d|z|/dt = (z·ż)/|z|, the slope anchor's
   *  tapered rate included. @param {number} tYr @returns {number} */
  function eccRateAt(tYr) {
    const [x0, y0] = modeSum(tYr);
    const I = iEnv(tYr), E = env(tYr);
    const x = x0 + R[0] + DZ[0] * I, y = y0 + R[1] + DZ[1] * I;
    const [dx0, dy0] = modeSumRate(tYr);
    const dx = dx0 + DZ[0] * E, dy = dy0 + DZ[1] * E;
    const r = Math.hypot(x, y);
    return r === 0 ? 0 : (x * dx + y * dy) / r;
  }

  const e0 = eccAt(0);                          // ≡ anchorE by construction
  const g0 = Math.pow(1 - e0 * e0, -1.5);

  /** [g(e(t))/g₀]^s — the perigee/node rate modulation, ≡ 1 at J2000.
   *  tMa is age in Myr (positive = past, the deep-time chain convention).
   *  @param {number} tMa @param {number} s @returns {number} */
  function modulation(tMa, s) {
    if (tMa === 0) return 1;
    const e = eccAt(-tMa * 1e6);
    return Math.pow(Math.pow(1 - e * e, -1.5) / g0, s);
  }

  /** The channel-rate integrand at t (Julian centuries from J2000) for the exponent s.
   *  @param {number} t @param {number} s */
  const integrand = (t, s) => {
    const e = eccAt(t * 100);   // t in cy → years
    return Math.pow(Math.pow(1 - e * e, -1.5) / g0, s) - 1;
  };
  /** The era form: composite Simpson from 0 to T, step ≤ ~4 kyr (the era channel's certified
   *  discretization, verbatim). @param {number} T @param {number} s */
  function simpsonFromZero(T, s) {
    const N = Math.max(2, 2 * Math.ceil(Math.abs(T) * 100 / 8000));
    const h = T / N;
    let sum = integrand(0, s) + integrand(T, s);
    for (let i = 1; i < N; i++) sum += integrand(i * h, s) * (i % 2 ? 4 : 2);
    return sum * h / 3;
  }
  // ── Beyond the window: the SEGMENTED cumulative table (plan 27, doc 111 §1.36) ──
  // The per-call Simpson re-integrated from J2000 on every call: at the genesis edge 1.1 M
  // evaluations of the 18-mode series per call, two calls (perigee, node) per Moon read,
  // ~1 s per read — a landing on the edge read 11–21 s and its display rows 23–26 s with
  // both banks seated, all in this one function. Inside |T| ≤ CHANNEL_WINDOW_CY (the
  // carriers' fine range, the window the certified Moon rides) the era form stays
  // VERBATIM. Beyond, the same integrand on 40-cy (4-kyr) Simpson cells, 64 per 2,560-cy
  // segment, the segmented association the lunar tables use: a value is the window edge's
  // verbatim integral + P[k] + S_k[j] + the partial cell — the same doubles whichever T was
  // asked first (test:sampler-purity Twin 5), grown outward on demand and cached per s
  // (the one-time walk to the genesis is 2.2 M evaluations per exponent and direction; every
  // read after is three).
  //
  // SEATED IN THE LUNAR BANK (plan 27 §8 K): that one-time walk was the first landing on the
  // genesis edge — two exponents (perigee, node), 6.4 s of an 8.1-s first landing in Node on
  // ONE model, and the browser builds two (measured by table, scratchpad first-landing-steps).
  // The segment prefixes P[k] are the bank's `channel` section; a seated side sums only the
  // segment it reads — the same doubles in the same order as the walk (a seat, never a
  // value). The seat check is the carriers': the bank's window-edge integral against this
  // runtime's own to a RELATIVE 1e-7 (a bit-exact check refuses every seat in the browser,
  // whose V8 differs from Node's at the last bit — doc 111 §1.29).
  const CHANNEL_WINDOW_CY = 2500, CELL_CY = 40, SEGMENT_CELLS = 64;
  const SEGMENT_CY = SEGMENT_CELLS * CELL_CY;
  /** @typedef {{ edge: number, P: number[], segs: Map<number, number[]>, banked: number, bankEdge: number | null }} ChannelSide */
  /** @typedef {{ s: number, edge: { fwd: number, bwd: number }, fwd: number[], bwd: number[] }} ChannelBankEntry */
  /** @type {Map<number, { fwd: ChannelSide | null, bwd: ChannelSide | null }>} */
  const channelSides = new Map();
  /** @type {ChannelBankEntry[] | null} */
  let channelBank = null;
  /** The bank's entry for an exponent — matched to a relative 1e-9 (the sensitivities are
   *  derived doubles; the two runtimes may part at the last bit). @param {number} s */
  const bankEntryFor = (s) => (channelBank ? channelBank.find((e) => Math.abs(e.s - s) <= 1e-9 * Math.max(1, Math.abs(s))) : undefined);
  /** @param {number} s @param {1|-1} dir @returns {ChannelSide} */
  function channelSide(s, dir) {
    let pair = channelSides.get(s);
    if (!pair) { pair = { fwd: null, bwd: null }; channelSides.set(s, pair); }
    const key = dir === 1 ? 'fwd' : 'bwd';
    let side = pair[key];
    if (!side) {
      side = { edge: simpsonFromZero(dir * CHANNEL_WINDOW_CY, s), P: [0], segs: new Map(), banked: 0, bankEdge: null };
      const entry = bankEntryFor(s);
      const arr = entry ? entry[key] : undefined;
      if (entry && entry.edge && typeof entry.edge[key] === 'number') side.bankEdge = entry.edge[key];
      if (Array.isArray(arr) && arr.length > 1 && arr[0] === 0 && side.bankEdge !== null && Math.abs(side.bankEdge - side.edge) <= 1e-7 * Math.max(1, Math.abs(side.edge))) { side.P = arr.slice(); side.banked = arr.length; }
      pair[key] = side;
    }
    return side;
  }
  /** SEAT the segment prefixes on the lunar bank's `channel` section (null unseats). The sides
   *  built so far are dropped — their values are pure in T, the next read rebuilds its own.
   *  @param {{ exponents?: ChannelBankEntry[] } | null | undefined} bank */
  function seatPrefixes(bank) {
    channelBank = bank && Array.isArray(bank.exponents) ? bank.exponents : null;
    channelSides.clear();
  }
  /** THE GENERATOR'S HOOK (tools/verify/lunar-cumulative-bank.js): the segment prefixes of the
   *  given exponents in both directions, by the table's own recursion — K = the whole segments
   *  whose END lies within the limit OF J2000, the one rule of the banked tables.
   *  @param {number | {past: number, future: number}} limitCy Julian centuries
   *  @param {number[]} exponents
   *  @returns {{ windowCenturies: number, segmentCenturies: number, exponents: ChannelBankEntry[] }} */
  function recordPrefixes(limitCy, exponents) {
    const lim = typeof limitCy === 'number' ? { past: limitCy, future: limitCy } : limitCy;
    const upTo = (/** @type {number} */ s, /** @type {1|-1} */ dir, /** @type {number} */ limit) => {
      const side = channelSide(s, dir);
      const K = Math.max(0, Math.floor((limit - CHANNEL_WINDOW_CY) / SEGMENT_CY));
      for (let m = side.P.length - 1; m < K; m++) side.P.push(side.P[m] + channelSegment(side, s, dir, m)[SEGMENT_CELLS]);
      return side.P.slice(0, K + 1);
    };
    return {
      windowCenturies: CHANNEL_WINDOW_CY, segmentCenturies: SEGMENT_CY,
      exponents: exponents.map((s) => ({ s, edge: { fwd: channelSide(s, 1).edge, bwd: channelSide(s, -1).edge }, fwd: upTo(s, 1, lim.future), bwd: upTo(s, -1, lim.past) })),
    };
  }
  /** THE SEAT DIAGNOSTIC: per exponent and direction, how many prefixes the bank seated and the
   *  two window-edge integrals compared. Forces each side's window-edge integral.
   *  @param {number[]} exponents */
  function seatStatus(exponents) {
    const one = (/** @type {number} */ s, /** @type {1|-1} */ dir) => { const side = channelSide(s, dir); return { banked: side.banked, edge: side.edge, bankEdge: side.bankEdge }; };
    return exponents.map((s) => ({ s, fwd: one(s, 1), bwd: one(s, -1) }));
  }
  /** Segment k's within-segment prefix sums S_k[0..SEGMENT_CELLS] (built once).
   *  @param {ChannelSide} side @param {number} s @param {1|-1} dir @param {number} k */
  function channelSegment(side, s, dir, k) {
    let S = side.segs.get(k);
    if (S) return S;
    S = [0];
    const base = dir * (CHANNEL_WINDOW_CY + k * SEGMENT_CELLS * CELL_CY);
    let f0 = integrand(base, s);
    for (let j = 1; j <= SEGMENT_CELLS; j++) {
      const t0 = base + dir * (j - 1) * CELL_CY, t1 = t0 + dir * CELL_CY;
      const fm = integrand((t0 + t1) / 2, s), f1 = integrand(t1, s);
      S.push(S[j - 1] + (f0 + 4 * fm + f1) * (dir * CELL_CY / 6));
      f0 = f1;
    }
    side.segs.set(k, S);
    return S;
  }
  /** ∫₀ᵀ [(g(e(t′))/g₀)^s − 1] dt′ in Julian centuries — the phase-aware
   *  channel-rate integral: the era form inside the window, the table beyond.
   *  @param {number} T @param {number} s @returns {number} */
  function channelIntegral(T, s) {
    if (T === 0) return 0;
    if (Math.abs(T) <= CHANNEL_WINDOW_CY) return simpsonFromZero(T, s);
    const dir = T > 0 ? 1 : -1;
    const side = channelSide(s, dir);
    const dist = Math.abs(T) - CHANNEL_WINDOW_CY;
    const i = Math.floor(dist / CELL_CY), k = Math.floor(i / SEGMENT_CELLS), j = i - k * SEGMENT_CELLS;
    for (let m = side.P.length - 1; m < k; m++) side.P.push(side.P[m] + channelSegment(side, s, dir, m)[SEGMENT_CELLS]);
    const S = channelSegment(side, s, dir, k);
    const t0 = dir * (CHANNEL_WINDOW_CY + i * CELL_CY);
    const partial = T === t0 ? 0 : (integrand(t0, s) + 4 * integrand((t0 + T) / 2, s) + integrand(T, s)) * ((T - t0) / 6);
    return side.edge + side.P[k] + S[j] + partial;
  }

  /** Bounded Meeus E-factor: E ≡ e(t)/e(J2000), ≡ 1 at J2000.
   *  @param {number} tYr @returns {number} */
  function eFactorAt(tYr) {
    return eccAt(tYr) / e0;
  }

  return { eccAt, eccRateAt, modulation, channelIntegral, eFactorAt, e0, g0, seatPrefixes, recordPrefixes, seatStatus };
}

module.exports = { createDeepEccChannel };
