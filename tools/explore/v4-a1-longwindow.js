/**
 * v4-a1-longwindow.js — E4 of the v4 campaign (IP-v4-lab.md), stretch:
 * characterize the A1 resonance line at long window (18 kyr → 2 °/cy
 * resolution vs the 2-kyr run's ~18).
 *
 * v2 found a single line at ~141.5 °/cy (the lab's own 18V−16E−M′ beat),
 * amp 3027e-6 ≈ 77% of Meeus 3958. The RATE is observationally-defined
 * (hypersensitive to ppm planet-year differences — v2 result); this run
 * asks only whether the AMPLITUDE approaches Meeus with a resolved line.
 *
 * Usage: node tools/explore/v4-a1-longwindow.js [years=18000] [dtDays=0.04]
 */

const D1 = require('./derive-meeus-amplitudes');
const LAB = require('./derive-planetary-lunar-terms');

const YEARS = parseFloat(process.argv[2] || '18000');
const DTD = parseFloat(process.argv[3] || '0.04');
const SAMPLE_D = YEARS > 10000 ? 2 : 1;
const d2r = Math.PI / 180;

console.log(`v4 E4 — A1 long-window: ${YEARS} yr at dt=${DTD} d, sampling ${SAMPLE_D} d`);
console.log('calibrating lunar ICs (D1)...');
const cal = D1.calibrate(undefined, true);
const moonIC = { a: cal.aIC, e: cal.eIC, i: cal.iIC };

const t0 = Date.now();
const full = LAB.runSystem({ planets: true, j2: true, sampleDays: SAMPLE_D }, moonIC, YEARS, DTD);
const b3 = LAB.runSystem({ planets: false, j2: false, sampleDays: SAMPLE_D }, moonIC, YEARS, DTD);
console.log(`integrated in ${((Date.now() - t0) / 1000).toFixed(0)} s (E-drift ${full.energyDrift.toExponential(1)}/cy)`);

const dl = LAB.detrended(full, b3);
const T = full.t;

// slow-band periodogram around the A1 band, fine grid
const RES = 36000 / YEARS;
console.log(`\nA1-band periodogram (resolution ${RES.toFixed(1)} °/cy; Meeus A1: 3958e-6 at 131.849 °/cy):`);
const peaks = [];
for (let rate = 100; rate <= 180; rate += RES / 8) {
  peaks.push({ rate, amp: LAB.ampAt(dl, T, i => rate * (T[i] / 36525) * d2r) });
}
peaks.sort((a, b) => b.amp - a.amp);
const shown = [];
for (const p of peaks) {
  if (shown.some(q => Math.abs(q.rate - p.rate) < RES * 1.5)) continue;
  shown.push(p);
  if (shown.length >= 6) break;
}
shown.sort((a, b) => a.rate - b.rate);
for (const p of shown) {
  console.log(`  rate ${p.rate.toFixed(1).padStart(6)} °/cy (period ${(36000 / p.rate).toFixed(0)} yr)  amp ${(p.amp * 1e6).toFixed(0).padStart(6)}e-6°  (${(p.amp * 1e6 / 3958 * 100).toFixed(0)}% of Meeus)`);
}
const top = shown.reduce((a, b) => (b.amp > a.amp ? b : a));
console.log(`\ndominant line: ${(top.amp * 1e6).toFixed(0)}e-6 at ${top.rate.toFixed(1)} °/cy = ${(top.amp * 1e6 / 3958 * 100).toFixed(1)}% of Meeus 3958 (v2 2-kyr: 3027e-6 = 77%)`);
