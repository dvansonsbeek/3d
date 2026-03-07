#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════════════
// MOON DECLINATION ERROR ANALYSIS
//
// Diagnoses whether Moon Dec errors (~4.88 deg RMS) are caused by:
//   A) Systematic orbital plane misalignment (wrong inclination / node)
//   B) Sampling aliasing (yearly samples catching random orbital phases)
//
// Computes:
//   1. Model Moon Dec & ecliptic latitude at daily intervals for 2 years
//   2. Ecliptic latitude amplitude (should be +/-5.145 deg)
//   3. Latitude oscillation period (should be ~27.2 days draconic month)
//   4. Dec range (should reach +/-28.6 at major standstill, +/-18.3 minor)
//   5. Comparison with JPL at the 26 baseline dates (yearly at June solstice)
// ═══════════════════════════════════════════════════════════════════════════

const C = require('../lib/constants');
const SG = require('../lib/scene-graph');
const jpl = require('../lib/horizons-client');

const d2r = Math.PI / 180;
const r2d = 180 / Math.PI;
const obliquity = 23.4393 * d2r; // mean obliquity

// ─── Equatorial to Ecliptic conversion ───────────────────────────────────
function equatorialToEcliptic(raDeg, decDeg) {
  const ra = raDeg * d2r;
  const dec = decDeg * d2r;
  const sinBeta = Math.sin(dec) * Math.cos(obliquity) - Math.cos(dec) * Math.sin(obliquity) * Math.sin(ra);
  const beta = Math.asin(Math.max(-1, Math.min(1, sinBeta)));
  const lambda = Math.atan2(
    Math.sin(ra) * Math.cos(obliquity) + Math.tan(dec) * Math.sin(obliquity),
    Math.cos(ra)
  );
  return { lambda: ((lambda * r2d) % 360 + 360) % 360, beta: beta * r2d };
}

// ─── Compute model Moon RA/Dec at a JD ───────────────────────────────────
function getModelMoonPos(jd) {
  const pos = SG.computePlanetPosition('moon', jd);
  const raDeg = SG.thetaToRaDeg(pos.ra);
  const decDeg = SG.phiToDecDeg(pos.dec);
  return { raDeg, decDeg };
}

// ─── Find period via zero-crossing analysis ──────────────────────────────
function findPeriodFromZeroCrossings(values, dtDays) {
  const crossings = [];
  for (let i = 1; i < values.length; i++) {
    if (values[i - 1] < 0 && values[i] >= 0) {
      // linear interpolation for exact crossing
      const frac = -values[i - 1] / (values[i] - values[i - 1]);
      crossings.push((i - 1 + frac) * dtDays);
    }
  }
  if (crossings.length < 2) return null;
  const periods = [];
  for (let i = 1; i < crossings.length; i++) {
    periods.push(crossings[i] - crossings[i - 1]);
  }
  // Return median
  periods.sort((a, b) => a - b);
  return periods[Math.floor(periods.length / 2)];
}

// ─── Find period via FFT-like peak detection (autocorrelation) ───────────
function findPeriodAutocorrelation(values, dtDays, minPeriod, maxPeriod) {
  const n = values.length;
  const mean = values.reduce((s, v) => s + v, 0) / n;
  const centered = values.map(v => v - mean);

  let bestLag = 0, bestCorr = -Infinity;
  const minLag = Math.floor(minPeriod / dtDays);
  const maxLag = Math.min(Math.floor(maxPeriod / dtDays), Math.floor(n / 2));

  for (let lag = minLag; lag <= maxLag; lag++) {
    let corr = 0, norm1 = 0, norm2 = 0;
    for (let i = 0; i < n - lag; i++) {
      corr += centered[i] * centered[i + lag];
      norm1 += centered[i] * centered[i];
      norm2 += centered[i + lag] * centered[i + lag];
    }
    const normCorr = corr / Math.sqrt(norm1 * norm2);
    if (normCorr > bestCorr) {
      bestCorr = normCorr;
      bestLag = lag;
    }
  }
  return { period: bestLag * dtDays, correlation: bestCorr };
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(' MOON DECLINATION ERROR DIAGNOSTIC');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // ── Part 1: Daily model Moon positions for 2 years ──────────────────
  console.log('--- Part 1: Model Moon ecliptic latitude over 2 years (730 days) ---\n');

  const jd0 = C.startmodelJD; // 2000.5 (July 2, 2000)
  const nDays = 730;
  const dtDays = 1;

  const decValues = [];
  const betaValues = [];
  const raValues = [];

  for (let i = 0; i < nDays; i++) {
    const jd = jd0 + i * dtDays;
    const { raDeg, decDeg } = getModelMoonPos(jd);
    const { lambda, beta } = equatorialToEcliptic(raDeg, decDeg);
    decValues.push(decDeg);
    betaValues.push(beta);
    raValues.push(raDeg);
  }

  const decMin = Math.min(...decValues);
  const decMax = Math.max(...decValues);
  const betaMin = Math.min(...betaValues);
  const betaMax = Math.max(...betaValues);

  console.log(`  Ecliptic Latitude (beta):`);
  console.log(`    Min: ${betaMin.toFixed(3)} deg    Max: ${betaMax.toFixed(3)} deg`);
  console.log(`    Amplitude: ${((betaMax - betaMin) / 2).toFixed(3)} deg`);
  console.log(`    Expected:  +/-5.145 deg (IAU Moon orbital inclination)`);
  console.log();
  console.log(`  Declination (Dec):`);
  console.log(`    Min: ${decMin.toFixed(3)} deg    Max: ${decMax.toFixed(3)} deg`);
  console.log(`    Expected range over 18.6-yr nodal cycle:`);
  console.log(`      Major standstill: +/-28.6 deg   Minor standstill: +/-18.3 deg`);
  console.log(`      This 2-year window shows: +/-${((decMax - decMin) / 2).toFixed(1)} deg`);
  console.log();

  // ── Part 2: Period analysis ─────────────────────────────────────────
  console.log('--- Part 2: Period analysis ---\n');

  const betaPeriodZC = findPeriodFromZeroCrossings(betaValues, dtDays);
  const betaPeriodAC = findPeriodAutocorrelation(betaValues, dtDays, 20, 35);
  const decPeriodAC = findPeriodAutocorrelation(decValues, dtDays, 20, 35);

  console.log(`  Ecliptic latitude period (zero-crossing): ${betaPeriodZC ? betaPeriodZC.toFixed(2) : 'N/A'} days`);
  console.log(`  Ecliptic latitude period (autocorrelation): ${betaPeriodAC.period.toFixed(2)} days (corr=${betaPeriodAC.correlation.toFixed(3)})`);
  console.log(`  Dec period (autocorrelation): ${decPeriodAC.period.toFixed(2)} days`);
  console.log(`  Expected draconic month: ${C.moonNodalMonthInput.toFixed(2)} days`);
  console.log(`  Expected tropical month: ${C.moonTropicalMonth.toFixed(4)} days`);
  console.log(`  Expected sidereal month: ${C.moonSiderealMonthInput.toFixed(4)} days`);
  console.log();

  // ── Part 3: Nodal regression check ─────────────────────────────────
  console.log('--- Part 3: Nodal regression (18.6-year cycle check) ---\n');

  // Sample Dec extremes over ~20 years to see the 18.6-year modulation
  const nYears = 20;
  const samplesPerYear = 50; // every ~7 days
  const totalSamples = nYears * samplesPerYear;
  const dtLong = C.meanSolarYearDays / samplesPerYear;

  // Track the max Dec reached in each ~1-month window
  const monthlyMaxDec = [];
  const monthlyMinDec = [];
  const windowDays = 30;
  const windowSamples = Math.round(windowDays / dtLong);

  let allDecLong = [];
  for (let i = 0; i < totalSamples; i++) {
    const jd = jd0 + i * dtLong;
    const { decDeg } = getModelMoonPos(jd);
    allDecLong.push({ day: i * dtLong, dec: decDeg });
  }

  // Find envelope of Dec extremes per month
  for (let i = 0; i < allDecLong.length - windowSamples; i += windowSamples) {
    const chunk = allDecLong.slice(i, i + windowSamples);
    monthlyMaxDec.push(Math.max(...chunk.map(c => c.dec)));
    monthlyMinDec.push(Math.min(...chunk.map(c => c.dec)));
  }

  const envelopeMax = Math.max(...monthlyMaxDec);
  const envelopeMin = Math.min(...monthlyMinDec);

  console.log(`  Over ${nYears} years:`);
  console.log(`    Max Dec envelope: ${envelopeMax.toFixed(2)} deg (expect ~28.6 at major standstill)`);
  console.log(`    Min Dec envelope: ${envelopeMin.toFixed(2)} deg (expect ~-28.6 at major standstill)`);
  console.log(`    Max northern monthly extreme: ${Math.max(...monthlyMaxDec).toFixed(2)} deg`);
  console.log(`    Max southern monthly extreme: ${Math.min(...monthlyMinDec).toFixed(2)} deg`);
  console.log();

  // Show the modulation: print max Dec for each year
  console.log(`  Year-by-year max northern Dec (should modulate 18.3-28.6 over 18.6 yr):`);
  for (let yr = 0; yr < nYears; yr++) {
    const startIdx = yr * samplesPerYear;
    const endIdx = Math.min(startIdx + samplesPerYear, allDecLong.length);
    const yearData = allDecLong.slice(startIdx, endIdx);
    const maxDec = Math.max(...yearData.map(d => d.dec));
    const minDec = Math.min(...yearData.map(d => d.dec));
    const calYear = 2000.5 + yr;
    console.log(`    ${calYear.toFixed(1)}: max=${maxDec.toFixed(2)}, min=${minDec.toFixed(2)}`);
  }
  console.log();

  // ── Part 4: Compare with JPL at baseline dates ─────────────────────
  console.log('--- Part 4: Model vs JPL at baseline dates (yearly June solstice) ---\n');

  // Generate 26 baseline dates: June 21 of 2000-2025
  const baselineJDs = [];
  for (let year = 2000; year <= 2025; year++) {
    baselineJDs.push(C.calendarToJD(year, 6, 21));
  }

  console.log('  Fetching JPL positions for 26 dates...');
  let jplPositions;
  try {
    jplPositions = await jpl.getPositions('moon', baselineJDs);
  } catch (e) {
    console.log(`  ERROR fetching JPL data: ${e.message}`);
    console.log('  Skipping JPL comparison.\n');
    jplPositions = null;
  }

  if (jplPositions) {
    console.log();
    console.log('  Year  | Model Dec | JPL Dec   | Dec Err   | Model RA  | JPL RA    | RA Err');
    console.log('  ------+-----------+-----------+-----------+-----------+-----------+---------');

    let sumDecErr2 = 0;
    let sumRAErr2 = 0;
    let maxDecErr = 0;
    const decErrors = [];

    for (let i = 0; i < baselineJDs.length; i++) {
      const jd = baselineJDs[i];
      const model = getModelMoonPos(jd);
      const jplPos = jplPositions[i];

      let decErr = model.decDeg - jplPos.dec;
      let raErr = model.raDeg - jplPos.ra;
      // Wrap RA error to [-180, 180]
      if (raErr > 180) raErr -= 360;
      if (raErr < -180) raErr += 360;

      const year = 2000 + i;
      console.log(`  ${year}  | ${model.decDeg.toFixed(3).padStart(9)} | ${jplPos.dec.toFixed(3).padStart(9)} | ${decErr.toFixed(3).padStart(9)} | ${model.raDeg.toFixed(3).padStart(9)} | ${jplPos.ra.toFixed(3).padStart(9)} | ${raErr.toFixed(3).padStart(7)}`);

      sumDecErr2 += decErr * decErr;
      sumRAErr2 += raErr * raErr;
      if (Math.abs(decErr) > Math.abs(maxDecErr)) maxDecErr = decErr;
      decErrors.push(decErr);
    }

    const rmsDecErr = Math.sqrt(sumDecErr2 / baselineJDs.length);
    const rmsRAErr = Math.sqrt(sumRAErr2 / baselineJDs.length);
    const meanDecErr = decErrors.reduce((s, v) => s + v, 0) / decErrors.length;

    console.log();
    console.log(`  Dec error RMS:  ${rmsDecErr.toFixed(3)} deg`);
    console.log(`  Dec error max:  ${maxDecErr.toFixed(3)} deg`);
    console.log(`  Dec error mean: ${meanDecErr.toFixed(3)} deg (systematic bias)`);
    console.log(`  RA error RMS:   ${rmsRAErr.toFixed(3)} deg`);
    console.log();

    // ── Part 5: Diagnosis ──────────────────────────────────────────────
    console.log('--- Part 5: Diagnosis ---\n');

    // Check if Dec errors are correlated with Moon's orbital phase
    // If systematic: errors should show a pattern correlated with nodal phase
    // If aliasing: errors should look random

    // Check variance: if errors are ~uniform random in [-amplitude, +amplitude],
    // that's aliasing. If there's a clear trend/bias, that's systematic.

    const absErrors = decErrors.map(Math.abs);
    const medianAbsErr = absErrors.sort((a, b) => a - b)[Math.floor(absErrors.length / 2)];

    // If mean is close to 0 and errors span a wide range symmetrically = aliasing
    // If mean is significantly nonzero = systematic offset
    console.log(`  Mean Dec error:   ${meanDecErr.toFixed(3)} deg`);
    console.log(`  Median |Dec err|: ${medianAbsErr.toFixed(3)} deg`);
    console.log(`  RMS Dec error:    ${rmsDecErr.toFixed(3)} deg`);
    console.log();

    // The Moon moves ~13 deg/day in RA, ~5 deg/day in Dec.
    // Yearly sampling (365.25 days) is NOT commensurate with the ~27.3 day period.
    // 365.25 / 27.3 = 13.38 orbits/year, fractional part = 0.38 orbits = ~137 deg phase shift/year
    // This means yearly samples sweep through ALL orbital phases - classic aliasing.

    const orbitsPerYear = C.meanSolarYearDays / C.moonTropicalMonth;
    const fracPart = orbitsPerYear - Math.floor(orbitsPerYear);
    const phaseShiftDeg = fracPart * 360;

    console.log(`  Moon orbits per year: ${orbitsPerYear.toFixed(3)}`);
    console.log(`  Fractional orbit per year: ${fracPart.toFixed(4)} = ${phaseShiftDeg.toFixed(1)} deg phase shift`);
    console.log(`  This means yearly samples land at pseudo-random orbital phases.`);
    console.log();

    // Expected RMS from pure aliasing:
    // If Moon Dec swings by +/-A relative to Sun's ecliptic Dec,
    // and we sample randomly in phase, RMS = A / sqrt(2)
    // With A ~ betaAmplitude projected through obliquity...
    // Actually, Moon's Dec offset from ecliptic is ~+/-5.15 deg (ecliptic latitude)
    // projected to equatorial, gives Dec variation of ~+/-5.15 deg around the
    // ecliptic Dec at that longitude.
    // If we sample a sinusoid of amplitude A randomly: RMS = A/sqrt(2)

    const betaAmplitude = (betaMax - betaMin) / 2;
    const expectedAliasingRMS = betaAmplitude / Math.sqrt(2);

    console.log(`  Model ecliptic latitude amplitude: ${betaAmplitude.toFixed(2)} deg`);
    console.log(`  Expected aliasing RMS (A/sqrt(2)): ${expectedAliasingRMS.toFixed(2)} deg`);
    console.log(`  Observed Dec error RMS:            ${rmsDecErr.toFixed(2)} deg`);
    console.log();

    if (Math.abs(meanDecErr) > 2.0) {
      console.log('  CONCLUSION: SYSTEMATIC BIAS detected (mean error > 2 deg).');
      console.log('  The orbital plane may be misaligned.');
    } else if (rmsDecErr < expectedAliasingRMS * 1.5 && Math.abs(meanDecErr) < 1.0) {
      console.log('  CONCLUSION: Errors are CONSISTENT WITH SAMPLING ALIASING.');
      console.log('  Yearly samples at June solstice catch the Moon at essentially');
      console.log('  random points in its ~27-day orbit. The Dec error amplitude');
      console.log('  matches what you would expect from random orbital phase sampling.');
      console.log('  The orbital plane inclination and node appear reasonably correct.');
    } else {
      console.log('  CONCLUSION: MIXED - Some aliasing plus possible systematic component.');
      console.log('  The errors are larger than pure aliasing would predict, OR there');
      console.log('  is a small systematic bias in the orbital plane orientation.');
    }

    console.log();
    console.log('  NOTE: To reduce Moon baseline errors, sample at ~daily intervals');
    console.log('  and compare mean ecliptic latitude over full orbits, rather than');
    console.log('  spot-checking once per year.');
  }

  console.log('\n═══════════════════════════════════════════════════════════════');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
