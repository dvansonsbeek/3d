#!/usr/bin/env node
/**
 * Fit Sun longitude residual harmonics on the H-lattice.
 *
 * Background:
 *   The L-2h diagnostic (src/script.js) found that the model's Sun has a
 *   date-dependent longitude error of up to ~3-5 arcminutes at certain
 *   eclipse dates. This error drives both the model's 5-9 min "greatest
 *   eclipse" timing offset against NASA and the residual path-geometry
 *   error (~140 km mean, 400+ km at high-γ events).
 *
 *   The model's Sun position is computed kinematically from the scene
 *   graph + a single scalar correctionSun + the truncated 2nd-order
 *   equation-of-center 2e·sin(M) + 1.25e²·sin(2M). Higher-order EoC
 *   terms and planetary perturbations on Earth's orbit are not captured.
 *
 *   This script:
 *     1. Samples the model's Sun ecliptic longitude at a dense JD grid.
 *     2. Computes the high-precision Meeus reference (Ch. 25) at the
 *        same JDs, with Espenak/Meeus ΔT applied so UT/TT semantics
 *        match production _eclSunLon in script.js.
 *     3. Fits the residual Δλ(t) on the H-lattice via greedy harmonic
 *        selection. Initial seed = year-period EoC harmonics
 *        (H/335317 = 1.000 yr, H/670634 = 0.500 yr, ...).
 *     4. Anchors at J2000 so correction(J2000) = 0 (smart anchor).
 *     5. With --write, persists SUN_LONGITUDE_HARMONICS to
 *        fitted-coefficients.json. Without it, dry-run output only.
 *
 *   Runtime alignment:
 *     The candidate pool is filtered by _isRuntimeWhitelisted (which
 *     mirrors the divisor filter in src/script.js sunLongitudeCorrection
 *     and tools/lib/scene-graph.js computeSunPositionFast). Fit-time and
 *     runtime therefore agree on which harmonics are permitted; any
 *     coefficient written by --write will actually be applied.
 *
 *   The runtime application (in a follow-up step) adds this correction
 *   to the Sun's longitude in src/script.js and tools/lib/scene-graph.js,
 *   mirroring the obliquity-harmonics application pattern.
 *
 * Usage:
 *   node tools/fit/sun-longitude-harmonics.js              # dry run (default 1800-2200)
 *   SUN_HARMONICS_DISABLED=1 node tools/fit/sun-longitude-harmonics.js --write
 *                                                          # structural refit + persist
 *
 *   Sample-window guard (enforced by MAX_RANGE_YEARS = 500 in main()):
 *     Default --range = 200 gives 1800-2200, matching the Meeus Ch. 25
 *     reference-trustworthy modern window. Empirical RMS with stored
 *     coefficients: 8" at ±100 yr, 16" at ±200 yr, 50" at ±250 yr,
 *     134" at ±1000 yr. Past ±200 yr the fit absorbs Meeus reference
 *     drift into its coefficients and regresses modern-eclipse accuracy.
 *     --range >200 warns; --range >500 refuses to run.
 *
 *   --write also REQUIRES `SUN_HARMONICS_DISABLED=1`:
 *     Without it, the fit script measures the residual AFTER the currently
 *     stored SUN_LONGITUDE_HARMONICS have been applied — that's a DELTA on
 *     top of stored, not an absolute fit. Overwriting stored with the delta
 *     would break runtime. The script refuses --write without the env var.
 *
 * Reference accuracy notes:
 *   - Meeus Ch. 25 low-precision Sun: ~0.01° (~36") over ±2000 yr
 *   - Beyond ±2000 yr the Meeus polynomial degrades; restrict --range
 *     to the trustworthy reference window.
 */

const fs = require('fs');
const path = require('path');
const C = require('../lib/constants');
const sg = require('../lib/scene-graph');

const D2R = Math.PI / 180;
const R2D = 180 / Math.PI;

// ─── ΔT (Espenak/Meeus 2006 piecewise polynomial) ───────────────────────────
// Accurate to a few seconds over 1500-2150. Required so Meeus _eclSunLon
// interprets JD as UT (matching production); inside it converts to JD_TT.
function deltaT(year) {
  let t, u;
  if (year < 1500) {
    u = (year - 1820) / 100;
    return -20 + 32 * u * u;
  } else if (year < 1600) {
    t = (year - 1500) / 100;
    return 10583.6 - 1014.41*t + 33.78311*t**2 - 5.952053*t**3
         - 0.1798452*t**4 + 0.022174192*t**5 + 0.0090316521*t**6;
  } else if (year < 1700) {
    t = (year - 1600) / 100;
    return 120 - 98.08*t - 153.2*t**2 + t**3/0.007129;
  } else if (year < 1800) {
    t = (year - 1700) / 100;
    return 8.83 + 16.03*t - 59.285*t**2 + 133.36*t**3 - t**4/0.01174;
  } else if (year < 1860) {
    t = (year - 1800) / 100;
    return 13.72 - 33.2447*t + 68.612*t**2 + 4111.6*t**3
         - 37436*t**4 + 121272*t**5 - 169900*t**6 + 87500*t**7;
  } else if (year < 1900) {
    t = (year - 1860) / 100;
    return 7.62 + 57.37*t - 2517.54*t**2 + 16806.68*t**3
         - 44736.24*t**4 + t**5/0.0000233174;
  } else if (year < 1920) {
    t = (year - 1900) / 100;
    return -2.79 + 149.4119*t - 598.939*t**2 + 6196.6*t**3 - 19700*t**4;
  } else if (year < 1941) {
    t = (year - 1920) / 100;
    return 21.20 + 84.493*t - 761.00*t**2 + 2093.6*t**3;
  } else if (year < 1961) {
    t = (year - 1941) / 100;
    return 29.07 + 40.7*t - t**2/0.0233 + t**3/0.002547;
  } else if (year < 1986) {
    t = (year - 1961) / 100;
    return 45.45 + 106.7*t - t**2/0.026 - t**3/0.000718;
  } else if (year < 2005) {
    t = (year - 1986) / 100;
    return 63.86 + 33.45*t - 603.74*t**2 + 1727.5*t**3
         + 65181.4*t**4 + 237359.9*t**5;
  } else if (year < 2050) {
    t = year - 2000;
    return 62.92 + 0.32217*t + 0.005589*t*t;
  } else if (year < 2150) {
    return -20 + 32 * ((year - 1820)/100)**2 - 0.5628 * (2150 - year);
  } else {
    u = (year - 1820) / 100;
    return -20 + 32 * u * u;
  }
}

function jdToYear(jd) {
  return 2000 + (jd - C.j2000JD) / 365.25;
}

// ─── Meeus Ch. 25 low-precision Sun ecliptic longitude (deg, 0-360) ─────────
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

// ─── IAU 2006 mean obliquity of date (deg) ──────────────────────────────────
function iauObliquity(jd_ut) {
  const year = jdToYear(jd_ut);
  const jd_tt = jd_ut + deltaT(year) / 86400;
  const T = (jd_tt - C.j2000JD) / 36525;
  const arcsec = 84381.406 - 46.836769 * T - 0.0001831 * T*T + 0.00200340 * T*T*T;
  return arcsec / 3600;
}

// ─── Convert (RA, Dec) → ecliptic longitude using a given obliquity ────────
function raDecToEclLon(raDeg, decDeg, epsDeg) {
  const ra = raDeg * D2R, dec = decDeg * D2R, eps = epsDeg * D2R;
  const lon = Math.atan2(
    Math.sin(ra) * Math.cos(eps) + Math.tan(dec) * Math.sin(eps),
    Math.cos(ra)
  ) * R2D;
  return ((lon % 360) + 360) % 360;
}

// ─── Wrap a longitude difference to [-180, +180] ────────────────────────────
function wrapDeg(d) {
  while (d >  180) d -= 360;
  while (d < -180) d += 360;
  return d;
}

// ─── Sample model − Meeus residual over a date range ────────────────────────
function sampleResiduals(yearStart, yearEnd, samplesPerYear) {
  const stepDays = 365.25 / samplesPerYear;
  const jdStart = C.j2000JD + (yearStart - 2000) * 365.25;
  const jdEnd   = C.j2000JD + (yearEnd   - 2000) * 365.25;
  const samples = [];

  // Build scene graph once
  sg.buildSceneGraph();

  for (let jd = jdStart; jd <= jdEnd; jd += stepDays) {
    const m = sg.computeSunPositionFast(jd);
    const raDeg  = sg.thetaToRaDeg(m.ra);
    const decDeg = sg.phiToDecDeg(m.dec);

    const eps = iauObliquity(jd);
    const lonModel = raDecToEclLon(raDeg, decDeg, eps);
    const lonMeeus = meeusSunLon(jd);
    const dLon = wrapDeg(lonModel - lonMeeus);

    samples.push({ jd, year: jdToYear(jd), dLon });
  }
  return samples;
}

// ─── Statistics on a sample array ───────────────────────────────────────────
function stats(samples) {
  let sum = 0, sumSq = 0, minV = Infinity, maxV = -Infinity;
  for (const s of samples) {
    sum += s.dLon;
    sumSq += s.dLon * s.dLon;
    if (s.dLon < minV) minV = s.dLon;
    if (s.dLon > maxV) maxV = s.dLon;
  }
  const mean = sum / samples.length;
  const variance = sumSq / samples.length - mean * mean;
  const rms = Math.sqrt(sumSq / samples.length);
  return { n: samples.length, mean, std: Math.sqrt(variance), rms, min: minV, max: maxV };
}

// ─── Least squares harmonic fit on H-lattice ────────────────────────────────
function fitHarmonics(samples, mean, divisors) {
  const n = samples.length;
  const m = divisors.length * 2;
  const A = new Array(n);
  const b = new Float64Array(n);

  for (let i = 0; i < n; i++) {
    const t = samples[i].year - C.balancedYear;
    b[i] = samples[i].dLon - mean;
    A[i] = new Float64Array(m);
    for (let k = 0; k < divisors.length; k++) {
      const phase = 2 * Math.PI * t / (C.H / divisors[k]);
      A[i][2 * k]     = Math.sin(phase);
      A[i][2 * k + 1] = Math.cos(phase);
    }
  }

  const ATA = new Array(m);
  const ATb = new Float64Array(m);
  for (let j = 0; j < m; j++) {
    ATA[j] = new Float64Array(m);
    for (let k = 0; k < m; k++) {
      let s = 0;
      for (let i = 0; i < n; i++) s += A[i][j] * A[i][k];
      ATA[j][k] = s;
    }
    let s = 0;
    for (let i = 0; i < n; i++) s += A[i][j] * b[i];
    ATb[j] = s;
  }

  const x = solveCholesky(ATA, ATb, m);
  const harmonics = [];
  for (let k = 0; k < divisors.length; k++) {
    harmonics.push([divisors[k], x[2 * k], x[2 * k + 1]]);
  }

  let sse = 0;
  for (let i = 0; i < n; i++) {
    let pred = mean;
    for (const [div, sinC, cosC] of harmonics) {
      const phase = 2 * Math.PI * (samples[i].year - C.balancedYear) / (C.H / div);
      pred += sinC * Math.sin(phase) + cosC * Math.cos(phase);
    }
    const err = samples[i].dLon - pred;
    sse += err * err;
  }
  return { harmonics, rmse: Math.sqrt(sse / n) };
}

function solveCholesky(A, b, n) {
  const L = new Array(n);
  for (let i = 0; i < n; i++) L[i] = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j <= i; j++) {
      let s = 0;
      for (let k = 0; k < j; k++) s += L[i][k] * L[j][k];
      if (i === j) L[i][j] = Math.sqrt(A[i][i] - s);
      else         L[i][j] = (A[i][j] - s) / L[j][j];
    }
  }
  const y = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    let s = 0;
    for (let k = 0; k < i; k++) s += L[i][k] * y[k];
    y[i] = (b[i] - s) / L[i][i];
  }
  const x = new Float64Array(n);
  for (let i = n - 1; i >= 0; i--) {
    let s = 0;
    for (let k = i + 1; k < n; k++) s += L[k][i] * x[k];
    x[i] = (y[i] - s) / L[i][i];
  }
  return x;
}

// ─── Runtime whitelist mirror ───────────────────────────────────────────────
// The Sun-correction runtime application in src/script.js AND
// tools/lib/scene-graph.js only applies harmonics whose divisor is:
//   (a) a whole-year multiple of H (335317, 670634, 1005951, ...),
//   (b) a small precession divisor (1..20 — Earth's Fibonacci named
//       cycles H/3, H/5, H/8, H/13, H/16 etc. are structurally on-lattice
//       by fiat even though their gcd with H is 1),
//   (c) one of the two lunar precession divisors (auto-tracked from Meeus
//       anchors via C.N_apsidalI, C.N_nodalI).
// Divisors outside this set (gcd=1 mid-range) are silently skipped at
// runtime — design-rule violating. If we fit terms outside the whitelist
// here, they land in fitted-coefficients.json but are never applied —
// a plumbing trap this helper prevents.
//
// 2026-07-15: Removed clause (d) "sharesFactorWithH". Under H values with
// rich small-prime factorization (like H=335,320 = 2³·5·83·101), clause (d)
// admitted mid-range divisors (84, 92, 115, 122) with amplitudes 400-600"
// at ~3000-4000 yr periods. These are NOT physical (don't correspond to
// any known perturbation cycle) — they're fit artifacts compensating for
// Meeus-vs-framework long-period residual. The greedy algorithm picked
// them up, shifting Sun position and cascading into Phase 1 optimizer
// output (e.g. earthInvPlaneInclinationAmplitude shifted by ~90 arcsec).
// Limiting to (a)+(b)+(c) keeps only physically-motivated harmonics.
const H_ROUND = Math.round(C.H);
function _gcdInt(a, b) { a = Math.abs(a); b = Math.abs(b); while (b !== 0) { const t = b; b = a % b; a = t; } return a; }
function _isRuntimeWhitelisted(divisor) {
  const isYearMultiple      = divisor >= H_ROUND && divisor % H_ROUND === 0;
  const isPrecessionDivisor = divisor > 0 && divisor <= 20;
  const isLunarPrecession   = divisor === C.N_nodalI || divisor === C.N_apsidalI;
  return isYearMultiple || isPrecessionDivisor || isLunarPrecession;
}

// ─── Greedy harmonic selection ──────────────────────────────────────────────
// Initial seed = first 3 year-period harmonics. Then greedily add divisors
// from a candidate set, picking whichever cuts RMSE the most each round.
// maxAmpArcsec rejects ill-conditioned terms whose fitted amplitude exceeds
// a physically plausible bound (real EoC residual harmonics are < a few 100").
// minImprovementArcsec stops the loop when the next term saves less than this.
function greedySelect(samples, mean, seedDivisors, candidates, maxHarmonics,
                       maxAmpArcsec = 600, minImprovementArcsec = 0.05) {
  let currentDivs = [...seedDivisors];
  let best = fitHarmonics(samples, mean, currentDivs);
  console.log(`  Seed (${currentDivs.length} harm, divs ${currentDivs.join(',')}): RMSE = ${(best.rmse * 3600).toFixed(2)}"`);

  while (currentDivs.length < maxHarmonics) {
    let bestDiv = null, bestRmse = best.rmse, bestFit = null;
    for (const d of candidates) {
      if (currentDivs.includes(d)) continue;
      const test = fitHarmonics(samples, mean, [...currentDivs, d]);
      if (!Number.isFinite(test.rmse) || test.rmse >= bestRmse) continue;
      // Guard: reject if any fitted amplitude is unphysical (numerical noise)
      const tooBig = test.harmonics.some(h =>
        Math.sqrt(h[1]*h[1] + h[2]*h[2]) * 3600 > maxAmpArcsec);
      if (tooBig) continue;
      bestRmse = test.rmse;
      bestDiv = d;
      bestFit = test;
    }
    if (bestDiv === null) {
      console.log('  (no further candidate improves RMSE under the amplitude guard)');
      break;
    }
    const improvement = (best.rmse - bestRmse) * 3600;
    if (improvement < minImprovementArcsec) {
      console.log(`  (stopping: next candidate would save only ${improvement.toFixed(3)}" < ${minImprovementArcsec}")`);
      break;
    }
    currentDivs.push(bestDiv);
    currentDivs.sort((a, b) => a - b);
    best = bestFit;
    const h = best.harmonics.find(h => h[0] === bestDiv);
    const amp = Math.sqrt(h[1]*h[1] + h[2]*h[2]) * 3600;
    const period = C.H / bestDiv;
    const periodStr = period > 1 ? period.toFixed(2) + ' yr' : (period * 365.25).toFixed(2) + ' d';
    console.log(`  + H/${bestDiv} (period=${periodStr}, amp=${amp.toFixed(2)}"): RMSE = ${(best.rmse * 3600).toFixed(2)}"`);
  }
  return { divisors: currentDivs, ...best };
}

// ─── Main ───────────────────────────────────────────────────────────────────
function main() {
  console.log('═══════════════════════════════════════════════════════════════════════');
  console.log('  SUN LONGITUDE RESIDUAL HARMONIC FIT (model − Meeus, H-lattice)');
  console.log('═══════════════════════════════════════════════════════════════════════\n');

  // ─── Sample window guard ──────────────────────────────────────────────
  // Default 1800-2200 (±200 yr around J2000) — the Meeus Ch. 25 reference
  // is only trustworthy in the modern window. Empirically measured RMS with
  // stored coefficients: 8" at ±100 yr, 16" at ±200 yr, 50" at ±250 yr,
  // 134" at ±1000 yr. Past ±200 yr the fit absorbs Meeus reference drift
  // into its coefficients and regresses modern-eclipse accuracy.
  // Hard cap: MAX_RANGE_YEARS = 500 (past this, Meeus reference dominates
  // and the fit is meaningless). --range 201..500 is allowed but warns.
  const MAX_RANGE_YEARS = 500;
  const rangeArg = process.argv.indexOf('--range');
  const rangeYears = rangeArg > 0 ? parseInt(process.argv[rangeArg + 1], 10) : 200;
  if (rangeYears > MAX_RANGE_YEARS) {
    console.log(`✗ REFUSING TO RUN: --range ${rangeYears} exceeds MAX_RANGE_YEARS (${MAX_RANGE_YEARS}).`);
    console.log(`  Past ±${MAX_RANGE_YEARS} yr, Meeus Ch. 25 polynomial degradation dominates the`);
    console.log(`  residual and the fit picks up reference noise as if it were framework physics.`);
    console.log(`  If you truly need wider sampling for diagnostics, edit MAX_RANGE_YEARS in the`);
    console.log(`  script — but do NOT --write the result to fitted-coefficients.json.`);
    process.exit(1);
  }
  if (rangeYears > 200) {
    console.log(`⚠ WARNING: --range ${rangeYears} > 200 yr enters Meeus reference degradation zone.`);
    console.log(`  Fit coefficients will absorb reference noise. Safe for diagnostics; DO NOT --write.\n`);
  }
  const samplesPerYear = 12;  // every 30 days

  console.log(`Model parameters:`);
  console.log(`  H               = ${C.H}`);
  console.log(`  balancedYear    = ${C.balancedYear.toFixed(4)}`);
  console.log(`  correctionSun   = ${C.correctionSun.toFixed(6)}°`);
  console.log(`  eccBase / amp   = ${C.eccentricityBase.toFixed(6)} / ${C.eccentricityAmplitude.toFixed(6)}\n`);

  const yearStart = 2000 - rangeYears;
  const yearEnd   = 2000 + rangeYears;
  console.log(`Sampling Δλ over years ${yearStart} to ${yearEnd}`);
  console.log(`  ${samplesPerYear} samples/year × ${2 * rangeYears} years = ~${2 * rangeYears * samplesPerYear} points\n`);

  const t0 = Date.now();
  const samples = sampleResiduals(yearStart, yearEnd, samplesPerYear);
  const tSample = (Date.now() - t0) / 1000;
  console.log(`Sampling complete in ${tSample.toFixed(1)}s.\n`);

  // ─── Raw residual statistics ──────────────────────────────────────────
  const raw = stats(samples);
  console.log('── Raw residual Δλ = λ_model − λ_meeus (deg, then arcseconds) ──');
  console.log(`  n        = ${raw.n}`);
  console.log(`  mean     = ${raw.mean.toFixed(6)}° (${(raw.mean * 3600).toFixed(1)}")`);
  console.log(`  std      = ${raw.std.toFixed(6)}° (${(raw.std * 3600).toFixed(1)}")`);
  console.log(`  RMS      = ${raw.rms.toFixed(6)}° (${(raw.rms * 3600).toFixed(1)}")`);
  console.log(`  range    = ${raw.min.toFixed(6)}° to ${raw.max.toFixed(6)}°`);
  console.log(`           = ${(raw.min * 3600).toFixed(0)}" to ${(raw.max * 3600).toFixed(0)}"\n`);

  // ─── Sample at L-2h problematic dates ─────────────────────────────────
  console.log('── Δλ at L-2h problem-eclipse dates (for cross-check) ──');
  const L2H_DATES = [
    { label: '2024 Apr 8',  jd: 2460408.92 },
    { label: '2026 Aug 12', jd: 2461264.96 },
    { label: '2017 Aug 21', jd: 2457987.27 },
    { label: '2027 Aug 2',  jd: 2461620.36 },
    { label: '1918 Jun 8',  jd: 2421717.43 },  // low-Δt sanity check
  ];
  for (const d of L2H_DATES) {
    if (d.jd < samples[0].jd || d.jd > samples[samples.length - 1].jd) {
      console.log(`  ${d.label.padEnd(14)} OUT OF SAMPLE RANGE`);
      continue;
    }
    const m = sg.computeSunPositionFast(d.jd);
    const raDeg  = sg.thetaToRaDeg(m.ra);
    const decDeg = sg.phiToDecDeg(m.dec);
    const eps = iauObliquity(d.jd);
    const lonModel = raDecToEclLon(raDeg, decDeg, eps);
    const lonMeeus = meeusSunLon(d.jd);
    const dLon = wrapDeg(lonModel - lonMeeus);
    console.log(`  ${d.label.padEnd(14)} Δλ = ${(dLon * 3600).toFixed(1).padStart(8)}"   (expected ≈ L-2h Δλ_Sun = -ΔRA_diff)`);
  }
  console.log('');

  // ─── Greedy H-lattice fit ─────────────────────────────────────────────
  // Seed with year-period EoC harmonics (the dominant unmodelled physics).
  // Year period = H/335317 ≈ 1.000 yr (since H=335317 yr).
  const yearDivisor = Math.round(C.H);  // = 335317, so H/H = 1 yr exactly
  const seedDivisors = [yearDivisor, yearDivisor * 2, yearDivisor * 3];

  // Candidate pool — physically motivated, bounded for tractability:
  //   (A) Higher year-multiples (k×year periods): 4..20 harmonics of 1 yr
  //   (B) Planetary synodic periods (Jup-Sat, Mars-Earth, Venus-Earth, Mer-Earth):
  //       rounded to nearest H-lattice divisor.
  //   (C) Precession-scale divisors 2..20 (Earth Fibonacci named cycles).
  //   (D) Lunar precession divisors (auto-tracked from Meeus anchors
  //       via C.N_apsidalI, C.N_nodalI).
  //   (E) Mid-range divisors 21..200 that share a prime factor with H
  //       (H = 3²·5·7451): multiples of 3, 5, or 7451 in that range.
  // Nyquist filter: only keep candidates whose period fits ≥3 full cycles
  // in the sample range (high-freq) or ≤10× the sample range (low-freq).
  // FINAL filter: apply the runtime whitelist so we never emit a coefficient
  // the runtime would silently skip (see _isRuntimeWhitelisted rationale).
  const sampleSpanYears = yearEnd - yearStart;
  const synodicPeriodsYr = {
    'Jup-Sat': 19.859,
    'Mars-Earth': 2.135,
    'Ven-Earth': 1.598,
    'Mer-Earth': 0.3173,
  };
  const allCandidates = new Set();
  for (let k = 4; k <= 20; k++) allCandidates.add(yearDivisor * k);          // (A) year multiples
  for (const p of Object.values(synodicPeriodsYr)) {
    allCandidates.add(Math.max(1, Math.round(C.H / p)));                     // (B) synodic
  }
  for (let k = 2; k <= 20; k++) allCandidates.add(k);                        // (C) precession scale (small)
  allCandidates.add(C.N_nodalI); allCandidates.add(C.N_apsidalI);            // (D) lunar precession (auto-tracked)
  // Removed 2026-07-15: category (E) "mid-range gcd>1" candidates (21..200).
  // These divisors admit mid-range fit artifacts (like 84, 92, 115, 122)
  // whose amplitudes reach 400-600" but don't correspond to any physical
  // perturbation cycle. Under H values with rich small-prime factorization
  // (e.g. H=335,320 = 2³·5·83·101), category E would admit ~50 divisors —
  // greedy would pick a few, shifting Phase 1 optimizer output cascadingly.
  // Restricting to (A)+(B)+(C)+(D) keeps only physically-motivated harmonics.
  // Two-tier filter:
  //   HIGH-frequency candidates (period ≤ sampleSpan) must fit ≥3 cycles (Nyquist).
  //   LOW-frequency candidates (period > sampleSpan) capture slow drift: kept up
  //   to period ≤ 10×sampleSpan (beyond that they're degenerate with mean/trend).
  const preWhitelist = [...allCandidates].filter(d => {
    const period = C.H / d;
    if (period <= sampleSpanYears) return period * 3 <= sampleSpanYears;
    return period <= 10 * sampleSpanYears;
  });
  const candidates    = preWhitelist.filter(_isRuntimeWhitelisted);
  const droppedByWhite = preWhitelist.filter(d => !_isRuntimeWhitelisted(d));
  console.log(`  Candidate pool (Nyquist-filtered): ${preWhitelist.length} divisors`);
  console.log(`  Runtime whitelist keeps ${candidates.length}, drops ${droppedByWhite.length} (mid-range divisors the runtime would silently skip)`);
  if (droppedByWhite.length && droppedByWhite.length <= 20) {
    console.log(`  Dropped: ${droppedByWhite.join(', ')}`);
  } else if (droppedByWhite.length) {
    console.log(`  Dropped: ${droppedByWhite.slice(0, 10).join(', ')}, ... (${droppedByWhite.length - 10} more)`);
  }

  console.log('── Greedy H-lattice fit ──');
  // maxAmpArcsec guards against ill-conditioned terms: reject any candidate whose
  // fitted amplitude exceeds this. Real EoC harmonics are at most a few hundred ″.
  const fit = greedySelect(samples, raw.mean, seedDivisors, candidates, 16, 600);
  console.log(`\n  Final: ${fit.divisors.length} harmonics, RMSE = ${(fit.rmse * 3600).toFixed(2)}"`);

  // ─── Smart anchor at J2000 ────────────────────────────────────────────
  // Make the correction reproduce the actual measured Δλ exactly at J2000,
  // so at the anchor epoch model + correction matches Meeus exactly.
  let harmonicsAtJ2000 = 0;
  const tJ2000 = 2000 - C.balancedYear;
  for (const [div, sinC, cosC] of fit.harmonics) {
    const phase = 2 * Math.PI * tJ2000 / (C.H / div);
    harmonicsAtJ2000 += sinC * Math.sin(phase) + cosC * Math.cos(phase);
  }
  // Δλ at J2000 from a fresh single-point evaluation (not interpolated)
  const _mJ2000 = sg.computeSunPositionFast(C.j2000JD);
  const _raJ = sg.thetaToRaDeg(_mJ2000.ra);
  const _decJ = sg.phiToDecDeg(_mJ2000.dec);
  const _lonModelJ = raDecToEclLon(_raJ, _decJ, iauObliquity(C.j2000JD));
  const _lonMeeusJ = meeusSunLon(C.j2000JD);
  const dLonAtJ2000 = wrapDeg(_lonModelJ - _lonMeeusJ);
  const adjustedMean = dLonAtJ2000 - harmonicsAtJ2000;
  console.log(`\n── Smart J2000 anchor ──`);
  console.log(`  Δλ at J2000 (measured):  ${(dLonAtJ2000 * 3600).toFixed(2)}"`);
  console.log(`  Harmonics at J2000:      ${(harmonicsAtJ2000 * 3600).toFixed(2)}"`);
  console.log(`  Raw-data mean:           ${(raw.mean * 3600).toFixed(2)}"`);
  console.log(`  Adjusted mean:           ${(adjustedMean * 3600).toFixed(2)}"`);
  const _verifyJ = adjustedMean + harmonicsAtJ2000;
  console.log(`  Verify formula(J2000):   ${(_verifyJ * 3600).toFixed(4)}" (should match Δλ at J2000: ${(dLonAtJ2000 * 3600).toFixed(4)}")`);

  // ─── Coefficient table ────────────────────────────────────────────────
  console.log('\n── Coefficient table (divisor, sin, cos, period, amplitude) ──');
  console.log('  [div,              sin,              cos          ]   period         amp');
  for (const [div, sinC, cosC] of fit.harmonics) {
    const amp = Math.sqrt(sinC*sinC + cosC*cosC) * 3600;
    const period = C.H / div;
    const periodStr = period > 1 ? period.toFixed(4) + ' yr' : (period * 365.25).toFixed(3) + ' d';
    console.log(`  [${String(div).padStart(7)}, ${sinC >= 0 ? ' ' : ''}${sinC.toExponential(6)}, ${cosC >= 0 ? ' ' : ''}${cosC.toExponential(6)}]   ${periodStr.padStart(14)}   ${amp.toFixed(2)}"`);
  }

  // ─── Verification on out-of-sample dates ──────────────────────────────
  console.log('\n── Verification: correction Δλ(t) at L-2h dates ──');
  for (const d of L2H_DATES) {
    if (d.jd < samples[0].jd || d.jd > samples[samples.length - 1].jd) continue;
    const year = jdToYear(d.jd);
    const t = year - C.balancedYear;
    let pred = adjustedMean;
    for (const [div, sinC, cosC] of fit.harmonics) {
      const phase = 2 * Math.PI * t / (C.H / div);
      pred += sinC * Math.sin(phase) + cosC * Math.cos(phase);
    }
    const m = sg.computeSunPositionFast(d.jd);
    const raDeg  = sg.thetaToRaDeg(m.ra);
    const decDeg = sg.phiToDecDeg(m.dec);
    const eps = iauObliquity(d.jd);
    const lonModel = raDecToEclLon(raDeg, decDeg, eps);
    const lonMeeus = meeusSunLon(d.jd);
    const actualResidual = wrapDeg(lonModel - lonMeeus);
    const residualAfterCorr = actualResidual - pred;
    console.log(`  ${d.label.padEnd(14)} actual Δλ = ${(actualResidual * 3600).toFixed(1).padStart(8)}"   predicted = ${(pred * 3600).toFixed(1).padStart(8)}"   residual after corr = ${(residualAfterCorr * 3600).toFixed(2).padStart(7)}"`);
  }

  // ─── Write to fitted-coefficients.json if --write ─────────────────────
  if (process.argv.includes('--write')) {
    if (process.env.SUN_HARMONICS_DISABLED !== '1') {
      console.log('\n  ✗ REFUSING TO WRITE: SUN_HARMONICS_DISABLED=1 is not set.');
      console.log('    The residual you just fit is a DELTA on top of the currently stored');
      console.log('    SUN_LONGITUDE_HARMONICS — replacing them with this delta would break');
      console.log('    the runtime correction. Re-run with:');
      console.log('      SUN_HARMONICS_DISABLED=1 node tools/fit/sun-longitude-harmonics.js --write');
      process.exit(1);
    }
    const jsonPath = path.join(__dirname, '..', '..', 'public', 'input', 'fitted-coefficients.json');
    const fc = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    fc.SUN_LONGITUDE_MEAN = adjustedMean;
    fc.SUN_LONGITUDE_HARMONICS = fit.harmonics;
    fs.writeFileSync(jsonPath, JSON.stringify(fc, null, 2) + '\n');
    console.log(`\n  ✓ Written SUN_LONGITUDE_MEAN = ${adjustedMean.toExponential(8)} to fitted-coefficients.json`);
    console.log(`  ✓ Written SUN_LONGITUDE_HARMONICS (${fit.harmonics.length} terms) to fitted-coefficients.json`);
  } else {
    console.log('\n  (dry run — add --write to update fitted-coefficients.json)');
  }
}

main();
