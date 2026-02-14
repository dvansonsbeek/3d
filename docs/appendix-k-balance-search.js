// ═══════════════════════════════════════════════════════════════
// Exhaustive balance search using EXACT values from script.js
// Reproduces the full computation chain: HY → SolarYearCount → OrbitDistance → mass → L → w
//
// Usage: node docs/appendix-k-balance-search.js
// Output: public/input/balance-presets.json (sorted best to worst)
// ═══════════════════════════════════════════════════════════════

const fs = require('fs');
const path = require('path');

// ── Step 1: Reproduce the exact computation chain from script.js ──

const holisticyearLength = 333888;
const inputmeanlengthsolaryearindays = 365.2421897;
const meansolaryearlengthinDays = Math.round(inputmeanlengthsolaryearindays * (holisticyearLength / 16)) / (holisticyearLength / 16);

// SolarYearInput values (orbital periods in days)
const solarYearInputs = {
  mercury: 87.96845, venus: 224.6965, mars: 686.934,
  jupiter: 4330.595, saturn: 10746.6, uranus: 30583, neptune: 59896,
};

// SolarYearCount = Math.round(HY * meansolaryear / input)
const solarYearCounts = {};
for (const [k, v] of Object.entries(solarYearInputs)) {
  solarYearCounts[k] = Math.round((holisticyearLength * meansolaryearlengthinDays) / v);
}

// OrbitDistance = ((HY/count)^2)^(1/3) — Kepler's 3rd law
const orbitDistance = { earth: 1.0 };
for (const [k, c] of Object.entries(solarYearCounts)) {
  orbitDistance[k] = Math.pow(Math.pow(holisticyearLength / c, 2), 1/3);
}

// ── Mass computation chain ──
const meansiderealyearlengthinSeconds = 31558149.724;
const currentAUDistance = 149597870.698828;
const meansiderealyearlengthinDays = meansolaryearlengthinDays * (holisticyearLength/13) / ((holisticyearLength/13) - 1);
const meanlengthofday = meansiderealyearlengthinSeconds / meansiderealyearlengthinDays;
const speedofSuninKM = (currentAUDistance * 2 * Math.PI) / (meansiderealyearlengthinSeconds / 60 / 60);
const meanAUDistance = (meansiderealyearlengthinSeconds / 60 / 60 * speedofSuninKM) / (2 * Math.PI);
const GM_SUN = (4 * Math.PI * Math.PI * Math.pow(meanAUDistance, 3)) / Math.pow(meansiderealyearlengthinSeconds, 2);
const G_CONSTANT = 6.6743e-20;
const M_SUN = GM_SUN / G_CONSTANT;

// Planet masses from DE440 ratios (these are EXACT for non-Earth planets)
const massRatios = {
  mercury: 6023625.5, venus: 408523.72, mars: 3098703.59,
  jupiter: 1047.348625, saturn: 3497.9018, uranus: 22902.944, neptune: 19412.237,
};
const mass = {}; // M_planet / M_SUN
for (const [k, ratio] of Object.entries(massRatios)) {
  const GM_planet = GM_SUN / ratio;
  const M_planet = GM_planet / G_CONSTANT;
  mass[k] = M_planet / M_SUN;
}

// Earth mass — complex Moon-based derivation
const moonDistance = 384399.07;
const moonSiderealMonthInput = 27.32166156;
const moonSiderealMonth = (holisticyearLength * meansolaryearlengthinDays) /
  Math.ceil((holisticyearLength * meansolaryearlengthinDays) / moonSiderealMonthInput - 0);
const moonAtApogee = 405400;
const MASS_RATIO_EARTH_MOON = 81.3007;
const GM_EARTH_MOON_SYSTEM = (4 * Math.PI * Math.PI * Math.pow(moonDistance, 3)) /
  Math.pow(moonSiderealMonth * meanlengthofday, 2);
const GM_EARTH = GM_EARTH_MOON_SYSTEM * (MASS_RATIO_EARTH_MOON / (MASS_RATIO_EARTH_MOON + 1)) /
  (1 - moonAtApogee / meanAUDistance);
const M_EARTH = GM_EARTH / G_CONSTANT;
mass.earth = M_EARTH / M_SUN;

// Eccentricities (JPL J2000 — same in code and script)
const ecc = {
  mercury: 0.20563593, venus: 0.00677672, earth: 0.01671, mars: 0.09339410,
  jupiter: 0.04838624, saturn: 0.05386179, uranus: 0.04725744, neptune: 0.00859048,
};

// Invariable plane inclinations J2000
const inclJ2000 = {
  mercury: 6.3472858, venus: 2.1545441, mars: 1.6311858,
  jupiter: 0.3219652, saturn: 0.9254704, uranus: 0.9946692, neptune: 0.7354155,
};
// Earth's J2000 inclination (computed from mean + amplitude model)
const earthInvPlaneInclinationAmplitude = 0.633849;
const earthInvPlaneInclinationMean = 1.481592;
const earthAscNodeInvPlane = 284.51;
const earthPhaseAngle = 203.3195;
const DEG2RAD = Math.PI / 180;
inclJ2000.earth = earthInvPlaneInclinationMean +
  earthInvPlaneInclinationAmplitude * Math.cos((earthAscNodeInvPlane - earthPhaseAngle) * DEG2RAD);

// Ascending nodes (Souami & Souchay 2012)
const omegaJ2000 = {
  mercury: 32.83, venus: 54.70, earth: 284.51, mars: 354.87,
  jupiter: 312.89, saturn: 118.81, uranus: 307.80, neptune: 192.04,
};

// Perihelion precession periods (years)
const period = {
  mercury: holisticyearLength / (1 + 3/8),
  venus: holisticyearLength * 2,
  earth: holisticyearLength / 3,
  mars: holisticyearLength / (4 + 1/3),
  jupiter: holisticyearLength / 5,
  saturn: -holisticyearLength / 8,
  uranus: holisticyearLength / 3,
  neptune: holisticyearLength * 2,
};

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

// PSI constant
const PSI = 2205 / (2 * holisticyearLength);

const planets = ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'];

// ── Reproduce fbeCalcApparentIncl from script.js ──
function fbeCalcApparentIncl(year, planetMean, planetAmplitude, planetPeriod, planetOmegaJ2000, planetPhaseAngle) {
  const planetOmega = planetOmegaJ2000 + (360 / planetPeriod) * (year - 2000);
  const planetPhase = (planetOmega - planetPhaseAngle) * DEG2RAD;
  const planetI = (planetMean + planetAmplitude * Math.cos(planetPhase)) * DEG2RAD;
  const planetOmegaRad = planetOmega * DEG2RAD;

  const earthPeriod = holisticyearLength / 3;
  const earthCosPhase0 = (inclJ2000.earth - earthInvPlaneInclinationMean) / earthInvPlaneInclinationAmplitude;
  const earthPhase0 = Math.acos(earthCosPhase0);
  const earthPhase = earthPhase0 + 2 * Math.PI * (year - 2000) / earthPeriod;
  const earthI = (earthInvPlaneInclinationMean + earthInvPlaneInclinationAmplitude * Math.cos(earthPhase)) * DEG2RAD;
  const earthOmega = (earthAscNodeInvPlane + (360 / earthPeriod) * (year - 2000)) * DEG2RAD;

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
