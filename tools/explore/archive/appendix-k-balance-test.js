// ═══════════════════════════════════════════════════════════════
// Balance search TEST copy — for experimentation
// Based on 87-balance-search.js but does NOT write output files
//
// Usage: node docs/87-balance-search.js
// ═══════════════════════════════════════════════════════════════

const C = require('../lib/constants');

// ── Import computation chain from constants.js ──
const mass = C.massFraction;
const PSI = C.PSI;
const DEG2RAD = Math.PI / 180;

// Build lookup tables from per-planet data
const planets = ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'];
const solarYearInputs = {};
const solarYearCounts = {};
const orbitDistance = { earth: 1.0 };
const eccJPL = { earth: 0.01671 };
const inclJ2000 = {};
const omegaJ2000 = {};
const period = {};
for (const p of planets) {
  if (p === 'earth') {
    omegaJ2000[p] = C.ASTRO_REFERENCE.earthAscendingNodeInvPlane;
    period[p] = C.H / 3;
    continue;
  }
  solarYearInputs[p] = C.planets[p].solarYearInput;
  solarYearCounts[p] = C.derived[p].solarYearCount;
  orbitDistance[p] = C.derived[p].orbitDistance;
  eccJPL[p] = C.planets[p].orbitalEccentricity;
  inclJ2000[p] = C.planets[p].invPlaneInclinationJ2000;
  omegaJ2000[p] = C.planets[p].ascendingNodeInvPlane;
  period[p] = C.planets[p].perihelionEclipticYears;
}
// Earth's J2000 inclination (computed from mean + amplitude model)
inclJ2000.earth = C.earthInvPlaneInclinationMean +
  C.earthInvPlaneInclinationAmplitude * Math.cos(
    (C.ASTRO_REFERENCE.earthAscendingNodeInvPlane - C.ASTRO_REFERENCE.earthInclinationPhaseAngle) * DEG2RAD);

// RealOrbitalEccentricity = e / (1 + e) — circular orbit model eccentricity
const eccReal = {};
for (const [k, e] of Object.entries(eccJPL)) {
  eccReal[k] = e / (1 + e);
}

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

// ── Balance computation ──
function computeBalance(config, ecc) {
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

  // Vector balance
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
// SENSITIVITY ANALYSIS: Which inputs have most leverage on Config #32 balance?
// ══════════════════════════════════════════════════════════════════

const currentConfig = {
  mercury: { d: 21, phase: 203.3195 }, venus: { d: 34, phase: 203.3195 },
  earth: { d: 3, phase: 203.3195 }, mars: { d: 5, phase: 203.3195 },
  jupiter: { d: 5, phase: 203.3195 }, saturn: { d: 3, phase: 23.3195 },
  uranus: { d: 21, phase: 203.3195 }, neptune: { d: 34, phase: 203.3195 },
};

const baseline = computeBalance(currentConfig, eccJPL);
console.log('═══════════════════════════════════════════════════════════════');
console.log('SENSITIVITY ANALYSIS FOR CONFIG #32');
console.log('═══════════════════════════════════════════════════════════════');
console.log(`Baseline balance: ${baseline.balance.toFixed(8)}%  (imbalance: ${baseline.imbalance.toExponential(6)}%)`);

// ── Per-planet weight decomposition ──
console.log('\n── Per-planet balance weights ──');
console.log('Planet      mass(M/Msun)   SMA          ecc         w=√(m·a(1-e²))/d   L·amp          phase');
for (const key of planets) {
  const cfg_mass = mass[key];
  const cfg_sma = orbitDistance[key];
  const cfg_ecc = eccJPL[key];
  const d = currentConfig[key].d;
  const sqrtM = Math.sqrt(cfg_mass);
  const amplitude = PSI / (d * sqrtM);
  const L = cfg_mass * Math.sqrt(cfg_sma * (1 - cfg_ecc * cfg_ecc));
  const Lamp = L * amplitude;
  const w = Math.sqrt(cfg_mass * cfg_sma * (1 - cfg_ecc * cfg_ecc)) / d;
  const ph = currentConfig[key].phase > 180 ? '203°' : ' 23°';
  console.log(`${key.padEnd(10)} ${cfg_mass.toExponential(6).padStart(13)} ${cfg_sma.toFixed(8).padStart(12)} ${cfg_ecc.toFixed(8)} ${w.toExponential(6).padStart(19)} ${Lamp.toExponential(6).padStart(14)}  ${ph}`);
}

// ── 1. SolarYearInput sensitivity ──
console.log('\n═══════════════════════════════════════════════════════════════');
console.log('1. SOLAR YEAR INPUT SENSITIVITY');
console.log('═══════════════════════════════════════════════════════════════');
console.log('Tweaking each SolarYearInput by small amounts to see effect on balance.\n');

// Helper: recompute everything with modified SolarYearInput for one planet
function balanceWithModifiedSYI(planet, newSYI) {
  const modifiedInputs = { ...solarYearInputs, [planet]: newSYI };
  const modCounts = {};
  for (const [k, v] of Object.entries(modifiedInputs)) {
    modCounts[k] = Math.round((C.totalDaysInH) / v);
  }
  const modOD = { earth: 1.0 };
  for (const [k, c] of Object.entries(modCounts)) {
    modOD[k] = Math.pow(Math.pow(C.H / c, 2), 1/3);
  }
  // Temporarily swap orbitDistance
  const savedOD = {};
  for (const k of Object.keys(modOD)) savedOD[k] = orbitDistance[k];
  for (const k of Object.keys(modOD)) orbitDistance[k] = modOD[k];
  const result = computeBalance(currentConfig, eccJPL);
  for (const k of Object.keys(savedOD)) orbitDistance[k] = savedOD[k];
  return { balance: result.balance, count: modCounts[planet], sma: modOD[planet] };
}

for (const planet of Object.keys(solarYearInputs)) {
  const base = solarYearInputs[planet];
  const baseCount = solarYearCounts[planet];
  console.log(`${planet.toUpperCase()} (current: ${base} days, count: ${baseCount}, SMA: ${orbitDistance[planet].toFixed(8)})`);

  // Scan a range of small perturbations
  const steps = [];
  // Find range where count changes
  for (let delta = -0.5; delta <= 0.5; delta += 0.001) {
    const newSYI = base + delta;
    const newCount = Math.round((C.totalDaysInH) / newSYI);
    if (newCount !== baseCount) {
      steps.push({ delta, newSYI, newCount });
    }
  }

  // Also test fine perturbations that don't change count (continuous SMA effect)
  const testDeltas = [-0.1, -0.05, -0.01, -0.005, -0.001, 0.001, 0.005, 0.01, 0.05, 0.1];
  for (const delta of testDeltas) {
    const r = balanceWithModifiedSYI(planet, base + delta);
    const improved = r.balance > baseline.balance;
    if (Math.abs(r.balance - baseline.balance) > 1e-8) {
      // Only show if there's a meaningful change
    }
  }

  // Find nearest count transitions
  const transitions = new Map();
  for (const s of steps) {
    if (!transitions.has(s.newCount)) transitions.set(s.newCount, s);
  }

  // Test each count transition + fine scan around it
  let bestForPlanet = { balance: baseline.balance, delta: 0, syi: base };
  for (const [count, s] of transitions) {
    const r = balanceWithModifiedSYI(planet, s.newSYI);
    if (r.balance > bestForPlanet.balance) {
      bestForPlanet = { balance: r.balance, delta: s.delta, syi: s.newSYI, count: r.count };
    }
  }

  // Fine scan: continuous SMA changes without count flip
  for (let delta = -0.2; delta <= 0.2; delta += 0.0001) {
    const r = balanceWithModifiedSYI(planet, base + delta);
    if (r.balance > bestForPlanet.balance) {
      bestForPlanet = { balance: r.balance, delta, syi: +(base + delta).toFixed(4), count: r.count };
    }
  }

  const improvement = bestForPlanet.balance - baseline.balance;
  console.log(`  Best: SYI=${bestForPlanet.syi} (delta=${bestForPlanet.delta > 0 ? '+' : ''}${bestForPlanet.delta.toFixed(4)}) → balance=${bestForPlanet.balance.toFixed(8)}% (${improvement > 0 ? '+' : ''}${improvement.toExponential(4)}%)`);
  console.log('');
}

// ── 2. Eccentricity sensitivity ──
console.log('═══════════════════════════════════════════════════════════════');
console.log('2. ECCENTRICITY SENSITIVITY');
console.log('═══════════════════════════════════════════════════════════════');
console.log('Tweaking each eccentricity to find value that maximizes balance.\n');

for (const planet of planets) {
  const baseEcc = eccJPL[planet];
  let bestEcc = baseEcc, bestBal = baseline.balance;

  // Scan ±50% of eccentricity in fine steps
  const minE = Math.max(0.0001, baseEcc * 0.5);
  const maxE = baseEcc * 1.5;
  const step = (maxE - minE) / 10000;

  for (let e = minE; e <= maxE; e += step) {
    const modEcc = { ...eccJPL, [planet]: e };
    const r = computeBalance(currentConfig, modEcc);
    if (r.balance > bestBal) {
      bestBal = r.balance;
      bestEcc = e;
    }
  }

  const improvement = bestBal - baseline.balance;
  const pctChange = ((bestEcc - baseEcc) / baseEcc * 100).toFixed(3);
  console.log(`${planet.padEnd(10)} current=${baseEcc.toFixed(8)}  best=${bestEcc.toFixed(8)} (${pctChange}%)  → balance=${bestBal.toFixed(8)}% (${improvement > 0 ? '+' : ''}${improvement.toExponential(4)}%)`);
}

// ── 3. Mass ratio sensitivity ──
console.log('\n═══════════════════════════════════════════════════════════════');
console.log('3. MASS RATIO SENSITIVITY');
console.log('═══════════════════════════════════════════════════════════════');
console.log('Tweaking each mass ratio to find value that maximizes balance.\n');

for (const planet of Object.keys(C.massRatioDE440)) {
  const baseRatio = C.massRatioDE440[planet];
  const baseMass = mass[planet];
  let bestRatio = baseRatio, bestBal = baseline.balance;

  // Scan ±1% of mass ratio
  const minR = baseRatio * 0.99;
  const maxR = baseRatio * 1.01;
  const step = (maxR - minR) / 10000;

  for (let r = minR; r <= maxR; r += step) {
    const savedMass = mass[planet];
    mass[planet] = 1 / r;  // mass = 1/ratio (simplified, see earlier verification)
    const result = computeBalance(currentConfig, eccJPL);
    mass[planet] = savedMass;
    if (result.balance > bestBal) {
      bestBal = result.balance;
      bestRatio = r;
    }
  }

  const improvement = bestBal - baseline.balance;
  const pctChange = ((bestRatio - baseRatio) / baseRatio * 100).toFixed(4);
  console.log(`${planet.padEnd(10)} current=${baseRatio.toFixed(4).padStart(14)}  best=${bestRatio.toFixed(4).padStart(14)} (${pctChange}%)  → ${improvement > 0 ? '+' : ''}${improvement.toExponential(4)}%`);
}

// ── 4. Combined: which single parameter gives the most improvement? ──
console.log('\n═══════════════════════════════════════════════════════════════');
console.log('4. RANKING: BIGGEST LEVERAGE ON CONFIG #32 BALANCE');
console.log('═══════════════════════════════════════════════════════════════');
console.log('(Run the numbers above and compare the improvement magnitudes)');
