// U2: THE COMMON-SOURCE DICTIONARY (exploration, uncommitted).
// "Nothing moves independently" — connect the deltaT lattice divisors, the
// Moon's long-period planetary terms, and the planets' base motions.
//
//  1. FACTOR STRUCTURE: H = 335,317 = 23 x 61 x 239 (three primes). Every
//     deltaT divisor factors over H's primes; 239 yr is ITSELF the
//     Venus-Earth 8:13 beat (the pentagram) — a planetary period sitting
//     inside H's prime factorization.
//  2. QUANTIZATION: the model's lattice locks the SLOW skeleton
//     (perihelion/node cycles: Jupiter perihelion = 8H/39 exactly, ...) —
//     fast orbit years are measured inputs.
//  3. DICTIONARY A (deltaT -> planetary combos, correct units).
//  4. DICTIONARY B (ELP census arguments under framework years vs their
//     ELP-rate periods — near-resonant combos amplify year differences).
//
// CONCLUSIONS AFTER THE RUN (read before believing any output below):
//  · TEST 2/3's resonant-combination results are NOT usable as-is — the
//    near-resonant arguments (2J−5S, 4T−8Ma+3J, 8V−13T) amplify planet-
//    year differences 30–100×, so the year-CONVENTION bookkeeping
//    (sidereal vs tropical vs anomalistic per body) dominates the
//    arithmetic. The framework combos landing off the ELP-rate periods
//    is a units/convention artifact, not physics — resolve conventions
//    before re-running, or use the combos as PRECISION CALIBRATORS of
//    the planet years (the useful inversion).
//  · What IS durable here: the exact-integer slow skeleton (every
//    perihelion cycle = 8H/small-integer as shipped) and the factor
//    structure of the ΔT divisors — with the caveat from
//    u2-combination-ripples.mjs that small-integer arithmetic alone
//    proves nothing (100%/18% null expressibility).
//
//   node tools/explore/u2-common-source-dictionary.mjs
import { createRequire } from 'node:module';
const require2 = createRequire('/home/dennis/code/3d/package.json');
const C = require2('/home/dennis/code/3d/tools/lib/constants.js');

const H = C.H, H8 = 8 * H;
const SY = C.meanSolarYearDays;

// ── 1. factor structure ──────────────────────────────────────────────────
const factor = (n) => { const f = []; let x = n; for (let p = 2; p * p <= x; p++) while (x % p === 0) { f.push(p); x /= p; } if (x > 1) f.push(x); return f; };
console.log(`H = ${H} = ${factor(H).join(' × ')}   ·   8H = ${H8}`);
console.log('ΔT divisors over the primes of H:');
for (const [name, n] of [['Bond', 1830], ['Hallstatt', 1104], ['Jose5', 2989], ['Jose4', 3749], ['core T0', 685]]) {
  console.log(`  ${name.padEnd(9)} n=${String(n).padEnd(5)} = ${factor(n).join('×').padEnd(12)} gcd(n,H)=${(function g(a,b){return b?g(b,a%b):a})(n,H)}   period ${(H8 / n).toFixed(1)} yr`);
}

// ── base motions, correct units (framework solar years) ─────────────────
const P = {};   // periods in framework solar years
P.T = C.meanSiderealYearDays / SY;
for (const [key, label] of [['mercury', 'Me'], ['venus', 'V'], ['mars', 'Ma'], ['jupiter', 'J'], ['saturn', 'S'], ['uranus', 'U'], ['neptune', 'N']]) {
  P[label] = C.planets[key].solarYearInput / SY;
}
P.l = C.moonAnomalisticMonth / SY;
P.D = C.moonSynodicMonth / SY;
P.F = C.moonNodalMonth / SY;
const f = Object.fromEntries(Object.entries(P).map(([k, v]) => [k, 1 / v]));

console.log('\nplanet years (framework, solar yr):', Object.entries(P).filter(([k]) => k.length <= 2 && k !== 'l' && k !== 'D' && k !== 'F').map(([k, v]) => `${k}=${v.toFixed(4)}`).join('  '));

// ── 2. the slow lattice skeleton (stored counts) ────────────────────────
console.log('\nslow skeleton (stored lattice counts):');
console.log(`  Jupiter perihelion: ${C.planets.jupiter.perihelionEclipticYears.toFixed(2)} yr = 8H/${(H8 / C.planets.jupiter.perihelionEclipticYears).toFixed(2)}`);
for (const key of ['mercury', 'venus', 'mars', 'saturn', 'uranus', 'neptune']) {
  const p = C.planets[key];
  if (p.perihelionEclipticYears) console.log(`  ${p.name} perihelion: ${p.perihelionEclipticYears.toFixed(2)} yr = 8H/${(H8 / p.perihelionEclipticYears).toFixed(2)}`);
}
console.log(`  Moon apsidal: H/${C.N_apsidalI} (${(H / C.N_apsidalI).toFixed(4)} yr) · Moon nodal: H/${C.N_nodalI} (${(H / C.N_nodalI).toFixed(4)} yr)`);

// ── 3. DICTIONARY A ─────────────────────────────────────────────────────
const families = [
  ['J', 'S'], ['J', 'S', 'U'], ['T', 'Ma'], ['T', 'Ma', 'J'], ['T', 'Ma', 'S'],
  ['V', 'T'], ['V', 'T', 'Ma'], ['Me', 'V', 'T'], ['V', 'T', 'J'], ['T', 'J', 'S'],
];
const LIM = { Me: 25, V: 45, T: 45, Ma: 45, J: 12, S: 12, U: 8, N: 8 };
function search(targetFreq, tolRel) {
  const hits = [];
  for (const fam of families) {
    const lims = fam.map((k) => LIM[k]);
    const idx = fam.map(() => 0);
    const rec = (pos) => {
      if (pos === fam.length) {
        if (idx.every((v) => v === 0)) return;
        const freq = fam.reduce((s, k, i) => s + idx[i] * f[k], 0);
        const a = Math.abs(freq);
        if (a < 1e-9) return;
        const rel = Math.abs(a - targetFreq) / targetFreq;
        if (rel < tolRel) hits.push({
          arg: fam.map((k, i) => idx[i] ? `${idx[i] > 0 ? '+' : ''}${idx[i]}${k}` : '').filter(Boolean).join(''),
          periodYr: 1 / a, rel, sum: idx.reduce((s, v) => s + Math.abs(v), 0),
        });
        return;
      }
      for (let v = -lims[pos]; v <= lims[pos]; v++) { idx[pos] = v; rec(pos + 1); }
    };
    rec(0);
  }
  hits.sort((x, y) => (x.rel + x.sum * 0.0015) - (y.rel + y.sum * 0.0015));
  const seen = new Set(); const out = [];
  for (const h of hits) {
    const key = h.periodYr.toFixed(1);
    if (seen.has(key)) continue;
    seen.add(key); out.push(h);
    if (out.length >= 4) break;
  }
  return out;
}
console.log('\nDICTIONARY A — ΔT divisors as planetary combinations (±2.5%, framework years):');
for (const [name, n] of [['Bond', 1830], ['Hallstatt', 1104], ['Jose5', 2989], ['Jose4', 3749], ['core T0', 685]]) {
  const Pt = H8 / n;
  console.log(`  ${name.padEnd(9)} ${Pt.toFixed(1).padStart(7)} yr:`);
  for (const h of search(1 / Pt, 0.025)) console.log(`      ${h.arg.padEnd(16)} → ${h.periodYr.toFixed(1).padStart(8)} yr  (Δ ${(h.rel * 100).toFixed(2)}%)`);
}

// ── 4. DICTIONARY B: census arguments, framework vs ELP-rate periods ────
console.log('\nDICTIONARY B — ELP long-period arguments (framework years):');
const args = [
  ['+2J-5S  (J–S great inequality)', { J: 2, S: -5 }, 872.5],
  ['+1J-1S  (J–S synodic)', { J: 1, S: -1 }, 19.86],
  ['+4T-8Ma+3J', { T: 4, Ma: -8, J: 3 }, 2102.8],
  ['+8V-13T (pentagram)', { V: 8, T: -13 }, 239.0],
  ['+1l-18V+16T (A1)', { l: 1, V: -18, T: 16 }, 273.2],
  ['+1l-15V+9T+4Ma', { l: 1, V: -15, T: 9, Ma: 4 }, 2480.0],
];
for (const [label, combo, elpP] of args) {
  const freq = Math.abs(Object.entries(combo).reduce((s, [k, v]) => s + v * f[k], 0));
  const Pfw = 1 / freq;
  const n = H8 / Pfw;
  console.log(`  ${label.padEnd(32)} fw ${Pfw.toFixed(1).padStart(8)} yr | ELP-rate ${String(elpP).padStart(7)} yr | n=8H/P=${n.toFixed(1).padStart(10)}`);
}
console.log(`\n  239-yr check: the pentagram period vs H's prime 239: Δ ${((1 / Math.abs(8 * f.V - 13 * f.T) - 239) / 239 * 100).toFixed(3)}%`);
console.log(`  Bond check: 74 × J–S synodic = ${(74 / Math.abs(f.J - f.S)).toFixed(1)} yr vs 8H/1830 = ${(H8 / 1830).toFixed(1)} yr (Δ ${((74 / Math.abs(f.J - f.S) - H8 / 1830) / (H8 / 1830) * 100).toFixed(2)}%)`);
