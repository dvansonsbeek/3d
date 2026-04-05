// ═══════════════════════════════════════════════════════════════════════════
// STEP 1: COUPLED D-VALUE AND PERIOD ANALYSIS
// ═══════════════════════════════════════════════════════════════════════════
//
// The inclination rate depends on BOTH amplitude (d) AND period:
//   di/dt = -sign × [ψ/(d×√m)] × sin(ω̃-φ) × [360/period]
//
// These are coupled: a different d may imply a different eigenmode
// with a different period. This script finds which (d, period) pairs
// produce the observed JPL rates while fitting within LL bounds.
//
// For each planet:
//   1. Test all Fibonacci d-values that fit LL bounds
//   2. For each d, compute the period needed to match the JPL rate
//   3. Check if that period corresponds to a Fibonacci-based fraction
//   4. Check if it matches known eigenfrequencies
//
// Usage: node tools/explore/step1-d-period-coupled.js
// ═══════════════════════════════════════════════════════════════════════════

const C = require('../lib/constants');

const H = C.H;
const PSI = C.PSI;
const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;
const SUPER_PERIOD = 8 * H;
const balancedYear = C.balancedYear;
const genPrec = H / 13;
const PLANET_KEYS = ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'];
const FIB_D = [1, 2, 3, 5, 8, 13, 21, 34, 55];

// ═══════════════════════════════════════════════════════════════════════════
// OBSERVED DATA
// ═══════════════════════════════════════════════════════════════════════════

const planets = PLANET_KEYS.map(key => {
  const p = key === 'earth' ? null : C.planets[key];
  const mass = C.massFraction[key];
  const sqrtM = Math.sqrt(mass);
  const sma = key === 'earth' ? 1.0 : C.derived[key].orbitDistance;
  const ecc = C.eccJ2000[key];
  const L = mass * Math.sqrt(sma * (1 - ecc * ecc));
  const inclJ2000 = key === 'earth' ? C.ASTRO_REFERENCE.earthInclinationJ2000_deg : p.invPlaneInclinationJ2000;
  const omegaJ2000 = key === 'earth' ? C.ASTRO_REFERENCE.earthAscendingNodeInvPlane : p.ascendingNodeInvPlane;
  const periLong = key === 'earth' ? C.ASTRO_REFERENCE.earthPerihelionLongitudeJ2000 : p.longitudePerihelion;
  const eclP = key === 'earth' ? H / 16 : p.perihelionEclipticYears;
  const icrfP = key === 'earth' ? H / 3 : 1 / (1 / eclP - 1 / genPrec);
  return { key, mass, sqrtM, sma, ecc, L, inclJ2000, omegaJ2000, periLong, eclP, icrfP };
});

const llBounds = {
  mercury: { min: 4.57, max: 9.86 }, venus: { min: 0.00, max: 3.38 },
  earth: { min: 0.00, max: 2.95 }, mars: { min: 0.00, max: 5.84 },
  jupiter: { min: 0.241, max: 0.489 }, saturn: { min: 0.797, max: 1.02 },
  uranus: { min: 0.902, max: 1.11 }, neptune: { min: 0.554, max: 0.800 },
};

// JPL ecliptic inclination rate (arcsec/century)
const jplRatesArcsecCy = {
  mercury: -23.89, venus: -2.86, earth: -46.94, mars: -18.72,
  jupiter: -2.48, saturn: +6.68, uranus: -3.64, neptune: +0.68,
};

// Known eigenfrequencies (arcsec/yr) and their periods
const eigenfreqs = [
  { label: 's₁', rate: -5.610, period: 231016, dom: 'Mercury' },
  { label: 's₂', rate: -7.060, period: 183569, dom: 'Venus' },
  { label: 's₃', rate: -18.851, period: 68750, dom: 'Earth' },
  { label: 's₄', rate: -17.635, period: 73490, dom: 'Mars' },
  { label: 's₆', rate: -26.350, period: 49184, dom: 'Saturn' },
  { label: 's₇', rate: -2.993, period: 433010, dom: 'Uranus' },
  { label: 's₈', rate: -0.692, period: 1872832, dom: 'Neptune' },
];

// H-fraction periods for comparison
const hFractions = [];
for (let n = 1; n <= 120; n++) {
  hFractions.push({ label: `8H/${n}`, period: SUPER_PERIOD / n, n });
}
// Also add simple H fractions
for (const n of [1, 2, 3, 5, 8, 13, 16, 21, 34]) {
  hFractions.push({ label: `H/${n}`, period: H / n, n: -n });
}

console.log('╔══════════════════════════════════════════════════════════════════════════╗');
console.log('║     STEP 1: COUPLED D-VALUE AND PERIOD ANALYSIS                         ║');
console.log('╚══════════════════════════════════════════════════════════════════════════╝');
console.log('');
console.log('For each planet: find (d, period) pairs that match the observed JPL rate');
console.log('Rate formula: di/dt = -sign × [ψ/(d×√m)] × sin(ω̃-φ) × [360/period]');
console.log('');

for (let j = 0; j < planets.length; j++) {
  const pl = planets[j];
  const key = pl.key;
  const ll = llBounds[key];
  const jplRate = jplRatesArcsecCy[key]; // arcsec/cy

  if (key === 'earth') {
    console.log('═══════════════════════════════════════════════════════════════════════════');
    console.log('EARTH: locked at d=3, period=H/3 (ICRF)');
    console.log('═══════════════════════════════════════════════════════════════════════════');
    console.log('');
    continue;
  }

  console.log('═══════════════════════════════════════════════════════════════════════════');
  console.log(`${key.toUpperCase()} — JPL rate: ${jplRate.toFixed(2)}″/cy, I_J2000: ${pl.inclJ2000.toFixed(4)}°, ω̃_J2000: ${pl.periLong.toFixed(2)}°`);
  console.log(`LL bounds: [${ll.min.toFixed(2)}°, ${ll.max.toFixed(2)}°], Current: d=${key === 'earth' ? 3 : C.planets[key].fibonacciD}, period=${Math.round(Math.abs(pl.icrfP)).toLocaleString()} yr`);
  console.log('═══════════════════════════════════════════════════════════════════════════');
  console.log('');

  console.log(' d  │ Group     │ Amp (°)   │ sin(ω̃-φ) │ Period needed (yr) │ Rate (°/yr)  │ Nearest H-frac    │ Match │ Eigenfreq?');
  console.log('────┼───────────┼───────────┼──────────┼────────────────────┼──────────────┼───────────────────┼───────┼──────────');

  for (const d of FIB_D) {
    const amp = PSI / (d * pl.sqrtM);

    for (const antiPhase of [false, true]) {
      // Phase angle from balanced year
      const periAtBY = ((pl.periLong + (360 / pl.icrfP) * (balancedYear - 2000)) % 360 + 360) % 360;
      const phaseAngle = antiPhase ? periAtBY : ((periAtBY - 180 + 360) % 360);

      // Check LL bounds
      const antiSign = antiPhase ? -1 : 1;
      const cosJ2000 = Math.cos((pl.periLong - phaseAngle) * DEG2RAD);
      const mean = pl.inclJ2000 - antiSign * amp * cosJ2000;
      if (mean - amp < ll.min - 0.05 || mean + amp > ll.max + 0.05) continue;

      // sin(ω̃ - φ) at J2000
      const sinPhase = Math.sin((pl.periLong - phaseAngle) * DEG2RAD);

      if (Math.abs(sinPhase) < 0.01) {
        // Planet at extremum — rate ≈ 0 regardless of period
        console.log(
          d.toString().padStart(3) + ' │ ' +
          (antiPhase ? 'anti-phase' : 'in-phase').padEnd(9) + ' │ ' +
          (amp.toFixed(4) + '°').padStart(9) + ' │ ' +
          sinPhase.toFixed(4).padStart(8) + ' │ ' +
          '(at extremum)'.padStart(18) + ' │ ' +
          '≈ 0'.padStart(12) + ' │ ' +
          '—'.padStart(17) + ' │ ' +
          '—'.padStart(5) + ' │ —'
        );
        continue;
      }

      // Solve for period:
      // rate (arcsec/cy) = -antiSign × amp × sinPhase × (360/period) × 3600 × 100
      // period = -antiSign × amp × sinPhase × 360 × 3600 × 100 / rate
      const periodNeeded = -antiSign * amp * sinPhase * 360 * 3600 * 100 / jplRate;

      if (periodNeeded <= 0) continue; // need positive period (physical)

      // Convert to rate in deg/yr for display
      const icrfRateNeeded = 360 / periodNeeded; // could be negative if period is negative... handle sign
      const rateNeeded = icrfRateNeeded; // deg/yr

      // Find nearest H-fraction
      let bestFrac = null, bestFracDiff = Infinity;
      for (const frac of hFractions) {
        const diff = Math.abs(periodNeeded - frac.period) / frac.period;
        if (diff < bestFracDiff) { bestFracDiff = diff; bestFrac = frac; }
      }
      const fracMatch = ((1 - bestFracDiff) * 100).toFixed(1);

      // Find nearest eigenfrequency
      let bestEigen = null, bestEigenDiff = Infinity;
      for (const ef of eigenfreqs) {
        const diff = Math.abs(periodNeeded - ef.period) / ef.period;
        if (diff < bestEigenDiff) { bestEigenDiff = diff; bestEigen = ef; }
      }
      const eigenMatch = bestEigenDiff < 0.1 ? bestEigen.label + ' (' + (100 - bestEigenDiff * 100).toFixed(0) + '%)' : '—';

      console.log(
        d.toString().padStart(3) + ' │ ' +
        (antiPhase ? 'anti-phase' : 'in-phase').padEnd(9) + ' │ ' +
        (amp.toFixed(4) + '°').padStart(9) + ' │ ' +
        sinPhase.toFixed(4).padStart(8) + ' │ ' +
        Math.round(periodNeeded).toLocaleString().padStart(18) + ' │ ' +
        (rateNeeded.toFixed(6) + '°').padStart(12) + ' │ ' +
        (bestFrac.label + '=' + Math.round(bestFrac.period).toLocaleString()).padStart(17) + ' │ ' +
        (fracMatch + '%').padStart(5) + ' │ ' +
        eigenMatch
      );
    }
  }
  console.log('');
}

// ═══════════════════════════════════════════════════════════════════════════
// SUMMARY: BEST (d, period) PER PLANET
// ═══════════════════════════════════════════════════════════════════════════

console.log('');
console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('SUMMARY: FOR EACH PLANET — (d, period) PAIRS MATCHING JPL RATE');
console.log('Only showing pairs where period matches a known H-fraction (>95%)');
console.log('or a known eigenfrequency (>90%)');
console.log('═══════════════════════════════════════════════════════════════════════════');
console.log('');

console.log('Planet     │ d  │ Group     │ Period (yr)    │ H-fraction       │ Match │ Eigenmode │ C1 d │ C1 period');
console.log('───────────┼────┼───────────┼────────────────┼──────────────────┼───────┼───────────┼──────┼──────────');

for (let j = 0; j < planets.length; j++) {
  const pl = planets[j];
  const key = pl.key;
  if (key === 'earth') {
    console.log('Earth      │  3 │ in-phase  │        111,772 │ H/3              │ 100%  │ —         │    3 │  111,772');
    continue;
  }
  const ll = llBounds[key];
  const jplRate = jplRatesArcsecCy[key];
  const currentD = C.planets[key].fibonacciD;
  const currentPeriod = Math.round(Math.abs(pl.icrfP));

  const matches = [];

  for (const d of FIB_D) {
    const amp = PSI / (d * pl.sqrtM);

    for (const antiPhase of [false, true]) {
      const periAtBY = ((pl.periLong + (360 / pl.icrfP) * (balancedYear - 2000)) % 360 + 360) % 360;
      const phaseAngle = antiPhase ? periAtBY : ((periAtBY - 180 + 360) % 360);
      const antiSign = antiPhase ? -1 : 1;
      const cosJ2000 = Math.cos((pl.periLong - phaseAngle) * DEG2RAD);
      const mean = pl.inclJ2000 - antiSign * amp * cosJ2000;
      if (mean - amp < ll.min - 0.05 || mean + amp > ll.max + 0.05) continue;

      const sinPhase = Math.sin((pl.periLong - phaseAngle) * DEG2RAD);
      if (Math.abs(sinPhase) < 0.01) continue;

      const periodNeeded = -antiSign * amp * sinPhase * 360 * 3600 * 100 / jplRate;
      if (periodNeeded <= 0) continue;

      // Find best H-fraction match
      let bestFrac = null, bestFracDiff = Infinity;
      for (const frac of hFractions) {
        const diff = Math.abs(periodNeeded - frac.period) / frac.period;
        if (diff < bestFracDiff) { bestFracDiff = diff; bestFrac = frac; }
      }

      // Find best eigenfrequency match
      let bestEigen = null, bestEigenDiff = Infinity;
      for (const ef of eigenfreqs) {
        const diff = Math.abs(periodNeeded - ef.period) / ef.period;
        if (diff < bestEigenDiff) { bestEigenDiff = diff; bestEigen = ef; }
      }

      const fracMatchPct = (1 - bestFracDiff) * 100;
      const eigenMatchPct = (1 - bestEigenDiff) * 100;

      if (fracMatchPct > 90 || eigenMatchPct > 90) {
        matches.push({
          d, antiPhase, periodNeeded, bestFrac, fracMatchPct, bestEigen, eigenMatchPct,
        });
      }
    }
  }

  if (matches.length === 0) {
    console.log(
      (key.charAt(0).toUpperCase() + key.slice(1)).padEnd(10) + ' │    │           │                │ (no match >90%) │       │           │ ' +
      currentD.toString().padStart(4) + ' │ ' + currentPeriod.toLocaleString().padStart(8)
    );
  } else {
    // Sort by best H-fraction match
    matches.sort((a, b) => b.fracMatchPct - a.fracMatchPct);
    for (let i = 0; i < Math.min(3, matches.length); i++) {
      const m = matches[i];
      const eigenStr = m.eigenMatchPct > 90 ? m.bestEigen.label + ' ' + m.eigenMatchPct.toFixed(0) + '%' : '—';
      console.log(
        (i === 0 ? (key.charAt(0).toUpperCase() + key.slice(1)).padEnd(10) : '          ') + ' │ ' +
        m.d.toString().padStart(2) + ' │ ' +
        (m.antiPhase ? 'anti-phase' : 'in-phase').padEnd(9) + ' │ ' +
        Math.round(m.periodNeeded).toLocaleString().padStart(14) + ' │ ' +
        (m.bestFrac.label + '=' + Math.round(m.bestFrac.period).toLocaleString()).padEnd(16) + ' │ ' +
        (m.fracMatchPct.toFixed(1) + '%').padStart(5) + ' │ ' +
        eigenStr.padEnd(9) + ' │ ' +
        (i === 0 ? currentD.toString().padStart(4) + ' │ ' + currentPeriod.toLocaleString().padStart(8) : '     │')
      );
    }
  }
}

console.log('');
