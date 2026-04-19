// ═══════════════════════════════════════════════════════════════
// Exhaustive balance search using EXACT values from script.js
// Reproduces the full computation chain: HY → SolarYearCount → OrbitDistance → mass → L → w
//
// Usage: node tools/verify/balance-search.js
// Output: data/balance-presets.json (sorted best to worst)
// ═══════════════════════════════════════════════════════════════

const fs = require('fs');
const path = require('path');
const C = require('../lib/constants');

// ── Import computation chain from constants.js ──
const mass = C.massFraction;
const PSI = C.PSI;
const DEG2RAD = Math.PI / 180;

// Build lookup tables from per-planet data
const planets = ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'];
const orbitDistance = { earth: 1.0 };
const eccBase = { earth: C.eccentricityBase };
const eccJ2000 = { earth: C.eccJ2000.earth };
const inclJ2000 = {};
const periLongJ2000 = {};
const omegaJ2000 = {};
const eclPeriod = {};
const icrfPeriod = {};       // SIGNED ICRF perihelion period
const ascNodePeriod = {};    // SIGNED asc-node period (-8H/N)
const perPlanetPhase = {};
const genPrec = C.H / 13;
for (const p of planets) {
  if (p === 'earth') {
    periLongJ2000[p] = C.ASTRO_REFERENCE.earthPerihelionLongitudeJ2000;
    omegaJ2000[p] = C.ASTRO_REFERENCE.earthAscendingNodeInvPlane;
    icrfPeriod[p] = C.H / 3;
    eclPeriod[p] = C.H / 16;
    ascNodePeriod[p] = -C.H / 5;       // Earth Ω regresses at -H/5
    perPlanetPhase[p] = C.ASTRO_REFERENCE.earthInclinationCycleAnchor;
    continue;
  }
  orbitDistance[p] = C.derived[p].orbitDistance;
  eccBase[p] = C.planets[p].orbitalEccentricityBase;
  eccJ2000[p] = C.planets[p].orbitalEccentricityJ2000;
  inclJ2000[p] = C.planets[p].invPlaneInclinationJ2000;
  periLongJ2000[p] = C.planets[p].longitudePerihelion;
  omegaJ2000[p] = C.planets[p].ascendingNodeInvPlane;
  eclPeriod[p] = C.planets[p].perihelionEclipticYears;
  icrfPeriod[p] = 1 / (1/eclPeriod[p] - 1/genPrec);  // signed
  ascNodePeriod[p] = C.planets[p].ascendingNodeCyclesIn8H
    ? -(8 * C.H) / C.planets[p].ascendingNodeCyclesIn8H
    : eclPeriod[p];
  perPlanetPhase[p] = C.planets[p].inclinationCycleAnchor;
}
// Earth's J2000 inclination (computed from mean + amplitude model)
inclJ2000.earth = C.earthInvPlaneInclinationMean +
  C.earthInvPlaneInclinationAmplitude * Math.cos(
    (C.ASTRO_REFERENCE.earthPerihelionLongitudeJ2000 - C.ASTRO_REFERENCE.earthInclinationCycleAnchor) * DEG2RAD);

// LL bounds (Laplace-Lagrange secular theory)
const llBounds = {
  mercury: { min: 4.57, max: 9.86 },
  venus: { min: 0.00, max: 3.38 },
  earth: { min: 0.00, max: 2.95 },
  mars: { min: 0.00, max: 5.84 },
  jupiter: { min: 0.241, max: 0.489 },
  saturn: { min: 0.797, max: 1.02 },
  uranus: { min: 0.902, max: 1.11 },
  neptune: { min: 0.554, max: 0.800 },
};

// JPL ecliptic inclination trends (degrees/century)
const trendJPL = {
  mercury: -0.00595, venus: -0.00079, mars: -0.00813,
  jupiter: -0.00184, saturn: +0.00194, uranus: -0.00243, neptune: +0.00035,
};

// ── Reproduce fbeCalcApparentIncl from script.js ──
// Planet Ω advances at the asc-node period (NOT the ICRF perihelion period or
// the ecliptic perihelion period — these are different angles evolving at different rates).
// Earth Ω regresses at -H/5 (the ecliptic precession rate).
function fbeCalcApparentIncl(year, planetKey, planetMean, planetAmplitude, planetIcrfPeriod, planetPeriLongJ2000, planetPhaseAngle, isAntiPhase) {
  const periLong = planetPeriLongJ2000 + (360 / planetIcrfPeriod) * (year - 2000);
  const planetPhase = (periLong - planetPhaseAngle) * DEG2RAD;
  const sign = isAntiPhase ? -1 : 1;
  const planetI = (planetMean + sign * planetAmplitude * Math.cos(planetPhase)) * DEG2RAD;
  const planetOmegaRad = (omegaJ2000[planetKey] + (360 / ascNodePeriod[planetKey]) * (year - 2000)) * DEG2RAD;

  const earthICRFPeriod = C.H / 3;
  const earthAscPeriod = -C.H / 5;
  const earthCosPhase0 = (inclJ2000.earth - C.earthInvPlaneInclinationMean) / C.earthInvPlaneInclinationAmplitude;
  const earthPhase0 = Math.acos(earthCosPhase0);
  const earthPhase = earthPhase0 + 2 * Math.PI * (year - 2000) / earthICRFPeriod;
  const earthI = (C.earthInvPlaneInclinationMean + C.earthInvPlaneInclinationAmplitude * Math.cos(earthPhase)) * DEG2RAD;
  const earthOmega = (C.ASTRO_REFERENCE.earthAscendingNodeInvPlane + (360 / earthAscPeriod) * (year - 2000)) * DEG2RAD;

  const pnx = Math.sin(planetI) * Math.sin(planetOmegaRad);
  const pny = Math.sin(planetI) * Math.cos(planetOmegaRad);
  const pnz = Math.cos(planetI);
  const enx = Math.sin(earthI) * Math.sin(earthOmega);
  const eny = Math.sin(earthI) * Math.cos(earthOmega);
  const enz = Math.cos(earthI);

  const cosAngle = pnx * enx + pny * eny + pnz * enz;
  return Math.acos(Math.min(1, Math.max(-1, cosAngle))) * 180 / Math.PI;
}

// ── Pre-computed per-planet constants for fast balance check ──
const _wCoeff = {};  // inclination balance coefficient per planet
const _vCoeff = {};  // eccentricity balance coefficient (base) per planet
const _vCoeffJ = {}; // eccentricity balance coefficient (J2000) per planet
const _sqrtMass = {};
for (const key of planets) {
  _sqrtMass[key] = Math.sqrt(mass[key]);
  _wCoeff[key] = Math.sqrt(mass[key] * orbitDistance[key] * (1 - eccBase[key] * eccBase[key]));
  _vCoeff[key] = _sqrtMass[key] * Math.pow(orbitDistance[key], 1.5) * eccBase[key];
  _vCoeffJ[key] = _sqrtMass[key] * Math.pow(orbitDistance[key], 1.5) * eccJ2000[key];
}

// ── Per-config base eccentricity (for fair deep-analysis ranking) ──
// Each candidate config is evaluated at its own optimal anchor n.
// The base eccentricity depends on that config's d-values and anti-phase
// assignments, so recompute it per config.
const K_ECC = C.eccentricityAmplitudeK;
const obliquityCycle = {};  // per planet
const wobblePeriod = {};    // per planet
for (const p of planets) {
  if (p === 'earth') {
    obliquityCycle[p] = C.H / 8;
    wobblePeriod[p] = C.H / 16;
  } else {
    obliquityCycle[p] = C.planets[p].obliquityCycle;
    wobblePeriod[p] = C.planets[p].wobblePeriod;
  }
}

/**
 * Required eccentricity direction at J2000 per planet.
 *
 * Only planets whose de/dt is resolvable from the 1900-2026 trustworthy
 * observational baseline are constrained. For Venus, Jupiter, Uranus, Neptune
 * the short-baseline trend flips sign across sub-windows (1800-1900, 1900-2026,
 * 2026-2100), so the "direction" is inherited from Laskar-style million-year
 * secular integrations — a theoretical prediction, not an observation.
 *
 * Mars is also excluded: at 50,614-year wobble, the 126-year observation
 * window (1900-2026) covers only 0.25% of a cycle — too short to distinguish
 * a real secular trend from short-period noise.
 *
 * Constraining those here would amount to fitting to theory, not data, so they
 * are deliberately excluded. Earth's eccentricity direction is derived from its
 * own H/16 wobble geometry, not a free-parameter choice, so it is also excluded.
 *
 *   'rising'  = phase ∈ (0°, 180°)  → sin(θ) > 0 → de/dt > 0
 *   'falling' = phase ∈ (180°, 360°) → sin(θ) < 0 → de/dt < 0
 */
const REQUIRED_ECC_DIR = {
  mercury: 'rising',
  saturn:  'falling',
};
const CONSTRAINED_ECC_PLANETS = Object.keys(REQUIRED_ECC_DIR);

/**
 * Compute eccentricity phase at J2000 for (key, d, antiPhase, n) and return
 * both the phase (mod 360°) and the direction ('rising' | 'falling').
 */
function eccPhaseDirection(key, d, antiPhase, n) {
  if (key === 'earth') {
    // Earth uses H/16 wobble, phase at J2000 is derived; use Earth's own constants
    const t2000 = 2000 - (C.balancedYear - n * C.H);
    const phaseOffset = 90; // Earth is in-phase
    const phaseDeg = ((t2000 / (C.H / 16)) * 360 + phaseOffset) % 360;
    const p = (phaseDeg + 360) % 360;
    return { phase: p, dir: p > 0 && p < 180 ? 'rising' : 'falling' };
  }
  const t2000 = 2000 - (C.balancedYear - n * C.H);
  const phaseOffset = antiPhase ? 270 : 90;
  const wob = wobblePeriod[key];
  const phaseDeg = (t2000 / wob) * 360 + phaseOffset;
  const p = ((phaseDeg % 360) + 360) % 360;
  return { phase: p, dir: p > 0 && p < 180 ? 'rising' : 'falling' };
}

/**
 * Check how many planets (out of 8) have their eccentricity phase in the
 * required direction at J2000 for a given config + anchor n.
 */
function checkEccDirections(cfg, n) {
  const results = {};
  let match = 0;
  for (const k of planets) {
    const d = k === 'earth' ? 3 : cfg[k].d;
    const anti = k === 'earth' ? false : cfg[k].anti;
    const { phase, dir } = eccPhaseDirection(k, d, anti, n);
    const required = REQUIRED_ECC_DIR[k];
    if (required === undefined) {
      // Not observationally constrained — report phase/dir but don't score.
      results[k] = { phase, dir, ok: null };
    } else {
      const ok = dir === required;
      results[k] = { phase, dir, ok };
      if (ok) match++;
    }
  }
  return { match, total: CONSTRAINED_ECC_PLANETS.length, results };
}

/**
 * Compute a planet's base eccentricity under a given config and anchor.
 *
 * @param {string} key       planet name
 * @param {number} d         Fibonacci divisor (from the candidate config)
 * @param {boolean} antiPhase  is this planet anti-phase in the candidate config?
 * @param {number} n         anchor offset in whole H (0..7 within 8H)
 * @returns {number} base eccentricity
 */
function baseEccForConfig(key, d, antiPhase, n) {
  if (key === 'earth') return eccBase.earth;  // Earth is a fixed input
  const tiltJ2000 = C.planets[key].axialTiltJ2000;
  const t2000 = 2000 - (C.balancedYear - n * C.H);
  // Inclination amplitude from PSI and this config's d
  const inclAmp = PSI / (d * _sqrtMass[key]);
  // Mean obliquity (anchored at n × H back from balancedYear)
  const obliqCyc = obliquityCycle[key];
  let meanObliq;
  if (obliqCyc && inclAmp) {
    meanObliq = tiltJ2000
      + inclAmp * Math.cos(2 * Math.PI * t2000 / icrfPeriod[key])
      - inclAmp * Math.cos(2 * Math.PI * t2000 / obliqCyc);
  } else {
    meanObliq = tiltJ2000;
  }
  // K-derived eccentricity amplitude using this config's d
  const a = orbitDistance[key];
  const eccAmp = K_ECC * Math.sin(Math.abs(meanObliq) * Math.PI / 180) * Math.sqrt(d)
               / (_sqrtMass[key] * Math.pow(a, 1.5));
  // Phase at J2000: phaseOffset + (2000 − anchor) / wobble × 360°
  const phaseOffset = antiPhase ? 270 : 90;
  const wob = wobblePeriod[key];
  const phaseDeg = (t2000 / wob) * 360 + phaseOffset;
  const theta = phaseDeg * Math.PI / 180;
  const sinT = Math.sin(theta);
  const cosT = Math.cos(theta);
  const eJ = eccJ2000[key];
  const disc = eJ * eJ - eccAmp * eccAmp * sinT * sinT;
  return eccAmp * cosT + Math.sqrt(Math.max(0, disc));
}

/**
 * Compute eccentricity balance for a candidate config at its best anchor n,
 * using bases recomputed per config (not the default config's bases).
 */
function eccBalanceForConfig(cfg, n) {
  let vPro = 0, vAnti = 0;
  for (const k of planets) {
    const d = k === 'earth' ? 3 : cfg[k].d;
    const antiPhase = k === 'earth' ? false : cfg[k].anti;
    const base = baseEccForConfig(k, d, antiPhase, n);
    const v = _sqrtMass[k] * Math.pow(orbitDistance[k], 1.5) * base / Math.sqrt(d);
    if (antiPhase) vAnti += v; else vPro += v;
  }
  return (1 - Math.abs(vPro - vAnti) / (vPro + vAnti)) * 100;
}

// ── Fast inclination balance only (for 7.5M screening) ──
function computeInclBalance(config) {
  let wPro = 0, wAnti = 0;
  for (const key of planets) {
    const w = _wCoeff[key] / config[key].d;
    if (config[key].group !== 'anti-phase') wPro += w; else wAnti += w;
  }
  return (1 - Math.abs(wPro - wAnti) / (wPro + wAnti)) * 100;
}

// ── Full balance computation (only for configs passing threshold) ──
function computeBalance(config) {
  const planetResults = {};
  let allPass = true;

  for (const key of planets) {
    const d = config[key].d;
    const isAntiPhase = config[key].group === 'anti-phase';
    const phaseAngle = perPlanetPhase[key];
    const amplitude = (d > 0) ? PSI / (d * _sqrtMass[key]) : NaN;
    const cosPhaseJ2000 = Math.cos((periLongJ2000[key] - phaseAngle) * DEG2RAD);
    const mean = inclJ2000[key] - (isAntiPhase ? -1 : 1) * amplitude * cosPhaseJ2000;
    const rangeMin = mean - amplitude;
    const rangeMax = mean + amplitude;
    const LL_UNCERTAINTY = 0.03;
    const fitsLL = rangeMin >= llBounds[key].min - LL_UNCERTAINTY && rangeMax <= llBounds[key].max + LL_UNCERTAINTY;
    const undershoot = Math.max(0, llBounds[key].min - rangeMin);
    const overshoot = Math.max(0, rangeMax - llBounds[key].max);
    const llOvershootDeg = undershoot + overshoot;

    let directionMatch = true;
    if (key !== 'earth') {
      const i1900 = fbeCalcApparentIncl(1900, key, mean, amplitude, icrfPeriod[key], periLongJ2000[key], phaseAngle, isAntiPhase);
      const i2100 = fbeCalcApparentIncl(2100, key, mean, amplitude, icrfPeriod[key], periLongJ2000[key], phaseAngle, isAntiPhase);
      const trend = (i2100 - i1900) / 2;
      directionMatch = (trendJPL[key] >= 0) === (trend >= 0);
    }

    if (!fitsLL || !directionMatch) allPass = false;
    planetResults[key] = { amplitude, mean, rangeMin, rangeMax, fitsLL, llOvershootDeg, directionMatch };
  }

  // Inclination balance
  let wPro = 0, wAnti = 0;
  for (const key of planets) {
    const w = _wCoeff[key] / config[key].d;
    if (config[key].group !== 'anti-phase') wPro += w; else wAnti += w;
  }
  const inclBalance = (1 - Math.abs(wPro - wAnti) / (wPro + wAnti)) * 100;

  // Eccentricity balance (base)
  let vPro = 0, vAnti = 0;
  for (const key of planets) {
    const v = _vCoeff[key] / Math.sqrt(config[key].d);
    if (config[key].group !== 'anti-phase') vPro += v; else vAnti += v;
  }
  const eccBalance = (1 - Math.abs(vPro - vAnti) / (vPro + vAnti)) * 100;

  // Eccentricity balance (J2000)
  let vProJ = 0, vAntiJ = 0;
  for (const key of planets) {
    const v = _vCoeffJ[key] / Math.sqrt(config[key].d);
    if (config[key].group !== 'anti-phase') vProJ += v; else vAntiJ += v;
  }
  const eccBalanceJ2000 = (1 - Math.abs(vProJ - vAntiJ) / (vProJ + vAntiJ)) * 100;

  // LL bounds summary
  const LL_UNCERTAINTY = 0.03;
  const llPassCount = planets.filter(p => planetResults[p].fitsLL).length;
  const dirPassCount = planets.filter(p => planetResults[p].directionMatch).length;
  const maxLLOvershootRaw = Math.max(...planets.map(p => planetResults[p].llOvershootDeg));
  const maxLLOvershoot = Math.max(0, maxLLOvershootRaw - LL_UNCERTAINTY);

  return { inclBalance, eccBalance, eccBalanceJ2000, llPassCount, dirPassCount, maxLLOvershoot, maxLLOvershootRaw, allPass, planetResults };
}

// ══════════════════════════════════════════════════════════════════
// VERIFICATION
// ══════════════════════════════════════════════════════════════════

console.log('═══════════════════════════════════════════════════════════════');
console.log('VERIFICATION: Exact values from script.js computation chain');
console.log('═══════════════════════════════════════════════════════════════');
console.log('Planet      SMA (code)       Mass (M/M_SUN)     Ecc (Base)   Ecc (J2000)');
for (const p of planets) {
  console.log(`${p.padEnd(10)} ${orbitDistance[p].toFixed(8).padStart(14)} ${mass[p].toExponential(8).padStart(18)} ${eccBase[p].toFixed(8)} ${eccJ2000[p].toFixed(8)}`);
}

const currentConfig = {
  mercury: { d: 21, group: 'in-phase' }, venus: { d: 34, group: 'in-phase' },
  earth: { d: 3, group: 'in-phase' }, mars: { d: 5, group: 'in-phase' },
  jupiter: { d: 5, group: 'in-phase' }, saturn: { d: 3, group: 'anti-phase' },
  uranus: { d: 21, group: 'in-phase' }, neptune: { d: 34, group: 'in-phase' },
};

const curResult = computeBalance(currentConfig);
console.log(`\nCurrent config:`);
console.log(`  Inclination balance: ${curResult.inclBalance.toFixed(4)}%`);
console.log(`  Eccentricity balance: ${curResult.eccBalance.toFixed(4)}% (base), ${curResult.eccBalanceJ2000.toFixed(4)}% (J2000)`);
console.log(`  LL bounds pass: ${curResult.llPassCount}/8`);
console.log(`  Direction pass: ${curResult.dirPassCount}/8`);
console.log(`  All LL+Dir pass: ${curResult.allPass}`);

// ── Saturn eccentricity prediction from Law 5 balance equation ──
// v_j = √m × a^1.5 × e / √d. Saturn is the sole anti-phase planet, so:
//   Σ(v_j in-phase) = v_Saturn  →  e_Saturn_predicted = Σ_others / saturnCoeff
// where saturnCoeff = √m_Sa × a_Sa^1.5 / √d_Sa
let sumVInPhase = 0;
for (const key of planets) {
  if (currentConfig[key].group !== 'in-phase') continue;
  sumVInPhase += Math.sqrt(mass[key]) * Math.pow(orbitDistance[key], 1.5) * eccBase[key] / Math.sqrt(currentConfig[key].d);
}
const saturnCoeff = Math.sqrt(mass.saturn) * Math.pow(orbitDistance.saturn, 1.5) / Math.sqrt(currentConfig.saturn.d);
const saturnPredicted = sumVInPhase / saturnCoeff;
const saturnActual = eccBase.saturn;
const saturnPredErrPct = (saturnPredicted - saturnActual) / saturnActual * 100;
console.log(`  Saturn e predicted: ${saturnPredicted.toFixed(8)} (actual: ${saturnActual.toFixed(8)}, error: ${saturnPredErrPct >= 0 ? '+' : ''}${saturnPredErrPct.toFixed(3)}%)`);

// ══════════════════════════════════════════════════════════════════
// EXHAUSTIVE SEARCH
// ══════════════════════════════════════════════════════════════════

console.log('\n═══════════════════════════════════════════════════════════════');
console.log('EXHAUSTIVE SEARCH');
console.log('═══════════════════════════════════════════════════════════════');

const fibNumbers = [1, 2, 3, 5, 8, 13, 21, 34, 55];
const groups = ['in-phase', 'anti-phase'];

const scenarios = [
  { name: 'A', jupiter: { d: 5, group: 'in-phase' }, saturn: { d: 3, group: 'anti-phase' } },
  { name: 'B', jupiter: { d: 8, group: 'in-phase' }, saturn: { d: 5, group: 'anti-phase' } },
  { name: 'C', jupiter: { d: 13, group: 'in-phase' }, saturn: { d: 8, group: 'anti-phase' } },
  { name: 'D', jupiter: { d: 21, group: 'in-phase' }, saturn: { d: 13, group: 'anti-phase' } },
];

const THRESHOLD = 99.994;
const allConfigs = [];

for (const scenario of scenarios) {
  let count = 0;

  for (let mi = 0; mi < fibNumbers.length; mi++) {
    for (let mp = 0; mp < 2; mp++) {
      for (let vi = 0; vi < fibNumbers.length; vi++) {
        for (let vp = 0; vp < 2; vp++) {
          for (let mai = 0; mai < fibNumbers.length; mai++) {
            for (let map = 0; map < 2; map++) {
              for (let ui = 0; ui < fibNumbers.length; ui++) {
                for (let up = 0; up < 2; up++) {
                  for (let ni = 0; ni < fibNumbers.length; ni++) {
                    for (let np = 0; np < 2; np++) {
                      const config = {
                        mercury: { d: fibNumbers[mi], group: groups[mp] },
                        venus: { d: fibNumbers[vi], group: groups[vp] },
                        earth: { d: 3, group: 'in-phase' },
                        mars: { d: fibNumbers[mai], group: groups[map] },
                        jupiter: scenario.jupiter,
                        saturn: scenario.saturn,
                        uranus: { d: fibNumbers[ui], group: groups[up] },
                        neptune: { d: fibNumbers[ni], group: groups[np] },
                      };

                      // Fast screening: inclination balance only (no trig)
                      const inclBal = computeInclBalance(config);

                      if (inclBal >= THRESHOLD) {
                        // Full computation only for survivors (~765 out of 7.5M)
                        const result = computeBalance(config);
                        count++;
                        const g = (grp) => grp === 'in-phase' ? 0 : 1;
                        allConfigs.push({
                          scenario: scenario.name,
                          inclBalance: result.inclBalance,
                          eccBalance: result.eccBalance,
                          eccBalanceJ2000: result.eccBalanceJ2000,
                          llPassCount: result.llPassCount,
                          dirPassCount: result.dirPassCount,
                          maxLLOvershoot: result.maxLLOvershoot,
                          allPass: result.allPass,
                          score: (1 - Math.min(1, result.maxLLOvershoot)) * 10000 + result.eccBalance * 1 + result.inclBalance * 0.001,
                          row: [
                            scenario.name,
                            parseFloat(result.inclBalance.toFixed(8)),
                            config.mercury.d, g(config.mercury.group),
                            config.venus.d, g(config.venus.group),
                            config.mars.d, g(config.mars.group),
                            config.jupiter.d, g(config.jupiter.group),
                            config.saturn.d, g(config.saturn.group),
                            config.uranus.d, g(config.uranus.group),
                            config.neptune.d, g(config.neptune.group),
                          ],
                        });
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }

  console.log(`Scenario ${scenario.name} (Ju=${scenario.jupiter.d}, Sa=${scenario.saturn.d}): ${count} configs >= ${THRESHOLD}%`);
}

// Sort by composite score descending
// Score = (100 - maxLLOvershoot%) × 100 + eccBalance × 1 + inclBalance × 0.001
allConfigs.sort((a, b) => b.score - a.score);

console.log(`\nTotal: ${allConfigs.length} configs >= ${THRESHOLD}% inclination balance`);
console.log(`All pass LL+Dir: ${allConfigs.filter(c => c.allPass).length}`);
console.log(`LL 8/8: ${allConfigs.filter(c => c.llPassCount === 8).length}`);
console.log(`LL 7/8: ${allConfigs.filter(c => c.llPassCount >= 7).length}`);

// Show top 20
console.log('\nTop 20 by composite score (LL overshoot + ecc balance + incl balance):');
console.log('Rank │ Incl bal   │ Ecc bal    │ LL max▲  │ Dir │ Score    │ Me  Ve  Ma  Ju  Sa  Ur  Ne');
console.log('─────┼────────────┼────────────┼──────────┼─────┼──────────┼─────────────────────────────');
for (let i = 0; i < Math.min(20, allConfigs.length); i++) {
  const c = allConfigs[i];
  const r = c.row;
  const pGroup = (d, g) => `${d}${g ? '*' : ''}`;
  console.log(
    `${(i + 1).toString().padStart(4)} │ ${c.inclBalance.toFixed(4).padStart(9)}% │ ${c.eccBalance.toFixed(4).padStart(9)}% │ ${c.maxLLOvershoot.toFixed(3).padStart(6)}° │ ${c.dirPassCount}/8 │ ${c.score.toFixed(1).padStart(8)} │ ` +
    `${pGroup(r[2],r[3]).padStart(3)} ${pGroup(r[4],r[5]).padStart(3)} ${pGroup(r[6],r[7]).padStart(3)} ${pGroup(r[8],r[9]).padStart(3)} ${pGroup(r[10],r[11]).padStart(3)} ${pGroup(r[12],r[13]).padStart(3)} ${pGroup(r[14],r[15]).padStart(3)}`
  );
}

// Find current config rank
const curIdx = allConfigs.findIndex(c => {
  const r = c.row;
  return r[2] === 21 && r[3] === 0 && r[4] === 34 && r[5] === 0 &&
         r[6] === 5 && r[7] === 0 && r[8] === 5 && r[9] === 0 &&
         r[10] === 3 && r[11] === 1 && r[12] === 21 && r[13] === 0 &&
         r[14] === 34 && r[15] === 0;
});
if (curIdx >= 0) {
  const c = allConfigs[curIdx];
  console.log(`\nDefault config rank: ${curIdx + 1}/${allConfigs.length} (score: ${c.score.toFixed(1)}, incl: ${c.inclBalance.toFixed(4)}%, ecc: ${c.eccBalance.toFixed(4)}%, LL max overshoot: ${c.maxLLOvershoot.toFixed(3)}°)`);
}

// ══════════════════════════════════════════════════════════════════
// WRITE OUTPUT FILE
// ══════════════════════════════════════════════════════════════════

const outputDir = path.join(__dirname, '..', '..', 'data');
const outputPath = path.join(outputDir, 'balance-presets.json');

// Exhaustive-search space size: 4 scenarios × 9 Fibonacci d-values × 2 phase groups
// for each of 5 free planets (Mercury, Venus, Mars, Uranus, Neptune).
// Earth is locked (d=3, in-phase); Jupiter/Saturn are fixed per scenario.
const searchSpace = scenarios.length * Math.pow(fibNumbers.length, 5) * Math.pow(2, 5);
const allPassCount = allConfigs.filter(c => c.allPass).length;

const output = {
  generated: new Date().toISOString(),
  threshold: THRESHOLD,
  searchSpace,
  count: allConfigs.length,
  allPassCount,
  currentConfig: {
    rank: curIdx >= 0 ? curIdx + 1 : null,
    inclBalance: curResult.inclBalance,
    eccBalance: curResult.eccBalance,
    eccBalanceJ2000: curResult.eccBalanceJ2000,
    saturnPredicted,
    saturnActual,
    saturnPredErrPct,
    llPassCount: curResult.llPassCount,
    dirPassCount: curResult.dirPassCount,
    allPass: curResult.allPass,
    dValues: { mercury: 21, venus: 34, earth: 3, mars: 5, jupiter: 5, saturn: 3, uranus: 21, neptune: 34 },
  },
  scenarios: {
    A: 'Ju=5, Sa=3',
    B: 'Ju=8, Sa=5',
    C: 'Ju=13, Sa=8',
    D: 'Ju=21, Sa=13',
  },
  // Legacy format reference (pre-deep-analysis):
  // ['scenario','balance','me_d','me_phase','ve_d','ve_phase','ma_d','ma_phase','ju_d','ju_phase','sa_d','sa_phase','ur_d','ur_phase','ne_d','ne_phase']
  format: [
    'scenario','inclBalance',
    'me_d','me_group','ve_d','ve_group','ma_d','ma_group',
    'ju_d','ju_group','sa_d','sa_group','ur_d','ur_group','ne_d','ne_group',
    'eccBalance','anchor_n','dirCount','totalErr','mirror',
    'me_N','ve_N','ma_N','ju_N','sa_N','ur_N','ne_N',
    'me_phaseAngle','ve_phaseAngle','ma_phaseAngle','ju_phaseAngle','sa_phaseAngle','ur_phaseAngle','ne_phaseAngle',
  ],
  phaseAngles: ['in-phase', 'anti-phase'],
  // Presets now contain only the deep-analysis survivors (configs with a valid
  // anchor giving LL 8/8), with extended per-config optimized parameters.
  // Populated after the deep analysis section below.
  presets: [],
};

fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
console.log(`\nWritten ${allConfigs.length} presets to ${outputPath}`);
console.log(`  Search space: ${searchSpace.toLocaleString()} d-assignments`);
console.log(`  Passing balance ≥${THRESHOLD}%: ${allConfigs.length}`);
console.log(`  Passing balance + LL + Dir: ${allPassCount}`);
if (curIdx >= 0) console.log(`  Current Config #${curIdx + 1} rank out of ${allConfigs.length}`);

// ══════════════════════════════════════════════════════════════════
// DEEP ANALYSIS: Per-config optimization of anchor n & ascending nodes
//
// For each surviving config that passes BOTH incl ≥ threshold AND
// ecc ≥ 99% (the "~35"), we jointly sweep:
//
//   n ∈ {0..7}  — balanced-year anchor (position within 8H Grand Octave)
//   N ∈ {1..120} — ascending node cycles in 8H (per planet, independent)
//
// This finds the optimal (n, N_per_planet) for EACH config, making the
// LL bounds and direction checks FAIR — not biased toward the default config.
// ══════════════════════════════════════════════════════════════════

const DEEP_ECC_THRESHOLD = 99.0;
const DEEP_N_MAX = 120;

// Earth reference for apparent-inclination computation (config-independent)
const eIcrfRate  = 360 / (C.H / 3);
const eAscRate   = 360 / (-C.H / 5);
const eIfix_deg  = C.ASTRO_REFERENCE.earthInclinationJ2000_deg;
const ePeriJ2000 = C.ASTRO_REFERENCE.earthPerihelionLongitudeJ2000;
const ePhase     = C.ASTRO_REFERENCE.earthInclinationCycleAnchor;
const BY_REF     = C.balancedYear;

// Per-planet ICRF rates (config-independent: rate = 360 / icrfPeriod)
const _icrfRate = {};
const fittedPlanets = ['mercury','venus','mars','jupiter','saturn','uranus','neptune'];
for (const k of fittedPlanets) {
  const eclP = C.planets[k].perihelionEclipticYears;
  _icrfRate[k] = 360 * (1/eclP - 1/genPrec);  // deg/yr, negative = retrograde ICRF
}

/**
 * Evaluate a planet under an arbitrary config at a specific anchor + ascending node.
 *
 * Adapted from tools/explore/anchor-and-ascnode-audit.js evalPlanet().
 * Key difference: d and isAntiPhase are parameters, not read from a global config.
 *
 * @param {string} k         planet name (not earth)
 * @param {number} d         Fibonacci divisor
 * @param {boolean} isAntiPhase  true for anti-phase group
 * @param {number} n         anchor offset in whole H (0..7 within 8H)
 * @param {number} N         ascending node cycles in 8H (integer ≥1)
 * @returns {{ phase, mean, amp, inLL, trendModel, jplMoving, errArcsec, dirMatch }}
 */
function evalPlanetDeep(k, d, isAntiPhase, n, N) {
  const sqrtM = _sqrtMass[k];
  const amp   = PSI / (d * sqrtM);
  const sign  = isAntiPhase ? -1 : 1;
  const rate  = _icrfRate[k];
  const periJ = periLongJ2000[k];
  const omJ   = omegaJ2000[k];
  const ij2k  = inclJ2000[k];

  // Phase from balanced-year anchor: n × H backwards from the reference BY
  const yAnchor = BY_REF - n * C.H;
  const periAtAnchor = ((periJ + rate * (yAnchor - 2000)) % 360 + 360) % 360;
  // Convention: anti-phase planet's phase = perihelion at anchor;
  //             in-phase adds 180° (minimum at balanced year, not maximum).
  const phase = isAntiPhase ? periAtAnchor : (periAtAnchor + 180) % 360;

  // Mean from J2000 constraint: i_J2000 = mean + sign * amp * cos(peri_J2000 - phase)
  const cosJ = Math.cos((periJ - phase) * DEG2RAD);
  const mean = ij2k - sign * amp * cosJ;

  // LL bounds check (±0.03° uncertainty tolerance)
  const inLL = mean - amp >= llBounds[k].min - 0.03 &&
               mean + amp <= llBounds[k].max + 0.03;
  const llOvershoot = Math.max(0, llBounds[k].min - (mean - amp)) +
                      Math.max(0, (mean + amp) - llBounds[k].max);

  // Apparent ecliptic-inclination trend (1900→2100) in the moving-Earth frame
  const ascNodePeriod = -(8 * C.H) / N;
  function apparentIncl(year, fixedEarth) {
    const peri = periJ + rate * (year - 2000);
    const iP  = (mean + sign * amp * Math.cos((peri - phase) * DEG2RAD)) * DEG2RAD;
    const omP = (omJ + (360 / ascNodePeriod) * (year - 2000)) * DEG2RAD;
    let iE, omE;
    if (fixedEarth) {
      iE  = eIfix_deg * DEG2RAD;
      omE = omegaJ2000.earth * DEG2RAD;
    } else {
      const ePeri = ePeriJ2000 + eIcrfRate * (year - 2000);
      iE  = (C.earthInvPlaneInclinationMean + C.earthInvPlaneInclinationAmplitude *
             Math.cos((ePeri - ePhase) * DEG2RAD)) * DEG2RAD;
      omE = (omegaJ2000.earth + eAscRate * (year - 2000)) * DEG2RAD;
    }
    const dot = Math.cos(iP) * Math.cos(iE) +
                Math.sin(iP) * Math.sin(iE) * Math.cos(omP - omE);
    return Math.acos(Math.max(-1, Math.min(1, dot))) * 180 / Math.PI;
  }

  const tMov = (apparentIncl(2100, false) - apparentIncl(1900, false)) / 2;
  const tFix = (apparentIncl(2100, true)  - apparentIncl(1900, true))  / 2;
  // Frame correction: JPL reports in fixed ecliptic frame
  const jplMoving = trendJPL[k] + (tMov - tFix);
  const errArcsec = Math.abs(tMov - jplMoving) * 3600;
  const dirMatch  = (tMov >= 0) === (jplMoving >= 0);

  return { phase, mean, amp, inLL, llOvershoot, tMov, jplMoving, errArcsec, dirMatch };
}

// ── Identify deep candidates ──
const deepCandidates = allConfigs.filter(c => c.eccBalance >= DEEP_ECC_THRESHOLD);

console.log('\n═══════════════════════════════════════════════════════════════');
console.log('DEEP ANALYSIS: Per-config optimization of anchor n & ascending nodes');
console.log('═══════════════════════════════════════════════════════════════');
console.log(`  Candidates: ${deepCandidates.length} configs with incl ≥${THRESHOLD}% AND ecc ≥${DEEP_ECC_THRESHOLD}%`);
console.log(`  Sweep: n ∈ {0..7} (anchor within 8H), N ∈ {1..${DEEP_N_MAX}} (asc node per planet)`);
console.log(`  Evals per config: 8 × 7 × ${DEEP_N_MAX} = ${8 * 7 * DEEP_N_MAX}`);
console.log('');

const deepResults = [];

for (const candidate of deepCandidates) {
  const row = candidate.row;
  // Reconstruct config from compact row
  const cfg = {
    mercury: { d: row[2],  anti: row[3]  === 1 },
    venus:   { d: row[4],  anti: row[5]  === 1 },
    mars:    { d: row[6],  anti: row[7]  === 1 },
    jupiter: { d: row[8],  anti: row[9]  === 1 },
    saturn:  { d: row[10], anti: row[11] === 1 },
    uranus:  { d: row[12], anti: row[13] === 1 },
    neptune: { d: row[14], anti: row[15] === 1 },
  };

  // Check mirror symmetry: inner ↔ outer pairs have same d
  const mirror = cfg.mercury.d === cfg.uranus.d &&
                 cfg.venus.d   === cfg.neptune.d &&
                 cfg.mars.d    === cfg.jupiter.d;
  // (Earth d=3 ↔ Saturn d=3 is always true by construction in scenarios)

  // ── Shared-anchor sweep: all planets share the same n ──
  let bestAnchor = null;
  const allAnchors = [];  // all 8 anchors' results (for ecc direction analysis)

  for (let n = 0; n < 8; n++) {
    // Always record ecc direction (N-independent) so we can report sweep
    const eccDirCheckThisN = checkEccDirections(cfg, n);

    // Step 1: check LL bounds for all 7 fitted planets at this n (N-independent)
    let allLL = true;
    for (const k of fittedPlanets) {
      const r = evalPlanetDeep(k, cfg[k].d, cfg[k].anti, n, 1);  // N=1 is dummy for LL check
      if (!r.inLL) { allLL = false; break; }
    }
    if (!allLL) {
      allAnchors.push({ n, llPass: false, eccDirMatch: eccDirCheckThisN.match, eccDirPerPlanet: eccDirCheckThisN.results });
      continue;
    }

    // Step 2: LL passes. Find best N per planet, with the constraint that
    // Jupiter and Saturn SHARE the same N (to maximize vector balance
    // preservation — their ascending nodes must regress in lockstep).
    let totalErr = 0;
    let dirCount = 0;
    const perPlanet = {};

    // First: jointly optimize Jupiter + Saturn with a shared N
    let bestJuSaN = null;
    for (let N = 1; N <= DEEP_N_MAX; N++) {
      const rJu = evalPlanetDeep('jupiter', cfg.jupiter.d, cfg.jupiter.anti, n, N);
      const rSa = evalPlanetDeep('saturn', cfg.saturn.d, cfg.saturn.anti, n, N);
      const bothDir = rJu.dirMatch && rSa.dirMatch;
      const combinedErr = rJu.errArcsec + rSa.errArcsec;
      const dirN = (rJu.dirMatch ? 1 : 0) + (rSa.dirMatch ? 1 : 0);
      if (!bestJuSaN ||
          dirN > bestJuSaN.dirN ||
          (dirN === bestJuSaN.dirN && combinedErr < bestJuSaN.combinedErr)) {
        bestJuSaN = { N, rJu: { N, ...rJu }, rSa: { N, ...rSa }, dirN, combinedErr, bothDir };
      }
    }
    if (bestJuSaN) {
      perPlanet.jupiter = bestJuSaN.rJu;
      perPlanet.saturn = bestJuSaN.rSa;
      totalErr += bestJuSaN.combinedErr;
      if (bestJuSaN.rJu.dirMatch) dirCount++;
      if (bestJuSaN.rSa.dirMatch) dirCount++;
    }

    // Then: optimize the other 5 planets independently
    const independentPlanets = fittedPlanets.filter(k => k !== 'jupiter' && k !== 'saturn');
    for (const k of independentPlanets) {
      let bestForPlanet = null;
      for (let N = 1; N <= DEEP_N_MAX; N++) {
        const r = evalPlanetDeep(k, cfg[k].d, cfg[k].anti, n, N);
        if (!r.dirMatch) continue;
        if (!bestForPlanet || r.errArcsec < bestForPlanet.errArcsec) {
          bestForPlanet = { N, ...r };
        }
      }
      if (bestForPlanet) {
        totalErr += bestForPlanet.errArcsec;
        dirCount++;
        perPlanet[k] = bestForPlanet;
      } else {
        // No N gives direction match — find best N anyway
        let bestAny = null;
        for (let N = 1; N <= DEEP_N_MAX; N++) {
          const r = evalPlanetDeep(k, cfg[k].d, cfg[k].anti, n, N);
          if (!bestAny || r.errArcsec < bestAny.errArcsec) {
            bestAny = { N, ...r };
          }
        }
        totalErr += bestAny.errArcsec;
        perPlanet[k] = bestAny;
      }
    }

    // Eccentricity direction check: at this anchor, does each planet's
    // eccentricity phase at J2000 match the required direction (rising/falling)?
    const anchorResult = {
      n, dirCount, totalErr, perPlanet,
      eccDirMatch: eccDirCheckThisN.match,
      eccDirPerPlanet: eccDirCheckThisN.results,
    };
    allAnchors.push({ n, llPass: true, ...anchorResult });
    if (!bestAnchor ||
        anchorResult.dirCount > bestAnchor.dirCount ||
        (anchorResult.dirCount === bestAnchor.dirCount && anchorResult.totalErr < bestAnchor.totalErr)) {
      bestAnchor = anchorResult;
    }
  }

  // Check if this matches the default mirror-symmetric configuration
  const isConfig7 = row[2] === 21 && row[3] === 0 && row[4] === 34 && row[5] === 0 &&
                    row[6] === 5  && row[7] === 0 && row[8] === 5  && row[9] === 0 &&
                    row[10] === 3 && row[11] === 1 && row[12] === 21 && row[13] === 0 &&
                    row[14] === 34 && row[15] === 0;

  // Per-config eccentricity balance: recompute base eccentricities using
  // this config's d-values, anti-phase assignments, and optimal anchor n.
  // This gives a fair comparison across candidate configs.
  const eccBalanceAtAnchor = bestAnchor
    ? eccBalanceForConfig(cfg, bestAnchor.n)
    : candidate.eccBalance;  // fallback if no valid anchor

  // Find anchor(s) with best ecc direction match (max eccDirMatch, tiebreak by LL pass + inclination dir)
  const maxEccMatch = Math.max(...allAnchors.map(a => a.eccDirMatch));
  const bestEccAnchors = allAnchors.filter(a => a.eccDirMatch === maxEccMatch);

  deepResults.push({
    scenario: row[0],
    inclBalance: candidate.inclBalance,
    eccBalance: eccBalanceAtAnchor,              // per-config, at best anchor
    eccBalanceDefault: candidate.eccBalance,     // balance under default bases (for reference)
    eccBalanceJ2000: candidate.eccBalanceJ2000 != null ? candidate.eccBalanceJ2000 : null,
    mirror,
    isConfig7,
    dValues: { me: cfg.mercury.d, ve: cfg.venus.d, ma: cfg.mars.d, ju: cfg.jupiter.d, sa: cfg.saturn.d, ur: cfg.uranus.d, ne: cfg.neptune.d },
    groups:  { me: cfg.mercury.anti ? 1 : 0, ve: cfg.venus.anti ? 1 : 0, ma: cfg.mars.anti ? 1 : 0, ju: cfg.jupiter.anti ? 1 : 0, sa: cfg.saturn.anti ? 1 : 0, ur: cfg.uranus.anti ? 1 : 0, ne: cfg.neptune.anti ? 1 : 0 },
    bestAnchor,
    allAnchors,          // all n values with ecc direction data
    maxEccMatch,         // best ecc direction count across all n for this config
    bestEccAnchors,      // all n values that achieve maxEccMatch
  });
}

// ── Sort: highest (per-config) eccentricity balance first, then direction count, then lowest error ──
deepResults.sort((a, b) => {
  if (!a.bestAnchor && !b.bestAnchor) return 0;
  if (!a.bestAnchor) return 1;
  if (!b.bestAnchor) return -1;
  if (b.eccBalance !== a.eccBalance) return b.eccBalance - a.eccBalance;
  if (b.bestAnchor.dirCount !== a.bestAnchor.dirCount) return b.bestAnchor.dirCount - a.bestAnchor.dirCount;
  return a.bestAnchor.totalErr - b.bestAnchor.totalErr;
});

// ── Print summary table ──
console.log(`  ${deepResults.length} candidates analyzed.\n`);
const ECC_TOTAL = CONSTRAINED_ECC_PLANETS.length;
console.log(`  Rank │ Scen │ Incl%    │ Ecc% (per-cfg) │ Mir │ n │ Dir │ EccDir │ Tot err │ Me  Ve  Ma  Ju  Sa  Ur  Ne`);
console.log('  ─────┼──────┼──────────┼────────────────┼─────┼───┼─────┼────────┼─────────┼─────────────────────────────');
for (let i = 0; i < deepResults.length; i++) {
  const r = deepResults[i];
  const d = r.dValues;
  const g = r.groups;
  const pGroup = (dv, gv) => `${dv}${gv ? '*' : ''}`;
  const ba = r.bestAnchor;
  console.log(
    `  ${(i + 1).toString().padStart(4)} │  ${r.scenario}   │ ${r.inclBalance.toFixed(4).padStart(8)} │   ${r.eccBalance.toFixed(4).padStart(8)}     │  ${r.mirror ? 'Y' : ' '}  │ ${ba ? ba.n : '-'} │ ${ba ? ba.dirCount + '/7' : ' — '} │ ${ba ? ba.eccDirMatch + '/' + ECC_TOTAL : '  — ' } │ ${ba ? ba.totalErr.toFixed(1).padStart(5) + '″' : '   — '} │ ` +
    `${pGroup(d.me, g.me).padStart(3)} ${pGroup(d.ve, g.ve).padStart(3)} ${pGroup(d.ma, g.ma).padStart(3)} ${pGroup(d.ju, g.ju).padStart(3)} ${pGroup(d.sa, g.sa).padStart(3)} ${pGroup(d.ur, g.ur).padStart(3)} ${pGroup(d.ne, g.ne).padStart(3)}` +
    `${r.isConfig7 ? '  ◄ default (mirror)' : ''}`
  );
}

// ── Eccentricity direction analysis across all configs (sweep all n per config) ──
console.log('');
console.log(`  ═══════════════════════════════════════════════════════════════`);
console.log(`  ECCENTRICITY DIRECTION CHECK (sweep all n per config)`);
console.log(`  Constraining only observationally resolvable planets:`);
console.log(`    ${CONSTRAINED_ECC_PLANETS.map(k => `${k} ${REQUIRED_ECC_DIR[k]}`).join(', ')}`);
console.log(`  (Venus/Jupiter/Uranus/Neptune trends flip sign across sub-windows;`);
console.log(`   Earth direction is derived from its own H/16 wobble geometry.)`);
console.log(`  ═══════════════════════════════════════════════════════════════`);

// Distribution of max ecc direction match per config
const eccMatchDist = {};
for (const r of deepResults) {
  const m = r.maxEccMatch;
  eccMatchDist[m] = (eccMatchDist[m] || 0) + 1;
}
console.log('');
console.log(`  Distribution of max ecc direction match (best n per config):`);
for (let m = ECC_TOTAL; m >= 0; m--) {
  if (eccMatchDist[m]) {
    console.log(`    ${m}/${ECC_TOTAL} match: ${eccMatchDist[m]} configs`);
  }
}

// Configs reaching perfect match across all constrained planets
const eccDirPerfect = deepResults.filter(r => r.maxEccMatch === ECC_TOTAL);
console.log('');
if (eccDirPerfect.length > 0) {
  console.log(`  ${eccDirPerfect.length} config(s) reach ${ECC_TOTAL}/${ECC_TOTAL} ecc direction match (at some n):`);
  for (const r of eccDirPerfect) {
    const d = r.dValues;
    const ns = r.bestEccAnchors.map(a => a.llPass ? `${a.n}(LL✓ Dir${a.dirCount}/7)` : `${a.n}(LL✗)`).join(', ');
    console.log(
      `    Scenario ${r.scenario}: d=[${d.me},${d.ve},${d.ma},${d.ju},${d.sa},${d.ur},${d.ne}]` +
      `${r.mirror ? ' (mirror)' : ''}${r.isConfig7 ? ' ◄ default' : ''}  viable n: ${ns}`
    );
  }
} else {
  console.log(`  No config reaches ${ECC_TOTAL}/${ECC_TOTAL} ecc direction match at any n.`);
  const best = Math.max(...deepResults.map(r => r.maxEccMatch));
  const topConfigs = deepResults.filter(r => r.maxEccMatch === best);
  console.log(`  Best: ${best}/${ECC_TOTAL} — ${topConfigs.length} config(s) achieve this.`);
  console.log(`  Top ${Math.min(10, topConfigs.length)} configs reaching ${best}/${ECC_TOTAL}:`);
  for (const r of topConfigs.slice(0, 10)) {
    const d = r.dValues;
    const ns = r.bestEccAnchors.map(a => a.llPass ? `${a.n}(LL✓ Dir${a.dirCount}/7)` : `${a.n}(LL✗)`).join(', ');
    // Identify which constrained planet fails (null ok = unconstrained, skip)
    const failingPlanets = Object.entries(r.bestEccAnchors[0].eccDirPerPlanet)
      .filter(([, v]) => v.ok === false).map(([k]) => k.substr(0, 2)).join(',');
    console.log(
      `    ${r.scenario} d=[${d.me},${d.ve},${d.ma},${d.ju},${d.sa},${d.ur},${d.ne}]` +
      `${r.mirror ? ' (mirror)' : ''}${r.isConfig7 ? ' ◄ default' : ''}  n:${ns}  fails:${failingPlanets}`
    );
  }
}

// Detailed sweep for default config
const defaultResult = deepResults.find(r => r.isConfig7);
if (defaultResult) {
  console.log('');
  console.log('  Default config: ecc direction match at each n:');
  for (const a of defaultResult.allAnchors) {
    const planetsList = planets.map(k => {
      const res = a.eccDirPerPlanet[k];
      const mark = res.ok === true ? '✓' : res.ok === false ? '✗' : '·';
      return `${k.substr(0,2)}:${res.phase.toFixed(0).padStart(3)}°${mark}`;
    }).join(' ');
    const ll = a.llPass ? 'LL✓' : 'LL✗';
    const dir = a.llPass ? ` Dir${a.dirCount}/7` : '';
    console.log(`    n=${a.n}: ${ll}${dir}  ecc=${a.eccDirMatch}/${ECC_TOTAL}  ${planetsList}`);
  }
}

// ── Detail for the best configs ──
const top5 = deepResults.filter(r => r.bestAnchor).slice(0, 5);
for (const r of top5) {
  const d = r.dValues;
  const ba = r.bestAnchor;
  console.log(`\n  ─── Detail: Scenario ${r.scenario} d=[${d.me},${d.ve},${d.ma},${d.ju},${d.sa},${d.ur},${d.ne}]` +
    ` ${r.mirror ? '(mirror)' : ''}${r.isConfig7 ? ' (default config)' : ''} ───`);
  console.log(`  Incl: ${r.inclBalance.toFixed(4)}%  Ecc: ${r.eccBalance.toFixed(4)}%  Anchor n=${ba.n}  Dir: ${ba.dirCount}/7  Total err: ${ba.totalErr.toFixed(1)}″`);
  console.log('  Planet   │ d  │ grp │ phase     │ mean     │ N    │ asc period    │ err     │ dir');
  console.log('  ─────────┼────┼─────┼───────────┼──────────┼──────┼───────────────┼─────────┼─────');
  for (const k of fittedPlanets) {
    const pp = ba.perPlanet[k];
    if (!pp) continue;
    const ascP = -(8 * C.H) / pp.N;
    const dv = r.dValues[k.slice(0, 2)];
    const gv = r.groups[k.slice(0, 2)];
    console.log(
      `  ${k.padEnd(8)} │ ${String(dv).padStart(2)} │ ${gv ? 'anti' : ' in '} │ ` +
      `${pp.phase.toFixed(1).padStart(7)}° │ ${pp.mean.toFixed(4).padStart(7)}° │ ` +
      `${String(pp.N).padStart(4)} │ ${ascP.toFixed(0).padStart(11)} yr │ ` +
      `${pp.errArcsec.toFixed(1).padStart(5)}″ │  ${pp.dirMatch ? '✓' : '✗'}`
    );
  }
}

// ── Write deep analysis to the output JSON ──
output.deepAnalysis = {
  eccThreshold: DEEP_ECC_THRESHOLD,
  nRange: [0, 7],
  nMaxAscNode: DEEP_N_MAX,
  candidateCount: deepResults.length,
  configs: deepResults.map(r => ({
    scenario: r.scenario,
    inclBalance: r.inclBalance,
    eccBalance: r.eccBalance,
    mirror: r.mirror,
    isConfig7: r.isConfig7,
    dValues: r.dValues,
    groups: r.groups,
    bestAnchor: r.bestAnchor ? {
      n: r.bestAnchor.n,
      balancedYear: BY_REF - r.bestAnchor.n * C.H,
      dirCount: r.bestAnchor.dirCount,
      totalErrArcsec: r.bestAnchor.totalErr,
      perPlanet: Object.fromEntries(
        fittedPlanets.map(k => {
          const pp = r.bestAnchor.perPlanet[k];
          return [k, pp ? {
            phase: parseFloat(pp.phase.toFixed(2)),
            mean: parseFloat(pp.mean.toFixed(5)),
            amp: parseFloat(pp.amp.toFixed(6)),
            N: pp.N,
            ascNodePeriod: parseFloat((-(8 * C.H) / pp.N).toFixed(0)),
            errArcsec: parseFloat(pp.errArcsec.toFixed(2)),
            dirMatch: pp.dirMatch,
          } : null];
        })
      ),
    } : null,
  })),
};

// ── Populate the presets array with deep survivors (extended row format) ──
// Only configs with a valid anchor (LL 8/8) are included. These replace the
// former 765-row "all passing incl threshold" list with a smaller, richer set
// that includes per-config optimized anchor, ascending nodes, and phase angles.
const DEEP_MAX_RATE_ERROR = 5.0;  // arcsec — max total rate error across 7 planets
const deepLLValidCount = deepResults.filter(r => r.bestAnchor).length;
const deepSurvivors = deepResults.filter(r =>
  r.bestAnchor && r.bestAnchor.totalErr <= DEEP_MAX_RATE_ERROR
);
output.presets = deepSurvivors.map(r => {
  const ba = r.bestAnchor;
  const pp = ba.perPlanet;
  const d = r.dValues;
  const g = r.groups;
  return [
    // Original 16 fields (same positions as before):
    r.scenario,
    parseFloat(r.inclBalance.toFixed(8)),
    d.me, g.me, d.ve, g.ve, d.ma, g.ma,
    d.ju, g.ju, d.sa, g.sa, d.ur, g.ur, d.ne, g.ne,
    // Extended deep-analysis fields (positions 16..34):
    parseFloat(r.eccBalance.toFixed(4)),          // [16] eccBalance
    ba.n,                                          // [17] anchor_n
    ba.dirCount,                                   // [18] dirCount
    parseFloat(ba.totalErr.toFixed(1)),            // [19] totalErr (arcsec)
    r.mirror ? 1 : 0,                             // [20] mirror
    // Per-planet ascending node integers (positions 21..27):
    pp.mercury.N, pp.venus.N, pp.mars.N, pp.jupiter.N,
    pp.saturn.N, pp.uranus.N, pp.neptune.N,
    // Per-planet optimized phase angles (positions 28..34):
    parseFloat(pp.mercury.phase.toFixed(2)),
    parseFloat(pp.venus.phase.toFixed(2)),
    parseFloat(pp.mars.phase.toFixed(2)),
    parseFloat(pp.jupiter.phase.toFixed(2)),
    parseFloat(pp.saturn.phase.toFixed(2)),
    parseFloat(pp.uranus.phase.toFixed(2)),
    parseFloat(pp.neptune.phase.toFixed(2)),
  ];
});
output.presetCount = deepSurvivors.length;
output.deepAnalysis.llValidCount = deepLLValidCount;
output.deepAnalysis.maxRateError = DEEP_MAX_RATE_ERROR;
output.deepAnalysis.survivorCount = deepSurvivors.length;

// Update currentConfig.rank to reflect the position in the deep survivors
// (sorted by ecc balance), not in the raw allConfigs (sorted by composite score).
const deepRankIdx = deepSurvivors.findIndex(r => r.isConfig7);
if (deepRankIdx >= 0) output.currentConfig.rank = deepRankIdx + 1;

// Re-write the output file with deep analysis + extended presets
fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
console.log(`\nWritten ${outputPath}: ${deepSurvivors.length} deep-analysis presets (was ${allConfigs.length} raw).`);
