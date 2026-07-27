/**
 * v4-pdot-composer3.js — framework-native ṗ derivation, experiment 3:
 * the PHYSICAL composition (no double-counting).
 *
 * Exp 2's naive hybrid double-counted ε̇ (−91.5″/cy): the framework's fitted
 * obliquity curve already contains the observed ε̇, which the lab shows is
 * ecliptic-driven (ε̇_ecl = π̇·cosΠ ≈ −47″/cy = the whole observed −46.8).
 * The physical composition is:
 *   ecliptic-of-date : lab pole track (pure gravity; π̇ 47.5″/cy ✓ IAU 47.0)
 *   ε(T)             : the framework obliquity curve (H/3+H/8 cycles)
 *   equator-of-date  : a pure luni-solar cone about the MOVING ecliptic
 *                      pole at constant ψ̇, with the composed obliquity
 *                      pinned to ε(T)
 * ψ̇ is anchored once so the composed J2000 rate = the observed p (the same
 * single-rate anchor class as the H/13 layer itself). The composed T² is
 * then a PREDICTION. Target: +1.1054″/cy² (IAU2006) / +1.11113 (Lieske).
 *
 * Usage: node tools/explore/v4-pdot-composer3.js [labYears=3000]
 */

const C = require('../lib/constants');
const SG = require('../lib/scene-graph');
const OE = require('../lib/orbital-engine');
const D1 = require('./derive-meeus-amplitudes');
const LAB = require('./derive-planetary-lunar-terms');

const LAB_YR = parseFloat(process.argv[2] || '3000');
const d2r = Math.PI / 180;
const A2R = d2r / 3600;

const norm = (v) => { const n = Math.hypot(v[0], v[1], v[2]); return [v[0] / n, v[1] / n, v[2] / n]; };
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

function quadFitXY(xs, ys) {
  let s0 = 0, s1 = 0, s2 = 0, s3 = 0, s4 = 0, b0 = 0, b1 = 0, b2 = 0;
  for (let i = 0; i < xs.length; i++) {
    const x = xs[i], x2 = x * x, y = ys[i];
    s0++; s1 += x; s2 += x2; s3 += x2 * x; s4 += x2 * x2;
    b0 += y; b1 += y * x; b2 += y * x2;
  }
  const M = [[s0, s1, s2, b0], [s1, s2, s3, b1], [s2, s3, s4, b2]];
  for (let c = 0; c < 3; c++) {
    let piv = c; for (let r = c + 1; r < 3; r++) if (Math.abs(M[r][c]) > Math.abs(M[piv][c])) piv = r;
    [M[c], M[piv]] = [M[piv], M[c]];
    for (let r = c + 1; r < 3; r++) { const f = M[r][c] / M[c][c]; for (let cc = c; cc < 4; cc++) M[r][cc] -= f * M[c][cc]; }
  }
  const c2 = M[2][3] / M[2][2], c1 = (M[1][3] - M[1][2] * c2) / M[1][1], c0 = (M[0][3] - M[0][1] * c1 - M[0][2] * c2) / M[0][0];
  return { c0, c1, c2 };
}

// ═══ 1. lab ecliptic pole track (pure gravity) ═════════════════════════════
console.log(`lab run: ${LAB_YR} yr full system...`);
const cal = D1.calibrate(undefined, false);
const moonIC = { a: cal.aIC, e: cal.eIC, i: cal.iIC };
const S = LAB.runSystem({ planets: true, j2: true, recordEclipticNormal: true, sampleDays: 5 }, moonIC, LAB_YR, 0.04);
const Tcy = S.t.map(d => d / 36525);
const fx = quadFitXY(Tcy, S.eclN.map(n => n[0]));
const fy = quadFitXY(Tcy, S.eclN.map(n => n[1]));
const R2A = 180 / Math.PI * 3600;
console.log(`lab pole: π̇ ${(Math.hypot(fx.c1, fy.c1) * R2A).toFixed(2)}″/cy (IAU 46.998)   ε̇_ecl-part check: ${(-(fx.c1 * 0 + fy.c1) * R2A).toFixed(1)}″/cy-class`);

// ═══ 2. J2000 basis from the scene ═════════════════════════════════════════
function framesAt(jd) {
  const sunUnit = (j) => {
    SG.computePlanetPosition('sun', j);
    const g = SG._getGraphForProbe();
    const s = g.sunNodes.pivot.getWorldPosition();
    const e = g.earthNodes.pivot.getWorldPosition();
    return norm([s[0] - e[0], s[1] - e[1], s[2] - e[2]]);
  };
  const us = [0, 0.25, 0.5, 0.75].map(f => sunUnit(jd + f * 365.2422));
  let n = [0, 0, 0];
  for (let k = 0; k < 4; k++) { const c = cross(us[k], us[(k + 1) % 4]); n[0] += c[0]; n[1] += c[1]; n[2] += c[2]; }
  const nEcl = norm(n);
  SG.computePlanetPosition('sun', jd);
  const g = SG._getGraphForProbe();
  const rm = g.earthNodes.rotAxis.worldMatrix.e;
  return { nEcl, nSpin: norm([rm[4], rm[5], rm[6]]) };
}
const F0 = framesAt(C.j2000JD);
const n0 = F0.nEcl;
const eq0 = norm(cross(F0.nSpin, n0));
const y0 = cross(n0, eq0);
// initial spin azimuth about the ecliptic pole
const e1_0 = eq0, e2_0 = y0;
const phi0 = Math.atan2(dot(F0.nSpin, e2_0), dot(F0.nSpin, e1_0));

// ═══ 3. kinematic composition (stepwise, no basis degeneracy) ══════════════
// Equator precesses about the CURRENT ecliptic pole at constant ψ̇; the pole
// moves along the lab track (rigid transport); the composed obliquity is
// pinned to the framework ε(T) each step. Longitudes measured plane-
// geometrically against the FIXED star (χ-channel stays live).
function rotate(v, axis, ang) {
  const [x, y, z] = v, [ux, uy, uz] = axis;
  const c = Math.cos(ang), s = Math.sin(ang), d = (1 - c) * (ux * x + uy * y + uz * z);
  return [
    x * c + (uy * z - uz * y) * s + ux * d,
    y * c + (uz * x - ux * z) * s + uy * d,
    z * c + (ux * y - uy * x) * s + uz * d,
  ];
}
function nEclAt(T) {
  const px = fx.c1 * T + fx.c2 * T * T;
  const py = fy.c1 * T + fy.c2 * T * T;
  return norm([n0[0] + px * eq0[0] + py * y0[0], n0[1] + px * eq0[1] + py * y0[1], n0[2] + px * eq0[2] + py * y0[2]]);
}
function starLon(spin, n) {
  const eq = norm(cross(spin, n));
  const yAx = cross(n, eq);
  return Math.atan2(dot(eq0, yAx), dot(eq0, eq));
}
function compose(psiDotArcsec) {
  const psiDot = psiDotArcsec * A2R;               // rad/cy
  const DT = 0.02;                                 // cy
  const rows = [{ T: 0, L: starLon(F0.nSpin, n0) }];
  for (const dir of [+1, -1]) {
    let spin = F0.nSpin.slice();
    let n = n0.slice();
    for (let k = 1; k <= Math.round(20 / DT); k++) {
      const T = dir * k * DT;
      const nNext = nEclAt(T);
      // NOTE: no rigid transport — the ecliptic tilts UNDER the equator; the
      // equinox slide along the equator (the χ-channel) exists precisely
      // because the spin axis does NOT follow the pole motion.
      // 1. luni-solar precession about the current pole (retrograde equinox);
      //    torque law: ψ̇(T) = ψ̇₀ · cosε(T)/cosε₀ (classical luni-solar
      //    precession ∝ cos ε — derived modulation, no new anchors)
      const eps = OE.computeObliquityEarth(2000 + T * 100) * d2r;
      const psiEff = TORQUE_LAW ? psiDot * Math.cos(eps) / Math.cos(EPS00) : psiDot;
      spin = rotate(spin, nNext, -psiEff * dir * DT);
      // 2. pin the composed obliquity to the framework curve
      const alpha = Math.acos(Math.max(-1, Math.min(1, dot(spin, nNext))));
      const tiltAx = cross(nNext, spin);
      const ts = Math.hypot(tiltAx[0], tiltAx[1], tiltAx[2]);
      if (ts > 1e-15) spin = norm(rotate(spin, [tiltAx[0] / ts, tiltAx[1] / ts, tiltAx[2] / ts], eps - alpha));
      n = nNext;
      if (k % 10 === 0) rows.push({ T, L: starLon(spin, n) });
    }
  }
  rows.sort((a, b) => a.T - b.T);
  for (let i = 1; i < rows.length; i++) {
    while (rows[i].L - rows[i - 1].L > Math.PI) rows[i].L -= 2 * Math.PI;
    while (rows[i].L - rows[i - 1].L < -Math.PI) rows[i].L += 2 * Math.PI;
  }
  const f = quadFitXY(rows.map(r => r.T), rows.map(r => -r.L / d2r * 3600));
  const sgn = f.c1 > 0 ? 1 : -1;
  return { rate: sgn * f.c1, T2: sgn * f.c2 };
}

// anchor ψ̇ so the composed J2000 rate = observed p (two-pass linear solve)
const P_TARGET = 5028.796;
const EPS00 = OE.computeObliquityEarth(2000) * d2r;
let TORQUE_LAW = false;
function anchored() {
  let psi = 5038.5;
  psi += P_TARGET - compose(psi).rate;
  psi += P_TARGET - compose(psi).rate;
  return { psi, r: compose(psi) };
}
const A = anchored();
TORQUE_LAW = true;
const B = anchored();

console.log('\n══ PHYSICAL composition: general precession ══');
console.log(`  constant ψ̇ = ${A.psi.toFixed(2)}″:   rate ${A.r.rate.toFixed(2)}   T² ${A.r.T2.toFixed(4)}″/cy²`);
console.log(`  cosε torque law (ψ̇₀ = ${B.psi.toFixed(2)}″): rate ${B.r.rate.toFixed(2)}   T² ${B.r.T2.toFixed(4)}″/cy²   ← TARGET +1.1054 (IAU2006) / +1.11113 (Lieske)`);
console.log(`  (IAU luni-solar ψ̇ = 5038.48 — comparison, not an input; scene-equator-only T² was +0.6714)`);
console.log('\nInputs: lab gravity pole track + framework ε(T) + ONE rate anchor (ψ̇).');
console.log('If T² ≈ +1.10: ṗ derived → the obliquity-carrier anchor becomes a verified');
console.log('prediction and D4\'s "remaining 38%" closes as the χ-channel.');
