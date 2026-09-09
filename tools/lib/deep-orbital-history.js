/**
 * DEEP ORBITAL HISTORY — the shared evaluator for Earth's deep-time orbital
 * quantities from the engine's own governed tables (Stage C-2, plan 02 §8).
 *
 * ONE home for the anchored-mode-sum + precession-integration machinery that
 * the Stage-C lab (tools/explore/stage-c-obliquity-hybrid.mjs) established
 * and the deep insolation-feature extractor consumes:
 *
 *   e(t), ϖ_J2000(t)   from the deep z-modes  (data/nbody-deep-secular-modes)
 *   i(t), Ω(t)         from the deep ζ-modes  (16-term deep tier — the grid
 *                       here is Myr-scale; the 8-term era tier is the
 *                       J2000-local tier and is NOT mixed in, per the
 *                       no-mid-curve-handoff doctrine)
 *   ε(t), equinox γ(t) from the obliquity hybrid: ds/dt = α (ŝ·n̂)(ŝ×n̂),
 *                       α = (H/13 rate)/cos ε₀ — engine K's ONE anchor
 *   climatic precession e·sin ϖ̃ with ϖ̃ the PHYSICAL of-date angle from the
 *                       moving equinox γ = unit(ŝ×n̂) to the perihelion
 *                       direction, measured in the orbit plane about n̂ —
 *                       no linear-precession approximation anywhere.
 *
 * All numbers flow from the governed artifact + the shared constants; zero
 * fitted constants, zero retyped values (E20).
 *
 * Usage: const H = createDeepOrbitalHistory(); H.build(t0Yr, t1Yr, stepYr)
 * integrates ONCE over [t1, t0] (t relative to J2000, negative = past) and
 * returns a sampler { at(tYr) } with linear interpolation on the step grid.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

function createDeepOrbitalHistory() {
  const ART = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'nbody-deep-secular-modes.json'), 'utf8'));
  // Lazy ESM import is not available in CJS; the two physics inputs here are
  // the anchor pair and the H/13 rate — both live in the chain artifact and
  // the epoch machinery, mirrored through tools/lib (the Node engine home).
  const { CHAIN_ARTIFACT } = require('../../packages/physics/src/planets/chain-artifact.js');
  const DT = require('./deep-time.js');
  const C = require('./constants.js');

  const D2R = Math.PI / 180, R2D = 180 / Math.PI;
  const AE = CHAIN_ARTIFACT.j2000AnchorElements.earth;

  const mkAnchored = (modes, anchor) => {
    const sum = (t) => {
      let re = 0, im = 0;
      for (const m of modes) {
        const c = Math.cos(m.omegaRadPerYr * t), s = Math.sin(m.omegaRadPerYr * t);
        re += m.re * c - m.im * s;
        im += m.re * s + m.im * c;
      }
      return [re, im];
    };
    const s0 = sum(0), R = [anchor[0] - s0[0], anchor[1] - s0[1]];
    return (t) => { const [x, y] = sum(t); return [x + R[0], y + R[1]]; };
  };
  const s2h = Math.sin(AE.inclEclipticDeg / 2 * D2R);
  const zetaAt = mkAnchored(ART.modes.earth.zeta,
    [s2h * Math.cos(AE.ascNodeEclipticDeg * D2R), s2h * Math.sin(AE.ascNodeEclipticDeg * D2R)]);
  const zAt = mkAnchored(ART.modes.earth.z,
    [AE.e * Math.cos(AE.lonPeriEclipticDeg * D2R), AE.e * Math.sin(AE.lonPeriEclipticDeg * D2R)]);

  /** i (rad), Ω (rad) of the orbit plane on the J2000 ecliptic. @param {number} t */
  const inclNode = (t) => {
    const [q, p] = zetaAt(t);
    return { i: 2 * Math.asin(Math.min(1, Math.hypot(q, p))), Om: Math.atan2(p, q) };
  };
  /** Orbit normal (J2000-ecliptic frame). @param {number} t */
  const orbitNormal = (t) => {
    const { i, Om } = inclNode(t);
    return [Math.sin(i) * Math.sin(Om), -Math.sin(i) * Math.cos(Om), Math.cos(i)];
  };

  // engine K's ONE anchor: the equinox-precession rate at J2000 measured
  // from the engine's own year lengths (sid/(sid − trop) = 25,771.4 yr —
  // the same surface the Stage-C lab uses via model.epoch; the kinematic
  // H/13 identity reads 25,793.6, a recorded 0.09% relation tension that
  // stays a statement, never a tune).
  const sidDays = DT.computeSiderealYearDaysDirect(2000);
  const solDays = DT.computeSolarYearDaysDirect(2000);
  const psiDot = (2 * Math.PI) / (sidDays / (sidDays - solDays));
  const EPS0 = C.ASTRO_REFERENCE.obliquityJ2000_deg * D2R;
  const ALPHA = psiDot / Math.cos(EPS0);

  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const deriv = (s, t) => {
    const n = orbitNormal(t);
    const k = ALPHA * dot(s, n);
    const c = cross(s, n);
    return [k * c[0], k * c[1], k * c[2]];
  };
  const rk4 = (s, t, h) => {
    const k1 = deriv(s, t);
    const k2 = deriv([s[0] + h / 2 * k1[0], s[1] + h / 2 * k1[1], s[2] + h / 2 * k1[2]], t + h / 2);
    const k3 = deriv([s[0] + h / 2 * k2[0], s[1] + h / 2 * k2[1], s[2] + h / 2 * k2[2]], t + h / 2);
    const k4 = deriv([s[0] + h * k3[0], s[1] + h * k3[1], s[2] + h * k3[2]], t + h);
    const o = [0, 1, 2].map((i) => s[i] + h / 6 * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]));
    const r = Math.hypot(o[0], o[1], o[2]);
    return [o[0] / r, o[1] / r, o[2] / r];
  };

  /** One quantity bundle at time t from the current spin axis s. */
  function sample(s, t) {
    const n = orbitNormal(t);
    const { i, Om } = inclNode(t);
    const [zx, zy] = zAt(t);
    const e = Math.hypot(zx, zy);
    const periEclDeg = Math.atan2(zy, zx) * R2D;
    // perihelion direction in 3D (orbit plane), ω = ϖ_ecl − Ω
    const w = periEclDeg * D2R - Om;
    const ph = [
      Math.cos(Om) * Math.cos(w) - Math.sin(Om) * Math.sin(w) * Math.cos(i),
      Math.sin(Om) * Math.cos(w) + Math.cos(Om) * Math.sin(w) * Math.cos(i),
      Math.sin(w) * Math.sin(i),
    ];
    // moving equinox γ = unit(ŝ × n̂) (in both the equator and orbit planes)
    const g = cross(s, n);
    const gn = Math.hypot(g[0], g[1], g[2]);
    const gu = [g[0] / gn, g[1] / gn, g[2] / gn];
    // ϖ̃ = signed angle from γ to the perihelion direction about n̂
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
   * Integrate once over [min(t0,t1), max(t0,t1)] from t=0 outward and return
   * a sampler on a stepYr grid (linear interpolation between grid points).
   * @param {number} t0Yr @param {number} t1Yr @param {number} stepYr
   */
  function build(t0Yr, t1Yr, stepYr) {
    const tMin = Math.min(t0Yr, t1Yr, 0), tMax = Math.max(t0Yr, t1Yr, 0);
    const grid = new Map();
    const S0 = [0, Math.sin(EPS0), Math.cos(EPS0)];   // J2000 pole at ecliptic lon +90°
    const H_STEP = 5;
    for (const dir of [-1, +1]) {
      let s = S0, t = 0;
      grid.set(0, sample(s, 0));
      const end = dir < 0 ? tMin : tMax;
      while (dir < 0 ? t > end : t < end) {
        s = rk4(s, t, dir * H_STEP);
        t += dir * H_STEP;
        if (Math.abs(t % stepYr) < H_STEP / 2 || t === end) grid.set(Math.round(t / stepYr) * stepYr, sample(s, t));
      }
    }
    return {
      /** @param {number} tYr */
      at(tYr) {
        const k0 = Math.floor(tYr / stepYr) * stepYr, k1 = k0 + stepYr;
        const a = grid.get(k0), b = grid.get(k1) ?? a;
        if (!a) throw new Error(`deep-orbital-history: ${tYr} outside the built range`);
        const f = (tYr - k0) / stepYr;
        const lerp = (x, y) => x + (y - x) * f;
        const dAng = (x, y) => x + (((y - x + 540) % 360) - 180) * f;
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
