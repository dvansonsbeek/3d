/**
 * derive-a1a2a3.js — Stage D2: identify Meeus Ch. 47's three "additional
 * argument" rates (A1/A2/A3) as small-integer combinations of the
 * framework's OWN mean motions, so the hardcoded polynomial rates can be
 * replaced by framework-derived expressions.
 *
 * Meeus (deg/cy from J2000):
 *   A1 = 119.75 + 131.849·T      (Venus perturbation term, 3958e-6 deg)
 *   A2 =  53.09 + 479264.290·T   (Jupiter perturbation term, 318e-6 deg)
 *   A3 = 313.45 + 481266.484·T   (latitude term, 306e-6 deg)
 *
 * Framework basis rates: Moon months from the 8H lattice, planet years from
 * the framework's solarYearInput values, Earth year from the H/8-quantized
 * mean solar year, general precession from H/13.
 *
 * Usage: node tools/explore/derive-a1a2a3.js
 */

const C = require('../lib/constants');

const DAYS_PER_CY = 36525;
const rate = (periodDays) => 360 * DAYS_PER_CY / periodDays;   // deg/cy

// ── framework basis ────────────────────────────────────────────────────────
const B = {
  Lp_trop: rate(C.moonTropicalMonth),          // Moon mean longitude, tropical (of-date)
  Lp_sid:  rate(C.moonSiderealMonth),          // Moon mean longitude, sidereal
  Mp:      rate(C.moonAnomalisticMonth),       // Moon mean anomaly rate carrier
  F_drac:  rate(C.moonNodalMonth),             // draconitic
  E_trop:  rate(C.meanSolarYearDays),          // Sun mean longitude, tropical
  V:       rate(C.planets.venus.solarYearInput),
  Ma:      rate(C.planets.mars.solarYearInput),
  J:       rate(C.planets.jupiter.solarYearInput),
  Sa:      rate(C.planets.saturn.solarYearInput),
  p:       360 * 100 * 13 / C.H,               // general precession (H/13), deg/cy
};
console.log('framework basis rates (deg/cy):');
for (const [k, v] of Object.entries(B)) console.log(' ', k.padEnd(8), v.toFixed(4));

const TARGETS = { A1: 131.849, A2: 479264.290, A3: 481266.484 };

// ── targeted identity checks (classical candidates) ────────────────────────
console.log('\n── direct identity candidates ──');
const check = (label, val, target) => {
  const dv = val - target;
  console.log(`  ${label.padEnd(44)} = ${val.toFixed(4).padStart(12)}   Δ ${dv >= 0 ? '+' : ''}${dv.toFixed(4)} (${(Math.abs(dv) / target * 1e6).toFixed(1)} ppm)`);
};
check('A3: Lp_trop − p', B.Lp_trop - B.p, TARGETS.A3);
check('A3: Lp_sid', B.Lp_sid, TARGETS.A3);
check('A3: Lp_sid − p', B.Lp_sid - B.p, TARGETS.A3);
check('A1: 18V − 16E − Mp', 18 * B.V - 16 * B.E_trop - B.Mp, TARGETS.A1);
check('A1: 18V − 16E − Lp_trop', 18 * B.V - 16 * B.E_trop - B.Lp_trop, TARGETS.A1);
check('A2: Lp_trop − 2E + 2J', B.Lp_trop - 2 * B.E_trop + 2 * B.J, TARGETS.A2);
check('A2: Lp_trop − (E − J)', B.Lp_trop - (B.E_trop - B.J), TARGETS.A2);

// ── brute search: cV·V + cE·E + cL·Lp + cM·Mp + cF·F + cJ·J + cp·p ────────
console.log('\n── small-integer combination search (|Δ| < 0.5 deg/cy) ──');
const names = ['V', 'E_trop', 'Lp_trop', 'Mp', 'F_drac', 'J', 'p'];
const vals = names.map(n => B[n]);
const RANGES = {
  V: [-20, 20], E_trop: [-20, 20], Lp_trop: [-2, 2], Mp: [-2, 2], F_drac: [-2, 2], J: [-4, 4], p: [-2, 2],
};
for (const [tName, target] of Object.entries(TARGETS)) {
  const hits = [];
  const r = names.map(n => RANGES[n]);
  for (let a = r[0][0]; a <= r[0][1]; a++)
  for (let b = r[1][0]; b <= r[1][1]; b++)
  for (let c = r[2][0]; c <= r[2][1]; c++)
  for (let d = r[3][0]; d <= r[3][1]; d++)
  for (let e = r[4][0]; e <= r[4][1]; e++)
  for (let f = r[5][0]; f <= r[5][1]; f++)
  for (let g = r[6][0]; g <= r[6][1]; g++) {
    const v = a * vals[0] + b * vals[1] + c * vals[2] + d * vals[3] + e * vals[4] + f * vals[5] + g * vals[6];
    const dv = Math.abs(v - target);
    if (dv < 0.5) {
      const complexity = Math.abs(a) + Math.abs(b) + Math.abs(c) + Math.abs(d) + Math.abs(e) + Math.abs(f) + Math.abs(g);
      hits.push({ combo: [a, b, c, d, e, f, g], v, dv, complexity });
    }
  }
  hits.sort((x, y) => x.dv + x.complexity * 0.01 - (y.dv + y.complexity * 0.01));
  console.log(`\n  ${tName} = ${target}:`);
  for (const h of hits.slice(0, 6)) {
    const expr = h.combo.map((cf, i) => cf === 0 ? null : `${cf > 0 ? '+' : ''}${cf}·${names[i]}`).filter(Boolean).join(' ');
    console.log(`    ${expr.padEnd(52)} = ${h.v.toFixed(4).padStart(12)}   Δ ${(h.v - target).toFixed(4)} (${(h.dv / target * 1e6).toFixed(1)} ppm, |c|=${h.complexity})`);
  }
  if (hits.length === 0) console.log('    (no combination within 0.5 deg/cy — widen ranges)');
}
