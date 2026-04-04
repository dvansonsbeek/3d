// ═══════════════════════════════════════════════════════════════
// Appendix M (89) — Configuration Space Analysis
//
// Exhaustive analysis of all 7,558,272 Fibonacci divisor configurations.
// Computes the intersection counts for four independent filters:
//   1. Balance ≥ 99.994% (TNO margin)
//   2. Mirror symmetry (inner/outer d-values match across asteroid belt)
//   3. Saturn-solo (Saturn is the only anti-phase planet)
//   4. LL bounds (all planets within Laplace-Lagrange secular theory bounds)
//
// Reproduces the exact computation chain from script.js / Appendix K (87).
//
// Usage: node tools/verify/configuration-analysis.js
// ═══════════════════════════════════════════════════════════════

const C = require('../lib/constants');

// ── Import computation chain from constants.js ──
const mass = C.massFraction;
const PSI = C.PSI;
const DEG2RAD = Math.PI / 180;

// Build lookup tables from per-planet data
const planets = ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'];
const orbitDistance = { earth: 1.0 };
const ecc = { earth: C.eccentricityBase };  // Base eccentricities for balance
const inclJ2000 = {};
const periLongJ2000 = {};  // ICRF perihelion longitude
const omegaJ2000 = {};     // ascending node (for ecliptic plane normal)
const eclPeriod = {};      // ecliptic perihelion period
const icrfPeriod = {};     // |ICRF perihelion period|
const perPlanetPhase = {}; // per-planet phase angles
const genPrec = C.H / 13;
for (const p of planets) {
  if (p === 'earth') {
    periLongJ2000[p] = C.ASTRO_REFERENCE.earthPerihelionLongitudeJ2000;
    omegaJ2000[p] = C.ASTRO_REFERENCE.earthAscendingNodeInvPlane;
    icrfPeriod[p] = C.H / 3;
    eclPeriod[p] = C.H / 16;
    perPlanetPhase[p] = C.ASTRO_REFERENCE.earthInclinationPhaseAngle;
    continue;
  }
  orbitDistance[p] = C.derived[p].orbitDistance;
  ecc[p] = C.planets[p].orbitalEccentricityBase;
  inclJ2000[p] = C.planets[p].invPlaneInclinationJ2000;
  periLongJ2000[p] = C.planets[p].longitudePerihelion;
  omegaJ2000[p] = C.planets[p].ascendingNodeInvPlane;
  eclPeriod[p] = C.planets[p].perihelionEclipticYears;
  icrfPeriod[p] = Math.abs(1 / (1/eclPeriod[p] - 1/genPrec));
  perPlanetPhase[p] = C.planets[p].inclinationPhaseAngle;
}
// Earth's J2000 inclination (computed from mean + amplitude model)
inclJ2000.earth = C.earthInvPlaneInclinationMean +
  C.earthInvPlaneInclinationAmplitude * Math.cos(
    (C.ASTRO_REFERENCE.earthPerihelionLongitudeJ2000 - C.ASTRO_REFERENCE.earthInclinationPhaseAngle) * DEG2RAD);

// Laplace-Lagrange bounds
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
function fbeCalcApparentIncl(year, planetKey, planetMean, planetAmplitude, planetIcrfPeriod, planetPeriLongJ2000, planetPhaseAngle, isAntiPhase) {
  const periLong = planetPeriLongJ2000 + (360 / planetIcrfPeriod) * (year - 2000);
  const planetPhase = (periLong - planetPhaseAngle) * DEG2RAD;
  const sign = isAntiPhase ? -1 : 1;
  const planetI = (planetMean + sign * planetAmplitude * Math.cos(planetPhase)) * DEG2RAD;
  const planetOmegaRad = (omegaJ2000[planetKey] + (360 / eclPeriod[planetKey]) * (year - 2000)) * DEG2RAD;

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

    planetResults[key] = { amplitude, mean, rangeMin, rangeMax, fitsLL, directionMatch };
  }

  // Scalar balance (in-phase vs anti-phase)
  let sumPro = 0, sumAnti = 0;
  for (const key of planets) {
    const L = mass[key] * Math.sqrt(orbitDistance[key] * (1 - ecc[key] * ecc[key]));
    const w = L * planetResults[key].amplitude;
    if (config[key].group !== 'anti-phase') sumPro += w;
    else sumAnti += w;
  }
  const totalLamp = sumPro + sumAnti;
  const balanceResidual = Math.abs(sumPro - sumAnti);
  const imbalance = totalLamp > 0 ? (balanceResidual / totalLamp) * 100 : 0;
  const balance = 100 - imbalance;

  // Derive flags
  const allLL = planets.every(p => planetResults[p].fitsLL);
  const allDir = planets.every(p => planetResults[p].directionMatch);

  return { balance, allLL, allDir, allPass: allLL && allDir, planetResults };
}

// ══════════════════════════════════════════════════════════════════
// EXHAUSTIVE SEARCH
// ══════════════════════════════════════════════════════════════════

const fibNumbers = [1, 2, 3, 5, 8, 13, 21, 34, 55];
const groups = ['in-phase', 'anti-phase'];

const scenarios = [
  { name: 'A', jupiter: { d: 5, group: 'in-phase' }, saturn: { d: 3, group: 'anti-phase' } },
  { name: 'B', jupiter: { d: 8, group: 'in-phase' }, saturn: { d: 5, group: 'anti-phase' } },
  { name: 'C', jupiter: { d: 13, group: 'in-phase' }, saturn: { d: 8, group: 'anti-phase' } },
  { name: 'D', jupiter: { d: 21, group: 'in-phase' }, saturn: { d: 13, group: 'anti-phase' } },
];

const THRESHOLD = 99.994;

// ── Counters for all filter intersections ──
let total = 0;

// Single filters
let cntBalance = 0;
let cntMirror = 0;
let cntSaturnSolo = 0;
let cntLL = 0;

// Two-filter intersections
let cntMirror_Balance = 0;
let cntSaturnSolo_Balance = 0;
let cntSaturnSolo_LL = 0;
let cntMirror_SaturnSolo = 0;
let cntMirror_LL = 0;
let cntBalance_LL = 0;

// Three-filter intersections
let cntSaturnSolo_Balance_LL = 0;
let cntMirror_SaturnSolo_LL = 0;
let cntMirror_SaturnSolo_Balance = 0;
let cntMirror_Balance_LL = 0;

// All four
let cntAll4 = 0;

// Per-scenario counters
const scenarioStats = {};
for (const s of scenarios) {
  scenarioStats[s.name] = {
    total: 0, balance: 0, mirror: 0, saturnSolo: 0, ll: 0,
    saturnSolo_balance: 0, saturnSolo_ll: 0, mirror_saturnSolo_ll: 0,
  };
}

// Collect detailed configs for specific intersections
const saturnSoloBalanceConfigs = [];    // Saturn-solo ∩ Balance (the 17)
const mirrorSaturnSoloLLConfigs = [];   // Mirror ∩ Saturn-solo ∩ LL (the 36)

console.log('═══════════════════════════════════════════════════════════════');
console.log('Appendix M (89) — Configuration Space Analysis');
console.log('═══════════════════════════════════════════════════════════════');
console.log('Evaluating all 7,558,272 configurations...\n');

const startTime = Date.now();

for (const scenario of scenarios) {
  const stats = scenarioStats[scenario.name];

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

                      total++;
                      stats.total++;

                      // Evaluate filters
                      const result = computeBalance(config);
                      const isBalance = result.balance >= THRESHOLD;
                      const isMirror = config.mercury.d === config.uranus.d &&
                                       config.venus.d === config.neptune.d &&
                                       config.earth.d === config.saturn.d &&
                                       config.mars.d === config.jupiter.d;
                      const isSaturnSolo = mp === 0 && vp === 0 && map === 0 && up === 0 && np === 0;
                      const isLL = result.allLL;

                      // Single filters
                      if (isBalance)    { cntBalance++;    stats.balance++; }
                      if (isMirror)     { cntMirror++;     stats.mirror++; }
                      if (isSaturnSolo) { cntSaturnSolo++; stats.saturnSolo++; }
                      if (isLL)         { cntLL++;         stats.ll++; }

                      // Two-filter intersections
                      if (isMirror && isBalance)       cntMirror_Balance++;
                      if (isSaturnSolo && isBalance)   { cntSaturnSolo_Balance++; stats.saturnSolo_balance++; }
                      if (isSaturnSolo && isLL)        { cntSaturnSolo_LL++; stats.saturnSolo_ll++; }
                      if (isMirror && isSaturnSolo)    cntMirror_SaturnSolo++;
                      if (isMirror && isLL)            cntMirror_LL++;
                      if (isBalance && isLL)           cntBalance_LL++;

                      // Three-filter intersections
                      if (isSaturnSolo && isBalance && isLL) cntSaturnSolo_Balance_LL++;
                      if (isMirror && isSaturnSolo && isLL)  { cntMirror_SaturnSolo_LL++; stats.mirror_saturnSolo_ll++; }
                      if (isMirror && isSaturnSolo && isBalance) cntMirror_SaturnSolo_Balance++;
                      if (isMirror && isBalance && isLL)     cntMirror_Balance_LL++;

                      // All four
                      if (isMirror && isSaturnSolo && isLL && isBalance) cntAll4++;

                      // Collect detailed configs
                      if (isSaturnSolo && isBalance) {
                        const llFailing = planets.filter(p => !result.planetResults[p].fitsLL);
                        saturnSoloBalanceConfigs.push({
                          scenario: scenario.name, balance: result.balance, isLL,
                          isMirror, llFailing,
                          me: fibNumbers[mi], ve: fibNumbers[vi], ma: fibNumbers[mai],
                          ju: scenario.jupiter.d, sa: scenario.saturn.d,
                          ur: fibNumbers[ui], ne: fibNumbers[ni],
                        });
                      }
                      if (isMirror && isSaturnSolo && isLL) {
                        mirrorSaturnSoloLLConfigs.push({
                          balance: result.balance,
                          meD: fibNumbers[mi], veD: fibNumbers[vi],
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

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`  Scenario ${scenario.name} (Ju=${scenario.jupiter.d}, Sa=${scenario.saturn.d}): done (${elapsed}s)`);
}

const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

// ══════════════════════════════════════════════════════════════════
// RESULTS
// ══════════════════════════════════════════════════════════════════

const pct = (n, d) => d > 0 ? (n / d * 100).toPrecision(4) + '%' : '-';

console.log(`\nCompleted in ${elapsed}s\n`);

console.log('═══════════════════════════════════════════════════════════════');
console.log('SECTION 1: FILTER INTERSECTION TABLE');
console.log('═══════════════════════════════════════════════════════════════');
console.log('(This table is reproduced in Fibonacci Laws (doc 10), Finding 2)\n');

console.log('| Filter                                                       |      Count | % of total   |');
console.log('|--------------------------------------------------------------|------------|--------------|');
console.log(`| Total search space                                           | ${total.toLocaleString().padStart(10)} | 100%         |`);
console.log('| **Single filters**                                           |            |              |');
console.log(`| Balance ≥ 99.994%                                            | ${cntBalance.toLocaleString().padStart(10)} | ${pct(cntBalance, total).padStart(12)} |`);
console.log(`| Mirror-symmetric                                             | ${cntMirror.toLocaleString().padStart(10)} | ${pct(cntMirror, total).padStart(12)} |`);
console.log(`| Saturn-solo                                                  | ${cntSaturnSolo.toLocaleString().padStart(10)} | ${pct(cntSaturnSolo, total).padStart(12)} |`);
console.log(`| LL bounds                                                    | ${cntLL.toLocaleString().padStart(10)} | ${pct(cntLL, total).padStart(12)} |`);
console.log('| **Two-filter intersections**                                 |            |              |');
console.log(`| Mirror ∩ Balance                                             | ${cntMirror_Balance.toLocaleString().padStart(10)} | ${pct(cntMirror_Balance, total).padStart(12)} |`);
console.log(`| Saturn-solo ∩ Balance                                        | ${cntSaturnSolo_Balance.toLocaleString().padStart(10)} | ${pct(cntSaturnSolo_Balance, total).padStart(12)} |`);
console.log(`| Saturn-solo ∩ LL bounds                                      | ${cntSaturnSolo_LL.toLocaleString().padStart(10)} | ${pct(cntSaturnSolo_LL, total).padStart(12)} |`);
console.log(`| Mirror ∩ Saturn-solo                                         | ${cntMirror_SaturnSolo.toLocaleString().padStart(10)} | ${pct(cntMirror_SaturnSolo, total).padStart(12)} |`);
console.log(`| Mirror ∩ LL bounds                                           | ${cntMirror_LL.toLocaleString().padStart(10)} | ${pct(cntMirror_LL, total).padStart(12)} |`);
console.log(`| Balance ∩ LL bounds                                          | ${cntBalance_LL.toLocaleString().padStart(10)} | ${pct(cntBalance_LL, total).padStart(12)} |`);
console.log('| **Three-filter intersections**                               |            |              |');
console.log(`| Saturn-solo ∩ Balance ∩ LL bounds                            | ${cntSaturnSolo_Balance_LL.toLocaleString().padStart(10)} | ${pct(cntSaturnSolo_Balance_LL, total).padStart(12)} |`);
console.log(`| Mirror ∩ Saturn-solo ∩ LL bounds                             | ${cntMirror_SaturnSolo_LL.toLocaleString().padStart(10)} | ${pct(cntMirror_SaturnSolo_LL, total).padStart(12)} |`);
console.log(`| Mirror ∩ Saturn-solo ∩ Balance                               | ${cntMirror_SaturnSolo_Balance.toLocaleString().padStart(10)} | ${pct(cntMirror_SaturnSolo_Balance, total).padStart(12)} |`);
console.log(`| Mirror ∩ Balance ∩ LL bounds                                 | ${cntMirror_Balance_LL.toLocaleString().padStart(10)} | ${pct(cntMirror_Balance_LL, total).padStart(12)} |`);
console.log('| **All four filters**                                         |            |              |');
console.log(`| Mirror ∩ Saturn-solo ∩ LL bounds ∩ Balance ≥ 99.994%         | ${cntAll4.toLocaleString().padStart(10)} | ${pct(cntAll4, total).padStart(12)} |`);

console.log('\n═══════════════════════════════════════════════════════════════');
console.log('SECTION 2: PER-SCENARIO BREAKDOWN');
console.log('═══════════════════════════════════════════════════════════════\n');

console.log('| Scenario | Ju | Sa | Total     | Balance | Mirror | Saturn-solo | LL bounds | SS∩Bal | SS∩LL  | Mi∩SS∩LL |');
console.log('|----------|----|----|-----------|---------|--------|-------------|-----------|--------|--------|----------|');
for (const s of scenarios) {
  const st = scenarioStats[s.name];
  console.log(`| ${s.name}        | ${s.jupiter.d.toString().padStart(2)} | ${s.saturn.d.toString().padStart(2)} | ${st.total.toLocaleString().padStart(9)} | ${st.balance.toLocaleString().padStart(7)} | ${st.mirror.toLocaleString().padStart(6)} | ${st.saturnSolo.toLocaleString().padStart(11)} | ${st.ll.toLocaleString().padStart(9)} | ${st.saturnSolo_balance.toLocaleString().padStart(6)} | ${st.saturnSolo_ll.toLocaleString().padStart(6)} | ${st.mirror_saturnSolo_ll.toLocaleString().padStart(8)} |`);
}

console.log('\n═══════════════════════════════════════════════════════════════');
console.log('SECTION 3: SATURN-SOLO CONFIGS ABOVE 99.994%');
console.log('═══════════════════════════════════════════════════════════════');
console.log(`\n${saturnSoloBalanceConfigs.length} configs (all Scenario A). LL pass column separated from direction.\n`);

saturnSoloBalanceConfigs.sort((a, b) => b.balance - a.balance);

console.log('| Rank | Balance%    | Me | Ve | Ma | Ju | Sa | Ur | Ne | LL pass | Mirror | LL failing         |');
console.log('|------|-------------|----|----|----|----|----|----|----|---------|---------|--------------------|');
for (let i = 0; i < saturnSoloBalanceConfigs.length; i++) {
  const c = saturnSoloBalanceConfigs[i];
  const isConfig32 = c.me === 21 && c.ve === 34 && c.ma === 5 && c.ju === 5 && c.sa === 3 && c.ur === 21 && c.ne === 34;
  const marker = isConfig32 ? ' ← #124' : '';
  console.log(
    `| ${(i+1).toString().padStart(4)} | ${c.balance.toFixed(6).padStart(11)} | ${c.me.toString().padStart(2)} | ${c.ve.toString().padStart(2)} | ${c.ma.toString().padStart(2)} | ${c.ju.toString().padStart(2)} | ${c.sa.toString().padStart(2)} | ${c.ur.toString().padStart(2)} | ${c.ne.toString().padStart(2)} | ${(c.isLL ? 'YES' : 'NO').padStart(7)} | ${(c.isMirror ? 'YES' : 'NO').padStart(7)} | ${(c.llFailing.join(', ') || '-').padEnd(18)} |${marker}`
  );
}

console.log('\n═══════════════════════════════════════════════════════════════');
console.log('SECTION 4: MIRROR + SATURN-SOLO + LL BOUNDS (36 configs)');
console.log('═══════════════════════════════════════════════════════════════');
console.log('\nAll use Scenario A (Ju=5, Sa=3), Earth d=3, Mars d=5, all in-phase except Saturn anti-phase.');
console.log('LL bounds require d ≥ 5 for both Mercury↔Uranus and Venus↔Neptune.\n');

mirrorSaturnSoloLLConfigs.sort((a, b) => b.balance - a.balance);

console.log('| Rank | Me↔Ur d | Ve↔Ne d | Balance%    | ≥ 99.994%? |');
console.log('|------|---------|---------|-------------|------------|');
for (let i = 0; i < mirrorSaturnSoloLLConfigs.length; i++) {
  const c = mirrorSaturnSoloLLConfigs[i];
  const isConfig32 = c.meD === 21 && c.veD === 34;
  const marker = isConfig32 ? ' ← #124' : '';
  console.log(
    `| ${(i+1).toString().padStart(4)} | ${c.meD.toString().padStart(7)} | ${c.veD.toString().padStart(7)} | ${c.balance.toFixed(6).padStart(11)} | ${(c.balance >= THRESHOLD ? 'YES' : 'NO').padStart(10)} |${marker}`
  );
}

console.log('\n═══════════════════════════════════════════════════════════════');
console.log('SECTION 5: ANALYTICAL VERIFICATION');
console.log('═══════════════════════════════════════════════════════════════\n');

console.log('Search space: 9 fibs × 2 phases × 5 planets × 4 scenarios = 18⁵ × 4 =', 18**5 * 4);
console.log('Saturn-solo: all 5 variable planets in-phase = 9⁵ × 4 =', 9**5 * 4);
console.log('Mirror (Scenario A only): Earth↔Sa locked, Mars↔Ju locked, 2 Mars groups × 9 Me/Ur d × 4 Me/Ur groups × 9 Ve/Ne d × 4 Ve/Ne groups =', 2 * 9 * 4 * 9 * 4);
console.log('Mirror ∩ Saturn-solo: Mars in-phase, Me/Ur both in-phase, Ve/Ne both in-phase = 9 × 9 =', 9 * 9);
console.log('Mirror ∩ Saturn-solo ∩ LL (d≥5): 6 × 6 =', 6 * 6);
