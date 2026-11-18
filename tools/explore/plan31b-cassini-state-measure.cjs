'use strict';
// Plan 31 B — THE FIRST MEASUREMENT: the Moon's own axial tilt of date, the CASSINI STATE on the shipped regime
// (decided 2026-11-15 after plan 31 A2; the record doc 111 cites). MEASUREMENT ONLY — nothing written, no model change:
// the scene composes the J2000 Cassini state (1.54° to the ecliptic + the 5.15° inclination = 6.69° to the orbit
// normal) at every age; this says what the state OF DATE is on the quantities the regime already carries of date.
//
// The classical relation (Peale 1969; Ward 1975 — the triaxial form as reproduced in the IAU 2023 symposium paper
// "Revisiting the Cassini states of synchronous satellites", eq. 2), every rate in rad/yr:
//     α sin 2(θ − i) + (3/4) n γ sin(θ − i) (1 − cos(θ − i)) + 2 Ω̇ sin θ = 0,     α = (3/2) n (C − A)/C,
// θ the spin axis's angle from the LAPLACE pole (signed: positive on the orbit normal's side), i the orbit's
// inclination to the Laplace plane (> 0), Ω̇ the node's rate about the Laplace pole (< 0, a regression), n the
// mean motion, γ = (B − A)/C. The obliquity to the ORBIT normal is ε = θ − i. Today (checked below): θ = −1.54°,
// i = 5.15°, ε = −6.69°, the three terms cancel to 1e-6 of their size — Cassini state 2 (the spin axis and the orbit
// normal on opposite sides of the pole). Ward's (1975) picture: early on four states, the Moon in state 1 (θ > i, a
// small ε > 0); as the orbit recedes state 1 merges with the unstable state 4 and vanishes — the transition, the
// obliquity reaching tens of degrees — and the Moon settles in state 2, where it is today.
//
// Of date, from the shipped chain (tools/lib/deep-time.js — the cited history's a(t), the regime of plan 31 A):
//   n(t) from a(t); Ω̇(t) = −2π/P_node(t) (the regime's node period of date: the J₂ term inside the Laplace radius,
//   the solar term outside, 3.24 yr at the edge, 18.6 yr today); i(t) = the free inclination to the Laplace plane
//   (sin i_L ∝ a^{−κ}: κ = 1/2 shipped, 1/4 the band).
// The Moon's figure (a CITED input, uncertain early): (C − A)/C = 6.3e-4 (Yoder 1995, as Wisdom 2006 uses it),
//   γ = (B − A)/C = 2.28e-4 (Williams et al. 2014, LLR). Two readings make the band — FROZEN (today's values at every
//   age, Ward's assumption) and HYDROSTATIC inside a_h (the moment differences ∝ the tidal + rotational distortion
//   ∝ n² ∝ a⁻³, pinned to today's values at the radius where today's figure was hydrostatic: a_h = 15 R⊕ (Peale 1969)
//   or 21 R⊕ (Williams et al. 2001), frozen beyond). Ćuk et al. 2021 (PSJ): the transition at ~27 R⊕ hydrostatic,
//   ~34 R⊕ with a fossil figure.
//
//   node tools/explore/plan31b-cassini-state-measure.cjs
const path = require('path');
const DT = require(path.join(__dirname, '..', 'lib', 'deep-time.js'));
const D2R = Math.PI / 180, R2D = 180 / Math.PI;
const R_E = 6378136.6, GM_EM = 398600.435507e9 + 4902.800118e9;   // m, m³/s² (Earth + Moon: the Moon's mean motion)
const SEC_PER_YR = 365.25 * 86400;
const EDGE = 4428.98;
const FIGURE = { cMinusAOverC: 6.3e-4, gamma: 2.28e-4 };
const A_H = { peale1969: 15, williams2001: 21 };

/** The cited history's a(t) in Earth radii. @param {number} tMa */
const aRe = (tMa) => { const a = DT.meanMoonDistanceMetresAtAge(tMa); return a === null ? null : a / R_E; };
/** The age at which a(t) crosses a given distance (R⊕), by bisection on the monotonic deep part. @param {number} target */
function ageAtDistance(target) {
  let lo = 0, hi = EDGE;
  if (aRe(lo) < target) return null;
  for (let k = 0; k < 80; k++) { const mid = 0.5 * (lo + hi); const a = aRe(mid); if (a === null) { hi = mid; continue; } if (a > target) lo = mid; else hi = mid; }
  return 0.5 * (lo + hi);
}
/** The figure's moment differences at a distance under a reading. @param {number} aR @param {'frozen'|'peale1969'|'williams2001'} reading */
function figureAt(aR, reading) {
  if (reading === 'frozen') return FIGURE;
  const ah = A_H[reading];
  const s = aR < ah ? Math.pow(ah / aR, 3) : 1;
  return { cMinusAOverC: FIGURE.cMinusAOverC * s, gamma: FIGURE.gamma * s };
}
/** Every root θ (radians) of the Cassini equation on (−π, π], by a sign scan at 0.05° and bisection. */
function cassiniRoots(nRadYr, omegaDotRadYr, iRad, fig) {
  const alpha = 1.5 * nRadYr * fig.cMinusAOverC, g = 0.75 * nRadYr * fig.gamma;
  const F = (th) => { const e = th - iRad; return alpha * Math.sin(2 * e) + g * Math.sin(e) * (1 - Math.cos(e)) + 2 * omegaDotRadYr * Math.sin(th); };
  const roots = [];
  const step = 0.05 * D2R;
  let prev = F(-Math.PI + 1e-9), thPrev = -Math.PI + 1e-9;
  for (let th = -Math.PI + step; th <= Math.PI + 1e-12; th += step) {
    const f = F(th);
    if (prev === 0 || (prev < 0) !== (f < 0)) {
      let lo = thPrev, hi = th, flo = prev;
      for (let k = 0; k < 60; k++) { const mid = 0.5 * (lo + hi), fm = F(mid); if ((fm < 0) === (flo < 0)) { lo = mid; flo = fm; } else hi = mid; }
      roots.push(0.5 * (lo + hi));
    }
    prev = f; thPrev = th;
  }
  return roots;
}
/** Name the roots: state 1 (θ > i, prograde, ε > 0 and ≤ 90°), state 4 (the unstable partner, θ beyond state 1 toward 90°+),
 *  state 2 (θ < 0, |θ| < 90°: the spin axis on the far side of the pole), state 3 (|θ| > 90°: retrograde). */
function classify(roots, iRad) {
  const out = { s1: null, s2: null, s3: null, s4: null };
  const pro = roots.filter((th) => th > iRad && th < Math.PI / 2 + iRad).sort((a, b) => a - b);
  if (pro.length >= 1) out.s1 = pro[0];
  if (pro.length >= 2) out.s4 = pro[pro.length - 1];
  const s2 = roots.filter((th) => th < 0 && th > -Math.PI / 2);
  if (s2.length) out.s2 = s2.reduce((a, b) => (Math.abs(a) < Math.abs(b) ? a : b));
  const s3 = roots.filter((th) => Math.abs(th) > Math.PI / 2);
  if (s3.length) out.s3 = s3[0];
  return out;
}
const f = (x, d = 2) => (x === null || x === undefined || Number.isNaN(x)) ? '—' : x.toFixed(d);

// ── today's check ────────────────────────────────────────────────────────────
{
  const a = DT.meanMoonDistanceMetresAtAge(0), n = Math.sqrt(GM_EM / a ** 3) * SEC_PER_YR;
  const om = -2 * Math.PI / (DT.meanLunarNodePrecessionAtAge(0) / SEC_PER_YR);
  const i = DT.meanLunarFreeInclinationDegAtAge(0) * D2R;
  const r = classify(cassiniRoots(n, om, i, FIGURE), i);
  console.log('TODAY: n %s rad/yr, Ω̇ %s rad/yr (P_node %s yr), i_L %s°', f(n, 3), f(om, 5), f(2 * Math.PI / -om, 2), f(i * R2D, 3));
  console.log('  Cassini states (θ from the Laplace pole; ε = θ − i to the orbit normal): state 2 θ %s° ε %s° (the Moon: −1.54° / −6.69°), state 1 %s, state 4 %s, state 3 %s',
    f(r.s2 * R2D, 3), f((r.s2 - i) * R2D, 3), r.s1 === null ? 'absent' : f(r.s1 * R2D, 2) + '°', r.s4 === null ? 'absent' : f(r.s4 * R2D, 2) + '°', r.s3 === null ? 'absent' : f(r.s3 * R2D, 2) + '°');
}

// ── the history ─────────────────────────────────────────────────────────────
const DISTANCES = [6.2, 7, 8, 10, 12, 15, 17, 20, 25, 27, 30, 32, 34, 36, 38, 40, 45, 50, 55, 60];
const READINGS = ['frozen', 'peale1969', 'williams2001'];
const KAPPAS = [{ name: 'κ=1/2 (shipped)', iOf: (t) => DT.meanLunarFreeInclinationDegAtAge(t) }, { name: 'κ=1/4 (band)', iOf: (t) => DT.meanLunarFreeInclinationBandDegAtAge(t) }];
for (const K of KAPPAS) {
  console.log('\n=== free inclination %s ===', K.name);
  console.log('a R⊕ | age Ma | P_node yr | i_L ° | ' + READINGS.map((r) => `${r}: state1 ε° | state2 ε° | θ1° θ2°`).join(' | '));
  const transition = {};
  for (const aR of DISTANCES) {
    const t = aR >= aRe(0) ? 0 : ageAtDistance(aR);
    if (t === null) continue;
    const a = DT.meanMoonDistanceMetresAtAge(t), n = Math.sqrt(GM_EM / a ** 3) * SEC_PER_YR;
    const pNode = DT.meanLunarNodePrecessionAtAge(t) / SEC_PER_YR, om = -2 * Math.PI / pNode;
    const i = K.iOf(t) * D2R;
    const cells = [];
    for (const rd of READINGS) {
      const r = classify(cassiniRoots(n, om, i, figureAt(a / R_E, rd)), i);
      cells.push(`${r.s1 === null ? '  absent' : f((r.s1 - i) * R2D, 2).padStart(8)} | ${f((r.s2 - i) * R2D, 2).padStart(7)} | ${r.s1 === null ? '—' : f(r.s1 * R2D, 2)} ${f(r.s2 * R2D, 2)}`);
      if (r.s1 === null && !(rd in transition)) transition[rd] = aR;
    }
    console.log(`${f(a / R_E, 2).padStart(5)} | ${f(t, 2).padStart(8)} | ${f(pNode, 2).padStart(8)} | ${f(i * R2D, 2).padStart(5)} | ${cells.join(' | ')}`);
  }
  // the transition distance per reading: the last distance where state 1 exists, bisected on a
  for (const rd of READINGS) {
    let lo = 6.2, hi = aRe(0);
    const exists = (aR) => { const t = ageAtDistance(aR); if (t === null) return false; const a = DT.meanMoonDistanceMetresAtAge(t), n = Math.sqrt(GM_EM / a ** 3) * SEC_PER_YR; const om = -2 * Math.PI / (DT.meanLunarNodePrecessionAtAge(t) / SEC_PER_YR); const i = K.iOf(t) * D2R; return classify(cassiniRoots(n, om, i, figureAt(a / R_E, rd)), i).s1 !== null; };
    if (!exists(lo)) { console.log(`  ${rd}: state 1 absent already at 6.2 R⊕ (no transition inside the history)`); continue; }
    for (let k = 0; k < 40; k++) { const mid = 0.5 * (lo + hi); if (exists(mid)) lo = mid; else hi = mid; }
    const t = ageAtDistance(lo), a = DT.meanMoonDistanceMetresAtAge(t), n = Math.sqrt(GM_EM / a ** 3) * SEC_PER_YR, om = -2 * Math.PI / (DT.meanLunarNodePrecessionAtAge(t) / SEC_PER_YR), i = K.iOf(t) * D2R;
    const r = classify(cassiniRoots(n, om, i, figureAt(a / R_E, rd)), i);
    console.log(`  ${rd}: state 1 vanishes at a = ${f(lo, 2)} R⊕ (age ${f(t, 1)} Ma), its last obliquity ε = ${f((r.s1 - i) * R2D, 1)}° (θ ${f(r.s1 * R2D, 1)}°); state 2 there ε = ${f((r.s2 - i) * R2D, 1)}° — the Moon's obliquity jumps to |state 2| and decays to today's 6.69°`);
  }
}
console.log('\nConventions: θ signed from the Laplace pole (+ toward the orbit normal), i the free inclination to the Laplace plane, ε = θ − i the obliquity to the orbit normal; the scene today composes 1.54° (|θ|) + 5.15° (i) = 6.69° (|ε|).');
