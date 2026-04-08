// ═══════════════════════════════════════════════════════════════
// WOBBLE-CONSTRAINED PRESET SEARCH
//
// The hypothesis we're now testing for each of the 743 presets:
//
//   With all 8 planets rotating at one shared secular rate (−H/5),
//   does there exist a per-planet phase-angle assignment such that
//   (a) all 7 fitted planets pass LL bounds + JPL trend direction
//   (b) the Ω wobble required to maintain continuous vector
//       balance stays small (peak |δΩ| < MAX_WOBBLE) for every
//       planet — i.e. it remains a perturbative correction.
//
// The previous nonlinear solver showed that Config #1 needs huge
// wobbles for Neptune (26°), Saturn (13°), Jupiter (12°), implying
// Config #1's (d, antiPhase) choices for the gas giants are wrong.
// The proper solution should give all wobbles in the perturbative
// regime (a few degrees at most), which means the inclination
// amplitudes must roughly match the planets' angular-momentum
// balance role.
//
// Per preset, the workflow is:
//   1. For each of 7 fitted planets, sweep phase angle 0..360° at
//      0.5° step, find the LL+dir-feasible phase minimizing trend
//      err vs JPL (under shared-rate, no wobble).
//   2. With those phases fixed, run the nonlinear Ω solver over
//      ±150 kyr to get peak |δΩ_i| per planet.
//   3. Reject if any planet's peak |δΩ| > MAX_WOBBLE.
//   4. Compute the wobble-corrected JPL trend errors for the
//      surviving preset.
//   5. Score = total trend err + total peak |δΩ|.
//
// Survivors are written to data/wobble-search-survivors.json.
//
// Usage: node tools/explore/wobble-search-presets.js [--max-wobble 5]
// ═══════════════════════════════════════════════════════════════

const fs = require('fs');
const path = require('path');
const C = require('../lib/constants');

const H = C.H;
const PSI = C.PSI;
const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;

const argv = process.argv.slice(2);
const MAX_WOBBLE = (() => { const i = argv.indexOf('--max-wobble'); return i >= 0 ? parseFloat(argv[i+1]) : 5.0; })();
const PHASE_STEP = 1.0;            // coarse to keep cost low; can refine winners later

// Time grid for wobble measurement (sparse — we just need peak)
const T_RANGE = 150000;
const T_STEP  = 3000;
const TIMES = [];
for (let y = 2000 - T_RANGE; y <= 2000 + T_RANGE; y += T_STEP) TIMES.push(y);
const N_T = TIMES.length;
const J2000_IDX = TIMES.indexOf(2000);

const SHARED_PERIOD = -H / 5;
const sharedRate = 360 / SHARED_PERIOD;

const PRESETS_PATH = path.join(__dirname, '..', '..', 'data', 'balance-presets.json');
const OUT_PATH    = path.join(__dirname, '..', '..', 'data', 'wobble-search-survivors.json');

const PLANETS = ['mercury','venus','mars','jupiter','saturn','uranus','neptune'];
const ALL = ['mercury','venus','earth','mars','jupiter','saturn','uranus','neptune'];

const jplTrends = {
  mercury: -0.00595, venus: -0.00079, mars: -0.00813,
  jupiter: -0.00184, saturn: +0.00194, uranus: -0.00243, neptune: +0.00035,
};
const llBounds = {
  mercury: { min: 4.57,  max: 9.86  },
  venus:   { min: 0.00,  max: 3.38  },
  mars:    { min: 0.00,  max: 5.84  },
  jupiter: { min: 0.241, max: 0.489 },
  saturn:  { min: 0.797, max: 1.02  },
  uranus:  { min: 0.902, max: 1.11  },
  neptune: { min: 0.554, max: 0.800 },
};

// ─── Static planet info (independent of preset) ───
const genPrecRate = 1 / (H / 13);
const planetStatic = {};
for (const key of PLANETS) {
  const p = C.planets[key];
  const eclP = p.perihelionEclipticYears;
  const icrfPeriod = 1 / (1 / eclP - genPrecRate);
  const a = C.derived[key].orbitDistance;
  const e = C.eccJ2000[key];
  planetStatic[key] = {
    sqrtM: Math.sqrt(C.massFraction[key]),
    L: C.massFraction[key] * Math.sqrt(a * (1 - e * e)),
    periLongJ2000: p.longitudePerihelion,
    omegaJ2000: p.ascendingNodeInvPlane,
    inclJ2000: p.invPlaneInclinationJ2000,
    icrfRate: 360 / icrfPeriod,
  };
}
// JPL frame: Earth's J2000 plane, fixed in inertial space.
// JPL Approximate Positions of the Planets reports dI/dt
// "with respect to the mean ecliptic and equinox of J2000".
// https://ssd.jpl.nasa.gov/planets/approx_pos.html
// We use this for ALL JPL trend comparisons in this script.
const EARTH_I_J2000  = C.ASTRO_REFERENCE.earthInclinationJ2000_deg;
const EARTH_OM_J2000 = C.ASTRO_REFERENCE.earthAscendingNodeInvPlane;

// Earth (used INTERNALLY by the wobble solver where Earth is one of the
// 8 planets in the vector-balance constraint; not used for JPL comparison).
const earthStatic = {
  L: C.massFraction.earth * Math.sqrt(1.0 * (1 - C.eccJ2000.earth ** 2)),
  omegaJ2000: C.ASTRO_REFERENCE.earthAscendingNodeInvPlane,
  earthMean: C.earthInvPlaneInclinationMean,
  earthAmp:  C.earthInvPlaneInclinationAmplitude,
  earthPhaseAngle: C.ASTRO_REFERENCE.earthInclinationPhaseAngle,
  periLongJ2000: C.ASTRO_REFERENCE.earthPerihelionLongitudeJ2000,
  icrfRate: 360 / (H / 3),
};

function earthIncl(year) {
  const peri = earthStatic.periLongJ2000 + earthStatic.icrfRate * (year - 2000);
  return earthStatic.earthMean + earthStatic.earthAmp * Math.cos((peri - earthStatic.earthPhaseAngle) * DEG2RAD);
}
function earthThetaLin(year) {
  return (earthStatic.omegaJ2000 + sharedRate * (year - 2000)) * DEG2RAD;
}
function planetIncl(key, mean, antiSign, amp, phaseAngle, year) {
  const pl = planetStatic[key];
  const peri = pl.periLongJ2000 + pl.icrfRate * (year - 2000);
  return mean + antiSign * amp * Math.cos((peri - phaseAngle) * DEG2RAD);
}
function planetThetaLin(key, year) {
  return (planetStatic[key].omegaJ2000 + sharedRate * (year - 2000)) * DEG2RAD;
}

// ═══════════════════════════════════════════════════════════════
// Per-preset best-phase search (per planet, independent — single rate)
// ═══════════════════════════════════════════════════════════════

function findBestPhase(key, d, antiPhase) {
  const pl = planetStatic[key];
  const ll = llBounds[key];
  const jpl = jplTrends[key];
  const amp = PSI / (d * pl.sqrtM);
  const antiSign = antiPhase ? -1 : 1;

  // Pre-compute trend at 1900, 2100 — but it depends on phase. So just sweep.
  let llDir = null;
  let llOnly = null;
  for (let phase = 0; phase < 360; phase += PHASE_STEP) {
    const cosJ2000 = Math.cos((pl.periLongJ2000 - phase) * DEG2RAD);
    const mean = pl.inclJ2000 - antiSign * amp * cosJ2000;
    if (mean - amp < ll.min - 0.01 || mean + amp > ll.max + 0.01) continue;

    // Compute trend in JPL frame: planet plane(t) vs Earth plane(J2000 fixed)
    const i1900p = (mean + antiSign * amp * Math.cos((pl.periLongJ2000 + pl.icrfRate * (1900 - 2000) - phase) * DEG2RAD)) * DEG2RAD;
    const i2100p = (mean + antiSign * amp * Math.cos((pl.periLongJ2000 + pl.icrfRate * (2100 - 2000) - phase) * DEG2RAD)) * DEG2RAD;
    const iE = EARTH_I_J2000 * DEG2RAD;
    const omE = EARTH_OM_J2000 * DEG2RAD;
    const om1900p = planetThetaLin(key, 1900);
    const om2100p = planetThetaLin(key, 2100);
    const e1900 = Math.acos(Math.max(-1, Math.min(1,
      Math.sin(i1900p) * Math.sin(iE) * (Math.sin(om1900p) * Math.sin(omE) + Math.cos(om1900p) * Math.cos(omE)) +
      Math.cos(i1900p) * Math.cos(iE)))) * RAD2DEG;
    const e2100 = Math.acos(Math.max(-1, Math.min(1,
      Math.sin(i2100p) * Math.sin(iE) * (Math.sin(om2100p) * Math.sin(omE) + Math.cos(om2100p) * Math.cos(omE)) +
      Math.cos(i2100p) * Math.cos(iE)))) * RAD2DEG;
    const trend = (e2100 - e1900) / 2;
    const errAsec = Math.abs(trend - jpl) * 3600;
    const cand = { phase, mean, amp, antiSign, trend, errAsec };
    if (!llOnly || errAsec < llOnly.errAsec) llOnly = cand;
    if ((trend >= 0) === (jpl >= 0)) {
      if (!llDir || errAsec < llDir.errAsec) llDir = cand;
    }
  }
  return { llDir, llOnly };
}

// ═══════════════════════════════════════════════════════════════
// Nonlinear δΩ solver (one time step) — same as omega-nonlinear-solver.js
// ═══════════════════════════════════════════════════════════════

function solveDeltaOmega(year, presetState, dOmegaInit) {
  const N = ALL.length;
  const Lsi = new Float64Array(N);
  const theta = new Float64Array(N);
  for (let n = 0; n < N; n++) {
    const key = ALL[n];
    let i;
    if (key === 'earth') {
      i = earthIncl(year);
      theta[n] = earthThetaLin(year);
    } else {
      const ps = presetState[key];
      i = planetIncl(key, ps.mean, ps.antiSign, ps.amp, ps.phase, year);
      theta[n] = planetThetaLin(key, year);
    }
    const L = key === 'earth' ? earthStatic.L : planetStatic[key].L;
    Lsi[n] = L * Math.sin(i * DEG2RAD);
  }
  const dOm = new Float64Array(N);
  if (dOmegaInit) for (let n = 0; n < N; n++) dOm[n] = dOmegaInit[n];

  // Relative tolerance: |V| < TOL_REL × Σ|Lsi|
  let scale = 0;
  for (let n = 0; n < N; n++) scale += Math.abs(Lsi[n]);
  const TOL = (1e-12 * scale) ** 2;
  const MAX_ITER = 30;
  for (let it = 0; it < MAX_ITER; it++) {
    let Vx = 0, Vy = 0;
    for (let n = 0; n < N; n++) {
      const ang = theta[n] + dOm[n];
      Vx += Lsi[n] * Math.cos(ang);
      Vy += Lsi[n] * Math.sin(ang);
    }
    if (Vx * Vx + Vy * Vy < TOL) break;
    let MMa = 0, MMb = 0, MMc = 0;
    const J1 = new Float64Array(N);
    const J2 = new Float64Array(N);
    for (let n = 0; n < N; n++) {
      const ang = theta[n] + dOm[n];
      J1[n] = -Lsi[n] * Math.sin(ang);
      J2[n] =  Lsi[n] * Math.cos(ang);
      MMa += J1[n] * J1[n];
      MMb += J1[n] * J2[n];
      MMc += J2[n] * J2[n];
    }
    const det = MMa * MMc - MMb * MMb;
    if (Math.abs(det) < 1e-30) break;
    const lambda1 = ( MMc * (-Vx) - MMb * (-Vy)) / det;
    const lambda2 = (-MMb * (-Vx) + MMa * (-Vy)) / det;
    for (let n = 0; n < N; n++) dOm[n] += J1[n] * lambda1 + J2[n] * lambda2;
  }
  return dOm;
}

// ─── Run solver over the time grid for one preset ───
function runSolver(presetState) {
  const series = Object.fromEntries(ALL.map(k => [k, new Float64Array(N_T)]));
  // J2000 first
  const init = solveDeltaOmega(2000, presetState, null);
  for (let n = 0; n < ALL.length; n++) series[ALL[n]][J2000_IDX] = init[n] * RAD2DEG;
  // Forward
  let prev = init;
  for (let k = J2000_IDX + 1; k < N_T; k++) {
    const sol = solveDeltaOmega(TIMES[k], presetState, prev);
    for (let n = 0; n < ALL.length; n++) series[ALL[n]][k] = sol[n] * RAD2DEG;
    prev = sol;
  }
  // Backward
  prev = init;
  for (let k = J2000_IDX - 1; k >= 0; k--) {
    const sol = solveDeltaOmega(TIMES[k], presetState, prev);
    for (let n = 0; n < ALL.length; n++) series[ALL[n]][k] = sol[n] * RAD2DEG;
    prev = sol;
  }
  // Compute peak |δΩ|
  const peaks = {};
  for (const key of ALL) {
    let mx = 0;
    for (let k = 0; k < N_T; k++) {
      const v = Math.abs(series[key][k]);
      if (v > mx) mx = v;
    }
    peaks[key] = mx;
  }
  return { series, peaks };
}

// ─── Wobble-corrected trend at 1900..2100 ───
function wobbleTrend(key, presetState, series) {
  // Linear interpolate δΩ at 1900 and 2100
  function dOmAt(year, name) {
    const f = (year - TIMES[0]) / T_STEP;
    const k0 = Math.floor(f);
    const t = f - k0;
    if (k0 < 0 || k0 + 1 >= N_T) return 0;
    return series[name][k0] * (1 - t) + series[name][k0 + 1] * t;
  }
  function eclAt(year) {
    // JPL frame: planet plane(t) WITH wobble vs Earth plane(J2000 fixed)
    const ps = presetState[key];
    const iP = planetIncl(key, ps.mean, ps.antiSign, ps.amp, ps.phase, year) * DEG2RAD;
    const omP = planetThetaLin(key, year) + dOmAt(year, key) * DEG2RAD;
    const iE = EARTH_I_J2000 * DEG2RAD;
    const omE = EARTH_OM_J2000 * DEG2RAD;
    return Math.acos(Math.max(-1, Math.min(1,
      Math.sin(iP) * Math.sin(iE) * (Math.sin(omP) * Math.sin(omE) + Math.cos(omP) * Math.cos(omE)) +
      Math.cos(iP) * Math.cos(iE)))) * RAD2DEG;
  }
  return (eclAt(2100) - eclAt(1900)) / 2;
}

// ═══════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════

const presetsFile = JSON.parse(fs.readFileSync(PRESETS_PATH, 'utf8'));
const fmt = presetsFile.format;
const colIdx = {};
for (let i = 0; i < fmt.length; i++) colIdx[fmt[i]] = i;
const dKeys = ['me_d','ve_d','ma_d','ju_d','sa_d','ur_d','ne_d'];
const phaseKeys = ['me_phase','ve_phase','ma_phase','ju_phase','sa_phase','ur_phase','ne_phase'];

console.log('═══════════════════════════════════════════════════════════════');
console.log('  WOBBLE-CONSTRAINED PRESET SEARCH');
console.log('═══════════════════════════════════════════════════════════════');
console.log(`  Hypothesis: shared rate −H/5 + min-norm Ω wobble per planet`);
console.log(`  Reject if any planet's peak |δΩ| > ${MAX_WOBBLE}° over ±${T_RANGE/1000} kyr`);
console.log(`  Phase sweep step: ${PHASE_STEP}°`);
console.log(`  Loaded ${presetsFile.presets.length} presets from balance-presets.json`);
console.log('');

const survivors = [];
const partialDir = [];   // presets where all 7 LL+dir feasible but wobble too big
let processed = 0, llDirFail = 0, wobbleFail = 0;

const t0 = Date.now();
for (const row of presetsFile.presets) {
  processed++;
  if (processed % 50 === 0) process.stderr.write(`  ${processed}/${presetsFile.presets.length}\r`);

  // Step 1: per-planet best LL-only phase (relaxed — we no longer filter
  // on rigid-rate direction match because the wobble can flip it).
  const presetState = {};
  let allLL = true;
  let totalErrInitial = 0;
  for (let i = 0; i < PLANETS.length; i++) {
    const key = PLANETS[i];
    const d = row[colIdx[dKeys[i]]];
    const antiPhase = row[colIdx[phaseKeys[i]]] === 1;
    const r = findBestPhase(key, d, antiPhase);
    const pick = r.llOnly;
    if (!pick) { allLL = false; break; }
    presetState[key] = {
      d, antiPhase,
      antiSign: pick.antiSign,
      mean: pick.mean,
      amp: pick.amp,
      phase: pick.phase,
    };
    totalErrInitial += pick.errAsec;
  }
  if (!allLL) { llDirFail++; continue; }

  // Step 2: nonlinear solver, measure peak |δΩ|
  const { series, peaks } = runSolver(presetState);

  // Step 3: reject if any peak too large
  let maxPeak = 0;
  for (const key of ALL) if (peaks[key] > maxPeak) maxPeak = peaks[key];
  // Compute wobble-corrected trends for ALL LL-feasible presets (so we can
  // diagnose the partial-rejection cases too).
  let totalErrCorrectedAll = 0;
  let allDirCorrectedAll = true;
  const correctedAll = {};
  for (const key of PLANETS) {
    const trend = wobbleTrend(key, presetState, series);
    const jpl = jplTrends[key];
    const err = Math.abs(trend - jpl) * 3600;
    if ((trend >= 0) !== (jpl >= 0)) allDirCorrectedAll = false;
    correctedAll[key] = { trend, err };
    totalErrCorrectedAll += err;
  }

  if (maxPeak > MAX_WOBBLE) {
    wobbleFail++;
    partialDir.push({ row, presetState, peaks, maxPeak, totalErrInitial,
                      totalErrCorrected: totalErrCorrectedAll,
                      allDirCorrected: allDirCorrectedAll, corrected: correctedAll });
    continue;
  }

  // Use the already-computed corrected trends
  const totalErrCorrected = totalErrCorrectedAll;
  const allDirCorrected = allDirCorrectedAll;
  const corrected = correctedAll;

  survivors.push({
    scenario: row[colIdx.scenario],
    inclBalance: row[colIdx.balance],
    config: presetState,
    peaks, maxPeak,
    corrected, totalErrInitial, totalErrCorrected, allDirCorrected,
  });
}
const t1 = Date.now();

survivors.sort((a, b) => a.totalErrCorrected - b.totalErrCorrected);

console.log('');
console.log(`  Processed: ${processed}  (${((t1-t0)/1000).toFixed(1)}s)`);
console.log(`  Failed LL+dir under rigid rate:  ${llDirFail}`);
console.log(`  Failed wobble bound (> ${MAX_WOBBLE}°): ${wobbleFail}`);
console.log(`  SURVIVORS: ${survivors.length}`);
console.log('');

if (survivors.length === 0) {
  // Show the most promising rejected presets
  console.log('  TOP 20 wobble-rejected presets, sorted by maxPeak:');
  partialDir.sort((a, b) => a.maxPeak - b.maxPeak);
  console.log('');
  console.log('  Rank │ maxPeak │ corrErr │ allDir │ d-config');
  console.log('  ─────┼─────────┼─────────┼────────┼─────────────────────────────');
  for (let i = 0; i < Math.min(20, partialDir.length); i++) {
    const p = partialDir[i];
    const dStr = PLANETS.map(k => `${p.presetState[k].d}${p.presetState[k].antiPhase?'A':'i'}`).join(' ');
    console.log(
      '  ' + (i+1).toString().padStart(4) + ' │ ' +
      (p.maxPeak.toFixed(2) + '°').padStart(7) + ' │ ' +
      p.totalErrCorrected.toFixed(1).padStart(7) + ' │  ' +
      (p.allDirCorrected ? '7/7  ' : '✗   ') + ' │ ' + dStr
    );
  }
  console.log('');

  // ALSO sort by corrected total trend error to see best JPL match candidates
  console.log('  TOP 20 wobble-rejected presets, sorted by wobble-corrected JPL trend err:');
  const bySumErr = [...partialDir].sort((a, b) => a.totalErrCorrected - b.totalErrCorrected);
  console.log('');
  console.log('  Rank │ corrErr │ maxPeak │ allDir │ d-config');
  console.log('  ─────┼─────────┼─────────┼────────┼─────────────────────────────');
  for (let i = 0; i < Math.min(20, bySumErr.length); i++) {
    const p = bySumErr[i];
    const dStr = PLANETS.map(k => `${p.presetState[k].d}${p.presetState[k].antiPhase?'A':'i'}`).join(' ');
    console.log(
      '  ' + (i+1).toString().padStart(4) + ' │ ' +
      p.totalErrCorrected.toFixed(1).padStart(7) + ' │ ' +
      (p.maxPeak.toFixed(2) + '°').padStart(7) + ' │  ' +
      (p.allDirCorrected ? '7/7  ' : '✗   ') + ' │ ' + dStr
    );
  }
  console.log('');

  // Stats: how many would survive if MAX_WOBBLE were larger?
  console.log('  ─── Counts at various MAX_WOBBLE thresholds ────────────────');
  for (const t of [3, 5, 7, 10, 15, 20, 30]) {
    const cnt = partialDir.filter(p => p.maxPeak <= t).length;
    const dirCnt = partialDir.filter(p => p.maxPeak <= t && p.allDirCorrected).length;
    console.log(`    peak |δΩ| ≤ ${t.toString().padStart(2)}°:  ${cnt.toString().padStart(4)} presets  (${dirCnt} with all 7 dir match)`);
  }
} else {
  const TOP = Math.min(20, survivors.length);
  console.log(`  TOP ${TOP} survivors (sorted by wobble-corrected total trend err):`);
  console.log('');
  console.log('  Rank │ Scen │ Init err │ Corr err │ maxPeak │ allDir │ d-config');
  console.log('  ─────┼──────┼──────────┼──────────┼─────────┼────────┼─────────────────────────────');
  for (let i = 0; i < TOP; i++) {
    const s = survivors[i];
    const dStr = PLANETS.map(k => `${s.config[k].d}${s.config[k].antiPhase?'A':'i'}`).join(' ');
    console.log(
      '  ' + (i+1).toString().padStart(4) + ' │  ' + s.scenario + '   │ ' +
      s.totalErrInitial.toFixed(2).padStart(8) + ' │ ' +
      s.totalErrCorrected.toFixed(2).padStart(8) + ' │ ' +
      (s.maxPeak.toFixed(2) + '°').padStart(7) + ' │   ' +
      (s.allDirCorrected ? '7/7' : '? ') + '   │ ' + dStr
    );
  }
  console.log('');
  // Detail of best
  const best = survivors[0];
  console.log('─── BEST SURVIVOR (detail) ───────────────────────────────────────');
  console.log(`  Scenario ${best.scenario}, init err ${best.totalErrInitial.toFixed(2)}, corrected err ${best.totalErrCorrected.toFixed(2)}, maxPeak ${best.maxPeak.toFixed(2)}°`);
  console.log('  Planet   │ d  │ Group │ Phase │ Mean    │ Peak |δΩ| │ Init trend  │ Corrected   │ JPL         │ Init err │ Corr err');
  console.log('  ─────────┼────┼───────┼───────┼─────────┼───────────┼─────────────┼─────────────┼─────────────┼──────────┼─────────');
  for (const key of PLANETS) {
    const ps = best.config[key];
    const init = findBestPhase(key, ps.d, ps.antiPhase).llOnly;
    const corr = best.corrected[key];
    const jpl = jplTrends[key];
    console.log(
      '  ' + key.padEnd(8) + ' │ ' +
      ps.d.toString().padStart(2) + ' │ ' +
      (ps.antiPhase ? 'anti' : 'in  ') + '  │ ' +
      (ps.phase.toFixed(0) + '°').padStart(5) + ' │ ' +
      (ps.mean.toFixed(4) + '°').padStart(7) + ' │ ' +
      (best.peaks[key].toFixed(3) + '°').padStart(9) + ' │ ' +
      ((init.trend >= 0 ? '+' : '') + init.trend.toFixed(6)).padStart(11) + ' │ ' +
      ((corr.trend >= 0 ? '+' : '') + corr.trend.toFixed(6)).padStart(11) + ' │ ' +
      ((jpl >= 0 ? '+' : '') + jpl.toFixed(5)).padStart(11) + ' │ ' +
      init.errAsec.toFixed(2).padStart(8) + ' │ ' +
      corr.err.toFixed(2).padStart(8)
    );
  }
}
console.log('');

// Write survivors
const output = {
  generated: new Date().toISOString(),
  source: 'data/balance-presets.json',
  hypothesis: 'Shared rate −H/5 for all 8 planets + nonlinear min-norm Ω wobble. Wobble bounded peak |δΩ| ≤ ' + MAX_WOBBLE + '° over ±' + (T_RANGE/1000) + ' kyr.',
  shared_period_yr: SHARED_PERIOD,
  max_wobble_deg: MAX_WOBBLE,
  phase_step_deg: PHASE_STEP,
  time_range_kyr: T_RANGE / 1000,
  time_step_yr: T_STEP,
  total_input_presets: presetsFile.presets.length,
  survivors_count: survivors.length,
  survivors: survivors.slice(0, 200).map(s => ({
    scenario: s.scenario,
    incl_balance_pct: s.inclBalance,
    config: Object.fromEntries(PLANETS.map(k => [k, {
      d: s.config[k].d, antiPhase: s.config[k].antiPhase,
      phase_deg: +s.config[k].phase.toFixed(2),
      mean_deg: +s.config[k].mean.toFixed(6),
      amp_deg: +s.config[k].amp.toFixed(6),
    }])),
    peaks_deg: Object.fromEntries(ALL.map(k => [k, +s.peaks[k].toFixed(4)])),
    max_peak_deg: +s.maxPeak.toFixed(4),
    init_total_err_arcsec_per_cy: +s.totalErrInitial.toFixed(2),
    corrected_total_err_arcsec_per_cy: +s.totalErrCorrected.toFixed(2),
    all_dir_corrected: s.allDirCorrected,
  })),
};
fs.writeFileSync(OUT_PATH, JSON.stringify(output, null, 2));
console.log(`  Written ${survivors.length} survivors (top 200) to ${path.relative(process.cwd(), OUT_PATH)}`);
console.log('');
