// U2 part 3: THE J-S SYNODIC LADDER (mechanism-gated, uncommitted).
// The one physical base tone with an exact-integer lattice count is the
// Jupiter-Saturn synodic (n_syn = 135,084 per 8H, integer to 0.00%).
// Test: which deltaT tones are integer multiples of the synodic - the
// Jose cycle itself being the 9-synodic recurrence (178.7 yr), so Jose4
// = 36 syn, Jose5 = 45 syn, Bond claimed 74 syn. Quantify each fit, the
// lattice-rounding offsets, and the epoch where the two hypotheses
// (exact lattice n vs exact synodic multiple) diverge observably.
// Also: which tones are NOT on the ladder (mechanism separation).
import { createRequire } from 'node:module';
const require2 = createRequire('/home/dennis/code/3d/package.json');
const C = require2('/home/dennis/code/3d/tools/lib/constants.js');

const H8 = 8 * C.H;
const SY = C.meanSolarYearDays;
const PJ = C.planets.jupiter.solarYearInput / SY;
const PS = C.planets.saturn.solarYearInput / SY;
const fSyn = Math.abs(1 / PJ - 1 / PS);
const Psyn = 1 / fSyn;
const nSyn = H8 / Psyn;
console.log(`J–S synodic: ${Psyn.toFixed(4)} yr · count per 8H = ${nSyn.toFixed(2)} (integer to ${(Math.abs(nSyn - Math.round(nSyn)) / nSyn * 100).toExponential(1)}%)`);
console.log(`Jose recurrence = 9 synodic = ${(9 * Psyn).toFixed(2)} yr\n`);

console.log('tone      | lattice n | period (yr) | / synodic | nearest k | k·synodic (yr) | Δ');
for (const [name, n] of [['Bond', 1830], ['Hallstatt', 1104], ['Jose5', 2989], ['Jose4', 3749], ['core T0', 685]]) {
  const P = H8 / n;
  const ratio = P / Psyn;
  const k = Math.round(ratio);
  const Pk = k * Psyn;
  const rel = (P - Pk) / P;
  console.log(`  ${name.padEnd(8)} ${String(n).padStart(5)} | ${P.toFixed(1).padStart(8)} | ${ratio.toFixed(2).padStart(8)} | ${String(k).padStart(6)} | ${Pk.toFixed(1).padStart(9)} | ${(rel * 100).toFixed(2).padStart(6)}%${Math.abs(rel) < 0.005 ? '  ◄ ON THE LADDER' : (Math.abs(rel) < 0.01 ? '  (near)' : '')}`);
}

// null context: probability that a random period in [700, 4000] lands
// within 0.5% of SOME synodic multiple: spacing 19.86 yr → tolerance
// band 2×0.005×P around each rung → coverage ≈ 2×0.005×P/19.86.
console.log('\nnull context: chance of a random tone landing within 0.5% of a rung:');
for (const P of [715, 900, 1466, 2430, 3916]) {
  console.log(`  at ${P} yr: ${(2 * 0.005 * P / Psyn * 100).toFixed(0)}%`);
}

// phase divergence: lattice-n vs synodic-multiple hypotheses
console.log('\nhypothesis divergence (phase drift between exact-lattice and exact-ladder):');
for (const [name, n, k] of [['Bond', 1830, 74], ['Jose5', 2989, 45], ['Jose4', 3749, 36]]) {
  const P1 = H8 / n, P2 = k * Psyn;
  const beatYr = 1 / Math.abs(1 / P1 - 1 / P2);
  console.log(`  ${name.padEnd(6)}: quarter-phase divergence after ${(beatYr / 4).toFixed(0)} yr (beat ${(beatYr / 1000).toFixed(0)} kyr)`);
}
