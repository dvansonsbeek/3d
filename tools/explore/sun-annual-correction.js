#!/usr/bin/env node
/**
 * Sun annual correction — Phase Z-B verification tool.
 *
 * STATUS: Phase Z-B is INTEGRATED in production. This script remains as a
 * verification/regression tool. See docs/hidden/lessons-learned-lunar-
 * framework-native.md Addendum 5 for the full investigation history.
 *
 * Background: the framework's scene-graph Sun differs from Meeus Ch.25 Sun
 * primarily by an annual sin(M) oscillation, driven by the framework's
 * derived Earth eccentricity (0.01545 = sqrt(eccentricityBase² + amplitude²))
 * differing from Meeus's IAU J2000 value (0.01671) — about 8% smaller. The
 * eccentricity-definition gap produces an annual EoC residual of ~280"
 * amplitude.
 *
 * Production fix (Phase Z-B): apply the year-period harmonic from the
 * pre-existing SUN_LONGITUDE_HARMONICS coefficients (fitted-coefficients.json)
 * at the Sun node in the scene-graph. The H-lattice filter excludes the
 * legacy [168]-divisor term (gcd(168, H) = 1, design-rule violating). Applied
 * to Sun only (NOT barycenter) so planet baselines stay pristine.
 *
 * Verified results:
 *   - Sun-vs-Meeus residual: 197.77" → 7.39" RMS (96% reduction)
 *   - Sun-vs-JPL baseline: 11.5" → 14.8" RMS (small regression at sparse
 *     calibration dates, recoverable via correctionSun recalibration)
 *   - Planet baselines: unchanged
 *   - Eclipse audit (browser): mixed (some events better, some worse;
 *     net counts roughly flat — Moon refit needed for uniform improvement)
 *
 * Use this script to:
 *   1. Re-validate the 95% closure after any framework changes
 *   2. Refit the annual correction if eccentricityBase ever changes
 *   3. Probe the residual structure at non-J2000 epochs
 *
 * Production integration:
 *   - src/script.js: sunLongitudeCorrection() + SUN_HARMONICS_ENABLED flag
 *   - tools/lib/scene-graph.js: Sun-only gate in moveModel/animateFast
 *   - Coefficients: fitted-coefficients.json SUN_LONGITUDE_HARMONICS (unchanged)
 *
 * Disable for A/B testing:
 *   - Node: SUN_HARMONICS_DISABLED=1 node tools/explore/sun-annual-correction.js
 *   - Browser console: SUN_HARMONICS_ENABLED = false; render();
 *
 * Usage:
 *   node tools/explore/sun-annual-correction.js
 *   node tools/explore/sun-annual-correction.js --range 200      # ±200 yr fit
 *   node tools/explore/sun-annual-correction.js --range 100 --oos 300  # fit ±100, test ±300
 */

const C = require('../lib/constants');
const sg = require('../lib/scene-graph');

const D2R = Math.PI / 180;
const R2D = 180 / Math.PI;

// ─── ΔT (Espenak/Meeus 2006) ────────────────────────────────────────────────
function deltaT(year) {
  let t, u;
  if (year < 1500) { u = (year - 1820) / 100; return -20 + 32 * u * u; }
  if (year < 1600) { t = (year - 1500) / 100; return 10583.6 - 1014.41*t + 33.78311*t**2 - 5.952053*t**3 - 0.1798452*t**4 + 0.022174192*t**5 + 0.0090316521*t**6; }
  if (year < 1700) { t = (year - 1600) / 100; return 120 - 98.08*t - 153.2*t**2 + t**3/0.007129; }
  if (year < 1800) { t = (year - 1700) / 100; return 8.83 + 16.03*t - 59.285*t**2 + 133.36*t**3 - t**4/0.01174; }
  if (year < 1860) { t = (year - 1800) / 100; return 13.72 - 33.2447*t + 68.612*t**2 + 4111.6*t**3 - 37436*t**4 + 121272*t**5 - 169900*t**6 + 87500*t**7; }
  if (year < 1900) { t = (year - 1860) / 100; return 7.62 + 57.37*t - 2517.54*t**2 + 16806.68*t**3 - 44736.24*t**4 + t**5/0.0000233174; }
  if (year < 1920) { t = (year - 1900) / 100; return -2.79 + 149.4119*t - 598.939*t**2 + 6196.6*t**3 - 19700*t**4; }
  if (year < 1941) { t = (year - 1920) / 100; return 21.20 + 84.493*t - 761.00*t**2 + 2093.6*t**3; }
  if (year < 1961) { t = (year - 1941) / 100; return 29.07 + 40.7*t - t**2/0.0233 + t**3/0.002547; }
  if (year < 1986) { t = (year - 1961) / 100; return 45.45 + 106.7*t - t**2/0.026 - t**3/0.000718; }
  if (year < 2005) { t = (year - 1986) / 100; return 63.86 + 33.45*t - 603.74*t**2 + 1727.5*t**3 + 65181.4*t**4 + 237359.9*t**5; }
  if (year < 2050) { t = year - 2000; return 62.92 + 0.32217*t + 0.005589*t*t; }
  if (year < 2150) { return -20 + 32 * ((year - 1820)/100)**2 - 0.5628 * (2150 - year); }
  u = (year - 1820) / 100;
  return -20 + 32 * u * u;
}

function jdToYear(jd) { return 2000 + (jd - C.j2000JD) / 365.25; }

function meeusSunLon(jd_ut) {
  const year = jdToYear(jd_ut);
  const jd_tt = jd_ut + deltaT(year) / 86400;
  const T = (jd_tt - C.j2000JD) / 36525;
  const L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T * T;
  const M  = (357.52911 + 35999.05029 * T - 0.0001537 * T * T) * D2R;
  const C_eq = (1.914602 - 0.004817 * T - 0.000014 * T * T) * Math.sin(M)
             + (0.019993 - 0.000101 * T) * Math.sin(2 * M)
             + 0.000289 * Math.sin(3 * M);
  return ((L0 + C_eq) % 360 + 360) % 360;
}

function iauObliquity(jd_ut) {
  const year = jdToYear(jd_ut);
  const jd_tt = jd_ut + deltaT(year) / 86400;
  const T = (jd_tt - C.j2000JD) / 36525;
  const arcsec = 84381.406 - 46.836769 * T - 0.0001831 * T*T + 0.00200340 * T*T*T;
  return arcsec / 3600;
}

function raDecToEclLon(raDeg, decDeg, epsDeg) {
  const ra = raDeg * D2R, dec = decDeg * D2R, eps = epsDeg * D2R;
  const lon = Math.atan2(Math.sin(ra) * Math.cos(eps) + Math.tan(dec) * Math.sin(eps), Math.cos(ra)) * R2D;
  return ((lon % 360) + 360) % 360;
}

function wrapDeg(d) {
  while (d >  180) d -= 360;
  while (d < -180) d += 360;
  return d;
}

// ─── Sample residual + compute phase (Earth mean anomaly proxy) ─────────────
function sampleResiduals(yearStart, yearEnd, samplesPerYear) {
  const stepDays = 365.25 / samplesPerYear;
  const jdStart = C.j2000JD + (yearStart - 2000) * 365.25;
  const jdEnd   = C.j2000JD + (yearEnd   - 2000) * 365.25;
  const samples = [];
  sg.buildSceneGraph();
  // Phase uses time from balancedYear, same convention as sun-longitude-harmonics.js
  // so the annual harmonic divisor matches: period = H / round(H) = 1 yr exactly
  const yearDivisor = Math.round(C.H);  // = 335317 → period = 1 yr
  for (let jd = jdStart; jd <= jdEnd; jd += stepDays) {
    const m = sg.computeSunPositionFast(jd);
    const raDeg  = sg.thetaToRaDeg(m.ra);
    const decDeg = sg.phiToDecDeg(m.dec);
    const eps = iauObliquity(jd);
    const lonFw = raDecToEclLon(raDeg, decDeg, eps);
    const lonMeeus = meeusSunLon(jd);
    const dLon_deg = wrapDeg(lonFw - lonMeeus);  // residual in DEGREES
    const year = jdToYear(jd);
    const t = year - C.balancedYear;
    const phase = 2 * Math.PI * t / (C.H / yearDivisor);  // = 2π·t per year
    samples.push({ jd, year, dLon_deg, phase });
  }
  return samples;
}

// ─── Fit single annual sin + cos harmonic to residual ────────────────────────
// residual ≈ mean + A·sin(phase) + B·cos(phase)
// Returns { mean, A, B, rmse }
function fitAnnualHarmonic(samples) {
  // Least-squares: [mean, A, B] minimizes sum (residual - prediction)²
  const n = samples.length;
  // 3×3 normal equations
  let s1 = 0, sS = 0, sC = 0;
  let sSS = 0, sSC = 0, sCC = 0;
  let sR = 0, sSR = 0, sCR = 0;
  for (const s of samples) {
    const S = Math.sin(s.phase);
    const Cv = Math.cos(s.phase);
    const R = s.dLon_deg;
    s1 += 1;
    sS += S; sC += Cv;
    sSS += S * S; sSC += S * Cv; sCC += Cv * Cv;
    sR += R; sSR += S * R; sCR += Cv * R;
  }
  // Solve 3×3 system [[s1,sS,sC],[sS,sSS,sSC],[sC,sSC,sCC]] · [mean,A,B] = [sR,sSR,sCR]
  // Use direct Cramer's rule or Gaussian elimination
  const M = [
    [s1, sS, sC],
    [sS, sSS, sSC],
    [sC, sSC, sCC],
  ];
  const b = [sR, sSR, sCR];
  // Solve via Cramer's rule (3×3, manageable)
  const det = (m) => m[0][0]*(m[1][1]*m[2][2] - m[1][2]*m[2][1])
                   - m[0][1]*(m[1][0]*m[2][2] - m[1][2]*m[2][0])
                   + m[0][2]*(m[1][0]*m[2][1] - m[1][1]*m[2][0]);
  const D = det(M);
  const sub = (col) => {
    const Mc = M.map(row => row.slice());
    for (let i = 0; i < 3; i++) Mc[i][col] = b[i];
    return Mc;
  };
  const mean = det(sub(0)) / D;
  const A = det(sub(1)) / D;
  const B = det(sub(2)) / D;
  // RMSE after correction
  let sse = 0;
  for (const s of samples) {
    const pred = mean + A * Math.sin(s.phase) + B * Math.cos(s.phase);
    const err = s.dLon_deg - pred;
    sse += err * err;
  }
  return { mean, A, B, rmse: Math.sqrt(sse / n) };
}

function stats(values, label) {
  const n = values.length;
  let sum = 0, sumSq = 0, minV = Infinity, maxV = -Infinity;
  for (const v of values) {
    sum += v;
    sumSq += v * v;
    if (v < minV) minV = v;
    if (v > maxV) maxV = v;
  }
  const mean = sum / n;
  const variance = sumSq / n - mean * mean;
  return { label, n, mean, std: Math.sqrt(variance), rms: Math.sqrt(sumSq / n), min: minV, max: maxV };
}

function printStats(s, indent = '  ') {
  console.log(`${indent}${s.label.padEnd(50)} mean=${s.mean.toFixed(2).padStart(8)}"  std=${s.std.toFixed(2).padStart(7)}"  RMS=${s.rms.toFixed(2).padStart(7)}"  range=[${s.min.toFixed(1).padStart(7)}, ${s.max.toFixed(1).padStart(7)}]"`);
}

// ─── Main ───────────────────────────────────────────────────────────────────
function main() {
  console.log('═══════════════════════════════════════════════════════════════════════');
  console.log('  SUN ANNUAL CORRECTION — Phase Z-B diagnostic');
  console.log('═══════════════════════════════════════════════════════════════════════\n');

  const rangeArg = process.argv.indexOf('--range');
  const oosArg   = process.argv.indexOf('--oos');
  const rangeYears = rangeArg > 0 ? parseInt(process.argv[rangeArg + 1], 10) : 100;
  const oosYears   = oosArg > 0 ? parseInt(process.argv[oosArg + 1], 10) : rangeYears * 2;
  const samplesPerYear = 12;

  // ─── Fit on in-sample range ──────────────────────────────────────────
  const ysIn = 2000 - rangeYears, yeIn = 2000 + rangeYears;
  console.log(`In-sample fit: years ${ysIn} to ${yeIn}, ${samplesPerYear} samples/year`);
  const inSamples = sampleResiduals(ysIn, yeIn, samplesPerYear);
  const inResid = inSamples.map(s => s.dLon_deg * 3600);

  const rawIn = stats(inResid, 'Raw residual (in-sample)');
  printStats(rawIn);

  console.log('\n── Fitting annual sin(phase) + cos(phase) at exactly 1-yr period ──');
  const fit = fitAnnualHarmonic(inSamples);
  const ampDeg = Math.sqrt(fit.A * fit.A + fit.B * fit.B);
  const ampArcsec = ampDeg * 3600;
  const phaseOffsetDeg = Math.atan2(fit.B, fit.A) * R2D;
  console.log(`  Coefficients: mean = ${(fit.mean * 3600).toFixed(2)}"   sin·A = ${(fit.A * 3600).toFixed(2)}"   cos·B = ${(fit.B * 3600).toFixed(2)}"`);
  console.log(`  Amplitude: ${ampArcsec.toFixed(2)}"   phase offset: ${phaseOffsetDeg.toFixed(2)}°`);
  console.log(`  In-sample RMSE after correction: ${(fit.rmse * 3600).toFixed(2)}"  (raw: ${rawIn.rms.toFixed(2)}")`);
  console.log(`  In-sample improvement: ${(rawIn.rms - fit.rmse * 3600).toFixed(2)}"  (reduction ratio: ${(fit.rmse * 3600 / rawIn.rms).toFixed(3)})`);
  console.log('');

  // ─── Out-of-sample test on wider range ────────────────────────────────
  const ysOut = 2000 - oosYears, yeOut = 2000 + oosYears;
  console.log(`── Out-of-sample test: years ${ysOut} to ${yeOut} (${oosYears * 2} yr span) ──`);
  const oosSamples = sampleResiduals(ysOut, yeOut, samplesPerYear);
  const oosResid = oosSamples.map(s => s.dLon_deg * 3600);
  const rawOos = stats(oosResid, 'Raw residual (out-of-sample)');
  printStats(rawOos);
  // Apply in-sample fit to OOS data
  const oosAfter = oosSamples.map(s => {
    const pred = fit.mean + fit.A * Math.sin(s.phase) + fit.B * Math.cos(s.phase);
    return (s.dLon_deg - pred) * 3600;
  });
  const afterOos = stats(oosAfter, 'After in-sample correction (OOS)');
  printStats(afterOos);
  console.log(`  OOS improvement: ${(rawOos.rms - afterOos.rms).toFixed(2)}"  (reduction ratio: ${(afterOos.rms / rawOos.rms).toFixed(3)})`);
  console.log('');

  // ─── L-2h problem-eclipse dates ────────────────────────────────────────
  console.log('── Behaviour at L-2h problem-eclipse dates ──');
  const L2H_DATES = [
    { label: '2024 Apr 8',  jd: 2460408.92 },
    { label: '2026 Aug 12', jd: 2461264.96 },
    { label: '2017 Aug 21', jd: 2457987.27 },
    { label: '2027 Aug 2',  jd: 2461620.36 },
    { label: '1918 Jun 8',  jd: 2421717.43 },
  ];
  sg.buildSceneGraph();
  const yearDivisor = Math.round(C.H);
  for (const d of L2H_DATES) {
    const m = sg.computeSunPositionFast(d.jd);
    const raDeg  = sg.thetaToRaDeg(m.ra);
    const decDeg = sg.phiToDecDeg(m.dec);
    const eps = iauObliquity(d.jd);
    const lonFw = raDecToEclLon(raDeg, decDeg, eps);
    const lonMeeus = meeusSunLon(d.jd);
    const measured = wrapDeg(lonFw - lonMeeus) * 3600;
    const year = jdToYear(d.jd);
    const t = year - C.balancedYear;
    const phase = 2 * Math.PI * t / (C.H / yearDivisor);
    const pred = (fit.mean + fit.A * Math.sin(phase) + fit.B * Math.cos(phase)) * 3600;
    const after = measured - pred;
    console.log(`  ${d.label.padEnd(14)} measured=${measured.toFixed(1).padStart(8)}"   predicted=${pred.toFixed(1).padStart(8)}"   after=${after.toFixed(1).padStart(7)}"`);
  }
  console.log('');

  // ─── Stability check: refit on different ranges, compare coefficients ─
  console.log('── Stability: coefficients should be similar across fit ranges ──');
  for (const r of [50, 100, 200, 500]) {
    const yS = 2000 - r, yE = 2000 + r;
    const samples = sampleResiduals(yS, yE, samplesPerYear);
    const f = fitAnnualHarmonic(samples);
    const amp = Math.sqrt(f.A * f.A + f.B * f.B) * 3600;
    const phaseDeg = Math.atan2(f.B, f.A) * R2D;
    console.log(`  ±${String(r).padStart(3)} yr fit: mean=${(f.mean*3600).toFixed(2).padStart(7)}"   amp=${amp.toFixed(2).padStart(7)}"   phase=${phaseDeg.toFixed(2).padStart(7)}°   RMSE=${(f.rmse * 3600).toFixed(2).padStart(7)}"`);
  }
}

main();
