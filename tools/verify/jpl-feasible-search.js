// ═══════════════════════════════════════════════════════════════
// JPL-FEASIBLE PRESET SEARCH
//
// For each of the 743 inclination-balance presets in
// data/balance-presets.json, asks: does there exist *any*
// per-planet inclinationPhaseAngle assignment such that all 7
// fitted planets simultaneously satisfy:
//
//   1. Laplace-Lagrange invariable-plane bounds, and
//   2. JPL ecliptic-inclination trend direction
//
// The phase angle is treated as a free continuous knob per planet
// (0–360°, step 0.5°). We do NOT require the per-planet phases to
// share any common balanced-year anchor.
//
// Configurations where ANY planet has no LL+dir-feasible phase are
// dropped. Survivors are written to data/jpl-feasible-presets.json
// sorted ascending by total trend-rate error (″/cy).
//
// Math is identical to tools/lib/orbital-engine.js:
//   - amplitude = ψ / (d × √m)                       (Fibonacci)
//   - mean      = i_J2000 − antiSign·amp·cos(ϖ_J2000 − φ)
//   - inclination cosine driven by ICRF perihelion ϖ_ICRF
//   - Earth Ω regresses at −H/5; planet Ω at −(8H)/N
//
// Usage: node tools/verify/jpl-feasible-search.js
// ═══════════════════════════════════════════════════════════════

const fs = require('fs');
const path = require('path');
const C = require('../lib/constants');

const H = C.H;
const PSI = C.PSI;
const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;
const STEP = 0.5;          // phase-angle sweep step (degrees)
const PRESETS_PATH = path.join(__dirname, '..', '..', 'data', 'balance-presets.json');
const OUT_PATH    = path.join(__dirname, '..', '..', 'data', 'jpl-feasible-presets.json');

const PLANETS = ['mercury','venus','mars','jupiter','saturn','uranus','neptune'];

// ─── JPL ecliptic-inclination trends (deg/century) ───
const jplTrends = {
  mercury: -0.00595, venus: -0.00079, mars: -0.00813,
  jupiter: -0.00184, saturn: +0.00194, uranus: -0.00243, neptune: +0.00035,
};

// ─── Laplace-Lagrange invariable plane bounds ───
const llBounds = {
  mercury: { min: 4.57,  max: 9.86  },
  venus:   { min: 0.00,  max: 3.38  },
  earth:   { min: 0.00,  max: 2.95  },
  mars:    { min: 0.00,  max: 5.84  },
  jupiter: { min: 0.241, max: 0.489 },
  saturn:  { min: 0.797, max: 1.02  },
  uranus:  { min: 0.902, max: 1.11  },
  neptune: { min: 0.554, max: 0.800 },
};

// ─── Per-planet static inputs (independent of preset choice) ───
const genPrecRate = 1 / (H / 13);
const planetData = {};
for (const key of PLANETS) {
  const p = C.planets[key];
  const eclP = p.perihelionEclipticYears;
  const icrfPeriod = 1 / (1 / eclP - genPrecRate);
  const icrfRate = 360 / icrfPeriod;
  const ascNodePeriod = p.ascendingNodeCyclesIn8H
    ? -(8 * H) / p.ascendingNodeCyclesIn8H
    : eclP;
  planetData[key] = {
    name: key,
    mass: C.massFraction[key],
    sqrtM: Math.sqrt(C.massFraction[key]),
    periLongJ2000: p.longitudePerihelion,
    omegaJ2000: p.ascendingNodeInvPlane,
    inclJ2000: p.invPlaneInclinationJ2000,
    icrfRate, ascNodePeriod,
  };
}

// ─── JPL frame: J2000 ecliptic = Earth's orbital plane FROZEN at J2000.
// JPL's published dI/dt rates (Approximate Positions of the Planets) are
// measured against this fixed inertial plane, NOT the moving ecliptic of date.
// Source: https://ssd.jpl.nasa.gov/planets/approx_pos.html
//   "Keplerian elements and their rates, with respect to the mean ecliptic
//    and equinox of J2000"
const EARTH_I_J2000_RAD  = C.ASTRO_REFERENCE.earthInclinationJ2000_deg * DEG2RAD;
const EARTH_OM_J2000_RAD = C.ASTRO_REFERENCE.earthAscendingNodeInvPlane * DEG2RAD;

// All planets share the secular Ω regression rate −H/5 = −67,063 yr.
// (Phase B proved the value of the rate is irrelevant for the trend formula
// under shared rotation; we lock it to Earth's observed rate.)
const SHARED_OMEGA_RATE = 360 / (-H / 5);   // deg/yr

// ─── Ecliptic inclination via plane-normal dot product ───
// Planet plane at year t vs Earth plane FIXED at J2000 (JPL frame).
function calcEclipticIncl(pl, mean, amp, phaseAngle, antiSign, year) {
  const peri = pl.periLongJ2000 + pl.icrfRate * (year - 2000);
  const planetI = (mean + antiSign * amp * Math.cos((peri - phaseAngle) * DEG2RAD)) * DEG2RAD;
  const planetOmega = (pl.omegaJ2000 + SHARED_OMEGA_RATE * (year - 2000)) * DEG2RAD;
  const earthI = EARTH_I_J2000_RAD;
  const earthOmega = EARTH_OM_J2000_RAD;
  const pnx = Math.sin(planetI) * Math.sin(planetOmega);
  const pny = Math.sin(planetI) * Math.cos(planetOmega);
  const pnz = Math.cos(planetI);
  const enx = Math.sin(earthI) * Math.sin(earthOmega);
  const eny = Math.sin(earthI) * Math.cos(earthOmega);
  const enz = Math.cos(earthI);
  return Math.acos(Math.max(-1, Math.min(1, pnx*enx + pny*eny + pnz*enz))) * RAD2DEG;
}

// ─── Find best LL+dir-match phase for one planet ───
// Returns { llOnly, llDir } where each is null or the best candidate.
function findBestPhase(key, d, antiPhase) {
  const pl = planetData[key];
  const ll = llBounds[key];
  const jpl = jplTrends[key];
  const amp = PSI / (d * pl.sqrtM);
  const antiSign = antiPhase ? -1 : 1;

  let bestLLOnly = null, bestLLDir = null;
  for (let phase = 0; phase < 360; phase += STEP) {
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

    if (!bestLLOnly || errAsec < bestLLOnly.errAsec) bestLLOnly = cand;
    if ((trend >= 0) === (jpl >= 0)) {
      if (!bestLLDir || errAsec < bestLLDir.errAsec) bestLLDir = cand;
    }
  }
  return { llOnly: bestLLOnly, llDir: bestLLDir };
}

// ─── Earth: LL-only check (no JPL trend) ───
function findBestEarthPhase() {
  // Earth d=3 is locked by the model; amplitude is the model's earth amplitude.
  // We do not actually sweep Earth's phase here — we just verify LL.
  const ll = llBounds.earth;
  const eMean = C.earthInvPlaneInclinationMean;
  const eAmp  = C.earthInvPlaneInclinationAmplitude;
  const rangeMin = eMean - eAmp;
  const rangeMax = eMean + eAmp;
  if (rangeMin < ll.min - 0.01 || rangeMax > ll.max + 0.01) return null;
  return { phase: 0, mean: eMean, amp: eAmp, trend: 0, errAsec: 0, rangeMin, rangeMax };
}

// ═══════════════════════════════════════════════════════════════
// LOAD PRESETS
// ═══════════════════════════════════════════════════════════════

const presetsFile = JSON.parse(fs.readFileSync(PRESETS_PATH, 'utf8'));
const fmt = presetsFile.format;  // ['scenario','balance','me_d','me_phase',...]
const colIdx = {};
for (let i = 0; i < fmt.length; i++) colIdx[fmt[i]] = i;

console.log('═══════════════════════════════════════════════════════════════');
console.log('  JPL-FEASIBLE PRESET SEARCH');
console.log('═══════════════════════════════════════════════════════════════');
console.log(`  Loaded ${presetsFile.presets.length} presets from balance-presets.json`);
console.log(`  Phase-angle sweep: 0–360° step ${STEP}°`);
console.log(`  Filter: LL bounds + JPL direction match for ALL 7 planets`);
console.log('');

// ═══════════════════════════════════════════════════════════════
// SEARCH
// ═══════════════════════════════════════════════════════════════

const survivors = [];
let processed = 0, dropped = 0;

// Per-planet tally: in how many presets does each planet have ANY feasible phase?
const tallyLLDir  = Object.fromEntries(PLANETS.map(k => [k, 0]));
const tallyLLOnly = Object.fromEntries(PLANETS.map(k => [k, 0]));

const planetKeys = ['mercury','venus','mars','jupiter','saturn','uranus','neptune'];
const dKeys = ['me_d','ve_d','ma_d','ju_d','sa_d','ur_d','ne_d'];
const phaseKeys = ['me_phase','ve_phase','ma_phase','ju_phase','sa_phase','ur_phase','ne_phase'];

for (const row of presetsFile.presets) {
  processed++;
  const config = {};
  for (let i = 0; i < planetKeys.length; i++) {
    config[planetKeys[i]] = {
      d: row[colIdx[dKeys[i]]],
      antiPhase: row[colIdx[phaseKeys[i]]] === 1,
    };
  }

  // Sweep each planet
  const perPlanet = {};
  let totalErr = 0;
  let feasible = true;
  for (const key of planetKeys) {
    const r = findBestPhase(key, config[key].d, config[key].antiPhase);
    if (r.llOnly) tallyLLOnly[key]++;
    if (r.llDir)  tallyLLDir[key]++;
    if (!r.llDir) feasible = false;  // mark but keep iterating to fill tallies
    perPlanet[key] = r;
  }
  if (!feasible) { dropped++; continue; }

  // Earth LL check (does not depend on preset, but ensure it passes once)
  const earthBest = findBestEarthPhase();
  if (!earthBest) { dropped++; continue; }
  for (const key of planetKeys) {
    totalErr += perPlanet[key].llDir.errAsec;
    perPlanet[key] = perPlanet[key].llDir;
  }

  survivors.push({
    scenario: row[colIdx.scenario],
    inclBalance: row[colIdx.balance],
    config,
    perPlanet,
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
for (const key of planetKeys) {
  console.log(
    '  ' + key.padEnd(8) + ' │  ' +
    (tallyLLOnly[key] + '/' + processed).padStart(7) + ' │  ' +
    (tallyLLDir[key]  + '/' + processed).padStart(7)
  );
}
console.log('');

if (survivors.length > 0) {
  // ─── Console summary: top 30 ───
  const TOP = Math.min(30, survivors.length);
  console.log(`  TOP ${TOP} survivors (sorted by total trend-rate error, ″/cy):`);
  console.log('');
  console.log('  Rank │ Scen │ TotErr │ ' + planetKeys.map(k => k.slice(0,2)).join('   ') + '   │ ' + planetKeys.map(k => 'φ-' + k.slice(0,2)).join(' '));
  console.log('  ─────┼──────┼────────┼──────────────────────────────┼───────────────────────────────────────────────────────────');
  for (let i = 0; i < TOP; i++) {
    const s = survivors[i];
    const dGroup = planetKeys.map(k => `${s.config[k].d}${s.config[k].antiPhase ? 'A' : 'i'}`).join(' ');
    const phases = planetKeys.map(k => s.perPlanet[k].phase.toFixed(0).padStart(4)).join(' ');
    console.log(
      '  ' + (i+1).toString().padStart(4) + ' │  ' + s.scenario + '   │ ' +
      s.totalErr.toFixed(2).padStart(6) + ' │ ' + dGroup.padEnd(28) + ' │ ' + phases
    );
  }
  console.log('');
  console.log('  (d values; "i" = in-phase, "A" = anti-phase; φ in degrees)');
}

// ═══════════════════════════════════════════════════════════════
// WRITE OUTPUT FILE
// ═══════════════════════════════════════════════════════════════

const output = {
  generated: new Date().toISOString(),
  source: 'data/balance-presets.json',
  total_input_presets: presetsFile.presets.length,
  filter: 'For each preset, every fitted planet must have at least one continuous-sweep phase angle (0–360°, step ' + STEP + '°) satisfying both Laplace-Lagrange bounds and JPL ecliptic-inclination trend direction. Phase angles are independent per planet (no shared balanced-year anchor required).',
  phase_sweep_step_deg: STEP,
  jpl_trends_deg_per_century: jplTrends,
  ll_bounds: llBounds,
  count: survivors.length,
  format_per_preset: {
    scenario: 'A/B/C/D from balance-presets.json',
    incl_balance_pct: 'inclination-balance score (in-phase vs anti-phase weights)',
    config: 'per-planet { d: Fibonacci quantum, antiPhase: boolean }',
    best_phases: 'per-planet { phase_deg, mean_deg, amp_deg, trend_deg_per_cy, err_arcsec_per_cy, range_min_deg, range_max_deg } at the LL+dir-feasible phase angle minimizing |trend − JPL|',
    total_trend_err_arcsec: 'sum of best per-planet |trend − JPL| in arcsec/century',
  },
  survivors: survivors.map(s => ({
    scenario: s.scenario,
    incl_balance_pct: s.inclBalance,
    config: s.config,
    best_phases: Object.fromEntries(planetKeys.map(k => [k, {
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
