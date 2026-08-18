// U2 part 2: COMBINATION RIPPLES (exploration, uncommitted).
// Epoch-durable arithmetic only: the dimensionless lattice counts (per 8H)
// of the locked slow skeleton, and whether the deltaT divisors and the
// strand primes {23, 61, 239} are EXACT small-integer combinations
// (ripples) of skeleton counts. Includes a Monte-Carlo null control:
// with ~30 small integers and generous combo rules, MANY integers are
// expressible - the null rate tells us whether our hits mean anything.
//
//   node tools/explore/u2-combination-ripples.mjs
import { createRequire } from 'node:module';
const require2 = createRequire('/home/dennis/code/3d/package.json');
const C = require2('/home/dennis/code/3d/tools/lib/constants.js');

const H8 = 8 * C.H;
const base = [];   // {label, count} — per-8H counts, signed where stored signed
for (const key of ['mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune']) {
  const p = C.planets[key];
  base.push({ label: `${p.name}.peri`, count: Math.round(H8 / p.perihelionEclipticYears) });
  base.push({ label: `${p.name}.node`, count: p.ascendingNodeCyclesIn8H });
  base.push({ label: `${p.name}.obl`, count: Math.round(H8 / p.obliquityCycle) });
  base.push({ label: `${p.name}.wob`, count: Math.round(H8 / p.wobblePeriod) });
}
base.push({ label: 'Earth.peri(H/16)', count: 128 });
base.push({ label: 'Earth.prec(H/13)', count: 104 });
base.push({ label: 'Earth.ecc(H/3)', count: 24 });
console.log('locked skeleton counts (per 8H):');
console.log('  ' + base.map((b) => `${b.label}=${b.count}`).join('  '));

const counts = base.map((b) => b.count);
const labels = base.map((b) => b.label);

// EXACT expressibility: target = m*b_i (m<=30) | a*b_i + c*b_j | a*b_i + c*b_j + e*b_k
// with a,c,e in {-3..3}\{0}. Returns the simplest expression or null.
function express(target) {
  for (let i = 0; i < counts.length; i++) {
    if (counts[i] !== 0 && target % counts[i] === 0 && Math.abs(target / counts[i]) <= 30) {
      const m = target / counts[i];
      if (Math.abs(m) > 1) return `${m}×${labels[i]}`;
    }
  }
  const K = [-3, -2, -1, 1, 2, 3];
  for (let i = 0; i < counts.length; i++) for (let j = i + 1; j < counts.length; j++) {
    for (const a of K) for (const c of K) {
      if (a * counts[i] + c * counts[j] === target) return `${a}×${labels[i]} ${c >= 0 ? '+' : '−'} ${Math.abs(c)}×${labels[j]}`;
    }
  }
  for (let i = 0; i < counts.length; i++) for (let j = i + 1; j < counts.length; j++) for (let k = j + 1; k < counts.length; k++) {
    for (const a of K) for (const c of K) for (const e of K) {
      if (a * counts[i] + c * counts[j] + e * counts[k] === target) {
        return `${a}×${labels[i]} ${c >= 0 ? '+' : '−'} ${Math.abs(c)}×${labels[j]} ${e >= 0 ? '+' : '−'} ${Math.abs(e)}×${labels[k]}`;
      }
    }
  }
  return null;
}

console.log('\ntargets:');
for (const [name, t] of [['Bond n', 1830], ['Hallstatt n', 1104], ['Jose5 n', 2989], ['Jose4 n', 3749], ['core n', 685], ['prime 23', 23], ['prime 61', 61], ['prime 239', 239], ['cofactor 137', 137], ['cofactor 163', 163]]) {
  const e = express(t);
  console.log(`  ${name.padEnd(12)} ${String(t).padStart(5)}  →  ${e ?? 'NOT expressible under the rules'}`);
}

// null control: how many random integers in the same ranges are expressible?
function hitRate(lo, hi, trials) {
  let hits = 0;
  let seed = 123456789;
  const rnd = () => { seed = (1103515245 * seed + 12345) % 2147483648; return seed / 2147483648; };
  for (let t = 0; t < trials; t++) {
    const target = lo + Math.floor(rnd() * (hi - lo));
    if (express(target) !== null) hits++;
  }
  return hits / trials;
}
console.log('\nnull control (random integers, same rules):');
console.log(`  range 500–4000 : ${(hitRate(500, 4000, 300) * 100).toFixed(0)}% expressible`);
console.log(`  range 20–300   : ${(hitRate(20, 300, 300) * 100).toFixed(0)}% expressible`);
