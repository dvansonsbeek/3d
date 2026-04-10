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
    perPlanetPhase[p] = C.ASTRO_REFERENCE.earthInclinationPhaseAngle;
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
  perPlanetPhase[p] = C.planets[p].inclinationPhaseAngle;
}
// Earth's J2000 inclination (computed from mean + amplitude model)
inclJ2000.earth = C.earthInvPlaneInclinationMean +
  C.earthInvPlaneInclinationAmplitude * Math.cos(
    (C.ASTRO_REFERENCE.earthPerihelionLongitudeJ2000 - C.ASTRO_REFERENCE.earthInclinationPhaseAngle) * DEG2RAD);

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

// ── Balance computation (reproduces computeBalanceResults from script.js) ──
function computeBalance(config) {
  const planetResults = {};
  let allPass = true;

  for (const key of planets) {
    const d = config[key].d;
    const isAntiPhase = config[key].group === 'anti-phase';
    const phaseAngle = perPlanetPhase[key];
    const sqrtM = Math.sqrt(mass[key]);
    const amplitude = (d > 0) ? PSI / (d * sqrtM) : NaN;
    const cosPhaseJ2000 = Math.cos((periLongJ2000[key] - phaseAngle) * DEG2RAD);
    const mean = inclJ2000[key] - (isAntiPhase ? -1 : 1) * amplitude * cosPhaseJ2000;
    const rangeMin = mean - amplitude;
    const rangeMax = mean + amplitude;
    // LL bounds have uncertainty (~0.03° from mass uncertainties + secular theory truncation).
    // Treat anything within this tolerance as "within bounds".
    const LL_UNCERTAINTY = 0.03; // degrees
    const fitsLL = rangeMin >= llBounds[key].min - LL_UNCERTAINTY && rangeMax <= llBounds[key].max + LL_UNCERTAINTY;
    // LL overshoot: absolute degrees by which the model range exceeds LL bounds
    // 0 = fully within bounds. Compare against LL uncertainty (~0.03-0.05° typical)
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

  // Inclination balance (w = √(m·a·(1-e²)) / d × amplitude, but amplitude = PSI/(d×√m))
  let wPro = 0, wAnti = 0;
  for (const key of planets) {
    const w = Math.sqrt(mass[key] * orbitDistance[key] * (1 - eccBase[key] * eccBase[key])) / config[key].d;
    if (config[key].group !== 'anti-phase') wPro += w; else wAnti += w;
  }
  const inclBalance = (1 - Math.abs(wPro - wAnti) / (wPro + wAnti)) * 100;

  // Eccentricity balance (v = √m × a^1.5 × e_base / √d)
  let vPro = 0, vAnti = 0;
  for (const key of planets) {
    const v = Math.sqrt(mass[key]) * Math.pow(orbitDistance[key], 1.5) * eccBase[key] / Math.sqrt(config[key].d);
    if (config[key].group !== 'anti-phase') vPro += v; else vAnti += v;
  }
  const eccBalance = (1 - Math.abs(vPro - vAnti) / (vPro + vAnti)) * 100;

  // LL bounds: count passes and max overshoot (clamped by uncertainty)
  const LL_UNCERTAINTY = 0.03; // degrees — LL theory uncertainty
  const llPassCount = planets.filter(p => planetResults[p].fitsLL).length;
  const dirPassCount = planets.filter(p => planetResults[p].directionMatch).length;
  const maxLLOvershootRaw = Math.max(...planets.map(p => planetResults[p].llOvershootDeg));
  // Effective overshoot: anything within LL uncertainty is treated as 0
  const maxLLOvershoot = Math.max(0, maxLLOvershootRaw - LL_UNCERTAINTY);

  return { inclBalance, eccBalance, llPassCount, dirPassCount, maxLLOvershoot, maxLLOvershootRaw, allPass, planetResults };
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
console.log(`  Eccentricity balance: ${curResult.eccBalance.toFixed(4)}%`);
console.log(`  LL bounds pass: ${curResult.llPassCount}/8`);
console.log(`  Direction pass: ${curResult.dirPassCount}/8`);
console.log(`  All LL+Dir pass: ${curResult.allPass}`);

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

                      const result = computeBalance(config);

                      if (result.inclBalance >= THRESHOLD) {
                        count++;
                        const g = (grp) => grp === 'in-phase' ? 0 : 1;
                        allConfigs.push({
                          scenario: scenario.name,
                          inclBalance: result.inclBalance,
                          eccBalance: result.eccBalance,
                          llPassCount: result.llPassCount,
                          dirPassCount: result.dirPassCount,
                          maxLLOvershoot: result.maxLLOvershoot,
                          allPass: result.allPass,
                          // Composite score: lower LL overshoot is better (0°=perfect),
                          // then eccentricity balance, then inclination as tiebreaker.
                          // Max overshoot capped at 1° for scoring. Configs within ~0.03° of
                          // LL bounds are effectively equivalent (LL uncertainty).
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
  console.log(`\nConfig #1 rank: ${curIdx + 1}/${allConfigs.length} (score: ${c.score.toFixed(1)}, incl: ${c.inclBalance.toFixed(4)}%, ecc: ${c.eccBalance.toFixed(4)}%, LL max overshoot: ${c.maxLLOvershoot.toFixed(3)}°)`);
}

// ══════════════════════════════════════════════════════════════════
// WRITE OUTPUT FILE
// ══════════════════════════════════════════════════════════════════

const outputDir = path.join(__dirname, '..', '..', 'data');
const outputPath = path.join(outputDir, 'balance-presets.json');

const output = {
  generated: new Date().toISOString(),
  threshold: THRESHOLD,
  count: allConfigs.length,
  scenarios: {
    A: 'Ju=5, Sa=3',
    B: 'Ju=8, Sa=5',
    C: 'Ju=13, Sa=8',
    D: 'Ju=21, Sa=13',
  },
  format: ['scenario','balance','me_d','me_phase','ve_d','ve_phase','ma_d','ma_phase','ju_d','ju_phase','sa_d','sa_phase','ur_d','ur_phase','ne_d','ne_phase'],
  phaseAngles: ['in-phase', 'anti-phase'],
  presets: allConfigs.map(c => c.row),
};

fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
console.log(`\nWritten ${allConfigs.length} presets to ${outputPath}`);
