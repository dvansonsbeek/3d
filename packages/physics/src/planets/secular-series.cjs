/**
 * THE SECULAR-SERIES ELEMENT OVERRIDE — one home for the D5/D5b planet
 * deep-time element logic (plan 02, the early planet flip).
 *
 * Beyond a planet's MEASURED chain-handover boundary (banked in the series
 * artifact's verdict — the era chain's extrapolation is unphysical there:
 * the owner-found Mercury e 0.62 / i 31° at +1.35 Myr), the secular
 * elements e/ϖ/i/Ω substitute from the banked engine series inside its
 * ±10-Myr span, and from the deep mode tables beyond it (the same tail
 * role the obliquity hybrid uses). aAU and the mean longitude stay the
 * chain's — the fast angle is well-behaved (the secular/fast split). The
 * invariable-plane pair is recomputed from the substituted ecliptic
 * elements with the SAME K5c exact rotation the chain evaluator applies
 * (keplerian-chain.cjs is the rotation's origin; it is mirrored here
 * because editing that file re-stamps the governed era artifact — a
 * 30-min regen for a display consumer; fold the mirror back on the next
 * natural keplerian-chain regen).
 *
 * Consumers (each injecting its own certified surfaces): the browser
 * (src/script.js — elements, rings and positions through one path) and
 * the Node engine mirror (tools/lib — the K4 parity instruments), kept
 * bit-identical by the cross-engine planet probes.
 */

'use strict';

const D2R = Math.PI / 180, R2D = 180 / Math.PI;

/** Anchored mode-sum: z(t) = Σ (re + i·im)·e^{iωt}, t years from J2000. */
function modeSum(/** @type {ReadonlyArray<{omegaRadPerYr:number,re:number,im:number}>} */ modes, /** @type {number} */ t) {
  let re = 0, im = 0;
  for (const m of modes) {
    const c = Math.cos(m.omegaRadPerYr * t), s = Math.sin(m.omegaRadPerYr * t);
    re += m.re * c - m.im * s;
    im += m.re * s + m.im * c;
  }
  return [re, im];
}

/**
 * @param {{
 *   series: {t0Yr: number,
 *            bodies: Object<string, {stepYr: number,
 *              zetaQ: ReadonlyArray<number>, zetaP: ReadonlyArray<number>,
 *              zQ: ReadonlyArray<number>, zP: ReadonlyArray<number>}>,
 *            verdict?: {planetHandover?: {rows?: Object<string, {pastKyr: number, futureKyr: number}>}}},
 *   anchorElements: Object<string, {e: number, lonPeriEclipticDeg: number,
 *     inclEclipticDeg: number, ascNodeEclipticDeg: number}>,
 *   invariablePlane?: {inclEclipticDeg: number, ascNodeEclipticDeg: number},
 *   planetZModes: Object<string, ReadonlyArray<{omegaRadPerYr:number,re:number,im:number}>>,
 *   planetZetaModes: Object<string, ReadonlyArray<{omegaRadPerYr:number,re:number,im:number}>>,
 * }} deps — the parsed series artifact, the chain's J2000 anchors + banked
 *   invariable plane, and the deep mode tables (the beyond-span tail).
 */
function createSecularSeriesOverride({ series, anchorElements, invariablePlane, planetZModes, planetZetaModes }) {
  const rows = (series.verdict && series.verdict.planetHandover && series.verdict.planetHandover.rows) || {};
  /** @type {Object<string, any>} */
  const B = {};
  for (const [nm, b] of Object.entries(series.bodies)) {
    if (nm === 'earth') continue;
    const hv = rows[nm] || { pastKyr: 50, futureKyr: 50 };
    B[nm] = {
      stepYr: b.stepYr, zetaQ: b.zetaQ, zetaP: b.zetaP, zQ: b.zQ, zP: b.zP,
      endYr: series.t0Yr + (b.zetaQ.length - 1) * b.stepYr,
      pastYr: hv.pastKyr * 1000, futureYr: hv.futureKyr * 1000,
      R: null,
    };
  }
  const t0Yr = series.t0Yr;

  const anchorsFor = (/** @type {string} */ nm, /** @type {any} */ b) => {
    const A = anchorElements[nm];
    const s2h = Math.sin(A.inclEclipticDeg / 2 * D2R);
    const li0 = (/** @type {ReadonlyArray<number>} */ arr) => {
      const x = -t0Yr / b.stepYr, i = Math.max(0, Math.min(arr.length - 2, Math.floor(x))), f = x - i;
      return arr[i] * (1 - f) + arr[i + 1] * f;
    };
    const mz0 = modeSum(planetZModes[nm], 0);
    const mq0 = modeSum(planetZetaModes[nm], 0);
    return {
      sz: [A.e * Math.cos(A.lonPeriEclipticDeg * D2R) - li0(b.zQ), A.e * Math.sin(A.lonPeriEclipticDeg * D2R) - li0(b.zP)],
      sq: [s2h * Math.cos(A.ascNodeEclipticDeg * D2R) - li0(b.zetaQ), s2h * Math.sin(A.ascNodeEclipticDeg * D2R) - li0(b.zetaP)],
      mz: [A.e * Math.cos(A.lonPeriEclipticDeg * D2R) - mz0[0], A.e * Math.sin(A.lonPeriEclipticDeg * D2R) - mz0[1]],
      mq: [s2h * Math.cos(A.ascNodeEclipticDeg * D2R) - mq0[0], s2h * Math.sin(A.ascNodeEclipticDeg * D2R) - mq0[1]],
    };
  };

  /**
   * Substitute the secular elements when |t| exceeds the planet's boundary.
   * Returns el untouched inside the boundary or for bodies without a block.
   * @param {string} nm  planet key, lowercase
   * @param {number} year  decimal year
   * @param {*} el  the chain's elements-of-date (mutated copy returned)
   */
  function applyToElements(nm, year, el) {
    const b = B[nm];
    if (!b) return el;
    const t = year - 2000;
    if (t >= -b.pastYr && t <= b.futureYr) return el;
    if (b.R === null) b.R = anchorsFor(nm, b);
    let zx, zy, qx, qy;
    if (t >= t0Yr && t <= b.endYr) {
      const li = (/** @type {ReadonlyArray<number>} */ arr, /** @type {number} */ tt) => {
        const x = (tt - t0Yr) / b.stepYr, i = Math.max(0, Math.min(arr.length - 2, Math.floor(x))), f = x - i;
        return arr[i] * (1 - f) + arr[i + 1] * f;
      };
      zx = li(b.zQ, t) + b.R.sz[0]; zy = li(b.zP, t) + b.R.sz[1];
      qx = li(b.zetaQ, t) + b.R.sq[0]; qy = li(b.zetaP, t) + b.R.sq[1];
    } else {
      const mz = modeSum(planetZModes[nm], t);
      const mq = modeSum(planetZetaModes[nm], t);
      zx = mz[0] + b.R.mz[0]; zy = mz[1] + b.R.mz[1];
      qx = mq[0] + b.R.mq[0]; qy = mq[1] + b.R.mq[1];
    }
    const out = Object.assign({}, el);
    out.e = Math.hypot(zx, zy);
    out.lonPeriEclipticDeg = ((Math.atan2(zy, zx) * R2D) % 360 + 360) % 360;
    out.inclEclipticDeg = 2 * Math.asin(Math.min(1, Math.hypot(qx, qy))) * R2D;
    out.ascNodeEclipticDeg = ((Math.atan2(qy, qx) * R2D) % 360 + 360) % 360;
    if (invariablePlane) {
      const fi = invariablePlane.inclEclipticDeg * D2R, fO = invariablePlane.ascNodeEclipticDeg * D2R;
      const zf = [Math.sin(fi) * Math.sin(fO), -Math.sin(fi) * Math.cos(fO), Math.cos(fi)];
      let xf = [1 - zf[0] * zf[0], -zf[0] * zf[1], -zf[0] * zf[2]];
      const xn = Math.hypot(xf[0], xf[1], xf[2]); xf = [xf[0] / xn, xf[1] / xn, xf[2] / xn];
      const yf = [zf[1] * xf[2] - zf[2] * xf[1], zf[2] * xf[0] - zf[0] * xf[2], zf[0] * xf[1] - zf[1] * xf[0]];
      const oi = out.inclEclipticDeg * D2R, oO = out.ascNodeEclipticDeg * D2R;
      const nO = [Math.sin(oi) * Math.sin(oO), -Math.sin(oi) * Math.cos(oO), Math.cos(oi)];
      const nz = nO[0] * zf[0] + nO[1] * zf[1] + nO[2] * zf[2];
      out.inclInvPlaneDeg = Math.acos(Math.min(1, Math.max(-1, nz))) * R2D;
      const c = [zf[1] * nO[2] - zf[2] * nO[1], zf[2] * nO[0] - zf[0] * nO[2], zf[0] * nO[1] - zf[1] * nO[0]];
      const cx = c[0] * xf[0] + c[1] * xf[1] + c[2] * xf[2];
      const cy = c[0] * yf[0] + c[1] * yf[1] + c[2] * yf[2];
      out.ascNodeInvPlaneDeg = ((Math.atan2(cy, cx) * R2D) % 360 + 360) % 360;
    }
    return out;
  }

  return { applyToElements };
}

module.exports = { createSecularSeriesOverride, modeSum };
