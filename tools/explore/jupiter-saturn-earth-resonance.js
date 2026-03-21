#!/usr/bin/env node
/**
 * Explore the Earth-Jupiter-Saturn ~60 year resonance.
 *
 * Thesis: The ~60 year conjunction pattern emerges from the combined
 * geocentric geometry of Earth's wobble, Jupiter's perihelion (H/5),
 * Saturn's perihelion (-H/8), and their eccentricity offsets.
 *
 * The eccentricity offset places each planet's orbit center away from the
 * geometric focus. As the perihelion precesses, this offset rotates,
 * changing the planet's geocentric distance at conjunction time.
 * The ~60yr signal in position errors comes from this distance modulation.
 */

const C = require('../lib/constants');
const SG = require('../lib/scene-graph');

const H = C.H;
const d2r = Math.PI / 180;
const r2d = 180 / Math.PI;

console.log('═══════════════════════════════════════════════════════════════');
console.log('  EARTH-JUPITER-SATURN RESONANCE EXPLORATION');
console.log('═══════════════════════════════════════════════════════════════');

// ─── 1. Orbital & precession parameters ─────────────────────────────────

const Tj = C.planets.jupiter.solarYearInput / C.meanSolarYearDays;
const Ts = C.planets.saturn.solarYearInput / C.meanSolarYearDays;
const eJ = C.planets.jupiter.orbitalEccentricityJ2000 || C.planets.jupiter.orbitalEccentricityBase;
const eS = C.planets.saturn.orbitalEccentricityJ2000 || C.planets.saturn.orbitalEccentricityBase;
const eE = C.ASTRO_REFERENCE.earthEccentricityJ2000;

const aJ = Math.pow(Tj * Tj, 1 / 3);  // semi-major axis (AU)
const aS = Math.pow(Ts * Ts, 1 / 3);

// Eccentricity offsets (distance from orbit center to focus)
const offsetJ = aJ * eJ;  // ~0.25 AU
const offsetS = aS * eS;  // ~0.51 AU
const offsetE = 1.0 * eE;  // ~0.017 AU

// Perihelion precession rates
const jupPeriYears = C.planets.jupiter.perihelionEclipticYears;   // H/5
const satPeriYears = C.planets.saturn.perihelionEclipticYears;    // -H/8
const earthPeriYears = H / 16;                                    // H/16 (net)

const jupPeriRate = 360.0 / jupPeriYears;    // +0.00537 °/yr
const satPeriRate = 360.0 / satPeriYears;    // -0.00860 °/yr
const earthPeriRate = 360.0 / earthPeriYears; // +0.01719 °/yr

// Perihelion longitudes at J2000
const jupPeriLon = C.planets.jupiter.longitudePerihelion;  // ~14.7°
const satPeriLon = C.planets.saturn.longitudePerihelion;   // ~92.1°
const earthPeriLon = C.ASTRO_REFERENCE.earthPerihelionLongitudeJ2000; // ~102.9°

console.log('\n─── 1. Parameters ───\n');
console.log('Body    │ a (AU)  │ e        │ Offset (AU) │ ω J2000 (°) │ Peri prec    │ Rate (°/yr)');
console.log('────────┼─────────┼──────────┼─────────────┼─────────────┼──────────────┼────────────');
console.log(`Earth   │ ${(1).toFixed(4).padStart(7)} │ ${eE.toFixed(6).padStart(8)} │ ${offsetE.toFixed(4).padStart(11)} │ ${earthPeriLon.toFixed(1).padStart(11)} │ H/16         │ ${earthPeriRate.toFixed(8)}`);
console.log(`Jupiter │ ${aJ.toFixed(4).padStart(7)} │ ${eJ.toFixed(6).padStart(8)} │ ${offsetJ.toFixed(4).padStart(11)} │ ${jupPeriLon.toFixed(1).padStart(11)} │ H/5          │ ${jupPeriRate.toFixed(8)}`);
console.log(`Saturn  │ ${aS.toFixed(4).padStart(7)} │ ${eS.toFixed(6).padStart(8)} │ ${offsetS.toFixed(4).padStart(11)} │ ${satPeriLon.toFixed(1).padStart(11)} │ -H/8         │ ${satPeriRate.toFixed(8)}`);

// ─── 2. Perihelion longitude geometry ───────────────────────────────────

console.log('\n─── 2. Perihelion Longitude Geometry Over Time ───\n');
console.log('The eccentricity offset vector rotates with the perihelion.');
console.log('At conjunction, the relative offset geometry determines how');
console.log('much the apparent position shifts from the circular-orbit prediction.\n');

// Track perihelion longitudes and their relative angles
console.log('Year │ ω_Earth │ ω_Jupiter │ ω_Saturn  │ Δω(J-E)  │ Δω(S-E)  │ Δω(J-S)');
console.log('─────┼─────────┼───────────┼───────────┼──────────┼──────────┼─────────');

for (let year = 1800; year <= 2300; year += 50) {
  const dt = year - 2000;
  const wE = ((earthPeriLon + earthPeriRate * dt) % 360 + 360) % 360;
  const wJ = ((jupPeriLon + jupPeriRate * dt) % 360 + 360) % 360;
  const wS = ((satPeriLon + satPeriRate * dt) % 360 + 360) % 360;
  let dJE = wJ - wE; if (dJE > 180) dJE -= 360; if (dJE < -180) dJE += 360;
  let dSE = wS - wE; if (dSE > 180) dSE -= 360; if (dSE < -180) dSE += 360;
  let dJS = wJ - wS; if (dJS > 180) dJS -= 360; if (dJS < -180) dJS += 360;
  console.log(`${year} │ ${wE.toFixed(1).padStart(7)} │ ${wJ.toFixed(1).padStart(9)} │ ${wS.toFixed(1).padStart(9)} │ ${(dJE >= 0 ? '+' : '') + dJE.toFixed(1).padStart(7)} │ ${(dSE >= 0 ? '+' : '') + dSE.toFixed(1).padStart(7)} │ ${(dJS >= 0 ? '+' : '') + dJS.toFixed(1).padStart(7)}`);
}

// ─── 3. True conjunctions from scene-graph ──────────────────────────────

console.log('\n─── 3. True Conjunctions (Scene Graph) ───\n');

// Find ONE conjunction per synodic cycle by stepping through expected
// conjunction epochs (~19.86 yr apart) and finding the minimum RA separation.
// This avoids counting retrograde triple-crossings as separate events.

function findConjunctions(startYear, endYear) {
  const synodic = 1 / (1 / Tj - 1 / Ts);  // ~19.86 yr
  const conjs = [];

  // Start from first expected conjunction near startYear
  // Search in windows centered on expected conjunction epochs
  let expectedYear = startYear;

  while (expectedYear < endYear) {
    // Search ±2 years around expected conjunction for minimum separation
    let bestSep = 999, bestYear = 0, bestJD = 0;
    const searchStart = expectedYear - 2;
    const searchEnd = expectedYear + 2;
    const step = 5; // days

    for (let year = searchStart; year < searchEnd; year += step / 365.25) {
      const jd = C.startmodelJD + (year - C.startmodelYear) * C.meanSolarYearDays;
      const jupPos = SG.computePlanetPosition('jupiter', jd);
      const satPos = SG.computePlanetPosition('saturn', jd);
      const jupRA = SG.thetaToRaDeg(jupPos.ra);
      const satRA = SG.thetaToRaDeg(satPos.ra);

      let sep = jupRA - satRA;
      if (sep > 180) sep -= 360;
      if (sep < -180) sep += 360;
      const absSep = Math.abs(sep);

      if (absSep < bestSep) {
        bestSep = absSep; bestYear = year; bestJD = jd;
      }
    }

    if (bestSep < 15) {
      conjs.push({ year: bestYear, jd: bestJD, sep: bestSep });
      expectedYear = bestYear + synodic;  // next expected conjunction
    } else {
      expectedYear += synodic;  // skip if nothing found
    }
  }
  return conjs;
}

const conjunctions = findConjunctions(1800, 2300);

console.log(`Found ${conjunctions.length} true conjunctions (1800-2300)\n`);
console.log('  #  │ Year    │ Interval │ Jup dist │ Sat dist │ Jup RA   │ Sep (°)');
console.log('─────┼─────────┼──────────┼──────────┼──────────┼──────────┼────────');

const intervals = [];
for (let i = 0; i < conjunctions.length; i++) {
  const c = conjunctions[i];
  const interval = i > 0 ? c.year - conjunctions[i - 1].year : 0;
  if (i > 0) intervals.push(interval);

  const jupPos = SG.computePlanetPosition('jupiter', c.jd);
  const satPos = SG.computePlanetPosition('saturn', c.jd);
  const jupDist = jupPos.distAU || aJ;
  const satDist = satPos.distAU || aS;
  const jupRA = SG.thetaToRaDeg(jupPos.ra);

  console.log(`${String(i + 1).padStart(4)} │ ${c.year.toFixed(1).padStart(7)} │ ${interval > 0 ? interval.toFixed(2).padStart(8) : ''.padStart(8)} │ ${jupDist.toFixed(3).padStart(8)} │ ${satDist.toFixed(3).padStart(8)} │ ${jupRA.toFixed(1).padStart(8)} │ ${c.sep.toFixed(2).padStart(6)}`);
}

if (intervals.length > 0) {
  const meanInt = intervals.reduce((a, b) => a + b, 0) / intervals.length;
  console.log(`─────┼─────────┼──────────┼──────────┼──────────┼──────────┼────────`);
  console.log(`Mean │         │ ${meanInt.toFixed(2).padStart(8)} │          │          │          │`);
}

// ─── 4. Triple conjunction pattern ──────────────────────────────────────

console.log('\n─── 4. Triple Conjunction Pattern ───\n');

if (conjunctions.length >= 6) {
  console.log('Every 3 conjunctions, Jupiter-Saturn return to similar sky positions.');
  console.log('The variation in this triple interval reveals the eccentricity effect.\n');

  console.log('  Conj #s │ Years span     │ Triple interval │ Sky position');
  console.log('──────────┼────────────────┼─────────────────┼──────────────');

  const tripleIntervals = [];
  for (let i = 3; i < conjunctions.length; i++) {
    const span = conjunctions[i].year - conjunctions[i - 3].year;
    tripleIntervals.push(span);

    const jupPos = SG.computePlanetPosition('jupiter', conjunctions[i].jd);
    const jupRA = SG.thetaToRaDeg(jupPos.ra);

    console.log(`  ${(i - 2)}-${(i + 1)}`.padEnd(10) +
      `│ ${conjunctions[i - 3].year.toFixed(0)}-${conjunctions[i].year.toFixed(0)}`.padEnd(16) +
      `│ ${span.toFixed(2).padStart(11)} yr  │ RA ${jupRA.toFixed(1)}°`);
  }

  const tripleMean = tripleIntervals.reduce((a, b) => a + b, 0) / tripleIntervals.length;
  const tripleMin = Math.min(...tripleIntervals);
  const tripleMax = Math.max(...tripleIntervals);

  console.log('──────────┼────────────────┼─────────────────┼──────────────');
  console.log(`  Mean    │                │ ${tripleMean.toFixed(2).padStart(11)} yr  │`);
  console.log(`  Min     │                │ ${tripleMin.toFixed(2).padStart(11)} yr  │`);
  console.log(`  Max     │                │ ${tripleMax.toFixed(2).padStart(11)} yr  │`);
  console.log(`  Range   │                │ ${(tripleMax - tripleMin).toFixed(2).padStart(11)} yr  │`);

  // ─── 5. Eccentricity offset analysis at conjunctions ──────────────────

  console.log('\n─── 5. Eccentricity Offset Geometry at Conjunctions ───\n');
  console.log('At each conjunction, the perihelion directions determine the');
  console.log('eccentricity offset geometry. The offset shifts the planet from');
  console.log('its circular-orbit position, creating parallax-like effects.\n');

  console.log('  #  │ Year  │ ω_E (°) │ ω_J (°) │ ω_S (°) │ Δω J-S (°) │ Jup dist │ Pattern');
  console.log('─────┼───────┼─────────┼─────────┼─────────┼────────────┼──────────┼────────');

  for (let i = 0; i < conjunctions.length; i++) {
    const c = conjunctions[i];
    const dt = c.year - 2000;
    const wE = ((earthPeriLon + earthPeriRate * dt) % 360 + 360) % 360;
    const wJ = ((jupPeriLon + jupPeriRate * dt) % 360 + 360) % 360;
    const wS = ((satPeriLon + satPeriRate * dt) % 360 + 360) % 360;
    let dJS = wJ - wS; if (dJS > 180) dJS -= 360; if (dJS < -180) dJS += 360;

    const jupPos = SG.computePlanetPosition('jupiter', c.jd);
    const jupDist = jupPos.distAU || aJ;

    // Classify conjunction position (approximate sky region)
    const jupRA = SG.thetaToRaDeg(jupPos.ra);
    const region = jupRA < 90 ? 'Aries' : jupRA < 180 ? 'Cancer' : jupRA < 270 ? 'Libra' : 'Capricorn';

    console.log(`${String(i + 1).padStart(4)} │ ${c.year.toFixed(0).padStart(5)} │ ${wE.toFixed(1).padStart(7)} │ ${wJ.toFixed(1).padStart(7)} │ ${wS.toFixed(1).padStart(7)} │ ${(dJS >= 0 ? '+' : '') + dJS.toFixed(1).padStart(7)}    │ ${jupDist.toFixed(3).padStart(8)} │ ${region}`);
  }

  // ─── 6. Beat frequency analysis ───────────────────────────────────────

  console.log('\n─── 6. Beat Frequency Analysis ───\n');

  // The relative perihelion rate between Jupiter and Saturn
  const relPeriRate = jupPeriRate - satPeriRate;
  const relPeriPeriod = 360.0 / relPeriRate;

  // The orbital mean motions
  const nJ = 360.0 / Tj;
  const nS = 360.0 / Ts;
  const synodic = 360.0 / (nJ - nS);

  // Effective conjunction rate (including perihelion precession)
  const nJ_eff = nJ + jupPeriRate;
  const nS_eff = nS + satPeriRate;
  const synodicEff = 360.0 / (nJ_eff - nS_eff);

  console.log('Perihelion precession:');
  console.log(`  Jupiter rate:       ${jupPeriRate >= 0 ? '+' : ''}${jupPeriRate.toFixed(8)}°/yr (H/5 prograde)`);
  console.log(`  Saturn rate:        ${satPeriRate >= 0 ? '+' : ''}${satPeriRate.toFixed(8)}°/yr (-H/8 retrograde)`);
  console.log(`  Relative rate:      ${relPeriRate >= 0 ? '+' : ''}${relPeriRate.toFixed(8)}°/yr`);
  console.log(`  Relative period:    ${relPeriPeriod.toFixed(1)} yr (full rotation of J-S offset geometry)`);
  console.log('');
  console.log('H-fraction analysis of relative perihelion rate:');
  console.log(`  Jupiter H/5 - Saturn H/8 = H × (1/5 + 1/8) / (H²) `);
  console.log(`  = 360 × (5+8)/(H) = 360 × 13/H`);
  console.log(`  → Period = H/13 = ${(H / 13).toFixed(1)} yr = AXIAL PRECESSION PERIOD!`);
  console.log('');
  console.log('This means the Jupiter-Saturn perihelion offset geometry');
  console.log('completes one full cycle in exactly H/13 years — the same');
  console.log('as Earth\'s axial precession!');
  console.log('');
  console.log('Synodic periods:');
  console.log(`  Pure orbital:     ${synodic.toFixed(4)} yr (${(synodic * 365.25).toFixed(1)} days)`);
  console.log(`  With perihelion:  ${synodicEff.toFixed(4)} yr (${(synodicEff * 365.25).toFixed(1)} days)`);
  console.log(`  Triple pure:      ${(3 * synodic).toFixed(4)} yr`);
  console.log(`  Triple effective: ${(3 * synodicEff).toFixed(4)} yr`);
  console.log('');

  // Number of synodic cycles per H/13
  const synodicPerAxial = (H / 13) / synodic;
  const synodicPerAxialEff = (H / 13) / synodicEff;
  console.log('Synodic cycles per axial precession (H/13):');
  console.log(`  Pure:      ${synodicPerAxial.toFixed(2)} cycles`);
  console.log(`  Effective: ${synodicPerAxialEff.toFixed(2)} cycles`);
  console.log(`  Nearest integer: ${Math.round(synodicPerAxial)} (× ${synodic.toFixed(4)} = ${(Math.round(synodicPerAxial) * synodic).toFixed(1)} yr ≈ H/13 = ${(H / 13).toFixed(1)} yr)`);
  console.log('');

  // The ~60 year pattern: 3 conjunctions per "trigon"
  // In 60 years, the perihelion offset rotates by:
  const offsetRotIn60 = relPeriRate * 60;
  console.log('In ~60 years (triple conjunction):');
  console.log(`  Perihelion offset rotates: ${offsetRotIn60.toFixed(2)}° (J-S relative)`);
  console.log(`  This means each triple conjunction sees a DIFFERENT offset geometry,`);
  console.log(`  modulating the apparent distance and creating the ~60yr signal.`);
  console.log('');

  // The actual period of the distance modulation
  // The distance error depends on: conjunction position × offset direction
  // The conjunction position advances 360° per synodic period
  // The offset direction advances relPeriRate per year
  // The beat between these: when does the same conjunction happen
  // at the same offset angle?
  const conjAdvanceRate = 360.0 / synodic;  // how fast conjunction longitude advances (deg/yr)
  // Actually, each conjunction is at a different longitude.
  // In 3 conjunctions (triple), the longitude returns roughly to the same place.
  // The offset has rotated by relPeriRate × 3 × synodic in that time.
  const offsetPerTriple = relPeriRate * 3 * synodic;
  const triplesForFullRotation = 360.0 / offsetPerTriple;
  const yearsForFullRotation = triplesForFullRotation * 3 * synodic;

  console.log('Full modulation cycle:');
  console.log(`  Offset rotation per triple: ${offsetPerTriple.toFixed(4)}°`);
  console.log(`  Triples for full rotation:  ${triplesForFullRotation.toFixed(2)}`);
  console.log(`  Years for full rotation:    ${yearsForFullRotation.toFixed(1)} yr`);
  console.log(`  This should equal H/13:     ${(H / 13).toFixed(1)} yr`);
  console.log(`  Match: ${Math.abs(yearsForFullRotation - H / 13) < 1 ? 'YES' : 'NO'} (diff: ${(yearsForFullRotation - H / 13).toFixed(1)} yr)`);

  // ─── 7. H/13 Deep Dive ─────────────────────────────────────────────────

  console.log('\n─── 7. The H/13 Connection — Deep Dive ───\n');

  console.log('DISCOVERY: Jupiter perihelion (H/5) and Saturn perihelion (-H/8)');
  console.log('have a relative rotation period of exactly H/13.\n');
  console.log('Proof:');
  console.log('  Jupiter rate:  +360° / (H/5) = +5 × 360°/H');
  console.log('  Saturn rate:   -360° / (H/8) = +8 × 360°/H  (note: -H/8 → +8/H)');
  console.log('  Relative rate: (5+8) × 360°/H = 13 × 360°/H');
  console.log('  Period:        H / 13 = ' + (H / 13).toFixed(1) + ' yr');
  console.log('');
  console.log('This is EXACTLY Earth\'s axial precession period!');
  console.log('');

  // Three interlocked H/13 cycles
  console.log('Three interlocked H/13 mechanisms:');
  console.log('');
  console.log('  a) Earth axial precession:     H/13 = ' + (H/13).toFixed(0) + ' yr');
  console.log('     Earth wobbles clockwise around the wobble center');
  console.log('');
  console.log('  b) Jupiter-Saturn offset beat:  H/13 = ' + (H/13).toFixed(0) + ' yr');
  console.log('     The relative perihelion geometry rotates through 360°');
  console.log('');
  console.log('  c) Earth orbital period:        H/H  = 1 yr');
  console.log('     Earth completes 1 orbit, seeing Jupiter-Saturn from different angles');
  console.log('');

  // How this creates the ~60 year signal
  console.log('How the ~60yr signal emerges:');
  console.log('');
  console.log('  The synodic period (' + synodic.toFixed(2) + ' yr) creates conjunctions.');
  console.log('  Every 3 conjunctions (' + (3 * synodic).toFixed(2) + ' yr), the trigon pattern repeats.');
  console.log('  But the eccentricity offsets have rotated by:');
  const tripleOffset = relPeriRate * 3 * synodic;
  console.log('    ' + tripleOffset.toFixed(4) + '° per triple (relative J-S perihelion)');
  console.log('');
  console.log('  Jupiter\'s distance at conjunction varies by:');
  console.log('    ±' + (2 * offsetJ).toFixed(3) + ' AU (from perihelion offset ' + offsetJ.toFixed(3) + ' AU)');
  console.log('    This is ' + (2 * offsetJ / aJ * 100).toFixed(1) + '% of its semi-major axis');
  console.log('');
  console.log('  Saturn\'s distance at conjunction varies by:');
  console.log('    ±' + (2 * offsetS).toFixed(3) + ' AU (from perihelion offset ' + offsetS.toFixed(3) + ' AU)');
  console.log('    This is ' + (2 * offsetS / aS * 100).toFixed(1) + '% of its semi-major axis');
  console.log('');

  // The parallax effect from distance variation
  console.log('  The geocentric RA error from distance variation:');
  console.log('    At Jupiter distance (~' + aJ.toFixed(1) + ' AU), a ' + offsetJ.toFixed(3) + ' AU offset');
  console.log('    creates atan(' + offsetJ.toFixed(3) + '/' + aJ.toFixed(1) + ') ≈ ' + (Math.atan(offsetJ / aJ) * r2d).toFixed(3) + '° parallax');
  console.log('    At Saturn distance (~' + aS.toFixed(1) + ' AU), a ' + offsetS.toFixed(3) + ' AU offset');
  console.log('    creates atan(' + offsetS.toFixed(3) + '/' + aS.toFixed(1) + ') ≈ ' + (Math.atan(offsetS / aS) * r2d).toFixed(3) + '° parallax');
  console.log('');

  // Count conjunctions per trigon and verify pattern
  console.log('  Conjunctions per H/13 cycle: ' + (H / 13 / synodic).toFixed(1));
  console.log('  Trigons per H/13 cycle:      ' + (H / 13 / (3 * synodic)).toFixed(1));
  console.log('');

  // Integer relationships
  const conjInH = Math.round(H / synodic);
  const conjIn13 = Math.round(H / 13 / synodic);
  console.log('  Integer orbit counts in H:');
  console.log('    Jupiter:  ' + Math.round(H / Tj) + ' orbits');
  console.log('    Saturn:   ' + Math.round(H / Ts) + ' orbits');
  console.log('    Conjunctions: ' + conjInH);
  console.log('    Conjunctions per H/13: ' + conjIn13);
  console.log('    Trigons per H/13: ' + (conjIn13 / 3).toFixed(2));
  console.log('    ' + conjIn13 + ' mod 3 = ' + (conjIn13 % 3) + (conjIn13 % 3 === 0 ? ' (exact!)' : ' (not exact)'));
  console.log('');

  // The connection to Law 6
  console.log('─── Connection to Fibonacci Law 6 ───');
  console.log('');
  console.log('Law 6 states: Saturn-Jupiter-Earth form a closed resonance loop.');
  console.log('');
  console.log('  H/5 (Jupiter perihelion)');
  console.log('  + H/8 (Saturn perihelion, retrograde)');
  console.log('  = H/13 (Earth axial precession)');
  console.log('');
  console.log('  This is the Fibonacci identity: 1/5 + 1/8 = 13/(5×8) = 13/40');
  console.log('  And 5, 8, 13 are consecutive Fibonacci numbers!');
  console.log('');
  console.log('  The ~60yr conjunction cycle is a DIRECT CONSEQUENCE of this');
  console.log('  Fibonacci relationship: the Jupiter-Saturn eccentricity geometry');
  console.log('  is locked to Earth\'s wobble through Law 6.');
  console.log('');

  // Practical implications for the model
  console.log('─── Implications for Position Accuracy ───');
  console.log('');
  console.log('The ~' + (3 * synodic).toFixed(1) + 'yr signal in Jupiter/Saturn residuals arises because');
  console.log('the model uses circular orbits. The eccentricity offset creates');
  console.log('a distance modulation that circular orbits cannot capture.');
  console.log('');
  console.log('Correcting this requires either:');
  console.log('  a) Elliptical orbits (removes the source of error)');
  console.log('  b) Empirical correction at the triple-synodic period');
  console.log('     (compensates the symptom)');
  console.log('');
  console.log('With empirical correction (option b):');
  console.log('  Saturn: 0.095° → ~0.049° (halved)');
  console.log('  Jupiter: 0.061° → ~0.035° (halved)');
  console.log('');
  console.log('With elliptical orbits (option a):');
  console.log('  Both would improve further since the distance would be');
  console.log('  correct at all orbital phases, not just corrected at one period.');

  // ─── 8. Summary ───────────────────────────────────────────────────────

  console.log('\n─── 8. Summary ───\n');
  console.log('Key findings:');
  console.log('');
  console.log('1. Jupiter-Saturn conjunctions occur every ' + synodic.toFixed(2) + ' yr');
  console.log('   (' + conjunctions.length + ' found in 500yr simulation, mean interval ' + (intervals.length > 0 ? intervals.reduce((a,b)=>a+b,0)/intervals.length : 0).toFixed(2) + ' yr)');
  console.log('');
  console.log('2. Triple conjunction (trigon) period: ' + tripleMean.toFixed(2) + ' yr');
  console.log('   (theory: ' + (3 * synodic).toFixed(2) + ' yr pure, ' + (3 * synodicEff).toFixed(2) + ' yr with perihelion)');
  console.log('');
  console.log('3. Jupiter perihelion (H/5) + Saturn perihelion (-H/8) beat = H/13');
  console.log('   This equals Earth axial precession — a Fibonacci Law 6 identity.');
  console.log('');
  console.log('4. The ~60yr position error signal comes from the trigon cycle');
  console.log('   modulated by the H/13 eccentricity offset rotation.');
  console.log('');
  console.log('5. Jupiter distance at conjunction: ' + Math.min(...conjunctions.map(c => {
    const p = SG.computePlanetPosition('jupiter', c.jd);
    return p.distAU || aJ;
  })).toFixed(2) + '-' + Math.max(...conjunctions.map(c => {
    const p = SG.computePlanetPosition('jupiter', c.jd);
    return p.distAU || aJ;
  })).toFixed(2) + ' AU (range ' + (2 * offsetJ).toFixed(2) + ' AU from eccentricity)');
}

console.log('');
console.log('═══════════════════════════════════════════════════════════════');
