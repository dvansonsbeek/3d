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

  p.startpos = Math.round(((lo + hi) / 2) * 100) / 100;
  _invalidateGraph();
}

const target = process.argv[2];
const planets = target ? [target] : planetKeys;

console.log('═══ ascNodeToolCorrection Optimization ═══\n');

for (const planet of planets) {
  const origCorr = C.ASTRO_REFERENCE.ascNodeTiltCorrection[planet];
  const origStartpos = C.planets[planet].startpos;

  console.log(`─── ${planet.toUpperCase()} (current correction: ${origCorr}°) ───\n`);

  // Phase 1: Coarse scan (0-350° in steps of 10)
  console.log('  Phase 1: Coarse scan (step=10°)');
  console.log('  corr°   RMS-RA  RMS-Dec  RMS-Tot   startRA    startDec');
  console.log('  ' + '─'.repeat(60));

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

    const mark = corr === origCorr ? ' ◄' : '';
    const raStr = isNaN(se.dRA) ? '    N/A' : `${se.dRA >= 0 ? '+' : ''}${se.dRA.toFixed(3)}°`;
    const decStr = isNaN(se.dDec) ? '    N/A' : `${se.dDec >= 0 ? '+' : ''}${se.dDec.toFixed(3)}°`;
    console.log(`  ${String(corr).padStart(4)}°   ${bl.rmsRA.toFixed(2).padStart(5)}  ${bl.rmsDec.toFixed(2).padStart(6)}   ${bl.rmsTotal.toFixed(2).padStart(5)}   ${raStr.padStart(8)}  ${decStr.padStart(8)}${mark}`);
  }

  console.log(`\n  Best coarse: ${bestCorr}° (RMS Total: ${bestRmsTotal.toFixed(3)}°)\n`);

  // Phase 2: Fine scan around best (±15° in steps of 1)
  console.log('  Phase 2: Fine scan (step=1°)');
  console.log('  corr°   RMS-RA  RMS-Dec  RMS-Tot   startRA    startDec');
  console.log('  ' + '─'.repeat(60));

  let fineBestCorr = bestCorr, fineBestRms = Infinity;

  for (let corr = bestCorr - 15; corr <= bestCorr + 15; corr++) {
    const c = ((corr % 360) + 360) % 360;
    C.ASTRO_REFERENCE.ascNodeTiltCorrection[planet] = c;
    C.planets[planet].startpos = origStartpos;
    _invalidateGraph();

    const bl = silentBaseline(planet);
    const se = startDateFromBaseline(bl);

    if (bl.rmsTotal < fineBestRms) {
      fineBestRms = bl.rmsTotal;
      fineBestCorr = c;
    }

    const mark = c === origCorr ? ' ◄' : '';
    const raStr = isNaN(se.dRA) ? '    N/A' : `${se.dRA >= 0 ? '+' : ''}${se.dRA.toFixed(3)}°`;
    const decStr = isNaN(se.dDec) ? '    N/A' : `${se.dDec >= 0 ? '+' : ''}${se.dDec.toFixed(3)}°`;
    console.log(`  ${String(c).padStart(4)}°   ${bl.rmsRA.toFixed(2).padStart(5)}  ${bl.rmsDec.toFixed(2).padStart(6)}   ${bl.rmsTotal.toFixed(2).padStart(5)}   ${raStr.padStart(8)}  ${decStr.padStart(8)}${mark}`);
  }

  console.log(`\n  Best fine: ${fineBestCorr}° (RMS Total: ${fineBestRms.toFixed(3)}°)\n`);

  // Phase 3: Apply best correction, re-optimize startpos, verify threshold
  console.log('  Phase 3: Re-optimize startpos with best correction');

  C.ASTRO_REFERENCE.ascNodeTiltCorrection[planet] = fineBestCorr;
  C.planets[planet].startpos = origStartpos;
  _invalidateGraph();

  optimizeStartpos(planet);

  const finalBl = silentBaseline(planet);
  const finalSE = startDateFromBaseline(finalBl);

  const startRAOk = isNaN(finalSE.dRA) || Math.abs(finalSE.dRA) < 0.05;
  const startDecOk = isNaN(finalSE.dDec) || Math.abs(finalSE.dDec) < 0.5;

  console.log(`\n  RESULT for ${planet.toUpperCase()}:`);
  console.log(`    ascNodeToolCorrection: ${origCorr}° → ${fineBestCorr}°`);
  console.log(`    startpos:              ${origStartpos} → ${C.planets[planet].startpos}`);
  console.log(`    RMS RA:                ${finalBl.rmsRA.toFixed(3)}°`);
  console.log(`    RMS Dec:               ${finalBl.rmsDec.toFixed(3)}°`);
  console.log(`    RMS Total:             ${finalBl.rmsTotal.toFixed(3)}°`);
  if (!isNaN(finalSE.dRA)) {
    console.log(`    Start RA err:          ${finalSE.dRA >= 0 ? '+' : ''}${finalSE.dRA.toFixed(3)}° ${startRAOk ? '✓' : '✗ EXCEEDS 0.05°'}`);
    console.log(`    Start Dec err:         ${finalSE.dDec >= 0 ? '+' : ''}${finalSE.dDec.toFixed(3)}° ${startDecOk ? '✓' : '✗'}`);
  }

  if (!startRAOk) {
    console.log(`    WARNING: Start RA error exceeds 0.05° threshold!`);
  }

  console.log();

  // Restore original values for next planet
  C.ASTRO_REFERENCE.ascNodeTiltCorrection[planet] = origCorr;
  C.planets[planet].startpos = origStartpos;
  _invalidateGraph();
}
