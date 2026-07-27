/**
 * v4-pdot-composer.js — framework-native ṗ derivation, experiment 1
 * (TODO: "The Derived Moon" derivation gate).
 *
 * QUESTION: does the framework's OWN composed of-date frame already contain
 * the general-precession acceleration ṗ_A T² = +1.1054″/cy² (IAU2006;
 * Lieske 1.11113) that the K_PL budget attributes to "frame"?
 *
 * The scene composes an equinox-of-date geometrically: the moving equator
 * (H/13 axial-precession layer + H/3/H/8 obliquity cycles) ∩ the moving
 * ecliptic (H/3 inclination + H/5 ecliptic layers). This meter measures,
 * operationally IDENTICAL to how the of-date frame enters Meeus's lunar
 * arguments, the of-date ecliptic longitude of an inertially-fixed
 * direction over ±2,000 yr and fits its quadratic:
 *   linear  → the framework's composed general precession rate
 *             (expect ≈ 360·13/H = 5024.5″/cy; IAU 5028.796)
 *   T²      → the framework's composed ṗ  (target: +1.105″/cy²)
 * Also reports the composed ε(T) (rate target −46.84″/cy — fitted, should
 * hold) and the ecliptic-pole motion (IAU π̇ ≈ 47″/cy — the diagnostic I
 * expect to discriminate: the framework's ecliptic layers may move slower).
 *
 * Usage: node tools/explore/v4-pdot-composer.js [spanYears=2000] [stepYears=2]
 */

const C = require('../lib/constants');
const SG = require('../lib/scene-graph');

const SPAN = parseFloat(process.argv[2] || '2000');
const STEP = parseFloat(process.argv[3] || '2');
const d2r = Math.PI / 180;
const A2D = 1 / 3600;

const norm = (v) => { const n = Math.hypot(v[0], v[1], v[2]); return [v[0] / n, v[1] / n, v[2] / n]; };
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

// geocentric sun unit vector at jd (world frame)
function sunUnit(jd) {
  SG.computePlanetPosition('sun', jd);
  const g = SG._getGraphForProbe();
  const s = g.sunNodes.pivot.getWorldPosition();
  const e = g.earthNodes.pivot.getWorldPosition();
  return norm([s[0] - e[0], s[1] - e[1], s[2] - e[2]]);
}

// frames at epoch: ecliptic normal (plane-fit over 4 quarter-year sun samples),
// spin axis (rotAxis world Y), equinox = node of ecliptic on equator
function framesAt(jd) {
  const us = [0, 0.25, 0.5, 0.75].map(f => sunUnit(jd + f * 365.2422));
  let n = [0, 0, 0];
  for (let k = 0; k < 4; k++) {
    const c = cross(us[k], us[(k + 1) % 4]);
    n[0] += c[0]; n[1] += c[1]; n[2] += c[2];
  }
  const nEcl = norm(n);
  SG.computePlanetPosition('sun', jd);
  const g = SG._getGraphForProbe();
  const rm = g.earthNodes.rotAxis.worldMatrix.e;
  const nSpin = norm([rm[4], rm[5], rm[6]]);
  const eq = norm(cross(nSpin, nEcl));            // sign fixed below by rate check
  return { nEcl, nSpin, eq };
}

const jd0 = C.j2000JD;
const F0 = framesAt(jd0);
const starDir = F0.eq;                             // inertially-fixed reference = J2000 composed equinox
const eps0 = Math.acos(Math.abs(dot(F0.nEcl, F0.nSpin)));

const rows = [];
const t0 = Date.now();
for (let yr = -SPAN; yr <= SPAN; yr += STEP) {
  const jd = jd0 + yr * 365.2422;
  const F = framesAt(jd);
  // of-date longitude of the fixed star direction, from the equinox along the ecliptic
  const yAxis = cross(F.nEcl, F.eq);
  const L = Math.atan2(dot(starDir, yAxis), dot(starDir, F.eq));
  const eps = Math.acos(Math.max(-1, Math.min(1, dot(F.nEcl, F.nSpin))));
  const eclMotion = Math.acos(Math.max(-1, Math.min(1, dot(F.nEcl, F0.nEcl))));
  rows.push({ T: yr / 100, L, eps, eclMotion });
}
console.log(`${rows.length} epochs sampled in ${((Date.now() - t0) / 1000).toFixed(0)} s`);

// unwrap L
for (let i = 1; i < rows.length; i++) {
  while (rows[i].L - rows[i - 1].L > Math.PI) rows[i].L -= 2 * Math.PI;
  while (rows[i].L - rows[i - 1].L < -Math.PI) rows[i].L += 2 * Math.PI;
}

// quadratic fit y = c0 + c1 T + c2 T², T in cy
function quadFit(get) {
  let s0 = 0, s1 = 0, s2 = 0, s3 = 0, s4 = 0, b0 = 0, b1 = 0, b2 = 0;
  for (const r of rows) {
    const x = r.T, x2 = x * x, y = get(r);
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

const fL = quadFit(r => -r.L / d2r * 3600);        // star longitude in ″; sign: star longitude GROWS with precession — flip if needed
const sgn = fL.c1 > 0 ? 1 : -1;
const P_FW = 360 * 13 / C.H * 100 * 3600;          // framework p, ″/cy
console.log('\n══ composed general precession (of-date star longitude) ══');
console.log(`  rate:  ${(sgn * fL.c1).toFixed(2)}″/cy   (framework p = ${P_FW.toFixed(2)}; IAU2006 5028.80)`);
console.log(`  T²:    ${(sgn * fL.c2).toFixed(4)}″/cy²   ← TARGET: +1.1054 (IAU2006) / +1.11113 (Lieske)`);

const fE = quadFit(r => r.eps / d2r * 3600);
console.log('\n── composed obliquity ε(T) ──');
console.log(`  ε₀ ${(fE.c0 / 3600).toFixed(5)}°   rate ${fE.c1.toFixed(2)}″/cy (IAU −46.84)   T² ${fE.c2.toFixed(4)}″/cy²`);

const fM = quadFit(r => r.eclMotion / d2r * 3600);
console.log('\n── ecliptic-pole motion |n_ecl(T) − n_ecl(0)| ──');
console.log(`  rate (|linear|) ${Math.abs(fM.c1).toFixed(2)}″/cy   (IAU ecliptic motion π̇ ≈ 47″/cy)`);
console.log('\nInterpretation: if the composed T² ≈ +1.10, the framework cycles already');
console.log('contain ṗ — the frame carrier anchor becomes a DERIVED quantity. If not,');
console.log('the deltas above (esp. ecliptic-motion rate) localize the missing tangent.');
