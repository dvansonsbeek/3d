#!/usr/bin/env node
// Optimize ascNodeToolCorrection for all planets
// For each planet: scan correction values, measure baseline RMS (Dec focus),
// then re-optimize startpos to maintain start-date RA within 0.05° threshold.

const C = require('../lib/constants');
const { _invalidateGraph } = require('../lib/scene-graph');
const { baseline } = require('../lib/optimizer');

const planetKeys = ['mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'];

function silentBaseline(planet) {
  const origLog = console.log;
  console.log = () => {};
  const bl = baseline(planet);
  console.log = origLog;
  return bl;
}

function startDateFromBaseline(bl) {
  const entry = bl.entries.find(e => Math.abs(e.jd - C.startmodelJD) < 1);
  return entry ? { dRA: entry.dRA, dDec: entry.dDec } : { dRA: NaN, dDec: NaN };
}

function optimizeStartpos(planet) {
  const p = C.planets[planet];
  const orig = p.startpos;
  let lo = orig - 2, hi = orig + 2;
  const gr = (Math.sqrt(5) + 1) / 2;

  for (let i = 0; i < 50; i++) {
    const c = hi - (hi - lo) / gr;
    const d = lo + (hi - lo) / gr;

    p.startpos = c; _invalidateGraph();
    const fc = silentBaseline(planet).rmsTotal;

    p.startpos = d; _invalidateGraph();
    const fd = silentBaseline(planet).rmsTotal;

    if (fc < fd) hi = d; else lo = c;
  }

  p.startpos = Math.round(((lo + hi) / 2) * 10000) / 10000;
  _invalidateGraph();
}

const verbose = process.argv.includes('--verbose') || process.argv.includes('-v');
const target = process.argv.find(a => !a.startsWith('-') && a !== process.argv[0] && a !== process.argv[1]);
const planets = target ? [target] : planetKeys;

console.log('═══ ascNodeToolCorrection Optimization ═══\n');

const allResults = [];

for (const planet of planets) {
  const origCorr = C.ASTRO_REFERENCE.ascNodeTiltCorrection[planet];
  const origStartpos = C.planets[planet].startpos;

  console.log(`─── ${planet.toUpperCase()} (current correction: ${origCorr}°) ───\n`);

  // Phase 1: Coarse scan (0-350° in steps of 10)
  if (verbose) {
    console.log('  Phase 1: Coarse scan (step=10°)');
    console.log('  corr°   RMS-RA  RMS-Dec  RMS-Tot   startRA    startDec');
    console.log('  ' + '─'.repeat(60));
  }

  let bestCorr = origCorr, bestRmsTotal = Infinity;

  for (let corr = 0; corr <= 350; corr += 10) {
    C.ASTRO_REFERENCE.ascNodeTiltCorrection[planet] = corr;
    C.planets[planet].startpos = origStartpos;
    _invalidateGraph();

    const bl = silentBaseline(planet);
    const se = startDateFromBaseline(bl);

    if (bl.rmsTotal < bestRmsTotal) {
      bestRmsTotal = bl.rmsTotal;
      bestCorr = corr;
    }

    if (verbose) {
      const mark = corr === origCorr ? ' ◄' : '';
      const raStr = isNaN(se.dRA) ? '    N/A' : `${se.dRA >= 0 ? '+' : ''}${se.dRA.toFixed(3)}°`;
      const decStr = isNaN(se.dDec) ? '    N/A' : `${se.dDec >= 0 ? '+' : ''}${se.dDec.toFixed(3)}°`;
      console.log(`  ${String(corr).padStart(4)}°   ${bl.rmsRA.toFixed(2).padStart(5)}  ${bl.rmsDec.toFixed(2).padStart(6)}   ${bl.rmsTotal.toFixed(2).padStart(5)}   ${raStr.padStart(8)}  ${decStr.padStart(8)}${mark}`);
    }
  }

  console.log(`  Best coarse: ${bestCorr}° (RMS Total: ${bestRmsTotal.toFixed(3)}°)`);

  // Phase 2: Fine scan around best (±5° in steps of 0.1)
  if (verbose) {
    console.log('\n  Phase 2: Fine scan (step=0.1°)');
    console.log('  corr°     RMS-RA  RMS-Dec  RMS-Tot   startRA    startDec');
    console.log('  ' + '─'.repeat(62));
  }

  let fineBestCorr = bestCorr, fineBestRms = Infinity;

  for (let i = -50; i <= 50; i++) {
    const corr = bestCorr + i * 0.1;
    const c = ((corr % 360) + 360) % 360;
    const cRound = Math.round(c * 100) / 100;
    C.ASTRO_REFERENCE.ascNodeTiltCorrection[planet] = cRound;
    C.planets[planet].startpos = origStartpos;
    _invalidateGraph();

    const bl = silentBaseline(planet);
    const se = startDateFromBaseline(bl);

    if (bl.rmsTotal < fineBestRms) {
      fineBestRms = bl.rmsTotal;
      fineBestCorr = cRound;
    }

    if (verbose) {
      const raStr = isNaN(se.dRA) ? '    N/A' : `${se.dRA >= 0 ? '+' : ''}${se.dRA.toFixed(3)}°`;
      const decStr = isNaN(se.dDec) ? '    N/A' : `${se.dDec >= 0 ? '+' : ''}${se.dDec.toFixed(3)}°`;
      console.log(`  ${cRound.toFixed(1).padStart(6)}°   ${bl.rmsRA.toFixed(2).padStart(5)}  ${bl.rmsDec.toFixed(2).padStart(6)}   ${bl.rmsTotal.toFixed(3).padStart(6)}   ${raStr.padStart(8)}  ${decStr.padStart(8)}`);
    }
  }

  console.log(`  Best fine:   ${fineBestCorr.toFixed(1)}° (RMS Total: ${fineBestRms.toFixed(4)}°)`);

  // Phase 3: Apply best correction, re-optimize startpos, verify threshold
  console.log('  Re-optimizing startpos...');

  C.ASTRO_REFERENCE.ascNodeTiltCorrection[planet] = fineBestCorr;
  C.planets[planet].startpos = origStartpos;
  _invalidateGraph();

  optimizeStartpos(planet);

  const finalBl = silentBaseline(planet);
  const finalSE = startDateFromBaseline(finalBl);

  const startRAOk = isNaN(finalSE.dRA) || Math.abs(finalSE.dRA) < 0.05;
  const startDecOk = isNaN(finalSE.dDec) || Math.abs(finalSE.dDec) < 0.5;

  console.log(`\n  RESULT for ${planet.toUpperCase()}:`);
  console.log(`    ascNodeToolCorrection: ${origCorr}° → ${fineBestCorr.toFixed(2)}°`);
  console.log(`    startpos:              ${origStartpos} → ${C.planets[planet].startpos}`);
  console.log(`    RMS RA:                ${finalBl.rmsRA.toFixed(4)}°`);
  console.log(`    RMS Dec:               ${finalBl.rmsDec.toFixed(4)}°`);
  console.log(`    RMS Total:             ${finalBl.rmsTotal.toFixed(4)}°`);
  if (!isNaN(finalSE.dRA)) {
    console.log(`    Start RA err:          ${finalSE.dRA >= 0 ? '+' : ''}${finalSE.dRA.toFixed(4)}° ${startRAOk ? '✓' : '✗ EXCEEDS 0.05°'}`);
    console.log(`    Start Dec err:         ${finalSE.dDec >= 0 ? '+' : ''}${finalSE.dDec.toFixed(4)}° ${startDecOk ? '✓' : '✗'}`);
  }

  if (!startRAOk) {
    console.log(`    WARNING: Start RA error exceeds 0.05° threshold!`);
  }

  allResults.push({
    planet,
    origCorr,
    newCorr: fineBestCorr,
    origStartpos,
    newStartpos: C.planets[planet].startpos,
    rmsRA: finalBl.rmsRA,
    rmsDec: finalBl.rmsDec,
    rmsTotal: finalBl.rmsTotal,
  });

  console.log();

  // Restore original values for next planet
  C.ASTRO_REFERENCE.ascNodeTiltCorrection[planet] = origCorr;
  C.planets[planet].startpos = origStartpos;
  _invalidateGraph();
}

// Summary table
console.log('═══ Summary ═══\n');
console.log('  Planet   │ Old corr°   │ New corr°   │ Old startpos │ New startpos │ RMS Total');
console.log('  ' + '─'.repeat(85));
for (const r of allResults) {
  console.log(`  ${r.planet.padEnd(9)}│ ${r.origCorr.toFixed(2).padStart(10)}° │ ${r.newCorr.toFixed(2).padStart(10)}° │ ${String(r.origStartpos).padStart(12)} │ ${String(r.newStartpos).padStart(12)} │ ${r.rmsTotal.toFixed(4)}°`);
}
