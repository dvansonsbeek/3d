// ═══════════════════════════════════════════════════════════════
// Exhaustive balance search using EXACT values from script.js
// Reproduces the full computation chain: HY → SolarYearCount → OrbitDistance → mass → L → w
//
// Usage: node docs/87-balance-search.js
// Output: public/input/balance-presets.json (sorted best to worst)
// ═══════════════════════════════════════════════════════════════

const fs = require('fs');
const path = require('path');
const C = require('../tools/lib/constants');

// ── Import computation chain from constants.js ──
const mass = C.massFraction;
const PSI = C.PSI;
const DEG2RAD = Math.PI / 180;

// Build lookup tables from per-planet data
const planets = ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'];
const orbitDistance = { earth: 1.0 };
const ecc = { earth: C.eccJ2000.earth };
const inclJ2000 = {};
const omegaJ2000 = {};
const period = {};
for (const p of planets) {
  if (p === 'earth') {
    omegaJ2000[p] = C.ASTRO_REFERENCE.earthAscendingNodeInvPlane;
    period[p] = C.H / 3;
    continue;
  }
  orbitDistance[p] = C.derived[p].orbitDistance;
  ecc[p] = C.planets[p].orbitalEccentricity;
  inclJ2000[p] = C.planets[p].invPlaneInclinationJ2000;
  omegaJ2000[p] = C.planets[p].ascendingNodeInvPlane;
  period[p] = C.planets[p].perihelionEclipticYears;
}
// Earth's J2000 inclination (computed from mean + amplitude model)
inclJ2000.earth = C.earthInvPlaneInclinationMean +
  C.earthInvPlaneInclinationAmplitude * Math.cos(
    (C.ASTRO_REFERENCE.earthAscendingNodeInvPlane - C.ASTRO_REFERENCE.earthInclinationPhaseAngle) * DEG2RAD);

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
function fbeCalcApparentIncl(year, planetMean, planetAmplitude, planetPeriod, planetOmegaJ2000, planetPhaseAngle) {
  const planetOmega = planetOmegaJ2000 + (360 / planetPeriod) * (year - 2000);
  const planetPhase = (planetOmega - planetPhaseAngle) * DEG2RAD;
  const planetI = (planetMean + planetAmplitude * Math.cos(planetPhase)) * DEG2RAD;
  const planetOmegaRad = planetOmega * DEG2RAD;

  const earthPeriod = C.H / 3;
  const earthCosPhase0 = (inclJ2000.earth - C.earthInvPlaneInclinationMean) / C.earthInvPlaneInclinationAmplitude;
  const earthPhase0 = Math.acos(earthCosPhase0);
  const earthPhase = earthPhase0 + 2 * Math.PI * (year - 2000) / earthPeriod;
  const earthI = (C.earthInvPlaneInclinationMean + C.earthInvPlaneInclinationAmplitude * Math.cos(earthPhase)) * DEG2RAD;
  const earthOmega = (C.ASTRO_REFERENCE.earthAscendingNodeInvPlane + (360 / earthPeriod) * (year - 2000)) * DEG2RAD;

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
    const phaseAngle = config[key].phase;
    const sqrtM = Math.sqrt(mass[key]);
    const amplitude = (d > 0) ? PSI / (d * sqrtM) : NaN;
    const cosPhaseJ2000 = Math.cos((omegaJ2000[key] - phaseAngle) * DEG2RAD);
    const mean = inclJ2000[key] - amplitude * cosPhaseJ2000;
    const rangeMin = mean - amplitude;
    const rangeMax = mean + amplitude;
    const fitsLL = rangeMin >= llBounds[key].min - 0.01 && rangeMax <= llBounds[key].max + 0.01;

    let directionMatch = true;
    if (key !== 'earth') {
      const i1900 = fbeCalcApparentIncl(1900, mean, amplitude, period[key], omegaJ2000[key], phaseAngle);
      const i2100 = fbeCalcApparentIncl(2100, mean, amplitude, period[key], omegaJ2000[key], phaseAngle);
      const trend = (i2100 - i1900) / 2;
      directionMatch = (trendJPL[key] >= 0) === (trend >= 0);
    }

    if (!fitsLL || !directionMatch) allPass = false;
    planetResults[key] = { amplitude, mean, rangeMin, rangeMax, fitsLL, directionMatch };
  }

  // Vector balance (identical to computeBalanceResults in script.js)
  let balanceCos = 0, balanceSin = 0, totalLamp = 0;
  for (const key of planets) {
    const cfg_mass = mass[key];
    const cfg_sma = orbitDistance[key];
    const cfg_ecc = ecc[key];
    const L = cfg_mass * Math.sqrt(cfg_sma * (1 - cfg_ecc * cfg_ecc));
    const Lamp = L * planetResults[key].amplitude;
    const phaseRad = config[key].phase * DEG2RAD;
    balanceCos += Lamp * Math.cos(phaseRad);
    balanceSin += Lamp * Math.sin(phaseRad);
    totalLamp += Lamp;
  }
  const balanceResidual = Math.sqrt(balanceCos * balanceCos + balanceSin * balanceSin);
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
console.log('Planet      SMA (code)       Mass (M/M_SUN)     Ecc');
for (const p of planets) {
  console.log(`${p.padEnd(10)} ${orbitDistance[p].toFixed(8).padStart(14)} ${mass[p].toExponential(8).padStart(18)} ${ecc[p].toFixed(8)}`);
}

const currentConfig = {
  mercury: { d: 21, phase: 203.3195 }, venus: { d: 34, phase: 203.3195 },
  earth: { d: 3, phase: 203.3195 }, mars: { d: 5, phase: 203.3195 },
  jupiter: { d: 5, phase: 203.3195 }, saturn: { d: 3, phase: 23.3195 },
  uranus: { d: 21, phase: 203.3195 }, neptune: { d: 34, phase: 203.3195 },
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
const phases = [203.3195, 23.3195];

const scenarios = [
  { name: 'A', jupiter: { d: 5, phase: 203.3195 }, saturn: { d: 3, phase: 23.3195 } },
  { name: 'B', jupiter: { d: 8, phase: 203.3195 }, saturn: { d: 5, phase: 23.3195 } },
  { name: 'C', jupiter: { d: 13, phase: 203.3195 }, saturn: { d: 8, phase: 23.3195 } },
  { name: 'D', jupiter: { d: 21, phase: 203.3195 }, saturn: { d: 13, phase: 23.3195 } },
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
                        mercury: { d: fibNumbers[mi], phase: phases[mp] },
                        venus: { d: fibNumbers[vi], phase: phases[vp] },
                        earth: { d: 3, phase: 203.3195 },
                        mars: { d: fibNumbers[mai], phase: phases[map] },
                        jupiter: scenario.jupiter,
                        saturn: scenario.saturn,
                        uranus: { d: fibNumbers[ui], phase: phases[up] },
                        neptune: { d: fibNumbers[ni], phase: phases[np] },
                      };

                      const result = computeBalance(config);

                      if (result.balance >= THRESHOLD) {
                        count++;
                        const p = (phase) => Math.abs(phase - 203.3195) < 1 ? 0 : 1;
                        allConfigs.push({
                          scenario: scenario.name,
                          balance: result.balance,
                          allPass: result.allPass,
                          failCount: planets.filter(pl =>
                            !result.planetResults[pl].fitsLL || !result.planetResults[pl].directionMatch
                          ).length,
                          row: [
                            scenario.name,
                            parseFloat(result.balance.toFixed(6)),
                            config.mercury.d, p(config.mercury.phase),
                            config.venus.d, p(config.venus.phase),
                            config.mars.d, p(config.mars.phase),
                            config.jupiter.d, p(config.jupiter.phase),
                            config.saturn.d, p(config.saturn.phase),
                            config.uranus.d, p(config.uranus.phase),
                            config.neptune.d, p(config.neptune.phase),
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

const outputDir = path.join(__dirname, '..', 'public', 'input');
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
  phaseAngles: [203.3195, 23.3195],
  presets: allConfigs.map(c => c.row),
};

fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
console.log(`\nWritten ${allConfigs.length} presets to ${outputPath}`);
