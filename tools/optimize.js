#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════════════
// OPTIMIZE CLI — Diagnostics and optimization for the Holistic Universe Model
//
// Usage:
//   node tools/optimize.js diagnose <planet>
//   node tools/optimize.js baseline <planet>
//   node tools/optimize.js scan <planet> <param> [--range=lo,hi] [--steps=N]
//   node tools/optimize.js optimize <planet> [param1,param2,...] [--max-iter=N]
//   node tools/optimize.js eccentricity
// ═══════════════════════════════════════════════════════════════════════════

const opt = require('./lib/optimizer');
const C = require('./lib/constants');

const [,, command, ...args] = process.argv;

function parseFlag(args, name, defaultVal) {
  const prefix = `--${name}=`;
  const found = args.find(a => a.startsWith(prefix));
  return found ? found.slice(prefix.length) : defaultVal;
}

function usage() {
  console.log(`
Usage: node tools/optimize.js <command> [options]

Commands:
  diagnose <planet>        Orbit scan, layer decomposition, perihelion tracking
  baseline <planet>        RA/Dec errors at all reference dates vs JPL
  scan <planet> <param>    Sensitivity sweep of one parameter
                           --range=lo,hi  (default: current ± 5)
                           --steps=N      (default: 50)
  optimize <planet> [params]  Nelder-Mead optimization
                              params: comma-separated (default: startpos)
                              --max-iter=N  (default: 500)
  eccentricity             Compare model vs Keplerian eccentricity for all planets

Targets: mercury, venus, mars, jupiter, saturn, uranus, neptune, sun, moon
Planet params: startpos, solarYearInput, longitudePerihelion,
               ascendingNode, eclipticInclinationJ2000, orbitalEccentricity,
               perihelionEclipticYears, eocFraction, perihelionRef_JD,
               decCorrA, decCorrB, decCorrC, decCorrD, decCorrE, decCorrF
Sun params:    correctionSun, eccentricityBase, eccentricityAmplitude,
               earthRAAngle, earthtiltMean
Moon params:   moonStartposApsidal, moonStartposNodal, moonStartposMoon,
               moonTilt, moonEclipticInclinationJ2000, moonOrbitalEccentricity
`);
  process.exit(1);
}

if (!command) usage();

// ═══════════════════════════════════════════════════════════════════════════

if (command === 'eccentricity') {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  ECCENTRICITY ANALYSIS — Model vs Keplerian');
  console.log('═══════════════════════════════════════════════════════════════\n');
  console.log('Target       Type        Input_e     Model_e     Ratio   Min(AU)     Max(AU)     Kepler_min  Kepler_max');

  for (const p of ['sun','moon','mercury','venus','mars','jupiter','saturn','uranus','neptune']) {
    const r = opt.scanOrbit(p);
    console.log(
      (r.target || r.planet).padEnd(12), String(r.type).padEnd(11),
      r.inputEccentricity.toFixed(8).padStart(10),
      r.modelEccentricity.toFixed(8).padStart(10),
      r.ratio.toFixed(4).padStart(8),
      r.minDist.toFixed(6).padStart(10),
      r.maxDist.toFixed(6).padStart(10),
      r.keplerPeri.toFixed(6).padStart(10),
      r.keplerAph.toFixed(6).padStart(10)
    );
  }
  console.log('\nNote: Ratio > 1 means model over-estimates eccentricity vs Keplerian e.');
  console.log('Type II (Mars) is nearly correct; Type I/III systematically over-shoot.');
  process.exit(0);
}

// All other commands need a planet
const planet = args[0];
if (!planet) usage();

if (command === 'diagnose') {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`  DIAGNOSE: ${planet.toUpperCase()}`);
  console.log('═══════════════════════════════════════════════════════════════');

  // 1. Orbit scan
  console.log('\n─── Orbit Scan ───\n');
  const orb = opt.scanOrbit(planet);
  const distLabel = planet === 'moon' ? 'km' : 'AU';
  const distFactor = planet === 'moon' ? C.currentAUDistance : 1;
  console.log('  Orbit distance:       ', (orb.orbitDistance * distFactor).toFixed(planet === 'moon' ? 0 : 6), distLabel);
  console.log('  Type:                 ', orb.type);
  console.log('  Period:               ', orb.periodDays.toFixed(4), 'days');
  console.log('  Input eccentricity:   ', orb.inputEccentricity.toFixed(8));
  console.log('  Model eccentricity:   ', orb.modelEccentricity.toFixed(8));
  console.log('  Ratio (model/input):  ', orb.ratio.toFixed(4));
  console.log('  Min dist:             ', orb.minDist.toFixed(6), 'AU (Kepler:', orb.keplerPeri.toFixed(6) + ')');
  console.log('  Max dist:             ', orb.maxDist.toFixed(6), 'AU (Kepler:', orb.keplerAph.toFixed(6) + ')');

  // 2. Layer decomposition
  console.log('\n─── Layer Decomposition (model start) ───\n');
  const refLabel = planet === 'moon' ? 'dist_earth' : 'dist_sun';
  const layers = opt.decomposeLayerPositions(planet, 2451716.5);
  for (const l of layers) {
    console.log('  ' + l.name.padEnd(28), refLabel + ':', l.distFromRef.toFixed(6).padStart(10));
  }

  // 3. Closest-approach tracking
  const trackLabel = planet === 'moon' ? 'Perigee' : planet === 'sun' ? 'Perihelion (Earth)' : 'Perihelion';
  const nOrbits = planet === 'moon' ? 12 : 8;
  const trackRange = planet === 'moon' ? [2000, 2001] : [2000, 2100];
  console.log(`\n─── ${trackLabel} Tracking (${trackRange[0]}-${trackRange[1]}) ───\n`);
  const track = opt.trackPerihelion(planet, trackRange[0], trackRange[1], nOrbits);
  for (const t of track) {
    console.log('  Year', t.year.toFixed(planet === 'moon' ? 3 : 1).padStart(planet === 'moon' ? 10 : 7), '  dist:', t.periDist.toFixed(6), '  RA:', t.periRA.toFixed(3).padStart(8) + '°');
  }

  // 4. Quick baseline
  console.log('\n─── Baseline Error ───\n');
  try {
    const bl = opt.baseline(planet);
    console.log('  Reference entries:', bl.entries.length);
    console.log('  RMS RA:  ', bl.rmsRA.toFixed(4) + '°');
    console.log('  RMS Dec: ', bl.rmsDec.toFixed(4) + '°');
    console.log('  RMS Total:', bl.rmsTotal.toFixed(4) + '°');
    console.log('  Max RA:  ', bl.maxRA.toFixed(4) + '°');
    console.log('  Max Dec: ', bl.maxDec.toFixed(4) + '°');
  } catch (e) {
    console.log('  No reference data available:', e.message);
  }

} else if ((command === 'baseline' || command === 'baseline-jpl') && planet === 'all') {
  const jplModule = require('./lib/horizons-client');
  const sg = require('./lib/scene-graph');

  async function runBaselineAll() {
    const targets = ['mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'];
    const jd0 = C.startmodelJD;
    const fmtRA = (deg) => {
      if (deg < 0) deg += 360;
      const h = Math.floor(deg / 15);
      const m = Math.floor((deg / 15 - h) * 60);
      const s = ((deg / 15 - h) * 60 - m) * 60;
      return h + 'h' + String(m).padStart(2, '0') + 'm' + s.toFixed(1).padStart(5, '0') + 's';
    };

    console.log('═══════════════════════════════════════════════════════════════');
    console.log('  BASELINE SUMMARY — All Planets vs JPL Reference');
    console.log('═══════════════════════════════════════════════════════════════\n');

    console.log(
      'Planet'.padEnd(10),
      'RMS RA'.padStart(7),
      'RMS Dec'.padStart(8),
      'RMS Tot'.padStart(8),
      'n'.padStart(4),
      'startpos'.padStart(10),
      'Model RA'.padEnd(15),
      'JPL RA'.padEnd(15),
      'ΔRA'.padStart(8),
      'ΔDec'.padStart(8)
    );
    console.log('-'.repeat(110));

    for (const name of targets) {
      const bl = opt.baseline(name);
      const pDef = C.planets[name];

      const model = sg.computePlanetPosition(name, jd0);
      const modelRA = sg.thetaToRaDeg(model.ra);
      const modelDec = sg.phiToDecDeg(model.dec);

      let dRA = 0, dDec = 0;
      let jplRAStr = '?';
      try {
        const jpl = await jplModule.getPosition(name, jd0);
        dRA = modelRA - jpl.ra;
        if (dRA > 180) dRA -= 360;
        if (dRA < -180) dRA += 360;
        dDec = modelDec - jpl.dec;
        jplRAStr = fmtRA(jpl.ra);
      } catch (e) { /* no JPL data */ }

      console.log(
        name.padEnd(10),
        bl.rmsRA.toFixed(2).padStart(7),
        bl.rmsDec.toFixed(2).padStart(8),
        bl.rmsTotal.toFixed(2).padStart(8),
        String(bl.entries.length).padStart(4),
        String(pDef.startpos).padStart(10),
        fmtRA(modelRA).padEnd(15),
        jplRAStr.padEnd(15),
        ((dRA >= 0 ? '+' : '') + dRA.toFixed(2)).padStart(8),
        ((dDec >= 0 ? '+' : '') + dDec.toFixed(2)).padStart(8)
      );
    }
  }

  runBaselineAll().catch(e => { console.error('ERROR:', e.message); process.exit(1); });

} else if (command === 'baseline' || command === 'baseline-jpl') {
  const jplModule = require('./lib/horizons-client');

  async function runBaseline() {
    let refDates = undefined;

    if (command === 'baseline-jpl' || planet === 'sun' || planet === 'moon') {
      // Fetch from JPL for sun/moon or when explicitly requested
      console.log(`Fetching JPL reference positions for ${planet}...`);
      const jds = opt.defaultReferenceDates();
      const positions = await jplModule.getPositions(planet, jds);
      refDates = positions.map(p => ({
        jd: p.jd, ra: p.ra, dec: p.dec, weight: 1,
        year: C.startmodelYear + (p.jd - C.startmodelJD) / C.meanSolarYearDays,
        label: 'JPL Horizons',
      }));
    }

    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`  BASELINE: ${planet.toUpperCase()} — RA/Dec Errors vs JPL Reference`);
    console.log('═══════════════════════════════════════════════════════════════\n');

    const bl = opt.baseline(planet, null, refDates);

    // Show tunable parameters
    const pDef = C.planets[planet];
    if (pDef) {
      console.log('─── Tunable Parameters ───\n');
      console.log('  startpos:              ', pDef.startpos);
      console.log();
    }

    console.log('RMS RA:', bl.rmsRA.toFixed(4) + '°  RMS Dec:', bl.rmsDec.toFixed(4) + '°  RMS Total:', bl.rmsTotal.toFixed(4) + '°');
    console.log('Max RA:', bl.maxRA.toFixed(4) + '°  Max Dec:', bl.maxDec.toFixed(4) + '°');
    console.log('Entries:', bl.entries.length);

    // Start-date comparison vs JPL
    const sg = require('./lib/scene-graph');
    const jd0 = C.startmodelJD;
    const model = sg.computePlanetPosition(planet, jd0);
    const modelRA = sg.thetaToRaDeg(model.ra);
    const modelDec = sg.phiToDecDeg(model.dec);
    try {
      const jpl = await jplModule.getPosition(planet, jd0);
      let dRA = modelRA - jpl.ra;
      if (dRA > 180) dRA -= 360;
      if (dRA < -180) dRA += 360;
      const dDec = modelDec - jpl.dec;
      const fmtRA = (deg) => {
        if (deg < 0) deg += 360;
        const h = Math.floor(deg / 15);
        const m = Math.floor((deg / 15 - h) * 60);
        const s = ((deg / 15 - h) * 60 - m) * 60;
        return h + 'h' + String(m).padStart(2, '0') + 'm' + s.toFixed(1).padStart(5, '0') + 's';
      };
      console.log('\n─── Start Date (JD ' + jd0 + ') vs JPL ───\n');
      console.log('  Model RA:  ', fmtRA(modelRA).padEnd(16), '(' + modelRA.toFixed(3) + '°)');
      console.log('  JPL RA:    ', fmtRA(jpl.ra).padEnd(16), '(' + jpl.ra.toFixed(3) + '°)');
      console.log('  ΔRA:       ', (dRA >= 0 ? '+' : '') + dRA.toFixed(3) + '°');
      console.log('  Model Dec: ', modelDec.toFixed(3) + '°');
      console.log('  JPL Dec:   ', jpl.dec.toFixed(3) + '°');
      console.log('  ΔDec:      ', (dDec >= 0 ? '+' : '') + dDec.toFixed(3) + '°');
    } catch (e) {
      console.log('\n  (Could not fetch JPL start-date position:', e.message + ')');
    }

    console.log('\n' + 'JD'.padEnd(14) + 'Year'.padEnd(10) + 'Tier'.padEnd(6) + 'ΔRA°'.padStart(10) + 'ΔDec°'.padStart(10) + '  Label');

    for (const e of bl.entries) {
      console.log(
        String(e.jd).padEnd(14),
        String(e.year || '').padEnd(10),
        String(e.tier).padEnd(6),
        e.dRA.toFixed(4).padStart(10),
        e.dDec.toFixed(4).padStart(10),
        ' ', (e.label || '').substring(0, 50)
      );
    }
  }

  runBaseline().catch(e => { console.error('ERROR:', e.message); process.exit(1); });

} else if (command === 'scan') {
  const paramName = args[1];
  if (!paramName) { console.error('Missing parameter name'); usage(); }

  const rangeStr = parseFlag(args, 'range', null);
  const steps = parseInt(parseFlag(args, 'steps', '50'));

  let lo, hi;
  if (rangeStr) {
    [lo, hi] = rangeStr.split(',').map(Number);
  } else {
    const current = opt.getParamAccessors(planet)[paramName].get();
    const span = Math.abs(current) > 1 ? Math.abs(current) * 0.1 : 5;
    lo = current - span;
    hi = current + span;
  }

  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`  SENSITIVITY SCAN: ${planet.toUpperCase()} — ${paramName}`);
  console.log(`  Range: [${lo}, ${hi}], Steps: ${steps}`);
  console.log('═══════════════════════════════════════════════════════════════\n');

  const scan = opt.sensitivityScan(planet, paramName, lo, hi, steps);
  console.log('Current value:', scan.current);
  console.log('Best value:   ', scan.bestValue.toFixed(6));
  console.log('Best error:   ', scan.bestError.toFixed(4) + '°\n');

  const maxErr = Math.max(...scan.steps.map(s => s.rmsTotal));
  for (const s of scan.steps) {
    const barLen = Math.round((s.rmsTotal / maxErr) * 40);
    const marker = Math.abs(s.value - scan.current) < (hi - lo) / steps / 2 ? ' ◄current' : '';
    console.log(
      s.value.toFixed(4).padStart(12),
      s.rmsTotal.toFixed(4).padStart(8) + '°',
      '█'.repeat(barLen) + marker
    );
  }

} else if (command === 'optimize') {
  const paramStr = args[1] || 'startpos';
  const paramNames = paramStr.split(',');
  const maxIter = parseInt(parseFlag(args, 'max-iter', '500'));

  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`  OPTIMIZE: ${planet.toUpperCase()} — ${paramNames.join(', ')}`);
  console.log(`  Max iterations: ${maxIter}`);
  console.log('═══════════════════════════════════════════════════════════════\n');

  const result = opt.nelderMead(planet, paramNames, { maxIter });

  console.log('Parameter'.padEnd(28), 'Initial'.padStart(14), 'Optimized'.padStart(14), 'Change'.padStart(14));
  for (const p of paramNames) {
    const init = result.initialValues[p];
    const opt2 = result.optimizedValues[p];
    console.log(
      p.padEnd(28),
      init.toFixed(6).padStart(14),
      opt2.toFixed(6).padStart(14),
      (opt2 - init).toFixed(6).padStart(14)
    );
  }
  console.log();
  console.log('Initial error:', result.initialError.toFixed(4) + '°');
  console.log('Final error:  ', result.finalError.toFixed(4) + '°');
  console.log('Improvement:  ', result.improvement);
  console.log('Iterations:   ', result.iterations);

} else {
  console.error(`Unknown command: ${command}`);
  usage();
}
