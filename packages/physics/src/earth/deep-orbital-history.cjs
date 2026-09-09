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
 *   anchorE: number,
 *   anchorPeriEclipticDeg: number,
 *   anchorInclEclipticDeg: number,
 *   anchorAscNodeEclipticDeg: number,
 *   axialPrecessionYearsJ2000: number,
 *   obliquityJ2000Deg: number,
 * }} deps — mode tables from the governed deep artifact (choose the ζ tier
 *   per consumer: era = its own 8-term extraction, deep = the 16-term
 *   table; NEVER a slice); anchors from the chain artifact's one home; the
 *   axial-precession years and ε₀ from the injecting engine's certified
 *   surfaces.
 */
function createDeepOrbitalHistory({
  zModes, zetaModes,
  anchorE, anchorPeriEclipticDeg, anchorInclEclipticDeg, anchorAscNodeEclipticDeg,
  axialPrecessionYearsJ2000, obliquityJ2000Deg,
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
  const s2h = Math.sin(anchorInclEclipticDeg / 2 * D2R);
  const zetaAt = mkAnchored(zetaModes,
    [s2h * Math.cos(anchorAscNodeEclipticDeg * D2R), s2h * Math.sin(anchorAscNodeEclipticDeg * D2R)]);
  const zAt = mkAnchored(zModes,
    [anchorE * Math.cos(anchorPeriEclipticDeg * D2R), anchorE * Math.sin(anchorPeriEclipticDeg * D2R)]);

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

  const cross = (/** @type {number[]} */ a, /** @type {number[]} */ b) =>
    [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const dot = (/** @type {number[]} */ a, /** @type {number[]} */ b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const deriv = (/** @type {number[]} */ s, /** @type {number} */ t) => {
    const n = orbitNormal(t);
    const k = ALPHA * dot(s, n);
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
    const grid = new Map();
    const S0 = [0, Math.sin(EPS0), Math.cos(EPS0)];
    const H_STEP = 5;
    for (const dir of [-1, +1]) {
      let s = S0, t = 0;
      grid.set(0, sampleAt(s, 0));
      const end = dir < 0 ? tMin : tMax;
      while (dir < 0 ? t > end : t < end) {
        s = rk4(s, t, dir * H_STEP);
        t += dir * H_STEP;
        // Store ONLY at true step multiples: an end-of-range sample under a
        // ROUNDED key collides with a real grid node (measured during C-3:
        // build(+200, …, 1000) stored ε(+200) under key 0, clobbering the
        // t = 0 sample by 94″ — the verdict generator's rms caught it).
        // Partial edge segments are covered by at()'s a-side fallback.
        if (Math.abs(t % stepYr) < H_STEP / 2) grid.set(Math.round(t / stepYr) * stepYr, sampleAt(s, t));
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
        };
      },
    };
  }

  return { build, alphaArcsecPerYr: ALPHA * R2D * 3600 };
}

module.exports = { createDeepOrbitalHistory };
