/**
 * Verify the cumulative integral table matches direct Simpson N=1000
 * for the year ranges actually used by Phase 8 callers.
 *
 * Phase 8 uses BALANCED_YEAR_J2000_FIXED ≈ -302,635 as the anchor for
 * Earth eccentricity / perihelion / obliquity / inclination, and
 * ECCENTRICITY_ANCHOR_J2000_FIXED ≈ -2,649,854 for the n=7 system-reset
 * anchor. Test ranges around both.
 *
 * Reproduces a minimal `meanHAtAge`-like H(t) for self-contained
 * comparison — the absolute values won't match the real model but the
 * relative agreement between table-lookup and Simpson is what we test.
 */

const HOLISTIC_YEAR_J2000 = 335317;
const J2000_CALENDAR_YEAR = 2000.5;

// A toy H(t_Ma) that varies smoothly with t_Ma — uses a similar curvature
// to the ESSRT formula. Real model is monotonic-ish in t_Ma.
function meanHAtAge(t_Ma) {
  // small quadratic-ish drift, monotone shrinking H going back in time
  return HOLISTIC_YEAR_J2000 * (1 + 1e-5 * t_Ma - 1e-9 * t_Ma * t_Ma);
}

// ──── Simpson (the original) ────
function simpsonIntegral(yearA, yearB, N = 1000) {
  if (yearA === yearB) return 0;
  const span = yearB - yearA;
  const h = span / N;
  let sum = 0;
  for (let i = 0; i <= N; i++) {
    const year_i = yearA + i * h;
    const t_Ma = (J2000_CALENDAR_YEAR - year_i) / 1e6;
    const H_i = meanHAtAge(t_Ma);
    const weight = (i === 0 || i === N) ? 1 : (i % 2 === 1 ? 4 : 2);
    sum += weight / H_i;
  }
  return sum * h / 3;
}

// ──── Cumulative table (mirrors what's in script.js) ────
const YEAR_MIN = -3.0e6, YEAR_MAX = 1.0e6, STEP = 100;
const N_TABLE = Math.ceil((YEAR_MAX - YEAR_MIN) / STEP) + 1;
const table = new Float64Array(N_TABLE);
const j2000Idx = Math.round((J2000_CALENDAR_YEAR - YEAR_MIN) / STEP);

function invH(year) { return 1 / meanHAtAge((J2000_CALENDAR_YEAR - year) / 1e6); }
table[j2000Idx] = 0;
let prev = invH(YEAR_MIN + j2000Idx * STEP);
for (let i = j2000Idx + 1; i < N_TABLE; i++) {
  const curr = invH(YEAR_MIN + i * STEP);
  table[i] = table[i - 1] + 0.5 * (prev + curr) * STEP;
  prev = curr;
}
prev = invH(YEAR_MIN + j2000Idx * STEP);
for (let i = j2000Idx - 1; i >= 0; i--) {
  const curr = invH(YEAR_MIN + i * STEP);
  table[i] = table[i + 1] - 0.5 * (prev + curr) * STEP;
  prev = curr;
}

function cumAt(year) {
  if (year < YEAR_MIN || year > YEAR_MAX) return null;
  const idx_f = (year - YEAR_MIN) / STEP;
  const lo = Math.floor(idx_f);
  const hi = Math.min(lo + 1, N_TABLE - 1);
  return table[lo] + (idx_f - lo) * (table[hi] - table[lo]);
}

function tableIntegral(yearA, yearB) {
  if (yearA === yearB) return 0;
  return cumAt(yearB) - cumAt(yearA);
}

// ──── Tests ────
const BALANCED = -302635;
const ECC      = -2649854;

const cases = [
  // [name, yearA, yearB]
  ['anchor → J2000 (Earth ecc)',    BALANCED, 2000],
  ['ECC anchor → J2000',            ECC,      2000],
  ['anchor → year 1900',            BALANCED, 1900],
  ['anchor → year 2100',            BALANCED, 2100],
  ['anchor → Devonian (-380M)',     BALANCED, -380000],
  ['anchor → +1M future',           BALANCED, 1000000],
  ['ECC anchor → Devonian',         ECC,      -380000],
  ['narrow J2000-near (1900→2100)', 1900,     2100],
  ['narrow Devonian (-380M→-379M)', -380000,  -379000],
];

console.log('Cumulative table vs Simpson N=1000');
console.log('Format: (yearA → yearB)   simpson           table           rel.err.');
console.log('─'.repeat(85));
let maxRel = 0;
for (const [name, yA, yB] of cases) {
  const s = simpsonIntegral(yA, yB);
  const t = tableIntegral(yA, yB);
  const rel = Math.abs((t - s) / s);
  maxRel = Math.max(maxRel, rel);
  const flag = rel > 1e-9 ? '⚠' : '✓';
  console.log(`  ${flag} ${name.padEnd(36)} ${s.toExponential(6).padStart(14)}  ${t.toExponential(6).padStart(14)}  ${rel.toExponential(2)}`);
}
console.log('─'.repeat(85));
console.log(`Max relative error: ${maxRel.toExponential(2)}`);
console.log(`Phase error from this (at 2π × 28 worst-case divisor): ${(maxRel * 2 * Math.PI * 28).toExponential(2)} rad`);

// Perf test
const N_PERF = 100000;
const t0 = process.hrtime.bigint();
let acc = 0;
for (let i = 0; i < N_PERF; i++) {
  acc += tableIntegral(BALANCED, 2000 + (i % 100));
}
const t1 = process.hrtime.bigint();
const tableUs = Number(t1 - t0) / 1000 / N_PERF;

const t2 = process.hrtime.bigint();
acc = 0;
for (let i = 0; i < 1000; i++) {  // fewer iters — simpson is slow
  acc += simpsonIntegral(BALANCED, 2000 + (i % 100));
}
const t3 = process.hrtime.bigint();
const simpsonUs = Number(t3 - t2) / 1000 / 1000;

console.log();
console.log(`Per-call cost: table = ${tableUs.toFixed(3)} µs/call · simpson = ${simpsonUs.toFixed(2)} µs/call`);
console.log(`Speedup: ${(simpsonUs / tableUs).toFixed(0)}×`);
