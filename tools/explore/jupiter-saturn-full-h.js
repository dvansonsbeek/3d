#!/usr/bin/env node
/**
 * Jupiter-Saturn conjunction pattern over the full Earth Fundamental Cycle.
 *
 * Analytical computation — no scene-graph needed. Computes all ~16,870
 * conjunctions in H from orbital periods + perihelion precession + eccentricity.
 *
 * Key question: does the triple conjunction interval (trigon ~59.6yr)
 * show a systematic modulation over H, and does it follow H/13?
 */

const C = require('../lib/constants');

const H = C.H;
const balancedYear = C.balancedYear;
const d2r = Math.PI / 180;

// Orbital periods in years
const Tj = C.planets.jupiter.solarYearInput / C.meanSolarYearDays;
const Ts = C.planets.saturn.solarYearInput / C.meanSolarYearDays;

// Eccentricities
const eJ = C.planets.jupiter.orbitalEccentricityJ2000 || C.planets.jupiter.orbitalEccentricityBase;
const eS = C.planets.saturn.orbitalEccentricityJ2000 || C.planets.saturn.orbitalEccentricityBase;

// Semi-major axes (Kepler 3rd law)
const aJ = Math.pow(Tj * Tj, 1 / 3);
const aS = Math.pow(Ts * Ts, 1 / 3);

// Perihelion precession rates (deg/yr)
const jupPeriRate = 360.0 / C.planets.jupiter.perihelionEclipticYears;  // H/5
const satPeriRate = 360.0 / C.planets.saturn.perihelionEclipticYears;   // -H/8

// Perihelion longitudes at J2000
const jupPeriLon0 = C.planets.jupiter.longitudePerihelion;
const satPeriLon0 = C.planets.saturn.longitudePerihelion;

// Mean motions (deg/yr)
const nJ = 360.0 / Tj;
const nS = 360.0 / Ts;

// Effective mean motions (including perihelion precession)
const nJ_eff = nJ + jupPeriRate;
const nS_eff = nS + satPeriRate;

// Synodic period
const synodic = 360.0 / (nJ - nS);
const synodicEff = 360.0 / (nJ_eff - nS_eff);

console.log('═══════════════════════════════════════════════════════════════');
console.log('  JUPITER-SATURN CONJUNCTIONS OVER FULL H');
console.log('═══════════════════════════════════════════════════════════════');
console.log('');
console.log('H = ' + H + ' years, balanced year = ' + balancedYear);
console.log('Jupiter: T=' + Tj.toFixed(4) + 'yr, e=' + eJ.toFixed(6) + ', a=' + aJ.toFixed(4) + ' AU, peri=H/5');
console.log('Saturn:  T=' + Ts.toFixed(4) + 'yr, e=' + eS.toFixed(6) + ', a=' + aS.toFixed(4) + ' AU, peri=-H/8');
console.log('Synodic: ' + synodic.toFixed(4) + 'yr (effective: ' + synodicEff.toFixed(4) + 'yr)');
console.log('Expected conjunctions in H: ' + Math.round(H / synodic));
console.log('');

// ─── Analytical conjunction computation ─────────────────────────────────
// Jupiter mean longitude: L_J = L_J0 + nJ_eff × t
// Saturn mean longitude:  L_S = L_S0 + nS_eff × t
// Conjunction when L_J ≡ L_S (mod 360)
// → t_k = (360k + L_S0 - L_J0) / (nJ_eff - nS_eff)
//
// At conjunction, compute true anomaly and distance for each planet.
// True anomaly ≈ M + 2e*sin(M) + 1.25e²*sin(2M) (equation of center)
// Distance r = a(1 - e*cos(E)) ≈ a(1 - e*cos(M)) for small e

// Initial mean longitudes at balancedYear (arbitrary reference, use 0)
// We only need RELATIVE longitudes, so set Jupiter initial to 0
const L_J0 = 0;
const L_S0 = 0;  // doesn't matter for interval computation

// Compute all conjunctions
const conjunctions = [];
const totalConj = Math.round(H / synodicEff);

for (let k = 0; k <= totalConj; k++) {
  const t = k * synodicEff;  // years from balancedYear
  const year = balancedYear + t;

  // Jupiter mean anomaly at this time
  // M_J = n_J × t - perihelion_advance
  // The mean anomaly is the orbital angle measured from perihelion
  const jupPeriLon = jupPeriLon0 + jupPeriRate * (year - 2000);
  const satPeriLon = satPeriLon0 + satPeriRate * (year - 2000);

  // Mean longitude (approximate)
  const jupMeanLon = nJ_eff * t;
  const satMeanLon = nS_eff * t;

  // Mean anomaly = mean longitude - perihelion longitude
  const MJ = (jupMeanLon - jupPeriLon) * d2r;
  const MS = (satMeanLon - satPeriLon) * d2r;

  // True anomaly (EoC approximation)
  const nuJ = MJ + 2 * eJ * Math.sin(MJ) + 1.25 * eJ * eJ * Math.sin(2 * MJ);
  const nuS = MS + 2 * eS * Math.sin(MS) + 1.25 * eS * eS * Math.sin(2 * MS);

  // Distance r = a(1 - e²) / (1 + e*cos(ν))
  const rJ = aJ * (1 - eJ * eJ) / (1 + eJ * Math.cos(nuJ));
  const rS = aS * (1 - eS * eS) / (1 + eS * Math.cos(nuS));

  // Ecliptic longitude of conjunction
  const conjLon = (jupMeanLon + 2 * eJ * Math.sin(MJ) / d2r) % 360;

  conjunctions.push({ k, year, rJ, rS, MJ, MS, nuJ, nuS, conjLon, jupPeriLon, satPeriLon });
}

console.log('Computed ' + conjunctions.length + ' conjunctions over H');
console.log('');

// ─── Triple conjunction intervals ───────────────────────────────────────

console.log('─── Triple Conjunction (Trigon) Intervals ───');
console.log('');

const tripleIntervals = [];
for (let i = 3; i < conjunctions.length; i++) {
  tripleIntervals.push(conjunctions[i].year - conjunctions[i - 3].year);
}

const tripleMean = tripleIntervals.reduce((a, b) => a + b, 0) / tripleIntervals.length;
const tripleMin = Math.min(...tripleIntervals);
const tripleMax = Math.max(...tripleIntervals);
const tripleStd = Math.sqrt(tripleIntervals.reduce((s, v) => s + (v - tripleMean) ** 2, 0) / tripleIntervals.length);

console.log('Mean triple interval:  ' + tripleMean.toFixed(4) + ' yr');
console.log('Std deviation:         ' + tripleStd.toFixed(4) + ' yr');
console.log('Min:                   ' + tripleMin.toFixed(4) + ' yr');
console.log('Max:                   ' + tripleMax.toFixed(4) + ' yr');
console.log('Range:                 ' + (tripleMax - tripleMin).toFixed(4) + ' yr');
console.log('Theory (3 × synodic):  ' + (3 * synodic).toFixed(4) + ' yr');
console.log('Theory (3 × eff):      ' + (3 * synodicEff).toFixed(4) + ' yr');
console.log('');

// ─── Fourier analysis of triple interval variation ──────────────────────

console.log('─── Fourier Analysis of Trigon Interval Variation ───');
console.log('');
console.log('Testing if the triple interval varies with H-fraction periods...');
console.log('');

// The triple interval at index i corresponds to year ~ conjunctions[i].year
const tripleYears = [];
for (let i = 3; i < conjunctions.length; i++) {
  tripleYears.push({
    year: conjunctions[i].year,
    interval: conjunctions[i].year - conjunctions[i - 3].year,
    deviation: (conjunctions[i].year - conjunctions[i - 3].year) - tripleMean,
  });
}

const testPeriods = [
  { name: 'H/3', T: H / 3 },
  { name: 'H/5', T: H / 5 },
  { name: 'H/8', T: H / 8 },
  { name: 'H/13', T: H / 13 },
  { name: 'H/16', T: H / 16 },
  { name: 'H/21', T: H / 21 },
  { name: 'H/34', T: H / 34 },
  { name: 'H/40', T: H / 40 },
  { name: 'H/2', T: H / 2 },
  { name: 'H', T: H },
  { name: '3×syn', T: 3 * synodic },
  { name: 'GI (883yr)', T: 360 / Math.abs(2 * nJ - 5 * nS) },
];

console.log('Period           │ Amplitude (yr) │ Fraction of mean │ Significant?');
console.log('─────────────────┼────────────────┼──────────────────┼─────────────');

const n = tripleYears.length;
const results = [];
for (const p of testPeriods) {
  let sumSin = 0, sumCos = 0;
  for (const ty of tripleYears) {
    const phase = 2 * Math.PI * (ty.year - balancedYear) / p.T;
    sumSin += ty.deviation * Math.sin(phase);
    sumCos += ty.deviation * Math.cos(phase);
  }
  const amp = 2 * Math.sqrt(sumSin ** 2 + sumCos ** 2) / n;
  const frac = amp / tripleMean;
  results.push({ ...p, amp, frac });
}

results.sort((a, b) => b.amp - a.amp);
for (const r of results) {
  const sig = r.amp > 0.01 ? ' ← YES' : '';
  console.log(r.name.padEnd(17) + '│ ' + r.amp.toFixed(6).padStart(14) + ' │ ' + (r.frac * 100).toFixed(4).padStart(14) + '% │' + sig);
}

// ─── Jupiter distance at conjunction over H ─────────────────────────────

console.log('');
console.log('─── Jupiter Distance at Conjunction Over H ───');
console.log('');

// Fourier analysis of Jupiter distance variation
const distYears = conjunctions.map(c => ({
  year: c.year,
  dist: c.rJ,
  deviation: c.rJ - aJ,
}));

console.log('Mean distance: ' + aJ.toFixed(4) + ' AU (semi-major axis)');
console.log('Min distance:  ' + Math.min(...conjunctions.map(c => c.rJ)).toFixed(4) + ' AU');
console.log('Max distance:  ' + Math.max(...conjunctions.map(c => c.rJ)).toFixed(4) + ' AU');
console.log('');

const distPeriods = [
  { name: 'Tj (Jupiter orbital)', T: Tj },
  { name: 'Ts (Saturn orbital)', T: Ts },
  { name: 'Synodic', T: synodic },
  { name: '3×synodic (trigon)', T: 3 * synodic },
  { name: 'H/3', T: H / 3 },
  { name: 'H/5 (Jup peri)', T: H / 5 },
  { name: 'H/8 (Sat peri)', T: H / 8 },
  { name: 'H/13 (axial)', T: H / 13 },
  { name: 'H/16 (Earth peri)', T: H / 16 },
  { name: 'GI (883yr)', T: 360 / Math.abs(2 * nJ - 5 * nS) },
];

console.log('Period              │ Amplitude (AU) │ Fraction of a │ Significant?');
console.log('────────────────────┼────────────────┼───────────────┼─────────────');

const nDist = distYears.length;
const distResults = [];
for (const p of distPeriods) {
  let sumSin = 0, sumCos = 0;
  for (const dy of distYears) {
    const phase = 2 * Math.PI * (dy.year - balancedYear) / p.T;
    sumSin += dy.deviation * Math.sin(phase);
    sumCos += dy.deviation * Math.cos(phase);
  }
  const amp = 2 * Math.sqrt(sumSin ** 2 + sumCos ** 2) / nDist;
  const frac = amp / aJ;
  distResults.push({ ...p, amp, frac });
}

distResults.sort((a, b) => b.amp - a.amp);
for (const r of distResults) {
  const sig = r.amp > 0.01 ? ' ← YES' : '';
  console.log(r.name.padEnd(20) + '│ ' + r.amp.toFixed(6).padStart(14) + ' │ ' + (r.frac * 100).toFixed(4).padStart(11) + '% │' + sig);
}

// ─── Saturn distance at conjunction over H ──────────────────────────────

console.log('');
console.log('─── Saturn Distance at Conjunction Over H ───');
console.log('');

const satDistYears = conjunctions.map(c => ({
  year: c.year,
  dist: c.rS,
  deviation: c.rS - aS,
}));

console.log('Mean distance: ' + aS.toFixed(4) + ' AU (semi-major axis)');
console.log('Min distance:  ' + Math.min(...conjunctions.map(c => c.rS)).toFixed(4) + ' AU');
console.log('Max distance:  ' + Math.max(...conjunctions.map(c => c.rS)).toFixed(4) + ' AU');
console.log('');

console.log('Period              │ Amplitude (AU) │ Fraction of a │ Significant?');
console.log('────────────────────┼────────────────┼───────────────┼─────────────');

const satDistResults = [];
for (const p of distPeriods) {
  let sumSin = 0, sumCos = 0;
  for (const dy of satDistYears) {
    const phase = 2 * Math.PI * (dy.year - balancedYear) / p.T;
    sumSin += dy.deviation * Math.sin(phase);
    sumCos += dy.deviation * Math.cos(phase);
  }
  const amp = 2 * Math.sqrt(sumSin ** 2 + sumCos ** 2) / nDist;
  const frac = amp / aS;
  satDistResults.push({ ...p, amp, frac });
}

satDistResults.sort((a, b) => b.amp - a.amp);
for (const r of satDistResults) {
  const sig = r.amp > 0.01 ? ' ← YES' : '';
  console.log(r.name.padEnd(20) + '│ ' + r.amp.toFixed(6).padStart(14) + ' │ ' + (r.frac * 100).toFixed(4).padStart(11) + '% │' + sig);
}

// ─── Binned view: trigon interval evolution over H ──────────────────────

console.log('');
console.log('─── Trigon Interval Evolution Over H (binned) ───');
console.log('');
console.log('Sampling the triple interval at different epochs in H to see');
console.log('how it varies with the H/13 eccentricity offset cycle.');
console.log('');

const binSize = H / 26; // ~12,885 yr bins (2 per H/13)
console.log('Year (from balance) │ Mean triple │ Std dev  │ Jup dist range');
console.log('────────────────────┼─────────────┼──────────┼───────────────');

for (let binStart = 0; binStart < H; binStart += binSize) {
  const binEnd = binStart + binSize;
  const binTriples = tripleYears.filter(ty =>
    (ty.year - balancedYear) >= binStart && (ty.year - balancedYear) < binEnd);
  const binConjs = conjunctions.filter(c =>
    (c.year - balancedYear) >= binStart && (c.year - balancedYear) < binEnd);

  if (binTriples.length < 5) continue;

  const mean = binTriples.reduce((s, t) => s + t.interval, 0) / binTriples.length;
  const std = Math.sqrt(binTriples.reduce((s, t) => s + (t.interval - mean) ** 2, 0) / binTriples.length);
  const minDist = binConjs.length > 0 ? Math.min(...binConjs.map(c => c.rJ)) : 0;
  const maxDist = binConjs.length > 0 ? Math.max(...binConjs.map(c => c.rJ)) : 0;

  const yearLabel = binStart.toFixed(0);
  console.log(yearLabel.padStart(20) + ' │ ' + mean.toFixed(4).padStart(11) + ' │ ' + std.toFixed(4).padStart(8) + ' │ ' + minDist.toFixed(2) + '-' + maxDist.toFixed(2) + ' AU');
}

// ─── Summary ────────────────────────────────────────────────────────────

console.log('');
console.log('═══════════════════════════════════════════════════════════════');
console.log('  SUMMARY');
console.log('═══════════════════════════════════════════════════════════════');
console.log('');
console.log(conjunctions.length + ' conjunctions computed over H = ' + H + ' years');
console.log('Mean synodic interval: ' + (conjunctions.length > 1 ? (conjunctions.map((c, i) => i > 0 ? c.year - conjunctions[i - 1].year : 0).filter(v => v > 0).reduce((a, b) => a + b, 0) / (conjunctions.length - 1)).toFixed(4) : '?') + ' yr');
console.log('Mean triple interval:  ' + tripleMean.toFixed(4) + ' yr (σ=' + tripleStd.toFixed(4) + ')');
console.log('');
console.log('The triple interval variation is dominated by:');
for (const r of results.slice(0, 5)) {
  console.log('  ' + r.name.padEnd(15) + ' amplitude=' + r.amp.toFixed(4) + ' yr (' + (r.frac * 100).toFixed(2) + '% of mean)');
}
console.log('');
console.log('Jupiter distance at conjunction is modulated by:');
for (const r of distResults.slice(0, 5)) {
  console.log('  ' + r.name.padEnd(20) + ' amplitude=' + r.amp.toFixed(4) + ' AU (' + (r.frac * 100).toFixed(2) + '% of a)');
}
console.log('');
console.log('═══════════════════════════════════════════════════════════════');
