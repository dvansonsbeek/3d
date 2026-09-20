/**
 * THE DEEP ORBITAL HISTORY FACTORY — the ONE home for the Stage-C hybrid
 * mathematics (plan 02 §8, C-3): Earth's deep-time orbital quantities from
 * the engine's own governed mode tables, and the obliquity hybrid
 *
 *     ds/dt = α (ŝ·n̂)(ŝ×n̂),   α = ψ̇_J2000 / cos ε₀
 *
 * with the orbit normal n̂(t) from an anchored ζ mode-sum and ψ̇_J2000 the
 * injected engine-K anchor (the equinox-precession rate measured from the
 * engine's own year lengths). ZERO fitted constants; the J2000 celestial
 * pole sits at ecliptic longitude +90° (s₀ = (0, +sin ε₀, cos ε₀) — the
 * −90° choice anti-correlates perfectly, the recorded convention catch).
 *
 * Consumers (each injecting its own certified surfaces, cross-engine
 * matched): the Stage-C lab / verdict generator (both ζ tiers), the Node
 * shim tools/lib/deep-orbital-history.js (the deep insolation extractor),
 * and the browser's published ε surfaces (VFP chart, Earth-panel row) via
 * the generated deep-modes embed. The ERA machinery (frame conversions,
 * lunar D5, besselian, the scene's A-solve and Step 6b) stays on the
 * certified fitted law — measured: the hybrid differs from it by 5″ rms in
 * 1900–2100 / 19.5″ in 1600–2400, mostly hybrid-side there — the same
 * certification split as e and ϖ.
 *
 * The climatic precession is the PHYSICAL of-date angle from the moving
 * equinox γ = unit(ŝ×n̂) to the perihelion direction, measured in the orbit
 * plane about n̂ — no linear-precession approximation at any epoch
 * (validated: reproduces the J2000 ecliptic longitude and La2004's
 * e·sin ϖ̃ exactly at t = 0).
 */

'use strict';

/**
 * @param {{
 *   zModes: ReadonlyArray<{omegaRadPerYr: number, re: number, im: number}>,
 *   zetaModes: ReadonlyArray<{omegaRadPerYr: number, re: number, im: number}>,
 *   zetaSeries?: {t0Yr: number, stepYr: number,
 *                 q: ReadonlyArray<number>, p: ReadonlyArray<number>},
 *   zSeries?: {t0Yr: number, stepYr: number,
 *              q: ReadonlyArray<number>, p: ReadonlyArray<number>},
 *   anchorE: number,
 *   anchorPeriEclipticDeg: number,
 *   anchorInclEclipticDeg: number,
 *   anchorAscNodeEclipticDeg: number,
 *   axialPrecessionYearsJ2000: number,
 *   obliquityJ2000Deg: number,
 *   axialPrecessionYearsAtYearFn?: (year: number) => number,
 * }} deps — mode tables from the governed deep artifact (choose the ζ tier
 *   per consumer: era = its own 8-term extraction, deep = the 16-term
 *   table; NEVER a slice); anchors from the chain artifact's one home; the
 *   axial-precession years and ε₀ from the injecting engine's certified
 *   surfaces. zetaSeries (C-2, the ONE-SOURCE evaluator): the BANKED engine
 *   ζ series (data/nbody-earth-zeta-series.json) — when supplied, n̂(t)
 *   reads the series itself inside its span (no mode extraction, no tiers;
 *   measured at the 500-yr artifact cadence: 0.16″/0.18″ rms vs IAU-2006
 *   over 1900–2100/1600–2400 vs the era tier's 0.31″/0.63″, and 0.0396°
 *   vs La2004 over −200 kyr vs the deep tier's 0.069° — the C-1 verdict,
 *   plan 02) and zetaModes serves only as the TAIL beyond the span (the
 *   seam at the span edge is the extraction residual, far outside every
 *   certified window).
 */
function createDeepOrbitalHistory({
  zModes, zetaModes, zetaSeries, zSeries,
  anchorE, anchorPeriEclipticDeg, anchorInclEclipticDeg, anchorAscNodeEclipticDeg,
  axialPrecessionYearsJ2000, obliquityJ2000Deg,
  axialPrecessionYearsAtYearFn,
}) {
  const D2R = Math.PI / 180, R2D = 180 / Math.PI;

  const mkAnchored = (
    /** @type {ReadonlyArray<{omegaRadPerYr: number, re: number, im: number}>} */ modes,
    /** @type {[number, number]} */ anchor,
  ) => {
    const sum = (/** @type {number} */ t) => {
      let re = 0, im = 0;
      for (const m of modes) {
        const c = Math.cos(m.omegaRadPerYr * t), s = Math.sin(m.omegaRadPerYr * t);
        re += m.re * c - m.im * s;
        im += m.re * s + m.im * c;
      }
      return [re, im];
    };
    const s0 = sum(0), R = [anchor[0] - s0[0], anchor[1] - s0[1]];
    return (/** @type {number} */ t) => { const [x, y] = sum(t); return [x + R[0], y + R[1]]; };
  };
  // CO-ROTATING anchor (the ϖ̇ fix, measured): the DC residual above is a
  // spurious zero-frequency mode — it preserves the J2000 VALUE but dilutes
  // the local argument rate by |sum(0)|/|anchor| (z: 11.47 → 7.93″/yr, a
  // 92 s-class anomalistic-year bias in the mode tier). Here the residual
  // ROTATES at the raw sum's own local arg-rate g* = Im(ż·z̄)/|z|²
  // (analytic), so at t=0 both the value AND the rate are exact, and at
  // depth the residual is one |R|-amplitude term at a physical frequency
  // instead of a DC offset (deep envelope measured unchanged:
  // [0.0001, 0.0672] → [0.0003, 0.0678] over 10–50 Myr).
  // z ONLY: ζ keeps the DC anchor DELIBERATELY — its anchor is ~0 by
  // definition (Earth's inclination to the J2000 ecliptic at J2000), i.e.
  // the coordinate origin; a rotating residual there would inject a fake
  // wobble into n̂(t).
  const mkAnchoredCoRot = (
    /** @type {ReadonlyArray<{omegaRadPerYr: number, re: number, im: number}>} */ modes,
    /** @type {[number, number]} */ anchor,
  ) => {
    const sum = (/** @type {number} */ t) => {
      let re = 0, im = 0;
      for (const m of modes) {
        const c = Math.cos(m.omegaRadPerYr * t), s = Math.sin(m.omegaRadPerYr * t);
        re += m.re * c - m.im * s;
        im += m.re * s + m.im * c;
      }
      return [re, im];
    };
    let q0 = 0, p0 = 0, dq0 = 0, dp0 = 0;
    for (const m of modes) {
      q0 += m.re; p0 += m.im;
      dq0 += -m.omegaRadPerYr * m.im;
      dp0 += m.omegaRadPerYr * m.re;
    }
    const gStar = (dp0 * q0 - dq0 * p0) / (q0 * q0 + p0 * p0);
    const R = [anchor[0] - q0, anchor[1] - p0];
    return (/** @type {number} */ t) => {
      const [x, y] = sum(t);
      const c = Math.cos(gStar * t), s = Math.sin(gStar * t);
      return [x + R[0] * c - R[1] * s, y + R[0] * s + R[1] * c];
    };
  };
  const s2h = Math.sin(anchorInclEclipticDeg / 2 * D2R);
  const zetaAnchor = /** @type {[number, number]} */ (
    [s2h * Math.cos(anchorAscNodeEclipticDeg * D2R), s2h * Math.sin(anchorAscNodeEclipticDeg * D2R)]);
  const zetaModeSum = mkAnchored(zetaModes, zetaAnchor);
  // C-2 one-source path: inside the banked series span, n̂(t) reads the
  // engine's own ζ series (anchored at J2000 exactly like the mode sums);
  // outside it, the anchored mode sum is the tail. Without zetaSeries the
  // mode sum serves at every t — the pre-C-2 behavior, bit-identical.
  // C1 series interpolation (D4g, measured): the 500-yr LINEAR series lerp
  // put kinks in n̂(t)/z(t) at its nodes, and the equinox RATE inherited
  // them — the grid-dependent bump around J2000 in per-year P(t) (the same
  // interpolation-order disease as the spin grid, one level down). Cubic
  // Hermite with central-difference node slopes (one-sided at the ends);
  // exact at nodes, so the J2000 anchors are unchanged.
  const mkSeriesCubic = (/** @type {number} */ t0Yr, /** @type {number} */ stepYr, /** @type {number} */ nS) =>
    (/** @type {ReadonlyArray<number>} */ arr, /** @type {number} */ tt) => {
      const x = (tt - t0Yr) / stepYr;
      const i = Math.max(0, Math.min(nS - 2, Math.floor(x)));
      const f = x - i;
      const y0 = arr[i], y1 = arr[i + 1];
      const m0 = i > 0 ? (y1 - arr[i - 1]) / 2 : y1 - y0;
      const m1 = i + 2 < nS ? (arr[i + 2] - y0) / 2 : y1 - y0;
      const f2 = f * f, f3 = f2 * f;
      return (2 * f3 - 3 * f2 + 1) * y0 + (f3 - 2 * f2 + f) * m0
        + (-2 * f3 + 3 * f2) * y1 + (f3 - f2) * m1;
    };
  let zetaAt = zetaModeSum;
  if (zetaSeries) {
    const { t0Yr, stepYr, q: sq, p: sp } = zetaSeries;
    const nS = sq.length, tEndYr = t0Yr + (nS - 1) * stepYr;
    const li = mkSeriesCubic(t0Yr, stepYr, nS);
    const R = [zetaAnchor[0] - li(sq, 0), zetaAnchor[1] - li(sp, 0)];
    zetaAt = (/** @type {number} */ t) => (t >= t0Yr && t <= tEndYr)
      ? [li(sq, t) + R[0], li(sp, t) + R[1]]
      : zetaModeSum(t);
  }
  const zAnchor = /** @type {[number, number]} */ (
    [anchorE * Math.cos(anchorPeriEclipticDeg * D2R), anchorE * Math.sin(anchorPeriEclipticDeg * D2R)]);
  const zModeSum = mkAnchoredCoRot(zModes, zAnchor);   // co-rotating residual — the ϖ̇ fix (see mkAnchoredCoRot)
  // C-4a: the z-side one-source path — same construction as zetaSeries
  // (anchored engine series inside the span, anchored mode sum as the tail).
  let zAt = zModeSum;
  if (zSeries) {
    const { t0Yr, stepYr, q: sq, p: sp } = zSeries;
    const nS = sq.length, tEndYr = t0Yr + (nS - 1) * stepYr;
    const li = mkSeriesCubic(t0Yr, stepYr, nS);   // C1 (see mkSeriesCubic)
    const R = [zAnchor[0] - li(sq, 0), zAnchor[1] - li(sp, 0)];
    zAt = (/** @type {number} */ t) => (t >= t0Yr && t <= tEndYr)
      ? [li(sq, t) + R[0], li(sp, t) + R[1]]
      : zModeSum(t);
  }

  /** @param {number} t */
  const inclNode = (t) => {
    const [q, p] = zetaAt(t);
    return { i: 2 * Math.asin(Math.min(1, Math.hypot(q, p))), Om: Math.atan2(p, q) };
  };
  /** @param {number} t */
  const orbitNormal = (t) => {
    const { i, Om } = inclNode(t);
    return [Math.sin(i) * Math.sin(Om), -Math.sin(i) * Math.cos(Om), Math.cos(i)];
  };

  const psiDot = (2 * Math.PI) / axialPrecessionYearsJ2000;
  const EPS0 = obliquityJ2000Deg * D2R;
  const ALPHA = psiDot / Math.cos(EPS0);
  // D1-revised (plan 02, owner 2026-09-13): when the injecting engine
  // supplies its epoch-aware axial-precession evaluator, α follows the
  // model's own deep-time rate — α(t) = ψ̇(t)/cos ε₀ — and the integrated
  // deep-time obliquity IS the sharpened falsification-leg-1 form (the
  // beat 2π/(ψ̇(t) − |s₃|), ψ̇ the COMPOSED lunisolar rate the injecting
  // engines build from earth/precession-composed (plan 06 D6), s₃
  // dynamical). No new constants: ψ̇(t)'s J2000 anchor is the same
  // certified year-length machinery; only its deep-time scaling is injected. Absent the option, α stays constant (the
  // pre-D1 ±Myr-class behavior, bit-identical).
  const alphaAtGeneral = axialPrecessionYearsAtYearFn
    ? (/** @type {number} */ t) =>
        ((2 * Math.PI) / axialPrecessionYearsAtYearFn(2000 + t)) / Math.cos(EPS0)
    : () => ALPHA;

  const cross = (/** @type {number[]} */ a, /** @type {number[]} */ b) =>
    [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const dot = (/** @type {number[]} */ a, /** @type {number[]} */ b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

  // THE LUNISOLAR SELF-ANCHOR (D4e — measured, plan 02): the injected
  // anchor axialPrecessionYearsJ2000 = sid/(sid−sol) is the GENERAL
  // precession period, but ŝ must precess at the LUNISOLAR rate — the
  // n̂(t) geometry supplies the planetary part itself, so integrating at
  // the general rate DOUBLE-COUNTS the planetary mean (measured:
  // −0.0966″/yr of equinox rate → +2.4 s of tropical year at J2000, and
  // 0.19% of ε wobble phasing — the dominant term of the old 0.039° rms
  // vs La2004 over −200 kyr; the lunisolar anchor collapses it to
  // 0.0048°). Self-anchored at construction, no pasted numbers: a one-RK4
  // -step probe at the general rate measures the realized equinox rate at
  // J2000; the deficit rescales α so the REALIZED general precession hits
  // the injected anchor exactly (dp/dα = 1 to first order — one
  // fixed-point step lands on target, measured). H(t) shape preserved
  // (constant factor on the caller's evaluator).

  // THE ANCHORED SPIN AXIS (measured): ε₀ is defined against the ECLIPTIC
  // — Earth's own mean orbit plane — never against the chain artifact's
  // coordinate pole. The anchor elements carry i₀ ≈ 0.37″ of integrator-
  // frame residue, and tilting ŝ(0) from the coordinate pole projected
  // −0.2865″ of it straight into ε(J2000) (the C-1 era gate's offset,
  // masked until the C1 series interpolation removed the lerp kink at the
  // J2000 node). Build ŝ(0) FROM n̂(0): tilt ε₀ about the J2000 equinox
  // direction projected into the orbit plane. Frame-invariant (the
  // artifact's coordinate frame drops out) and ε(J2000) ≡ ε₀ by
  // construction; reduces to [0, sin ε₀, cos ε₀] exactly when n̂(0) = ẑ.
  const S0A = (() => {
    const n0 = orbitNormal(0);
    const px = [1 - n0[0] * n0[0], -n0[0] * n0[1], -n0[0] * n0[2]];
    const pm = Math.hypot(px[0], px[1], px[2]);
    const u = [px[0] / pm, px[1] / pm, px[2] / pm];
    const v = cross(n0, u);
    return [0, 1, 2].map((i) => Math.cos(EPS0) * n0[i] + Math.sin(EPS0) * v[i]);
  })();

  const K_LUNI = (() => {
    const S0P = S0A;
    const dv = (/** @type {number[]} */ s, /** @type {number} */ t) => {
      const n = orbitNormal(t);
      const k = alphaAtGeneral(t) * dot(s, n);
      const c = cross(s, n);
      return [k * c[0], k * c[1], k * c[2]];
    };
    const step = (/** @type {number[]} */ s, /** @type {number} */ t, /** @type {number} */ h) => {
      const k1 = dv(s, t);
      const k2 = dv([s[0] + h / 2 * k1[0], s[1] + h / 2 * k1[1], s[2] + h / 2 * k1[2]], t + h / 2);
      const k3 = dv([s[0] + h / 2 * k2[0], s[1] + h / 2 * k2[1], s[2] + h / 2 * k2[2]], t + h / 2);
      const k4 = dv([s[0] + h * k3[0], s[1] + h * k3[1], s[2] + h * k3[2]], t + h);
      const o = [0, 1, 2].map((i) => s[i] + h / 6 * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]));
      const r = Math.hypot(o[0], o[1], o[2]);
      return [o[0] / r, o[1] / r, o[2] / r];
    };
    const eqLonDeg = (/** @type {number[]} */ s, /** @type {number} */ t) => {
      const n = orbitNormal(t);
      const g = cross(s, n);
      return Math.atan2(g[1], g[0]) * R2D;
    };
    const lM = eqLonDeg(step(S0P, 0, -0.5), -0.5);
    const lP = eqLonDeg(step(S0P, 0, +0.5), +0.5);
    const pProbeDegYr = ((lM - lP + 540) % 360) - 180;   // retrograde → positive
    const pTargetDegYr = 360 / axialPrecessionYearsJ2000;
    const psiDot0 = alphaAtGeneral(0) * Math.cos(EPS0);
    return (psiDot0 + (pTargetDegYr - pProbeDegYr) * D2R) / psiDot0;
  })();
  const alphaAt = (/** @type {number} */ t) => alphaAtGeneral(t) * K_LUNI;
  const deriv = (/** @type {number[]} */ s, /** @type {number} */ t) => {
    const n = orbitNormal(t);
    const k = alphaAt(t) * dot(s, n);
    const c = cross(s, n);
    return [k * c[0], k * c[1], k * c[2]];
  };
  const rk4 = (/** @type {number[]} */ s, /** @type {number} */ t, /** @type {number} */ h) => {
    const k1 = deriv(s, t);
    const k2 = deriv([s[0] + h / 2 * k1[0], s[1] + h / 2 * k1[1], s[2] + h / 2 * k1[2]], t + h / 2);
    const k3 = deriv([s[0] + h / 2 * k2[0], s[1] + h / 2 * k2[1], s[2] + h / 2 * k2[2]], t + h / 2);
    const k4 = deriv([s[0] + h * k3[0], s[1] + h * k3[1], s[2] + h * k3[2]], t + h);
    const o = [0, 1, 2].map((i) => s[i] + h / 6 * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]));
    const r = Math.hypot(o[0], o[1], o[2]);
    return [o[0] / r, o[1] / r, o[2] / r];
  };

  /** Equinox-node longitude only (J2000 ecliptic frame) — the light read
   *  used for the node-rate finite difference at store time. */
  function eqLonOnlyDeg(/** @type {number[]} */ s, /** @type {number} */ t) {
    const n = orbitNormal(t);
    const g = cross(s, n);
    return Math.atan2(g[1], g[0]) * R2D;
  }

  /** One quantity bundle at time t (years from J2000) from spin axis s. */
  function sampleAt(/** @type {number[]} */ s, /** @type {number} */ t) {
    const n = orbitNormal(t);
    const { i, Om } = inclNode(t);
    const [zx, zy] = zAt(t);
    const e = Math.hypot(zx, zy);
    const w = Math.atan2(zy, zx) - Om;
    const ph = [
      Math.cos(Om) * Math.cos(w) - Math.sin(Om) * Math.sin(w) * Math.cos(i),
      Math.sin(Om) * Math.cos(w) + Math.cos(Om) * Math.sin(w) * Math.cos(i),
      Math.sin(w) * Math.sin(i),
    ];
    const g = cross(s, n);
    const gn = Math.hypot(g[0], g[1], g[2]);
    const gu = [g[0] / gn, g[1] / gn, g[2] / gn];
    const cosA = dot(gu, ph);
    const sinA = dot(n, cross(gu, ph));
    const periOfDateDeg = ((Math.atan2(sinA, cosA) * R2D) % 360 + 360) % 360;
    return {
      epsDeg: Math.acos(Math.max(-1, Math.min(1, dot(s, n)))) * R2D,
      e,
      periOfDateDeg,
      eSinPeri: e * Math.sin(periOfDateDeg * D2R),
      eCosPeri: e * Math.cos(periOfDateDeg * D2R),
      inclEclDeg: i * R2D,
      // The equinox node (ŝ×n̂) longitude in the J2000 ecliptic frame —
      // its year-over-year retrograde advance IS the general precession of
      // date, wobble included (the n̂(t) geometry generates the equinox
      // wobble; ψ̇ itself is the secular α(H(t))). Consumers derive the
      // tropical year of date from it: T_trop = T_sid·(1 − p_yr/360°).
      // ⚠ RATE-CONSUMER CONTRACT (measured): this field's rate is correct
      // AS IS — α is self-anchored to the LUNISOLAR rate at construction
      // (K_LUNI, the one-RK4-step probe above), so the realized general
      // precession p_geom(J2000) equals 360/axialPrecessionYearsJ2000 by
      // construction. No correction, no δ subtraction. History (why this
      // contract exists): before the self-anchor, α carried the GENERAL
      // sid/(sid−sol) rate and the n̂(t) geometry re-added the planetary
      // mean — a double-count of +0.097″/yr ≈ +2.4 s of tropical year at
      // J2000 — and consumers had to subtract the runtime anchor
      //   δ = p_geom(J2000) − 360/axialPrecessionYearsJ2000.
      // A consumer may still measure δ at runtime as a SELF-CHECK; it
      // must read ≈0 (sub-1e-4 ″/yr class). The LONGITUDE itself is raw
      // geometry and has always needed no correction.
      equinoxLonJ2000Deg: ((Math.atan2(gu[1], gu[0]) * R2D) % 360 + 360) % 360,
      equinoxLonRateDegPerYr: 0,   // filled at store time (build's ±2.5-yr central difference)
    };
  }

  /**
   * Integrate once over [min(t0,t1,0), max(t0,t1,0)] and return a sampler
   * on a stepYr grid (linear interpolation; angles interpolated on the
   * wrapped difference). t in years from J2000, negative = past.
   * @param {number} t0Yr @param {number} t1Yr @param {number} stepYr
   */
  function build(t0Yr, t1Yr, stepYr) {
    const tMin = Math.min(t0Yr, t1Yr, 0), tMax = Math.max(t0Yr, t1Yr, 0);
    // D1 stepping contract: a build reaching beyond the ±50-kyr fine zone
    // integrates at 250-yr steps there, so its grid must be 250-aligned or
    // at() would meet missing keys. Fail loud, not subtly coarse.
    if (Math.max(Math.abs(tMin), Math.abs(tMax)) > 50000 && stepYr % 250 !== 0) {
      throw new Error(`deep-orbital-history: builds beyond ±50 kyr need stepYr % 250 === 0 (got ${stepYr})`);
    }
    const grid = new Map();
    const S0 = S0A;
    // D1-revised adaptive stepping: 5-yr RK4 near the era (the certified-
    // precision zone), 250-yr beyond ±50 kyr — still 103 steps per
    // precession cycle and ≥196 samples of the fastest ζ mode (49 kyr), so
    // the integration stays deep in RK4's convergence regime while ±500 Myr
    // becomes a seconds-class one-time build (measured: coarse-vs-fine
    // agree to <1e-4° at ±1 Myr — the generator's regression gate).
    // STRICT < so the walk switches AT the ±50,000 boundary (50,000 is
    // 250-aligned; switching one fine-step later would leave the coarse walk
    // permanently off-grid — measured: every key beyond ±50 kyr missing).
    const hStepAt = (/** @type {number} */ t) => (Math.abs(t) < 50000 ? 5 : 250);
    for (const dir of [-1, +1]) {
      let s = S0, t = 0;
      // Each stored node also carries the equinox-node RATE (deg/yr) from a
      // ±2.5-yr central difference on the integrator's own state — the C1
      // (Hermite) interpolation input. Linear interpolation of the node
      // longitude made the realized equinox rate PIECEWISE-CONSTANT per
      // grid cell — the report's per-year precession column showed flat
      // centuries with steps at the 1700/1800/1900/2000 cell edges
      // (measured; the levels were the real wobble at 100-yr resolution,
      // the staircase was this interpolation order).
      const storeWithRate = (/** @type {number} */ key, /** @type {number[]} */ sv, /** @type {number} */ tv) => {
        const smp = sampleAt(sv, tv);
        const hR = 2.5;
        const lp = eqLonOnlyDeg(rk4(sv, tv, +hR), tv + hR);
        const lm = eqLonOnlyDeg(rk4(sv, tv, -hR), tv - hR);
        smp.equinoxLonRateDegPerYr = (((lp - lm + 540) % 360) - 180) / (2 * hR);
        grid.set(key, smp);
      };
      storeWithRate(0, s, 0);
      const end = dir < 0 ? tMin : tMax;
      while (dir < 0 ? t > end : t < end) {
        const H_STEP = hStepAt(t);
        s = rk4(s, t, dir * H_STEP);
        t += dir * H_STEP;
        // Store ONLY at EXACT step multiples: an off-grid sample under a
        // ROUNDED key collides with (or shifts) a real grid node (measured
        // during C-3: build(+200, …, 1000) stored ε(+200) under key 0,
        // clobbering the t = 0 sample by 94″; and the D1 variable step made
        // the old |t % stepYr| < H_STEP/2 window store 250-yr samples under
        // 100-yr keys, 50 yr off). Exact alignment is guaranteed by the
        // guard below (coarse builds use 250-aligned grids; the 50,000-yr
        // zone boundary is itself 250-aligned, so the walk stays on-grid).
        if (Math.abs(t - Math.round(t / stepYr) * stepYr) < 1e-6) storeWithRate(Math.round(t / stepYr) * stepYr, s, t);
      }
    }
    return {
      /** @param {number} tYr */
      at(tYr) {
        const k0 = Math.floor(tYr / stepYr) * stepYr, k1 = k0 + stepYr;
        const a = grid.get(k0), b = grid.get(k1) ?? a;
        if (!a) throw new Error(`deep-orbital-history: ${tYr} outside the built range`);
        const f = (tYr - k0) / stepYr;
        const lerp = (/** @type {number} */ x, /** @type {number} */ y) => x + (y - x) * f;
        const dAng = (/** @type {number} */ x, /** @type {number} */ y) => x + (((y - x + 540) % 360) - 180) * f;
        return {
          epsDeg: lerp(a.epsDeg, b.epsDeg),
          e: lerp(a.e, b.e),
          periOfDateDeg: ((dAng(a.periOfDateDeg, b.periOfDateDeg) % 360) + 360) % 360,
          eSinPeri: lerp(a.eSinPeri, b.eSinPeri),
          eCosPeri: lerp(a.eCosPeri, b.eCosPeri),
          inclEclDeg: lerp(a.inclEclDeg, b.inclEclDeg),
          // C1 (cubic Hermite) — linear interpolation here made the
          // realized equinox RATE piecewise-constant per grid cell (the
          // measured per-year precession staircase). Node rates come from
          // the build's own ±2.5-yr central differences.
          equinoxLonJ2000Deg: (() => {
            const l0 = a.equinoxLonJ2000Deg;
            const dl = ((b.equinoxLonJ2000Deg - l0 + 540) % 360) - 180;   // unwrapped segment
            const m0 = a.equinoxLonRateDegPerYr * stepYr;
            const m1 = (b.equinoxLonRateDegPerYr ?? a.equinoxLonRateDegPerYr) * stepYr;
            const f2 = f * f, f3 = f2 * f;
            const v = (2 * f3 - 3 * f2 + 1) * l0 + (f3 - 2 * f2 + f) * m0
              + (-2 * f3 + 3 * f2) * (l0 + dl) + (f3 - f2) * m1;
            return ((v % 360) + 360) % 360;
          })(),
          equinoxLonRateDegPerYr: lerp(a.equinoxLonRateDegPerYr, b.equinoxLonRateDegPerYr ?? a.equinoxLonRateDegPerYr),
        };
      },
    };
  }

  return {
    build,
    alphaArcsecPerYr: ALPHA * R2D * 3600,   // the injected GENERAL-anchor form (input echo, unchanged semantics)
    // D4e diagnostics: the self-anchored lunisolar rate actually integrated.
    alphaLunisolarArcsecPerYr: ALPHA * K_LUNI * R2D * 3600,
    axialPrecessionYearsLunisolarJ2000: axialPrecessionYearsJ2000 / K_LUNI,
  };
}

module.exports = { createDeepOrbitalHistory };
