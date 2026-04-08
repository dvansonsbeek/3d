// ═══════════════════════════════════════════════════════════════
// SINGLE SHARED Ω-RATE × ALL PRESETS SEARCH
//
// Phase B established that with one shared Ω regression rate for
// all 8 planets, the rate value itself drops out of the trend
// formula (since cos(Ωp − Ωe) becomes constant in time). The only
// remaining lever per planet is its (d, antiPhase, phase) — and
// the per-planet phase is freely sweepable.
//
// Under Config #1, 5 of 7 planets are LL+dir feasible immediately;
// only Saturn and Neptune fail (both want positive trend, model
// gives negative). This script asks the obvious next question:
//
//   Across the 743 inclination-balance presets, does ANY (d, group)
//   assignment make all 7 planets simultaneously LL+dir feasible
//   under the shared-rate hypothesis?
//
// For each preset, sweeps phase angle 0..360° per planet, finds
// the best LL+dir feasible phase, and reports any preset where all
// 7 succeed. Survivors are written to data/single-rate-survivors.json
// sorted by total trend-rate error.
//
// Usage: node tools/explore/single-rate-preset-search.js
// ═══════════════════════════════════════════════════════════════

const fs = require('fs');
const path = require('path');
const C = require('../lib/constants');

const H = C.H;
const PSI = C.PSI;
const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;
const PHASE_STEP = 0.5;
const SHARED_N = 40;  // = -H/5, Earth's observed rate. Irrelevant for trend (proven in Phase B).
const SHARED_PERIOD = -(8 * H) / SHARED_N;

const PRESETS_PATH = path.join(__dirname, '..', '..', 'data', 'balance-presets.json');
const OUT_PATH    = path.join(__dirname, '..', '..', 'data', 'single-rate-survivors.json');

const PLANETS = ['mercury','venus','mars','jupiter','saturn','uranus','neptune'];

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

const genPrecRate = 1 / (H / 13);
const planetData = {};
for (const key of PLANETS) {
  const p = C.planets[key];
  const eclP = p.perihelionEclipticYears;
  const icrfPeriod = 1 / (1 / eclP - genPrecRate);
  planetData[key] = {
    sqrtM: Math.sqrt(C.massFraction[key]),
    periLongJ2000: p.longitudePerihelion,
    omegaJ2000: p.ascendingNodeInvPlane,
    inclJ2000: p.invPlaneInclinationJ2000,
    icrfRate: 360 / icrfPeriod,
  };
}

// Earth (locked inclination model; Ω rate now also = SHARED_PERIOD)
const earthMean = C.earthInvPlaneInclinationMean;
const earthAmp  = C.earthInvPlaneInclinationAmplitude;
const earthPhaseAngle = C.ASTRO_REFERENCE.earthInclinationPhaseAngle;
const earthPeriLongJ2000 = C.ASTRO_REFERENCE.earthPerihelionLongitudeJ2000;
const earthOmegaJ2000 = C.ASTRO_REFERENCE.earthAscendingNodeInvPlane;
const earthIcrfRate = 360 / (H / 3);

function getEarthInclination(year) {
  const peri = earthPeriLongJ2000 + earthIcrfRate * (year - 2000);
  return earthMean + earthAmp * Math.cos((peri - earthPhaseAngle) * DEG2RAD);
}
function getEarthOmega(year) {
  return earthOmegaJ2000 + (360 / SHARED_PERIOD) * (year - 2000);
}

function calcEclipticIncl(pl, mean, amp, phaseAngle, antiSign, year) {
  const peri = pl.periLongJ2000 + pl.icrfRate * (year - 2000);
  const planetI = (mean + antiSign * amp * Math.cos((peri - phaseAngle) * DEG2RAD)) * DEG2RAD;
  const planetOmega = (pl.omegaJ2000 + (360 / SHARED_PERIOD) * (year - 2000)) * DEG2RAD;
  const earthI = getEarthInclination(year) * DEG2RAD;
  const earthOmega = getEarthOmega(year) * DEG2RAD;
  const pnx = Math.sin(planetI) * Math.sin(planetOmega);
  const pny = Math.sin(planetI) * Math.cos(planetOmega);
  const pnz = Math.cos(planetI);
  const enx = Math.sin(earthI) * Math.sin(earthOmega);
  const eny = Math.sin(earthI) * Math.cos(earthOmega);
  const enz = Math.cos(earthI);
  return Math.acos(Math.max(-1, Math.min(1, pnx*enx + pny*eny + pnz*enz))) * RAD2DEG;
}

function findBestPhase(key, d, antiPhase) {
  const pl = planetData[key];
  const ll = llBounds[key];
  const jpl = jplTrends[key];
  const amp = PSI / (d * pl.sqrtM);
  const antiSign = antiPhase ? -1 : 1;

  let llDir = null, llOnly = null;
  for (let phase = 0; phase < 360; phase += PHASE_STEP) {
    const cosJ2000 = Math.cos((pl.periLongJ2000 - phase) * DEG2RAD);
    const mean = pl.inclJ2000 - antiSign * amp * cosJ2000;
    const rangeMin = mean - amp;
    const rangeMax = mean + amp;
    if (rangeMin < ll.min - 0.01 || rangeMax > ll.max + 0.01) continue;

    const ecl1900 = calcEclipticIncl(pl, mean, amp, phase, antiSign, 1900);
    const ecl2100 = calcEclipticIncl(pl, mean, amp, phase, antiSign, 2100);
    const trend = (ecl2100 - ecl1900) / 2;
    const errAsec = Math.abs(trend - jpl) * 3600;
    const cand = { phase, mean, amp, trend, errAsec, rangeMin, rangeMax };
    if (!llOnly || errAsec < llOnly.errAsec) llOnly = cand;
    if ((trend >= 0) === (jpl >= 0)) {
      if (!llDir || errAsec < llDir.errAsec) llDir = cand;
    }
  }
  return { llDir, llOnly };
}

// ═══════════════════════════════════════════════════════════════
// LOAD PRESETS
// ═══════════════════════════════════════════════════════════════

const presetsFile = JSON.parse(fs.readFileSync(PRESETS_PATH, 'utf8'));
const fmt = presetsFile.format;
const colIdx = {};
for (let i = 0; i < fmt.length; i++) colIdx[fmt[i]] = i;

const dKeys = ['me_d','ve_d','ma_d','ju_d','sa_d','ur_d','ne_d'];
const phaseKeys = ['me_phase','ve_phase','ma_phase','ju_phase','sa_phase','ur_phase','ne_phase'];

console.log('═══════════════════════════════════════════════════════════════');
console.log('  SINGLE-RATE × ALL-PRESETS SEARCH');
console.log('═══════════════════════════════════════════════════════════════');
console.log(`  Hypothesis: all 8 planets share Ω rate −(8H)/${SHARED_N} = ${SHARED_PERIOD.toFixed(0)} yr`);
console.log(`  (Phase B proved the rate value drops out of the trend; ${SHARED_N}=−H/5 = Earth's observed rate)`);
console.log(`  Phase step: ${PHASE_STEP}°`);
console.log(`  Loaded ${presetsFile.presets.length} presets from balance-presets.json`);
console.log('');

// ═══════════════════════════════════════════════════════════════
// SEARCH
// ═══════════════════════════════════════════════════════════════

const survivors = [];
const tallyLLDir  = Object.fromEntries(PLANETS.map(k => [k, 0]));
const tallyLLOnly = Object.fromEntries(PLANETS.map(k => [k, 0]));
let processed = 0, dropped = 0;

for (const row of presetsFile.presets) {
  processed++;
  const config = {};
  for (let i = 0; i < PLANETS.length; i++) {
    config[PLANETS[i]] = {
      d: row[colIdx[dKeys[i]]],
      antiPhase: row[colIdx[phaseKeys[i]]] === 1,
    };
  }

  const perPlanet = {};
  let feasible = true;
  for (const key of PLANETS) {
    const r = findBestPhase(key, config[key].d, config[key].antiPhase);
    if (r.llOnly) tallyLLOnly[key]++;
    if (r.llDir)  tallyLLDir[key]++;
    if (!r.llDir) feasible = false;
    perPlanet[key] = r;
  }
  if (!feasible) { dropped++; continue; }

  let totalErr = 0;
  for (const key of PLANETS) totalErr += perPlanet[key].llDir.errAsec;
  survivors.push({
    scenario: row[colIdx.scenario],
    inclBalance: row[colIdx.balance],
    config,
    perPlanet: Object.fromEntries(PLANETS.map(k => [k, perPlanet[k].llDir])),
    totalErr,
  });
}

survivors.sort((a, b) => a.totalErr - b.totalErr);

console.log(`  Processed: ${processed}`);
console.log(`  Dropped (no LL+dir-feasible phase for ≥1 planet): ${dropped}`);
console.log(`  Survivors: ${survivors.length}`);
console.log('');
console.log('  Per-planet feasibility tally (out of ' + processed + ' presets):');
console.log('  Planet   │ LL only │ LL + JPL direction match');
console.log('  ─────────┼─────────┼─────────────────────────');
for (const key of PLANETS) {
  console.log(
    '  ' + key.padEnd(8) + ' │  ' +
    (tallyLLOnly[key] + '/' + processed).padStart(7) + ' │  ' +
    (tallyLLDir[key]  + '/' + processed).padStart(7)
  );
}
console.log('');

if (survivors.length > 0) {
  const TOP = Math.min(20, survivors.length);
  console.log(`  TOP ${TOP} survivors (sorted by total trend-rate error, ″/cy):`);
  console.log('');
  console.log('  Rank │ Scen │ TotErr │ ' + PLANETS.map(k => k.slice(0,2)).join('   ') + '   │ ' + PLANETS.map(k => 'φ-' + k.slice(0,2)).join(' '));
  console.log('  ─────┼──────┼────────┼──────────────────────────────┼───────────────────────────────────────────────────────────');
  for (let i = 0; i < TOP; i++) {
    const s = survivors[i];
    const dGroup = PLANETS.map(k => `${s.config[k].d}${s.config[k].antiPhase ? 'A' : 'i'}`).join(' ');
    const phases = PLANETS.map(k => s.perPlanet[k].phase.toFixed(0).padStart(4)).join(' ');
    console.log(
      '  ' + (i+1).toString().padStart(4) + ' │  ' + s.scenario + '   │ ' +
      s.totalErr.toFixed(2).padStart(6) + ' │ ' + dGroup.padEnd(28) + ' │ ' + phases
    );
  }
  console.log('');
  console.log('  (d values; "i" = in-phase, "A" = anti-phase; φ in degrees)');
  console.log('');

  // Detail of best survivor
  const best = survivors[0];
  console.log('─── BEST SURVIVOR (detail) ─────────────────────────────────────');
  console.log(`  Scenario ${best.scenario}, inclination balance ${best.inclBalance.toFixed(4)}%, total trend err ${best.totalErr.toFixed(2)}″/cy`);
  console.log('');
  console.log('  Planet   │ d  │ Group      │ Phase    │ Mean     │ Trend (°/cy)  │ JPL          │ Err(″/cy)');
  console.log('  ─────────┼────┼────────────┼──────────┼──────────┼───────────────┼──────────────┼──────────');
  for (const key of PLANETS) {
    const c = best.perPlanet[key];
    const cfg = best.config[key];
    const jpl = jplTrends[key];
    console.log(
      '  ' + key.padEnd(8) + ' │ ' +
      cfg.d.toString().padStart(2) + ' │ ' +
      (cfg.antiPhase ? 'anti-phase' : 'in-phase  ') + ' │ ' +
      (c.phase.toFixed(1) + '°').padStart(8) + ' │ ' +
      (c.mean.toFixed(4) + '°').padStart(8) + ' │ ' +
      ((c.trend >= 0 ? '+' : '') + c.trend.toFixed(6)).padStart(13) + ' │ ' +
      ((jpl >= 0 ? '+' : '') + jpl.toFixed(5)).padStart(12) + ' │ ' +
      c.errAsec.toFixed(2).padStart(8)
    );
  }
  console.log('');
}

// ─── Write output ───
const output = {
  generated: new Date().toISOString(),
  source: 'data/balance-presets.json',
  hypothesis: 'Single shared Ω regression rate −(8H)/N for all 8 planets. Phase B proved N drops out of the trend formula (cos(Ωp−Ωe) is constant in time under rigid rotation), so the value of N is irrelevant for trend matching. SHARED_N is fixed at ' + SHARED_N + ' (=−H/5, Earth observed rate).',
  shared_N: SHARED_N,
  shared_period_yr: SHARED_PERIOD,
  phase_sweep_step_deg: PHASE_STEP,
  total_input_presets: presetsFile.presets.length,
  count: survivors.length,
  per_planet_feasibility: {
    ll_only: tallyLLOnly,
    ll_and_dir: tallyLLDir,
  },
  survivors: survivors.map(s => ({
    scenario: s.scenario,
    incl_balance_pct: s.inclBalance,
    config: s.config,
    best_phases: Object.fromEntries(PLANETS.map(k => [k, {
      phase_deg: +s.perPlanet[k].phase.toFixed(2),
      mean_deg: +s.perPlanet[k].mean.toFixed(6),
      amp_deg: +s.perPlanet[k].amp.toFixed(6),
      trend_deg_per_cy: +s.perPlanet[k].trend.toFixed(8),
      err_arcsec_per_cy: +s.perPlanet[k].errAsec.toFixed(3),
      range_min_deg: +s.perPlanet[k].rangeMin.toFixed(4),
      range_max_deg: +s.perPlanet[k].rangeMax.toFixed(4),
    }])),
    total_trend_err_arcsec: +s.totalErr.toFixed(3),
  })),
};
fs.writeFileSync(OUT_PATH, JSON.stringify(output, null, 2));
console.log(`  Written ${survivors.length} survivors to ${path.relative(process.cwd(), OUT_PATH)}`);
console.log('');
