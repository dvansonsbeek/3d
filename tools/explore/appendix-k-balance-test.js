// ═══════════════════════════════════════════════════════════════
// Balance search TEST copy — for experimentation
// Based on appendix-k-balance-search.js but does NOT write output files
//
// Usage: node docs/appendix-k-balance-test.js
// ═══════════════════════════════════════════════════════════════

// ── Step 1: Reproduce the exact computation chain from script.js ──

const holisticyearLength = 335008;
const inputmeanlengthsolaryearindays = 365.2421897;
const meansolaryearlengthinDays = Math.round(inputmeanlengthsolaryearindays * (holisticyearLength / 16)) / (holisticyearLength / 16);

// SolarYearInput values (orbital periods in days)
const solarYearInputs = {
  mercury: 87.9686, venus: 224.695, mars: 686.931,
  jupiter: 4330.50, saturn: 10747.0, uranus: 30586, neptune: 59980,
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
const meansiderealyearlengthinSeconds = 31558149.8;
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

// Earth mass — Moon-based derivation with solar/sidereal day correction
const moonDistance = 384399.07;
const moonSiderealMonthInput = 27.32166156;
const moonSiderealMonth = (holisticyearLength * meansolaryearlengthinDays) /
  Math.ceil((holisticyearLength * meansolaryearlengthinDays) / moonSiderealMonthInput - 0);
const MASS_RATIO_EARTH_MOON = 81.3007;
const GM_EARTH_MOON_SYSTEM = (4 * Math.PI * Math.PI * Math.pow(moonDistance, 3)) /
  Math.pow(moonSiderealMonth * meanlengthofday, 2);
const meanSiderealday = (meansolaryearlengthinDays / (meansolaryearlengthinDays + 1)) * meanlengthofday;
const SOLAR_SIDEREAL_DAY_RATIO = meanlengthofday / meanSiderealday;
const GM_EARTH = GM_EARTH_MOON_SYSTEM * (MASS_RATIO_EARTH_MOON / (MASS_RATIO_EARTH_MOON + 1)) *
  SOLAR_SIDEREAL_DAY_RATIO;
const M_EARTH = GM_EARTH / G_CONSTANT;
mass.earth = M_EARTH / M_SUN;

// Eccentricities (JPL J2000)
const eccJPL = {
  mercury: 0.20563593, venus: 0.00677672, earth: 0.01671, mars: 0.09339410,
  jupiter: 0.04838624, saturn: 0.05386179, uranus: 0.04725744, neptune: 0.00859048,
};

// RealOrbitalEccentricity = e / (1 + e) — circular orbit model eccentricity
const eccReal = {};
for (const [k, e] of Object.entries(eccJPL)) {
  eccReal[k] = e / (1 + e);
}

// Invariable plane inclinations J2000
const inclJ2000 = {
  mercury: 6.3472858, venus: 2.1545441, mars: 1.6311858,
  jupiter: 0.3219652, saturn: 0.9254704, uranus: 0.9946692, neptune: 0.7354155,
};
// Earth's J2000 inclination (computed from mean + amplitude model)
const earthInvPlaneInclinationAmplitude = 0.635956;
const earthInvPlaneInclinationMean = 1.481180;
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
    modCounts[k] = Math.round((holisticyearLength * meansolaryearlengthinDays) / v);
  }
  const modOD = { earth: 1.0 };
  for (const [k, c] of Object.entries(modCounts)) {
    modOD[k] = Math.pow(Math.pow(holisticyearLength / c, 2), 1/3);
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
    const newCount = Math.round((holisticyearLength * meansolaryearlengthinDays) / newSYI);
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

for (const planet of Object.keys(massRatios)) {
  const baseRatio = massRatios[planet];
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
