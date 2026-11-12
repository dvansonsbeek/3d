'use strict';
// Plan 31 A — THE INCLINATION HYPOTHESIS CHECKED (2026-11-11; the record doc 111 §1.42 c cites). The owner's
// hypothesis: "the Moon's inclination started near Earth's tilt (~23°) and was dragged toward the ecliptic,
// 5.145° at J2000". Two quantities: i_ecl (to the ecliptic) and i_L (to the Laplace plane, the "free" inclination,
// 5.145° today). MEASUREMENT ONLY, read-only against the chain; the shipped form is
// packages/physics/src/earth/laplace-plane.cjs (κ = 1/2 shipped, 1/4 the band) — supersede, never edit.
// The Earth-tide damping of the free inclination: the secular tidal torque on the orbit lies along the spin axis
// (averaged over the node cycle and the precession it is along the Laplace pole), so |L| grows by the projection and
// the free inclination obeys di/dt = −κ (ȧ/a) tan i, κ = 1/2 for the torque fully along the pole (i ∝ a^{-1/2} at small i),
// κ = 1/4 the constant-lag class (Goldreich 1966's ~10° at 10 R⊕ sits between). The Moon's own tides (a stated omission)
// damp i further. No new input: a(t) is the cited history.
//
//   node tools/explore/plan31a-free-inclination.cjs
const path = require('path');
const DT = require(path.join(__dirname, '..', 'lib', 'deep-time.js'));
const D2R = Math.PI / 180, R_KM = 6378.1366;
const J2_0 = 0.00108262668, AU_KM = 149597870.7, GM_S = 132712440041.27942, GM_E = 398600.435507, E_EARTH = 0.01671022;
const A0 = DT.A_MOON_NOW_M, LOD0 = DT.LOD_NOW_H13_S, I0 = 5.1453964;
const EDGE = 4428.98;
function laplacePhi(aKm, epsDeg, j2) {
  const rL5 = j2 * R_KM * R_KM * AU_KM ** 3 * (GM_E / GM_S) * Math.pow(1 - E_EARTH * E_EARTH, 1.5);
  const e2 = 2 * epsDeg * D2R;
  return Math.atan2(Math.sin(e2), Math.cos(e2) + 2 * rL5 / aKm ** 5) / 2 / D2R; // tilt from the equator
}
// integrate the free inclination backward on a 0.1-Myr grid (finer near the edge): sin i ∝ a^{−κ} exactly
function history(kappa) {
  const out = new Map(); let i = I0 * D2R, aPrev = DT.meanMoonDistanceMetresAtAge(0);
  out.set(0, I0);
  for (let t = 0.1; t <= EDGE + 1e-9; t = Math.min(EDGE, +(t + (t >= 4300 ? 0.01 : 0.1)).toFixed(3))) {
    const a = DT.meanMoonDistanceMetresAtAge(t); if (a === null) break;
    i = Math.asin(Math.min(1, Math.sin(i) * Math.pow(a / aPrev, -kappa)));
    out.set(+t.toFixed(3), i / D2R); aPrev = a;
    if (t === EDGE) break;
  }
  return out;
}
const H = { 0.25: history(0.25), 0.5: history(0.5) };
const near = (m, t) => { let best = null, bd = 1e9; for (const [k, v] of m) { const d = Math.abs(k - t); if (d < bd) { bd = d; best = v; } } return best; };
const f = (x, d = 2) => x === null || x === undefined ? '—' : x.toFixed(d);
console.log('age Ma | a R⊕ | ε̄ ° | Laplace tilt from equator φ ° | from ecliptic ε̄−φ ° | i_L κ=1/4 ° | i_L κ=1/2 ° | i_ecl range κ=1/4 (|ε̄−φ−i|…ε̄−φ+i) ° | i_ecl range κ=1/2 ° | torque factor (1−3/2 sin²i_L)/J2000, κ=1/4 | κ=1/2');
for (const t of [0, 400, 1000, 1400, 2460, 3000, 3500, 4000, 4200, 4300, 4380, 4400, 4410, 4420, 4423.5, 4425, 4426.5, 4428, EDGE]) {
  const a = DT.meanMoonDistanceMetresAtAge(t) / 1000, lod = DT.meanLodSecondsAtAge(t), eps = DT.meanObliquityCitedDegAtAge(t);
  const wr = LOD0 / lod, phi = laplacePhi(a, eps, J2_0 * wr * wr), fromEcl = eps - phi;
  const i1 = near(H[0.25], t), i2 = near(H[0.5], t);
  const tf = (i) => (1 - 1.5 * Math.sin(i * D2R) ** 2) / (1 - 1.5 * Math.sin(I0 * D2R) ** 2);
  console.log([f(t, 2), f(a / R_KM, 2), f(eps, 2), f(phi, 3), f(fromEcl, 3), f(i1, 2), f(i2, 2),
    `${f(Math.abs(fromEcl - i1), 1)}…${f(fromEcl + i1, 1)}`, `${f(Math.abs(fromEcl - i2), 1)}…${f(fromEcl + i2, 1)}`, f(tf(i1), 4), f(tf(i2), 4)].join(' | '));
}
console.log('\nThe modern rate of the free inclination under the law (κ = 1/2, ȧ = 3.8 cm/yr): di/dt ≈',
  (0.5 * (0.038 / 384399) * Math.tan(I0 * D2R) / D2R).toExponential(2), '°/yr — unobservable today.');
