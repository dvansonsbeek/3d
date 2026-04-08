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
    const fitsLL = rangeMin >= llBounds[key].min - 0.01 && rangeMax <= llBounds[key].max + 0.01;

    let directionMatch = true;
    if (key !== 'earth') {
      const i1900 = fbeCalcApparentIncl(1900, key, mean, amplitude, icrfPeriod[key], periLongJ2000[key], phaseAngle, isAntiPhase);
      const i2100 = fbeCalcApparentIncl(2100, key, mean, amplitude, icrfPeriod[key], periLongJ2000[key], phaseAngle, isAntiPhase);
      const trend = (i2100 - i1900) / 2;
      directionMatch = (trendJPL[key] >= 0) === (trend >= 0);
    }

    if (!fitsLL || !directionMatch) allPass = false;
    planetResults[key] = { amplitude, mean, rangeMin, rangeMax, fitsLL, directionMatch };
  }

  // Scalar balance (in-phase vs anti-phase)
  let sumPro = 0, sumAnti = 0;
  for (const key of planets) {
    const cfg_mass = mass[key];
    const cfg_sma = orbitDistance[key];
    const cfg_ecc = eccBase[key];
    const L = cfg_mass * Math.sqrt(cfg_sma * (1 - cfg_ecc * cfg_ecc));
    const w = L * planetResults[key].amplitude;
    if (config[key].group !== 'anti-phase') sumPro += w;
    else sumAnti += w;
  }
  const totalLamp = sumPro + sumAnti;
  const balanceResidual = Math.abs(sumPro - sumAnti);
  const imbalance = totalLamp > 0 ? (balanceResidual / totalLamp) * 100 : 0;
  const balance = 100 - imbalance;

  return { balance, imbalance, allPass, planetResults };
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
console.log(`\nCurrent config balance: ${curResult.balance.toFixed(4)}%`);
console.log(`All LL+Dir pass: ${curResult.allPass}`);

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

                      if (result.balance >= THRESHOLD) {
                        count++;
                        const g = (grp) => grp === 'in-phase' ? 0 : 1;
                        allConfigs.push({
                          scenario: scenario.name,
                          balance: result.balance,
                          allPass: result.allPass,
                          failCount: planets.filter(pl =>
                            !result.planetResults[pl].fitsLL || !result.planetResults[pl].directionMatch
                          ).length,
                          row: [
                            scenario.name,
                            parseFloat(result.balance.toFixed(8)),
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

// Sort by balance descending
allConfigs.sort((a, b) => b.balance - a.balance);

console.log(`\nTotal: ${allConfigs.length} configs >= ${THRESHOLD}%`);
console.log(`All pass LL+Dir: ${allConfigs.filter(c => c.allPass).length}`);

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
