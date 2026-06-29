#!/usr/bin/env node
/**
 * Decode Meeus Ch.47 Moon perturbation terms into H-lattice catalog.
 *
 * EXPLORATION: tests whether the framework's H-lattice can natively
 * represent Meeus's 60+60 Delaunay-argument perturbation terms.
 *
 * For each Meeus term [d, m, mp, f, amplitude]:
 *   1. Compute the linear frequency: rate = d·dD/dt + m·dM/dt + mp·dM'/dt + f·dF/dt
 *      (using Meeus fundamental argument rates in degrees/year)
 *   2. Compute the equivalent H-divisor: N = H × |rate| / 360 (cycles in H years)
 *   3. Round to nearest integer N_int
 *   4. Measure rounding error → estimate accumulated phase drift at deep time
 *
 * Output: data/meeus-h-lattice-catalog.json with H-divisors for all 120 terms.
 *
 * The catalog tells us whether the framework's claim that "H structures
 * everything" extends to the Moon's perturbation arguments. If Meeus's
 * empirical N-body rates align with exact H-divisors, the framework is
 * structurally consistent with established lunar dynamics. If they DON'T
 * align cleanly, the rounding errors quantify the framework's distinct claim.
 */

const fs = require('fs');
const path = require('path');
const C = require('../lib/constants');

const TABLES_PATH = path.resolve(__dirname, '..', '..', 'public', 'input', 'meeus-lunar-tables.json');
const OUT_PATH    = path.resolve(__dirname, '..', '..', 'data', 'meeus-h-lattice-catalog.json');

const tables = JSON.parse(fs.readFileSync(TABLES_PATH, 'utf8'));
const fa = tables.fundamentalArguments;

// Linear rates (deg/year) from each polynomial's T^1 coefficient.
// Polynomial format: [a0, a1, a2, a3, a4] where arg = a0 + a1·T + ...
// T in Julian centuries → divide a1 by 100 for deg/yr.
const rates = {
  D:  fa.D[1]  / 100,
  M:  fa.M[1]  / 100,
  Mp: fa.Mp[1] / 100,
  F:  fa.F[1]  / 100,
};

const NAMES = ['D', 'M', "M'", 'F'];

function decodeArg(mult) {
  const rate = mult[0]*rates.D + mult[1]*rates.M + mult[2]*rates.Mp + mult[3]*rates.F;
  if (Math.abs(rate) < 1e-10) return null;
  const absRate = Math.abs(rate);
  const periodYr  = 360 / absRate;
  const periodDay = periodYr * 365.25;
  const divExact  = C.H / periodYr;            // = H × |rate| / 360
  const divInt    = Math.round(divExact);
  const errAbs    = divInt - divExact;
  const errPct    = (errAbs / divExact) * 100;
  // Phase error accumulated per year of simulation
  const phaseErrPerYr_arcsec = (errAbs / C.H) * 360 * 3600;  // arcsec per year
  return { rate, periodYr, periodDay, divExact, divInt, errAbs, errPct, phaseErrPerYr_arcsec };
}

function describeArg(mult) {
  const parts = [];
  for (let i = 0; i < 4; i++) {
    if (mult[i] === 0) continue;
    if (mult[i] === 1)  parts.push((parts.length ? '+' : '') + NAMES[i]);
    else if (mult[i] === -1) parts.push('-' + NAMES[i]);
    else parts.push((mult[i] > 0 && parts.length ? '+' : '') + mult[i] + NAMES[i]);
  }
  return parts.length ? parts.join('') : '(constant)';
}

console.log('═════════════════════════════════════════════════════════════════════════');
console.log('  MEEUS Ch.47 → H-LATTICE CATALOG  (Phase A: structural test)');
console.log('═════════════════════════════════════════════════════════════════════════\n');

console.log('Fundamental argument linear rates (deg/year, from Meeus polynomial T¹ term):');
console.log(`  D   Moon-Sun elongation:  ${rates.D.toFixed(6)}  →  period ${(360/rates.D*365.25).toFixed(4)} d  (synodic month)`);
console.log(`  M   Sun anomaly:          ${rates.M.toFixed(6)}  →  period ${(360/rates.M*365.25).toFixed(4)} d`);
console.log(`  M'  Moon anomaly:         ${rates.Mp.toFixed(6)}  →  period ${(360/rates.Mp*365.25).toFixed(4)} d  (anomalistic month)`);
console.log(`  F   Moon arg of latitude: ${rates.F.toFixed(6)}  →  period ${(360/rates.F*365.25).toFixed(4)} d  (draconic month)`);

console.log('\nFramework parameters:');
console.log(`  H = ${C.H} years`);

// Fundamental period H-divisors
console.log('\nFundamental period H-divisors (if H structures lunar physics, these should be near-integers):');
for (const k of ['D', 'M', 'Mp', 'F']) {
  const div = C.H * Math.abs(rates[k]) / 360;
  console.log(`  ${k.padEnd(3)} divisor: ${div.toFixed(4)}  rounded → ${Math.round(div)}  error: ${(div - Math.round(div)).toFixed(6)} (${((div - Math.round(div))/div*100).toFixed(6)}%)`);
}

function processTerms(termsList, label, ampUnit) {
  console.log(`\n═══════════════════════════════════════════════════════════════════════`);
  console.log(`  ${label}  (${termsList.length} terms, amp in ${ampUnit})`);
  console.log('═══════════════════════════════════════════════════════════════════════');

  const catalog = [];
  for (const term of termsList) {
    const mult = term.slice(0, 4);
    const amp  = term[4];
    const dec  = decodeArg(mult);
    const arg  = describeArg(mult);
    const ampArcsec = amp * 1e-6 * 3600;  // µdeg → arcsec
    catalog.push({ mult, amp, ampArcsec, arg, ...((dec === null) ? { constant: true } : dec) });
  }

  // Sort by absolute amplitude (largest first)
  catalog.sort((a, b) => Math.abs(b.amp) - Math.abs(a.amp));

  // Print top 20 with full detail
  const printN = Math.min(20, catalog.length);
  console.log(`\nTop ${printN} by amplitude:\n`);
  console.log(
    '  ' + 'Argument'.padEnd(18) +
    ' Amp(µdeg)'.padStart(12) +
    ' Amp(″)'.padStart(11) +
    ' Period(d)'.padStart(14) +
    ' H_div(exact)'.padStart(18) +
    ' H_div(int)'.padStart(13) +
    ' err(ppm)'.padStart(11) +
    ' drift(″/yr)'.padStart(12));
  console.log('  ' + '─'.repeat(110));
  for (let i = 0; i < printN; i++) {
    const e = catalog[i];
    if (e.constant) {
      console.log(`  ${e.arg.padEnd(18)} ${String(e.amp).padStart(12)} ${e.ampArcsec.toFixed(2).padStart(11)} ${'CONSTANT'.padStart(14)}`);
      continue;
    }
    console.log(
      `  ${e.arg.padEnd(18)}` +
      ` ${String(e.amp).padStart(12)}` +
      ` ${e.ampArcsec.toFixed(2).padStart(11)}` +
      ` ${e.periodDay.toFixed(4).padStart(14)}` +
      ` ${e.divExact.toFixed(2).padStart(18)}` +
      ` ${String(e.divInt).padStart(13)}` +
      ` ${(e.errPct * 1e4).toFixed(3).padStart(11)}` +  // err in parts per million
      ` ${e.phaseErrPerYr_arcsec.toFixed(4).padStart(12)}`);
  }

  // Aggregate statistics
  const valid = catalog.filter(e => !e.constant);
  const totalAmp = valid.reduce((s, e) => s + Math.abs(e.amp), 0);
  const ampWeightedErrPpm = valid.reduce((s, e) => s + Math.abs(e.amp) * Math.abs(e.errPct) * 1e4, 0) / totalAmp;
  const maxErrPpm = valid.reduce((m, e) => Math.max(m, Math.abs(e.errPct) * 1e4), 0);
  const maxErrTerm = valid.find(e => Math.abs(e.errPct) * 1e4 === maxErrPpm);

  // Per-term drift in output value (arcsec/yr) = amp_deg × (δω in rad/yr) × 3600
  // δω in rad/yr = phaseErrPerYr_arcsec / 206265 (convert arcsec/yr → rad/yr)
  // So per-term drift_arcsec/yr = amp_deg × phaseErrPerYr_arcsec × π/180
  //   (where × π/180 converts arcsec rate to rad rate)
  // Worst-case all-in-phase sum:
  const worstCaseDriftPerYr_arcsec = valid.reduce((s, e) => {
    return s + Math.abs(e.amp * 1e-6) * Math.abs(e.phaseErrPerYr_arcsec) * (Math.PI / 180);
  }, 0);
  // RMS drift (random phases — more realistic): sqrt(Σ(amp_i × δω_i)²)
  const rmsDriftPerYr_arcsec = Math.sqrt(valid.reduce((s, e) => {
    const term = Math.abs(e.amp * 1e-6) * Math.abs(e.phaseErrPerYr_arcsec) * (Math.PI / 180);
    return s + term * term;
  }, 0));

  console.log(`\nStatistics for ${label}:`);
  console.log(`  Constant terms: ${catalog.length - valid.length}`);
  console.log(`  Amplitude-weighted mean rounding error: ${ampWeightedErrPpm.toFixed(3)} ppm`);
  console.log(`  Max rounding error: ${maxErrPpm.toFixed(3)} ppm (term: ${maxErrTerm.arg}, amp ${maxErrTerm.amp})`);
  console.log(`  Largest single phase drift rate: ${valid.reduce((m, e) => Math.max(m, Math.abs(e.phaseErrPerYr_arcsec)), 0).toFixed(3)} ″/yr (pure freq error)`);
  console.log(`  H-rounding output drift (worst-case sum): ${worstCaseDriftPerYr_arcsec.toFixed(4)} ″/yr × T`);
  console.log(`  H-rounding output drift (RMS, random phases): ${rmsDriftPerYr_arcsec.toFixed(4)} ″/yr × T`);
  console.log(`  → at T = +100 yr (modern):    worst ${(worstCaseDriftPerYr_arcsec * 100).toFixed(2)}″,  RMS ${(rmsDriftPerYr_arcsec * 100).toFixed(2)}″`);
  console.log(`  → at T = -2000 yr (-135 era): worst ${(worstCaseDriftPerYr_arcsec * 2000).toFixed(2)}″,  RMS ${(rmsDriftPerYr_arcsec * 2000).toFixed(2)}″`);

  return catalog;
}

const lonCatalog = processTerms(tables.longitudeTerms.terms, 'LONGITUDE TERMS (Table 47.A)', 'µdeg');
const latCatalog = processTerms(tables.latitudeTerms.terms, 'LATITUDE TERMS (Table 47.B)',   'µdeg');

// Verdict
console.log('\n═════════════════════════════════════════════════════════════════════════');
console.log('  STRUCTURAL VERDICT');
console.log('═════════════════════════════════════════════════════════════════════════');
const lonValid = lonCatalog.filter(e => !e.constant);
const latValid = latCatalog.filter(e => !e.constant);
const lonAmpWeightedErr = lonValid.reduce((s, e) => s + Math.abs(e.amp) * Math.abs(e.errPct) * 1e4, 0) / lonValid.reduce((s, e) => s + Math.abs(e.amp), 0);
const latAmpWeightedErr = latValid.reduce((s, e) => s + Math.abs(e.amp) * Math.abs(e.errPct) * 1e4, 0) / latValid.reduce((s, e) => s + Math.abs(e.amp), 0);

console.log(`Mean rounding error (amp-weighted):`);
console.log(`  Longitude: ${lonAmpWeightedErr.toFixed(3)} ppm`);
console.log(`  Latitude:  ${latAmpWeightedErr.toFixed(3)} ppm`);
console.log('');
if (lonAmpWeightedErr < 1 && latAmpWeightedErr < 1) {
  console.log('  → Sub-ppm errors: H-lattice represents Meeus arguments cleanly. Framework structurally consistent.');
} else if (lonAmpWeightedErr < 10 && latAmpWeightedErr < 10) {
  console.log('  → Few-ppm errors: H-lattice approximation good for ~century scale, may drift over millennia.');
} else {
  console.log('  → Larger errors: H-lattice imperfect representation; quantifies framework\'s distinct claim about lunar physics.');
}

// Save catalog
fs.writeFileSync(OUT_PATH, JSON.stringify({
  _description: 'Meeus Ch.47 Moon perturbation terms decoded into H-lattice divisors. ' +
                'Each Delaunay-argument linear combination (d·D + m·M + m\'·M\' + f·F) is ' +
                'mapped to its equivalent H/N divisor with rounding error. Phase A output of ' +
                'the framework-native Moon perturbation exploration.',
  _generated_by: 'tools/fit/derive-moon-h-catalog.js',
  H: C.H,
  fundamentalRates_degPerYr: rates,
  longitudeTerms: lonCatalog,
  latitudeTerms: latCatalog,
}, null, 2) + '\n');

console.log(`\n✓ Catalog written to ${path.relative(process.cwd(), OUT_PATH)}`);
